package com.dispatch.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

@Component
public class ApiRoleAuthFilter extends OncePerRequestFilter {

    private static final String HEADER_ROLE = "X-User-Role";
    private static final String HEADER_PHONE = "X-User-Phone";
    private static final String HEADER_KEY = "X-Access-Key";

    @Value("${app.auth.admin-key:dev-admin-key}")
    private String adminAccessKey;

    @Value("${app.auth.driver-key:dev-driver-key}")
    private String driverAccessKey;

    @Value("${app.auth.guest-key:dev-guest-key}")
    private String guestAccessKey;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String roleHeader = request.getHeader(HEADER_ROLE);
        String accessKey = request.getHeader(HEADER_KEY);
        String userPhone = request.getHeader(HEADER_PHONE);

        if (StringUtils.hasText(roleHeader)) {
            String normalizedRole = roleHeader.trim().toUpperCase(Locale.ROOT);
            String expectedKey = switch (normalizedRole) {
                case "ADMIN" -> adminAccessKey;
                case "DRIVER" -> driverAccessKey;
                case "GUEST" -> guestAccessKey;
                default -> null;
            };

            if (expectedKey == null) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid role header");
                return;
            }
            if (!StringUtils.hasText(accessKey) || !expectedKey.equals(accessKey.trim())) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid access key");
                return;
            }
            if ("DRIVER".equals(normalizedRole) && !StringUtils.hasText(userPhone)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Driver phone is required");
                return;
            }

            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    StringUtils.hasText(userPhone) ? userPhone.trim() : normalizedRole.toLowerCase(Locale.ROOT),
                    null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + normalizedRole))
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}

