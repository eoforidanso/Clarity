package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name = "appointments")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Appointment {
    @Id private String id;
    @Column(name = "patient_id") private String patientId;
    @Column(name = "patient_name") private String patientName;
    private String provider;
    @Column(name = "provider_name") private String providerName;
    @Column(nullable = false) private LocalDate date;
    @Column(nullable = false) private String time;
    private Integer duration;
    private String type;
    private String status;
    private String reason;
    @Column(name = "visit_type") private String visitType;
    private String room;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;
    @PrePersist void prePersist() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }
}
