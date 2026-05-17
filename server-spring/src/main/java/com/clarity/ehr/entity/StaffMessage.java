package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "staff_messages") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffMessage {
    @Id private String id;
    @Column(name = "channel_id") private String channelId;
    @Column(name = "sender_id") private String senderId;
    @Column(name = "sender_name") private String senderName;
    @Column(columnDefinition = "TEXT") private String content;
    @Column(name = "created_at") private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
