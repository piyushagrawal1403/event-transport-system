package com.dispatch.controller;

import com.dispatch.dto.CloseComplaintDto;
import com.dispatch.dto.CreateComplaintDto;
import com.dispatch.model.Complaint;
import com.dispatch.model.ComplaintStatus;
import com.dispatch.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping
    public ResponseEntity<Complaint> createComplaint(@Valid @RequestBody CreateComplaintDto dto) {
        return ResponseEntity.ok(complaintService.createComplaint(dto));
    }

    @GetMapping
    public ResponseEntity<List<Complaint>> getComplaints(
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(complaintService.getComplaints(status, date));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<Complaint>> getMyComplaints(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String guestPhone = String.valueOf(authentication.getPrincipal());
        return ResponseEntity.ok(complaintService.getGuestComplaints(guestPhone));
    }

    @RequestMapping(value = "/{id}/close", method = {RequestMethod.PATCH, RequestMethod.PUT})
    public ResponseEntity<Complaint> closeComplaint(@PathVariable Long id, @RequestBody(required = false) CloseComplaintDto dto) {
        String closedBy = dto == null ? null : dto.getClosedBy();
        return ResponseEntity.ok(complaintService.closeComplaint(id, closedBy));
    }
}

