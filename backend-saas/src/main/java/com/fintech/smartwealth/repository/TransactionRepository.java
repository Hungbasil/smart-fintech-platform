package com.fintech.smartwealth.repository;

import com.fintech.smartwealth.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM Transaction t
            WHERE t.wallet.id = :walletId
              AND UPPER(t.category.type) = 'EXPENSE'
            """)
    BigDecimal sumExpenseByWalletId(@Param("walletId") UUID walletId);
}
