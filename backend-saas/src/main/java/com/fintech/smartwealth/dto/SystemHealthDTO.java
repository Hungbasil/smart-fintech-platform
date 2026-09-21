package com.fintech.smartwealth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemHealthDTO {
    private String status; // UP, DOWN, DEGRADED
    private LocalDateTime timestamp;
    private DatabaseHealthDTO database;
    private String applicationVersion;
    private long uptime; // milliseconds
    private int totalMemory;
    private int freeMemory;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DatabaseHealthDTO {
        private String status;
        private String message;
        private long responseTime; // milliseconds
    }
}
