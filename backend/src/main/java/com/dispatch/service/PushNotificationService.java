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

import java.security.GeneralSecurityException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PushNotificationService {
    private static final Logger logger = LoggerFactory.getLogger(PushNotificationService.class);

    @Autowired
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Value("${vapid.public-key}")
    private String vapidPublicKey;

    @Value("${vapid.private-key}")
    private String vapidPrivateKey;

    @Value("${vapid.subject}")
    private String vapidSubject;

    private PushService pushService;

    public void initPushService() {
        try {
            // Register BouncyCastle provider for cryptographic operations
            if (java.security.Security.getProvider("BC") == null) {
                java.security.Security.addProvider(new BouncyCastleProvider());
            }
            
            this.pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
        } catch (GeneralSecurityException e) {
            logger.error("Failed to initialize PushService", e);
        }
    }

    @Transactional
    public void subscribeUser(String endpoint, String p256dh, String auth, String userPhone, String userType) {
        String normalizedUserType = normalizeUserType(userType);
        String normalizedUserPhone = normalizeUserPhone(userPhone, userType);
        try {
            // Identity-based upsert: same endpoint may legitimately subscribe as different roles/users.
            var existing = pushSubscriptionRepository.findByEndpointAndUserTypeAndUserPhone(
                    endpoint,
                    normalizedUserType,
                    normalizedUserPhone
            );
            if (existing.isPresent()) {
                PushSubscription subscription = existing.get();
                subscription.setP256dh(p256dh);
                subscription.setAuth(auth);
                subscription.setUserPhone(normalizedUserPhone);
                subscription.setUserType(normalizedUserType);
                pushSubscriptionRepository.save(subscription);
                logger.info("Updated push subscription for {} ({})", normalizedUserPhone, normalizedUserType);
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

    public void unsubscribeUser(String endpoint) {
        try {
            pushSubscriptionRepository.deleteByEndpoint(endpoint);
            logger.info("User unsubscribed from push notifications");
        } catch (Exception e) {
            logger.error("Failed to unsubscribe user", e);
        }
    }

    public void sendPushToAdmins(String title, String body) {
        sendPushToSubscriptions(pushSubscriptionRepository.findByUserType("ADMIN"), title, body, "admin");
    }

    public void sendPushToDriver(String driverPhone, String title, String body) {
        String normalizedPhone = normalizeUserPhone(driverPhone, "DRIVER");
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByUserTypeAndUserPhone("DRIVER", normalizedPhone);

        // Backward-compat fallback for legacy rows with stale userType casing or older subscription shape.
        if (subscriptions.isEmpty()) {
            subscriptions = pushSubscriptionRepository.findByUserPhone(normalizedPhone);
            if (!subscriptions.isEmpty()) {
                logger.warn("Driver push lookup used fallback for {} (legacy subscription rows detected)", normalizedPhone);
            }
        }

        sendPushToSubscriptions(subscriptions, title, body, "driver " + normalizedPhone);
    }

    public void sendPushToGuests(String title, String body) {
        sendPushToSubscriptions(pushSubscriptionRepository.findByUserType("GUEST"), title, body, "guests");
    }

    public void sendPushToGuest(String guestPhone, String title, String body) {
        String normalizedPhone = normalizeUserPhone(guestPhone, "GUEST");
        List<PushSubscription> subscriptions = pushSubscriptionRepository.findByUserTypeAndUserPhone("GUEST", normalizedPhone);

        if (subscriptions.isEmpty()) {
            subscriptions = pushSubscriptionRepository.findByUserPhone(normalizedPhone);
            if (!subscriptions.isEmpty()) {
                logger.warn("Guest push lookup used fallback for {} (legacy subscription rows detected)", normalizedPhone);
            }
        }

        sendPushToSubscriptions(subscriptions, title, body, "guest " + normalizedPhone);
    }

    private void sendPushToSubscriptions(List<PushSubscription> subscriptions, String title, String body, String audience) {
        if (subscriptions == null || subscriptions.isEmpty()) {
            logger.info("No push subscriptions found for {}", audience);
            return;
        }

        if (pushService == null) {
            initPushService();
        }
        if (pushService == null) {
            logger.warn("PushService is not available; skipping push for {}", audience);
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
                logger.debug("Push notification sent to {}, status: {}", audience, response.getStatusLine().getStatusCode());
            } catch (Exception e) {
                logger.error("Failed to send push to endpoint: {}", sub.getEndpoint(), e);
                try {
                    pushSubscriptionRepository.deleteByEndpoint(sub.getEndpoint());
                } catch (Exception ex) {
                    logger.error("Failed to delete subscription", ex);
                }
            }
        }
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
