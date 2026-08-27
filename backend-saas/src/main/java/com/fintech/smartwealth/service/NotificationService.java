package com.fintech.smartwealth.service;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NotificationService {
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

    private void removeIfCurrent(UUID userId, SseEmitter emitter) {
        emitters.remove(userId, emitter);
    }
}
