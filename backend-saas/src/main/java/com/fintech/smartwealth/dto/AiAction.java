package com.fintech.smartwealth.dto;

import java.util.Map;

public record AiAction(String type, String label, String path, Map<String, Object> data) {
}