package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.AnalyticsCategoryResponse;
import com.fintech.smartwealth.dto.AnalyticsMonthlyResponse;
import com.fintech.smartwealth.dto.AnalyticsSummaryResponse;
import com.fintech.smartwealth.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    public AnalyticsSummaryResponse summary() {
        return analyticsService.getSummary();
    }

    @GetMapping("/categories")
    public List<AnalyticsCategoryResponse> categories() {
        return analyticsService.getExpenseByCategory();
    }

    @GetMapping("/monthly")
    public List<AnalyticsMonthlyResponse> monthly() {
        return analyticsService.getMonthlyAnalytics();
    }
}