// src/main/java/com/dispatch/model/PushSubscription.java
package com.dispatch.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "push_subscriptions", uniqueConstraints = @UniqueConstraint(columnNames = {"endpoint", "userPhone", "userType"}))
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String endpoint;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String p256dh;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String auth;

    @Column(nullable = false)
    private String userPhone; // phone of the user (admin, driver, etc.)

    @Column(nullable = false)
    private String userType; // "ADMIN", "DRIVER", etc.

    @Column(nullable = false)
    private Instant subscribedAt;

    @Column
    private Instant lastDeliveryAt;

    @Column
    private String lastDeliveryStatus;

    @Column
    private Integer lastDeliveryHttpStatus;

    @Column(columnDefinition = "TEXT")
    private String lastDeliveryError;

    @PrePersist
    public void prePersist() {
        this.subscribedAt = Instant.now();
    }

    public PushSubscription() {}

    public PushSubscription(String endpoint, String p256dh, String auth, String userPhone, String userType) {
        this.endpoint = endpoint;
        this.p256dh = p256dh;
        this.auth = auth;
        this.userPhone = userPhone;
        this.userType = userType;
    }

    public Long getId() { return id; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }
    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }
    public String getUserPhone() { return userPhone; }
    public void setUserPhone(String userPhone) { this.userPhone = userPhone; }
    public String getUserType() { return userType; }
    public void setUserType(String userType) { this.userType = userType; }
    public Instant getSubscribedAt() { return subscribedAt; }
    public Instant getLastDeliveryAt() { return lastDeliveryAt; }
    public void setLastDeliveryAt(Instant lastDeliveryAt) { this.lastDeliveryAt = lastDeliveryAt; }
    public String getLastDeliveryStatus() { return lastDeliveryStatus; }
    public void setLastDeliveryStatus(String lastDeliveryStatus) { this.lastDeliveryStatus = lastDeliveryStatus; }
    public Integer getLastDeliveryHttpStatus() { return lastDeliveryHttpStatus; }
    public void setLastDeliveryHttpStatus(Integer lastDeliveryHttpStatus) { this.lastDeliveryHttpStatus = lastDeliveryHttpStatus; }
    public String getLastDeliveryError() { return lastDeliveryError; }
    public void setLastDeliveryError(String lastDeliveryError) { this.lastDeliveryError = lastDeliveryError; }
}

