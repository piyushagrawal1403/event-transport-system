package com.dispatch.service;

import com.dispatch.dto.RideRequestDto;
import com.dispatch.model.*;
import com.dispatch.repository.LocationRepository;
import com.dispatch.repository.RideRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
public class RideService {

    private final RideRequestRepository rideRequestRepository;
    private final LocationRepository locationRepository;

    public RideService(RideRequestRepository rideRequestRepository, LocationRepository locationRepository) {
        this.rideRequestRepository = rideRequestRepository;
        this.locationRepository = locationRepository;
    }

    @Transactional
    public RideRequest createRide(RideRequestDto dto) {
        Location location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + dto.getLocationId()));

        RideRequest ride = new RideRequest();
        ride.setGuestName(dto.getGuestName());
        ride.setGuestPhone(dto.getGuestPhone());
        ride.setPassengerCount(dto.getPassengerCount());
        ride.setDirection(RideDirection.valueOf(dto.getDirection()));
        ride.setLocation(location);
        ride.setStatus(RideStatus.PENDING);

        return rideRequestRepository.save(ride);
    }

    public List<RideRequest> getPendingRides() {
        return rideRequestRepository.findByStatus(RideStatus.PENDING);
    }

    public List<RideRequest> getGuestActiveRides(String phone) {
        return rideRequestRepository.findByGuestPhoneAndStatusIn(phone,
                Arrays.asList(RideStatus.PENDING, RideStatus.ASSIGNED, RideStatus.IN_TRANSIT, RideStatus.ARRIVED));
    }

    public List<RideRequest> getRidesByMagicLink(String magicLinkId) {
        return rideRequestRepository.findByMagicLinkId(magicLinkId);
    }

    public List<RideRequest> getActiveRidesByCab(Long cabId) {
        return rideRequestRepository.findByCabIdAndStatusIn(cabId,
                Arrays.asList(RideStatus.ASSIGNED, RideStatus.IN_TRANSIT, RideStatus.ARRIVED));
    }
}
