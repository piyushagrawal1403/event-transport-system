package com.dispatch.service;

import com.dispatch.model.Cab;
import com.dispatch.model.Location;
import com.dispatch.model.RideIncident;
import com.dispatch.model.RideIncidentType;
import com.dispatch.model.RideRequest;
import com.dispatch.repository.RideIncidentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class RideIncidentService {

    private final RideIncidentRepository rideIncidentRepository;

    public RideIncidentService(RideIncidentRepository rideIncidentRepository) {
        this.rideIncidentRepository = rideIncidentRepository;
    }

    @Transactional
    public void recordGuestCancelled(RideRequest ride) {
        rideIncidentRepository.save(buildIncident(ride, ride.getCab(), RideIncidentType.GUEST_CANCELLED));
    }

    @Transactional
    public void recordDriverDeclined(RideRequest ride, Cab cabSnapshot) {
        RideIncident incident = buildIncident(ride, cabSnapshot, RideIncidentType.DRIVER_DECLINED);
        incident.setDriverDeniedCount((ride.getDriverDeniedCount() == null ? 0 : ride.getDriverDeniedCount()) + 1);
        rideIncidentRepository.save(incident);
    }

    public List<RideIncident> getIncidentsForDate(LocalDate date) {
        LocalDate targetDate = date == null ? LocalDate.now() : date;
        ZoneId zoneId = ZoneId.systemDefault();
        Instant start = targetDate.atStartOfDay(zoneId).toInstant();
        Instant end = targetDate.plusDays(1).atStartOfDay(zoneId).toInstant();
        return rideIncidentRepository.findByOccurredAtBetweenOrderByOccurredAtDesc(start, end);
    }

    private RideIncident buildIncident(RideRequest ride, Cab cabSnapshot, RideIncidentType incidentType) {
        RideIncident incident = new RideIncident();
        incident.setRideRequestId(ride.getId());
        incident.setIncidentType(incidentType);
        incident.setOccurredAt(Instant.now());
        incident.setGuestName(ride.getGuestName());
        incident.setGuestPhone(ride.getGuestPhone());
        incident.setPassengerCount(ride.getPassengerCount());
        incident.setDirection(ride.getDirection());
        Location location = ride.getLocation();
        incident.setLocationName(location == null ? "Unknown" : location.getName());
        incident.setCustomDestination(ride.getCustomDestination());

        if (cabSnapshot != null) {
            incident.setDriverName(cabSnapshot.getDriverName());
            incident.setDriverPhone(cabSnapshot.getDriverPhone());
            incident.setCabLicensePlate(cabSnapshot.getLicensePlate());
        } else {
            incident.setDriverName(ride.getLastAssignedDriverName());
            incident.setDriverPhone(ride.getLastAssignedDriverPhone());
            incident.setCabLicensePlate(ride.getLastAssignedCabLicensePlate());
        }
        incident.setDriverDeniedCount(ride.getDriverDeniedCount());
        return incident;
    }
}

