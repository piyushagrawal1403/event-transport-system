package com.dispatch.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

// TODO: migrate to object storage (R2/S3) before production
@Configuration
public class UploadResourceConfig implements WebMvcConfigurer {

    @Value("${app.upload.events-dir:uploads/events}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path absolute = Paths.get(uploadDir).toAbsolutePath().normalize();
        String location = "file:" + absolute.toString() + "/";
        registry.addResourceHandler("/uploads/events/**")
                .addResourceLocations(location);
    }
}

