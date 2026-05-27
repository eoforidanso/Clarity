package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id
    private String id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(nullable = false)
    private String role;

    private String credentials;
    private String specialty;
    private String npi;

    @Column(name = "dea_number")
    private String deaNumber;

    @Column(nullable = false)
    private String email;

    @Column(name = "epcs_pin_hash")
    private String epcsPinHash;

    @Column(name = "two_factor_enabled")
    private Boolean twoFactorEnabled;

    @Column(name = "must_change_password")
    private Boolean mustChangePassword;

    @Column(name = "location_id")
    private String locationId;

    @Column(name = "patient_id")
    private String patientId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
