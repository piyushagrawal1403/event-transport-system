package com.dispatch;

import com.dispatch.model.Location;
import com.dispatch.model.User;
import com.dispatch.model.UserRole;
import com.dispatch.repository.LocationRepository;
import com.dispatch.repository.UserRepository;
import com.dispatch.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.auth.admin.username=test-admin",
        "app.auth.admin.password=test-pass",
        "app.auth.admin.phone=9000000009",
        "app.auth.admin.name=Test Admin"
})
@AutoConfigureMockMvc
@ActiveProfiles("seed")
@Transactional
class PhaseEAuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private LocationRepository locationRepository;

    @Test
    void requestOtpAndVerifyOtp_forDriver_returnsJwtBackedSession() throws Exception {
        mockMvc.perform(post("/api/v1/auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "phone", "9876510001",
                                "role", "DRIVER"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.otp").isString())
                .andExpect(jsonPath("$.expiresAt").exists());

        String otp = objectMapper.readTree(mockMvc.perform(post("/api/v1/auth/request-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "phone", "9876510001",
                                "role", "DRIVER"
                        ))))
                .andReturn().getResponse().getContentAsString()).get("otp").asText();

        mockMvc.perform(post("/api/v1/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "phone", "9876510001",
                                "otp", otp,
                                "role", "DRIVER"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.user.role").value("DRIVER"))
                .andExpect(jsonPath("$.user.phone").value("9876510001"));
    }

    @Test
    void adminLogin_bypassesOtpUsingConfiguredCredentials() throws Exception {
        mockMvc.perform(post("/api/v1/auth/admin-login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", "test-admin",
                                "password", "test-pass"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.user.phone").value("9000000009"));
    }

    @Test
    void createRide_rejectsPassengerCountAboveFour() throws Exception {
        Location location = locationRepository.findAll().stream()
                .filter(loc -> !Boolean.TRUE.equals(loc.getIsMainVenue()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No seeded hotel location found"));

        User guest = new User();
        guest.setName("Validation Guest");
        guest.setPhone("9999999999");
        guest.setRole(UserRole.GUEST);
        String token = jwtService.generateToken(userRepository.save(guest));

        mockMvc.perform(post("/api/v1/rides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "guestName", "Validation Guest",
                                "guestPhone", "9999999999",
                                "passengerCount", 5,
                                "direction", "TO_VENUE",
                                "locationId", location.getId()
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"))
                .andExpect(jsonPath("$.details.passengerCount").value("Passenger count must not exceed 4"));
    }
}

