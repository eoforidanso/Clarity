package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "smart_phrases")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SmartPhrase {
    @Id private String id;
    @Column(name = "trigger_text", unique = true, nullable = false) private String triggerText;
    @Column(nullable = false) private String name;
    private String category;
    @Column(columnDefinition = "text", nullable = false) private String content;
    @Column(name = "created_by") private String createdBy;
    @Column(name = "created_at") private LocalDateTime createdAt;
    @Column(name = "updated_at") private LocalDateTime updatedAt;
    @PrePersist void prePersist() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate void preUpdate() { updatedAt = LocalDateTime.now(); }
}
