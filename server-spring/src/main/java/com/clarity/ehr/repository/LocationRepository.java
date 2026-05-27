package com.clarity.ehr.repository;

import com.clarity.ehr.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LocationRepository extends JpaRepository<Location, String> {
    List<Location> findByStatusOrderBySortOrderAscNameAsc(String status);
}
