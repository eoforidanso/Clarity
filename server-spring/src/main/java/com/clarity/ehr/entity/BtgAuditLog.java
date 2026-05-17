package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "btg_audit_log") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BtgAuditLog {
    @Id private String id;
    @Column(name = "user_id") private String userId;
    @Column(name = "user_name") private String userName;
    @Column(name = "user_role") private String userRole;
    @Column(name = "patient_id") private String patientId;
    @Column(name = "patient_name") private String patientName;
    private String action;
    private String reason;
    @Column(name = "ip_address") private String ipAddress;
    @Column(name = "created_at") private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
