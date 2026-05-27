package com.clarity.ehr.controller;

import com.clarity.ehr.entity.Location;
import com.clarity.ehr.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationRepository locationRepository;

    @GetMapping
    public ResponseEntity<?> list() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Location loc : locationRepository.findByStatusOrderBySortOrderAscNameAsc("Active")) {
            result.add(toMap(loc));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        return locationRepository.findById(id)
                .map(loc -> ResponseEntity.ok((Object) toMap(loc)))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "Location not found")));
    }

    private Map<String, Object> toMap(Location loc) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", loc.getId());
        m.put("name", loc.getName());
        m.put("shortName", loc.getShortName() != null ? loc.getShortName() : loc.getName());
        m.put("short_name", loc.getShortName() != null ? loc.getShortName() : loc.getName());
        m.put("address", nullSafe(loc.getAddress()));
        m.put("phone", nullSafe(loc.getPhone()));
        m.put("fax", nullSafe(loc.getFax()));
        m.put("hours", nullSafe(loc.getHours()));
        m.put("type", nullSafe(loc.getType()));
        m.put("status", nullSafe(loc.getStatus()));
        m.put("npi", nullSafe(loc.getNpi()));
        m.put("taxId", nullSafe(loc.getTaxId()));
        m.put("placeOfService", nullSafe(loc.getPlaceOfService()));
        m.put("rooms", loc.getRooms() != null ? loc.getRooms() : 0);
        m.put("telehealth", loc.getTelehealth() != null ? loc.getTelehealth() : 0);
        return m;
    }

    private static String nullSafe(String s) { return s == null ? "" : s; }
}
