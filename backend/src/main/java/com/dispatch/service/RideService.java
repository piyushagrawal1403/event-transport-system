package com.dispatch.service;

import com.dispatch.dto.RideRequestDto;
import com.dispatch.model.*;
import com.dispatch.repository.CabRepository;
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
    private final CabRepository cabRepository;

    public RideService(RideRequestRepository rideRequestRepository, LocationRepository locationRepository, CabRepository cabRepository) {
        this.rideRequestRepository = rideRequestRepository;
        this.locationRepository = locationRepository;
        this.cabRepository = cabRepository;
    }

    @Transactional
    public RideRequest createRide(RideRequestDto dto) {
        Location location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + dto.getLocationId()));

        RideRequest ride = new RideRequest();
        ride.setGuestName(dto.getGuestName());
        ride.setGuestPhone(sanitizePhone(dto.getGuestPhone()));
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
        return rideRequestRepository.findByGuestPhoneAndStatusIn(sanitizePhone(phone),
                Arrays.asList(RideStatus.PENDING, RideStatus.ASSIGNED, RideStatus.IN_TRANSIT, RideStatus.ARRIVED));
    }

    public List<RideRequest> getRidesByMagicLink(String magicLinkId) {
        return rideRequestRepository.findByMagicLinkId(magicLinkId);
    }

    public List<RideRequest> getActiveRidesByCab(Long cabId) {
        return rideRequestRepository.findByCabIdAndStatusIn(cabId,
                Arrays.asList(RideStatus.ASSIGNED, RideStatus.IN_TRANSIT, RideStatus.ARRIVED));
    }

    public List<RideRequest> getOngoingRides() {
        return rideRequestRepository.findByStatusIn(
                Arrays.asList(RideStatus.ASSIGNED, RideStatus.IN_TRANSIT, RideStatus.ARRIVED));
    }

    public List<RideRequest> getCompletedRidesByCab(Long cabId) {
        return rideRequestRepository.findByCabIdAndStatus(cabId, RideStatus.COMPLETED);
    }

    @Transactional
    public RideRequest cancelRide(Long rideId) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));

        if (ride.getStatus() == RideStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a completed ride");
        }
        if (ride.getStatus() == RideStatus.CANCELLED) {
            throw new IllegalStateException("Ride is already cancelled");
        }

        if (ride.getStatus() == RideStatus.ASSIGNED || ride.getStatus() == RideStatus.IN_TRANSIT || ride.getStatus() == RideStatus.ARRIVED) {
            Cab cab = ride.getCab();
            if (cab != null) {
                // Check if there are other non-cancelled rides for this cab's current trip
                List<RideRequest> siblingRides = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());
                long activeCount = siblingRides.stream()
                        .filter(r -> r.getId() != rideId && r.getStatus() != RideStatus.CANCELLED && r.getStatus() != RideStatus.COMPLETED)
                        .count();
                if (activeCount == 0) {
                    cab.setStatus(CabStatus.AVAILABLE);
                    cabRepository.save(cab);
                }
            }
        }

        ride.setStatus(RideStatus.CANCELLED);
        return rideRequestRepository.save(ride);
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
