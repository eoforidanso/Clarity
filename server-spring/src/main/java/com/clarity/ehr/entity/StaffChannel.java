package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "staff_channels") @Data @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffChannel {
    @Id private String id;
    private String name;
    private String type;
    @Column(name = "created_at") private Instant createdAt;
    @PrePersist void onCreate() { createdAt = Instant.now(); }
}
