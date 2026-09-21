package com.fintech.smartwealth.dto;

import com.fintech.smartwealth.entity.DebtStatus;
import com.fintech.smartwealth.entity.DebtType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record DebtResponse(
        UUID id,
        String counterpartyName,
        BigDecimal amount,
        DebtType type,
        DebtStatus status,
        LocalDate dueDate,
        String description
) {
}
