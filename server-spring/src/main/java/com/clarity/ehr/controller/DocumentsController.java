package com.clarity.ehr.controller;

import com.clarity.ehr.entity.*;
import com.clarity.ehr.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentsController {

    private final PatientRepository patientRepo;
    private final EncounterRepository encounterRepo;
    private final MedicationRepository medRepo;
    private final AllergyRepository allergyRepo;
    private final ProblemRepository problemRepo;
    private final VitalRepository vitalRepo;

    @PostMapping("/progress-note")
    public ResponseEntity<?> progressNote(@RequestBody Map<String, String> body) {
        String encounterId = body.get("encounterId");
        String patientId = body.get("patientId");
        Optional<Patient> patient = patientRepo.findById(patientId);
        Optional<Encounter> encounter = encounterRepo.findById(encounterId);

        if (patient.isEmpty() || encounter.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Patient or encounter not found"));
        }

        Encounter enc = encounter.get();
        Patient pt = patient.get();
        Map<String, Object> note = new LinkedHashMap<>();
        note.put("title", "Progress Note");
        note.put("patientName", pt.getFirstName() + " " + pt.getLastName());
        note.put("mrn", pt.getMrn());
        note.put("date", enc.getDate());
        note.put("provider", enc.getProvider());
        note.put("chiefComplaint", enc.getChiefComplaint());
        note.put("hpi", enc.getHpi());
        note.put("mse", enc.getMse());
        note.put("assessment", enc.getAssessment());
        note.put("plan", enc.getPlan());
        note.put("generatedAt", java.time.LocalDateTime.now().toString());

        return ResponseEntity.ok(note);
    }

    @PostMapping("/patient-summary")
    public ResponseEntity<?> patientSummary(@RequestBody Map<String, String> body) {
        String patientId = body.get("patientId");
        Optional<Patient> patient = patientRepo.findById(patientId);
        if (patient.isEmpty()) return ResponseEntity.notFound().build();

        Patient pt = patient.get();
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("title", "Patient Summary (CCD)");
        summary.put("patientName", pt.getFirstName() + " " + pt.getLastName());
        summary.put("mrn", pt.getMrn());
        summary.put("dob", pt.getDob());
        summary.put("gender", pt.getGender());
        summary.put("allergies", allergyRepo.findByPatientIdOrderByCreatedAtDesc(patientId));
        summary.put("problems", problemRepo.findByPatientIdOrderByCreatedAtDesc(patientId));
        summary.put("medications", medRepo.findByPatientIdOrderByCreatedAtDesc(patientId));
        summary.put("vitals", vitalRepo.findByPatientIdOrderByDateDesc(patientId));
        summary.put("generatedAt", java.time.LocalDateTime.now().toString());

        return ResponseEntity.ok(summary);
    }

    @PostMapping("/prescription")
    public ResponseEntity<?> prescription(@RequestBody Map<String, String> body) {
        String medicationId = body.get("medicationId");
        String patientId = body.get("patientId");
        Optional<Patient> patient = patientRepo.findById(patientId);
        Optional<Medication> med = medRepo.findById(medicationId);

        if (patient.isEmpty() || med.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Patient or medication not found"));
        }

        Medication m = med.get();
        Patient pt = patient.get();
        Map<String, Object> rx = new LinkedHashMap<>();
        rx.put("title", "Prescription");
        rx.put("patientName", pt.getFirstName() + " " + pt.getLastName());
        rx.put("medication", m.getName());
        rx.put("dose", m.getDose());
        rx.put("route", m.getRoute());
        rx.put("frequency", m.getFrequency());
        rx.put("sig", m.getSig());
        rx.put("refills", m.getRefillsLeft());
        rx.put("pharmacy", m.getPharmacy());
        rx.put("prescriber", m.getPrescriber());
        rx.put("generatedAt", java.time.LocalDateTime.now().toString());

        return ResponseEntity.ok(rx);
    }

    @PostMapping("/discharge-summary")
    public ResponseEntity<?> dischargeSummary(@RequestBody Map<String, Object> body) {
        String patientId = (String) body.get("patientId");
        Optional<Patient> patient = patientRepo.findById(patientId);
        if (patient.isEmpty()) return ResponseEntity.notFound().build();

        Patient pt = patient.get();
        Map<String, Object> doc = new LinkedHashMap<>(body);
        doc.put("title", "Discharge Summary");
        doc.put("patientName", pt.getFirstName() + " " + pt.getLastName());
        doc.put("mrn", pt.getMrn());
        doc.put("generatedAt", java.time.LocalDateTime.now().toString());

        return ResponseEntity.ok(doc);
    }
}
