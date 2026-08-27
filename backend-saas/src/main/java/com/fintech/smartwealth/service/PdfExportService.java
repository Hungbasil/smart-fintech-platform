package com.fintech.smartwealth.service;

import com.fintech.smartwealth.entity.Transaction;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.Element;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PdfExportService {
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter MONTH_FORMAT = DateTimeFormatter.ofPattern("MM/yyyy");
    private static final NumberFormat MONEY_FORMAT = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
    private static final java.awt.Color TEAL = new java.awt.Color(8, 127, 116);
    private static final java.awt.Color INK = new java.awt.Color(23, 33, 43);
    private static final java.awt.Color MUTED = new java.awt.Color(113, 128, 140);
    private static final java.awt.Color PALE_TEAL = new java.awt.Color(228, 244, 240);
    private static final java.awt.Color PALE_RED = new java.awt.Color(255, 241, 239);
    private static final java.awt.Color LINE = new java.awt.Color(227, 235, 232);

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
            PdfWriter writer = PdfWriter.getInstance(document, output);
            writer.setPageEvent(new ReportFooter());
            document.open();

            addHeader(document, user, month);
            addSectionTitle(document, "TONG QUAN THANG");
            addSummaryCards(document, income, expense, income.subtract(expense));
            addSectionTitle(document, "10 GIAO DICH GAN NHAT");

            PdfPTable table = new PdfPTable(new float[]{2.1f, 4.2f, 2.1f});
            table.setWidthPercentage(100);
            table.setSpacingBefore(4);
            table.setHeaderRows(1);
            addHeader(table, "Ngay");
            addHeader(table, "Mo ta");
            addHeader(table, "So tien");
            for (int index = 0; index < transactions.size(); index++) {
                Transaction transaction = transactions.get(index);
                addCell(table, transaction.getTransactionDate().format(DATE_FORMAT), index % 2 == 1, Element.ALIGN_LEFT);
                addCell(table, safe(transaction.getDescription()), index % 2 == 1, Element.ALIGN_LEFT);
                addCell(table, formatMoney(transaction.getAmount()), index % 2 == 1, Element.ALIGN_RIGHT);
            }
            if (transactions.isEmpty()) {
                PdfPCell empty = new PdfPCell(new Phrase("Chua co giao dich trong thang nay", bodyFont(MUTED)));
                empty.setColspan(3);
                empty.setPadding(12);
                empty.setHorizontalAlignment(Element.ALIGN_CENTER);
                empty.setBorderColor(LINE);
                table.addCell(empty);
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
        PdfPCell cell = new PdfPCell(new Phrase(text, bodyFont(java.awt.Color.WHITE, Font.BOLD)));
        cell.setBackgroundColor(TEAL);
        cell.setBorderColor(TEAL);
        cell.setPadding(8);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        table.addCell(cell);
    }

    private void addHeader(Document document, User user, LocalDate month) throws DocumentException {
        PdfPTable header = new PdfPTable(new float[]{1.4f, 3.6f});
        header.setWidthPercentage(100);
        header.setSpacingAfter(20);

        PdfPCell brand = new PdfPCell(new Phrase("SMART\nFINTECH", bodyFont(TEAL, Font.BOLD, 15)));
        brand.setBorder(Rectangle.NO_BORDER);
        brand.setVerticalAlignment(Element.ALIGN_MIDDLE);
        header.addCell(brand);

        PdfPCell title = new PdfPCell();
        title.setBorder(Rectangle.NO_BORDER);
        title.setHorizontalAlignment(Element.ALIGN_RIGHT);
        Paragraph heading = new Paragraph("BAO CAO TAI CHINH", bodyFont(INK, Font.BOLD, 19));
        heading.setAlignment(Element.ALIGN_RIGHT);
        title.addElement(heading);
        Paragraph period = new Paragraph("Thang " + month.format(MONTH_FORMAT), bodyFont(TEAL, Font.BOLD, 11));
        period.setAlignment(Element.ALIGN_RIGHT);
        title.addElement(period);
        header.addCell(title);
        document.add(header);

        PdfPTable profile = new PdfPTable(new float[]{1.1f, 3.9f});
        profile.setWidthPercentage(100);
        profile.setSpacingAfter(20);
        addProfileCell(profile, "TAI KHOAN", safe(user.getFullName()) + "  |  " + user.getEmail());
        addProfileCell(profile, "PHAM VI", "Tong hop cac vi va giao dich cua tai khoan");
        document.add(profile);
    }

    private void addProfileCell(PdfPTable table, String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(PALE_TEAL);
        cell.setBorderColor(PALE_TEAL);
        cell.setPadding(9);
        cell.addElement(new Paragraph(label, bodyFont(TEAL, Font.BOLD, 8)));
        cell.addElement(new Paragraph(value, bodyFont(INK, Font.NORMAL, 9)));
        table.addCell(cell);
    }

    private void addSectionTitle(Document document, String text) throws DocumentException {
        Paragraph title = new Paragraph(text, bodyFont(INK, Font.BOLD, 11));
        title.setSpacingBefore(4);
        title.setSpacingAfter(8);
        document.add(title);
    }

    private void addSummaryCards(Document document, BigDecimal income, BigDecimal expense, BigDecimal net) throws DocumentException {
        PdfPTable cards = new PdfPTable(3);
        cards.setWidthPercentage(100);
        cards.setWidths(new float[]{1, 1, 1});
        addSummaryCard(cards, "TONG THU", income, PALE_TEAL, TEAL);
        addSummaryCard(cards, "TONG CHI", expense, PALE_RED, new java.awt.Color(199, 83, 68));
        addSummaryCard(cards, "SO DU RONG", net, new java.awt.Color(255, 244, 223), new java.awt.Color(189, 122, 34));
        document.add(cards);
        document.add(new Paragraph(" "));
    }

    private void addSummaryCard(PdfPTable table, String label, BigDecimal amount, java.awt.Color background, java.awt.Color accent) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(background);
        cell.setBorderColor(background);
        cell.setPadding(11);
        cell.setMinimumHeight(54);
        cell.addElement(new Paragraph(label, bodyFont(accent, Font.BOLD, 8)));
        cell.addElement(new Paragraph(formatMoney(amount), bodyFont(INK, Font.BOLD, 12)));
        table.addCell(cell);
    }

    private void addCell(PdfPTable table, String text, boolean alternate, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, bodyFont(INK, Font.NORMAL, 9)));
        cell.setBackgroundColor(alternate ? new java.awt.Color(248, 251, 250) : java.awt.Color.WHITE);
        cell.setBorderColor(LINE);
        cell.setPadding(8);
        cell.setHorizontalAlignment(alignment);
        table.addCell(cell);
    }

    private Font bodyFont(java.awt.Color color) {
        return bodyFont(color, Font.NORMAL, 9);
    }

    private Font bodyFont(java.awt.Color color, int style) {
        return bodyFont(color, style, 9);
    }

    private Font bodyFont(java.awt.Color color, int style, float size) {
        return new Font(Font.HELVETICA, size, style, color);
    }

    private String formatMoney(BigDecimal amount) {
        return MONEY_FORMAT.format(amount == null ? BigDecimal.ZERO : amount);
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }

    private static class ReportFooter extends PdfPageEventHelper {
        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            PdfPTable footer = new PdfPTable(2);
            footer.setTotalWidth(document.right() - document.left());
            footer.setWidths(new float[]{4, 1});
            footer.getDefaultCell().setBorder(Rectangle.TOP);
            footer.getDefaultCell().setBorderColor(LINE);
            footer.getDefaultCell().setPaddingTop(6);
            footer.addCell(new Phrase("SmartFin  |  Bao cao tai chinh ca nhan", new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED)));
            PdfPCell page = new PdfPCell(new Phrase("Trang " + writer.getPageNumber(), new Font(Font.HELVETICA, 8, Font.NORMAL, MUTED)));
            page.setBorder(Rectangle.TOP);
            page.setBorderColor(LINE);
            page.setPaddingTop(6);
            page.setHorizontalAlignment(Element.ALIGN_RIGHT);
            footer.addCell(page);
            footer.writeSelectedRows(0, -1, document.left(), document.bottom() - 10, writer.getDirectContent());
        }
    }
}