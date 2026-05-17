package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Problem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProblemRepository extends JpaRepository<Problem, String> {
    List<Problem> findByPatientIdOrderByCreatedAtDesc(String patientId);
}
