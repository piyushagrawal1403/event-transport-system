package com.dispatch;

import com.dispatch.model.User;
import com.dispatch.model.UserRole;
import com.dispatch.model.Location;
import com.dispatch.repository.LocationRepository;
import com.dispatch.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SecurityRbacTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private LocationRepository locationRepository;

    private String guestToken;
    private String driverToken;
    private String adminToken;
    private Long locationId;

    @BeforeEach
    void setUp() {
        guestToken = tokenFor("Test Guest", "9100000001", UserRole.GUEST);
        driverToken = tokenFor("Test Driver", "9100000002", UserRole.DRIVER);
        adminToken = tokenFor("Test Admin", "9100000003", UserRole.ADMIN);
        Location location = locationRepository.save(new Location("RBAC Test Hotel", false, 3.0));
        locationId = location.getId();
    }

    private String tokenFor(String name, String phone, UserRole role) {
        User user = new User();
        user.setId(0L);
        user.setName(name);
        user.setPhone(phone);
        user.setRole(role);
        return jwtService.generateToken(user);
    }

    // POST /api/v1/rides — GUEST only
    @Test void rides_post_noToken_401() throws Exception {
        mockMvc.perform(post("/api/v1/rides")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guestName\":\"A\",\"guestPhone\":\"9100000001\",\"passengerCount\":1,\"direction\":\"TO_VENUE\",\"locationId\":" + locationId + "}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void rides_post_guest_allowed() throws Exception {
        mockMvc.perform(post("/api/v1/rides")
                .header("Authorization", "Bearer " + guestToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guestName\":\"A\",\"guestPhone\":\"9100000001\",\"passengerCount\":1,\"direction\":\"TO_VENUE\",\"locationId\":" + locationId + "}"))
                .andExpect(status().isOk());
    }
    @Test void rides_post_driver_forbidden() throws Exception {
        mockMvc.perform(post("/api/v1/rides")
                .header("Authorization", "Bearer " + driverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guestName\":\"A\",\"guestPhone\":\"9100000001\",\"passengerCount\":1,\"direction\":\"TO_VENUE\",\"locationId\":" + locationId + "}"))
                .andExpect(status().isForbidden());
    }
    @Test void rides_post_admin_forbidden() throws Exception {
        mockMvc.perform(post("/api/v1/rides")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guestName\":\"A\",\"guestPhone\":\"9100000001\",\"passengerCount\":1,\"direction\":\"TO_VENUE\",\"locationId\":" + locationId + "}"))
                .andExpect(status().isForbidden());
    }

    // POST /api/v1/complaints — GUEST only
    @Test void complaints_post_noToken_401() throws Exception {
        mockMvc.perform(post("/api/v1/complaints")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guestName\":\"A\",\"guestPhone\":\"9100000001\",\"message\":\"Test\"}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void complaints_post_guest_allowed() throws Exception {
        mockMvc.perform(post("/api/v1/complaints")
                .header("Authorization", "Bearer " + guestToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guestName\":\"A\",\"guestPhone\":\"9100000001\",\"message\":\"Test\"}"))
                .andExpect(status().isOk());
    }
    @Test void complaints_post_driver_forbidden() throws Exception {
        mockMvc.perform(post("/api/v1/complaints")
                .header("Authorization", "Bearer " + driverToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guestName\":\"A\",\"guestPhone\":\"9100000001\",\"message\":\"Test\"}"))
                .andExpect(status().isForbidden());
    }

    // GET /api/v1/rides/pending — ADMIN only
    @Test void rides_pending_noToken_401() throws Exception {
        mockMvc.perform(get("/api/v1/rides/pending"))
                .andExpect(status().isUnauthorized());
    }
    @Test void rides_pending_guest_forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/rides/pending")
                .header("Authorization", "Bearer " + guestToken))
                .andExpect(status().isForbidden());
    }
    @Test void rides_pending_driver_forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/rides/pending")
                .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isForbidden());
    }
    @Test void rides_pending_admin_allowed() throws Exception {
        mockMvc.perform(get("/api/v1/rides/pending")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    // PUT /api/v1/rides/{id}/accept — DRIVER only
    @Test void rides_accept_noToken_401() throws Exception {
        mockMvc.perform(put("/api/v1/rides/1/accept"))
                .andExpect(status().isUnauthorized());
    }
    @Test void rides_accept_guest_forbidden() throws Exception {
        mockMvc.perform(put("/api/v1/rides/1/accept")
                .header("Authorization", "Bearer " + guestToken))
                .andExpect(status().isForbidden());
    }
    @Test void rides_accept_admin_forbidden() throws Exception {
        mockMvc.perform(put("/api/v1/rides/1/accept")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    // GET /api/v1/cabs — ADMIN + DRIVER
    @Test void cabs_noToken_401() throws Exception {
        mockMvc.perform(get("/api/v1/cabs"))
                .andExpect(status().isUnauthorized());
    }
    @Test void cabs_guest_forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/cabs")
                .header("Authorization", "Bearer " + guestToken))
                .andExpect(status().isForbidden());
    }
    @Test void cabs_driver_allowed() throws Exception {
        mockMvc.perform(get("/api/v1/cabs")
                .header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk());
    }
    @Test void cabs_admin_allowed() throws Exception {
        mockMvc.perform(get("/api/v1/cabs")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    // PUT /api/v1/cabs/status — DRIVER only
    @Test void cabs_status_noToken_401() throws Exception {
        mockMvc.perform(put("/api/v1/cabs/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"9100000002\",\"status\":\"AVAILABLE\"}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void cabs_status_guest_forbidden() throws Exception {
        mockMvc.perform(put("/api/v1/cabs/status")
                .header("Authorization", "Bearer " + guestToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"9100000002\",\"status\":\"AVAILABLE\"}"))
                .andExpect(status().isForbidden());
    }
    @Test void cabs_status_admin_forbidden() throws Exception {
        mockMvc.perform(put("/api/v1/cabs/status")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"9100000002\",\"status\":\"AVAILABLE\"}"))
                .andExpect(status().isForbidden());
    }

    // GET /api/v1/complaints — ADMIN only
    @Test void complaints_get_noToken_401() throws Exception {
        mockMvc.perform(get("/api/v1/complaints"))
                .andExpect(status().isUnauthorized());
    }
    @Test void complaints_get_guest_forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/complaints")
                .header("Authorization", "Bearer " + guestToken))
                .andExpect(status().isForbidden());
    }
    @Test void complaints_get_admin_allowed() throws Exception {
        mockMvc.perform(get("/api/v1/complaints")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    // POST /api/v1/events — ADMIN only
    @Test void events_post_noToken_401() throws Exception {
        mockMvc.perform(post("/api/v1/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"T\",\"startTime\":\"2026-04-01T10:00:00\",\"endTime\":\"2026-04-01T11:00:00\",\"locationId\":" + locationId + "}"))
                .andExpect(status().isUnauthorized());
    }
    @Test void events_post_guest_forbidden() throws Exception {
        mockMvc.perform(post("/api/v1/events")
                .header("Authorization", "Bearer " + guestToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"T\",\"startTime\":\"2026-04-01T10:00:00\",\"endTime\":\"2026-04-01T11:00:00\",\"locationId\":" + locationId + "}"))
                .andExpect(status().isForbidden());
    }
    @Test void events_post_admin_allowed() throws Exception {
        mockMvc.perform(post("/api/v1/events")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"T\",\"startTime\":\"2026-04-01T10:00:00\",\"endTime\":\"2026-04-01T11:00:00\",\"locationId\":" + locationId + "}"))
                .andExpect(status().isOk());
    }

    // GET /api/v1/events — PUBLIC
    @Test void events_get_noToken_public() throws Exception {
        mockMvc.perform(get("/api/v1/events"))
                .andExpect(status().isOk());
    }
    @Test void events_get_anyRole_allowed() throws Exception {
        mockMvc.perform(get("/api/v1/events")
                .header("Authorization", "Bearer " + guestToken))
                .andExpect(status().isOk());
    }

    // GET /api/v1/config — PUBLIC
    @Test void config_get_noToken_public() throws Exception {
        mockMvc.perform(get("/api/v1/config"))
                .andExpect(status().isOk());
    }

    // POST /api/v1/push/subscribe — authenticated (any role)
    @Test void push_subscribe_noToken_401() throws Exception {
        mockMvc.perform(post("/api/v1/push/subscribe")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "endpoint", "https://test/push",
                        "keys.p256dh", "key1",
                        "keys.auth", "key2",
                        "userPhone", "9100000001",
                        "userType", "GUEST"
                ))))
                .andExpect(status().isUnauthorized());
    }
    @Test void push_subscribe_guest_allowed() throws Exception {
        mockMvc.perform(post("/api/v1/push/subscribe")
                .header("Authorization", "Bearer " + guestToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "endpoint", "https://test/push/g",
                        "keys.p256dh", "key1",
                        "keys.auth", "key2",
                        "userPhone", "9100000001",
                        "userType", "GUEST"
                ))))
                .andExpect(status().isOk());
    }

    // GET /api/v1/push/admin/subscriptions — ADMIN only
    @Test void push_admin_subs_noToken_401() throws Exception {
        mockMvc.perform(get("/api/v1/push/admin/subscriptions"))
                .andExpect(status().isUnauthorized());
    }
    @Test void push_admin_subs_guest_forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/push/admin/subscriptions")
                .header("Authorization", "Bearer " + guestToken))
                .andExpect(status().isForbidden());
    }
    @Test void push_admin_subs_admin_allowed() throws Exception {
        mockMvc.perform(get("/api/v1/push/admin/subscriptions")
                .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }
}

