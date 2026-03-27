package com.dispatch.service;

import com.dispatch.dto.EventItineraryDto;
import com.dispatch.model.EventItinerary;
import com.dispatch.model.Location;
import com.dispatch.repository.EventItineraryRepository;
import com.dispatch.repository.LocationRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private final EventItineraryRepository eventRepository;
    private final LocationRepository locationRepository;

    public EventService(EventItineraryRepository eventRepository, LocationRepository locationRepository) {
        this.eventRepository = eventRepository;
        this.locationRepository = locationRepository;
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
        return eventRepository.save(event);
    }
}
