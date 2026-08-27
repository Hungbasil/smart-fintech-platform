package com.fintech.smartwealth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class OtpService {
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    public void sendRegistrationOtp(String email) { send(email); }
    public void sendPasswordResetOtp(String email) { send(email); }

    public void verify(String email, String otp) {
        String key = key(email);
        String stored = redisTemplate.opsForValue().get(key);
        if (stored == null || !stored.equals(otp)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired OTP");
        }
        redisTemplate.delete(key);
    }

    private void send(String email) {
        String otp = "%06d".formatted(random.nextInt(1_000_000));
        redisTemplate.opsForValue().set(key(email), otp, OTP_TTL);
        emailService.sendOtpEmail(email, otp);
    }

    private String key(String email) { return "OTP_" + email.trim().toLowerCase(); }
}