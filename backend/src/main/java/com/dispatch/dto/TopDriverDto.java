package com.dispatch.dto;

public class TopDriverDto {

    private Long cabId;
    private String driverName;
    private String licensePlate;
    private Integer tripsCompleted;
    private Double totalKm;

    public Long getCabId() {
        return cabId;
    }

    public void setCabId(Long cabId) {
        this.cabId = cabId;
    }

    public String getDriverName() {
        return driverName;
    }

    public void setDriverName(String driverName) {
        this.driverName = driverName;
    }

    public String getLicensePlate() {
        return licensePlate;
    }

    public void setLicensePlate(String licensePlate) {
        this.licensePlate = licensePlate;
    }

    public Integer getTripsCompleted() {
        return tripsCompleted;
    }

    public void setTripsCompleted(Integer tripsCompleted) {
        this.tripsCompleted = tripsCompleted;
    }

    public Double getTotalKm() {
        return totalKm;
    }

    public void setTotalKm(Double totalKm) {
        this.totalKm = totalKm;
    }
}

