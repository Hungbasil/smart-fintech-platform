package com.fintech.smartwealth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.smartwealth.dto.OcrResultDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OcrService {

    private static final String PROMPT = "Bạn là một trợ lý tài chính. Hãy phân tích hóa đơn này và trích xuất tổng số tiền (amount) cùng ngày giao dịch (date). TRẢ VỀ ĐÚNG MỘT OBJECT JSON, KHÔNG CÓ BẤT KỲ VĂN BẢN NÀO KHÁC. Định dạng: {\"amount\": 150000, \"date\": \"DD/MM/YYYY\"}.";
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ObjectMapper objectMapper;
    private final RestClient.Builder restClientBuilder;

    @Value("${ollama.url:http://localhost:11434}")
    private String ollamaUrl;

    @Value("${OLLAMA_MODEL:llama3.2-vision:11b}")
    private String ollamaModel;

    public OcrResultDTO extract(MultipartFile file) {
        validateImage(file);
        try {
            String response = restClientBuilder.baseUrl(ollamaUrl).build()
                    .post()
                    .uri("/api/generate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "model", ollamaModel,
                            "stream", false,
                            "images", List.of(Base64.getEncoder().encodeToString(file.getBytes())),
                            "prompt", PROMPT))
                    .retrieve()
                    .body(String.class);
            return parseResponse(response);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Không thể phân tích hóa đơn. Hãy kiểm tra Ollama và model vision; nếu model không hỗ trợ ảnh, dùng Tesseract OCR ở bước trung gian.", exception);
        }
    }

    private OcrResultDTO parseResponse(String response) {
        try {
            JsonNode envelope = objectMapper.readTree(response);
            String generatedText = envelope.path("response").asText(null);
            if (generatedText == null || generatedText.isBlank()) {
                throw new IllegalArgumentException("Ollama returned an empty response");
            }
            JsonNode result = objectMapper.readTree(cleanJson(generatedText));
            BigDecimal amount = result.path("amount").decimalValue();
            LocalDate date = LocalDate.parse(result.path("date").asText(), DATE_FORMAT);
            if (amount.signum() <= 0) {
                throw new IllegalArgumentException("OCR amount must be positive");
            }
            return new OcrResultDTO(amount, date);
        } catch (DateTimeParseException | NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Ollama trả về ngày hoặc số tiền không hợp lệ.", exception);
        } catch (Exception exception) {
            if (exception instanceof ResponseStatusException responseStatusException) {
                throw responseStatusException;
            }
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Không thể đọc JSON từ kết quả Ollama. Hãy thử ảnh rõ hơn hoặc dùng Tesseract OCR ở bước trung gian.", exception);
        }
    }

    private String cleanJson(String text) {
        String cleaned = text.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        }
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        if (start < 0 || end <= start) {
            throw new IllegalArgumentException("No JSON object in Ollama response");
        }
        return cleaned.substring(start, end + 1);
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn ảnh hóa đơn.");
        }
        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ file ảnh hóa đơn.");
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Ảnh hóa đơn không được vượt quá 10 MB.");
        }
    }
}