package com.dispatch.dto;

import com.dispatch.model.UserRole;

public record AuthUserDto(
        Long id,
        String name,
        String phone,
        UserRole role
) {
}

