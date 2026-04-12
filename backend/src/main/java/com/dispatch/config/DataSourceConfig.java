package com.dispatch.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Rewrites Railway/Render's {@code postgres://user:pass@host/db} into
 * {@code jdbc:postgresql://host/db} so Spring JDBC can connect.
 *
 * Pool sizing is controlled by env vars:
 *   HIKARI_MAXIMUM_POOL_SIZE  (default 10)
 *   HIKARI_MINIMUM_IDLE       (default 2)
 *   HIKARI_CONNECTION_TIMEOUT (default 3000 ms)
 *   HIKARI_IDLE_TIMEOUT       (default 600000 ms)
 *   HIKARI_MAX_LIFETIME       (default 1700000 ms)
 *   HIKARI_KEEPALIVE_TIME     (default 300000 ms)
 */
@Configuration
@Profile("prod")
public class DataSourceConfig {

    @Bean
    public DataSource dataSource(
            @Value("${DATABASE_URL}") String url,
            @Value("${HIKARI_MAXIMUM_POOL_SIZE:10}") int maximumPoolSize,
            @Value("${HIKARI_MINIMUM_IDLE:2}") int minimumIdle,
            @Value("${HIKARI_CONNECTION_TIMEOUT:3000}") long connectionTimeout,
            @Value("${HIKARI_IDLE_TIMEOUT:600000}") long idleTimeout,
            @Value("${HIKARI_MAX_LIFETIME:1700000}") long maxLifetime,
            @Value("${HIKARI_KEEPALIVE_TIME:300000}") long keepaliveTime) {

        String jdbcUrl;
        String username = null;
        String password = null;

        if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
            URI dbUri = URI.create(url);
            jdbcUrl = "jdbc:postgresql://" + dbUri.getHost()
                    + (dbUri.getPort() > 0 ? ":" + dbUri.getPort() : "")
                    + dbUri.getPath()
                    + (dbUri.getQuery() != null ? "?" + dbUri.getQuery() : "");
            if (dbUri.getUserInfo() != null) {
                String[] parts = dbUri.getUserInfo().split(":", 2);
                username = parts[0];
                password = parts.length > 1 ? parts[1] : "";
            }
        } else {
            // Already a jdbc: URL — use as-is
            jdbcUrl = url;
        }

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        if (username != null) {
            config.setUsername(username);
            config.setPassword(password);
        }
        config.setDriverClassName("org.postgresql.Driver");

        // Pool sizing — tunable via Railway env vars
        config.setMaximumPoolSize(maximumPoolSize);
        config.setMinimumIdle(minimumIdle);
        config.setConnectionTimeout(connectionTimeout);
        config.setIdleTimeout(idleTimeout);
        config.setMaxLifetime(maxLifetime);
        config.setKeepaliveTime(keepaliveTime);

        // Fail fast on connection issues
        config.setInitializationFailTimeout(10000);

        return new HikariDataSource(config);
    }
}

