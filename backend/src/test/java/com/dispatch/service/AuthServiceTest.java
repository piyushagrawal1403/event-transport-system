package com.dispatch.service;

import com.dispatch.dto.AdminLoginDto;
import com.dispatch.dto.AuthResponseDto;
import com.dispatch.dto.DriverLoginDto;
import com.dispatch.dto.GuestLoginDto;
import com.dispatch.model.Cab;
import com.dispatch.model.User;
import com.dispatch.model.UserRole;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private CabRepository cabRepository;
    @Mock private RecaptchaService recaptchaService;
    @Mock private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, cabRepository, recaptchaService, jwtService,
                "admin", "admin123", "9900000000", "Event Admin"
        );
    }

    private User savedUser(String name, String phone, UserRole role) {
        User user = new User();
        user.setId(1L);
        user.setName(name);
        user.setPhone(phone);
        user.setRole(role);
        return user;
    }

    @Test
    void guestLogin_createsOrUpdatesUserAndReturnsJwt() {
        when(recaptchaService.verifyToken("recaptcha-token")).thenReturn(true);
        when(userRepository.findByPhone("9999999999")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(userRepository.findByPhone("9999999999")).thenReturn(Optional.of(savedUser("Alice", "9999999999", UserRole.GUEST)));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token");

        AuthResponseDto result = authService.guestLogin(new GuestLoginDto("Alice", "9999999999", "recaptcha-token"));

        assertNotNull(result);
        assertEquals("jwt-token", result.token());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void driverLogin_usesExistingCabRecordAndReturnsJwt() {
        when(recaptchaService.verifyToken("recaptcha-token")).thenReturn(true);
        Cab cab = new Cab("KA01AB1234", "DriverOne", "8888888888", 4);
        when(cabRepository.findByDriverPhone("8888888888")).thenReturn(Optional.of(cab));
        when(userRepository.findByPhone("8888888888")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });
        when(userRepository.findByPhone("8888888888")).thenReturn(Optional.of(savedUser("DriverOne", "8888888888", UserRole.DRIVER)));
        when(jwtService.generateToken(any(User.class))).thenReturn("driver-jwt");

        AuthResponseDto result = authService.driverLogin(new DriverLoginDto("8888888888", "recaptcha-token"));

        assertNotNull(result);
        assertEquals("driver-jwt", result.token());
        verify(cabRepository).findByDriverPhone("8888888888");
    }

    @Test
    void driverLogin_throwsWhenPhoneNotRegistered() {
        when(recaptchaService.verifyToken("recaptcha-token")).thenReturn(true);
        when(cabRepository.findByDriverPhone("7777777777")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> authService.driverLogin(new DriverLoginDto("7777777777", "recaptcha-token")));
    }

    @Test
    void guestLogin_throwsWhenNameBlank() {
        when(recaptchaService.verifyToken("recaptcha-token")).thenReturn(true);
        assertThrows(IllegalArgumentException.class,
                () -> authService.guestLogin(new GuestLoginDto("", "9999999999", "recaptcha-token")));
    }

    @Test
    void guestLogin_rejectsWhenRecaptchaFails() {
        when(recaptchaService.verifyToken("bad-token")).thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> authService.guestLogin(new GuestLoginDto("Alice", "9999999999", "bad-token")));
    }

    @Test
    void driverLogin_rejectsWhenRecaptchaFails() {
        when(recaptchaService.verifyToken("bad-token")).thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> authService.driverLogin(new DriverLoginDto("9999999999", "bad-token")));
    }

    @Test
    void adminLogin_correctCredentialsReturnsToken() {
        when(userRepository.findByPhone("9900000000")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(99L);
            return u;
        });
        when(jwtService.generateToken(any(User.class))).thenReturn("admin-jwt");

        AuthResponseDto result = authService.adminLogin(new AdminLoginDto("admin", "admin123"));

        assertNotNull(result);
        assertEquals("admin-jwt", result.token());
    }

    @Test
    void adminLogin_wrongPasswordThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> authService.adminLogin(new AdminLoginDto("admin", "wrong")));
    }
}

