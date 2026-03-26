package com.dispatch.service;

import com.dispatch.dto.AssignRequestDto;
import com.dispatch.model.*;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.RideRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class DispatchService {

    private final CabRepository cabRepository;
    private final RideRequestRepository rideRequestRepository;

    public DispatchService(CabRepository cabRepository, RideRequestRepository rideRequestRepository) {
        this.cabRepository = cabRepository;
        this.rideRequestRepository = rideRequestRepository;
    }

    @Transactional
    public Map<String, String> assignRides(AssignRequestDto dto) {
        Cab cab = cabRepository.findById(dto.getCabId())
                .orElseThrow(() -> new IllegalArgumentException("Cab not found: " + dto.getCabId()));

        if (cab.getStatus() != CabStatus.AVAILABLE) {
            throw new IllegalStateException("Cab is not available: " + cab.getLicensePlate());
        }

        List<RideRequest> rides = rideRequestRepository.findAllById(dto.getRideIds());
        if (rides.size() != dto.getRideIds().size()) {
            throw new IllegalArgumentException("Some ride IDs were not found");
        }

        for (RideRequest ride : rides) {
            if (ride.getStatus() != RideStatus.PENDING) {
                throw new IllegalStateException("Ride " + ride.getId() + " is not in PENDING status");
            }
        }

        String otp = String.format("%04d", new Random().nextInt(10000));
        String magicLinkId = UUID.randomUUID().toString();

        cab.setStatus(CabStatus.BUSY);
        cabRepository.save(cab);

        for (RideRequest ride : rides) {
            ride.setStatus(RideStatus.ASSIGNED);
            ride.setCab(cab);
            ride.setDropoffOtp(otp);
            ride.setMagicLinkId(magicLinkId);
        }
        rideRequestRepository.saveAll(rides);

        // Log SMS payload for the driver
        System.out.println("=== SMS TO DRIVER ===");
        System.out.println("To: " + cab.getDriverPhone() + " (" + cab.getDriverName() + ")");
        System.out.println("Cab: " + cab.getLicensePlate());
        System.out.println("Passengers: " + rides.stream().mapToInt(RideRequest::getPassengerCount).sum());
        System.out.println("Magic Link: /d/" + magicLinkId);
        System.out.println("OTP: " + otp);
        System.out.println("=====================");

        Map<String, String> result = new HashMap<>();
        result.put("magicLinkId", magicLinkId);
        result.put("otp", otp);
        result.put("cabLicensePlate", cab.getLicensePlate());
        result.put("driverName", cab.getDriverName());
        result.put("driverPhone", cab.getDriverPhone());
        return result;
    }

    @Transactional
    public boolean completeTrip(String magicLinkId, String otp) {
        List<RideRequest> rides = rideRequestRepository.findByMagicLinkId(magicLinkId);
        if (rides.isEmpty()) {
            throw new IllegalArgumentException("No rides found for magic link: " + magicLinkId);
        }

        RideRequest firstRide = rides.get(0);
        if (!otp.equals(firstRide.getDropoffOtp())) {
            return false;
        }

        Cab cab = firstRide.getCab();
        if (cab != null) {
            cab.setStatus(CabStatus.AVAILABLE);
            cabRepository.save(cab);
        }

        for (RideRequest ride : rides) {
            ride.setStatus(RideStatus.COMPLETED);
        }
        rideRequestRepository.saveAll(rides);

        return true;
    }

    @Transactional
    public void updateTripStatus(String magicLinkId, RideStatus newStatus) {
        List<RideRequest> rides = rideRequestRepository.findByMagicLinkId(magicLinkId);
        if (rides.isEmpty()) {
            throw new IllegalArgumentException("No rides found for magic link: " + magicLinkId);
        }

        for (RideRequest ride : rides) {
            ride.setStatus(newStatus);
        }
        rideRequestRepository.saveAll(rides);
    }
}
