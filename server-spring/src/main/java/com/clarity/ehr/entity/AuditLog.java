package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "audit_log")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id private String id;
    private LocalDateTime timestamp;
    @Column(name = "user_id") private String userId;
    @Column(name = "user_name") private String userName;
    @Column(name = "user_role") private String userRole;
    @Column(nullable = false) private String action;
    @Column(name = "resource_type", nullable = false) private String resourceType;
    @Column(name = "resource_id") private String resourceId;
    @Column(name = "patient_id") private String patientId;
    @Column(name = "patient_name") private String patientName;
    @Column(columnDefinition = "text") private String details;
    @Column(name = "ip_address") private String ipAddress;
    @Column(name = "user_agent", columnDefinition = "text") private String userAgent;
    @Column(name = "session_id") private String sessionId;
    @PrePersist void prePersist() { if (timestamp == null) timestamp = LocalDateTime.now(); }
}
