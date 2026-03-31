package com.dispatch.service;

import com.dispatch.dto.CreateComplaintDto;
import com.dispatch.model.Complaint;
import com.dispatch.model.ComplaintStatus;
import com.dispatch.model.RideRequest;
import com.dispatch.repository.ComplaintRepository;
import com.dispatch.repository.RideRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class ComplaintService {

    private static final Logger log = LoggerFactory.getLogger(ComplaintService.class);

    private final ComplaintRepository complaintRepository;
    private final RideRequestRepository rideRequestRepository;

    public ComplaintService(ComplaintRepository complaintRepository, RideRequestRepository rideRequestRepository) {
        this.complaintRepository = complaintRepository;
        this.rideRequestRepository = rideRequestRepository;
    }

    @Transactional
    public Complaint createComplaint(CreateComplaintDto dto) {
        Complaint complaint = new Complaint();
        complaint.setGuestName(dto.getGuestName().trim());
        complaint.setGuestPhone(sanitizePhone(dto.getGuestPhone()));
        complaint.setMessage(dto.getMessage().trim());

        if (dto.getRideRequestId() != null) {
            RideRequest rideRequest = rideRequestRepository.findById(dto.getRideRequestId())
                    .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + dto.getRideRequestId()));
            complaint.setRideRequest(rideRequest);
        }

        complaint.setStatus(ComplaintStatus.OPEN);
        return complaintRepository.save(complaint);
    }

    public List<Complaint> getComplaints(ComplaintStatus status, LocalDate date) {
        if (date == null) {
            if (status == null) {
                return complaintRepository.findAllByOrderByCreatedAtDesc();
            }
            return complaintRepository.findByStatusOrderByCreatedAtDesc(status);
        }

        ZoneId zoneId = ZoneId.systemDefault();
        Instant start = date.atStartOfDay(zoneId).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(zoneId).toInstant();
        return complaintRepository.findForAdminFilters(status, start, end);
    }

    @Transactional
    public Complaint closeComplaint(Long id, String closedBy) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found: " + id));

        if (complaint.getStatus() == ComplaintStatus.CLOSED) {
            throw new IllegalStateException("Complaint is already closed");
        }

        complaint.setStatus(ComplaintStatus.CLOSED);
        complaint.setClosedAt(Instant.now());
        complaint.setClosedBy((closedBy == null || closedBy.isBlank()) ? "admin" : closedBy.trim());
        log.info("action=complaint_closed complaintId={} closedBy='{}'", complaint.getId(), complaint.getClosedBy());
        return complaintRepository.save(complaint);
    }

    private String sanitizePhone(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("[^\\d]", "");
        if (digits.startsWith("91") && digits.length() == 12) {
            digits = digits.substring(2);
        }
        return digits;
    }
}

