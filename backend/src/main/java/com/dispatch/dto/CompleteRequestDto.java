package com.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class CompleteRequestDto {

    @NotBlank(message = "OTP is required")
    private String otp;

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
}
