// src/main/java/com/dispatch/controller/PushSubscriptionController.java
package com.dispatch.controller;

import com.dispatch.service.PushNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/push")
@CrossOrigin(origins = "*")
public class PushSubscriptionController {

    @Value("${vapid.public-key:}")
    private String vapidPublicKey;

    @Autowired
    private PushNotificationService pushNotificationService;

    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, String>> subscribe(@RequestBody Map<String, String> request) {
        try {
            String endpoint = request.get("endpoint");
            String p256dh = request.get("keys.p256dh");
            String auth = request.get("keys.auth");
            String userPhone = request.get("userPhone");
            String userType = request.get("userType"); // "ADMIN" or "DRIVER"

            if (isBlank(endpoint) || isBlank(p256dh) || isBlank(auth) || isBlank(userPhone) || isBlank(userType)) {
                return ResponseEntity.badRequest().body(Map.of("success", "false", "error", "Missing required push subscription fields"));
            }

            pushNotificationService.subscribeUser(endpoint, p256dh, auth, userPhone, userType);
            return ResponseEntity.ok(Map.of("success", "true", "message", "Subscribed to push notifications"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", "false", "error", e.getMessage()));
        }
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<Map<String, String>> unsubscribe(@RequestBody Map<String, String> request) {
        try {
            String endpoint = request.get("endpoint");
            pushNotificationService.unsubscribeUser(endpoint);
            return ResponseEntity.ok(Map.of("success", "true", "message", "Unsubscribed from push notifications"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", "false", "error", e.getMessage()));
        }
    }

    @GetMapping("/vapid-public-key")
    public ResponseEntity<Map<String, String>> getVapidPublicKey() {
        return ResponseEntity.ok(Map.of("vapidPublicKey", vapidPublicKey == null ? "" : vapidPublicKey));
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}

