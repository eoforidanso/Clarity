package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "orders") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Order {
    @Id private String id;
    @Column(name = "patient_id") private String patientId;
    @Column(name = "order_type") private String orderType;
    private String name;
    private String details;
    private String status;
    private String priority;
    @Column(name = "ordering_provider") private String orderingProvider;
    @Column(name = "order_date") private String orderDate;
    private String notes;
    @Column(name = "created_at") private Instant createdAt;
    @Column(name = "updated_at") private Instant updatedAt;
    @PrePersist void onCreate() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
