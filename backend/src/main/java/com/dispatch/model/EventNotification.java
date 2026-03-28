// src/main/java/com/dispatch/model/EventNotification.java
package com.dispatch.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "event_notifications")
public class EventNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String message;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private boolean dismissed = false;

    @Column(name = "target_phone")
    private String targetPhone; // null = broadcast to all admins, specific phone = targeted to driver

    @PrePersist
    public void prePersist() {
        this.createdAt = Instant.now();
    }

    public EventNotification() {}

    public EventNotification(String message) {
        this.message = message;
    }

    public EventNotification(String message, String targetPhone) {
        this.message = message;
        this.targetPhone = targetPhone;
    }

    public Long getId() { return id; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isDismissed() { return dismissed; }
    public void setDismissed(boolean dismissed) { this.dismissed = dismissed; }
    public String getTargetPhone() { return targetPhone; }
    public void setTargetPhone(String targetPhone) { this.targetPhone = targetPhone; }
}