package com.dispatch.controller;

import com.dispatch.dto.AdminLoginDto;
import com.dispatch.dto.AuthResponseDto;
import com.dispatch.dto.DriverLoginDto;
import com.dispatch.dto.GuestLoginDto;
import com.dispatch.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/guest-login")
    public ResponseEntity<AuthResponseDto> guestLogin(@Valid @RequestBody GuestLoginDto dto) {
        return ResponseEntity.ok(authService.guestLogin(dto));
    }

    @PostMapping("/driver-login")
    public ResponseEntity<AuthResponseDto> driverLogin(@Valid @RequestBody DriverLoginDto dto) {
        return ResponseEntity.ok(authService.driverLogin(dto));
    }

    @PostMapping("/admin-login")
    public ResponseEntity<AuthResponseDto> adminLogin(@Valid @RequestBody AdminLoginDto dto) {
        return ResponseEntity.ok(authService.adminLogin(dto));
    }
}

