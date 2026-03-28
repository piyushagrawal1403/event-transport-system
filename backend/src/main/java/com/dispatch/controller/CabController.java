package com.dispatch.controller;

import com.dispatch.model.Cab;
import com.dispatch.model.CabStatus;
import com.dispatch.repository.CabRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/cabs")
public class CabController {

    private final CabRepository cabRepository;

    public CabController(CabRepository cabRepository) {
        this.cabRepository = cabRepository;
    }

    @GetMapping
    public ResponseEntity<List<Cab>> getAllCabs() {
        return ResponseEntity.ok(cabRepository.findAll());
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
