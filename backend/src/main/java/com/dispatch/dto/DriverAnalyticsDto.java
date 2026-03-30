package com.dispatch.dto;

public class DriverAnalyticsDto {

    private Long cabId;
    private String driverName;
    private String licensePlate;
    private Double totalKm;
    private Integer tripsCompleted;
    private Integer tripsDenied;
    private Double averageAcceptanceTimeSeconds;

    public Long getCabId() { return cabId; }
    public void setCabId(Long cabId) { this.cabId = cabId; }

    public String getDriverName() { return driverName; }
    public void setDriverName(String driverName) { this.driverName = driverName; }

    public String getLicensePlate() { return licensePlate; }
    public void setLicensePlate(String licensePlate) { this.licensePlate = licensePlate; }

    public Double getTotalKm() { return totalKm; }
    public void setTotalKm(Double totalKm) { this.totalKm = totalKm; }

    public Integer getTripsCompleted() { return tripsCompleted; }
    public void setTripsCompleted(Integer tripsCompleted) { this.tripsCompleted = tripsCompleted; }

    public Integer getTripsDenied() { return tripsDenied; }
    public void setTripsDenied(Integer tripsDenied) { this.tripsDenied = tripsDenied; }

    public Double getAverageAcceptanceTimeSeconds() { return averageAcceptanceTimeSeconds; }
    public void setAverageAcceptanceTimeSeconds(Double averageAcceptanceTimeSeconds) { this.averageAcceptanceTimeSeconds = averageAcceptanceTimeSeconds; }
}

