package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "immunizations") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Immunization {
    @Id private String id;
    @Column(name = "patient_id") private String patientId;
    private String vaccine;
    private String date;
    private String site;
    private String lot;
    @Column(name = "administered_by") private String administeredBy;
    private String notes;
    @Column(name = "created_at") private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
