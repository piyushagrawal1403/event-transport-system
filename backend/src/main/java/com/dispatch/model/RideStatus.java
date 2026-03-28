package com.dispatch.model;

public enum RideStatus {
    PENDING,
    OFFERED,    // Admin has dispatched — awaiting driver acceptance
    ACCEPTED,   // Driver has accepted the trip
    IN_TRANSIT,
    ARRIVED,
    COMPLETED,
    CANCELLED
}