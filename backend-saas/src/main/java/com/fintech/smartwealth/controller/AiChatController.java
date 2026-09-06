package com.fintech.smartwealth.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.smartwealth.dto.AiChatRequest;
import com.fintech.smartwealth.dto.AiChatResponse;
import com.fintech.smartwealth.dto.AiAction;
import com.fintech.smartwealth.dto.AiInsightsResponse;
import com.fintech.smartwealth.service.AiChatService;
import com.fintech.smartwealth.service.AnalyticsService;
import com.fintech.smartwealth.service.BudgetService;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {
    private final AiChatService aiChatService;
    private final com.fintech.smartwealth.service.AiInsightsService aiInsightsService;
    private final AnalyticsService analyticsService;
    private final BudgetService budgetService;
    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final SecurityUtils securityUtils;
    private final ObjectMapper objectMapper;

    @PostMapping("/chat")
    public AiChatResponse chat(@Valid @RequestBody AiChatRequest request) {
        String prompt = "Bạn là trợ lý AI tài chính chính thức của ứng dụng SmartFin. "
                + "Hãy xưng là SmartFin Assistant hoặc trợ lý SmartFin, không được tự nhận mình là Qwen, "
                + "Ollama hay tên của bất kỳ model/provider nào. CHỈ được trả lời bằng tiếng Việt; "
                + "tuyệt đối không dùng chữ Hán, tiếng Trung, tiếng Anh hoặc ngôn ngữ khác, kể cả khi trích dẫn. "
                + "Nếu cần dùng thuật ngữ chuyên môn, hãy diễn đạt bằng tiếng Việt. Trả lời ngắn gọn, "
                + "thân thiện và hữu ích. Nếu được hỏi bạn là ai, hãy trả lời rằng bạn là trợ lý tài chính "
                + "của SmartFin. Không được bịa số liệu. Nếu dữ liệu chưa đủ, hãy nói rõ. "
                + "Hãy trả về đúng một JSON hợp lệ, không markdown, theo mẫu: "
                + "{\"message\":\"câu trả lời tiếng Việt\",\"action\":{\"type\":\"NONE|CREATE_TRANSACTION|CREATE_BUDGET|OPEN_BUDGETS|OPEN_ANALYTICS\",\"arguments\":{}}}. "
                + "Dùng CREATE_TRANSACTION khi người dùng muốn ghi giao dịch; arguments có thể gồm amount, description, categoryId, categoryName. "
                + "Dùng CREATE_BUDGET khi người dùng muốn tạo ngân sách; arguments có thể gồm amount, categoryId, categoryName. "
                + "Nếu chỉ hỏi thông tin thì dùng NONE. "
                + "Dữ liệu riêng của người dùng hiện tại: " + buildFinancialContext()
                + " Câu hỏi của người dùng: " + request.message().trim();
        String rawResponse = aiChatService.ask(prompt, request.image());
        AiChatResponse structured = parseStructuredResponse(rawResponse, request.message());
        if (structured == null) {
            String answer = aiChatService.ask("Trả lời câu hỏi sau hoàn toàn bằng tiếng Việt, không dùng JSON hay markdown: " + request.message().trim());
            return aiChatService.enrichChat(answer, request.message());
        }
        return structured;
    }

    private boolean containsChinese(String value) {
        return value != null && value.matches(".*[\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF].*");
    }

    private AiChatResponse parseStructuredResponse(String rawResponse, String userMessage) {
        try {
            JsonNode root = objectMapper.readTree(cleanJson(rawResponse));
            String answer = root.path("message").asText("").trim();
            if (answer.isBlank() || containsChinese(answer)) return null;
            JsonNode actionNode = root.path("action");
            String type = actionNode.path("type").asText("NONE").toUpperCase();
            Map<String, Object> arguments = new HashMap<>();
            actionNode.path("arguments").fields().forEachRemaining(entry -> arguments.put(entry.getKey(), jsonValue(entry.getValue())));
            AiAction action = toSafeAction(type, arguments, userMessage);
            return new AiChatResponse(answer, action == null ? List.of() : List.of(action),
                    List.of("SmartFin AI", "Dữ liệu tài chính hiện tại của bạn"), java.time.OffsetDateTime.now());
        } catch (Exception ignored) {
            return null;
        }
    }

    private AiAction toSafeAction(String type, Map<String, Object> arguments, String userMessage) {
        return switch (type) {
            case "CREATE_TRANSACTION" -> new AiAction("CREATE_TRANSACTION", "Tạo giao dịch", "/transactions", argumentsWithFallback(arguments, "description", userMessage));
            case "CREATE_BUDGET" -> new AiAction("CREATE_BUDGET", "Tạo ngân sách đề xuất", "/budgets", arguments);
            case "OPEN_BUDGETS" -> new AiAction("OPEN_BUDGETS", "Mở ngân sách", "/budgets", Map.of());
            case "OPEN_ANALYTICS" -> new AiAction("OPEN_ANALYTICS", "Xem phân tích", "/analytics/overview", Map.of());
            case "NONE" -> null;
            default -> null;
        };
    }

    private Map<String, Object> argumentsWithFallback(Map<String, Object> arguments, String key, String value) {
        if (arguments.containsKey(key)) return arguments;
        Map<String, Object> copy = new HashMap<>(arguments);
        copy.put(key, value);
        return copy;
    }

    private Object jsonValue(JsonNode value) {
        if (value.isNumber()) return value.numberValue();
        if (value.isBoolean()) return value.booleanValue();
        return value.asText();
    }

    private String cleanJson(String value) {
        String cleaned = value == null ? "" : value.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        }
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        return start >= 0 && end > start ? cleaned.substring(start, end + 1) : cleaned;
    }

        private String buildFinancialContext() {
        UUID userId = securityUtils.getCurrentUserId();
        BigDecimal balance = walletRepository.findByUserId(userId).stream()
            .map(wallet -> wallet.getBalance() == null ? BigDecimal.ZERO : wallet.getBalance())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        var summary = analyticsService.getSummary(null, monthStart, monthStart.plusMonths(1));
        String budgets = budgetService.findAll().stream()
            .map(budget -> budget.categoryName() + ": " + budget.totalSpent() + "/" + budget.budgetAmount()
                + " (" + budget.percentage().setScale(0, java.math.RoundingMode.HALF_UP) + "%)")
            .collect(Collectors.joining(", "));
        String recentTransactions = transactionRepository.findTop10ByWalletUserIdOrderByTransactionDateDesc(userId).stream()
            .map(transaction -> transaction.getDescription() + "=" + transaction.getAmount()
                + " (" + transaction.getCategory().getName() + ")")
            .collect(Collectors.joining(", "));
        return "Số dư các ví: " + balance + ". Thu tháng này: " + summary.income() + ". Chi tháng này: " + summary.expense()
            + ". Ngân sách: [" + budgets + "]. Giao dịch gần đây: [" + recentTransactions + "].";
        }

    @org.springframework.web.bind.annotation.GetMapping("/insights")
    public AiInsightsResponse insights() {
        return aiInsightsService.getInsights();
    }
}
