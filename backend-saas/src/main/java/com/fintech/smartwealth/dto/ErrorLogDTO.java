package com.fintech.smartwealth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorLogDTO {
    private Long id;
    private String endpoint;
    private String method;
    private String errorMessage;
    private String stackTrace;
    private int httpStatus;
    private LocalDateTime occurredAt;
    private String userId;
}
