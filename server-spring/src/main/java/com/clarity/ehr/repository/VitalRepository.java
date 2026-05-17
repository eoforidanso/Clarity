package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Vital;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VitalRepository extends JpaRepository<Vital, String> {
    List<Vital> findByPatientIdOrderByDateDesc(String patientId);
}
