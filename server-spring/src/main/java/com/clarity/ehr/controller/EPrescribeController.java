package com.clarity.ehr.controller;

import com.clarity.ehr.entity.*;
import com.clarity.ehr.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/eprescribe")
@RequiredArgsConstructor
public class EPrescribeController {

    private final MedicationDatabaseRepository medDbRepo;
    private final MedicationRepository medicationRepo;
    private final OrderRepository orderRepo;
    private final InboxMessageRepository inboxRepo;

    @GetMapping("/medication-database")
    public ResponseEntity<?> searchMeds(@RequestParam String search) {
        if (search == null || search.length() < 2) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(medDbRepo.findByNameContainingIgnoreCase(search));
    }

    @PostMapping("/prescribe")
    public ResponseEntity<?> prescribe(@RequestBody Map<String, Object> body) {
        String patientId = (String) body.get("patientId");
        String medicationName = (String) body.get("medicationName");
        String dose = (String) body.getOrDefault("dose", "");
        String route = (String) body.getOrDefault("route", "Oral");
        String frequency = (String) body.getOrDefault("frequency", "");
        Integer refills = body.get("refills") != null ? ((Number) body.get("refills")).intValue() : 0;
        String pharmacy = (String) body.getOrDefault("pharmacy", "");
        String sig = (String) body.getOrDefault("sig", "");
        String prescriber = (String) body.getOrDefault("prescriber", "");
        Boolean isControlled = (Boolean) body.getOrDefault("isControlled", false);
        String schedule = (String) body.getOrDefault("schedule", "");

        Medication med = Medication.builder()
                .id(UUID.randomUUID().toString())
                .patientId(patientId)
                .name(medicationName)
                .dose(dose)
                .route(route)
                .frequency(frequency)
                .prescriber(prescriber)
                .status("Active")
                .refillsLeft(refills)
                .isControlled(isControlled)
                .schedule(schedule)
                .pharmacy(pharmacy)
                .sig(sig)
                .startDate(java.time.LocalDate.now().toString())
                .build();
        medicationRepo.save(med);

        Order order = Order.builder()
                .id(UUID.randomUUID().toString())
                .patientId(patientId)
                .orderType("Medication")
                .name(medicationName + " " + dose)
                .details("Prescribe: " + medicationName + " " + dose)
                .status("Signed")
                .priority("Routine")
                .orderingProvider(prescriber)
                .build();
        orderRepo.save(order);

        InboxMessage msg = InboxMessage.builder()
                .id(UUID.randomUUID().toString())
                .type("Rx Renewal")
                .subject("New Prescription: " + medicationName)
                .fromName(prescriber)
                .patientId(patientId)
                .patientName((String) body.getOrDefault("patientName", ""))
                .isRead(false)
                .build();
        inboxRepo.save(msg);

        return ResponseEntity.status(201).body(Map.of(
                "medication", med,
                "order", order,
                "message", "Prescription created successfully"
        ));
    }
}
