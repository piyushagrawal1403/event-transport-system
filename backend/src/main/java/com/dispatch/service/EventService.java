// Full replacement for EventService.java
package com.dispatch.service;

import com.dispatch.dto.EventItineraryDto;
import com.dispatch.model.EventItinerary;
import com.dispatch.model.Location;
import com.dispatch.repository.EventItineraryRepository;
import com.dispatch.repository.LocationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private static final Logger log = LoggerFactory.getLogger(EventService.class);

    private final EventItineraryRepository eventRepository;
    private final LocationRepository locationRepository;
    private final PushNotificationService pushNotificationService;
    private final String defaultImageUrl;

    public EventService(EventItineraryRepository eventRepository,
                        LocationRepository locationRepository,
                        PushNotificationService pushNotificationService,
                        @Value("${app.events.default-image-url:/images/default-event.svg}") String defaultImageUrl) {
        this.eventRepository = eventRepository;
        this.locationRepository = locationRepository;
        this.pushNotificationService = pushNotificationService;
        this.defaultImageUrl = defaultImageUrl;
    }

    public List<EventItinerary> getAllEvents() {
        return eventRepository.findAllByOrderByStartTimeAsc();
    }

    public EventItinerary getEventById(UUID id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found: " + id));
    }

    public EventItinerary createEvent(EventItineraryDto dto) {
        Location location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + dto.getLocationId()));

        EventItinerary event = new EventItinerary();
        event.setTitle(dto.getTitle());
        event.setDescription(dto.getDescription());
        event.setImageUrl(resolveImageUrl(dto.getImageUrl()));
        event.setStartTime(dto.getStartTime());
        event.setEndTime(dto.getEndTime());
        event.setLocation(location);
        EventItinerary saved = eventRepository.save(event);

        if (Boolean.TRUE.equals(dto.getNotifyGuests())) {
            notifyGuests(saved, false);
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
        event.setImageUrl(resolveImageUrl(dto.getImageUrl()));
        event.setStartTime(dto.getStartTime());
        event.setEndTime(dto.getEndTime());
        event.setLocation(location);
        EventItinerary saved = eventRepository.save(event);

        if (Boolean.TRUE.equals(dto.getNotifyGuests())) {
            notifyGuests(saved, true);
        }

        return saved;
    }

    private void notifyGuests(EventItinerary event, boolean isUpdate) {
        String action = isUpdate ? "updated" : "added";
        String message = String.format(
                "%s has been %s: %s to %s",
                event.getTitle(), action,
                event.getStartTime().format(DateTimeFormatter.ofPattern("h:mm a")),
                event.getEndTime().format(DateTimeFormatter.ofPattern("h:mm a, MMM d"))
        );
        pushNotificationService.sendPushToGuests(
                isUpdate ? "Event Updated" : "New Event Added",
                message
        );
        log.info("action=event_push_broadcast title='{}' update={} message='{}'", event.getTitle(), isUpdate, message);
    }

    private String resolveImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return defaultImageUrl;
        }
        return imageUrl.trim();
    }
}