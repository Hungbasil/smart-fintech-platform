package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM Transaction t
            WHERE t.wallet.id = :walletId
              AND UPPER(t.category.type) = 'EXPENSE'
            """)
    BigDecimal sumExpenseByWalletId(@Param("walletId") UUID walletId);

    @Query("""
            SELECT t
            FROM Transaction t
            WHERE (:walletId IS NULL OR t.wallet.id = :walletId)
              AND (:categoryId IS NULL OR t.category.id = :categoryId)
              AND (:type IS NULL OR UPPER(t.category.type) = UPPER(:type))
              AND (:fromDate IS NULL OR t.transactionDate >= :fromDate)
              AND (:toDate IS NULL OR t.transactionDate <= :toDate)
            """)
    Page<Transaction> findAllByFilters(@Param("walletId") UUID walletId,
                                       @Param("categoryId") UUID categoryId,
                                       @Param("type") String type,
                                       @Param("fromDate") LocalDateTime fromDate,
                                       @Param("toDate") LocalDateTime toDate,
                                       Pageable pageable);

    @Query("""
            SELECT t
            FROM Transaction t
            WHERE t.wallet.user.id = :userId
              AND (:walletId IS NULL OR t.wallet.id = :walletId)
              AND (:categoryId IS NULL OR t.category.id = :categoryId)
              AND (:type IS NULL OR UPPER(t.category.type) = UPPER(:type))
              AND (:fromDate IS NULL OR t.transactionDate >= :fromDate)
              AND (:toDate IS NULL OR t.transactionDate <= :toDate)
            """)
    Page<Transaction> findAllByWalletUserIdAndFilters(@Param("userId") UUID userId,
                                                      @Param("walletId") UUID walletId,
                                                      @Param("categoryId") UUID categoryId,
                                                      @Param("type") String type,
                                                      @Param("fromDate") LocalDateTime fromDate,
                                                      @Param("toDate") LocalDateTime toDate,
                                                      Pageable pageable);

    Optional<Transaction> findByIdAndWalletUserId(UUID id, UUID userId);
}
