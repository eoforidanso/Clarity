package com.clarity.ehr.repository;

import com.clarity.ehr.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AllergyRepository extends JpaRepository<Allergy, String> {
    List<Allergy> findByPatientIdOrderByCreatedAtDesc(String patientId);
}
