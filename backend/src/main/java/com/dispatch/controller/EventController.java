package com.dispatch.controller;

import com.dispatch.dto.EventItineraryDto;
import com.dispatch.model.EventItinerary;
import com.dispatch.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public ResponseEntity<List<EventItinerary>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }

    @PostMapping
    public ResponseEntity<EventItinerary> createEvent(@Valid @RequestBody EventItineraryDto dto) {
        return ResponseEntity.ok(eventService.createEvent(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventItinerary> updateEvent(@PathVariable UUID id, @Valid @RequestBody EventItineraryDto dto) {
        return ResponseEntity.ok(eventService.updateEvent(id, dto));
    }
}
