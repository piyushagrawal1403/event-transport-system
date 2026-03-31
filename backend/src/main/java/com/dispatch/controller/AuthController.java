package com.dispatch.controller;

import com.dispatch.dto.AdminLoginDto;
import com.dispatch.dto.AuthResponseDto;
import com.dispatch.dto.RequestOtpDto;
import com.dispatch.dto.RequestOtpResponseDto;
import com.dispatch.dto.VerifyOtpDto;
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

    @PostMapping("/request-otp")
    public ResponseEntity<RequestOtpResponseDto> requestOtp(@Valid @RequestBody RequestOtpDto dto) {
        return ResponseEntity.ok(authService.requestOtp(dto));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponseDto> verifyOtp(@Valid @RequestBody VerifyOtpDto dto) {
        return ResponseEntity.ok(authService.verifyOtp(dto));
    }

    @PostMapping("/admin-login")
    public ResponseEntity<AuthResponseDto> adminLogin(@Valid @RequestBody AdminLoginDto dto) {
        return ResponseEntity.ok(authService.adminLogin(dto));
    }
}

