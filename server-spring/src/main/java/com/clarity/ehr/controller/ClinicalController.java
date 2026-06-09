package com.clarity.ehr.controller;

import com.clarity.ehr.entity.*;
import com.clarity.ehr.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/patients/{patientId}")
@RequiredArgsConstructor
public class ClinicalController {

    private final AllergyRepository allergyRepository;
    private final ProblemRepository problemRepository;
    private final VitalRepository vitalRepository;
    private final MedicationRepository medicationRepository;
    private final EncounterRepository encounterRepository;

    // ─── Allergies ───
    @GetMapping("/allergies")
    public ResponseEntity<?> getAllergies(@PathVariable String patientId) {
        return ResponseEntity.ok(allergyRepository.findByPatientIdOrderByCreatedAtDesc(patientId));
    }

    @PostMapping("/allergies")
    public ResponseEntity<?> addAllergy(@PathVariable String patientId, @RequestBody Map<String, String> body) {
        Allergy a = Allergy.builder()
                .id(UUID.randomUUID().toString())
                .patientId(patientId)
                .allergen(body.get("allergen"))
                .type(body.getOrDefault("type", "Medication"))
                .reaction(body.getOrDefault("reaction", ""))
                .severity(body.getOrDefault("severity", ""))
                .status("Active")
                .onsetDate(body.getOrDefault("onsetDate", ""))
                .source(body.getOrDefault("source", "Patient Reported"))
                .build();
        allergyRepository.save(a);
        return ResponseEntity.status(201).body(a);
    }

    // ─── Problems ───
    @GetMapping("/problems")
    public ResponseEntity<?> getProblems(@PathVariable String patientId) {
        return ResponseEntity.ok(problemRepository.findByPatientIdOrderByCreatedAtDesc(patientId));
    }

    @PostMapping("/problems")
    public ResponseEntity<?> addProblem(@PathVariable String patientId, @RequestBody Map<String, String> body) {
        Problem p = Problem.builder()
                .id(UUID.randomUUID().toString())
                .patientId(patientId)
                .code(body.get("code"))
                .description(body.get("description"))
                .status(body.getOrDefault("status", "Active"))
                .onsetDate(body.getOrDefault("onsetDate", ""))
                .diagnosedBy(body.getOrDefault("diagnosedBy", ""))
                .build();
        problemRepository.save(p);
        return ResponseEntity.status(201).body(p);
    }

    // ─── Vitals ───
    @GetMapping("/vitals")
    public ResponseEntity<?> getVitals(@PathVariable String patientId) {
        return ResponseEntity.ok(vitalRepository.findByPatientIdOrderByDateDesc(patientId));
    }

    @PostMapping("/vitals")
    public ResponseEntity<?> addVital(@PathVariable String patientId, @RequestBody Map<String, Object> body) {
        Vital v = Vital.builder()
                .id(UUID.randomUUID().toString())
                .patientId(patientId)
                .date(LocalDate.parse((String) body.get("date")))
                .time((String) body.get("time"))
                .bp((String) body.getOrDefault("bp", ""))
                .hr(body.get("hr") != null ? ((Number) body.get("hr")).intValue() : null)
                .rr(body.get("rr") != null ? ((Number) body.get("rr")).intValue() : null)
                .temp(body.get("temp") != null ? ((Number) body.get("temp")).doubleValue() : null)
                .spo2(body.get("spo2") != null ? ((Number) body.get("spo2")).doubleValue() : null)
                .weight(body.get("weight") != null ? ((Number) body.get("weight")).doubleValue() : null)
                .height(body.get("height") != null ? ((Number) body.get("height")).doubleValue() : null)
                .bmi(body.get("bmi") != null ? ((Number) body.get("bmi")).doubleValue() : null)
                .pain(body.get("pain") != null ? ((Number) body.get("pain")).intValue() : null)
                .takenBy((String) body.getOrDefault("takenBy", ""))
                .build();
        vitalRepository.save(v);
        return ResponseEntity.status(201).body(v);
    }

    // ─── Medications ───
    @GetMapping("/medications")
    public ResponseEntity<?> getMedications(@PathVariable String patientId) {
        return ResponseEntity.ok(medicationRepository.findByPatientIdOrderByCreatedAtDesc(patientId));
    }

    @PostMapping("/medications")
    public ResponseEntity<?> addMedication(@PathVariable String patientId, @RequestBody Map<String, Object> body) {
        Medication m = Medication.builder()
                .id(UUID.randomUUID().toString())
                .patientId(patientId)
                .name((String) body.get("name"))
                .dose((String) body.getOrDefault("dose", ""))
                .route((String) body.getOrDefault("route", "Oral"))
                .frequency((String) body.getOrDefault("frequency", ""))
                .startDate((String) body.getOrDefault("startDate", ""))
                .prescriber((String) body.getOrDefault("prescriber", ""))
                .status("Active")
                .refillsLeft(body.get("refillsLeft") != null ? ((Number) body.get("refillsLeft")).intValue() : 0)
                .isControlled(Boolean.TRUE.equals(body.get("isControlled")))
                .schedule((String) body.get("schedule"))
                .pharmacy((String) body.getOrDefault("pharmacy", ""))
                .sig((String) body.getOrDefault("sig", ""))
                .build();
        medicationRepository.save(m);
        return ResponseEntity.status(201).body(m);
    }

    // ─── Encounters ───
    @GetMapping("/encounters")
    public ResponseEntity<?> getEncounters(@PathVariable String patientId) {
        return ResponseEntity.ok(encounterRepository.findByPatientIdOrderByDateDesc(patientId));
    }

    @PostMapping("/encounters")
    public ResponseEntity<?> addEncounter(@PathVariable String patientId, @RequestBody Map<String, Object> body) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            String medicationOrdersJson = null;
            String labOrdersJson = null;

            if (body.containsKey("medicationOrders") && body.get("medicationOrders") != null) {
                medicationOrdersJson = mapper.writeValueAsString(body.get("medicationOrders"));
            }
            if (body.containsKey("labOrders") && body.get("labOrders") != null) {
                labOrdersJson = mapper.writeValueAsString(body.get("labOrders"));
            }

            Encounter e = Encounter.builder()
                    .id(UUID.randomUUID().toString())
                    .patientId(patientId)
                    .date(LocalDate.parse((String) body.get("date")))
                    .time((String) body.getOrDefault("time", ""))
                    .provider((String) body.getOrDefault("provider", ""))
                    .providerName((String) body.getOrDefault("providerName", ""))
                    .credentials((String) body.getOrDefault("credentials", ""))
                    .visitType((String) body.getOrDefault("visitType", ""))
                    .cptCode((String) body.getOrDefault("cptCode", ""))
                    .icdCode((String) body.getOrDefault("icdCode", ""))
                    .reason((String) body.getOrDefault("reason", ""))
                    .duration((String) body.getOrDefault("duration", ""))
                    .chiefComplaint((String) body.getOrDefault("chiefComplaint", ""))
                    .hpi((String) body.getOrDefault("hpi", ""))
                    .assessment((String) body.getOrDefault("assessment", ""))
                    .plan((String) body.getOrDefault("plan", ""))
                    .safetySiLevel((String) body.getOrDefault("safetySiLevel", "None"))
                    .safetyHiLevel((String) body.getOrDefault("safetyHiLevel", "None"))
                    .medicationOrders(medicationOrdersJson)
                    .labOrders(labOrdersJson)
                    .build();
            encounterRepository.save(e);
            return ResponseEntity.status(201).body(e);
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", "Failed to save encounter: " + e.getMessage()));
        }
    }

    @PutMapping("/encounters/{encounterId}")
    public ResponseEntity<?> updateEncounter(@PathVariable String patientId, @PathVariable String encounterId, @RequestBody Map<String, Object> body) {
        try {
            return encounterRepository.findById(encounterId).map(existing -> {
                ObjectMapper mapper = new ObjectMapper();

                if (body.containsKey("date")) existing.setDate(LocalDate.parse((String) body.get("date")));
                if (body.containsKey("time")) existing.setTime((String) body.get("time"));
                if (body.containsKey("provider")) existing.setProvider((String) body.get("provider"));
                if (body.containsKey("providerName")) existing.setProviderName((String) body.get("providerName"));
                if (body.containsKey("credentials")) existing.setCredentials((String) body.get("credentials"));
                if (body.containsKey("visitType")) existing.setVisitType((String) body.get("visitType"));
                if (body.containsKey("cptCode")) existing.setCptCode((String) body.get("cptCode"));
                if (body.containsKey("icdCode")) existing.setIcdCode((String) body.get("icdCode"));
                if (body.containsKey("reason")) existing.setReason((String) body.get("reason"));
                if (body.containsKey("duration")) existing.setDuration((String) body.get("duration"));
                if (body.containsKey("chiefComplaint")) existing.setChiefComplaint((String) body.get("chiefComplaint"));
                if (body.containsKey("hpi")) existing.setHpi((String) body.get("hpi"));
                if (body.containsKey("assessment")) existing.setAssessment((String) body.get("assessment"));
                if (body.containsKey("plan")) existing.setPlan((String) body.get("plan"));
                if (body.containsKey("safetySiLevel")) existing.setSafetySiLevel((String) body.get("safetySiLevel"));
                if (body.containsKey("safetyHiLevel")) existing.setSafetyHiLevel((String) body.get("safetyHiLevel"));

                if (body.containsKey("medicationOrders") && body.get("medicationOrders") != null) {
                    try {
                        existing.setMedicationOrders(mapper.writeValueAsString(body.get("medicationOrders")));
                    } catch (Exception ex) {
                        // Keep existing value if conversion fails
                    }
                }
                if (body.containsKey("labOrders") && body.get("labOrders") != null) {
                    try {
                        existing.setLabOrders(mapper.writeValueAsString(body.get("labOrders")));
                    } catch (Exception ex) {
                        // Keep existing value if conversion fails
                    }
                }

                encounterRepository.save(existing);
                return ResponseEntity.ok(existing);
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", "Failed to update encounter: " + e.getMessage()));
        }
    }
}
