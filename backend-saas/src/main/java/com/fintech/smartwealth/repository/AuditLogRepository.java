package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    @EntityGraph(attributePaths = "actor")
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
