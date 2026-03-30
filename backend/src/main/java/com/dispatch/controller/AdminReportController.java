package com.dispatch.controller;

import com.dispatch.dto.AdminDailyReportDto;
import com.dispatch.model.ComplaintStatus;
import com.dispatch.model.RideIncidentType;
import com.dispatch.service.AdminReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/admin/reports")
public class AdminReportController {

    private final AdminReportService adminReportService;

    public AdminReportController(AdminReportService adminReportService) {
        this.adminReportService = adminReportService;
    }

    @GetMapping("/daily")
    public ResponseEntity<AdminDailyReportDto> getDailyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(adminReportService.getDailyReport(date));
    }

    @GetMapping(value = "/exports/cancelled-queue", produces = "text/csv")
    public ResponseEntity<byte[]> exportCancelledQueue(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String driver,
            @RequestParam(required = false) RideIncidentType status) {
        String csv = adminReportService.exportCancelledQueueCsv(date, driver, status);
        return csvResponse(csv, "cancelled-queue-" + (date == null ? LocalDate.now() : date) + ".csv");
    }

    @GetMapping(value = "/exports/driver-analytics", produces = "text/csv")
    public ResponseEntity<byte[]> exportDriverAnalytics() {
        String csv = adminReportService.exportDriverAnalyticsCsv();
        return csvResponse(csv, "driver-analytics-summary.csv");
    }

    @GetMapping(value = "/exports/complaints", produces = "text/csv")
    public ResponseEntity<byte[]> exportComplaints(
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        String csv = adminReportService.exportComplaintsCsv(status, date);
        return csvResponse(csv, "complaints-" + (date == null ? "all" : date) + ".csv");
    }

    private ResponseEntity<byte[]> csvResponse(String csvBody, String fileName) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csvBody.getBytes(StandardCharsets.UTF_8));
    }
}

