package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.AnalyticsCategoryResponse;
import com.fintech.smartwealth.dto.AnalyticsMonthlyResponse;
import com.fintech.smartwealth.dto.AnalyticsSummaryResponse;
import com.fintech.smartwealth.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    public AnalyticsSummaryResponse summary(@RequestParam(required = false) UUID walletId,
                                            @RequestParam(required = false) LocalDateTime fromDate,
                                            @RequestParam(required = false) LocalDateTime toDate) {
        return analyticsService.getSummary(walletId, fromDate, toDate);
    }

    @GetMapping("/categories")
    public List<AnalyticsCategoryResponse> categories(@RequestParam(required = false) UUID walletId,
                                                      @RequestParam(required = false) LocalDateTime fromDate,
                                                      @RequestParam(required = false) LocalDateTime toDate) {
        return analyticsService.getExpenseByCategory(walletId, fromDate, toDate);
    }

    @GetMapping("/monthly")
    public List<AnalyticsMonthlyResponse> monthly(@RequestParam(required = false) UUID walletId,
                                                  @RequestParam(required = false) LocalDateTime fromDate,
                                                  @RequestParam(required = false) LocalDateTime toDate) {
        return analyticsService.getMonthlyAnalytics(walletId, fromDate, toDate);
    }
}