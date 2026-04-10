package com.dispatch;

import com.dispatch.dto.CreateComplaintDto;
import com.dispatch.model.Cab;
import com.dispatch.model.Complaint;
import com.dispatch.model.ComplaintStatus;
import com.dispatch.model.Location;
import com.dispatch.model.RideDirection;
import com.dispatch.model.RideIncidentType;
import com.dispatch.model.RideRequest;
import com.dispatch.model.RideStatus;
import com.dispatch.model.User;
import com.dispatch.model.UserRole;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.LocationRepository;
import com.dispatch.repository.RideRequestRepository;
import com.dispatch.repository.UserRepository;
import com.dispatch.service.ComplaintService;
import com.dispatch.service.JwtService;
import com.dispatch.service.RideIncidentService;
import com.dispatch.service.RideService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PhaseDIntegrationTest {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private RideService rideService;

    @Autowired
    private RideIncidentService rideIncidentService;

    @Autowired
    private CabRepository cabRepository;

    @Autowired
    private RideRequestRepository rideRequestRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void complaintCloseFlow_marksComplaintClosedAndBlocksSecondClose() {
        CreateComplaintDto dto = new CreateComplaintDto();
        dto.setGuestName("Test Guest");
        dto.setGuestPhone("9999999999");
        dto.setMessage("Need support");

        Complaint created = complaintService.createComplaint(dto);
        Complaint closed = complaintService.closeComplaint(created.getId(), "QA Admin");

        assertEquals(ComplaintStatus.CLOSED, closed.getStatus());
        assertNotNull(closed.getClosedAt());
        assertEquals("QA Admin", closed.getClosedBy());

        assertThrows(IllegalStateException.class, () -> complaintService.closeComplaint(created.getId(), "QA Admin"));
    }

    @Test
    void cancelledQueuePersistence_keepsIncidentAfterRideCancellation() {
        Location location = locationRepository.save(new Location("PhaseD Cancel Hotel", false, 2.5));

        RideRequest ride = new RideRequest();
        ride.setGuestName("Cancel Guest");
        ride.setGuestPhone("9888877777");
        ride.setPassengerCount(2);
        ride.setDirection(RideDirection.TO_VENUE);
        ride.setLocation(location);
        ride.setStatus(RideStatus.PENDING);
        RideRequest savedRide = rideRequestRepository.save(ride);

        rideService.cancelRide(savedRide.getId());

        boolean found = rideIncidentService.getIncidentsForDate(LocalDate.now(), null, null).stream()
                .anyMatch(i -> i.getRideRequestId().equals(savedRide.getId())
                        && i.getIncidentType() == RideIncidentType.GUEST_CANCELLED);

        assertTrue(found, "Expected a persisted guest-cancelled incident for the cancelled ride");
    }

    @Test
    void driverAnalyticsCalculation_returnsTotalKmAndAverageAcceptanceTime() throws Exception {
        Location location = locationRepository.save(new Location("PhaseD Analytics Hotel", false, 5.0));

        Cab cab = new Cab("TEST-" + UUID.randomUUID().toString().substring(0, 8), "Analytics Driver", "9000012345", 4);
        cab.setTotalKm(25.5);
        cab.setTripsCompleted(3);
        cab.setTripsDenied(1);
        Cab savedCab = cabRepository.save(cab);

        RideRequest rideA = buildRideForAnalytics(location, savedCab, 30);
        RideRequest rideB = buildRideForAnalytics(location, savedCab, 90);
        rideRequestRepository.save(rideA);
        rideRequestRepository.save(rideB);

        User admin = new User();
        admin.setName("QA Admin");
        admin.setPhone("9000000001");
        admin.setRole(UserRole.ADMIN);
        String token = jwtService.generateToken(userRepository.save(admin));

        mockMvc.perform(get("/api/v1/cabs/{cabId}/analytics", savedCab.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalKm").value(25.5))
                .andExpect(jsonPath("$.tripsCompleted").value(3))
                .andExpect(jsonPath("$.tripsDenied").value(1))
                .andExpect(jsonPath("$.averageAcceptanceTimeSeconds").value(60.0));
    }

    private RideRequest buildRideForAnalytics(Location location, Cab cab, int acceptanceDelaySeconds) {
        Instant assignedAt = Instant.now().minusSeconds(600);
        RideRequest ride = new RideRequest();
        ride.setGuestName("Rider " + acceptanceDelaySeconds);
        ride.setGuestPhone("9000000000");
        ride.setPassengerCount(1);
        ride.setDirection(RideDirection.TO_VENUE);
        ride.setLocation(location);
        ride.setCab(cab);
        ride.setStatus(RideStatus.ACCEPTED);
        ride.setAssignedAt(assignedAt);
        ride.setAcceptedAt(assignedAt.plusSeconds(acceptanceDelaySeconds));
        return ride;
    }
}

