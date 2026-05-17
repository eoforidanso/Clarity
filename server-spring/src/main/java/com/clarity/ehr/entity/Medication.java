package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "medications")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Medication {
    @Id private String id;
    @Column(name = "patient_id", nullable = false) private String patientId;
    @Column(nullable = false) private String name;
    private String dose;
    private String route;
    private String frequency;
    @Column(name = "start_date") private String startDate;
    private String prescriber;
    private String status;
    @Column(name = "refills_left") private Integer refillsLeft;
    @Column(name = "is_controlled") private Boolean isControlled;
    private String schedule;
    private String pharmacy;
    @Column(name = "last_filled") private String lastFilled;
    private String sig;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;
    @PrePersist void prePersist() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }
}
