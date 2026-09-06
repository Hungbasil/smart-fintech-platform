package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.AiChatRequest;
import com.fintech.smartwealth.dto.AiChatResponse;
import com.fintech.smartwealth.dto.AiInsightsResponse;
import com.fintech.smartwealth.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiChatController {
    private final AiChatService aiChatService;
    private final com.fintech.smartwealth.service.AiInsightsService aiInsightsService;

    @PostMapping("/chat")
    public AiChatResponse chat(@Valid @RequestBody AiChatRequest request) {
        String prompt = "Bạn là trợ lý AI tài chính chính thức của ứng dụng SmartFin. "
                + "Hãy xưng là SmartFin Assistant hoặc trợ lý SmartFin, không được tự nhận mình là Qwen, "
                + "Ollama hay tên của bất kỳ model/provider nào. Trả lời bằng tiếng Việt, ngắn gọn, "
                + "thân thiện và hữu ích. Nếu được hỏi bạn là ai, hãy trả lời rằng bạn là trợ lý tài chính "
                + "của SmartFin. Câu hỏi của người dùng: " + request.message().trim();
        String answer = aiChatService.ask(prompt, request.image());
        return aiChatService.enrichChat(answer, request.message());
    }

    @org.springframework.web.bind.annotation.GetMapping("/insights")
    public AiInsightsResponse insights() {
        return aiInsightsService.getInsights();
    }
}
