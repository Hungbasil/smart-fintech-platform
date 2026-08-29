package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    
    Page<User> findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(
            String email, String fullName, Pageable pageable);
    
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    
    long countByLastLoginBetween(LocalDateTime start, LocalDateTime end);
}
