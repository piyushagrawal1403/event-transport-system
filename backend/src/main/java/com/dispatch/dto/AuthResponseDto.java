package com.dispatch.dto;

public record AuthResponseDto(
        String token,
        AuthUserDto user
) {
}

