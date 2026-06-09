package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "patients")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Patient {
    @Id
    private String id;

    @Column(unique = true, nullable = false)
    private String mrn;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(nullable = false)
    private LocalDate dob;

    @Column(nullable = false)
    private String gender;

    private String pronouns;
    private String ssn;
    private String race;
    private String ethnicity;
    private String language;

    @Column(name = "marital_status")
    private String maritalStatus;

    private String phone;

    @Column(name = "cell_phone")
    private String cellPhone;

    private String email;

    @Column(name = "address_street")
    private String addressStreet;

    @Column(name = "address_city")
    private String addressCity;

    @Column(name = "address_state")
    private String addressState;

    @Column(name = "address_zip")
    private String addressZip;

    @Column(name = "emergency_contact_name")
    private String emergencyContactName;

    @Column(name = "emergency_contact_relationship")
    private String emergencyContactRelationship;

    @Column(name = "emergency_contact_phone")
    private String emergencyContactPhone;

    @Column(name = "insurance_primary_name")
    private String insurancePrimaryName;

    @Column(name = "insurance_primary_member_id")
    private String insurancePrimaryMemberId;

    @Column(name = "insurance_primary_group_number")
    private String insurancePrimaryGroupNumber;

    @Column(name = "insurance_primary_copay")
    private Double insurancePrimaryCopay;

    @Column(name = "insurance_secondary_name")
    private String insuranceSecondaryName;

    @Column(name = "insurance_secondary_member_id")
    private String insuranceSecondaryMemberId;

    @Column(name = "insurance_secondary_group_number")
    private String insuranceSecondaryGroupNumber;

    @Column(name = "insurance_secondary_copay")
    private Double insuranceSecondaryCopay;

    private String pcp;

    @Column(name = "assigned_provider")
    private String assignedProvider;

    @Column(name = "location_id")
    private String locationId;

    @Column(columnDefinition = "text")
    private String photo;

    @Column(name = "is_btg")
    private Boolean isBtg;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "last_visit")
    private LocalDate lastVisit;

    @Column(name = "next_appointment")
    private LocalDate nextAppointment;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private List<String> flags;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        createdAt = updatedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
        if (isBtg == null) isBtg = false;
        if (flags == null) flags = List.of();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
