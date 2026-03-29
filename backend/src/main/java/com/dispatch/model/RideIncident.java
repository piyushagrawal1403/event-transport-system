package com.dispatch.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "ride_incidents")
public class RideIncident {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private Long rideRequestId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private RideIncidentType incidentType;

	@Column(nullable = false)
	private Instant occurredAt;

	@Column(nullable = false)
	private String guestName;

	@Column(nullable = false)
	private String guestPhone;

	@Column(nullable = false)
	private Integer passengerCount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private RideDirection direction;

	@Column(nullable = false)
	private String locationName;

	private String customDestination;

	private String driverName;

	private String driverPhone;

	private String cabLicensePlate;

	private Integer driverDeniedCount;

	@PrePersist
	public void prePersist() {
		if (occurredAt == null) {
			occurredAt = Instant.now();
		}
	}

	public Long getId() { return id; }
	public void setId(Long id) { this.id = id; }

	public Long getRideRequestId() { return rideRequestId; }
	public void setRideRequestId(Long rideRequestId) { this.rideRequestId = rideRequestId; }

	public RideIncidentType getIncidentType() { return incidentType; }
	public void setIncidentType(RideIncidentType incidentType) { this.incidentType = incidentType; }

	public Instant getOccurredAt() { return occurredAt; }
	public void setOccurredAt(Instant occurredAt) { this.occurredAt = occurredAt; }

	public String getGuestName() { return guestName; }
	public void setGuestName(String guestName) { this.guestName = guestName; }

	public String getGuestPhone() { return guestPhone; }
	public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

	public Integer getPassengerCount() { return passengerCount; }
	public void setPassengerCount(Integer passengerCount) { this.passengerCount = passengerCount; }

	public RideDirection getDirection() { return direction; }
	public void setDirection(RideDirection direction) { this.direction = direction; }

	public String getLocationName() { return locationName; }
	public void setLocationName(String locationName) { this.locationName = locationName; }

	public String getCustomDestination() { return customDestination; }
	public void setCustomDestination(String customDestination) { this.customDestination = customDestination; }

	public String getDriverName() { return driverName; }
	public void setDriverName(String driverName) { this.driverName = driverName; }

	public String getDriverPhone() { return driverPhone; }
	public void setDriverPhone(String driverPhone) { this.driverPhone = driverPhone; }

	public String getCabLicensePlate() { return cabLicensePlate; }
	public void setCabLicensePlate(String cabLicensePlate) { this.cabLicensePlate = cabLicensePlate; }

	public Integer getDriverDeniedCount() { return driverDeniedCount; }
	public void setDriverDeniedCount(Integer driverDeniedCount) { this.driverDeniedCount = driverDeniedCount; }
}

