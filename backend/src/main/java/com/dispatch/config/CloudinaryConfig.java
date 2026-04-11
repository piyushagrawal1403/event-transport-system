package com.dispatch.config;

import com.cloudinary.Cloudinary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Creates an optional {@link Cloudinary} bean.
 * <p>
 * If {@code CLOUDINARY_URL} is set (format: {@code cloudinary://api_key:api_secret@cloud_name}),
 * the bean is wired and images are uploaded to Cloudinary.
 * When the variable is absent or blank the bean is {@code null} and
 * {@link com.dispatch.service.EventImageStorageService} falls back to local disk.
 */
@Configuration
public class CloudinaryConfig {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryConfig.class);

    @Value("${cloudinary.url:}")
    private String cloudinaryUrl;

    @Bean
    public Cloudinary cloudinary() {
        if (cloudinaryUrl == null || cloudinaryUrl.isBlank()) {
            log.info("CLOUDINARY_URL not configured – image uploads will use local disk storage");
            return null;
        }
        log.info("Cloudinary configured – event images will be stored in Cloudinary");
        return new Cloudinary(cloudinaryUrl);
    }
}

