package com.dispatch;

import com.dispatch.model.User;
import com.dispatch.model.UserRole;
import com.dispatch.repository.PushSubscriptionRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("seed")
@Transactional
class PushSubscriptionIsolationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PushSubscriptionRepository pushSubscriptionRepository;

    @Test
    void subscribe_rejectsIdentityMismatchBetweenTokenAndPayload() throws Exception {
        String driverToken = tokenFor("Driver One", "9000000011", UserRole.DRIVER);

        mockMvc.perform(post("/api/v1/push/subscribe")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "endpoint", "https://example.com/push/driver",
                                "keys.p256dh", "p256dh-key",
                                "keys.auth", "auth-key",
                                "userPhone", "9999999999",
                                "userType", "GUEST"
                        ))))
                .andExpect(status().isForbidden());
    }

    @Test
    void subscribe_rebindsEndpointToLatestIdentityToPreventCrossDelivery() throws Exception {
        String endpoint = "https://example.com/push/shared-endpoint";
        String driverToken = tokenFor("Driver One", "9000000022", UserRole.DRIVER);
        String guestToken = tokenFor("Guest One", "9000000033", UserRole.GUEST);

        mockMvc.perform(post("/api/v1/push/subscribe")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "endpoint", endpoint,
                                "keys.p256dh", "driver-p256dh",
                                "keys.auth", "driver-auth",
                                "userPhone", "9000000022",
                                "userType", "DRIVER"
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/push/subscribe")
                        .header("Authorization", "Bearer " + guestToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "endpoint", endpoint,
                                "keys.p256dh", "guest-p256dh",
                                "keys.auth", "guest-auth",
                                "userPhone", "9000000033",
                                "userType", "GUEST"
                        ))))
                .andExpect(status().isOk());

        var byEndpoint = pushSubscriptionRepository.findAllByEndpoint(endpoint);
        assertEquals(1, byEndpoint.size());
        assertEquals("GUEST", byEndpoint.get(0).getUserType());
        assertEquals("9000000033", byEndpoint.get(0).getUserPhone());
        assertTrue(pushSubscriptionRepository.findByUserTypeAndUserPhone("DRIVER", "9000000022").isEmpty());
    }

    @Test
    void unsubscribe_doesNotDeleteDifferentUsersSubscription() throws Exception {
        String endpoint = "https://example.com/push/isolation-endpoint";
        String guestToken = tokenFor("Guest Two", "9000000044", UserRole.GUEST);
        String driverToken = tokenFor("Driver Two", "9000000055", UserRole.DRIVER);

        mockMvc.perform(post("/api/v1/push/subscribe")
                        .header("Authorization", "Bearer " + guestToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "endpoint", endpoint,
                                "keys.p256dh", "guest-p256dh",
                                "keys.auth", "guest-auth",
                                "userPhone", "9000000044",
                                "userType", "GUEST"
                        ))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/push/unsubscribe")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "endpoint", endpoint
                        ))))
                .andExpect(status().isOk());

        var byEndpoint = pushSubscriptionRepository.findAllByEndpoint(endpoint);
        assertEquals(1, byEndpoint.size());
        assertEquals("GUEST", byEndpoint.get(0).getUserType());
        assertEquals("9000000044", byEndpoint.get(0).getUserPhone());
    }

    private String tokenFor(String name, String phone, UserRole role) {
        User user = new User();
        user.setName(name);
        user.setPhone(phone);
        user.setRole(role);
        return jwtService.generateToken(userRepository.save(user));
    }
}

