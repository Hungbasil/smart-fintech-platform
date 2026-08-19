package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.AuthResponse;
import com.fintech.smartwealth.dto.LoginRequest;
import com.fintech.smartwealth.dto.RegisterRequest;
import com.fintech.smartwealth.dto.UserSummary;
import com.fintech.smartwealth.entity.Role;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

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

        User saved = userRepository.save(user);
        return issueToken(saved);
    }

    public AuthResponse login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!matchesPassword(request.getPassword(), user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return issueToken(user);
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

    private AuthResponse issueToken(User user) {
        String token = jwtTokenProvider.createToken(user);
        return new AuthResponse(token, new UserSummary(user.getId(), user.getFullName(), user.getEmail()));
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }
}
