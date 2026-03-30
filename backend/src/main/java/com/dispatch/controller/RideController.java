package com.dispatch.controller;

import com.dispatch.dto.RideRequestDto;
import com.dispatch.model.RideIncident;
import com.dispatch.model.RideIncidentType;
import com.dispatch.model.RideRequest;
import com.dispatch.service.DispatchService;
import com.dispatch.service.RideService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rides")
public class RideController {

    private final RideService rideService;
    private final DispatchService dispatchService;

    public RideController(RideService rideService, DispatchService dispatchService) {
        this.rideService = rideService;
        this.dispatchService = dispatchService;
    }

    @PostMapping
    public ResponseEntity<RideRequest> createRide(@Valid @RequestBody RideRequestDto dto) {
        RideRequest ride = rideService.createRide(dto);
        return ResponseEntity.ok(ride);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<RideRequest>> getPendingRides() {
        return ResponseEntity.ok(rideService.getPendingRides());
    }

    @GetMapping("/guest")
    public ResponseEntity<List<RideRequest>> getGuestRides(@RequestParam String phone) {
        return ResponseEntity.ok(rideService.getGuestActiveRides(phone));
    }

    @GetMapping("/trip/{magicLinkId}")
    public ResponseEntity<List<RideRequest>> getTripRides(@PathVariable String magicLinkId) {
        return ResponseEntity.ok(rideService.getRidesByMagicLink(magicLinkId));
    }

    @GetMapping("/cab/{cabId}")
    public ResponseEntity<List<RideRequest>> getCabActiveRides(@PathVariable Long cabId) {
        return ResponseEntity.ok(rideService.getActiveRidesByCab(cabId));
    }

    @GetMapping("/ongoing")
    public ResponseEntity<List<RideRequest>> getOngoingRides() {
        return ResponseEntity.ok(rideService.getOngoingRides());
    }

    @GetMapping("/cancelled")
    public ResponseEntity<List<RideIncident>> getCancelledRides(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String driver,
            @RequestParam(required = false) RideIncidentType status) {
        return ResponseEntity.ok(rideService.getCancelledRides(date, driver, status));
    }

    @GetMapping("/cab/{cabId}/completed")
    public ResponseEntity<List<RideRequest>> getCabCompletedRides(@PathVariable Long cabId) {
        return ResponseEntity.ok(rideService.getCompletedRidesByCab(cabId));
    }

    // ── Driver Consent ────────────────────────────────────────────────────────

    /**
     * Driver accepts an offered trip.
     * Transitions the full batch (by magicLinkId) from OFFERED → ACCEPTED.
     */
    @PutMapping("/{id}/accept")
    public ResponseEntity<?> acceptRide(@PathVariable Long id) {
        try {
            List<RideRequest> accepted = dispatchService.acceptRide(id);
            return ResponseEntity.ok(accepted);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Driver denies an offered trip.
     * Reverts the full batch to PENDING and marks the cab AVAILABLE.
     */
    @PutMapping("/{id}/deny")
    public ResponseEntity<?> denyRide(@PathVariable Long id) {
        try {
            List<RideRequest> reverted = dispatchService.denyRide(id);
            return ResponseEntity.ok(reverted);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Cancel ────────────────────────────────────────────────────────────────

    @DeleteMapping("/{rideId}")
    public ResponseEntity<?> cancelRide(@PathVariable Long rideId) {
        try {
            RideRequest cancelled = rideService.cancelRide(rideId);
            return ResponseEntity.ok(cancelled);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}