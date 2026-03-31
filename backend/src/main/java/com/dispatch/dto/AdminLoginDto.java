package com.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public record AdminLoginDto(
        @NotBlank(message = "Username is required")
        String username,
        @NotBlank(message = "Password is required")
        String password
) {
}

