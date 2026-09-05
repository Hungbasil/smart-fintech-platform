package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUserIdAndReadAtIsNull(UUID userId);

    @Modifying
    @Query("update Notification notification set notification.readAt = :readAt where notification.id = :id and notification.user.id = :userId and notification.readAt is null")
    int markAsRead(@Param("id") UUID id, @Param("userId") UUID userId, @Param("readAt") LocalDateTime readAt);

    @Modifying
    @Query("update Notification notification set notification.readAt = :readAt where notification.user.id = :userId and notification.readAt is null")
    int markAllAsRead(@Param("userId") UUID userId, @Param("readAt") LocalDateTime readAt);

    long deleteByIdAndUserId(UUID id, UUID userId);
}
