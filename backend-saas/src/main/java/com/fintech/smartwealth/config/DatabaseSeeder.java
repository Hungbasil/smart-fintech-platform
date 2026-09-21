package com.fintech.smartwealth.config;

import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.Role;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@ConditionalOnProperty(prefix = "seed", name = "enabled", havingValue = "true", matchIfMissing = false)
@RequiredArgsConstructor
public class DatabaseSeeder implements CommandLineRunner {

    private static final DateTimeFormatter[] DATE_FORMATTERS = {
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"),
            DateTimeFormatter.ofPattern("M/d/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd")
    };

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${seed.analytics-dir:../analytics-brain}")
    private String analyticsDir;

    private final Map<UUID, Wallet> csvWalletMap = new HashMap<>();

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        ensureDefaultAdminUser();

        if (userRepository.count() > 0 || walletRepository.count() > 0) {
            log.info("Database already has data — skipping CSV import.");
            return;
        }

        Path analyticsDir = resolveAnalyticsDir();
        Path walletsFile = analyticsDir.resolve("wallets_to_insert.csv");
        Path transactionsFile = analyticsDir.resolve("cleaned_transactions.csv");

        if (!Files.exists(walletsFile)) {
            log.warn("Wallet CSV not found at {} — skipping seed.", walletsFile);
            return;
        }

        int userCount = seedUsersAndWallets(walletsFile);
        int walletCount = (int) walletRepository.count();
        int categoryCount = 0;
        int transactionCount = 0;

        if (Files.exists(transactionsFile)) {
            SeedResult result = seedTransactions(transactionsFile);
            categoryCount = result.categoryCount();
            transactionCount = result.transactionCount();
            recalculateWalletBalances(result.walletBalances());
        } else {
            log.warn("Transaction CSV not found at {} — wallets imported without transactions.", transactionsFile);
        }

        log.info("=== Database seeding complete ===");
        log.info("Users imported:       {}", userCount);
        log.info("Wallets imported:     {}", walletCount);
        log.info("Categories imported:  {}", categoryCount);
        log.info("Transactions imported: {}", transactionCount);
    }

    private void ensureDefaultAdminUser() {
        String adminEmail = "admin@smartfin.com";
        userRepository.findByEmail(adminEmail).ifPresentOrElse(
                user -> log.info("Default admin exists: {}", adminEmail),
                () -> {
                    User admin = new User();
                    admin.setFullName("System Administrator");
                    admin.setEmail(adminEmail);
                    admin.setPassword(passwordEncoder.encode("Admin123!"));
                    admin.setRole(Role.ADMIN);
                    admin.setActive(true);
                    userRepository.save(admin);
                    log.info("Created default admin account: {}", adminEmail);
                }
        );
    }

    private int seedUsersAndWallets(Path file) throws IOException {
        Map<UUID, User> users = new LinkedHashMap<>();
        PasswordEncoder encoder = passwordEncoder == null ? new BCryptPasswordEncoder() : passwordEncoder;

        try (Reader reader = openCsvReader(file);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            for (CSVRecord record : parser) {
                UUID userId = UUID.fromString(col(record, "user_id"));
                users.computeIfAbsent(userId, id -> {
                    User user = new User();
                    user.setFullName("Mock User " + id.toString().substring(0, 8));
                    user.setEmail("user-" + id + "@seed.local");
                    user.setPassword(encoder.encode("seed123"));
                    return userRepository.save(user);
                });

                Wallet wallet = new Wallet();
                String walletId = colOptional(record, "id", "wallet_id");
                if (walletId != null && !walletId.isBlank()) {
                    wallet.setId(UUID.fromString(walletId));
                }
                wallet.setName(col(record, "name"));

                String balanceValue = colOptional(record, "balance");
                wallet.setBalance(balanceValue == null || balanceValue.isBlank()
                        ? BigDecimal.ZERO
                        : parseAmount(balanceValue));
                wallet.setUser(users.get(userId));
                Wallet savedWallet = walletRepository.save(wallet);
                if (walletId != null && !walletId.isBlank()) {
                    csvWalletMap.put(UUID.fromString(walletId), savedWallet);
                }
            }
        }

        return users.size();
    }

    private SeedResult seedTransactions(Path file) throws IOException {
        Map<UUID, Wallet> walletMap = new HashMap<>(csvWalletMap);

        Map<String, Category> categoryMap = new HashMap<>();
        Map<UUID, BigDecimal> walletBalances = new HashMap<>();
        List<Transaction> transactions = new ArrayList<>();

        try (Reader reader = openCsvReader(file);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreHeaderCase(true)
                     .setTrim(true)
                     .build()
                     .parse(reader)) {

            for (CSVRecord record : parser) {
                UUID walletId = UUID.fromString(col(record, "wallet_id", "walletId"));
                Wallet wallet = walletMap.get(walletId);
                if (wallet == null) {
                    log.warn("Skipping transaction — wallet not found: {}", walletId);
                    continue;
                }

                BigDecimal rawAmount = parseAmount(col(record, "amount"));
                String description = col(record, "description", "desc");
                if (description == null || description.isBlank()) {
                    description = "Uncategorized";
                }

                String type = resolveType(record, rawAmount);
                BigDecimal amount = rawAmount.abs();

                String categoryName = description;
                String categoryType = type;
                User categoryOwner = wallet.getUser();
                String categoryKey = categoryOwner.getId() + "|" + categoryName;
                Category category = categoryMap.computeIfAbsent(categoryKey, key -> {
                    Category c = new Category();
                    c.setName(categoryName);
                    c.setType(categoryType);
                    c.setUser(categoryOwner);
                    return categoryRepository.save(c);
                });

                Transaction transaction = new Transaction();
                transaction.setAmount(amount);
                transaction.setDescription(description);
                transaction.setTransactionDate(parseDate(col(record, "transaction_date", "date", "created_at")));
                transaction.setWallet(wallet);
                transaction.setCategory(category);
                transactions.add(transaction);

                BigDecimal delta = "INCOME".equals(type) ? amount : amount.negate();
                walletBalances.merge(walletId, delta, BigDecimal::add);
            }
        }

        transactionRepository.saveAll(transactions);
        return new SeedResult(categoryMap.size(), transactions.size(), walletBalances);
    }

    private void recalculateWalletBalances(Map<UUID, BigDecimal> walletBalances) {
        for (Map.Entry<UUID, BigDecimal> entry : walletBalances.entrySet()) {
            walletRepository.findById(entry.getKey()).ifPresent(wallet -> {
                wallet.setBalance(entry.getValue());
                walletRepository.save(wallet);
            });
        }
    }

    private String resolveType(CSVRecord record, BigDecimal amount) {
        String type = colOptional(record, "transaction_type", "category_type");
        if (type != null) {
            return normalizeType(type);
        }
        return amount.signum() >= 0 ? "INCOME" : "EXPENSE";
    }

    private String normalizeType(String type) {
        String upper = type.trim().toUpperCase();
        if (upper.contains("INCOME") || upper.equals("IN")) {
            return "INCOME";
        }
        return "EXPENSE";
    }

    private BigDecimal parseAmount(String value) {
        if (value == null || value.isBlank()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(value.replace(",", "").trim());
    }

    private LocalDateTime parseDate(String value) {
        if (value == null || value.isBlank()) {
            return LocalDateTime.now();
        }
        String trimmed = value.trim();
        for (DateTimeFormatter formatter : DATE_FORMATTERS) {
            try {
                if (formatter.equals(DATE_FORMATTERS[3]) || formatter.equals(DATE_FORMATTERS[4])) {
                    return LocalDate.parse(trimmed, formatter).atStartOfDay();
                }
                return LocalDateTime.parse(trimmed, formatter);
            } catch (Exception ignored) {
                // try next format
            }
        }
        return LocalDateTime.now();
    }

    private String col(CSVRecord record, String... candidates) {
        for (String candidate : candidates) {
            if (record.isMapped(candidate)) {
                String value = record.get(candidate);
                if (value != null && !value.isBlank()) {
                    return value.trim();
                }
            }
        }
        for (String header : record.getParser().getHeaderMap().keySet()) {
            String normalizedHeader = stripBom(header).trim();
            for (String candidate : candidates) {
                if (normalizedHeader.equalsIgnoreCase(candidate)) {
                    String value = record.get(header);
                    if (value != null && !value.isBlank()) {
                        return value.trim();
                    }
                }
            }
        }
        throw new IllegalArgumentException("Missing column: " + String.join("/", candidates));
    }

    private String colOptional(CSVRecord record, String... candidates) {
        try {
            return col(record, candidates);
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private Reader openCsvReader(Path file) throws IOException {
        String content = Files.readString(file, StandardCharsets.UTF_8);
        if (content.startsWith("\uFEFF")) {
            content = content.substring(1);
        }
        return new StringReader(content);
    }

    private Path resolveAnalyticsDir() {
        Path configuredDir = Path.of(analyticsDir).toAbsolutePath().normalize();
        if (Files.isDirectory(configuredDir)) {
            return configuredDir;
        }

        Path cwd = Path.of(System.getProperty("user.dir"));
        List<Path> candidates = List.of(
                cwd.resolve("../analytics-brain"),
                cwd.resolve("analytics-brain"),
                cwd.getParent() != null ? cwd.getParent().resolve("analytics-brain") : cwd
        );
        for (Path candidate : candidates) {
            Path dir = candidate.normalize();
            if (Files.isDirectory(dir)) {
                return dir;
            }
        }
        return cwd.resolve("../analytics-brain").normalize();
    }

    private String stripBom(String value) {
        return value != null && value.startsWith("\uFEFF") ? value.substring(1) : value;
    }

    private record SeedResult(int categoryCount, int transactionCount, Map<UUID, BigDecimal> walletBalances) {
    }
}
