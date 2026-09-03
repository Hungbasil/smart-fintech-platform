package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.AuthResponse;
import com.fintech.smartwealth.dto.LoginRequest;
import com.fintech.smartwealth.dto.RegisterRequest;
import com.fintech.smartwealth.dto.UserSummary;
import com.fintech.smartwealth.entity.Role;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.entity.RefreshSession;
import com.fintech.smartwealth.repository.RefreshSessionRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final OtpService otpService;
    private final RefreshSessionRepository refreshSessionRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthResponse register(RegisterRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);
        user.setActive(false);

        User saved = userRepository.save(user);
        otpService.sendRegistrationOtp(saved.getEmail());
        return issueToken(saved);
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Please verify your email before signing in");
        }

        if (!matchesPassword(request.getPassword(), user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // Update last login timestamp
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        return issueToken(user);
    }

    public void verifyRegistration(String email, String otp) {
        User user = findUser(email);
        otpService.verify(user.getEmail(), otp);
        user.setActive(true);
        userRepository.save(user);
    }

    public void resendRegistration(String email) {
        User user = findUser(email);
        if (user.isActive()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already verified");
        otpService.sendRegistrationOtp(user.getEmail());
    }

    public void forgotPassword(String email) {
        User user = findUser(email);
        otpService.sendPasswordResetOtp(user.getEmail());
    }

    public void resetPassword(String email, String otp, String newPassword) {
        User user = findUser(email);
        otpService.verify(user.getEmail(), otp);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setActive(true);
        userRepository.save(user);
    }

    private User findUser(String email) {
        return userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Email not found"));
    }

    private boolean matchesPassword(String rawPassword, User user) {
        String storedPassword = user.getPassword();
        if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }

        if (storedPassword.equals(rawPassword)) {
            user.setPassword(passwordEncoder.encode(rawPassword));
            userRepository.save(user);
            return true;
        }

        return false;
    }

    public AuthResponse issueToken(User user) {
        String token = jwtTokenProvider.createToken(user);
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        String refreshToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        RefreshSession session = new RefreshSession();
        session.setUser(user);
        session.setTokenHash(hash(refreshToken));
        session.setExpiresAt(LocalDateTime.now().plusDays(30));
        session.setDeviceName("Web browser");
        refreshSessionRepository.save(session);
        return new AuthResponse(token, refreshToken, new UserSummary(user.getId(), user.getFullName(), user.getEmail()));
    }

    @org.springframework.transaction.annotation.Transactional
    public AuthResponse refresh(String refreshToken) {
        RefreshSession session = refreshSessionRepository.findByTokenHash(hash(refreshToken))
                .filter(item -> item.getRevokedAt() == null && item.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));
        session.setRevokedAt(LocalDateTime.now());
        refreshSessionRepository.save(session);
        return issueToken(session.getUser());
    }

    @org.springframework.transaction.annotation.Transactional
    public void revoke(String refreshToken) {
        refreshSessionRepository.findByTokenHash(hash(refreshToken)).ifPresent(session -> {
            session.setRevokedAt(LocalDateTime.now());
            refreshSessionRepository.save(session);
        });
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
