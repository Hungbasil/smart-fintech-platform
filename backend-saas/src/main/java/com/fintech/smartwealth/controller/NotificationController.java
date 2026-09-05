package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.security.SecurityUtils;
import com.fintech.smartwealth.dto.NotificationResponse;
import com.fintech.smartwealth.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final SecurityUtils securityUtils;

    @GetMapping("/subscribe")
    public SseEmitter subscribe() {
        return notificationService.subscribe(securityUtils.getCurrentUserId());
    }

    @GetMapping
    public Page<NotificationResponse> findAll(
            @PageableDefault(size = 30, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return notificationService.findForUser(securityUtils.getCurrentUserId(), pageable)
                .map(NotificationResponse::from);
    }

    @GetMapping("/unread-count")
    public long unreadCount() {
        return notificationService.countUnread(securityUtils.getCurrentUserId());
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable UUID id) {
        notificationService.markAsRead(securityUtils.getCurrentUserId(), id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        notificationService.markAllAsRead(securityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        notificationService.delete(securityUtils.getCurrentUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
