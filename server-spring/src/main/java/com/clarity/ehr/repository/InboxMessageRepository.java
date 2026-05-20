package com.clarity.ehr.repository;

import com.clarity.ehr.entity.InboxMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InboxMessageRepository extends JpaRepository<InboxMessage, String> {
    List<InboxMessage> findByUserIdOrderByCreatedAtDesc(String userId);
}
