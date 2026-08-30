package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.*;
import com.fintech.smartwealth.entity.*;
import com.fintech.smartwealth.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;
    private final RecurringTransactionRepository recurringTransactionRepository;
    private final SavingGoalRepository savingGoalRepository;
    private final DebtRepository debtRepository;
    private final AuditService auditService;

    // ==================== USER MANAGEMENT ====================

    public Page<UserDTO> getUsers(Pageable pageable, String search) {
        Page<User> users;
        if (search != null && !search.isBlank()) {
            users = userRepository.findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(
                    search, search, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        return users.map(this::toUserDTO);
    }

    public UserDTO getUserDetail(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toUserDTO(user);
    }

    public void lockUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(false);
        userRepository.save(user);
        auditService.logAdminAction("LOCK_USER", "User " + user.getEmail() + " locked", id.toString());
    }

    public void unlockUser(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setActive(true);
        userRepository.save(user);
        auditService.logAdminAction("UNLOCK_USER", "User " + user.getEmail() + " unlocked", id.toString());
    }

    public void changeUserRole(UUID id, RoleChangeRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        Role newRole;
        try {
            newRole = Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + request.getRole());
        }
        
        Role oldRole = user.getRole();
        user.setRole(newRole);
        userRepository.save(user);
        auditService.logAdminAction("CHANGE_ROLE", 
                "User " + user.getEmail() + " role changed from " + oldRole + " to " + newRole, 
                id.toString());
    }

    // ==================== SYSTEM OVERVIEW ====================

    public AdminOverviewDTO getOverview() {
        AdminOverviewDTO overview = new AdminOverviewDTO();
        
        // Count totals
        overview.setTotalUsers(userRepository.count());
        overview.setTotalWallets(walletRepository.count());
        overview.setTotalTransactions(transactionRepository.count());
        
        // Total balance
        BigDecimal totalBalance = walletRepository.findAll().stream()
                .map(Wallet::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        overview.setTotalBalance(totalBalance);
        
        // Monthly spent and income
        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime monthEnd = monthStart.plusMonths(1);
        
        BigDecimal monthlySpent = transactionRepository.sumExpenseByType("EXPENSE", monthStart, monthEnd);
        BigDecimal monthlyIncome = transactionRepository.sumExpenseByType("INCOME", monthStart, monthEnd);
        
        overview.setMonthlySpent(monthlySpent != null ? monthlySpent : BigDecimal.ZERO);
        overview.setMonthlyIncome(monthlyIncome != null ? monthlyIncome : BigDecimal.ZERO);
        
        // New users this month
        long newUsersThisMonth = userRepository.countByCreatedAtBetween(monthStart, monthEnd);
        overview.setNewUsersThisMonth((int) newUsersThisMonth);
        
        // Active users today
        LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime todayEnd = todayStart.plusDays(1);
        long activeToday = userRepository.countByLastLoginBetween(todayStart, todayEnd);
        overview.setActiveUsersToday((int) activeToday);
        
        return overview;
    }

    // ==================== TRANSACTION ANALYTICS ====================

    public AdminTransactionAnalyticsDTO getTransactionAnalytics(LocalDate fromDate, LocalDate toDate) {
        AdminTransactionAnalyticsDTO analytics = new AdminTransactionAnalyticsDTO();
        
        LocalDateTime from = fromDate != null ? fromDate.atStartOfDay() : LocalDateTime.now().minusMonths(12);
        LocalDateTime to = toDate != null ? toDate.plusDays(1).atStartOfDay() : LocalDateTime.now();
        
        List<Transaction> transactions = transactionRepository.findByTransactionDateBetween(from, to);
        
        // Spending by category (top 10)
        Map<String, BigDecimal> categorySpending = transactions.stream()
                .filter(t -> "EXPENSE".equalsIgnoreCase(t.getCategory().getType()))
                .collect(Collectors.groupingBy(
                        t -> t.getCategory().getName(),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)))
                .entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(10)
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        LinkedHashMap::new));
        analytics.setCategorySpending(categorySpending);
        
        // Spending by wallet
        Map<String, BigDecimal> walletSpending = transactions.stream()
                .filter(t -> "EXPENSE".equalsIgnoreCase(t.getCategory().getType()))
                .collect(Collectors.groupingBy(
                        t -> t.getWallet().getName(),
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)));
        analytics.setWalletSpending(walletSpending);
        
        // Largest transactions (top 20)
        List<TransactionResponse> largestTransactions = transactions.stream()
                .sorted((a, b) -> b.getAmount().compareTo(a.getAmount()))
                .limit(20)
                .map(this::toTransactionResponse)
                .collect(Collectors.toList());
        analytics.setLargestTransactions(largestTransactions);
        
        // Daily transaction count
        Map<LocalDate, Long> dailyCount = transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getTransactionDate().toLocalDate(),
                        Collectors.counting()));
        analytics.setDailyTransactionCount(dailyCount);
        
        analytics.setTotalTransactionCount(transactions.size());
        
        return analytics;
    }

    // ==================== USER ANALYTICS ====================

    public AdminUserAnalyticsDTO getUserAnalytics() {
        AdminUserAnalyticsDTO analytics = new AdminUserAnalyticsDTO();
        
        long totalUsers = userRepository.count();
        analytics.setTotalUsers(totalUsers);
        
        // Active users this month
        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime monthEnd = monthStart.plusMonths(1);
        long activeThisMonth = userRepository.countByLastLoginBetween(monthStart, monthEnd);
        analytics.setActiveUsersThisMonth(activeThisMonth);
        
        // New users this month
        long newThisMonth = userRepository.countByCreatedAtBetween(monthStart, monthEnd);
        analytics.setNewUsersThisMonth((int) newThisMonth);
        
        // Daily user registration (last 30 days)
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        Map<LocalDate, Long> dailyRegistration = userRepository.findAll().stream()
                .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().toLocalDate().isAfter(thirtyDaysAgo))
                .collect(Collectors.groupingBy(
                        u -> u.getCreatedAt().toLocalDate(),
                        Collectors.counting()));
        analytics.setDailyUserRegistration(dailyRegistration);
        
        // Avg wallets per user
        double avgWallets = totalUsers > 0 ? 
                (double) walletRepository.count() / totalUsers : 0;
        analytics.setAvgWalletsPerUser(avgWallets);
        
        // Avg transactions per user
        double avgTransactions = totalUsers > 0 ? 
                (double) transactionRepository.count() / totalUsers : 0;
        analytics.setAvgTransactionsPerUser(avgTransactions);
        
        return analytics;
    }

    // ==================== FINANCIAL HEALTH ====================

    public AdminFinancialHealthDTO getFinancialHealth() {
        AdminFinancialHealthDTO health = new AdminFinancialHealthDTO();

        // Debt overview
        List<Debt> pendingDebts = debtRepository.findByStatus(DebtStatus.PENDING);
        BigDecimal totalBorrowed = pendingDebts.stream()
                .filter(d -> d != null && d.getType() != null)
                .filter(d -> d.getType() == DebtType.BORROW)
                .map(Debt::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalLent = pendingDebts.stream()
                .filter(d -> d != null && d.getType() != null)
                .filter(d -> d.getType() == DebtType.LEND)
                .map(Debt::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        health.setTotalBorrowed(totalBorrowed);
        health.setTotalLent(totalLent);
        health.setPendingDebtsCount(pendingDebts.size());

        // Recurring transactions
        health.setActiveRecurringTransactions(
                recurringTransactionRepository.countByActive(true));

        // Saving goals
        List<SavingGoal> goals = savingGoalRepository.findAll();
        List<SavingGoal> validGoals = goals.stream()
                .filter(Objects::nonNull)
                .filter(g -> g.getTargetAmount() != null || g.getCurrentAmount() != null)
                .toList();
        health.setActiveSavingGoals(validGoals.size());

        BigDecimal totalTarget = validGoals.stream()
                .map(SavingGoal::getTargetAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCurrent = validGoals.stream()
                .map(SavingGoal::getCurrentAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalTarget.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal progress = totalCurrent.divide(totalTarget, 4, java.math.RoundingMode.HALF_UP);
            health.setSavingGoalsProgress(progress);
        }

        // Users by balance range
        List<Wallet> allWallets = walletRepository.findAll();
        Map<String, List<Wallet>> byBalance = allWallets.stream()
                .filter(Objects::nonNull)
                .filter(w -> w.getUser() != null && w.getBalance() != null)
                .collect(Collectors.groupingBy(w -> {
                    BigDecimal b = w.getBalance();
                    if (b.compareTo(BigDecimal.valueOf(1_000_000)) < 0) {
                        return "0-1M";
                    } else if (b.compareTo(BigDecimal.valueOf(10_000_000)) < 0) {
                        return "1M-10M";
                    } else {
                        return "10M+";
                    }
                }));

        Set<UUID> usersInRange0To1M = byBalance.getOrDefault("0-1M", List.of()).stream()
                .map(w -> w.getUser().getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<UUID> usersInRange1MTo10M = byBalance.getOrDefault("1M-10M", List.of()).stream()
                .map(w -> w.getUser().getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<UUID> usersInRangeAbove10M = byBalance.getOrDefault("10M+", List.of()).stream()
                .map(w -> w.getUser().getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        health.setUsersBalanceRange0To1M(usersInRange0To1M.size());
        health.setUsersBalanceRange1MTo10M(usersInRange1MTo10M.size());
        health.setUsersBalanceRangeAbove10M(usersInRangeAbove10M.size());

        return health;
    }

    // ==================== HELPER METHODS ====================

    private UserDTO toUserDTO(User user) {
        return new UserDTO(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.isActive(),
                user.getCreatedAt(),
                user.getLastLogin()
        );
    }

    private TransactionResponse toTransactionResponse(Transaction t) {
        UUID walletId = t.getWallet() != null ? t.getWallet().getId() : null;
        UUID categoryId = t.getCategory() != null ? t.getCategory().getId() : null;
        String categoryType = t.getCategory() != null && t.getCategory().getType() != null
                ? t.getCategory().getType()
                : "STANDARD";

        return new TransactionResponse(
                t.getId(),
                t.getAmount(),
                t.getDescription(),
                t.getTransactionDate(),
                walletId,
                categoryId,
                categoryType
        );
    }
}
