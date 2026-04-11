package com.dispatch;

import com.dispatch.model.Location;
import com.dispatch.model.RideDirection;
import com.dispatch.model.RideRequest;
import com.dispatch.model.RideStatus;
import com.dispatch.model.User;
import com.dispatch.model.UserRole;
import com.dispatch.repository.LocationRepository;
import com.dispatch.repository.RideRequestRepository;
import com.dispatch.repository.UserRepository;
import com.dispatch.service.JwtService;
import com.dispatch.service.PushNotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RideCancellationEndpointIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RideRequestRepository rideRequestRepository;

    @Autowired
    private LocationRepository locationRepository;

    @MockBean
    private PushNotificationService pushNotificationService;

    @Test
    void adminCancelRide_notifiesGuestAndReturnsCancelledRide() throws Exception {
        Location location = locationRepository.save(new Location("Cancel Endpoint Hotel", false, 3.5));

        RideRequest ride = new RideRequest();
        ride.setGuestName("Endpoint Guest");
        ride.setGuestPhone("9876501234");
        ride.setPassengerCount(2);
        ride.setDirection(RideDirection.TO_VENUE);
        ride.setLocation(location);
        ride.setStatus(RideStatus.PENDING);
        RideRequest savedRide = rideRequestRepository.save(ride);

        User admin = new User();
        admin.setName("Endpoint Admin");
        admin.setPhone("9000000099");
        admin.setRole(UserRole.ADMIN);
        String token = jwtService.generateToken(userRepository.save(admin));

        mockMvc.perform(delete("/api/v1/rides/{rideId}", savedRide.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedRide.getId()))
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        verify(pushNotificationService).sendPushToGuest(eq("9876501234"), anyString(), contains("#" + savedRide.getId()));
        verify(pushNotificationService, never()).sendPushToAdmins(anyString(), anyString());
    }

    @Test
    void guestCancelRide_notifiesAdminsAndReturnsCancelledRide() throws Exception {
        Location location = locationRepository.save(new Location("Guest Cancel Endpoint Hotel", false, 2.2));

        RideRequest ride = new RideRequest();
        ride.setGuestName("Guest Actor");
        ride.setGuestPhone("9988776655");
        ride.setPassengerCount(1);
        ride.setDirection(RideDirection.TO_HOTEL);
        ride.setLocation(location);
        ride.setStatus(RideStatus.PENDING);
        RideRequest savedRide = rideRequestRepository.save(ride);

        User guest = new User();
        guest.setName("Guest Actor");
        guest.setPhone("9988776655");
        guest.setRole(UserRole.GUEST);
        String token = jwtService.generateToken(userRepository.save(guest));

        mockMvc.perform(delete("/api/v1/rides/{rideId}", savedRide.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedRide.getId()))
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        verify(pushNotificationService).sendPushToAdmins(anyString(), contains("#" + savedRide.getId()));
        verify(pushNotificationService, never()).sendPushToGuest(eq("9988776655"), anyString(), anyString());
    }
}

