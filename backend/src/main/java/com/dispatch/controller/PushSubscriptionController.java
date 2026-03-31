// src/main/java/com/dispatch/controller/PushSubscriptionController.java
package com.dispatch.controller;

import com.dispatch.service.PushNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/push")
public class PushSubscriptionController {

    @Value("${vapid.public-key:}")
    private String vapidPublicKey;

    @Autowired
    private PushNotificationService pushNotificationService;

    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, String>> subscribe(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            String endpoint = request.get("endpoint");
            String p256dh = request.get("keys.p256dh");
            String auth = request.get("keys.auth");
            String userPhone = request.get("userPhone");
            String userType = request.get("userType");

            if (isBlank(endpoint) || isBlank(p256dh) || isBlank(auth) || isBlank(userPhone) || isBlank(userType)) {
                return ResponseEntity.badRequest().body(Map.of("success", "false", "error", "Missing required push subscription fields"));
            }

            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(401).body(Map.of("success", "false", "error", "Unauthorized"));
            }

            String authPhone = String.valueOf(authentication.getPrincipal());
            String authRole = resolveRole(authentication);

            if (isBlank(authRole)) {
                return ResponseEntity.status(403).body(Map.of("success", "false", "error", "Missing role context"));
            }

            if (!authRole.equalsIgnoreCase(userType) || !normalizePhoneForRole(authPhone, authRole).equals(normalizePhoneForRole(userPhone, userType))) {
                return ResponseEntity.status(403).body(Map.of("success", "false", "error", "Push identity mismatch"));
            }

            pushNotificationService.subscribeUser(endpoint, p256dh, auth, authPhone, authRole);
            return ResponseEntity.ok(Map.of("success", "true", "message", "Subscribed to push notifications"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", "false", "error", e.getMessage()));
        }
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<Map<String, String>> unsubscribe(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            String endpoint = request.get("endpoint");
            if (isBlank(endpoint)) {
                return ResponseEntity.badRequest().body(Map.of("success", "false", "error", "Missing endpoint"));
            }
            if (authentication == null || authentication.getPrincipal() == null) {
                return ResponseEntity.status(401).body(Map.of("success", "false", "error", "Unauthorized"));
            }

            String authPhone = String.valueOf(authentication.getPrincipal());
            String authRole = resolveRole(authentication);
            if (isBlank(authRole)) {
                return ResponseEntity.status(403).body(Map.of("success", "false", "error", "Missing role context"));
            }

            pushNotificationService.unsubscribeUser(endpoint, authPhone, authRole);
            return ResponseEntity.ok(Map.of("success", "true", "message", "Unsubscribed from push notifications"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", "false", "error", e.getMessage()));
        }
    }

    @GetMapping("/vapid-public-key")
    public ResponseEntity<Map<String, String>> getVapidPublicKey() {
        return ResponseEntity.ok(Map.of("vapidPublicKey", vapidPublicKey == null ? "" : vapidPublicKey));
    }

    /** Admin-only: returns a safe summary of all push subscriptions in the DB.
     *  Use this to verify whether subscriptions are actually being saved. */
    @GetMapping("/admin/subscriptions")
    public ResponseEntity<Map<String, Object>> listSubscriptions() {
        List<Map<String, Object>> summary = pushNotificationService.getSubscriptionSummary();
        long adminCount = summary.stream()
                .filter(m -> "ADMIN".equals(m.get("userType"))).count();
        return ResponseEntity.ok(Map.of(
                "total", summary.size(),
                "adminCount", adminCount,
                "subscriptions", summary
        ));
    }

    /** Admin-only: fires a real test push to every ADMIN subscription in the DB. */
    @PostMapping("/admin/test")
    public ResponseEntity<Map<String, Object>> sendTestPush() {
        int count = pushNotificationService.sendTestPushToAdmins();
        if (count == 0) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "No ADMIN push subscriptions found in database. " +
                               "Click 'Enable alerts' on the dashboard first, then retry."
            ));
        }
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Test push sent to " + count + " admin subscription(s). Check your browser!"
        ));
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String resolveRole(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) {
            return "";
        }

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String name = authority.getAuthority();
            if (name != null && name.startsWith("ROLE_")) {
                return name.substring("ROLE_".length());
            }
        }
        return "";
    }

    private String normalizePhoneForRole(String value, String role) {
        if (value == null) {
            return "";
        }
        if ("ADMIN".equalsIgnoreCase(role)) {
            return value.trim();
        }

        String digits = value.replaceAll("[^\\d]", "");
        if (digits.startsWith("91") && digits.length() == 12) {
            return digits.substring(2);
        }
        return digits;
    }
}

