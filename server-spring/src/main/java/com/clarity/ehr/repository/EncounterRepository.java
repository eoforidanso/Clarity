package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Encounter;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EncounterRepository extends JpaRepository<Encounter, String> {
    List<Encounter> findByPatientIdOrderByDateDesc(String patientId);
}
