package com.clarity.ehr.controller;

import com.clarity.ehr.entity.*;
import com.clarity.ehr.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * FHIR R4 read-only endpoints.
 * Maps internal EHR data to FHIR-like JSON resources.
 */
@RestController
@RequestMapping("/api/fhir")
@RequiredArgsConstructor
public class FhirController {

    private final PatientRepository patientRepo;
    private final EncounterRepository encounterRepo;
    private final VitalRepository vitalRepo;
    private final ProblemRepository problemRepo;
    private final MedicationRepository medRepo;
    private final AllergyRepository allergyRepo;

    @GetMapping("/metadata")
    public ResponseEntity<?> metadata() {
        return ResponseEntity.ok(Map.of(
                "resourceType", "CapabilityStatement",
                "status", "active",
                "fhirVersion", "4.0.1",
                "format", List.of("json"),
                "rest", List.of(Map.of("mode", "server",
                        "resource", List.of(
                                Map.of("type", "Patient"), Map.of("type", "Encounter"),
                                Map.of("type", "Observation"), Map.of("type", "Condition"),
                                Map.of("type", "MedicationStatement"), Map.of("type", "AllergyIntolerance")
                        )))
        ));
    }

    // ─── Patient ─────
    @GetMapping("/Patient")
    public ResponseEntity<?> searchPatients(@RequestParam(required = false) String name) {
        List<Patient> patients = (name != null) ? patientRepo.search(name) : patientRepo.findAll();
        return ResponseEntity.ok(bundle("Patient", patients.stream().map(this::toFhirPatient).collect(Collectors.toList())));
    }

    @GetMapping("/Patient/{id}")
    public ResponseEntity<?> getPatient(@PathVariable String id) {
        return patientRepo.findById(id).map(p -> ResponseEntity.ok(toFhirPatient(p))).orElse(ResponseEntity.notFound().build());
    }

    // ─── Encounter ───
    @GetMapping("/Encounter")
    public ResponseEntity<?> searchEncounters(@RequestParam(required = false) String patient) {
        List<Encounter> encs = (patient != null)
                ? encounterRepo.findByPatientIdOrderByDateDesc(patient)
                : encounterRepo.findAll();
        return ResponseEntity.ok(bundle("Encounter", encs.stream().map(this::toFhirEncounter).collect(Collectors.toList())));
    }

    @GetMapping("/Encounter/{id}")
    public ResponseEntity<?> getEncounter(@PathVariable String id) {
        return encounterRepo.findById(id).map(e -> ResponseEntity.ok(toFhirEncounter(e))).orElse(ResponseEntity.notFound().build());
    }

    // ─── Observation (vitals) ───
    @GetMapping("/Observation")
    public ResponseEntity<?> searchObservations(@RequestParam(required = false) String patient) {
        List<Vital> vitals = (patient != null) ? vitalRepo.findByPatientIdOrderByDateDesc(patient) : vitalRepo.findAll();
        return ResponseEntity.ok(bundle("Observation", vitals.stream().map(this::toFhirObservation).collect(Collectors.toList())));
    }

    // ─── Condition (problems) ───
    @GetMapping("/Condition")
    public ResponseEntity<?> searchConditions(@RequestParam(required = false) String patient) {
        List<Problem> problems = (patient != null)
                ? problemRepo.findByPatientIdOrderByCreatedAtDesc(patient)
                : problemRepo.findAll();
        return ResponseEntity.ok(bundle("Condition", problems.stream().map(this::toFhirCondition).collect(Collectors.toList())));
    }

    @GetMapping("/Condition/{id}")
    public ResponseEntity<?> getCondition(@PathVariable String id) {
        return problemRepo.findById(id).map(p -> ResponseEntity.ok(toFhirCondition(p))).orElse(ResponseEntity.notFound().build());
    }

    // ─── MedicationStatement ───
    @GetMapping("/MedicationStatement")
    public ResponseEntity<?> searchMedicationStatements(@RequestParam(required = false) String patient) {
        List<Medication> meds = (patient != null) ? medRepo.findByPatientIdOrderByCreatedAtDesc(patient) : medRepo.findAll();
        return ResponseEntity.ok(bundle("MedicationStatement", meds.stream().map(this::toFhirMedStatement).collect(Collectors.toList())));
    }

    // ─── AllergyIntolerance ───
    @GetMapping("/AllergyIntolerance")
    public ResponseEntity<?> searchAllergyIntolerances(@RequestParam(required = false) String patient) {
        List<Allergy> allergies = (patient != null)
                ? allergyRepo.findByPatientIdOrderByCreatedAtDesc(patient)
                : allergyRepo.findAll();
        return ResponseEntity.ok(bundle("AllergyIntolerance", allergies.stream().map(this::toFhirAllergy).collect(Collectors.toList())));
    }

    // ─── Mapping helpers ─────
    private Map<String, Object> bundle(String resourceType, List<Map<String, Object>> entries) {
        return Map.of("resourceType", "Bundle", "type", "searchset", "total", entries.size(),
                "entry", entries.stream().map(e -> Map.of("resource", e)).collect(Collectors.toList()));
    }

    private Map<String, Object> toFhirPatient(Patient p) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("resourceType", "Patient");
        r.put("id", p.getId());
        r.put("name", List.of(Map.of("family", p.getLastName(), "given", List.of(p.getFirstName()))));
        r.put("gender", p.getGender() != null ? p.getGender().toLowerCase() : "unknown");
        r.put("birthDate", p.getDob() != null ? p.getDob().toString() : null);
        r.put("identifier", List.of(Map.of("system", "urn:clarity:mrn", "value", p.getMrn())));
        return r;
    }

    private Map<String, Object> toFhirEncounter(Encounter e) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("resourceType", "Encounter");
        r.put("id", e.getId());
        r.put("status", "finished");
        r.put("subject", Map.of("reference", "Patient/" + e.getPatientId()));
        r.put("period", Map.of("start", e.getDate() != null ? e.getDate().toString() : ""));
        return r;
    }

    private Map<String, Object> toFhirObservation(Vital v) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("resourceType", "Observation");
        r.put("id", v.getId());
        r.put("status", "final");
        r.put("subject", Map.of("reference", "Patient/" + v.getPatientId()));
        r.put("effectiveDateTime", v.getDate() != null ? v.getDate().toString() : "");
        Map<String, Object> vals = new LinkedHashMap<>();
        if (v.getBp() != null) vals.put("bloodPressure", v.getBp());
        if (v.getHr() != null) vals.put("heartRate", v.getHr());
        if (v.getTemp() != null) vals.put("temperature", v.getTemp());
        if (v.getSpo2() != null) vals.put("oxygenSaturation", v.getSpo2());
        r.put("valueQuantity", vals);
        return r;
    }

    private Map<String, Object> toFhirCondition(Problem p) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("resourceType", "Condition");
        r.put("id", p.getId());
        r.put("clinicalStatus", Map.of("coding", List.of(Map.of("code", p.getStatus() != null ? p.getStatus().toLowerCase() : "active"))));
        r.put("code", Map.of("coding", List.of(Map.of("system", "http://hl7.org/fhir/sid/icd-10-cm", "code", p.getCode(), "display", p.getDescription()))));
        r.put("subject", Map.of("reference", "Patient/" + p.getPatientId()));
        return r;
    }

    private Map<String, Object> toFhirMedStatement(Medication m) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("resourceType", "MedicationStatement");
        r.put("id", m.getId());
        r.put("status", m.getStatus() != null ? m.getStatus().toLowerCase() : "active");
        r.put("medicationCodeableConcept", Map.of("text", m.getName()));
        r.put("subject", Map.of("reference", "Patient/" + m.getPatientId()));
        r.put("dosage", List.of(Map.of("text", (m.getDose() != null ? m.getDose() : "") + " " + (m.getFrequency() != null ? m.getFrequency() : ""))));
        return r;
    }

    private Map<String, Object> toFhirAllergy(Allergy a) {
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("resourceType", "AllergyIntolerance");
        r.put("id", a.getId());
        r.put("clinicalStatus", Map.of("coding", List.of(Map.of("code", "active"))));
        r.put("code", Map.of("text", a.getAllergen()));
        r.put("patient", Map.of("reference", "Patient/" + a.getPatientId()));
        if (a.getReaction() != null) r.put("reaction", List.of(Map.of("description", a.getReaction())));
        return r;
    }
}
