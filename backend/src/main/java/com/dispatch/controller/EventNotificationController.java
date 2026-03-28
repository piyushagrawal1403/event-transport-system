// src/main/java/com/dispatch/controller/EventNotificationController.java
package com.dispatch.controller;

import com.dispatch.model.EventNotification;
import com.dispatch.repository.EventNotificationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
public class EventNotificationController {

    private final EventNotificationRepository repo;

    public EventNotificationController(EventNotificationRepository repo) {
        this.repo = repo;
    }

    /**
     * Guest app polls this with ?since=<ISO timestamp>.
     * Returns only notifications newer than that timestamp.
     * On first load, pass since=0 to get the last 10.
     */
    @GetMapping
    public ResponseEntity<List<EventNotification>> getNotifications(
            @RequestParam(required = false) String since) {
        if (since == null || since.equals("0")) {
            return ResponseEntity.ok(repo.findTop10ByOrderByCreatedAtDesc());
        }
        try {
            Instant sinceInstant = Instant.parse(since);
            return ResponseEntity.ok(
                    repo.findByCreatedAtAfterOrderByCreatedAtDesc(sinceInstant)
            );
        } catch (Exception e) {
            return ResponseEntity.ok(repo.findTop10ByOrderByCreatedAtDesc());
        }
    }
}