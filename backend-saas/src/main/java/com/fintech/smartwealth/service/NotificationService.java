package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Notification;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.NotificationRepository;
import com.fintech.smartwealth.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final ConcurrentHashMap<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID userId) {
        SseEmitter emitter = new SseEmitter(0L);
        SseEmitter previous = emitters.put(userId, emitter);
        if (previous != null) {
            previous.complete();
        }

        emitter.onCompletion(() -> removeIfCurrent(userId, emitter));
        emitter.onTimeout(() -> removeIfCurrent(userId, emitter));
        emitter.onError(error -> removeIfCurrent(userId, emitter));
        try {
            emitter.send(SseEmitter.event().name("connected").data("Notification stream connected"));
        } catch (IOException exception) {
            removeIfCurrent(userId, emitter);
            emitter.completeWithError(exception);
        }
        return emitter;
    }

    public void sendNotification(UUID userId, String message) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setMessage(message);
        notification.setType("ALERT");
        notificationRepository.save(notification);

        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) {
            return;
        }
        try {
            emitter.send(SseEmitter.event().name("notification").data(message));
        } catch (IOException | IllegalStateException exception) {
            removeIfCurrent(userId, emitter);
            emitter.completeWithError(exception);
        }
    }

    public Page<Notification> findForUser(UUID userId, Pageable pageable) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long countUnread(UUID userId) {
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @org.springframework.transaction.annotation.Transactional
    public void markAsRead(UUID userId, UUID notificationId) {
        if (notificationRepository.markAsRead(notificationId, userId, LocalDateTime.now()) == 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Notification not found");
        }
    }

    @org.springframework.transaction.annotation.Transactional
    public void markAllAsRead(UUID userId) {
        notificationRepository.markAllAsRead(userId, LocalDateTime.now());
    }

    @org.springframework.transaction.annotation.Transactional
    public void delete(UUID userId, UUID notificationId) {
        if (notificationRepository.deleteByIdAndUserId(notificationId, userId) == 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND, "Notification not found");
        }
    }

    private void removeIfCurrent(UUID userId, SseEmitter emitter) {
        emitters.remove(userId, emitter);
    }
}
