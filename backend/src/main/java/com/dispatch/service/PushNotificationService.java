// src/main/java/com/dispatch/service/PushNotificationService.java
package com.dispatch.service;

import com.dispatch.model.PushSubscription;
import com.dispatch.repository.PushSubscriptionRepository;
import com.google.gson.Gson;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.apache.http.HttpResponse;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.annotation.PostConstruct;

import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PushNotificationService {
    private static final Logger logger = LoggerFactory.getLogger(PushNotificationService.class);

    @Autowired
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Value("${vapid.public-key:}")
    private String vapidPublicKey;

    @Value("${vapid.private-key:}")
    private String vapidPrivateKey;

    @Value("${vapid.subject:mailto:support@event-transport.com}")
    private String vapidSubject;

    private PushService pushService;

    @PostConstruct
    public void initPushService() {
        if (vapidPublicKey == null || vapidPublicKey.isBlank()) {
            logger.warn("VAPID public key is not configured — push notifications will be disabled. "
                    + "Set VAPID_PUBLIC_KEY environment variable or vapid.public-key property.");
            return;
        }
        if (vapidPrivateKey == null || vapidPrivateKey.isBlank()) {
            logger.warn("VAPID private key is not configured — push notifications will be disabled. "
                    + "Set VAPID_PRIVATE_KEY environment variable or vapid.private-key property.");
            return;
        }
        try {
            // Register BouncyCastle provider for cryptographic operations
            if (java.security.Security.getProvider("BC") == null) {
                java.security.Security.addProvider(new BouncyCastleProvider());
            }

            this.pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
            logger.info("PushService initialized successfully (VAPID subject={})", vapidSubject);
        } catch (GeneralSecurityException e) {
            logger.error("Failed to initialize PushService — check VAPID key format", e);
        } catch (Exception e) {
            logger.error("Unexpected error initializing PushService", e);
        }
    }

    @Transactional
    public void subscribeUser(String endpoint, String p256dh, String auth, String userPhone, String userType) {
        String normalizedUserType = normalizeUserType(userType);
        String normalizedUserPhone = normalizeUserPhone(userPhone, userType);
        try {
            // Endpoint rebind: one browser endpoint must map to one active identity at a time.
            List<PushSubscription> existingByEndpoint = pushSubscriptionRepository.findAllByEndpoint(endpoint);
            if (!existingByEndpoint.isEmpty()) {
                PushSubscription subscription = existingByEndpoint.get(0);
                subscription.setP256dh(p256dh);
                subscription.setAuth(auth);
                subscription.setUserPhone(normalizedUserPhone);
                subscription.setUserType(normalizedUserType);
                pushSubscriptionRepository.save(subscription);
                for (int i = 1; i < existingByEndpoint.size(); i++) {
                    pushSubscriptionRepository.delete(existingByEndpoint.get(i));
                }
                logger.info("Updated push subscription endpoint for {} ({})", normalizedUserPhone, normalizedUserType);
                return;
            }

            PushSubscription subscription = new PushSubscription(endpoint, p256dh, auth, normalizedUserPhone, normalizedUserType);
            pushSubscriptionRepository.save(subscription);
            logger.info("User {} subscribed to push notifications as {}", normalizedUserPhone, normalizedUserType);
        } catch (DataIntegrityViolationException e) {
            // Race-condition fallback: another thread inserted first — fetch and update
            logger.warn("Duplicate subscription detected for {} ({}), updating existing record", normalizedUserPhone, normalizedUserType);
            try {
                pushSubscriptionRepository.findByEndpointAndUserTypeAndUserPhone(
                        endpoint,
                        normalizedUserType,
                        normalizedUserPhone
                ).ifPresent(existing -> {
                    existing.setP256dh(p256dh);
                    existing.setAuth(auth);
                    existing.setUserPhone(normalizedUserPhone);
                    existing.setUserType(normalizedUserType);
                    pushSubscriptionRepository.save(existing);
                });
            } catch (Exception ex) {
                logger.error("Failed to update subscription after duplicate violation", ex);
            }
        } catch (Exception e) {
            logger.error("Failed to subscribe user", e);
        }
    }

    @Transactional
    public void unsubscribeUser(String endpoint) {
        try {
            pushSubscriptionRepository.deleteByEndpoint(endpoint);
            logger.info("User unsubscribed from push notifications");
        } catch (Exception e) {
            logger.error("Failed to unsubscribe user", e);
        }
    }

    @Transactional
    public void unsubscribeUser(String endpoint, String userPhone, String userType) {
        String normalizedUserType = normalizeUserType(userType);
        String normalizedUserPhone = normalizeUserPhone(userPhone, userType);
        try {
            pushSubscriptionRepository.deleteByEndpointAndUserTypeAndUserPhone(endpoint, normalizedUserType, normalizedUserPhone);
            logger.info("User {} ({}) unsubscribed from push notifications", normalizedUserPhone, normalizedUserType);
        } catch (Exception e) {
            logger.error("Failed to unsubscribe user", e);
        }
    }

    public void sendPushToAdmins(String title, String body) {
        sendPushToSubscriptions(pushSubscriptionRepository.findByUserType("ADMIN"), title, body, "admin");
    }

    /** Returns a safe summary of all subscriptions for the debug UI. */
    public List<Map<String, Object>> getSubscriptionSummary() {
        return pushSubscriptionRepository.findAll().stream().map(sub -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", sub.getId());
            m.put("userType", sub.getUserType());
            m.put("userPhone", sub.getUserPhone());
            m.put("subscribedAt", sub.getSubscribedAt() != null ? sub.getSubscribedAt().toString() : null);
            m.put("lastDeliveryAt", sub.getLastDeliveryAt() != null ? sub.getLastDeliveryAt().toString() : null);
            m.put("lastDeliveryStatus", sub.getLastDeliveryStatus());
            m.put("lastDeliveryHttpStatus", sub.getLastDeliveryHttpStatus());
            m.put("lastDeliveryError", sub.getLastDeliveryError());
            String ep = sub.getEndpoint();
            m.put("endpointSuffix", ep != null && ep.length() > 30 ? "…" + ep.substring(ep.length() - 30) : ep);
            return m;
        }).collect(java.util.stream.Collectors.toList());
    }

    /** Sends a test push notification to all ADMIN subscriptions.
     *  Returns the number of subscriptions that were targeted. */
    public int sendTestPushToAdmins() {
        List<PushSubscription> subs = pushSubscriptionRepository.findByUserType("ADMIN");
        if (!subs.isEmpty()) {
            sendPushToSubscriptions(subs, "Test Notification ✓",
                    "Push notifications are working correctly for admin.", "admin (test)");
        }
        return subs.size();
    }

    public void sendPushToDriver(String driverPhone, String title, String body) {
        String normalizedPhone = normalizeUserPhone(driverPhone, "DRIVER");
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByUserTypeAndUserPhone("DRIVER", normalizedPhone);
        sendPushToSubscriptions(subscriptions, title, body, "driver " + normalizedPhone);
    }

    public void sendPushToGuests(String title, String body) {
        sendPushToSubscriptions(pushSubscriptionRepository.findByUserType("GUEST"), title, body, "guests");
    }

    public void sendPushToGuest(String guestPhone, String title, String body) {
        String normalizedPhone = normalizeUserPhone(guestPhone, "GUEST");
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByUserTypeAndUserPhone("GUEST", normalizedPhone);

        sendPushToSubscriptions(subscriptions, title, body, "guest " + normalizedPhone);
    }

    @Transactional
    public void sendPushToSubscriptions(List<PushSubscription> subscriptions, String title, String body, String audience) {
        if (subscriptions == null || subscriptions.isEmpty()) {
            logger.info("No push subscriptions found for {}", audience);
            return;
        }

        if (pushService == null) {
            logger.warn("PushService is not initialized — VAPID keys may be missing. Skipping push for {}", audience);
            return;
        }

        Gson gson = new Gson();
        Map<String, String> payload = new HashMap<>();
        payload.put("title", title);
        payload.put("body", body);

        for (PushSubscription sub : subscriptions) {
            try {
                Notification notification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        gson.toJson(payload).getBytes()
                );
                HttpResponse response = pushService.send(notification);
                int statusCode = response.getStatusLine().getStatusCode();
                if (statusCode == 201 || statusCode == 200) {
                    updateDeliveryStatus(sub, "DELIVERED", statusCode, null);
                    logger.info("Push notification delivered to {} (status {})", audience, statusCode);
                } else if (statusCode == 410 || statusCode == 404) {
                    updateDeliveryStatus(sub, "EXPIRED", statusCode, "Endpoint expired or not found");
                    logger.warn("Push subscription expired/invalid for {} (status {}), removing", audience, statusCode);
                    pushSubscriptionRepository.deleteByEndpoint(sub.getEndpoint());
                } else {
                    updateDeliveryStatus(sub, "UNEXPECTED_STATUS", statusCode, "Unexpected provider status");
                    logger.warn("Push notification to {} returned unexpected status {}", audience, statusCode);
                }
            } catch (Exception e) {
                // Network/provider failures can be transient; do not eagerly delete subscriptions.
                updateDeliveryStatus(sub, "ERROR", null, describeException(e));
                logger.error("Failed to send push notification to {} (subscription retained)", audience, e);
            }
        }
    }

    private void updateDeliveryStatus(PushSubscription subscription, String status, Integer httpStatus, String error) {
        subscription.setLastDeliveryAt(Instant.now());
        subscription.setLastDeliveryStatus(status);
        subscription.setLastDeliveryHttpStatus(httpStatus);
        subscription.setLastDeliveryError(error);
        pushSubscriptionRepository.save(subscription);
    }

    private String describeException(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            return exception.getClass().getSimpleName();
        }
        return message.length() > 240 ? message.substring(0, 240) : message;
    }

    private String normalizeUserPhone(String userPhone, String userType) {
        if (userPhone == null) {
            return null;
        }
        if ("ADMIN".equalsIgnoreCase(userType)) {
            return userPhone;
        }

        String digits = userPhone.replaceAll("[^\\d]", "");
        if (digits.startsWith("91") && digits.length() == 12) {
            digits = digits.substring(2);
        }
        return digits;
    }

    private String normalizeUserType(String userType) {
        return userType == null ? "" : userType.trim().toUpperCase();
    }
}
