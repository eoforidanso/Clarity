package com.clarity.ehr.controller;

import com.clarity.ehr.entity.Location;
import com.clarity.ehr.entity.User;
import com.clarity.ehr.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationRepository locationRepository;

    @GetMapping
    public ResponseEntity<?> list(Authentication authentication) {
        // Get current user
        User user = (User) authentication.getPrincipal();
        List<Location> locations;

        // ──────────────────────────────────────────────────────────────────────────────
        // ADMIN: Can see all locations
        // OTHERS: Can only see their assigned location
        // ──────────────────────────────────────────────────────────────────────────────
        if ("admin".equalsIgnoreCase(user.getRole())) {
            // Admin sees all active locations
            locations = locationRepository.findByStatusOrderBySortOrderAscNameAsc("Active");
        } else {
            // Non-admin: only their location
            if (user.getLocationId() == null) {
                // No location assigned — return empty
                return ResponseEntity.ok(new ArrayList<>());
            }
            locations = locationRepository.findById(user.getLocationId())
                    .filter(loc -> "Active".equals(loc.getStatus()))
                    .map(Collections::singletonList)
                    .orElseGet(Collections::emptyList);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Location loc : locations) {
            result.add(toMap(loc));
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id, Authentication authentication) {
        User user = (User) authentication.getPrincipal();

        // ──────────────────────────────────────────────────────────────────────────────
        // ADMIN: Can access any location
        // OTHERS: Can only access their assigned location
        // ──────────────────────────────────────────────────────────────────────────────
        return locationRepository.findById(id)
                .filter(loc -> {
                    // Admin can see all
                    if ("admin".equalsIgnoreCase(user.getRole())) {
                        return true;
                    }
                    // Non-admin can only see their own location
                    return id.equals(user.getLocationId());
                })
                .map(loc -> ResponseEntity.ok((Object) toMap(loc)))
                .orElseGet(() -> ResponseEntity.status(403).body(Map.of(
                    "error", "Access denied",
                    "message", "You do not have permission to access this location"
                )));
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
