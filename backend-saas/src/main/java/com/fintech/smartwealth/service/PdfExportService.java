package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PdfExportService {
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;

    public byte[] generateMonthlyReport(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        var month = LocalDate.now().withDayOfMonth(1);
        var summaryProjection = transactionRepository.getAnalyticsSummary(
            userId, null, month.atStartOfDay(), month.plusMonths(1).atStartOfDay());
        var income = summaryProjection.getIncome() == null ? java.math.BigDecimal.ZERO : summaryProjection.getIncome();
        var expense = summaryProjection.getExpense() == null ? java.math.BigDecimal.ZERO : summaryProjection.getExpense();
        var transactions = transactionRepository.findTop10ByWalletUserIdOrderByTransactionDateDesc(userId);

        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try {
            Document document = new Document(PageSize.A4, 36, 36, 42, 36);
            PdfWriter.getInstance(document, output);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Font headingFont = new Font(Font.HELVETICA, 12, Font.BOLD);
            document.add(new Paragraph("BAO CAO TAI CHINH THANG", titleFont));
            document.add(new Paragraph("Nguoi dung: " + safe(user.getFullName()) + " (" + user.getEmail() + ")"));
            document.add(new Paragraph(" "));
            document.add(new Paragraph("TONG QUAN", headingFont));
            document.add(new Paragraph("Tong thu: " + income));
            document.add(new Paragraph("Tong chi: " + expense));
            document.add(new Paragraph("So du: " + income.subtract(expense)));
            document.add(new Paragraph(" "));

            PdfPTable table = new PdfPTable(new float[]{2.1f, 4.2f, 2.1f});
            table.setWidthPercentage(100);
            addHeader(table, "Ngay");
            addHeader(table, "Mo ta");
            addHeader(table, "So tien");
            for (Transaction transaction : transactions) {
                table.addCell(transaction.getTransactionDate().format(DATE_FORMAT));
                table.addCell(safe(transaction.getDescription()));
                table.addCell(transaction.getAmount().toPlainString());
            }
            document.add(table);
            document.close();
            return output.toByteArray();
        } catch (DocumentException exception) {
            throw new IllegalStateException("Unable to generate financial report", exception);
        }
    }

    public byte[] generateCurrentUserReport() {
        return generateMonthlyReport(securityUtils.getCurrentUserId());
    }

    private void addHeader(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, new Font(Font.HELVETICA, 10, Font.BOLD)));
        cell.setGrayFill(0.85f);
        table.addCell(cell);
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}