package com.dispatch.service;

import com.dispatch.dto.CreateComplaintDto;
import com.dispatch.model.ComplaintCategory;
import com.dispatch.model.Complaint;
import com.dispatch.model.ComplaintStatus;
import com.dispatch.repository.ComplaintRepository;
import com.dispatch.repository.RideRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ComplaintServiceTest {

    @Mock private ComplaintRepository complaintRepository;
    @Mock private RideRequestRepository rideRequestRepository;

    private ComplaintService complaintService;

    @BeforeEach
    void setUp() {
        complaintService = new ComplaintService(complaintRepository, rideRequestRepository);
    }

    private CreateComplaintDto dto(String name, String phone, String message) {
        CreateComplaintDto d = new CreateComplaintDto();
        d.setGuestName(name);
        d.setGuestPhone(phone);
        d.setMessage(message);
        return d;
    }

    @Test
    void createComplaint_setsStatusOpen() {
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> {
            Complaint c = inv.getArgument(0);
            c.setId(1L);
            return c;
        });

        Complaint result = complaintService.createComplaint(dto("Alice", "9999999999", "Driver was rude"));

        assertNotNull(result);
        assertEquals(ComplaintStatus.OPEN, result.getStatus());
        assertEquals(ComplaintCategory.OTHERS, result.getCategory());
        assertEquals("Driver was rude", result.getMessage());
    }

    @Test
    void getGuestComplaints_filtersByGuestPhone() {
        when(complaintRepository.findByGuestPhoneOrderByCreatedAtDesc("9999999999"))
                .thenReturn(List.of());

        List<Complaint> result = complaintService.getGuestComplaints("+91-9999999999");

        assertNotNull(result);
        verify(complaintRepository).findByGuestPhoneOrderByCreatedAtDesc("9999999999");
    }

    @Test
    void closeComplaint_setsStatusClosed() {
        Complaint complaint = new Complaint();
        complaint.setId(1L);
        complaint.setStatus(ComplaintStatus.OPEN);
        complaint.setGuestName("Alice");
        complaint.setGuestPhone("9999999999");
        complaint.setMessage("Test");
        complaint.setCreatedAt(Instant.now());

        when(complaintRepository.findById(1L)).thenReturn(Optional.of(complaint));
        when(complaintRepository.save(any(Complaint.class))).thenAnswer(inv -> inv.getArgument(0));

        Complaint result = complaintService.closeComplaint(1L, "Admin");

        assertEquals(ComplaintStatus.CLOSED, result.getStatus());
        assertNotNull(result.getClosedAt());
        assertEquals("Admin", result.getClosedBy());
    }

    @Test
    void closeComplaint_throwsWhenAlreadyClosed() {
        Complaint complaint = new Complaint();
        complaint.setId(1L);
        complaint.setStatus(ComplaintStatus.CLOSED);

        when(complaintRepository.findById(1L)).thenReturn(Optional.of(complaint));

        assertThrows(IllegalStateException.class,
                () -> complaintService.closeComplaint(1L, "Admin"));
    }

    @Test
    void getComplaints_filtersByStatus() {
        when(complaintRepository.findByStatusOrderByCreatedAtDesc(ComplaintStatus.OPEN))
                .thenReturn(List.of());

        List<Complaint> result = complaintService.getComplaints(ComplaintStatus.OPEN, null);

        assertNotNull(result);
        verify(complaintRepository).findByStatusOrderByCreatedAtDesc(ComplaintStatus.OPEN);
    }

    @Test
    void getComplaints_filtersByDate() {
        LocalDate date = LocalDate.of(2026, 3, 31);
        when(complaintRepository.findForAdminFilters(isNull(), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of());

        List<Complaint> result = complaintService.getComplaints(null, date);

        assertNotNull(result);
        verify(complaintRepository).findForAdminFilters(isNull(), any(Instant.class), any(Instant.class));
    }
}

