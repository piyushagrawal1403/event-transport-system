package com.dispatch.dto;

import jakarta.validation.constraints.NotBlank;

public class StartTripDto {

    @NotBlank(message = "OTP is required to start the trip")
    private String otp;

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }
}