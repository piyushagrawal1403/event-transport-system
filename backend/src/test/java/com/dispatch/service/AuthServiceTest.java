package com.dispatch.service;

import com.dispatch.dto.AdminLoginDto;
import com.dispatch.dto.RequestOtpDto;
import com.dispatch.dto.RequestOtpResponseDto;
import com.dispatch.dto.VerifyOtpDto;
import com.dispatch.dto.AuthResponseDto;
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

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private CabRepository cabRepository;
    @Mock private OtpStore otpStore;
    @Mock private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, cabRepository, otpStore, jwtService,
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
    void requestOtp_guest_createsOrUpdatesUserAndReturnsOtp() {
        when(userRepository.findByPhone("9999999999")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(otpStore.createChallenge(anyString()))
                .thenReturn(new OtpStore.OtpChallenge("123456", Instant.now().plusSeconds(300)));

        RequestOtpResponseDto result = authService.requestOtp(new RequestOtpDto("Alice", "9999999999", UserRole.GUEST));

        assertNotNull(result);
        assertEquals("123456", result.otp());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void requestOtp_driver_usesExistingCabRecord() {
        Cab cab = new Cab("KA01AB1234", "DriverOne", "8888888888", 4);
        when(cabRepository.findByDriverPhone("8888888888")).thenReturn(Optional.of(cab));
        when(userRepository.findByPhone("8888888888")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(2L);
            return u;
        });
        when(otpStore.createChallenge(anyString()))
                .thenReturn(new OtpStore.OtpChallenge("654321", Instant.now().plusSeconds(300)));

        RequestOtpResponseDto result = authService.requestOtp(new RequestOtpDto(null, "8888888888", UserRole.DRIVER));

        assertNotNull(result);
        assertEquals("654321", result.otp());
        verify(cabRepository).findByDriverPhone("8888888888");
    }

    @Test
    void requestOtp_driver_throwsWhenPhoneNotRegistered() {
        when(cabRepository.findByDriverPhone("7777777777")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> authService.requestOtp(new RequestOtpDto(null, "7777777777", UserRole.DRIVER)));
    }

    @Test
    void requestOtp_adminRole_throwsImmediately() {
        assertThrows(IllegalArgumentException.class,
                () -> authService.requestOtp(new RequestOtpDto("Admin", "9900000000", UserRole.ADMIN)));
    }

    @Test
    void requestOtp_guest_throwsWhenNameBlank() {
        assertThrows(IllegalArgumentException.class,
                () -> authService.requestOtp(new RequestOtpDto("", "9999999999", UserRole.GUEST)));
    }

    @Test
    void verifyOtp_successReturnsToken() {
        User user = savedUser("Alice", "9999999999", UserRole.GUEST);
        when(otpStore.verify("GUEST:9999999999", "123456")).thenReturn(true);
        when(userRepository.findByPhone("9999999999")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token");

        AuthResponseDto result = authService.verifyOtp(new VerifyOtpDto("9999999999", "123456", UserRole.GUEST));

        assertNotNull(result);
        assertEquals("jwt-token", result.token());
    }

    @Test
    void verifyOtp_invalidOtpThrows() {
        when(otpStore.verify("GUEST:9999999999", "000000")).thenReturn(false);

        assertThrows(IllegalArgumentException.class,
                () -> authService.verifyOtp(new VerifyOtpDto("9999999999", "000000", UserRole.GUEST)));
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

