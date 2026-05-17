package com.clarity.ehr.controller;

import com.clarity.ehr.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/audit-log")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository repo;

    @GetMapping
    public ResponseEntity<?> list() {
        return ResponseEntity.ok(repo.findAllByOrderByTimestampDesc());
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> forPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(repo.findByPatientIdOrderByTimestampDesc(patientId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> forUser(@PathVariable String userId) {
        return ResponseEntity.ok(repo.findByUserIdOrderByTimestampDesc(userId));
    }
}
