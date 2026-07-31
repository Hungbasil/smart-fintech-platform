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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);

        User saved = userRepository.save(user);
        return issueToken(saved);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return issueToken(user);
    }

    private AuthResponse issueToken(User user) {
        String token = jwtTokenProvider.createToken(user);
        return new AuthResponse(token, new UserSummary(user.getId(), user.getFullName(), user.getEmail()));
    }
}
