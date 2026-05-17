package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "inbox_messages") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class InboxMessage {
    @Id private String id;
    @Column(name = "user_id") private String userId;
    private String type;
    private String priority;
    private String subject;
    @Column(name = "from_name") private String fromName;
    @Column(name = "patient_name") private String patientName;
    @Column(name = "patient_id") private String patientId;
    private String preview;
    @Column(columnDefinition = "TEXT") private String body;
    @Column(name = "is_read") private Boolean isRead;
    @Column(name = "is_starred") private Boolean isStarred;
    @Column(name = "is_archived") private Boolean isArchived;
    private String date;
    @Column(name = "created_at") private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
