package com.clarity.ehr.controller;

import com.clarity.ehr.entity.User;
import com.clarity.ehr.repository.UserRepository;
import com.clarity.ehr.security.JwtTokenProvider;
import com.clarity.ehr.service.AuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuditService auditService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        Optional<User> optUser = userRepository.findByUsername(username);
        if (optUser.isEmpty() || !passwordEncoder.matches(password, optUser.get().getPasswordHash())) {
            auditService.log(null, null, null, "LOGIN_FAILED", "auth", null, null, null,
                    "{\"username\":\"" + username + "\",\"reason\":\"Invalid credentials\"}", 
                    request.getRemoteAddr(), request.getHeader("User-Agent"), null);
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
        }

        User user = optUser.get();
        String sessionId = UUID.randomUUID().toString();
        String token = tokenProvider.generateToken(user.getId(), user.getRole(), sessionId);

        auditService.log(user.getId(), user.getFirstName() + " " + (user.getLastName() != null ? user.getLastName() : ""),
                user.getRole(), "LOGIN_SUCCESS", "auth", null, null, null,
                "{\"sessionId\":\"" + sessionId + "\"}", request.getRemoteAddr(),
                request.getHeader("User-Agent"), sessionId);

        return ResponseEntity.ok(Map.of(
                "token", token,
                "user", buildUserResponse(user)
        ));
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verify2fa(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        // Static 2FA code for demo: 121314
        if ("121314".equals(code)) {
            return ResponseEntity.ok(Map.of("verified", true));
        }
        return ResponseEntity.status(401).body(Map.of("error", "Invalid 2FA code"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of("user", buildUserResponse(user)));
    }

    private Map<String, Object> buildUserResponse(User user) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("firstName", user.getFirstName());
        map.put("lastName", user.getLastName() != null ? user.getLastName() : "");
        map.put("name", (user.getFirstName() + " " + (user.getLastName() != null ? user.getLastName() : "")).trim());
        map.put("role", user.getRole());
        map.put("credentials", user.getCredentials() != null ? user.getCredentials() : "");
        map.put("specialty", user.getSpecialty() != null ? user.getSpecialty() : "");
        map.put("npi", user.getNpi() != null ? user.getNpi() : "");
        map.put("deaNumber", user.getDeaNumber() != null ? user.getDeaNumber() : "");
        map.put("email", user.getEmail());
        map.put("twoFactorEnabled", user.getTwoFactorEnabled() != null && user.getTwoFactorEnabled());
        map.put("patientId", user.getPatientId());
        return map;
    }
}
