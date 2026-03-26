package com.dispatch.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ride_requests")
public class RideRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String guestName;

    @Column(nullable = false)
    private String guestPhone;

    @Column(nullable = false)
    private Integer passengerCount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RideDirection direction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RideStatus status = RideStatus.PENDING;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cab_id")
    private Cab cab;

    private String dropoffOtp;

    private String magicLinkId;

    @Column(nullable = false)
    private Instant requestedAt;

    public RideRequest() {}

    @PrePersist
    public void prePersist() {
        if (this.requestedAt == null) {
            this.requestedAt = Instant.now();
        }
        if (this.status == null) {
            this.status = RideStatus.PENDING;
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }

    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

    public Integer getPassengerCount() { return passengerCount; }
    public void setPassengerCount(Integer passengerCount) { this.passengerCount = passengerCount; }

    public RideDirection getDirection() { return direction; }
    public void setDirection(RideDirection direction) { this.direction = direction; }

    public RideStatus getStatus() { return status; }
    public void setStatus(RideStatus status) { this.status = status; }

    public Location getLocation() { return location; }
    public void setLocation(Location location) { this.location = location; }

    public Cab getCab() { return cab; }
    public void setCab(Cab cab) { this.cab = cab; }

    public String getDropoffOtp() { return dropoffOtp; }
    public void setDropoffOtp(String dropoffOtp) { this.dropoffOtp = dropoffOtp; }

    public String getMagicLinkId() { return magicLinkId; }
    public void setMagicLinkId(String magicLinkId) { this.magicLinkId = magicLinkId; }

    public Instant getRequestedAt() { return requestedAt; }
    public void setRequestedAt(Instant requestedAt) { this.requestedAt = requestedAt; }
}
