package com.dispatch.service;

import com.dispatch.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {

    private final String jwtSecret;
    private final long jwtExpirationMs;
    private SecretKey signingKey;

    public JwtService(@Value("${app.auth.jwt-secret}") String jwtSecret,
                      @Value("${app.auth.jwt-expiration-ms:86400000}") long jwtExpirationMs) {
        this.jwtSecret = jwtSecret;
        this.jwtExpirationMs = jwtExpirationMs;
    }

    @PostConstruct
    void init() {
        this.signingKey = Keys.hmacShaKeyFor(hashSecret(jwtSecret));
    }

    public String generateToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getPhone())
                .claims(Map.of(
                        "uid", user.getId(),
                        "name", user.getName(),
                        "role", user.getRole().name()
                ))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(jwtExpirationMs)))
                .signWith(signingKey)
                .compact();
    }

    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractPhone(String token) {
        return parse(token).getSubject();
    }

    public String extractRole(String token) {
        return parse(token).get("role", String.class);
    }

    public String extractName(String token) {
        return parse(token).get("name", String.class);
    }

    private byte[] hashSecret(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return digest.digest(resolveSecretBytes(value));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Unable to initialize JWT signing key", ex);
        }
    }

    private byte[] resolveSecretBytes(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("app.auth.jwt-secret must not be blank");
        }
        try {
            return Decoders.BASE64.decode(value);
        } catch (Exception ignored) {
            return value.getBytes(StandardCharsets.UTF_8);
        }
    }
}

