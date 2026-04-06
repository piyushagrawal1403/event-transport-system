package com.dispatch.service;

import com.dispatch.dto.AssignRequestDto;
import com.dispatch.model.*;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.EventNotificationRepository;
import com.dispatch.repository.RideRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.security.SecureRandom;
import java.util.*;

@Service
public class DispatchService {

    private static final Logger log = LoggerFactory.getLogger(DispatchService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final CabRepository cabRepository;
    private final RideRequestRepository rideRequestRepository;
    private final EventNotificationRepository eventNotificationRepository;
    private final PushNotificationService pushNotificationService;
    private final RideIncidentService rideIncidentService;

    public DispatchService(CabRepository cabRepository, RideRequestRepository rideRequestRepository,
                          EventNotificationRepository eventNotificationRepository,
                          PushNotificationService pushNotificationService,
                          RideIncidentService rideIncidentService) {
        this.cabRepository = cabRepository;
        this.rideRequestRepository = rideRequestRepository;
        this.eventNotificationRepository = eventNotificationRepository;
        this.pushNotificationService = pushNotificationService;
        this.rideIncidentService = rideIncidentService;
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
        String otp = String.format("%04d", SECURE_RANDOM.nextInt(10000));
        String magicLinkId = UUID.randomUUID().toString();

        cab.setStatus(CabStatus.BUSY);
        cabRepository.save(cab);

        Instant now = Instant.now();
        for (RideRequest ride : rides) {
            ride.setStatus(RideStatus.OFFERED);   // ← was ASSIGNED
            ride.setCab(cab);
            ride.setLastAssignedDriverName(cab.getDriverName());
            ride.setLastAssignedDriverPhone(cab.getDriverPhone());
            ride.setLastAssignedCabLicensePlate(cab.getLicensePlate());
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

        // Notify each guest whose ride was assigned
        Set<String> guestPhones = new HashSet<>();
        for (RideRequest ride : rides) {
            if (ride.getGuestPhone() != null) {
                guestPhones.add(sanitizePhone(ride.getGuestPhone()));
            }
        }
        for (String guestPhone : guestPhones) {
            pushNotificationService.sendPushToGuest(
                    guestPhone,
                    "Cab Assigned",
                    String.format("Your ride is assigned: %s (%s).", cab.getDriverName(), cab.getLicensePlate())
            );
        }

        log.info("action=rides_assigned cabId={} cabPlate='{}' rideCount={} pax={} driver='{}'",
                cab.getId(), cab.getLicensePlate(), rides.size(), totalPassengers, cab.getDriverName());

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
        List<RideRequest> saved = rideRequestRepository.saveAll(batch);

        Cab cab = ride.getCab();
        String driverName = cab != null ? cab.getDriverName() : "Your driver";
        String cabPlate = cab != null ? cab.getLicensePlate() : "assigned cab";
        notifyGuestsInBatch(
                saved,
                "Driver Accepted",
                String.format("%s (%s) accepted your ride and is on the way.", driverName, cabPlate)
        );

        return saved;
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
        String driverName = cab != null ? cab.getDriverName() : "Driver";
        String cabPlate = cab != null ? cab.getLicensePlate() : "unknown cab";
        if (cab != null) {
            cab.setStatus(CabStatus.AVAILABLE);
            cab.setTripsDenied((cab.getTripsDenied() == null ? 0 : cab.getTripsDenied()) + 1);
            cabRepository.save(cab);
        }

        List<RideRequest> batch = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());
        for (RideRequest r : batch) {
            rideIncidentService.recordDriverDeclined(r, cab);
            r.setStatus(RideStatus.PENDING);
            r.setDriverDeniedCount((r.getDriverDeniedCount() == null ? 0 : r.getDriverDeniedCount()) + 1);
            r.setCab(null);
            r.setDropoffOtp(null);
            r.setMagicLinkId(null);
            r.setAssignedAt(null);
            r.setAcceptedAt(null);
        }
        List<RideRequest> savedBatch = rideRequestRepository.saveAll(batch);

        String message = String.format("%s denied %d ride(s) on %s. Reassignment needed.", driverName, savedBatch.size(), cabPlate);
        eventNotificationRepository.save(new EventNotification(message));
        pushNotificationService.sendPushToAdmins("Driver Denied Ride", message);

        return savedBatch;
    }

    private String sanitizePhone(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("[^\\d]", "");
        if (digits.startsWith("91") && digits.length() == 12) {
            digits = digits.substring(2);
        }
        return digits;
    }

    private void notifyGuestsInBatch(List<RideRequest> rides, String title, String body) {
        Set<String> guestPhones = new HashSet<>();
        for (RideRequest ride : rides) {
            if (ride.getGuestPhone() != null) {
                guestPhones.add(sanitizePhone(ride.getGuestPhone()));
            }
        }
        for (String guestPhone : guestPhones) {
            pushNotificationService.sendPushToGuest(guestPhone, title, body);
        }
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
        List<RideRequest> batch = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());

        double completedBatchDistanceKm = batch.stream()
                .map(RideRequest::getLocation)
                .filter(Objects::nonNull)
                .map(Location::getDistanceFromMainVenue)
                .filter(Objects::nonNull)
                .mapToDouble(d -> Math.max(0.0, d))
                .sum();

        if (cab != null) {
            cab.setStatus(CabStatus.AVAILABLE);
            cab.setTripsCompleted(cab.getTripsCompleted() + 1);
            cab.setTotalKm((cab.getTotalKm() == null ? 0.0 : cab.getTotalKm()) + completedBatchDistanceKm);
            cabRepository.save(cab);
        }

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
        List<RideRequest> saved = rideRequestRepository.saveAll(batch);

        notifyGuestsInBatch(
                saved,
                "Driver Arrived",
                "Your driver has arrived at pickup. Please share your OTP to start the trip."
        );
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