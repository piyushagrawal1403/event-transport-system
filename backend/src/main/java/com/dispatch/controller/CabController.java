package com.dispatch.controller;

import com.dispatch.dto.DriverAnalyticsDto;
import com.dispatch.model.Cab;
import com.dispatch.model.CabStatus;
import com.dispatch.model.RideRequest;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.RideRequestRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/cabs")
public class CabController {

    private final CabRepository cabRepository;
    private final RideRequestRepository rideRequestRepository;

    public CabController(CabRepository cabRepository, RideRequestRepository rideRequestRepository) {
        this.cabRepository = cabRepository;
        this.rideRequestRepository = rideRequestRepository;
    }

    @GetMapping
    public ResponseEntity<List<Cab>> getAllCabs() {
        return ResponseEntity.ok(cabRepository.findAll());
    }

    @GetMapping("/{cabId}/analytics")
    public ResponseEntity<DriverAnalyticsDto> getDriverAnalytics(@PathVariable Long cabId) {
        Cab cab = cabRepository.findById(cabId)
                .orElseThrow(() -> new IllegalArgumentException("Cab not found: " + cabId));

        List<RideRequest> rides = rideRequestRepository.findByCabId(cabId);
        double avgAcceptanceSeconds = rides.stream()
                .filter(r -> r.getAssignedAt() != null && r.getAcceptedAt() != null)
                .mapToLong(r -> Duration.between(r.getAssignedAt(), r.getAcceptedAt()).getSeconds())
                .average()
                .orElse(0.0);

        DriverAnalyticsDto dto = new DriverAnalyticsDto();
        dto.setCabId(cab.getId());
        dto.setDriverName(cab.getDriverName());
        dto.setLicensePlate(cab.getLicensePlate());
        dto.setTotalKm(cab.getTotalKm() == null ? 0.0 : cab.getTotalKm());
        dto.setTripsCompleted(cab.getTripsCompleted() == null ? 0 : cab.getTripsCompleted());
        dto.setTripsDenied(cab.getTripsDenied() == null ? 0 : cab.getTripsDenied());
        dto.setAverageAcceptanceTimeSeconds(avgAcceptanceSeconds);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/status")
    public ResponseEntity<Map<String, String>> updateCabStatus(@RequestBody Map<String, String> body) {
        String phone = body.get("phone");
        String statusStr = body.get("status");
        if (phone == null || statusStr == null) {
            throw new IllegalArgumentException("phone and status are required");
        }

        // Sanitize phone
        String sanitized = phone.replaceAll("[^\\d]", "");
        if (sanitized.startsWith("91") && sanitized.length() == 12) {
            sanitized = sanitized.substring(2);
        }

        CabStatus newStatus;
        try {
            newStatus = CabStatus.valueOf(statusStr);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status: " + statusStr + ". Use AVAILABLE or OFFLINE.");
        }

        if (newStatus == CabStatus.BUSY) {
            throw new IllegalArgumentException("Cannot manually set status to BUSY. Use dispatch endpoints.");
        }

        String finalPhone = sanitized;
        Cab cab = cabRepository.findByDriverPhone(finalPhone)
                .orElseThrow(() -> new IllegalArgumentException("No cab found for phone: " + finalPhone));

        if (cab.getStatus() == CabStatus.BUSY && newStatus == CabStatus.OFFLINE) {
            throw new IllegalStateException("Cannot go offline while on an active trip. Complete the trip first.");
        }

        cab.setStatus(newStatus);
        cabRepository.save(cab);

        return ResponseEntity.ok(Map.of("status", cab.getStatus().name(), "message", "Status updated to " + cab.getStatus()));
    }
}
