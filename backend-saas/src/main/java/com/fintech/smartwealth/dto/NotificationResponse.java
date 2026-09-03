package com.fintech.smartwealth.dto;

import com.fintech.smartwealth.entity.Notification;

import java.time.LocalDateTime;
import java.util.UUID;

public record NotificationResponse(UUID id, String message, String type, LocalDateTime readAt, LocalDateTime createdAt) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getMessage(), notification.getType(), notification.getReadAt(), notification.getCreatedAt());
    }
}
