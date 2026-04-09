package com.dispatch.dto;

import com.dispatch.model.ComplaintCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class CreateComplaintDto {

	@NotBlank(message = "Guest name is required")
	private String guestName;

	@NotBlank(message = "Guest phone is required")
	@Pattern(regexp = "^[0-9]{10}$", message = "Guest phone must be exactly 10 digits")
	private String guestPhone;

	@NotBlank(message = "Complaint message is required")
	private String message;

	private ComplaintCategory category;

	private Long rideRequestId;

	public String getGuestName() { return guestName; }
	public void setGuestName(String guestName) { this.guestName = guestName; }

	public String getGuestPhone() { return guestPhone; }
	public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

	public String getMessage() { return message; }
	public void setMessage(String message) { this.message = message; }

	public ComplaintCategory getCategory() { return category; }
	public void setCategory(ComplaintCategory category) { this.category = category; }

	public Long getRideRequestId() { return rideRequestId; }
	public void setRideRequestId(Long rideRequestId) { this.rideRequestId = rideRequestId; }
}

