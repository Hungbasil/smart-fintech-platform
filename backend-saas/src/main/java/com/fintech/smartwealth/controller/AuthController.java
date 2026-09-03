package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.AuthResponse;
import com.fintech.smartwealth.dto.LoginRequest;
import com.fintech.smartwealth.dto.RegisterRequest;
import com.fintech.smartwealth.dto.EmailRequest;
import com.fintech.smartwealth.dto.OtpRequest;
import com.fintech.smartwealth.dto.ResetPasswordRequest;
import com.fintech.smartwealth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@RequestBody Map<String, String> request) {
        return authService.refresh(request.getOrDefault("refreshToken", ""));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestBody Map<String, String> request) {
        authService.revoke(request.getOrDefault("refreshToken", ""));
    }

    @PostMapping("/verify-registration")
    public Map<String, String> verifyRegistration(@RequestBody OtpRequest request) {
        authService.verifyRegistration(request.email(), request.otp());
        return Map.of("message", "Email verified successfully");
    }

    @PostMapping("/resend-registration")
    public Map<String, String> resendRegistration(@RequestBody EmailRequest request) {
        authService.resendRegistration(request.email());
        return Map.of("message", "Verification code sent");
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@RequestBody EmailRequest request) {
        authService.forgotPassword(request.email());
        return Map.of("message", "If the email exists, a reset code has been sent");
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.email(), request.otp(), request.newPassword());
        return Map.of("message", "Password reset successfully");
    }
}
