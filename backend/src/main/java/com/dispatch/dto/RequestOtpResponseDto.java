package com.dispatch.dto;

import java.time.Instant;

public record RequestOtpResponseDto(
        String message,
        String otp,
        Instant expiresAt
) {
}

