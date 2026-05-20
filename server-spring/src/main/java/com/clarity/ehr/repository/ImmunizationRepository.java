package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Immunization;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ImmunizationRepository extends JpaRepository<Immunization, String> {
    List<Immunization> findByPatientIdOrderByCreatedAtDesc(String patientId);
}
