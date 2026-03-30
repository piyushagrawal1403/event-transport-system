package com.dispatch.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class EventImageStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/jpg", "image/png", "image/webp");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    private final Path uploadDirectory;
    private final long maxFileBytes;

    public EventImageStorageService(@Value("${app.upload.events-dir:uploads/events}") String uploadDir,
                                    @Value("${app.upload.events-max-bytes:5242880}") long maxFileBytes) {
        this.uploadDirectory = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.maxFileBytes = maxFileBytes;
        try {
            Files.createDirectories(this.uploadDirectory);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to initialize event upload directory", e);
        }
    }

    public String storeEventImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Only JPG, PNG, or WEBP images are allowed");
        }

        if (file.getSize() > maxFileBytes) {
            throw new IllegalArgumentException("Image exceeds max size of 5MB");
        }

        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        if (originalFileName.contains("..") || originalFileName.contains("/") || originalFileName.contains("\\")) {
            throw new IllegalArgumentException("Invalid file name");
        }

        String extFromName = extensionOf(originalFileName);
        String ext = !extFromName.isBlank() ? extFromName : extensionFromContentType(contentType);
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Unsupported image extension");
        }

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

    private String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) return "";
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private String extensionFromContentType(String contentType) {
        String normalized = contentType.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }
}

