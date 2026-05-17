package com.clarity.ehr.controller;

import com.clarity.ehr.entity.SmartPhrase;
import com.clarity.ehr.repository.SmartPhraseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/smart-phrases")
@RequiredArgsConstructor
public class SmartPhrasesController {

    private final SmartPhraseRepository repo;

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String category) {
        if (category != null && !category.isEmpty()) {
            return ResponseEntity.ok(repo.findByCategoryIgnoreCaseOrderByTriggerText(category));
        }
        return ResponseEntity.ok(repo.findAllByOrderByTriggerText());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body) {
        SmartPhrase sp = SmartPhrase.builder()
                .id(UUID.randomUUID().toString())
                .triggerText(body.get("triggerText"))
                .name(body.get("name"))
                .category(body.getOrDefault("category", "Clinical"))
                .content(body.get("content"))
                .createdBy(body.get("createdBy"))
                .build();
        repo.save(sp);
        return ResponseEntity.status(201).body(sp);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, String> body) {
        return repo.findById(id).map(sp -> {
            if (body.containsKey("triggerText")) sp.setTriggerText(body.get("triggerText"));
            if (body.containsKey("name")) sp.setName(body.get("name"));
            if (body.containsKey("category")) sp.setCategory(body.get("category"));
            if (body.containsKey("content")) sp.setContent(body.get("content"));
            repo.save(sp);
            return ResponseEntity.ok(sp);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
