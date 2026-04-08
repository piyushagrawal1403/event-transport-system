package com.dispatch.service;

import com.dispatch.dto.AdminLoginDto;
import com.dispatch.dto.AuthResponseDto;
import com.dispatch.dto.AuthUserDto;
import com.dispatch.dto.DriverLoginDto;
import com.dispatch.dto.GuestLoginDto;
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
    private final RecaptchaService recaptchaService;
    private final JwtService jwtService;
    private final String adminUsername;
    private final String adminPassword;
    private final String adminPhone;
    private final String adminName;

    public AuthService(UserRepository userRepository,
                       CabRepository cabRepository,
                       RecaptchaService recaptchaService,
                       JwtService jwtService,
                       @Value("${app.auth.admin.username:admin}") String adminUsername,
                       @Value("${app.auth.admin.password:admin123}") String adminPassword,
                       @Value("${app.auth.admin.phone:9900000000}") String adminPhone,
                       @Value("${app.auth.admin.name:Event Admin}") String adminName) {
        this.userRepository = userRepository;
        this.cabRepository = cabRepository;
        this.recaptchaService = recaptchaService;
        this.jwtService = jwtService;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
        this.adminPhone = adminPhone;
        this.adminName = adminName;
    }

    @Transactional
    public AuthResponseDto guestLogin(GuestLoginDto dto) {
        if (!recaptchaService.verifyToken(dto.recaptchaToken())) {
            throw new IllegalArgumentException("reCAPTCHA verification failed. Please try again.");
        }

        String sanitizedPhone = sanitizePhone(dto.phone());
        upsertUser(dto.name().trim(), sanitizedPhone, UserRole.GUEST);
        User user = userRepository.findByPhone(sanitizedPhone)
                .orElseThrow(() -> new IllegalArgumentException("Failed to create guest user"));

        logger.info("Guest login successful for phone: {}", sanitizedPhone);
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponseDto driverLogin(DriverLoginDto dto) {
        if (!recaptchaService.verifyToken(dto.recaptchaToken())) {
            throw new IllegalArgumentException("reCAPTCHA verification failed. Please try again.");
        }

        String sanitizedPhone = sanitizePhone(dto.phone());
        Cab cab = cabRepository.findByDriverPhone(sanitizedPhone)
                .orElseThrow(() -> new IllegalArgumentException("No driver found for this phone number"));

        upsertUser(cab.getDriverName(), sanitizedPhone, UserRole.DRIVER);
        User user = userRepository.findByPhone(sanitizedPhone)
                .orElseThrow(() -> new IllegalArgumentException("Failed to create driver user"));

        logger.info("Driver login successful for phone: {}", sanitizedPhone);
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
                .orElseThrow(() -> new IllegalArgumentException("Please login again"));
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

