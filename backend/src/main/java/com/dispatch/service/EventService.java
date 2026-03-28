package com.dispatch.service;

import com.dispatch.dto.EventItineraryDto;
import com.dispatch.model.EventItinerary;
import com.dispatch.model.Location;
import com.dispatch.model.RideRequest;
import com.dispatch.model.RideStatus;
import com.dispatch.repository.EventItineraryRepository;
import com.dispatch.repository.LocationRepository;
import com.dispatch.repository.RideRequestRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class EventService {

    private final EventItineraryRepository eventRepository;
    private final LocationRepository locationRepository;
    private final RideRequestRepository rideRequestRepository;

    public EventService(EventItineraryRepository eventRepository, LocationRepository locationRepository, RideRequestRepository rideRequestRepository) {
        this.eventRepository = eventRepository;
        this.locationRepository = locationRepository;
        this.rideRequestRepository = rideRequestRepository;
    }

    public List<EventItinerary> getAllEvents() {
        return eventRepository.findAllByOrderByStartTimeAsc();
    }

    public EventItinerary createEvent(EventItineraryDto dto) {
        Location location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + dto.getLocationId()));

        EventItinerary event = new EventItinerary();
        event.setTitle(dto.getTitle());
        event.setDescription(dto.getDescription());
        event.setStartTime(dto.getStartTime());
        event.setEndTime(dto.getEndTime());
        event.setLocation(location);
        return eventRepository.save(event);
    }

    public EventItinerary updateEvent(UUID id, EventItineraryDto dto) {
        EventItinerary event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + id));

        Location location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + dto.getLocationId()));

        event.setTitle(dto.getTitle());
        event.setDescription(dto.getDescription());
        event.setStartTime(dto.getStartTime());
        event.setEndTime(dto.getEndTime());
        event.setLocation(location);
        EventItinerary saved = eventRepository.save(event);

        if (Boolean.TRUE.equals(dto.getNotifyGuests())) {
            notifyAllGuests(saved);
        }

        return saved;
    }

    private void notifyAllGuests(EventItinerary event) {
        List<RideRequest> allRides = rideRequestRepository.findAll();
        Set<String> notifiedPhones = new HashSet<>();
        for (RideRequest ride : allRides) {
            String phone = ride.getGuestPhone();
            if (phone != null && notifiedPhones.add(phone)) {
                System.out.println("SMS to [" + phone + "]: Event \"" + event.getTitle() + "\" updated to " + event.getStartTime() + " - " + event.getEndTime());
            }
        }
        System.out.println("=== Notified " + notifiedPhones.size() + " guests about event update ===");
    }
}
