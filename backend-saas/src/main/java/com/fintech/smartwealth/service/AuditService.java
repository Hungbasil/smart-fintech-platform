package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.AuditLog;
import com.fintech.smartwealth.repository.AuditLogRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

/**
 * AuditService logs admin actions for compliance and debugging.
 * In a production system, this should persist to audit_log table.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;

    /**
     * Log admin action (currently logs to application log; 
     * in production, should persist to database audit_log table)
     */
    public void logAdminAction(String actionType, String description, String targetId) {
        String message = String.format(
                "[ADMIN_AUDIT] %s | Action: %s | Description: %s | TargetId: %s | Timestamp: %s",
                Thread.currentThread().getName(),
                actionType,
                description,
                targetId,
                LocalDateTime.now()
        );
        log.info(message);
        AuditLog auditLog = new AuditLog();
        auditLog.setActionType(actionType);
        auditLog.setDescription(description);
        auditLog.setTargetId(targetId);
        try {
                auditLog.setActor(securityUtils.getAuthentication().getPrincipal() instanceof com.fintech.smartwealth.security.CustomUserDetails details
                    ? userRepository.findById(details.getId()).orElse(null) : null);
        } catch (RuntimeException ignored) {
            // Login and system events can be recorded without an authenticated actor.
        }
        auditLogRepository.save(auditLog);
    }

    public Page<AuditLog> findAll(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    /**
     * Log login attempt
     */
    public void logLoginAttempt(String email, boolean success, String ipAddress) {
        String message = String.format(
                "[LOGIN_AUDIT] Email: %s | Success: %s | IP: %s | Timestamp: %s",
                email,
                success,
                ipAddress,
                LocalDateTime.now()
        );
        if (success) {
            log.info(message);
        } else {
            log.warn(message);
        }
    }

    /**
     * Log error for debugging
     */
    public void logError(String endpoint, String method, String errorMessage, int httpStatus) {
        String message = String.format(
                "[ERROR_LOG] Endpoint: %s | Method: %s | Status: %d | Error: %s | Timestamp: %s",
                endpoint,
                method,
                httpStatus,
                errorMessage,
                LocalDateTime.now()
        );
        log.error(message);
    }
}
