package com.dispatch.dto;

import jakarta.validation.constraints.NotNull;
import java.util.List;

public class AssignRequestDto {

    @NotNull(message = "Cab ID is required")
    private Long cabId;

    @NotNull(message = "Ride IDs are required")
    private List<Long> rideIds;

    public Long getCabId() { return cabId; }
    public void setCabId(Long cabId) { this.cabId = cabId; }

    public List<Long> getRideIds() { return rideIds; }
    public void setRideIds(List<Long> rideIds) { this.rideIds = rideIds; }
}
