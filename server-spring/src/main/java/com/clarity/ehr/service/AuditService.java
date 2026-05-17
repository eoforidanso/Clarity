package com.clarity.ehr.service;

import com.clarity.ehr.entity.AuditLog;
import com.clarity.ehr.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void log(String userId, String userName, String userRole, String action,
                    String resourceType, String resourceId, String patientId,
                    String patientName, String details, String ipAddress,
                    String userAgent, String sessionId) {
        AuditLog entry = AuditLog.builder()
                .id(UUID.randomUUID().toString())
                .userId(userId)
                .userName(userName)
                .userRole(userRole)
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId != null ? resourceId : "")
                .patientId(patientId != null ? patientId : "")
                .patientName(patientName != null ? patientName : "")
                .details(details != null ? details : "")
                .ipAddress(ipAddress != null ? ipAddress : "")
                .userAgent(userAgent != null ? userAgent : "")
                .sessionId(sessionId != null ? sessionId : "")
                .build();
        auditLogRepository.save(entry);
    }
}
