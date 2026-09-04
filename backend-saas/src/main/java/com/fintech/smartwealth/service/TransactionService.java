package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CreateTransactionRequest;
import com.fintech.smartwealth.dto.DebtRequest;
import com.fintech.smartwealth.dto.TransactionResponse;
import com.fintech.smartwealth.dto.TransferRequest;
import com.fintech.smartwealth.dto.UpdateTransactionRequest;
import com.fintech.smartwealth.entity.Category;
import com.fintech.smartwealth.entity.DebtType;
import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.CategoryRepository;
import com.fintech.smartwealth.repository.BudgetRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.io.InputStreamReader;
import org.springframework.web.multipart.MultipartFile;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import com.fintech.smartwealth.dto.ImportTransactionsResponse;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;
    private final SecurityUtils securityUtils;
    private final DebtService debtService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public Page<TransactionResponse> findAll(UUID walletId,
                                             UUID categoryId,
                                             String type,
                                             String keyword,
                                             LocalDateTime fromDate,
                                             LocalDateTime toDate,
                                             Pageable pageable) {
        String normalizedType = (type == null || type.isBlank()) ? null : type.trim();
        String normalizedKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        LocalDateTime normalizedFromDate = fromDate == null ? LocalDateTime.of(1, 1, 1, 0, 0) : fromDate;
        LocalDateTime normalizedToDate = toDate == null ? LocalDateTime.of(9999, 12, 31, 23, 59, 59) : toDate;

        if (securityUtils.isAdmin()) {
            if (walletId == null && categoryId == null && normalizedType == null && normalizedKeyword == null && fromDate == null && toDate == null) {
                return transactionRepository.findAll(pageable).map(this::toResponse);
            }
            return transactionRepository.findAllByFilters(walletId, categoryId, normalizedType, fromDate, toDate, normalizedKeyword, pageable)
                    .map(this::toResponse);
        }
        if (normalizedType == null && normalizedKeyword == null && walletId == null && categoryId == null && fromDate == null && toDate == null) {
            return transactionRepository.findAllByWalletUserId(securityUtils.getCurrentUserId(), "", pageable)
                .map(this::toResponse);
        }
        if (normalizedType == null) {
            return transactionRepository.findAllByWalletUserIdWithoutTypeFilter(securityUtils.getCurrentUserId(), walletId, categoryId, normalizedFromDate, normalizedToDate, normalizedKeyword == null ? "" : normalizedKeyword, pageable)
                .map(this::toResponse);
        }
        return transactionRepository.findAllByWalletUserIdAndFilters(securityUtils.getCurrentUserId(), walletId, categoryId, normalizedType, normalizedFromDate, normalizedToDate, normalizedKeyword == null ? "" : normalizedKeyword, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public TransactionResponse findById(UUID id) {
        Transaction transaction;
        if (securityUtils.isAdmin()) {
            transaction = transactionRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        } else {
            transaction = transactionRepository.findByIdAndWalletUserId(id, securityUtils.getCurrentUserId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
        }
        return toResponse(transaction);
    }

    @Transactional
    @CacheEvict(value = "user_analytics", allEntries = true)
    public TransactionResponse create(CreateTransactionRequest request) {
        Wallet wallet = walletRepository.findById(request.getWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        if (!securityUtils.isAdmin() && !wallet.getUser().getId().equals(securityUtils.getCurrentUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        validateCategoryOwnership(category, wallet.getUser().getId());

        Transaction transaction = new Transaction();
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setWallet(wallet);
        transaction.setCategory(category);
        transaction.setTransactionType("STANDARD");

        BigDecimal delta = resolveDelta(transaction.getAmount(), category.getType());
        BigDecimal updatedBalance = wallet.getBalance().add(delta);
        if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
        }

        wallet.setBalance(updatedBalance);
        walletRepository.save(wallet);
        Transaction savedTransaction = transactionRepository.save(transaction);
        createSplitDebts(request, category, savedTransaction.getAmount());
        notifyIfBudgetExceeded(wallet, category, savedTransaction.getTransactionDate());
        notifyIfAnomalousExpense(wallet, category, savedTransaction.getAmount(), savedTransaction.getTransactionDate());
        return toResponse(savedTransaction);
    }

    @Transactional
    public ImportTransactionsResponse importFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Import file is empty");
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Import file must not exceed 10 MB");
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (filename.endsWith(".xlsx")) return importRows(readXlsx(file));
        if (!filename.endsWith(".csv")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only CSV and XLSX files are supported");
        UUID userId = securityUtils.getCurrentUserId();
        int imported = 0, duplicates = 0;
        Set<String> seen = new HashSet<>();
        List<String> errors = new ArrayList<>();
        try {
            try (InputStreamReader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
                for (CSVRecord row : CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).get().parse(reader)) {
                try {
                    String description = row.get("Description").trim();
                    BigDecimal amount = new BigDecimal(row.get("Amount").trim()).abs();
                    LocalDateTime date = LocalDateTime.parse(row.get("Date").trim());
                    UUID walletId = UUID.fromString(row.get("Wallet ID").trim());
                    UUID categoryId = UUID.fromString(row.get("Category ID").trim());
                    String fingerprint = fingerprint(userId, walletId, categoryId, amount, description, date);
                    if (!seen.add(fingerprint) || transactionRepository.existsByImportFingerprintAndWalletUserId(fingerprint, userId)) { duplicates++; continue; }
                    CreateTransactionRequest request = new CreateTransactionRequest();
                    request.setDescription(description); request.setAmount(amount); request.setTransactionDate(date); request.setWalletId(walletId); request.setCategoryId(categoryId);
                    TransactionResponse saved = create(request);
                    transactionRepository.findById(saved.getId()).ifPresent(transaction -> { transaction.setImportFingerprint(fingerprint); transactionRepository.save(transaction); });
                    imported++;
                } catch (Exception exception) { errors.add("Row " + row.getRecordNumber() + ": " + exception.getMessage()); }
                }
            }
        } catch (Exception exception) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to parse CSV file", exception); }
        if (!errors.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Import failed: " + String.join("; ", errors));
        return new ImportTransactionsResponse(imported, duplicates, errors);
    }

    private ImportTransactionsResponse importRows(List<String[]> rows) {
        UUID userId = securityUtils.getCurrentUserId();
        int imported = 0, duplicates = 0;
        Set<String> seen = new HashSet<>();
        List<String> errors = new ArrayList<>();
        for (int index = 1; index < rows.size(); index++) {
            String[] row = rows.get(index);
            try {
                if (row.length < 5) throw new IllegalArgumentException("Expected Date, Description, Amount, Wallet ID, Category ID");
                String description = row[1].trim();
                BigDecimal amount = new BigDecimal(row[2].trim()).abs();
                LocalDateTime date = LocalDateTime.parse(row[0].trim());
                UUID walletId = UUID.fromString(row[3].trim());
                UUID categoryId = UUID.fromString(row[4].trim());
                String fingerprint = fingerprint(userId, walletId, categoryId, amount, description, date);
                if (!seen.add(fingerprint) || transactionRepository.existsByImportFingerprintAndWalletUserId(fingerprint, userId)) { duplicates++; continue; }
                CreateTransactionRequest request = new CreateTransactionRequest();
                request.setDescription(description); request.setAmount(amount); request.setTransactionDate(date); request.setWalletId(walletId); request.setCategoryId(categoryId);
                TransactionResponse saved = create(request);
                transactionRepository.findById(saved.getId()).ifPresent(transaction -> { transaction.setImportFingerprint(fingerprint); transactionRepository.save(transaction); });
                imported++;
            } catch (Exception exception) { errors.add("Row " + (index + 1) + ": " + exception.getMessage()); }
        }
        if (!errors.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Import failed: " + String.join("; ", errors));
        return new ImportTransactionsResponse(imported, duplicates, errors);
    }

    private List<String[]> readXlsx(MultipartFile file) {
        try (var input = file.getInputStream(); var workbook = WorkbookFactory.create(input)) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter formatter = new DataFormatter();
            Row header = sheet.getRow(sheet.getFirstRowNum());
            if (header == null) throw new IllegalArgumentException("XLSX header is missing");

            Map<String, Integer> columns = new java.util.HashMap<>();
            for (int column = 0; column < header.getLastCellNum(); column++) {
                String name = formatter.formatCellValue(header.getCell(column)).trim().toLowerCase();
                columns.put(name, column);
            }
            int dateColumn = requiredColumn(columns, "date", "transaction date", "transaction_date");
            int descriptionColumn = requiredColumn(columns, "description", "desc");
            int amountColumn = requiredColumn(columns, "amount");
            int walletColumn = requiredColumn(columns, "wallet id", "wallet_id", "walletid");
            int categoryColumn = requiredColumn(columns, "category id", "category_id", "categoryid");
            List<String[]> rows = new ArrayList<>();
            rows.add(new String[] { "Date", "Description", "Amount", "Wallet ID", "Category ID" });
            for (int index = sheet.getFirstRowNum() + 1; index <= sheet.getLastRowNum(); index++) {
                Row row = sheet.getRow(index);
                if (row == null) continue;
                String date = formatDateCell(row.getCell(dateColumn), formatter);
                String[] values = {
                        date,
                        formatter.formatCellValue(row.getCell(descriptionColumn)).trim(),
                        formatter.formatCellValue(row.getCell(amountColumn)).trim(),
                        formatter.formatCellValue(row.getCell(walletColumn)).trim(),
                        formatter.formatCellValue(row.getCell(categoryColumn)).trim()
                };
                if (java.util.Arrays.stream(values).anyMatch(value -> !value.isBlank())) rows.add(values);
            }
            return rows;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to parse XLSX file", exception);
        }
    }

    private int requiredColumn(Map<String, Integer> columns, String... names) {
        for (String name : names) {
            Integer index = columns.get(name);
            if (index != null) return index;
        }
        throw new IllegalArgumentException("XLSX column is missing: " + names[0]);
    }

    private String formatDateCell(org.apache.poi.ss.usermodel.Cell cell, DataFormatter formatter) {
        if (cell != null && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toString();
        }
        return formatter.formatCellValue(cell).trim();
    }

    private String fingerprint(UUID userId, UUID walletId, UUID categoryId, BigDecimal amount, String description, LocalDateTime date) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((userId + "|" + walletId + "|" + categoryId + "|" + amount.stripTrailingZeros() + "|" + description.toLowerCase() + "|" + date).getBytes(StandardCharsets.UTF_8))); }
        catch (Exception exception) { throw new IllegalStateException("Unable to create import fingerprint", exception); }
    }

    private void notifyIfAnomalousExpense(Wallet wallet,
                                          Category category,
                                          BigDecimal amount,
                                          LocalDateTime transactionDate) {
        if (!"EXPENSE".equalsIgnoreCase(category.getType())) {
            return;
        }

        LocalDateTime fromDate = transactionDate.minusMonths(3);
        List<Transaction> history = transactionRepository.findExpenseHistoryByUserAndCategoryBetween(
                wallet.getUser().getId(), category.getId(), fromDate, transactionDate);
        if (history.size() < 2) {
            return;
        }

        List<BigDecimal> values = history.stream()
                .map(Transaction::getAmount)
            .sorted()
            .toList();
        BigDecimal total = values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal average = total.divide(BigDecimal.valueOf(values.size()), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal variance = values.stream()
            .map(value -> value.subtract(average).pow(2))
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .divide(BigDecimal.valueOf(values.size()), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal standardDeviation = BigDecimal.valueOf(Math.sqrt(variance.doubleValue()));
        BigDecimal median = values.size() % 2 == 0
            ? values.get(values.size() / 2 - 1).add(values.get(values.size() / 2)).divide(BigDecimal.valueOf(2), 2, java.math.RoundingMode.HALF_UP)
            : values.get(values.size() / 2);
        BigDecimal threshold = average.add(standardDeviation.multiply(BigDecimal.valueOf(2))).max(median.multiply(BigDecimal.valueOf(2)));
        if (amount.compareTo(threshold) > 0) {
            notificationService.sendNotification(wallet.getUser().getId(),
                    "Cảnh báo: Bạn vừa chi một khoản " + category.getName()
                    + " cao bất thường so với thói quen 3 tháng qua!");
        }
    }

    private void notifyIfBudgetExceeded(Wallet wallet, Category category, LocalDateTime transactionDate) {
        if (!"EXPENSE".equalsIgnoreCase(category.getType())) {
            return;
        }
        YearMonth month = YearMonth.from(transactionDate);
        budgetRepository.findByUserIdAndCategoryIdAndMonthAndYear(
                        wallet.getUser().getId(), category.getId(), month.getMonthValue(), month.getYear())
                .ifPresent(budget -> {
                    BigDecimal spent = transactionRepository.sumExpenseByUserAndCategoryBetween(
                            wallet.getUser().getId(), category.getId(), month.atDay(1).atStartOfDay(), month.plusMonths(1).atDay(1).atStartOfDay());
                    if (spent.compareTo(budget.getAmount()) > 0) {
                        notificationService.sendNotification(wallet.getUser().getId(),
                                "Budget alert: " + category.getName() + " spending has exceeded your monthly budget.");
                    }
                });
    }

    private void createSplitDebts(CreateTransactionRequest request, Category category, BigDecimal totalAmount) {
        List<String> names = request.getSplitWithNames() == null ? List.of() : request.getSplitWithNames().stream()
                .map(name -> name == null ? "" : name.trim())
                .filter(name -> !name.isEmpty())
                .toList();
        if (!Boolean.TRUE.equals(request.getIsSplit()) || names.isEmpty()) {
            return;
        }
        if (!"EXPENSE".equalsIgnoreCase(category.getType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only expense transactions can be split");
        }

        BigDecimal splitAmount = totalAmount.divide(BigDecimal.valueOf(names.size() + 1L), 2, java.math.RoundingMode.HALF_UP);
        for (String name : names) {
            debtService.create(new DebtRequest(name, splitAmount, DebtType.LEND, null, "Split bill: " + request.getDescription()));
        }
    }

    @Transactional
    @CacheEvict(value = "user_analytics", allEntries = true)
    public TransactionResponse transferFunds(TransferRequest request) {
        if (request.getFromWalletId().equals(request.getToWalletId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Source and destination wallets must be different");
        }

        Wallet fromWallet = walletRepository.findById(request.getFromWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Source wallet not found"));
        Wallet toWallet = walletRepository.findById(request.getToWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Destination wallet not found"));

        if (!securityUtils.isAdmin()) {
            UUID currentUserId = securityUtils.getCurrentUserId();
            if (!fromWallet.getUser().getId().equals(currentUserId)
                    || !toWallet.getUser().getId().equals(currentUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
            }
        }

        if (fromWallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient wallet balance");
        }

        Category transferCategory = categoryRepository.findByUserIdAndName(fromWallet.getUser().getId(), "Transfer")
                .orElseGet(() -> {
                    Category category = new Category();
                    category.setName("Transfer");
                    category.setType("TRANSFER");
                    category.setUser(fromWallet.getUser());
                    return categoryRepository.save(category);
                });

        fromWallet.setBalance(fromWallet.getBalance().subtract(request.getAmount()));
        toWallet.setBalance(toWallet.getBalance().add(request.getAmount()));
        walletRepository.save(fromWallet);
        walletRepository.save(toWallet);

        Transaction outgoing = createTransferTransaction(fromWallet, transferCategory, request, "Transfer out");
        Transaction incoming = createTransferTransaction(toWallet, transferCategory, request, "Transfer in");
        transactionRepository.save(outgoing);
        return toResponse(transactionRepository.save(incoming));
    }

    @Transactional
    @CacheEvict(value = "user_analytics", allEntries = true)
    public TransactionResponse update(UUID id, UpdateTransactionRequest request) {
        Transaction existing = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        if ("TRANSFER".equalsIgnoreCase(existing.getTransactionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer transactions cannot be updated");
        }

        Wallet oldWallet = walletRepository.findById(existing.getWallet().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        Wallet newWallet = walletRepository.findById(request.getWalletId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));

        if (!securityUtils.isAdmin()) {
            UUID currentUserId = securityUtils.getCurrentUserId();
            if (!oldWallet.getUser().getId().equals(currentUserId) || !newWallet.getUser().getId().equals(currentUserId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
            }
        }
        validateCategoryOwnership(category, newWallet.getUser().getId());

        BigDecimal oldDelta = resolveDelta(existing.getAmount(), existing.getCategory().getType());
        BigDecimal newDelta = resolveDelta(request.getAmount(), category.getType());

        if (oldWallet.getId().equals(newWallet.getId())) {
            BigDecimal updatedBalance = oldWallet.getBalance().subtract(oldDelta).add(newDelta);
            if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
            }
            oldWallet.setBalance(updatedBalance);
            walletRepository.save(oldWallet);
        } else {
            BigDecimal oldWalletBalance = oldWallet.getBalance().subtract(oldDelta);
            BigDecimal newWalletBalance = newWallet.getBalance().add(newDelta);
            if (oldWalletBalance.compareTo(BigDecimal.ZERO) < 0 || newWalletBalance.compareTo(BigDecimal.ZERO) < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
            }
            oldWallet.setBalance(oldWalletBalance);
            newWallet.setBalance(newWalletBalance);
            walletRepository.save(oldWallet);
            walletRepository.save(newWallet);
        }

        existing.setAmount(request.getAmount());
        existing.setDescription(request.getDescription());
        existing.setTransactionDate(request.getTransactionDate());
        existing.setWallet(newWallet);
        existing.setCategory(category);

        return toResponse(transactionRepository.save(existing));
    }

    @Transactional
    @CacheEvict(value = "user_analytics", allEntries = true)
    public void delete(UUID id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));

        if ("TRANSFER".equalsIgnoreCase(transaction.getTransactionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transfer transactions cannot be deleted");
        }

        Wallet wallet = walletRepository.findById(transaction.getWallet().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        if (!securityUtils.isAdmin() && !wallet.getUser().getId().equals(securityUtils.getCurrentUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        BigDecimal updatedBalance = wallet.getBalance().subtract(resolveDelta(transaction.getAmount(), transaction.getCategory().getType()));
        if (updatedBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance would become negative");
        }

        wallet.setBalance(updatedBalance);
        walletRepository.save(wallet);
        transactionRepository.deleteById(id);
    }

    public BigDecimal getTotalExpenseByWalletId(UUID walletId) {
        Wallet wallet = walletRepository.findById(walletId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));

        if (!securityUtils.isAdmin() && !wallet.getUser().getId().equals(securityUtils.getCurrentUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return transactionRepository.sumExpenseByWalletId(walletId);
    }

    private BigDecimal resolveDelta(Transaction transaction) {
        return resolveDelta(transaction.getAmount(), transaction.getCategory() == null ? null : transaction.getCategory().getType());
    }

    private void validateCategoryOwnership(Category category, UUID userId) {
        if (!securityUtils.isAdmin()
            && category.getUser() != null
            && !category.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Category access denied");
        }
    }

    private BigDecimal resolveDelta(BigDecimal amount, String categoryType) {
        if (categoryType == null) {
            return BigDecimal.ZERO;
        }
        return "EXPENSE".equalsIgnoreCase(categoryType)
                ? amount.negate()
                : amount;
    }

    private Transaction createTransferTransaction(Wallet wallet, Category category, TransferRequest request, String direction) {
        Transaction transaction = new Transaction();
        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription() + " (" + direction + ")");
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setWallet(wallet);
        transaction.setCategory(category);
        transaction.setTransactionType("TRANSFER");
        return transaction;
    }

    private TransactionResponse toResponse(Transaction transaction) {
        UUID walletId = transaction.getWallet() != null ? transaction.getWallet().getId() : null;
        UUID categoryId = transaction.getCategory() != null ? transaction.getCategory().getId() : null;
        String type = "TRANSFER".equalsIgnoreCase(transaction.getTransactionType())
                ? "TRANSFER"
                : (transaction.getCategory() != null && transaction.getCategory().getType() != null
                    ? transaction.getCategory().getType().toUpperCase()
                    : "STANDARD");

        String userName = transaction.getWallet() != null && transaction.getWallet().getUser() != null
                ? transaction.getWallet().getUser().getFullName()
                : null;
        String userEmail = transaction.getWallet() != null && transaction.getWallet().getUser() != null
                ? transaction.getWallet().getUser().getEmail()
                : null;

        return new TransactionResponse(
                transaction.getId(),
                transaction.getAmount(),
                transaction.getDescription(),
                transaction.getTransactionDate(),
                walletId,
                categoryId,
                type,
                userName,
                userEmail
        );
    }
}
