package com.fintech.smartwealth.dto;

import com.fintech.smartwealth.entity.AuditLog;

import java.time.LocalDateTime;
import java.util.UUID;

public record AuditLogResponse(UUID id, UUID actorUserId, String actorEmail, String actionType, String description, String targetId, String ipAddress, LocalDateTime createdAt) {
    public static AuditLogResponse from(AuditLog auditLog) {
        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getActor() == null ? null : auditLog.getActor().getId(),
                auditLog.getActor() == null ? null : auditLog.getActor().getEmail(),
                auditLog.getActionType(),
                auditLog.getDescription(),
                auditLog.getTargetId(),
                auditLog.getIpAddress(),
                auditLog.getCreatedAt());
    }
}
