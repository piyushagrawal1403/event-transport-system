package com.dispatch.service;

import com.dispatch.dto.AssignRequestDto;
import com.dispatch.model.*;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.EventNotificationRepository;
import com.dispatch.repository.RideRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class DispatchService {

    private final CabRepository cabRepository;
    private final RideRequestRepository rideRequestRepository;
    private final EventNotificationRepository eventNotificationRepository;
    private final PushNotificationService pushNotificationService;

    public DispatchService(CabRepository cabRepository, RideRequestRepository rideRequestRepository,
                          EventNotificationRepository eventNotificationRepository,
                          PushNotificationService pushNotificationService) {
        this.cabRepository = cabRepository;
        this.rideRequestRepository = rideRequestRepository;
        this.eventNotificationRepository = eventNotificationRepository;
        this.pushNotificationService = pushNotificationService;
    }

    // ── Assign (Admin → Driver) ───────────────────────────────────────────────

    /**
     * Batches rides onto a cab and transitions them to OFFERED.
     * The cab is marked BUSY immediately so it cannot be double-assigned.
     * The driver must still accept before the OTP start flow begins.
     */
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

        int totalPassengers = rides.stream().mapToInt(RideRequest::getPassengerCount).sum();
        if (totalPassengers > cab.getCapacity()) {
            throw new IllegalStateException(
                    "Total passengers (" + totalPassengers + ") exceeds cab capacity (" + cab.getCapacity() + "). "
                            + "Assign fewer rides to this cab.");
        }

        // OTP is now used at trip START, not drop-off — field name kept for schema compat
        String otp = String.format("%04d", new Random().nextInt(10000));
        String magicLinkId = UUID.randomUUID().toString();

        cab.setStatus(CabStatus.BUSY);
        cabRepository.save(cab);

        Instant now = Instant.now();
        for (RideRequest ride : rides) {
            ride.setStatus(RideStatus.OFFERED);   // ← was ASSIGNED
            ride.setCab(cab);
            ride.setDropoffOtp(otp);
            ride.setMagicLinkId(magicLinkId);
            ride.setAssignedAt(now);
        }
        rideRequestRepository.saveAll(rides);

        // Send push notification to driver
        if (cab.getDriverPhone() != null) {
            pushNotificationService.sendPushToDriver(cab.getDriverPhone(), "New Ride Assignment", 
                String.format("You have been assigned %d ride(s) for pickup. Please check your dashboard.", rides.size()));
        }

        Map<String, String> result = new HashMap<>();
        result.put("magicLinkId", magicLinkId);
        result.put("otp", otp);
        result.put("cabLicensePlate", cab.getLicensePlate());
        result.put("driverName", cab.getDriverName());
        result.put("driverPhone", cab.getDriverPhone());
        return result;
    }

    // ── Driver Consent ────────────────────────────────────────────────────────

    /**
     * Driver accepts an offered trip.
     * Transitions all rides in the batch from OFFERED → ACCEPTED and
     * stamps acceptedAt on each ride.
     */
    @Transactional
    public List<RideRequest> acceptRide(Long rideId) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));

        if (ride.getStatus() != RideStatus.OFFERED) {
            throw new IllegalStateException("Ride " + rideId + " is not in OFFERED status");
        }

        List<RideRequest> batch = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());
        Instant now = Instant.now();
        for (RideRequest r : batch) {
            r.setStatus(RideStatus.ACCEPTED);
            r.setAcceptedAt(now);
        }
        return rideRequestRepository.saveAll(batch);
    }

    /**
     * Driver denies an offered trip.
     * Reverts all rides in the batch to PENDING and frees the cab.
     */
    @Transactional
    public List<RideRequest> denyRide(Long rideId) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));

        if (ride.getStatus() != RideStatus.OFFERED) {
            throw new IllegalStateException("Ride " + rideId + " is not in OFFERED status");
        }

        Cab cab = ride.getCab();
        if (cab != null) {
            cab.setStatus(CabStatus.AVAILABLE);
            cabRepository.save(cab);
        }

        List<RideRequest> batch = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());
        for (RideRequest r : batch) {
            r.setStatus(RideStatus.PENDING);
            r.setCab(null);
            r.setDropoffOtp(null);
            r.setMagicLinkId(null);
            r.setAssignedAt(null);
        }
        return rideRequestRepository.saveAll(batch);
    }

    // ── Trip Start (OTP gate) ─────────────────────────────────────────────────

    /**
     * Guest presents their OTP to the driver at trip start.
     * Returns false if the OTP is wrong without throwing.
     * On success, all rides in the batch transition to IN_TRANSIT.
     * Accepts both ACCEPTED and ARRIVED statuses.
     */
    @Transactional
    public boolean startTrip(Long rideId, String otp) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));

        if (ride.getStatus() != RideStatus.ACCEPTED && ride.getStatus() != RideStatus.ARRIVED) {
            throw new IllegalStateException("Ride " + rideId + " must be ACCEPTED or ARRIVED before starting");
        }

        if (!otp.equals(ride.getDropoffOtp())) {
            return false;
        }

        List<RideRequest> batch = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());
        for (RideRequest r : batch) {
            r.setStatus(RideStatus.IN_TRANSIT);
        }
        rideRequestRepository.saveAll(batch);
        return true;
    }

    // ── Trip Completion (no OTP) ───────────────────────────────────────────────

    /**
     * Completes a trip — no OTP required at drop-off.
     * Frees the cab and increments its trip counter.
     */
    @Transactional
    public void completeTrip(Long rideId) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));

        if (ride.getStatus() == RideStatus.COMPLETED) {
            throw new IllegalStateException("Trip is already completed");
        }

        if (ride.getStatus() != RideStatus.IN_TRANSIT && ride.getStatus() != RideStatus.ARRIVED) {
            throw new IllegalStateException("Trip must be IN_TRANSIT or ARRIVED to complete");
        }

        Cab cab = ride.getCab();
        if (cab != null) {
            cab.setStatus(CabStatus.AVAILABLE);
            cab.setTripsCompleted(cab.getTripsCompleted() + 1);
            cabRepository.save(cab);
        }

        List<RideRequest> batch = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());
        for (RideRequest r : batch) {
            r.setStatus(RideStatus.COMPLETED);
        }
        rideRequestRepository.saveAll(batch);
    }

    // ── Generic Status Update (admin override) ────────────────────────────────

    @Transactional
    public void updateTripStatus(String magicLinkId, RideStatus newStatus) {
        if (newStatus == RideStatus.COMPLETED || newStatus == RideStatus.PENDING) {
            throw new IllegalArgumentException("Cannot set status to " + newStatus + " via this endpoint");
        }

        List<RideRequest> rides = rideRequestRepository.findByMagicLinkId(magicLinkId);
        if (rides.isEmpty()) {
            throw new IllegalArgumentException("No rides found for magic link: " + magicLinkId);
        }

        for (RideRequest ride : rides) {
            ride.setStatus(newStatus);
        }
        rideRequestRepository.saveAll(rides);
    }

    // ── Mark as Arrived (ACCEPTED → ARRIVED) ──────────────────────────────────

    /**
     * Driver marks the ride batch as arrived at pickup.
     * This transitions the status from ACCEPTED to ARRIVED.
     * Once arrived, the driver can enter the OTP to start the trip.
     */
    @Transactional
    public void markArrived(Long rideId) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));

        if (ride.getStatus() != RideStatus.ACCEPTED) {
            throw new IllegalStateException("Ride " + rideId + " must be ACCEPTED before marking as arrived");
        }

        List<RideRequest> batch = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());
        for (RideRequest r : batch) {
            r.setStatus(RideStatus.ARRIVED);
        }
        rideRequestRepository.saveAll(batch);
    }

    // ── Ride Cancellation with Notification ──────────────────────────────────

    /**
     * Cancel an accepted ride and notify the driver.
     * Reverts all rides in the batch to PENDING and frees the cab.
     */
    @Transactional
    public void cancelAcceptedRide(Long rideId) {
        RideRequest ride = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));

        if (ride.getStatus() != RideStatus.ACCEPTED && ride.getStatus() != RideStatus.ARRIVED) {
            throw new IllegalStateException("Can only cancel ACCEPTED or ARRIVED rides");
        }

        String driverPhone = ride.getCab() != null ? ride.getCab().getDriverPhone() : null;

        Cab cab = ride.getCab();
        if (cab != null) {
            cab.setStatus(CabStatus.AVAILABLE);
            cabRepository.save(cab);
        }

        List<RideRequest> batch = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());
        for (RideRequest r : batch) {
            r.setStatus(RideStatus.CANCELLED);
            r.setMagicLinkId(null);
            r.setAssignedAt(null);
        }
        rideRequestRepository.saveAll(batch);

        // Send targeted notification to driver
        if (driverPhone != null) {
            String message = String.format("Your accepted ride #%d has been cancelled by admin", rideId);
            EventNotification notification = new EventNotification(message, driverPhone);
            eventNotificationRepository.save(notification);

            // Send push notification
            pushNotificationService.sendPushToDriver(driverPhone, "Ride Cancelled", 
                String.format("Ride #%d has been cancelled. You are now available for new assignments", rideId));
        }
    }
}