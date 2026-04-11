package com.dispatch.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Stores event images either in Cloudinary (when {@code CLOUDINARY_URL} is configured)
 * or on local disk (dev fallback – ephemeral on Railway containers).
 */
@Service
public class EventImageStorageService {

    private static final Logger log = LoggerFactory.getLogger(EventImageStorageService.class);

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/jpeg", "image/jpg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("jpg", "jpeg", "png", "webp");

    /** Cloudinary folder where event images are stored. */
    private static final String CLOUDINARY_FOLDER = "event-transport/events";

    private final Cloudinary cloudinary;   // null when CLOUDINARY_URL is not configured
    private final Path uploadDirectory;
    private final long maxFileBytes;
    private final Environment environment;

    public EventImageStorageService(
            @Autowired(required = false) Cloudinary cloudinary,
            @Value("${app.upload.events-dir:uploads/events}") String uploadDir,
            @Value("${app.upload.events-max-bytes:5242880}") long maxFileBytes,
            Environment environment) {

        this.cloudinary = cloudinary;
        this.maxFileBytes = maxFileBytes;
        this.environment = environment;
        this.uploadDirectory = Paths.get(uploadDir).toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.uploadDirectory);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialise event upload directory", e);
        }
    }

    @PostConstruct
    void logStorageBackend() {
        if (cloudinary != null) {
            log.info("EventImageStorageService → Cloudinary (folder={})", CLOUDINARY_FOLDER);
        } else if (Arrays.asList(environment.getActiveProfiles()).contains("prod")) {
            log.warn("⚠ EVENT IMAGE UPLOADS ARE EPHEMERAL: {} is on the container filesystem and will "
                    + "be wiped on every redeploy. Set CLOUDINARY_URL to persist images.", uploadDirectory);
        } else {
            log.info("EventImageStorageService → local disk: {}", uploadDirectory);
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public String storeEventImage(MultipartFile file) {
        validateFile(file);
        return cloudinary != null ? uploadToCloudinary(file) : storeLocally(file);
    }

    // ── Cloudinary ────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private String uploadToCloudinary(MultipartFile file) {
        try {
            Map<String, Object> params = ObjectUtils.asMap(
                    "folder", CLOUDINARY_FOLDER,
                    "resource_type", "image",
                    "use_filename", false,
                    "unique_filename", true,
                    "overwrite", false
            );
            Map<Object, Object> result = cloudinary.uploader().upload(file.getBytes(), params);
            String secureUrl = (String) result.get("secure_url");
            log.info("action=cloudinary_upload public_id={} url={}", result.get("public_id"), secureUrl);
            return secureUrl;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to upload image to Cloudinary", e);
        }
    }

    // ── Local disk fallback ───────────────────────────────────────────────────

    private String storeLocally(MultipartFile file) {
        String contentType = file.getContentType();
        String originalFileName = StringUtils.cleanPath(
                file.getOriginalFilename() == null ? "" : file.getOriginalFilename());

        String extFromName = extensionOf(originalFileName);
        String ext = !extFromName.isBlank() ? extFromName : extensionFromContentType(contentType);

        String fileName = UUID.randomUUID() + "." + ext;
        Path target = uploadDirectory.resolve(fileName).normalize();
        if (!target.startsWith(uploadDirectory)) {
            throw new IllegalArgumentException("Invalid file path");
        }

        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to store event image", e);
        }

        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/events/")
                .path(fileName)
                .toUriString();
    }

    // ── Validation ────────────────────────────────────────────────────────────

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Only JPG, PNG, or WEBP images are allowed");
        }

        if (file.getSize() > maxFileBytes) {
            throw new IllegalArgumentException("Image exceeds max size of 5 MB");
        }

        String originalFileName = StringUtils.cleanPath(
                file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        if (originalFileName.contains("..") || originalFileName.contains("/")
                || originalFileName.contains("\\")) {
            throw new IllegalArgumentException("Invalid file name");
        }

        String ext = extensionOf(originalFileName);
        if (!ext.isBlank() && !ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Unsupported image extension");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) return "";
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String extensionFromContentType(String contentType) {
        if (contentType == null) return "jpg";
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/png"  -> "png";
            case "image/webp" -> "webp";
            default           -> "jpg";
        };
    }
}

