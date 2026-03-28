// Full replacement for EventService.java
package com.dispatch.service;

import com.dispatch.dto.EventItineraryDto;
import com.dispatch.model.EventItinerary;
import com.dispatch.model.EventNotification;
import com.dispatch.model.Location;
import com.dispatch.repository.EventItineraryRepository;
import com.dispatch.repository.EventNotificationRepository;
import com.dispatch.repository.LocationRepository;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private final EventItineraryRepository eventRepository;
    private final LocationRepository locationRepository;
    private final EventNotificationRepository notificationRepository;

    public EventService(EventItineraryRepository eventRepository,
                        LocationRepository locationRepository,
                        EventNotificationRepository notificationRepository) {
        this.eventRepository = eventRepository;
        this.locationRepository = locationRepository;
        this.notificationRepository = notificationRepository;
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
        EventItinerary saved = eventRepository.save(event);

        if (Boolean.TRUE.equals(dto.getNotifyGuests())) {
            broadcastInAppNotification(saved, false);
        }

        return saved;
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
            broadcastInAppNotification(saved, true);
        }

        return saved;
    }

    private void broadcastInAppNotification(EventItinerary event, boolean isUpdate) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("h:mm a, MMM d");
        String time = event.getStartTime().format(fmt) + " – " + event.getEndTime().format(fmt);
        String action = isUpdate ? "updated" : "added";
        String message = String.format(
                "%s has been %s: %s to %s",
                event.getTitle(), action,
                event.getStartTime().format(DateTimeFormatter.ofPattern("h:mm a")),
                event.getEndTime().format(DateTimeFormatter.ofPattern("h:mm a, MMM d"))
        );
        notificationRepository.save(new EventNotification(message));
        System.out.println("In-app notification broadcast: " + message);
    }
}