package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.CalendarEventDTO;
import com.fintech.smartwealth.security.SecurityUtils;
import com.fintech.smartwealth.service.CalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;
    private final SecurityUtils securityUtils;

    @GetMapping("/debts")
    public List<CalendarEventDTO> debts() {
        return calendarService.findEvents(securityUtils.getCurrentUserId());
    }
}