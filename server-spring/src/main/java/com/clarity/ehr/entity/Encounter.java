package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "encounters")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Encounter {
    @Id private String id;
    @Column(name = "patient_id", nullable = false) private String patientId;
    @Column(nullable = false) private LocalDate date;
    private String time;
    private String provider;
    @Column(name = "provider_name") private String providerName;
    private String credentials;
    @Column(name = "visit_type") private String visitType;
    @Column(name = "cpt_code") private String cptCode;
    @Column(name = "icd_code") private String icdCode;
    private String reason;
    private String duration;
    @Column(name = "chief_complaint", columnDefinition = "text") private String chiefComplaint;
    @Column(columnDefinition = "text") private String hpi;
    @Column(name = "interval_note", columnDefinition = "text") private String intervalNote;
    @Column(columnDefinition = "text") private String mse;
    @Column(columnDefinition = "text") private String assessment;
    @Column(columnDefinition = "text") private String plan;
    @Column(name = "safety_si_level") private String safetySiLevel;
    @Column(name = "safety_hi_level") private String safetyHiLevel;
    @Column(name = "safety_self_harm") private Boolean safetySelfHarm;
    @Column(name = "safety_substance_use") private Boolean safetySubstanceUse;
    @Column(name = "safety_plan_updated") private Boolean safetyPlanUpdated;
    @Column(name = "safety_crisis_resources") private Boolean safetyCrisisResources;
    @Column(name = "safety_notes", columnDefinition = "text") private String safetyNotes;
    @Column(name = "follow_up") private String followUp;
    private String disposition;
    @Column(name = "medication_orders", columnDefinition = "jsonb") private String medicationOrders;
    @Column(name = "lab_orders", columnDefinition = "jsonb") private String labOrders;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;
    @PrePersist void prePersist() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }
}
