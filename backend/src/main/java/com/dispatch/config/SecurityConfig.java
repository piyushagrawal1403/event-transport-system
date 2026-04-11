package com.dispatch.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Map;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   ApiRoleAuthFilter apiRoleAuthFilter,
                                                   ObjectMapper objectMapper) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getWriter(), Map.of("error", "Unauthorized"));
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            objectMapper.writeValue(response.getWriter(), Map.of("error", "Forbidden"));
                        }))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/h2-console/**", "/uploads/**", "/images/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/rides/trip/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/events/**", "/api/v1/locations", "/api/v1/config").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/notifications", "/api/v1/push/vapid-public-key").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/bootstrap/master-data").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/bootstrap/master-data").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/bootstrap/master-data/refresh").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/rides", "/api/v1/complaints").hasRole("GUEST")
                        .requestMatchers(HttpMethod.GET, "/api/v1/complaints/mine").hasRole("GUEST")
                        .requestMatchers(HttpMethod.GET, "/api/v1/rides/guest").hasAnyRole("GUEST", "ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/push/subscribe", "/api/v1/push/unsubscribe").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/push/admin/subscriptions").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/push/admin/test").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/v1/rides/pending", "/api/v1/rides/ongoing", "/api/v1/rides/cancelled").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/rides/*").hasAnyRole("ADMIN", "GUEST")
                        .requestMatchers(HttpMethod.GET, "/api/v1/rides/cab/*", "/api/v1/rides/cab/*/completed").hasAnyRole("ADMIN", "DRIVER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/rides/*/accept", "/api/v1/rides/*/deny").hasRole("DRIVER")

                        .requestMatchers(HttpMethod.POST, "/api/v1/dispatch/assign", "/api/v1/dispatch/status/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/dispatch/start/*", "/api/v1/dispatch/arrive/*", "/api/v1/dispatch/complete/*").hasRole("DRIVER")

                        .requestMatchers(HttpMethod.GET, "/api/v1/cabs").hasAnyRole("ADMIN", "DRIVER")
                        .requestMatchers(HttpMethod.POST, "/api/v1/cabs").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/cabs/status").hasRole("DRIVER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/cabs/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/cabs/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/v1/cabs/*/analytics").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/v1/locations").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/locations/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/locations/*").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/v1/complaints").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/complaints/*/close").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/complaints/*/close").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/v1/events", "/api/v1/events/images").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/events/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/events/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/config").hasRole("ADMIN")

                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(apiRoleAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

