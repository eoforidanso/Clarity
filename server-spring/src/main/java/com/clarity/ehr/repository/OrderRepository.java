package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, String> {
    List<Order> findByPatientIdOrderByCreatedAtDesc(String patientId);
}
