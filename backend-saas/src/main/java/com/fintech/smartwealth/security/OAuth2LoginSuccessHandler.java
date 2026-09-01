package com.fintech.smartwealth.security;

import com.fintech.smartwealth.entity.Role;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final ObjectProvider<PasswordEncoder> passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String email = oauthUser.getAttribute("email");

        if (email == null || email.isBlank()) {
            response.sendRedirect(frontendUrl + "/login?error=google-email-missing");
            return;
        }

        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseGet(() -> createUser(oauthUser, email));
        String token = jwtTokenProvider.createToken(user);
        String encodedToken = URLEncoder.encode(token, StandardCharsets.UTF_8);

        response.sendRedirect(frontendUrl + "/oauth2/redirect?token=" + encodedToken);
    }

    private User createUser(OAuth2User oauthUser, String email) {
        User user = new User();
        user.setEmail(email.trim().toLowerCase());
        String fullName = oauthUser.getAttribute("name");
        user.setFullName(fullName == null || fullName.isBlank() ? email : fullName);
        user.setPassword(passwordEncoder.getObject().encode(UUID.randomUUID().toString()));
        user.setRole(Role.USER);
        user.setActive(true);
        return userRepository.save(user);
    }
}