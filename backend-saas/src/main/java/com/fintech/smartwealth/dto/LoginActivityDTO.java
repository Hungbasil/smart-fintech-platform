package com.fintech.smartwealth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginActivityDTO {
    private UUID userId;
    private String email;
    private String fullName;
    private LocalDateTime loginAt;
    private String ipAddress;
    private String userAgent;
    private boolean success;
}
