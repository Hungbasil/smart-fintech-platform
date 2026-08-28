package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CalendarEventDTO;
import com.fintech.smartwealth.entity.Debt;
import com.fintech.smartwealth.entity.DebtStatus;
import com.fintech.smartwealth.entity.DebtType;
import com.fintech.smartwealth.entity.RecurringTransaction;
import com.fintech.smartwealth.repository.DebtRepository;
import com.fintech.smartwealth.repository.RecurringTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CalendarService {

    private final DebtRepository debtRepository;
    private final RecurringTransactionRepository recurringRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public List<CalendarEventDTO> findEvents(java.util.UUID userId) {
        LocalDate today = LocalDate.now();
        List<CalendarEventDTO> events = new ArrayList<>();
        debtRepository.findByUserIdOrderByStatusAscDueDateAsc(userId).stream()
                .filter(debt -> debt.getStatus() == DebtStatus.PENDING && debt.getDueDate() != null)
                .map(this::toDebtEvent)
                .forEach(events::add);
        recurringRepository.findByUserId(userId).stream()
                .filter(RecurringTransaction::isActive)
                .map(item -> toRecurringEvent(item, today))
                .forEach(events::add);
        return events;
    }

    @Scheduled(cron = "0 0 9 * * ?")
    @Transactional(readOnly = true)
    public void checkUpcomingBills() {
        LocalDate today = LocalDate.now();
        LocalDate limit = today.plusDays(3);
        debtRepository.findAll().stream()
                .filter(debt -> debt.getStatus() == DebtStatus.PENDING
                        && debt.getDueDate() != null
                        && !debt.getDueDate().isBefore(today)
                        && !debt.getDueDate().isAfter(limit))
                .forEach(debt -> {
                    String message = "Nhắc nợ: khoản " + debt.getCounterpartyName()
                            + " đến hạn ngày " + debt.getDueDate() + " với số tiền " + debt.getAmount() + ".";
                    notificationService.sendNotification(debt.getUser().getId(), message);
                    emailService.sendDebtReminderEmail(debt.getUser().getEmail(), message);
                });
    }

    private CalendarEventDTO toDebtEvent(Debt debt) {
        return new CalendarEventDTO(debt.getId(), debt.getCounterpartyName(), debt.getDueDate(), debt.getAmount(),
                debt.getType() == DebtType.BORROW ? "DEBT_PAYABLE" : "DEBT_RECEIVABLE");
    }

    private CalendarEventDTO toRecurringEvent(RecurringTransaction item, LocalDate today) {
        YearMonth month = YearMonth.from(today);
        int day = Math.min(item.getDayOfMonth(), month.lengthOfMonth());
        return new CalendarEventDTO(item.getId(), item.getDescription(), month.atDay(day), item.getAmount(),
                "SUBSCRIPTION");
    }
}