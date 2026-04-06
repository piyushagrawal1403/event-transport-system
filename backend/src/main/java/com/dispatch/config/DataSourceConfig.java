package com.dispatch.config;

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
 */
@Configuration
@Profile("prod")
public class DataSourceConfig {

    @Bean
    public DataSource dataSource(@Value("${DATABASE_URL}") String url) {
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

        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl(jdbcUrl);
        if (username != null) {
            ds.setUsername(username);
            ds.setPassword(password);
        }
        ds.setDriverClassName("org.postgresql.Driver");
        return ds;
    }
}

