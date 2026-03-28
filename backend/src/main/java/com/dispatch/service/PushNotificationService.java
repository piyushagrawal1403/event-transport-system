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
import org.springframework.stereotype.Service;

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

    public void subscribeUser(String endpoint, String p256dh, String auth, String userPhone, String userType) {
        try {
            var existing = pushSubscriptionRepository.findByEndpointAndUserTypeAndUserPhone(endpoint, userType, userPhone);
            if (existing.isPresent()) {
                PushSubscription subscription = existing.get();
                subscription.setP256dh(p256dh);
                subscription.setAuth(auth);
                subscription.setUserPhone(userPhone);
                subscription.setUserType(userType);
                pushSubscriptionRepository.save(subscription);
                logger.info("Updated push subscription for {} ({})", userPhone, userType);
                return;
            }

            PushSubscription subscription = new PushSubscription(endpoint, p256dh, auth, userPhone, userType);
            pushSubscriptionRepository.save(subscription);
            logger.info("User {} subscribed to push notifications as {}", userPhone, userType);
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
        if (pushService == null) {
            initPushService();
        }

        List<PushSubscription> adminSubscriptions = pushSubscriptionRepository.findByUserType("ADMIN");
        Gson gson = new Gson();

        Map<String, String> payload = new HashMap<>();
        payload.put("title", title);
        payload.put("body", body);

        for (PushSubscription sub : adminSubscriptions) {
            try {
                Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    gson.toJson(payload).getBytes()
                );
                HttpResponse response = pushService.send(notification);
                logger.debug("Push notification sent to admin, status: {}", response.getStatusLine().getStatusCode());
            } catch (Exception e) {
                logger.error("Failed to send push to endpoint: {}", sub.getEndpoint(), e);
                // Remove invalid subscriptions
                try {
                    pushSubscriptionRepository.deleteByEndpoint(sub.getEndpoint());
                } catch (Exception ex) {
                    logger.error("Failed to delete subscription", ex);
                }
            }
        }
    }

    public void sendPushToDriver(String driverPhone, String title, String body) {
        if (pushService == null) {
            initPushService();
        }

        List<PushSubscription> driverSubscriptions = pushSubscriptionRepository.findByUserTypeAndUserPhone("DRIVER", driverPhone);
        Gson gson = new Gson();

        Map<String, String> payload = new HashMap<>();
        payload.put("title", title);
        payload.put("body", body);

        for (PushSubscription sub : driverSubscriptions) {
            try {
                Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    gson.toJson(payload).getBytes()
                );
                HttpResponse response = pushService.send(notification);
                logger.debug("Push notification sent to driver {}, status: {}", driverPhone, response.getStatusLine().getStatusCode());
            } catch (Exception e) {
                logger.error("Failed to send push to driver: {}", driverPhone, e);
                try {
                    pushSubscriptionRepository.deleteByEndpoint(sub.getEndpoint());
                } catch (Exception ex) {
                    logger.error("Failed to delete subscription", ex);
                }
            }
        }
    }
}
