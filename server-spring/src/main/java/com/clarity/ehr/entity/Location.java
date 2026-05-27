package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "locations")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Location {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "short_name")
    private String shortName;

    private String address;
    private String phone;
    private String fax;
    private String hours;
    private String type;
    private String status;
    private String npi;

    @Column(name = "tax_id")
    private String taxId;

    @Column(name = "place_of_service")
    private String placeOfService;

    private Integer rooms;
    private Integer telehealth;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "created_at")
    private String createdAt;

    @Column(name = "updated_at")
    private String updatedAt;
}
