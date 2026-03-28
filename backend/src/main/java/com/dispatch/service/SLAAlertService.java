// src/main/java/com/dispatch/service/SLAAlertService.java
package com.dispatch.service;

import com.dispatch.model.EventNotification;
import com.dispatch.model.RideRequest;
import com.dispatch.model.RideStatus;
import com.dispatch.repository.EventNotificationRepository;
import com.dispatch.repository.RideRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class SLAAlertService {
    private static final Logger logger = LoggerFactory.getLogger(SLAAlertService.class);

    @Autowired
    private RideRequestRepository rideRequestRepository;

    @Autowired
    private EventNotificationRepository eventNotificationRepository;

    @Autowired
    private PushNotificationService pushNotificationService;

    // Check every minute for SLA violations
    @Scheduled(fixedDelay = 60000, initialDelay = 60000)
    public void checkSLAViolations() {
        try {
            logger.debug("Starting SLA check...");
            Instant now = Instant.now();

            // Check PENDING rides older than 15 minutes
            List<RideRequest> pendingRides = rideRequestRepository.findByStatus(RideStatus.PENDING);
            for (RideRequest ride : pendingRides) {
                Instant fifteenMinutesAgo = now.minus(15, ChronoUnit.MINUTES);
                if (ride.getRequestedAt().isBefore(fifteenMinutesAgo)) {
                    logger.warn("SLA violation: Ride {} in PENDING state for > 15 minutes", ride.getId());
                    sendSLAAlert("PENDING", ride.getId(), ride.getRequestedAt());
                }
            }

            // Check OFFERED rides older than 30 minutes
            List<RideRequest> offeredRides = rideRequestRepository.findByStatus(RideStatus.OFFERED);
            for (RideRequest ride : offeredRides) {
                Instant thirtyMinutesAgo = now.minus(30, ChronoUnit.MINUTES);
                if (ride.getRequestedAt().isBefore(thirtyMinutesAgo)) {
                    logger.warn("SLA violation: Ride {} in OFFERED state for > 30 minutes", ride.getId());
                    sendSLAAlert("OFFERED", ride.getId(), ride.getRequestedAt());
                }
            }
        } catch (Exception e) {
            logger.error("Error checking SLA violations", e);
        }
    }

    private void sendSLAAlert(String status, Long rideId, Instant requestedAt) {
        try {
            String message = String.format("SLA Alert: Ride #%d is in %s state for extended duration", rideId, status);
            
            // Create notification in database for auditing
            EventNotification notification = new EventNotification(message, null); // null = broadcast to admins
            eventNotificationRepository.save(notification);

            // Send web push to all admins
            String title = "SLA Violation Alert";
            String body = String.format("Ride #%d has been in %s state for too long", rideId, status);
            pushNotificationService.sendPushToAdmins(title, body);

            logger.info("SLA alert sent for ride {}", rideId);
        } catch (Exception e) {
            logger.error("Failed to send SLA alert", e);
        }
    }
}

