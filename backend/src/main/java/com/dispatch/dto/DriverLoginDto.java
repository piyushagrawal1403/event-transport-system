package com.dispatch.dto;

import com.dispatch.model.UserRole;
import jakarta.validation.constraints.NotBlank;

public record DriverLoginDto(
        @NotBlank(message = "Phone is required") String phone,
        @NotBlank(message = "reCAPTCHA token is required") String recaptchaToken
) {}

