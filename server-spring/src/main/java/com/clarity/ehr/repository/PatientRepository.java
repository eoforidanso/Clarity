package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface PatientRepository extends JpaRepository<Patient, String> {
    List<Patient> findByIsActiveOrderByLastNameAscFirstNameAsc(Boolean isActive);

    @Query("SELECT p FROM Patient p WHERE " +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(p.mrn) LIKE LOWER(CONCAT('%',:search,'%')) OR " +
           "LOWER(p.email) LIKE LOWER(CONCAT('%',:search,'%')) " +
           "ORDER BY p.lastName, p.firstName")
    List<Patient> search(String search);

    List<Patient> findAllByOrderByLastNameAscFirstNameAsc();
}
