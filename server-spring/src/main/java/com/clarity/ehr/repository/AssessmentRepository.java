package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AssessmentRepository extends JpaRepository<Assessment, String> {
    List<Assessment> findByPatientIdOrderByDateDesc(String patientId);
}
