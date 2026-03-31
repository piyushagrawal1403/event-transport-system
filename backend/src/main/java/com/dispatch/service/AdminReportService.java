package com.dispatch.service;

import com.dispatch.dto.AdminDailyReportDto;
import com.dispatch.dto.TopDriverDto;
import com.dispatch.model.Cab;
import com.dispatch.model.Complaint;
import com.dispatch.model.ComplaintStatus;
import com.dispatch.model.RideIncident;
import com.dispatch.model.RideIncidentType;
import com.dispatch.model.RideRequest;
import com.dispatch.model.RideStatus;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.ComplaintRepository;
import com.dispatch.repository.RideIncidentRepository;
import com.dispatch.repository.RideRequestRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class AdminReportService {

    private final RideRequestRepository rideRequestRepository;
    private final RideIncidentRepository rideIncidentRepository;
    private final ComplaintRepository complaintRepository;
    private final CabRepository cabRepository;
    private final RideIncidentService rideIncidentService;
    private final ComplaintService complaintService;

    public AdminReportService(RideRequestRepository rideRequestRepository,
                              RideIncidentRepository rideIncidentRepository,
                              ComplaintRepository complaintRepository,
                              CabRepository cabRepository,
                              RideIncidentService rideIncidentService,
                              ComplaintService complaintService) {
        this.rideRequestRepository = rideRequestRepository;
        this.rideIncidentRepository = rideIncidentRepository;
        this.complaintRepository = complaintRepository;
        this.cabRepository = cabRepository;
        this.rideIncidentService = rideIncidentService;
        this.complaintService = complaintService;
    }

    public AdminDailyReportDto getDailyReport(LocalDate date) {
        LocalDate target = date == null ? LocalDate.now() : date;
        Instant start = target.atStartOfDay(ZoneId.systemDefault()).toInstant();
        Instant end = target.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant();

        AdminDailyReportDto report = new AdminDailyReportDto();
        report.setDate(target);
        report.setTotalRides(rideRequestRepository.countByRequestedAtBetween(start, end));
        report.setCompletedRides(rideRequestRepository.countByRequestedAtBetweenAndStatus(start, end, RideStatus.COMPLETED));
        report.setCancelledRides(rideRequestRepository.countByRequestedAtBetweenAndStatus(start, end, RideStatus.CANCELLED));
        report.setDriverDeclinedCount(rideIncidentRepository.countByOccurredAtBetweenAndIncidentType(start, end, RideIncidentType.DRIVER_DECLINED));
        report.setOpenComplaints(complaintRepository.countByStatus(ComplaintStatus.OPEN));
        report.setClosedComplaints(complaintRepository.countByStatus(ComplaintStatus.CLOSED));
        report.setTopDriversByTrips(toTopDriverDtos(cabRepository.findTop10ByOrderByTripsCompletedDesc()));
        report.setTopDriversByKm(toTopDriverDtos(cabRepository.findTop10ByOrderByTotalKmDesc()));
        return report;
    }

    public String exportCancelledQueueCsv(LocalDate date, String driver, RideIncidentType status) {
        List<RideIncident> incidents = rideIncidentService.getIncidentsForDate(date, driver, status);
        StringBuilder csv = new StringBuilder();
        csv.append("id,rideRequestId,incidentType,occurredAt,guestName,guestPhone,passengerCount,direction,locationName,customDestination,driverName,driverPhone,cabLicensePlate,driverDeniedCount\n");
        for (RideIncident i : incidents) {
            csv.append(i.getId()).append(',')
                    .append(i.getRideRequestId()).append(',')
                    .append(i.getIncidentType()).append(',')
                    .append(csv(i.getOccurredAt() == null ? null : i.getOccurredAt().toString())).append(',')
                    .append(csv(i.getGuestName())).append(',')
                    .append(csv(i.getGuestPhone())).append(',')
                    .append(i.getPassengerCount()).append(',')
                    .append(i.getDirection()).append(',')
                    .append(csv(i.getLocationName())).append(',')
                    .append(csv(i.getCustomDestination())).append(',')
                    .append(csv(i.getDriverName())).append(',')
                    .append(csv(i.getDriverPhone())).append(',')
                    .append(csv(i.getCabLicensePlate())).append(',')
                    .append(i.getDriverDeniedCount() == null ? "" : i.getDriverDeniedCount())
                    .append('\n');
        }
        return csv.toString();
    }

    public String exportDriverAnalyticsCsv() {
        List<Cab> cabs = cabRepository.findAll();
        StringBuilder csv = new StringBuilder();
        csv.append("cabId,licensePlate,driverName,driverPhone,status,tripsCompleted,tripsDenied,totalKm,averageAcceptanceTimeSeconds\n");
        for (Cab cab : cabs) {
            double averageAcceptance = averageAcceptanceSeconds(cab.getId());
            csv.append(cab.getId()).append(',')
                    .append(csv(cab.getLicensePlate())).append(',')
                    .append(csv(cab.getDriverName())).append(',')
                    .append(csv(cab.getDriverPhone())).append(',')
                    .append(cab.getStatus()).append(',')
                    .append(valueOrZero(cab.getTripsCompleted())).append(',')
                    .append(valueOrZero(cab.getTripsDenied())).append(',')
                    .append(String.format(Locale.ROOT, "%.2f", cab.getTotalKm() == null ? 0.0 : cab.getTotalKm())).append(',')
                    .append(String.format(Locale.ROOT, "%.2f", averageAcceptance))
                    .append('\n');
        }
        return csv.toString();
    }

    public String exportComplaintsCsv(ComplaintStatus status, LocalDate date) {
        List<Complaint> complaints = complaintService.getComplaints(status, date);
        StringBuilder csv = new StringBuilder();
        csv.append("id,guestName,guestPhone,message,status,createdAt,closedAt,closedBy,rideRequestId\n");
        for (Complaint complaint : complaints) {
            csv.append(complaint.getId()).append(',')
                    .append(csv(complaint.getGuestName())).append(',')
                    .append(csv(complaint.getGuestPhone())).append(',')
                    .append(csv(complaint.getMessage())).append(',')
                    .append(complaint.getStatus()).append(',')
                    .append(csv(formatInstant(complaint.getCreatedAt()))).append(',')
                    .append(csv(formatInstant(complaint.getClosedAt()))).append(',')
                    .append(csv(complaint.getClosedBy())).append(',')
                    .append(complaint.getRideRequest() == null ? "" : complaint.getRideRequest().getId())
                    .append('\n');
        }
        return csv.toString();
    }

    private List<TopDriverDto> toTopDriverDtos(List<Cab> cabs) {
        return cabs.stream().map(cab -> {
            TopDriverDto dto = new TopDriverDto();
            dto.setCabId(cab.getId());
            dto.setDriverName(cab.getDriverName());
            dto.setLicensePlate(cab.getLicensePlate());
            dto.setTripsCompleted(valueOrZero(cab.getTripsCompleted()));
            dto.setTotalKm(cab.getTotalKm() == null ? 0.0 : cab.getTotalKm());
            return dto;
        }).collect(Collectors.toList());
    }

    private double averageAcceptanceSeconds(Long cabId) {
        List<RideRequest> rides = rideRequestRepository.findByCabId(cabId);
        return rides.stream()
                .filter(r -> r.getAssignedAt() != null && r.getAcceptedAt() != null)
                .mapToLong(r -> Duration.between(r.getAssignedAt(), r.getAcceptedAt()).getSeconds())
                .average()
                .orElse(0.0);
    }

    private int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    private String formatInstant(Instant instant) {
        return instant == null ? null : DateTimeFormatter.ISO_INSTANT.format(instant);
    }

    private String csv(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\r")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}

