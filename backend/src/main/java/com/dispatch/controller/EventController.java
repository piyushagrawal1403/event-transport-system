package com.dispatch.controller;

import com.dispatch.dto.EventItineraryDto;
import com.dispatch.model.EventItinerary;
import com.dispatch.service.EventImageStorageService;
import com.dispatch.service.EventService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private final EventService eventService;
    private final EventImageStorageService eventImageStorageService;

    public EventController(EventService eventService,
                           EventImageStorageService eventImageStorageService) {
        this.eventService = eventService;
        this.eventImageStorageService = eventImageStorageService;
    }

    @GetMapping
    public ResponseEntity<List<EventItinerary>> getAllEvents() {
        return ResponseEntity.ok(eventService.getAllEvents());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventItinerary> getEventById(@PathVariable UUID id) {
        return ResponseEntity.ok(eventService.getEventById(id));
    }

    @PostMapping
    public ResponseEntity<EventItinerary> createEvent(@Valid @RequestBody EventItineraryDto dto) {
        return ResponseEntity.ok(eventService.createEvent(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventItinerary> updateEvent(@PathVariable UUID id, @Valid @RequestBody EventItineraryDto dto) {
        return ResponseEntity.ok(eventService.updateEvent(id, dto));
    }

    @PostMapping(value = "/images", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, String>> uploadEventImage(@RequestParam("file") MultipartFile file) {
        String imageUrl = eventImageStorageService.storeEventImage(file);
        return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
    }
}
