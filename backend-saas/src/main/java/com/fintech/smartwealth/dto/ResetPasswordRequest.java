package com.fintech.smartwealth.dto;

public record ResetPasswordRequest(String email, String otp, String newPassword) {}