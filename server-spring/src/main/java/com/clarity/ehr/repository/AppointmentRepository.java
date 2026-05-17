package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, String> {
    List<Appointment> findByDateBetweenOrderByDateAscTimeAsc(LocalDate start, LocalDate end);
    List<Appointment> findByProviderAndDateBetweenOrderByTimeAsc(String provider, LocalDate start, LocalDate end);
    List<Appointment> findByPatientIdOrderByDateDesc(String patientId);
}
