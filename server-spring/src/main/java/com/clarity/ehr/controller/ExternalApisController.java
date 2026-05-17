package com.clarity.ehr.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Proxy controller for external API calls (RxNorm, ICD-10, OpenFDA).
 * Avoids CORS issues from browser-direct calls.
 */
@RestController
@RequestMapping("/api/external")
@RequiredArgsConstructor
public class ExternalApisController {

    private final RestTemplate restTemplate = new RestTemplate();

    // ─── RxNorm ──────────────────────────────
    @GetMapping("/rxnorm/drugs")
    public ResponseEntity<?> searchDrugs(@RequestParam String search) {
        String url = "https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term="
                + java.net.URLEncoder.encode(search, java.nio.charset.StandardCharsets.UTF_8)
                + "&maxEntries=15";
        try {
            String result = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "RxNorm API unavailable"));
        }
    }

    @GetMapping("/rxnorm/strengths/{rxcui}")
    public ResponseEntity<?> getStrengths(@PathVariable String rxcui) {
        String url = "https://rxnav.nlm.nih.gov/REST/rxcui/" + rxcui + "/related.json?tty=SCD+SBD";
        try {
            String result = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "RxNorm API unavailable"));
        }
    }

    @GetMapping("/rxnorm/interactions")
    public ResponseEntity<?> checkInteractions(@RequestParam String rxcuis) {
        String url = "https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=" + rxcuis;
        try {
            String result = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "RxNorm Interaction API unavailable"));
        }
    }

    // ─── ICD-10 ──────────────────────────────
    @GetMapping("/icd10/search")
    public ResponseEntity<?> searchIcd10(@RequestParam String search) {
        String url = "https://clinicaltables.nlm.nih.gov/api/icd10cm/v3/search?sf=code,name&terms="
                + java.net.URLEncoder.encode(search, java.nio.charset.StandardCharsets.UTF_8) + "&maxList=25";
        try {
            String result = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "ICD-10 API unavailable"));
        }
    }

    // ─── OpenFDA ─────────────────────────────
    @GetMapping("/openfda/drug-label")
    public ResponseEntity<?> drugLabel(@RequestParam String search) {
        String url = "https://api.fda.gov/drug/label.json?search="
                + java.net.URLEncoder.encode(search, java.nio.charset.StandardCharsets.UTF_8) + "&limit=5";
        try {
            String result = restTemplate.getForObject(url, String.class);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "OpenFDA API unavailable"));
        }
    }
}
