package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MedicationRepository extends JpaRepository<Medication, String> {
    List<Medication> findByPatientIdOrderByCreatedAtDesc(String patientId);
}
