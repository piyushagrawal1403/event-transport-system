package com.dispatch.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;

@Service
public class RecaptchaService {

    private static final Logger logger = LoggerFactory.getLogger(RecaptchaService.class);
    private static final String RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

    private final String recaptchaSecretKey;
    private final double recaptchaThreshold;
    private final RestTemplate restTemplate;

    public RecaptchaService(
            @Value("${app.recaptcha.secret-key:}") String recaptchaSecretKey,
            @Value("${app.recaptcha.threshold:0.5}") double recaptchaThreshold,
            RestTemplate restTemplate) {
        this.recaptchaSecretKey = recaptchaSecretKey;
        this.recaptchaThreshold = recaptchaThreshold;
        this.restTemplate = restTemplate;
    }

    /**
     * Verifies reCAPTCHA v3 token from frontend.
     * Google siteverify requires application/x-www-form-urlencoded — NOT JSON.
     */
    public boolean verifyToken(String token) {
        if (recaptchaSecretKey == null || recaptchaSecretKey.isBlank()) {
            logger.warn("reCAPTCHA secret key not configured — skipping verification (dev mode)");
            return true;
        }

        try {
            // Google siteverify requires form-encoded body, not JSON
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> formParams = new LinkedMultiValueMap<>();
            formParams.add("secret", recaptchaSecretKey);
            formParams.add("response", token);

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(formParams, headers);

            RecaptchaResponse response = restTemplate.postForObject(
                    RECAPTCHA_VERIFY_URL, request, RecaptchaResponse.class);

            if (response == null) {
                logger.warn("reCAPTCHA: null response from Google");
                return false;
            }

            if (!response.success) {
                logger.warn("reCAPTCHA verification failed. error-codes: {}",
                        response.errorCodes != null ? Arrays.toString(response.errorCodes) : "none");
                return false;
            }

            logger.info("reCAPTCHA passed. score={} action={}", response.score, response.action);

            if (response.score < recaptchaThreshold) {
                logger.warn("reCAPTCHA score {} is below threshold {}", response.score, recaptchaThreshold);
                return false;
            }

            return true;
        } catch (Exception e) {
            logger.error("Error calling reCAPTCHA siteverify", e);
            return false;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class RecaptchaResponse {
        public boolean success;
        public double score;
        public String action;
        @JsonProperty("error-codes")
        public String[] errorCodes;
    }
}

