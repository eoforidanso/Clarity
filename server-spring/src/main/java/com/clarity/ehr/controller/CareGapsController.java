package com.clarity.ehr.controller;

import com.clarity.ehr.entity.*;
import com.clarity.ehr.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/care-gaps")
@RequiredArgsConstructor
public class CareGapsController {

    private final PatientRepository patientRepo;
    private final AssessmentRepository assessmentRepo;
    private final VitalRepository vitalRepo;
    private final ImmunizationRepository immunizationRepo;
    private final LabResultRepository labRepo;

    @GetMapping
    public ResponseEntity<?> listCareGaps() {
        List<Patient> patients = patientRepo.findAll();
        List<Map<String, Object>> gaps = new ArrayList<>();

        for (Patient p : patients) {
            List<Map<String, Object>> patientGaps = new ArrayList<>();

            if (vitalRepo.findByPatientIdOrderByDateDesc(p.getId()).isEmpty()) {
                patientGaps.add(Map.of("measure", "Blood Pressure Screening", "status", "open", "priority", "high"));
            }
            if (immunizationRepo.findByPatientIdOrderByCreatedAtDesc(p.getId()).isEmpty()) {
                patientGaps.add(Map.of("measure", "Immunization Review", "status", "open", "priority", "medium"));
            }
            if (assessmentRepo.findByPatientIdOrderByDateDesc(p.getId()).isEmpty()) {
                patientGaps.add(Map.of("measure", "Depression Screening (PHQ-9)", "status", "open", "priority", "medium"));
            }
            if (labRepo.findByPatientIdOrderByResultDateDesc(p.getId()).isEmpty()) {
                patientGaps.add(Map.of("measure", "Annual Lab Work", "status", "open", "priority", "high"));
            }

            if (!patientGaps.isEmpty()) {
                gaps.add(Map.of(
                        "patientId", p.getId(),
                        "patientName", p.getFirstName() + " " + p.getLastName(),
                        "mrn", p.getMrn() != null ? p.getMrn() : "",
                        "gaps", patientGaps,
                        "openCount", patientGaps.size()
                ));
            }
        }
        return ResponseEntity.ok(gaps);
    }
}
