package com.clarity.ehr.controller;

import com.clarity.ehr.entity.Patient;
import com.clarity.ehr.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.Period;
import java.util.*;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientRepository patientRepository;

    @GetMapping
    public ResponseEntity<?> getAll(@RequestParam(required = false) String search,
                                     @RequestParam(required = false) String active) {
        List<Patient> patients;
        if (search != null && !search.isBlank()) {
            patients = patientRepository.search(search);
        } else if (active != null) {
            patients = patientRepository.findByIsActiveOrderByLastNameAscFirstNameAsc("true".equals(active));
        } else {
            patients = patientRepository.findAllByOrderByLastNameAscFirstNameAsc();
        }
        return ResponseEntity.ok(patients.stream().map(this::toDto).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        return patientRepository.findById(id)
                .map(p -> ResponseEntity.ok(toDto(p)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String id = UUID.randomUUID().toString();
        String mrn = "MRN-" + String.valueOf(System.currentTimeMillis()).substring(8);

        Patient p = Patient.builder()
                .id(id).mrn(mrn)
                .firstName((String) body.get("firstName"))
                .lastName((String) body.get("lastName"))
                .dob(LocalDate.parse((String) body.get("dob")))
                .gender((String) body.get("gender"))
                .pronouns((String) body.getOrDefault("pronouns", ""))
                .email((String) body.getOrDefault("email", ""))
                .phone((String) body.getOrDefault("phone", ""))
                .language((String) body.getOrDefault("language", "English"))
                .isActive(true).isBtg(false).flags(List.of())
                .build();

        patientRepository.save(p);
        return ResponseEntity.status(201).body(toDto(p));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return patientRepository.findById(id).map(existing -> {
            if (body.containsKey("firstName")) existing.setFirstName((String) body.get("firstName"));
            if (body.containsKey("lastName")) existing.setLastName((String) body.get("lastName"));
            if (body.containsKey("dob")) existing.setDob(LocalDate.parse((String) body.get("dob")));
            if (body.containsKey("gender")) existing.setGender((String) body.get("gender"));
            if (body.containsKey("pronouns")) existing.setPronouns((String) body.get("pronouns"));
            if (body.containsKey("email")) existing.setEmail((String) body.get("email"));
            if (body.containsKey("phone")) existing.setPhone((String) body.get("phone"));
            if (body.containsKey("cellPhone")) existing.setCellPhone((String) body.get("cellPhone"));
            if (body.containsKey("language")) existing.setLanguage((String) body.get("language"));
            if (body.containsKey("pcp")) existing.setPcp((String) body.get("pcp"));
            patientRepository.save(existing);
            return ResponseEntity.ok(toDto(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> toDto(Patient p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", p.getId());
        map.put("mrn", p.getMrn());
        map.put("firstName", p.getFirstName());
        map.put("lastName", p.getLastName());
        map.put("dob", p.getDob() != null ? p.getDob().toString() : null);
        map.put("age", p.getDob() != null ? Period.between(p.getDob(), LocalDate.now()).getYears() : null);
        map.put("gender", p.getGender());
        map.put("pronouns", p.getPronouns());
        map.put("ssn", p.getSsn());
        map.put("race", p.getRace());
        map.put("ethnicity", p.getEthnicity());
        map.put("language", p.getLanguage());
        map.put("maritalStatus", p.getMaritalStatus());
        map.put("phone", p.getPhone());
        map.put("cellPhone", p.getCellPhone());
        map.put("email", p.getEmail());
        map.put("address", Map.of(
                "street", p.getAddressStreet() != null ? p.getAddressStreet() : "",
                "city", p.getAddressCity() != null ? p.getAddressCity() : "",
                "state", p.getAddressState() != null ? p.getAddressState() : "",
                "zip", p.getAddressZip() != null ? p.getAddressZip() : ""
        ));
        map.put("emergencyContact", Map.of(
                "name", p.getEmergencyContactName() != null ? p.getEmergencyContactName() : "",
                "relationship", p.getEmergencyContactRelationship() != null ? p.getEmergencyContactRelationship() : "",
                "phone", p.getEmergencyContactPhone() != null ? p.getEmergencyContactPhone() : ""
        ));
        Map<String, Object> insurance = new LinkedHashMap<>();
        insurance.put("primary", Map.of(
                "name", p.getInsurancePrimaryName() != null ? p.getInsurancePrimaryName() : "",
                "memberId", p.getInsurancePrimaryMemberId() != null ? p.getInsurancePrimaryMemberId() : "",
                "groupNumber", p.getInsurancePrimaryGroupNumber() != null ? p.getInsurancePrimaryGroupNumber() : "",
                "copay", p.getInsurancePrimaryCopay() != null ? p.getInsurancePrimaryCopay() : 0
        ));
        insurance.put("secondary", p.getInsuranceSecondaryName() != null ? Map.of(
                "name", p.getInsuranceSecondaryName(),
                "memberId", p.getInsuranceSecondaryMemberId() != null ? p.getInsuranceSecondaryMemberId() : "",
                "groupNumber", p.getInsuranceSecondaryGroupNumber() != null ? p.getInsuranceSecondaryGroupNumber() : "",
                "copay", p.getInsuranceSecondaryCopay() != null ? p.getInsuranceSecondaryCopay() : 0
        ) : null);
        map.put("insurance", insurance);
        map.put("pcp", p.getPcp());
        map.put("assignedProvider", p.getAssignedProvider());
        map.put("photo", p.getPhoto());
        map.put("isBTG", p.getIsBtg());
        map.put("isActive", p.getIsActive());
        map.put("lastVisit", p.getLastVisit() != null ? p.getLastVisit().toString() : null);
        map.put("nextAppointment", p.getNextAppointment() != null ? p.getNextAppointment().toString() : null);
        map.put("flags", p.getFlags() != null ? p.getFlags() : List.of());
        return map;
    }
}
