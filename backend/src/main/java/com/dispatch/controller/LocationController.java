package com.dispatch.controller;

import com.dispatch.model.Location;
import com.dispatch.repository.LocationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/locations")
public class LocationController {

    private final LocationRepository locationRepository;

    public LocationController(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        return ResponseEntity.ok(locationRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Location> createLocation(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Location name is required");
        }
        Boolean isMainVenue = body.get("isMainVenue") != null && (Boolean) body.get("isMainVenue");
        Double distance = body.get("distanceFromMainVenue") != null
                ? ((Number) body.get("distanceFromMainVenue")).doubleValue() : 0.0;
        Location loc = new Location(name.trim(), isMainVenue, distance);
        return ResponseEntity.ok(locationRepository.save(loc));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Location> updateLocation(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Location loc = locationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Location not found: " + id));
        if (body.containsKey("name")) {
            String name = (String) body.get("name");
            if (name == null || name.isBlank()) throw new IllegalArgumentException("Location name cannot be blank");
            loc.setName(name.trim());
        }
        if (body.containsKey("isMainVenue")) {
            loc.setIsMainVenue((Boolean) body.get("isMainVenue"));
        }
        if (body.containsKey("distanceFromMainVenue")) {
            loc.setDistanceFromMainVenue(((Number) body.get("distanceFromMainVenue")).doubleValue());
        }
        return ResponseEntity.ok(locationRepository.save(loc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteLocation(@PathVariable Long id) {
        if (!locationRepository.existsById(id)) {
            throw new IllegalArgumentException("Location not found: " + id);
        }
        locationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Location deleted"));
    }
}
