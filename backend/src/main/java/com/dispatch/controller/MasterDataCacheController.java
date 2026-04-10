package com.dispatch.controller;

import com.dispatch.service.MasterDataCacheService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/bootstrap/master-data")
public class MasterDataCacheController {

    private final MasterDataCacheService masterDataCacheService;

    public MasterDataCacheController(MasterDataCacheService masterDataCacheService) {
        this.masterDataCacheService = masterDataCacheService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getSnapshot() {
        return ResponseEntity.ok(masterDataCacheService.getSnapshotWithDatabaseFallback());
    }

    @PutMapping
    public ResponseEntity<Map<String, Object>> cacheExternalSnapshot(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(masterDataCacheService.cacheExternalPayload(payload));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshFromDatabase() {
        return ResponseEntity.ok(masterDataCacheService.refreshFromDatabase());
    }
}

