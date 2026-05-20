package com.clarity.ehr.repository;

import com.clarity.ehr.entity.LabResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LabResultRepository extends JpaRepository<LabResult, String> {
    List<LabResult> findByPatientIdOrderByResultDateDesc(String patientId);
}
