package com.fintech.smartwealth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class AiAssistantService {

    private final WebClient ollamaWebClient;
    private final ObjectMapper objectMapper;

    public ExtractedTransaction extractTransactionData(String text) {
        String prompt = "Bạn là một máy trích xuất dữ liệu. Hãy đọc câu sau và trả về ĐÚNG 1 chuỗi JSON, không giải thích gì thêm. "
                + "Định dạng: {\"amount\": số_tiền, \"category\": \"Tên_danh_mục\", \"note\": \"Ghi chú tối đa 60 ký tự\"}. "
                + "Chỉ xử lý câu mô tả một khoản thu nhập hoặc chi tiêu. Nếu câu không liên quan đến giao dịch hoặc không đủ thông tin, "
                + "hãy trả về {\"amount\": 0, \"category\": \"\", \"note\": \"\"}. "
                + "Quy đổi đúng các đơn vị tiếng Việt như nghìn, ngàn, triệu; nếu số tiền hoặc danh mục còn mơ hồ thì từ chối. "
                + "Ghi chú chỉ giữ nội dung chính như món hàng hoặc mục đích, không lặp lại cả câu nói, số tiền hoặc thời gian. "
                + "Câu cần xử lý: " + text.trim();
        try {
            JsonNode response = ollamaWebClient.post()
                    .uri("/api/generate")
                    .bodyValue(new OllamaRequest("qwen2.5:latest", false, prompt))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
            String generated = response == null ? null : response.path("response").asText(null);
            if (generated == null || generated.isBlank()) {
                throw new IllegalArgumentException("Ollama returned an empty response");
            }
            JsonNode data = objectMapper.readTree(cleanJson(generated));
            BigDecimal amount = data.path("amount").decimalValue();
            String category = data.path("category").asText("").trim();
            String note = data.path("note").asText("").trim();
            if (amount.signum() <= 0 || category.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Không nhận diện được khoản chi tiêu hợp lệ từ câu nói.");
            }
            if (amount.scale() > 2 || amount.compareTo(new BigDecimal("1000000000000")) > 0) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                        "Số tiền nhận diện được không hợp lệ.");
            }
            return new ExtractedTransaction(amount, category, note.length() > 60 ? note.substring(0, 60).trim() : note);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Không thể phân tích giao dịch bằng AI. Hãy kiểm tra Ollama và model qwen2.5:latest.", exception);
        }
    }

    private String cleanJson(String value) {
        String cleaned = value.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```(?:json)?\\s*", "");
            cleaned = cleaned.replaceFirst("\\s*```$", "");
        }
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        return start >= 0 && end > start ? cleaned.substring(start, end + 1) : cleaned;
    }

    public record ExtractedTransaction(BigDecimal amount, String category, String note) {
    }

    private record OllamaRequest(String model, boolean stream, String prompt) {
    }
}