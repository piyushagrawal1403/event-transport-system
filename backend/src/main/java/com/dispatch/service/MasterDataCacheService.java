package com.dispatch.service;

import com.dispatch.repository.CabRepository;
import com.dispatch.repository.EventItineraryRepository;
import com.dispatch.repository.LocationRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MasterDataCacheService {

    private final CabRepository cabRepository;
    private final LocationRepository locationRepository;
    private final EventItineraryRepository eventItineraryRepository;

    private Map<String, Object> cachedPayload = Map.of();
    private Instant cachedAt;

    public MasterDataCacheService(CabRepository cabRepository,
                                  LocationRepository locationRepository,
                                  EventItineraryRepository eventItineraryRepository) {
        this.cabRepository = cabRepository;
        this.locationRepository = locationRepository;
        this.eventItineraryRepository = eventItineraryRepository;
    }

    public synchronized Map<String, Object> getSnapshotWithDatabaseFallback() {
        try {
            Map<String, Object> freshPayload = buildDatabasePayload();
            cachePayload(freshPayload);
            return toResponse("DATABASE", freshPayload, cachedAt);
        } catch (RuntimeException dbError) {
            if (cachedAt == null || cachedPayload.isEmpty()) {
                throw new IllegalStateException("No master-data cache available yet and database read failed", dbError);
            }
            return toResponse("CACHE", cachedPayload, cachedAt);
        }
    }

    public synchronized Map<String, Object> cacheExternalPayload(Map<String, Object> payload) {
        List<String> required = List.of("locations", "events");
        for (String key : required) {
            if (!payload.containsKey(key)) {
                throw new IllegalArgumentException("Missing required field: " + key);
            }
        }

        // cabs may be intentionally omitted for guest-facing imports.
        if (!payload.containsKey("cabs")) {
            payload = new LinkedHashMap<>(payload);
            payload.put("cabs", List.of());
        }

        cachePayload(payload);
        return toResponse("EXTERNAL_CACHE", cachedPayload, cachedAt);
    }

    public synchronized Map<String, Object> refreshFromDatabase() {
        Map<String, Object> freshPayload = buildDatabasePayload();
        cachePayload(freshPayload);
        return toResponse("DATABASE", freshPayload, cachedAt);
    }

    private Map<String, Object> buildDatabasePayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("cabs", cabRepository.findAll());
        payload.put("locations", locationRepository.findAll());
        payload.put("events", eventItineraryRepository.findAllByOrderByStartTimeAsc());
        return payload;
    }

    private void cachePayload(Map<String, Object> payload) {
        this.cachedPayload = Map.copyOf(payload);
        this.cachedAt = Instant.now();
    }

    private Map<String, Object> toResponse(String source, Map<String, Object> payload, Instant snapshotTime) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("source", source);
        response.put("cachedAt", snapshotTime);
        response.put("cabs", payload.getOrDefault("cabs", List.of()));
        response.put("locations", payload.getOrDefault("locations", List.of()));
        response.put("events", payload.getOrDefault("events", List.of()));
        return response;
    }
}

