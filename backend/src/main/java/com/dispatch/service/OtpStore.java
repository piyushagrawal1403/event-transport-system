package com.dispatch.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class OtpStore {

    private static final Duration OTP_TTL = Duration.ofMinutes(5);

    private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpChallenge createChallenge(String key) {
        purgeExpired();
        String otp = String.format("%06d", secureRandom.nextInt(1_000_000));
        Instant expiresAt = Instant.now().plus(OTP_TTL);
        store.put(key, new OtpEntry(otp, expiresAt));
        return new OtpChallenge(otp, expiresAt);
    }

    public boolean verify(String key, String otp) {
        purgeExpired();
        OtpEntry entry = store.get(key);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            store.remove(key);
            return false;
        }
        boolean matches = entry.otp().equals(otp);
        if (matches) {
            store.remove(key);
        }
        return matches;
    }

    private void purgeExpired() {
        Instant now = Instant.now();
        store.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    private record OtpEntry(String otp, Instant expiresAt) {
    }

    public record OtpChallenge(String otp, Instant expiresAt) {
    }
}

