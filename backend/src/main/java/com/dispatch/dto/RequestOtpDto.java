package com.dispatch.dto;

import com.dispatch.model.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record RequestOtpDto(
        String name,
        @NotBlank(message = "Phone is required")
        @Pattern(regexp = "^[0-9]{10}$", message = "Phone must be exactly 10 digits")
        String phone,
        @NotNull(message = "Role is required")
        UserRole role
) {
}

