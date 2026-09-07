package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CsvExportService {
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final TransactionRepository transactionRepository;
    private final SecurityUtils securityUtils;

    public byte[] generateCurrentUserReport(UUID walletId, UUID categoryId, String type,
                                            java.time.LocalDateTime fromDate,
                                            java.time.LocalDateTime toDate) {
        var transactions = transactionRepository.findAllByWalletUserIdAndFilters(
                securityUtils.getCurrentUserId(), walletId, categoryId, type, fromDate, toDate, "",
                Pageable.unpaged(Sort.by(Sort.Direction.DESC, "transactionDate"))).getContent();
        StringBuilder csv = new StringBuilder("Date,Description,Type,Amount,Wallet,Category,Transaction type\r\n");
        for (Transaction transaction : transactions) {
            appendRow(csv,
                    transaction.getTransactionDate().format(DATE_FORMAT),
                    transaction.getDescription(),
                    transaction.getCategory().getType(),
                    transaction.getAmount(),
                    transaction.getWallet().getName(),
                    transaction.getCategory().getName(),
                    transaction.getTransactionType());
        }
        return ("\uFEFF" + csv).getBytes(StandardCharsets.UTF_8);
    }

    private void appendRow(StringBuilder csv, Object... values) {
        for (int index = 0; index < values.length; index++) {
            if (index > 0) csv.append(',');
            csv.append(escape(values[index]));
        }
        csv.append("\r\n");
    }

    private String escape(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        return '"' + text.replace("\"", "\"\"") + '"';
    }
}