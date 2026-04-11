package com.dispatch.service;

import com.dispatch.dto.RideRequestDto;
import com.dispatch.model.*;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.LocationRepository;
import com.dispatch.repository.RideRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RideServiceTest {

    @Mock private RideRequestRepository rideRequestRepository;
    @Mock private LocationRepository locationRepository;
    @Mock private CabRepository cabRepository;
    @Mock private PushNotificationService pushNotificationService;
    @Mock private RideIncidentService rideIncidentService;

    private RideService rideService;

    @BeforeEach
    void setUp() {
        rideService = new RideService(
                rideRequestRepository, locationRepository, cabRepository,
                pushNotificationService, rideIncidentService
        );
    }

    private Location hotel(Long id, String name) {
        Location loc = new Location(name, false, 5.0);
        loc.setId(id);
        return loc;
    }

    private RideRequestDto dto(String name, String phone, int pax, String direction, Long locationId) {
        RideRequestDto d = new RideRequestDto();
        d.setGuestName(name);
        d.setGuestPhone(phone);
        d.setPassengerCount(pax);
        d.setDirection(direction);
        d.setLocationId(locationId);
        return d;
    }

    @Test
    void createRide_savesAndReturnsRide() {
        Location loc = hotel(1L, "Hotel A");
        when(locationRepository.findById(1L)).thenReturn(Optional.of(loc));
        when(rideRequestRepository.save(any(RideRequest.class))).thenAnswer(inv -> {
            RideRequest r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        RideRequest result = rideService.createRide(dto("Alice", "9999999999", 2, "TO_VENUE", 1L));

        assertNotNull(result);
        assertEquals("Alice", result.getGuestName());
        assertEquals(RideStatus.PENDING, result.getStatus());
        verify(pushNotificationService).sendPushToAdmins(anyString(), anyString());
    }

    @Test
    void createRide_throwsWhenLocationNotFound() {
        when(locationRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> rideService.createRide(dto("Alice", "9999999999", 2, "TO_VENUE", 999L)));
    }

    @Test
    void createRide_throwsWhenLocationIsOthersAndCustomDestinationBlank() {
        Location others = hotel(2L, "Others");
        when(locationRepository.findById(2L)).thenReturn(Optional.of(others));

        RideRequestDto d = dto("Alice", "9999999999", 2, "TO_VENUE", 2L);
        d.setCustomDestination("");

        assertThrows(IllegalArgumentException.class, () -> rideService.createRide(d));
    }

    @Test
    void createRide_allowsOthersWhenCustomDestinationProvided() {
        Location others = hotel(2L, "Others");
        when(locationRepository.findById(2L)).thenReturn(Optional.of(others));
        when(rideRequestRepository.save(any(RideRequest.class))).thenAnswer(inv -> {
            RideRequest r = inv.getArgument(0);
            r.setId(2L);
            return r;
        });

        RideRequestDto d = dto("Alice", "9999999999", 2, "TO_VENUE", 2L);
        d.setCustomDestination("Airport Terminal 2");

        RideRequest result = rideService.createRide(d);

        assertNotNull(result);
        assertEquals("Airport Terminal 2", result.getCustomDestination());
    }

    @Test
    void getPendingRides_delegatesToRepository() {
        when(rideRequestRepository.findByStatus(RideStatus.PENDING)).thenReturn(List.of());

        List<RideRequest> result = rideService.getPendingRides();

        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(rideRequestRepository).findByStatus(RideStatus.PENDING);
    }

    @Test
    void cancelRide_byAdmin_notifiesGuestAndNotAdmins() {
        RideRequest ride = cancellableRide(10L, RideStatus.PENDING, null);
        when(rideRequestRepository.findById(10L)).thenReturn(Optional.of(ride));
        when(rideRequestRepository.save(any(RideRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        RideRequest result = rideService.cancelRide(10L, "ADMIN");

        assertEquals(RideStatus.CANCELLED, result.getStatus());
        verify(pushNotificationService).sendPushToGuest(eq("9999999999"), anyString(), contains("#10"));
        verify(pushNotificationService, never()).sendPushToAdmins(anyString(), anyString());
    }

    @Test
    void cancelRide_byGuest_notifiesAdmins() {
        RideRequest ride = cancellableRide(11L, RideStatus.PENDING, null);
        when(rideRequestRepository.findById(11L)).thenReturn(Optional.of(ride));
        when(rideRequestRepository.save(any(RideRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        RideRequest result = rideService.cancelRide(11L, "GUEST");

        assertEquals(RideStatus.CANCELLED, result.getStatus());
        verify(pushNotificationService).sendPushToAdmins(anyString(), contains("#11"));
        verify(pushNotificationService, never()).sendPushToGuest(anyString(), anyString(), anyString());
    }

    private RideRequest cancellableRide(Long rideId, RideStatus status, Cab cab) {
        RideRequest ride = new RideRequest();
        ride.setId(rideId);
        ride.setGuestName("Alice");
        ride.setGuestPhone("9999999999");
        ride.setPassengerCount(2);
        ride.setStatus(status);
        ride.setCab(cab);
        return ride;
    }
}

