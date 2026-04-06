package com.dispatch.service;

import com.dispatch.dto.AdminLoginDto;
import com.dispatch.dto.AuthResponseDto;
import com.dispatch.dto.AuthUserDto;
import com.dispatch.dto.RequestOtpDto;
import com.dispatch.dto.RequestOtpResponseDto;
import com.dispatch.dto.VerifyOtpDto;
import com.dispatch.model.Cab;
import com.dispatch.model.User;
import com.dispatch.model.UserRole;
import com.dispatch.repository.CabRepository;
import com.dispatch.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final CabRepository cabRepository;
    private final OtpStore otpStore;
    private final JwtService jwtService;
    private final String adminUsername;
    private final String adminPassword;
    private final String adminPhone;
    private final String adminName;

    public AuthService(UserRepository userRepository,
                       CabRepository cabRepository,
                       OtpStore otpStore,
                       JwtService jwtService,
                       @Value("${app.auth.admin.username:admin}") String adminUsername,
                       @Value("${app.auth.admin.password:admin123}") String adminPassword,
                       @Value("${app.auth.admin.phone:9900000000}") String adminPhone,
                       @Value("${app.auth.admin.name:Event Admin}") String adminName) {
        this.userRepository = userRepository;
        this.cabRepository = cabRepository;
        this.otpStore = otpStore;
        this.jwtService = jwtService;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
        this.adminPhone = adminPhone;
        this.adminName = adminName;
    }

    @Transactional
    public RequestOtpResponseDto requestOtp(RequestOtpDto dto) {
        UserRole role = dto.role();
        if (role == UserRole.ADMIN) {
            throw new IllegalArgumentException("Use admin login for admin access");
        }

        String sanitizedPhone = sanitizePhone(dto.phone());
        if (role == UserRole.GUEST) {
            if (dto.name() == null || dto.name().isBlank()) {
                throw new IllegalArgumentException("Name is required for guest login");
            }
            upsertUser(dto.name().trim(), sanitizedPhone, UserRole.GUEST);
        } else {
            Cab cab = cabRepository.findByDriverPhone(sanitizedPhone)
                    .orElseThrow(() -> new IllegalArgumentException("No driver found for this phone number"));
            upsertUser(cab.getDriverName(), sanitizedPhone, UserRole.DRIVER);
        }

        OtpStore.OtpChallenge challenge = otpStore.createChallenge(buildOtpKey(role, sanitizedPhone));
        logger.info("OTP generated for {} ({}) — expires at {}", role, sanitizedPhone, challenge.expiresAt());
        return new RequestOtpResponseDto("OTP sent successfully", challenge.otp(), challenge.expiresAt());
    }

    @Transactional
    public AuthResponseDto verifyOtp(VerifyOtpDto dto) {
        UserRole role = dto.role();
        if (role == UserRole.ADMIN) {
            throw new IllegalArgumentException("Use admin login for admin access");
        }

        String sanitizedPhone = sanitizePhone(dto.phone());
        if (!otpStore.verify(buildOtpKey(role, sanitizedPhone), dto.otp())) {
            throw new IllegalArgumentException("Invalid or expired OTP");
        }

        User user = resolveUserForRole(role, sanitizedPhone);
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponseDto adminLogin(AdminLoginDto dto) {
        boolean usernameMatch = MessageDigest.isEqual(
                adminUsername.getBytes(StandardCharsets.UTF_8),
                dto.username().getBytes(StandardCharsets.UTF_8));
        boolean passwordMatch = MessageDigest.isEqual(
                adminPassword.getBytes(StandardCharsets.UTF_8),
                dto.password().getBytes(StandardCharsets.UTF_8));
        if (!usernameMatch || !passwordMatch) {
            throw new IllegalArgumentException("Invalid admin credentials");
        }

        User adminUser = upsertUser(adminName, sanitizePhone(adminPhone), UserRole.ADMIN);
        return buildAuthResponse(adminUser);
    }

    private User resolveUserForRole(UserRole role, String phone) {
        if (role == UserRole.DRIVER) {
            Cab cab = cabRepository.findByDriverPhone(phone)
                    .orElseThrow(() -> new IllegalArgumentException("No driver found for this phone number"));
            return upsertUser(cab.getDriverName(), phone, UserRole.DRIVER);
        }

        return userRepository.findByPhone(phone)
                .filter(user -> user.getRole() == UserRole.GUEST)
                .orElseThrow(() -> new IllegalArgumentException("Please request a new OTP"));
    }

    private AuthResponseDto buildAuthResponse(User user) {
        return new AuthResponseDto(
                jwtService.generateToken(user),
                new AuthUserDto(user.getId(), user.getName(), user.getPhone(), user.getRole())
        );
    }

    private User upsertUser(String name, String phone, UserRole role) {
        User user = userRepository.findByPhone(phone).orElseGet(User::new);
        if (user.getId() != null && user.getRole() != role) {
            throw new IllegalStateException("Phone is already registered for a different role");
        }
        user.setName(name);
        user.setPhone(phone);
        user.setRole(role);
        return userRepository.save(user);
    }

    private String buildOtpKey(UserRole role, String phone) {
        return role.name() + ":" + phone;
    }

    private String sanitizePhone(String phone) {
        if (phone == null) {
            return null;
        }
        String digits = phone.replaceAll("[^\\d]", "");
        if (digits.startsWith("91") && digits.length() == 12) {
            digits = digits.substring(2);
        }
        if (!digits.matches("^[0-9]{10}$")) {
            throw new IllegalArgumentException("Phone must be exactly 10 digits");
        }
        return digits;
    }
}

