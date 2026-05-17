package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "allergies")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Allergy {
    @Id private String id;
    @Column(name = "patient_id", nullable = false) private String patientId;
    @Column(nullable = false) private String allergen;
    @Column(nullable = false) private String type;
    private String reaction;
    private String severity;
    private String status;
    @Column(name = "onset_date") private String onsetDate;
    private String source;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); }
}
