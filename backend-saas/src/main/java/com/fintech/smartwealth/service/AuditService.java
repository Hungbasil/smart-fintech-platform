package com.fintech.smartwealth.service;

import lombok.RequiredArgsConstructor;
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
        
        // TODO: Persist to audit_log table for full audit trail
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
