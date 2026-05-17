package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity @Table(name = "assessments") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Assessment {
    @Id private String id;
    @Column(name = "patient_id") private String patientId;
    private String type;
    private Integer score;
    private String severity;
    private LocalDate date;
    @Column(name = "administered_by") private String administeredBy;
    @Column(columnDefinition = "TEXT") private String responses;
    private String notes;
    @Column(name = "created_at") private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
