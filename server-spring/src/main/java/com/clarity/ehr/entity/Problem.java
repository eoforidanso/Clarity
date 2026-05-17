package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "problems")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Problem {
    @Id private String id;
    @Column(name = "patient_id", nullable = false) private String patientId;
    @Column(nullable = false) private String code;
    @Column(nullable = false) private String description;
    private String status;
    @Column(name = "onset_date") private String onsetDate;
    @Column(name = "diagnosed_by") private String diagnosedBy;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); }
}
