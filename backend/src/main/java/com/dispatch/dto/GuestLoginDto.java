package com.dispatch.dto;

import com.dispatch.model.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GuestLoginDto(
        @NotBlank(message = "Name is required") String name,
        @NotBlank(message = "Phone is required") String phone,
        @NotBlank(message = "reCAPTCHA token is required") String recaptchaToken
) {}

