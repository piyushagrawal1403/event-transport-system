package com.dispatch.controller;

import com.dispatch.dto.EventItineraryDto;
import com.dispatch.model.EventItinerary;
import com.dispatch.service.EventService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/events")
public class EventController {

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of("image/jpeg", "image/jpg", "image/png", "image/webp");

    private final EventService eventService;
    private final Path uploadDirectory;

    public EventController(EventService eventService,
                           @Value("${app.upload.events-dir:uploads/events}") String uploadDir) {
        this.eventService = eventService;
        this.uploadDirectory = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDirectory);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize event upload directory", e);
        }
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
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Only JPG, PNG, or WEBP images are allowed");
        }

        String extension = switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };

        String fileName = UUID.randomUUID() + extension;
        Path target = uploadDirectory.resolve(fileName);

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store event image", e);
        }

        String imageUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/events/")
                .path(fileName)
                .toUriString();
        return ResponseEntity.ok(Map.of("imageUrl", imageUrl));
    }
}
