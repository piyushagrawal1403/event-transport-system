package com.dispatch.controller;

import com.dispatch.model.AppSetting;
import com.dispatch.repository.AppSettingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/config")
public class ConfigController {

    private final AppSettingRepository settingRepository;

    public ConfigController(AppSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @GetMapping
    public ResponseEntity<Map<String, String>> getConfig() {
        String adminPhone = settingRepository.findById("admin.phone")
                .map(AppSetting::getValue).orElse("+91-9900000000");
        String adminName = settingRepository.findById("admin.name")
                .map(AppSetting::getValue).orElse("Event Admin");
        return ResponseEntity.ok(Map.of("adminPhone", adminPhone, "adminName", adminName));
    }

    @PutMapping
    public ResponseEntity<Map<String, String>> updateConfig(@RequestBody Map<String, String> updates) {
        if (updates.containsKey("adminPhone")) {
            settingRepository.save(new AppSetting("admin.phone", normalizePhoneList(updates.get("adminPhone"))));
        }
        if (updates.containsKey("adminName")) {
            settingRepository.save(new AppSetting("admin.name", updates.get("adminName")));
        }
        return getConfig();
    }

    private String normalizePhoneList(String rawValue) {
        if (rawValue == null) {
            return "";
        }

        return java.util.Arrays.stream(rawValue.split("[\\n,;]+"))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .reduce((left, right) -> left + ", " + right)
                .orElse("");
    }
}
