package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.security.SecurityUtils;
import com.fintech.smartwealth.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

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
}
