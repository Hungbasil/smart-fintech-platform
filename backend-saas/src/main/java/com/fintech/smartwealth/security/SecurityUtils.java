package com.fintech.smartwealth.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Component
public class SecurityUtils {

    public UUID getCurrentUserId() {
        Authentication authentication = getAuthentication();
        Object principal = authentication.getPrincipal();
        if (principal instanceof CustomUserDetails userDetails) {
            return userDetails.getId();
        }
        throw new ResponseStatusException(UNAUTHORIZED, "Authentication required");
    }

    public boolean isCurrentUser(UUID userId) {
        return getCurrentUserId().equals(userId);
    }

    public boolean isAdmin() {
        return getAuthentication().getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> authority.equals("ROLE_ADMIN"));
    }

    public Authentication getAuthentication() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication instanceof AnonymousAuthenticationToken) {
            throw new ResponseStatusException(UNAUTHORIZED, "Authentication required");
        }
        return authentication;
    }

    public void requireOwnership(UUID ownerId) {
        if (!(isAdmin() || isCurrentUser(ownerId))) {
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        }
    }
}
