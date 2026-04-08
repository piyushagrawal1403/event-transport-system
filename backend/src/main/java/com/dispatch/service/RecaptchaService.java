package com.dispatch.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class RecaptchaService {

    private static final Logger logger = LoggerFactory.getLogger(RecaptchaService.class);
    private static final String RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    private final String recaptchaSecretKey;
    private final double recaptchaThreshold;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public RecaptchaService(
            @Value("${app.recaptcha.secret-key:}") String recaptchaSecretKey,
            @Value("${app.recaptcha.threshold:0.5}") double recaptchaThreshold,
            RestTemplate restTemplate,
            ObjectMapper objectMapper) {
        this.recaptchaSecretKey = recaptchaSecretKey;
        this.recaptchaThreshold = recaptchaThreshold;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Verifies reCAPTCHA v3 token from frontend
     * Returns true if token is valid and score >= threshold
     */
    public boolean verifyToken(String token) {
        if (recaptchaSecretKey == null || recaptchaSecretKey.isBlank()) {
            logger.warn("reCAPTCHA secret key not configured, skipping verification");
            return true; // Allow if not configured (for dev)
        }

        try {
            RecaptchaRequest request = new RecaptchaRequest(recaptchaSecretKey, token);
            RecaptchaResponse response = restTemplate.postForObject(RECAPTCHA_VERIFY_URL, request, RecaptchaResponse.class);

            if (response == null || !response.success) {
                logger.warn("reCAPTCHA verification failed: {}", response != null ? response.errorCodes : "null response");
                return false;
            }

            logger.info("reCAPTCHA verified successfully. Score: {}, Action: {}", response.score, response.action);

            if (response.score < recaptchaThreshold) {
                logger.warn("reCAPTCHA score {} is below threshold {}", response.score, recaptchaThreshold);
                return false;
            }

            return true;
        } catch (Exception e) {
            logger.error("Error verifying reCAPTCHA token", e);
            return false;
        }
    }

    // Request/Response DTOs for reCAPTCHA API
    static class RecaptchaRequest {
        public String secret;
        public String response;

        RecaptchaRequest(String secret, String response) {
            this.secret = secret;
            this.response = response;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class RecaptchaResponse {
        public boolean success;
        public double score;
        public String action;
        public String[] errorCodes;
    }
}

