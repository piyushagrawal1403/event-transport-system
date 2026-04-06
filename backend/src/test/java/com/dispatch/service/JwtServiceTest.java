package com.dispatch.service;

import com.dispatch.model.User;
import com.dispatch.model.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("test-jwt-secret-that-is-long-enough", 86400000L);
        jwtService.init();
    }

    private User testUser(String name, String phone, UserRole role) {
        User user = new User();
        user.setId(1L);
        user.setName(name);
        user.setPhone(phone);
        user.setRole(role);
        return user;
    }

    @Test
    void generateToken_containsPhoneAsSubject() {
        User user = testUser("Alice", "9999999999", UserRole.GUEST);
        String token = jwtService.generateToken(user);
        assertEquals("9999999999", jwtService.extractPhone(token));
    }

    @Test
    void generateToken_containsRoleClaim() {
        User user = testUser("Alice", "9999999999", UserRole.ADMIN);
        String token = jwtService.generateToken(user);
        assertEquals("ADMIN", jwtService.extractRole(token));
    }

    @Test
    void extractPhone_roundTrips() {
        User user = testUser("Bob", "8888888888", UserRole.DRIVER);
        String token = jwtService.generateToken(user);
        assertEquals("8888888888", jwtService.extractPhone(token));
    }

    @Test
    void extractRole_roundTrips() {
        User user = testUser("Bob", "8888888888", UserRole.DRIVER);
        String token = jwtService.generateToken(user);
        assertEquals("DRIVER", jwtService.extractRole(token));
    }

    @Test
    void extractName_roundTrips() {
        User user = testUser("Charlie", "7777777777", UserRole.GUEST);
        String token = jwtService.generateToken(user);
        assertEquals("Charlie", jwtService.extractName(token));
    }

    @Test
    void parse_containsAllClaims() {
        User user = testUser("Dave", "6666666666", UserRole.ADMIN);
        String token = jwtService.generateToken(user);
        Claims claims = jwtService.parse(token);

        assertEquals("6666666666", claims.getSubject());
        assertEquals("ADMIN", claims.get("role", String.class));
        assertEquals("Dave", claims.get("name", String.class));
        assertNotNull(claims.getIssuedAt());
        assertNotNull(claims.getExpiration());
    }

    @Test
    void parse_throwsOnTamperedToken() {
        User user = testUser("Eve", "5555555555", UserRole.GUEST);
        String token = jwtService.generateToken(user);
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";
        assertThrows(JwtException.class, () -> jwtService.parse(tampered));
    }

    @Test
    void parse_throwsOnExpiredToken() throws InterruptedException {
        JwtService shortLived = new JwtService("test-jwt-secret-that-is-long-enough", 1L);
        shortLived.init();

        User user = testUser("Frank", "4444444444", UserRole.GUEST);
        String token = shortLived.generateToken(user);
        Thread.sleep(50);
        assertThrows(JwtException.class, () -> shortLived.parse(token));
    }

    @Test
    void init_throwsWhenSecretIsBlank() {
        JwtService badService = new JwtService("", 86400000L);
        assertThrows(IllegalStateException.class, badService::init);
    }
}

