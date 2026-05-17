package com.clarity.ehr.repository;

import com.clarity.ehr.entity.MedicationDatabase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MedicationDatabaseRepository extends JpaRepository<MedicationDatabase, String> {
    List<MedicationDatabase> findByNameContainingIgnoreCase(String search);
}
