package com.clarity.ehr.repository;

import com.clarity.ehr.entity.SmartPhrase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SmartPhraseRepository extends JpaRepository<SmartPhrase, String> {
    List<SmartPhrase> findByCreatedByOrCreatedByIsNullOrderByTriggerText(String userId);
    List<SmartPhrase> findByCategoryIgnoreCaseOrderByTriggerText(String category);
    List<SmartPhrase> findAllByOrderByTriggerText();
}
