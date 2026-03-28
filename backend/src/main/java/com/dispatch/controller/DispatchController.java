package com.dispatch.controller;

import com.dispatch.dto.AssignRequestDto;
import com.dispatch.dto.StartTripDto;
import com.dispatch.dto.StatusUpdateDto;
import com.dispatch.model.RideStatus;
import com.dispatch.service.DispatchService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/dispatch")
public class DispatchController {

    private final DispatchService dispatchService;

    public DispatchController(DispatchService dispatchService) {
        this.dispatchService = dispatchService;
    }

    // ── Assign (PENDING → OFFERED) ────────────────────────────────────────────

    @PostMapping("/assign")
    public ResponseEntity<Map<String, String>> assignRides(@Valid @RequestBody AssignRequestDto dto) {
        Map<String, String> result = dispatchService.assignRides(dto);
        return ResponseEntity.ok(result);
    }

    // ── Start Trip: OTP gate (ACCEPTED → IN_TRANSIT) ──────────────────────────

    /**
     * Driver enters the OTP shown on the guest's screen to start the trip.
     * The OTP is now verified at trip start, not at drop-off.
     */
    @PostMapping("/start/{id}")
    public ResponseEntity<Map<String, Object>> startTrip(
            @PathVariable Long id,
            @Valid @RequestBody StartTripDto dto) {
        try {
            boolean success = dispatchService.startTrip(id, dto.getOtp());
            if (success) {
                return ResponseEntity.ok(Map.of("success", true, "message", "Trip started"));
            } else {
                return ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Incorrect OTP"));
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ── Complete Trip: no OTP (IN_TRANSIT|ARRIVED → COMPLETED) ───────────────

    /**
     * Driver marks the trip as complete — no OTP needed at drop-off.
     * Frees the cab and increments its trip counter.
     */
    @PostMapping("/complete/{id}")
    public ResponseEntity<Map<String, Object>> completeTrip(@PathVariable Long id) {
        try {
            dispatchService.completeTrip(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Trip completed successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // ── Generic Status Update (admin override, via magicLinkId) ──────────────

    @PostMapping("/status/{magicLinkId}")
    public ResponseEntity<Map<String, String>> updateStatus(
            @PathVariable String magicLinkId,
            @Valid @RequestBody StatusUpdateDto dto) {
        RideStatus newStatus = RideStatus.valueOf(dto.getStatus());
        dispatchService.updateTripStatus(magicLinkId, newStatus);
        return ResponseEntity.ok(Map.of("message", "Status updated to " + newStatus));
    }

    // ── Mark Arrived (ACCEPTED → ARRIVED) ─────────────────────────────────────

    /**
     * Driver marks the ride as arrived at pickup location.
     * This is the step before entering OTP to start the trip.
     */
    @PostMapping("/arrive/{id}")
    public ResponseEntity<Map<String, Object>> markArrived(@PathVariable Long id) {
        try {
            dispatchService.markArrived(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Marked as arrived"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}