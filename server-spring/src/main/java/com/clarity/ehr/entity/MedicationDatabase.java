package com.clarity.ehr.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Table(name = "medication_database")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicationDatabase {
    @Id private String id;
    @Column(nullable = false) private String name;
    @Column(name = "class") private String medClass;
    @JdbcTypeCode(SqlTypes.JSON) private String doses;
    @JdbcTypeCode(SqlTypes.JSON) private String routes;
    @Column(name = "is_controlled") private Boolean isControlled;
    private String schedule;
}
