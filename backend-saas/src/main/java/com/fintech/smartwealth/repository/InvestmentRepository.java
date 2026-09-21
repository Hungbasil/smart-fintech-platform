package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.Investment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvestmentRepository extends JpaRepository<Investment, UUID> {
    List<Investment> findByUserIdOrderByCoinSymbolAsc(UUID userId);
    Optional<Investment> findByIdAndUserId(UUID id, UUID userId);
}
