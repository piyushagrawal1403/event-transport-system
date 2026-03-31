package com.dispatch.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class RideRequestDto {

    @NotBlank(message = "Guest name is required")
    private String guestName;

    @NotBlank(message = "Guest phone is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Guest phone must be exactly 10 digits")
    private String guestPhone;

    @NotNull(message = "Passenger count is required")
    @Min(value = 1, message = "At least 1 passenger required")
    @Max(value = 4, message = "Passenger count must not exceed 4")
    private Integer passengerCount;

    @NotBlank(message = "Direction is required")
    private String direction;

    @NotNull(message = "Location ID is required")
    private Long locationId;

    // Required only when locationId points to the "Others" location.
    // Free-text destination provided by the guest.
    private String customDestination;

    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }

    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

    public Integer getPassengerCount() { return passengerCount; }
    public void setPassengerCount(Integer passengerCount) { this.passengerCount = passengerCount; }

    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }

    public Long getLocationId() { return locationId; }
    public void setLocationId(Long locationId) { this.locationId = locationId; }

    public String getCustomDestination() { return customDestination; }
    public void setCustomDestination(String customDestination) { this.customDestination = customDestination; }
}