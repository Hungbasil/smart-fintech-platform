package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.AnalyticsCategoryResponse;
import com.fintech.smartwealth.dto.AnalyticsMonthlyResponse;
import com.fintech.smartwealth.dto.AnalyticsSummaryResponse;
import com.fintech.smartwealth.dto.PredictiveAnalyticsResponse;
import com.fintech.smartwealth.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    public AnalyticsSummaryResponse summary(@RequestParam(required = false) UUID walletId,
                                            @RequestParam(required = false) String fromDate,
                                            @RequestParam(required = false) String toDate) {
        return analyticsService.getSummary(walletId, parseDateTime(fromDate), parseDateTime(toDate));
    }

    @GetMapping("/categories")
    public List<AnalyticsCategoryResponse> categories(@RequestParam(required = false) UUID walletId,
                                                      @RequestParam(required = false) String fromDate,
                                                      @RequestParam(required = false) String toDate) {
        return analyticsService.getExpenseByCategory(walletId, parseDateTime(fromDate), parseDateTime(toDate));
    }

    @GetMapping("/monthly")
    public List<AnalyticsMonthlyResponse> monthly(@RequestParam(required = false) UUID walletId,
                                                  @RequestParam(required = false) String fromDate,
                                                  @RequestParam(required = false) String toDate) {
        return analyticsService.getMonthlyAnalytics(walletId, parseDateTime(fromDate), parseDateTime(toDate));
    }

    @GetMapping("/predict")
    public PredictiveAnalyticsResponse predict() {
        return analyticsService.predictNextMonthExpense();
    }

    private LocalDateTime parseDateTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException ignored) {
            try {
                return OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME).toLocalDateTime();
            } catch (DateTimeParseException exception) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date-time format");
            }
        }
    }
}