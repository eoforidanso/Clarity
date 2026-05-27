package com.clarity.ehr.controller;

import com.clarity.ehr.entity.User;
import com.clarity.ehr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private static final Set<String> VALID_ROLES = Set.of(
            "prescriber", "nurse", "front_desk", "therapist", "biller", "admin", "patient"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<?> list() {
        List<Map<String, Object>> users = userRepository.findAll().stream()
                .filter(u -> !"patient".equals(u.getRole()))
                .sorted(Comparator
                        .comparing((User u) -> nullSafe(u.getLastName()))
                        .thenComparing(u -> nullSafe(u.getFirstName())))
                .map(this::buildUserResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @GetMapping("/directory")
    public ResponseEntity<?> directory() {
        return list();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable String id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok((Object) buildUserResponse(u)))
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("error", "User not found")));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        String username = strLower(body.get("username"));
        String password = str(body.get("password"));
        String role = str(body.get("role"));

        if (isBlank(username) || isBlank(password) || isBlank(role)) {
            return ResponseEntity.badRequest().body(Map.of("error", "username, password and role are required"));
        }
        if (!VALID_ROLES.contains(role)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
        }
        String pwErr = validatePassword(password);
        if (pwErr != null) return ResponseEntity.badRequest().body(Map.of("error", pwErr));

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Username already exists"));
        }

        String id = str(body.get("id"));
        if (isBlank(id)) id = "u-" + UUID.randomUUID().toString().substring(0, 8);

        User u = User.builder()
                .id(id)
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .firstName(strOr(body.get("firstName"), ""))
                .lastName(str(body.get("lastName")))
                .role(role)
                .credentials(str(body.get("credentials")))
                .specialty(str(body.get("specialty")))
                .npi(str(body.get("npi")))
                .deaNumber(str(body.get("deaNumber")))
                .email(strOr(body.get("email"), username + "@clarity.health"))
                .twoFactorEnabled(boolOr(body.get("twoFactorEnabled"), false))
                .mustChangePassword(boolOr(body.get("mustChangePassword"), false))
                .locationId(str(body.get("locationId")))
                .build();

        userRepository.save(u);
        return ResponseEntity.status(201).body(buildUserResponse(u));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        User u = opt.get();

        if (body.containsKey("firstName"))         u.setFirstName(str(body.get("firstName")));
        if (body.containsKey("lastName"))          u.setLastName(str(body.get("lastName")));
        if (body.containsKey("credentials"))       u.setCredentials(str(body.get("credentials")));
        if (body.containsKey("specialty"))         u.setSpecialty(str(body.get("specialty")));
        if (body.containsKey("npi"))               u.setNpi(str(body.get("npi")));
        if (body.containsKey("deaNumber"))         u.setDeaNumber(str(body.get("deaNumber")));
        if (body.containsKey("email"))             u.setEmail(str(body.get("email")));
        if (body.containsKey("twoFactorEnabled"))  u.setTwoFactorEnabled(boolOr(body.get("twoFactorEnabled"), false));
        if (body.containsKey("locationId"))        u.setLocationId(str(body.get("locationId")));
        if (body.containsKey("role")) {
            String role = str(body.get("role"));
            if (!VALID_ROLES.contains(role)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid role"));
            }
            u.setRole(role);
        }

        userRepository.save(u);
        return ResponseEntity.ok(buildUserResponse(u));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(@PathVariable String id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.status(404).body(Map.of("error", "User not found"));
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(@PathVariable String id, @RequestBody Map<String, String> body) {
        String newPassword = body.get("newPassword");
        String err = validatePassword(newPassword);
        if (err != null) return ResponseEntity.badRequest().body(Map.of("error", err));

        Optional<User> opt = userRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "User not found"));

        User u = opt.get();
        u.setPasswordHash(passwordEncoder.encode(newPassword));
        u.setMustChangePassword(true);
        userRepository.save(u);
        return ResponseEntity.ok(Map.of("message", "Password reset; user must change on next login"));
    }

    // ── helpers ──────────────────────────────────────────────────────────────
    private Map<String, Object> buildUserResponse(User u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("username", u.getUsername());
        m.put("firstName", nullSafe(u.getFirstName()));
        m.put("lastName", nullSafe(u.getLastName()));
        m.put("name", (nullSafe(u.getFirstName()) + " " + nullSafe(u.getLastName())).trim());
        m.put("role", u.getRole());
        m.put("credentials", nullSafe(u.getCredentials()));
        m.put("specialty", nullSafe(u.getSpecialty()));
        m.put("npi", nullSafe(u.getNpi()));
        m.put("deaNumber", nullSafe(u.getDeaNumber()));
        m.put("email", nullSafe(u.getEmail()));
        m.put("twoFactorEnabled", u.getTwoFactorEnabled() != null && u.getTwoFactorEnabled());
        m.put("mustChangePassword", u.getMustChangePassword() != null && u.getMustChangePassword());
        m.put("locationId", u.getLocationId());
        return m;
    }

    private String validatePassword(String p) {
        if (p == null || p.length() < 8 || p.length() > 200) return "Password must be at least 8 characters";
        if (!p.matches(".*[A-Z].*") || !p.matches(".*[0-9].*"))
            return "Password must contain at least one uppercase letter and one number";
        return null;
    }

    private static String str(Object v)            { return v == null ? null : String.valueOf(v); }
    private static String strLower(Object v)       { return v == null ? null : String.valueOf(v).trim().toLowerCase(); }
    private static String strOr(Object v, String d){ String s = str(v); return (s == null || s.isBlank()) ? d : s; }
    private static String nullSafe(String s)       { return s == null ? "" : s; }
    private static boolean isBlank(String s)       { return s == null || s.isBlank(); }
    private static Boolean boolOr(Object v, boolean d) {
        if (v instanceof Boolean b) return b;
        if (v instanceof String s)  return Boolean.parseBoolean(s);
        if (v instanceof Number n)  return n.intValue() != 0;
        return d;
    }
}
