package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "vitals")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Vital {
    @Id private String id;
    @Column(name = "patient_id", nullable = false) private String patientId;
    @Column(nullable = false) private LocalDate date;
    @Column(nullable = false) private String time;
    private String bp;
    private Integer hr;
    private Integer rr;
    private Double temp;
    private Double spo2;
    private Double weight;
    private Double height;
    private Double bmi;
    private Integer pain;
    @Column(name = "taken_by") private String takenBy;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @PrePersist void prePersist() { createdAt = LocalDateTime.now(); }
}
