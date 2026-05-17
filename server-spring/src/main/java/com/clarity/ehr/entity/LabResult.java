package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "lab_results") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class LabResult {
    @Id private String id;
    @Column(name = "patient_id") private String patientId;
    @Column(name = "order_name") private String orderName;
    @Column(name = "order_date") private String orderDate;
    @Column(name = "result_date") private String resultDate;
    private String status;
    @Column(name = "ordering_provider") private String orderingProvider;
    private String priority;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;
    @PrePersist void onCreate() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
