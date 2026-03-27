package com.dispatch.controller;

import com.dispatch.dto.AssignRequestDto;
import com.dispatch.dto.CompleteRequestDto;
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

    @PostMapping("/assign")
    public ResponseEntity<Map<String, String>> assignRides(@Valid @RequestBody AssignRequestDto dto) {
        Map<String, String> result = dispatchService.assignRides(dto);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/complete/{magicLinkId}")
    public ResponseEntity<Map<String, Object>> completeTrip(
            @PathVariable String magicLinkId,
            @Valid @RequestBody CompleteRequestDto dto) {
        boolean success = dispatchService.completeTrip(magicLinkId, dto.getOtp());
        if (success) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Trip completed successfully"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Incorrect OTP"));
        }
    }

    @PostMapping("/status/{magicLinkId}")
    public ResponseEntity<Map<String, String>> updateStatus(
            @PathVariable String magicLinkId,
            @Valid @RequestBody StatusUpdateDto dto) {
        RideStatus newStatus = RideStatus.valueOf(dto.getStatus());
        dispatchService.updateTripStatus(magicLinkId, newStatus);
        return ResponseEntity.ok(Map.of("message", "Status updated to " + newStatus));
    }
}
