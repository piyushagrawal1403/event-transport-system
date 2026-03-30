package com.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateComplaintDto {

	@NotBlank(message = "Guest name is required")
	private String guestName;

	@NotBlank(message = "Guest phone is required")
	private String guestPhone;

	@NotBlank(message = "Complaint message is required")
	private String message;

	private Long rideRequestId;

	public String getGuestName() { return guestName; }
	public void setGuestName(String guestName) { this.guestName = guestName; }

	public String getGuestPhone() { return guestPhone; }
	public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

	public String getMessage() { return message; }
	public void setMessage(String message) { this.message = message; }

	public Long getRideRequestId() { return rideRequestId; }
	public void setRideRequestId(Long rideRequestId) { this.rideRequestId = rideRequestId; }
}

