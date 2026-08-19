package com.fintech.smartwealth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Locale;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        userRepository.findByEmail("auth-test@example.com").ifPresent(userRepository::delete);
        userRepository.findByEmail("auth-existing@example.com").ifPresent(userRepository::delete);
    }

    @Test
    void registerShouldCreateUserAndReturnToken() throws Exception {
        String email = "auth-test-" + UUID.randomUUID() + "@example.com";
        String payload = """
                {
                  "fullName": "Auth Tester",
                  "email": "%s",
                  "password": "Password123"
                }
                """.formatted(email);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.user.email").value(email));
    }

    @Test
    void loginShouldReturnTokenForExistingUser() throws Exception {
        User user = new User();
        user.setFullName("Existing User");
        user.setEmail("auth-existing@example.com");
        user.setPassword(passwordEncoder.encode("Password123"));
        userRepository.save(user);

        String payload = """
                {
                  "email": "auth-existing@example.com",
                  "password": "Password123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void loginShouldUpgradeLegacyPlainTextPassword() throws Exception {
        String email = "legacy-" + UUID.randomUUID() + "@example.com";
        User user = new User();
        user.setFullName("Legacy User");
        user.setEmail(email);
        user.setPassword("seed123");
        userRepository.save(user);

        String payload = """
                {
                  "email": "%s",
                  "password": "seed123"
                }
                """.formatted(email);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());

        User upgraded = userRepository.findByEmail(email).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(upgraded.getPassword().startsWith("$2"));
    }

    @Test
    void accessingProtectedEndpointWithoutTokenShouldReturnJson401() throws Exception {
        mockMvc.perform(get("/api/v1/wallets"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    void accessingProtectedEndpointWithInvalidTokenShouldReturnJson401() throws Exception {
        mockMvc.perform(get("/api/v1/wallets")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    void registerAndLoginShouldNormalizeEmailCaseAndWhitespace() throws Exception {
        String rawEmail = "  Auth-Trim-" + UUID.randomUUID() + "@Example.COM  ";
        String normalizedEmail = rawEmail.trim().toLowerCase(Locale.ROOT);

        String registerPayload = """
                {
                  "fullName": "Normalized User",
                  "email": "%s",
                  "password": "Password123"
                }
                """.formatted(rawEmail);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value(normalizedEmail));

        String loginPayload = """
                {
                  "email": "%s",
                  "password": "Password123"
                }
                """.formatted(rawEmail.toUpperCase(Locale.ROOT));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
    }

    @Test
    void invalidRegisterPayloadShouldReturnValidationErrors() throws Exception {
        String payload = """
                {
                  "fullName": "",
                  "email": "not-an-email",
                  "password": "123"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.messages.fullName").exists())
                .andExpect(jsonPath("$.messages.email").exists());
    }
}
