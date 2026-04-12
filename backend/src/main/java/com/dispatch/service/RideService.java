package com.dispatch.service;

import com.dispatch.dto.RideRequestDto;
import com.dispatch.model.*;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.LocationRepository;
import com.dispatch.repository.RideRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.time.LocalDate;

@Service
public class RideService {

    private static final Logger log = LoggerFactory.getLogger(RideService.class);

    private final RideRequestRepository rideRequestRepository;
    private final LocationRepository locationRepository;
    private final CabRepository cabRepository;
    private final PushNotificationService pushNotificationService;
    private final RideIncidentService rideIncidentService;

    public RideService(RideRequestRepository rideRequestRepository,
                       LocationRepository locationRepository,
                       CabRepository cabRepository,
                       PushNotificationService pushNotificationService,
                       RideIncidentService rideIncidentService) {
        this.rideRequestRepository = rideRequestRepository;
        this.locationRepository = locationRepository;
        this.cabRepository = cabRepository;
        this.pushNotificationService = pushNotificationService;
        this.rideIncidentService = rideIncidentService;
    }

    @Transactional
    public RideRequest createRide(RideRequestDto dto) {
        Location location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + dto.getLocationId()));

        // Require customDestination when the guest selects "Others"
        if ("Others".equalsIgnoreCase(location.getName())
                && (dto.getCustomDestination() == null || dto.getCustomDestination().isBlank())) {
            throw new IllegalArgumentException("customDestination is required when location is 'Others'");
        }

        RideRequest ride = new RideRequest();
        ride.setGuestName(dto.getGuestName());
        ride.setGuestPhone(sanitizePhone(dto.getGuestPhone()));
        ride.setPassengerCount(dto.getPassengerCount());
        ride.setDirection(RideDirection.valueOf(dto.getDirection()));
        ride.setLocation(location);
        ride.setCustomDestination(dto.getCustomDestination());
        ride.setStatus(RideStatus.PENDING);

        RideRequest savedRide = rideRequestRepository.save(ride);

        // Notify admin that a new ride needs assignment
        pushNotificationService.sendPushToAdmins("New Ride Request",
                String.format("New ride request from %s (%d pax) needs assignment",
                        dto.getGuestName(), dto.getPassengerCount()));

        return savedRide;
    }

    public List<RideRequest> getPendingRides() {
        return rideRequestRepository.findByStatus(RideStatus.PENDING);
    }

    // Active = anything visible to the guest that has not yet completed/cancelled
    private static final List<RideStatus> GUEST_ACTIVE_STATUSES = Arrays.asList(
            RideStatus.PENDING,
            RideStatus.OFFERED,
            RideStatus.ACCEPTED,
            RideStatus.IN_TRANSIT,
            RideStatus.ARRIVED
    );

    public List<RideRequest> getGuestActiveRides(String phone) {
        return rideRequestRepository.findByGuestPhoneAndStatusIn(sanitizePhone(phone), GUEST_ACTIVE_STATUSES);
    }

    public List<RideRequest> getRidesByMagicLink(String magicLinkId) {
        return rideRequestRepository.findByMagicLinkId(magicLinkId);
    }

    // Active cab statuses include OFFERED (awaiting consent) and ACCEPTED
    private static final List<RideStatus> CAB_ACTIVE_STATUSES = Arrays.asList(
            RideStatus.OFFERED,
            RideStatus.ACCEPTED,
            RideStatus.IN_TRANSIT,
            RideStatus.ARRIVED
    );

    public List<RideRequest> getActiveRidesByCab(Long cabId) {
        return rideRequestRepository.findByCabIdAndStatusIn(cabId, CAB_ACTIVE_STATUSES);
    }

    // Admin "ongoing" queue — everything dispatched but not yet completed
    private static final List<RideStatus> ONGOING_STATUSES = Arrays.asList(
            RideStatus.OFFERED,
            RideStatus.ACCEPTED,
            RideStatus.IN_TRANSIT,
            RideStatus.ARRIVED
    );

    public List<RideRequest> getOngoingRides() {
        return rideRequestRepository.findByStatusIn(ONGOING_STATUSES);
    }

    public List<RideRequest> getCompletedRidesByCab(Long cabId) {
        return rideRequestRepository.findByCabIdAndStatus(cabId, RideStatus.COMPLETED);
    }

    public List<RideIncident> getCancelledRides(LocalDate date, String driverQuery, RideIncidentType incidentType) {
        return rideIncidentService.getIncidentsForDate(date, driverQuery, incidentType);
    }

    @Transactional
    public RideRequest cancelRide(Long rideId) {
        return cancelRide(rideId, "GUEST");
    }

    @Transactional(timeout = 30)
    public RideRequest cancelRide(Long rideId, String cancelledByRole) {
        // ── Step 1: read without lock — get cab ID & magicLinkId for lock ordering ──
        RideRequest preview = rideRequestRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));

        String actorRole = cancelledByRole == null ? "" : cancelledByRole.trim().toUpperCase();
        boolean cancelledByAdmin = "ADMIN".equals(actorRole);

        // Quick pre-check (not authoritative — re-validated below after locking).
        if (preview.getStatus() == RideStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a completed ride");
        }
        if (preview.getStatus() == RideStatus.CANCELLED) {
            throw new IllegalStateException("Ride is already cancelled");
        }
        if (preview.getStatus() == RideStatus.IN_TRANSIT) {
            throw new IllegalStateException("Cannot cancel a ride that is already in transit — the driver has started the trip");
        }

        boolean wasDispatchedPreview = preview.getStatus() == RideStatus.OFFERED
                || preview.getStatus() == RideStatus.ACCEPTED
                || preview.getStatus() == RideStatus.ARRIVED;

        // ── Step 2: lock Cab first (if dispatched) — always before RideRequest rows ──
        Cab cab = preview.getCab();
        Long cabId = (wasDispatchedPreview && cab != null) ? cab.getId() : null;
        Cab lockedCab = null;
        if (cabId != null) {
            lockedCab = cabRepository.findByIdWithLock(cabId)
                    .orElseThrow(() -> new IllegalArgumentException("Cab not found: " + cabId));
        }

        // ── Step 3: lock the single ride row (after cab) ──
        RideRequest ride = rideRequestRepository.findByIdWithLock(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found: " + rideId));

        // ── Step 4: re-validate on the locked row ──
        if (ride.getStatus() == RideStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a completed ride");
        }
        if (ride.getStatus() == RideStatus.CANCELLED) {
            throw new IllegalStateException("Ride is already cancelled");
        }
        if (ride.getStatus() == RideStatus.IN_TRANSIT) {
            throw new IllegalStateException("Cannot cancel a ride that is already in transit — the driver has started the trip");
        }

        boolean wasDispatched = ride.getStatus() == RideStatus.OFFERED
                || ride.getStatus() == RideStatus.ACCEPTED
                || ride.getStatus() == RideStatus.ARRIVED;

        // ── Step 5: conditionally free the cab ──
        // Siblings are only counted (not written), so no lock on them is needed.
        if (wasDispatched && ride.getMagicLinkId() != null && lockedCab != null) {
            List<RideRequest> siblingRides = rideRequestRepository.findByMagicLinkId(ride.getMagicLinkId());
            long activeCount = siblingRides.stream()
                    .filter(r -> !r.getId().equals(rideId)
                            && r.getStatus() != RideStatus.CANCELLED
                            && r.getStatus() != RideStatus.COMPLETED)
                    .count();
            if (activeCount == 0) {
                lockedCab.setStatus(CabStatus.AVAILABLE);
                cabRepository.save(lockedCab);
            }
        }

        // ── Step 6: record incident and mark cancelled ──
        rideIncidentService.recordGuestCancelled(ride);
        ride.setStatus(RideStatus.CANCELLED);

        if (cancelledByAdmin) {
            pushNotificationService.sendPushToGuest(
                    ride.getGuestPhone(),
                    "Ride Cancelled by Admin",
                    String.format("Your ride request #%d was cancelled by admin.", rideId)
            );
        } else {
            pushNotificationService.sendPushToAdmins("Guest Cancelled Ride",
                    String.format("Guest %s cancelled ride #%d", ride.getGuestName(), rideId));
        }

        if (wasDispatched && ride.getCab() != null) {
            String driverPhone = ride.getCab().getDriverPhone();
            String driverTitle = cancelledByAdmin ? "Ride Cancelled by Admin" : "Ride Cancelled by Guest";
            String driverMessage = cancelledByAdmin
                    ? String.format("Ride #%d was cancelled by admin. You are now available.", rideId)
                    : String.format("Ride #%d was cancelled by the guest. You are now available.", rideId);
            if (driverPhone != null) {
                pushNotificationService.sendPushToDriver(driverPhone, driverTitle, driverMessage);
            }
        }

        log.info("action=ride_cancelled rideId={} guest='{}' dispatched={} byRole={}",
                rideId, ride.getGuestName(), wasDispatched, actorRole.isBlank() ? "UNKNOWN" : actorRole);

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