package com.dispatch.controller;

import com.dispatch.dto.RideRequestDto;
import com.dispatch.model.RideRequest;
import com.dispatch.service.RideService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rides")
public class RideController {

    private final RideService rideService;

    public RideController(RideService rideService) {
        this.rideService = rideService;
    }

    @PostMapping
    public ResponseEntity<RideRequest> createRide(@Valid @RequestBody RideRequestDto dto) {
        RideRequest ride = rideService.createRide(dto);
        return ResponseEntity.ok(ride);
    }

    @GetMapping("/pending")
    public ResponseEntity<List<RideRequest>> getPendingRides() {
        return ResponseEntity.ok(rideService.getPendingRides());
    }

    @GetMapping("/guest")
    public ResponseEntity<List<RideRequest>> getGuestRides(@RequestParam String phone) {
        return ResponseEntity.ok(rideService.getGuestActiveRides(phone));
    }

    @GetMapping("/trip/{magicLinkId}")
    public ResponseEntity<List<RideRequest>> getTripRides(@PathVariable String magicLinkId) {
        return ResponseEntity.ok(rideService.getRidesByMagicLink(magicLinkId));
    }

    @GetMapping("/driver")
    public ResponseEntity<List<RideRequest>> getDriverRides(@RequestParam String phone) {
        return ResponseEntity.ok(rideService.getActiveRidesByDriverPhone(phone));
    }

    @GetMapping("/current")
    public ResponseEntity<List<RideRequest>> getCurrentRides() {
        return ResponseEntity.ok(rideService.getCurrentRides());
    }

    @GetMapping("/assigned")
    public ResponseEntity<List<RideRequest>> getAssignedRides() {
        return ResponseEntity.ok(rideService.getAssignedRides());
    }
}
