package com.clarity.ehr.controller;

import com.clarity.ehr.entity.Appointment;
import com.clarity.ehr.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentRepository appointmentRepository;

    @GetMapping
    public ResponseEntity<?> getAll(@RequestParam(required = false) String start,
                                     @RequestParam(required = false) String end,
                                     @RequestParam(required = false) String provider) {
        LocalDate startDate = start != null ? LocalDate.parse(start) : LocalDate.now().minusMonths(1);
        LocalDate endDate = end != null ? LocalDate.parse(end) : LocalDate.now().plusMonths(1);

        List<Appointment> appointments;
        if (provider != null && !provider.isBlank()) {
            appointments = appointmentRepository.findByProviderAndDateBetweenOrderByTimeAsc(provider, startDate, endDate);
        } else {
            appointments = appointmentRepository.findByDateBetweenOrderByDateAscTimeAsc(startDate, endDate);
        }
        return ResponseEntity.ok(appointments);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        Appointment a = Appointment.builder()
                .id(UUID.randomUUID().toString())
                .patientId((String) body.get("patientId"))
                .patientName((String) body.getOrDefault("patientName", ""))
                .provider((String) body.getOrDefault("provider", ""))
                .providerName((String) body.getOrDefault("providerName", ""))
                .date(LocalDate.parse((String) body.get("date")))
                .time((String) body.get("time"))
                .duration(body.get("duration") != null ? ((Number) body.get("duration")).intValue() : 30)
                .type((String) body.getOrDefault("type", "Office Visit"))
                .status("Scheduled")
                .reason((String) body.getOrDefault("reason", ""))
                .visitType((String) body.getOrDefault("visitType", "In-Person"))
                .room((String) body.getOrDefault("room", ""))
                .build();
        appointmentRepository.save(a);
        return ResponseEntity.status(201).body(a);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return appointmentRepository.findById(id).map(existing -> {
            if (body.containsKey("status")) existing.setStatus((String) body.get("status"));
            if (body.containsKey("date")) existing.setDate(LocalDate.parse((String) body.get("date")));
            if (body.containsKey("time")) existing.setTime((String) body.get("time"));
            if (body.containsKey("room")) existing.setRoom((String) body.get("room"));
            if (body.containsKey("reason")) existing.setReason((String) body.get("reason"));
            if (body.containsKey("visitType")) existing.setVisitType((String) body.get("visitType"));
            appointmentRepository.save(existing);
            return ResponseEntity.ok(existing);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        appointmentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
