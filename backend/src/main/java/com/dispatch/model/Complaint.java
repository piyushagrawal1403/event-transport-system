package com.dispatch.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "complaints")
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String guestName;

    @Column(nullable = false)
    private String guestPhone;

    @Column(nullable = false, length = 2000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private ComplaintCategory category = ComplaintCategory.OTHERS;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ride_request_id")
    private RideRequest rideRequest;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComplaintStatus status = ComplaintStatus.OPEN;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant closedAt;

    private String closedBy;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = ComplaintStatus.OPEN;
        }
        if (category == null) {
            category = ComplaintCategory.OTHERS;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }

    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public ComplaintCategory getCategory() { return category; }
    public void setCategory(ComplaintCategory category) { this.category = category; }

    public RideRequest getRideRequest() { return rideRequest; }
    public void setRideRequest(RideRequest rideRequest) { this.rideRequest = rideRequest; }

    public ComplaintStatus getStatus() { return status; }
    public void setStatus(ComplaintStatus status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }

    public String getClosedBy() { return closedBy; }
    public void setClosedBy(String closedBy) { this.closedBy = closedBy; }
}

