package com.fintech.smartwealth.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SavingGoalResponse(UUID id, String name, BigDecimal targetAmount, BigDecimal currentAmount, LocalDate deadline) {}