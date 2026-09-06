package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.AiAction;
import com.fintech.smartwealth.dto.AiChatResponse;
import com.fintech.smartwealth.dto.AiInsightsResponse;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

final class AiAssistantActions {
    private AiAssistantActions() { }

    static AiChatResponse enrich(String answer, String userMessage) {
        String text = userMessage.toLowerCase();
        List<AiAction> actions = text.contains("giao dịch") || text.contains("chi tiêu")
                ? List.of(new AiAction("CREATE_TRANSACTION", "Tạo giao dịch", "/transactions", Map.of("description", userMessage)))
                : text.contains("ngân sách") || text.contains("budget")
                ? List.of(new AiAction("OPEN_BUDGETS", "Mở ngân sách", "/budgets", Map.of()))
                : List.of(new AiAction("OPEN_ANALYTICS", "Xem phân tích", "/analytics/overview", Map.of()));
        return new AiChatResponse(answer, actions, List.of("SmartFin AI", "Dữ liệu tài chính hiện tại của bạn"), OffsetDateTime.now());
    }

    static AiInsightsResponse insights() {
        return new AiInsightsResponse();
    }
}