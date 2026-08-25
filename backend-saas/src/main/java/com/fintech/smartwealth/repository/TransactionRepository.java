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

        boolean existsByWalletId(UUID walletId);
        boolean existsByCategoryId(UUID categoryId);

        interface AnalyticsSummaryProjection {
                BigDecimal getIncome();
                BigDecimal getExpense();
                Long getTransactionCount();
        }

        interface AnalyticsCategoryProjection {
                String getCategory();
                BigDecimal getAmount();
        }

        interface AnalyticsMonthlyProjection {
                String getMonth();
                BigDecimal getIncome();
                BigDecimal getExpense();
        }

        @Query(value = """
                        SELECT
                                COALESCE(SUM(CASE WHEN UPPER(c.type) = 'INCOME' THEN t.amount ELSE 0 END), 0) AS income,
                                COALESCE(SUM(CASE WHEN UPPER(c.type) = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS expense,
                                COUNT(CASE WHEN t.transaction_type <> 'TRANSFER' THEN t.id END) AS transactionCount
                        FROM transactions t
                        JOIN wallets w ON w.id = t.wallet_id
                        JOIN categories c ON c.id = t.category_id
                                                                                                WHERE t.transaction_type <> 'TRANSFER'
                                                                                                        AND (:userId IS NULL OR w.user_id = :userId)
                                                                                                        AND (:walletId IS NULL OR t.wallet_id = :walletId)
                                                                                                        AND (CAST(:fromDate AS timestamp) IS NULL OR t.transaction_date >= CAST(:fromDate AS timestamp))
                                                                                                        AND (CAST(:toDate AS timestamp) IS NULL OR t.transaction_date < CAST(:toDate AS timestamp))
                        """, nativeQuery = true)
                                AnalyticsSummaryProjection getAnalyticsSummary(@Param("userId") UUID userId,
                                                                                                                                                                                                                                @Param("walletId") UUID walletId,
                                                                                                                                                                                                                                @Param("fromDate") LocalDateTime fromDate,
                                                                                                                                                                                                                                @Param("toDate") LocalDateTime toDate);

        @Query(value = """
                        SELECT c.name AS category, COALESCE(SUM(t.amount), 0) AS amount
                        FROM transactions t
                        JOIN wallets w ON w.id = t.wallet_id
                        JOIN categories c ON c.id = t.category_id
                                                                                                WHERE UPPER(c.type) = 'EXPENSE'
                                                                                                        AND t.transaction_type <> 'TRANSFER'
                                                                                                        AND (:userId IS NULL OR w.user_id = :userId)
                                                                                                        AND (:walletId IS NULL OR t.wallet_id = :walletId)
                                                                                                        AND (CAST(:fromDate AS timestamp) IS NULL OR t.transaction_date >= CAST(:fromDate AS timestamp))
                                                                                                        AND (CAST(:toDate AS timestamp) IS NULL OR t.transaction_date < CAST(:toDate AS timestamp))
                        GROUP BY c.name
                        HAVING SUM(t.amount) > 0
                        ORDER BY SUM(t.amount) DESC
                        """, nativeQuery = true)
        java.util.List<AnalyticsCategoryProjection> getExpenseByCategory(@Param("userId") UUID userId,
                                                                          @Param("walletId") UUID walletId,
                                                                          @Param("fromDate") LocalDateTime fromDate,
                                                                          @Param("toDate") LocalDateTime toDate);

        @Query(value = """
                        SELECT TO_CHAR(DATE_TRUNC('month', t.transaction_date), 'YYYY-MM') AS month,
                                   COALESCE(SUM(CASE WHEN UPPER(c.type) = 'INCOME' THEN t.amount ELSE 0 END), 0) AS income,
                                   COALESCE(SUM(CASE WHEN UPPER(c.type) = 'EXPENSE' THEN t.amount ELSE 0 END), 0) AS expense
                        FROM transactions t
                        JOIN wallets w ON w.id = t.wallet_id
                        JOIN categories c ON c.id = t.category_id
                                                                                                WHERE t.transaction_type <> 'TRANSFER'
                                                                                                        AND t.transaction_date >= :fromDate
                          AND t.transaction_date < :toDate
                                                                                                        AND (:userId IS NULL OR w.user_id = :userId)
                                                                                                        AND (:walletId IS NULL OR t.wallet_id = :walletId)
                        GROUP BY DATE_TRUNC('month', t.transaction_date)
                        ORDER BY DATE_TRUNC('month', t.transaction_date)
                        """, nativeQuery = true)
        java.util.List<AnalyticsMonthlyProjection> getMonthlyAnalytics(@Param("userId") UUID userId,
                                                                                                                                        @Param("walletId") UUID walletId,
                                                                                                                                        @Param("fromDate") LocalDateTime fromDate,
                                                                                                                                        @Param("toDate") LocalDateTime toDate);

        @Query("""
                        SELECT t
                        FROM Transaction t
                        WHERE t.wallet.user.id = :userId
                          AND (:keyword = '' OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
                        """)
                                Page<Transaction> findAllByWalletUserId(@Param("userId") UUID userId, @Param("keyword") String keyword, Pageable pageable);

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0)
            FROM Transaction t
            WHERE t.wallet.id = :walletId
              AND UPPER(t.category.type) = 'EXPENSE'
              AND t.transactionType <> 'TRANSFER'
            """)
    BigDecimal sumExpenseByWalletId(@Param("walletId") UUID walletId);

                @Query("""
                                                SELECT COALESCE(SUM(t.amount), 0)
                                                FROM Transaction t
                                                WHERE t.wallet.user.id = :userId
                                                        AND t.category.id = :categoryId
                                                        AND UPPER(t.category.type) = 'EXPENSE'
                                                        AND t.transactionType <> 'TRANSFER'
                                                        AND t.transactionDate >= :fromDate
                                                        AND t.transactionDate < :toDate
                                                """)
                BigDecimal sumExpenseByUserAndCategoryBetween(@Param("userId") UUID userId,
                                                                                                                                                                                                         @Param("categoryId") UUID categoryId,
                                                                                                                                                                                                         @Param("fromDate") LocalDateTime fromDate,
                                                                                                                                                                                                         @Param("toDate") LocalDateTime toDate);

    @Query("""
            SELECT t
            FROM Transaction t
            WHERE (:walletId IS NULL OR t.wallet.id = :walletId)
              AND (:categoryId IS NULL OR t.category.id = :categoryId)
              AND (:type = '' OR UPPER(t.category.type) = UPPER(:type))
              AND (:fromDate IS NULL OR t.transactionDate >= :fromDate)
                    AND (:toDate IS NULL OR t.transactionDate <= :toDate)
                    AND (:keyword = '' OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<Transaction> findAllByFilters(@Param("walletId") UUID walletId,
                                       @Param("categoryId") UUID categoryId,
                                       @Param("type") String type,
                                       @Param("fromDate") LocalDateTime fromDate,
                                       @Param("toDate") LocalDateTime toDate,
                                       @Param("keyword") String keyword,
                                       Pageable pageable);

      @Query("""
              SELECT t
              FROM Transaction t
                      WHERE t.wallet.user.id = :userId
                        AND (:walletId IS NULL OR t.wallet.id = :walletId)
                AND (:categoryId IS NULL OR t.category.id = :categoryId)
                AND (:fromDate IS NULL OR t.transactionDate >= :fromDate)
                AND (:toDate IS NULL OR t.transactionDate <= :toDate)
                         AND (:keyword = '' OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
              """)
      Page<Transaction> findAllByWalletUserIdWithoutTypeFilter(@Param("userId") UUID userId,
                                                                @Param("walletId") UUID walletId,
                                                                @Param("categoryId") UUID categoryId,
                                                                @Param("fromDate") LocalDateTime fromDate,
                                                                @Param("toDate") LocalDateTime toDate,
                                                                @Param("keyword") String keyword,
                                                                Pageable pageable);

    @Query("""
            SELECT t
            FROM Transaction t
            WHERE t.wallet.user.id = :userId
              AND (:walletId IS NULL OR t.wallet.id = :walletId)
              AND (:categoryId IS NULL OR t.category.id = :categoryId)
              AND (:type = '' OR UPPER(t.category.type) = UPPER(:type))
              AND (:fromDate IS NULL OR t.transactionDate >= :fromDate)
              AND (:toDate IS NULL OR t.transactionDate <= :toDate)
                    AND (:keyword = '' OR LOWER(t.description) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<Transaction> findAllByWalletUserIdAndFilters(@Param("userId") UUID userId,
                                                      @Param("walletId") UUID walletId,
                                                      @Param("categoryId") UUID categoryId,
                                                      @Param("type") String type,
                                                      @Param("fromDate") LocalDateTime fromDate,
                                                      @Param("toDate") LocalDateTime toDate,
                                                      @Param("keyword") String keyword,
                                                      Pageable pageable);

    Optional<Transaction> findByIdAndWalletUserId(UUID id, UUID userId);
}
