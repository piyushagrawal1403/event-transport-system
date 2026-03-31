package com.dispatch.dto;

import java.time.LocalDate;
import java.util.List;

public class AdminDailyReportDto {

    private LocalDate date;
    private long totalRides;
    private long completedRides;
    private long cancelledRides;
    private long driverDeclinedCount;
    private long openComplaints;
    private long closedComplaints;
    private List<TopDriverDto> topDriversByTrips;
    private List<TopDriverDto> topDriversByKm;

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public long getTotalRides() {
        return totalRides;
    }

    public void setTotalRides(long totalRides) {
        this.totalRides = totalRides;
    }

    public long getCompletedRides() {
        return completedRides;
    }

    public void setCompletedRides(long completedRides) {
        this.completedRides = completedRides;
    }

    public long getCancelledRides() {
        return cancelledRides;
    }

    public void setCancelledRides(long cancelledRides) {
        this.cancelledRides = cancelledRides;
    }

    public long getDriverDeclinedCount() {
        return driverDeclinedCount;
    }

    public void setDriverDeclinedCount(long driverDeclinedCount) {
        this.driverDeclinedCount = driverDeclinedCount;
    }

    public long getOpenComplaints() {
        return openComplaints;
    }

    public void setOpenComplaints(long openComplaints) {
        this.openComplaints = openComplaints;
    }

    public long getClosedComplaints() {
        return closedComplaints;
    }

    public void setClosedComplaints(long closedComplaints) {
        this.closedComplaints = closedComplaints;
    }

    public List<TopDriverDto> getTopDriversByTrips() {
        return topDriversByTrips;
    }

    public void setTopDriversByTrips(List<TopDriverDto> topDriversByTrips) {
        this.topDriversByTrips = topDriversByTrips;
    }

    public List<TopDriverDto> getTopDriversByKm() {
        return topDriversByKm;
    }

    public void setTopDriversByKm(List<TopDriverDto> topDriversByKm) {
        this.topDriversByKm = topDriversByKm;
    }
}

