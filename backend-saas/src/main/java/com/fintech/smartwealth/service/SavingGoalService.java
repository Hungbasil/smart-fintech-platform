package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.AddSavingGoalFundsRequest;
import com.fintech.smartwealth.dto.SavingGoalRequest;
import com.fintech.smartwealth.dto.SavingGoalResponse;
import com.fintech.smartwealth.dto.SavingGoalMonthlyContribution;
import com.fintech.smartwealth.entity.SavingGoalContribution;
import com.fintech.smartwealth.entity.SavingGoal;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.SavingGoalContributionRepository;
import com.fintech.smartwealth.repository.SavingGoalRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavingGoalService {
    private final SavingGoalRepository savingGoalRepository;
    private final SavingGoalContributionRepository contributionRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;

    public List<SavingGoalResponse> findAll() {
        return savingGoalRepository.findByUserId(securityUtils.getCurrentUserId()).stream().map(this::toResponse).toList();
    }

    @Transactional
    public SavingGoalResponse create(SavingGoalRequest request) {
        User user = currentUser();
        SavingGoal goal = new SavingGoal();
        goal.setUser(user);
        goal.setName(request.getName().trim());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setCurrentAmount(BigDecimal.ZERO);
        goal.setDeadline(request.getDeadline());
        return toResponse(savingGoalRepository.save(goal));
    }

    @Transactional
    public SavingGoalResponse update(UUID id, SavingGoalRequest request) {
        SavingGoal goal = ownedGoal(id);
        if (request.getTargetAmount().compareTo(goal.getCurrentAmount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target amount cannot be below current amount");
        }
        goal.setName(request.getName().trim());
        goal.setTargetAmount(request.getTargetAmount());
        goal.setDeadline(request.getDeadline());
        return toResponse(savingGoalRepository.save(goal));
    }

    @Transactional
    public SavingGoalResponse addFunds(UUID id, AddSavingGoalFundsRequest request) {
        SavingGoal goal = ownedGoal(id);
        BigDecimal updatedAmount = goal.getCurrentAmount().add(request.getAmount());
        if (updatedAmount.compareTo(goal.getTargetAmount()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount would exceed the saving goal target");
        }
        goal.setCurrentAmount(updatedAmount);
        SavingGoal saved = savingGoalRepository.save(goal);
        SavingGoalContribution contribution = new SavingGoalContribution();
        contribution.setSavingGoal(saved);
        contribution.setAmount(request.getAmount());
        contributionRepository.save(contribution);
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID id) {
        savingGoalRepository.delete(ownedGoal(id));
    }

    private User currentUser() {
        return userRepository.findById(securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private SavingGoal ownedGoal(UUID id) {
        return savingGoalRepository.findByIdAndUserId(id, securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Saving goal not found"));
    }

    private SavingGoalResponse toResponse(SavingGoal goal) {
        List<SavingGoalContribution> contributions = contributionRepository.findBySavingGoalIdOrderByContributedAtDesc(goal.getId());
        Map<YearMonth, BigDecimal> monthlyTotals = new HashMap<>();
        contributions.forEach(item -> monthlyTotals.merge(YearMonth.from(item.getContributedAt()), item.getAmount(), BigDecimal::add));
        List<SavingGoalMonthlyContribution> monthly = new ArrayList<>();
        YearMonth currentMonth = YearMonth.now();
        for (int index = 5; index >= 0; index--) {
            YearMonth month = currentMonth.minusMonths(index);
            monthly.add(new SavingGoalMonthlyContribution(month.toString(), monthlyTotals.getOrDefault(month, BigDecimal.ZERO)));
        }

        BigDecimal remaining = goal.getTargetAmount().subtract(goal.getCurrentAmount()).max(BigDecimal.ZERO);
        BigDecimal requiredMonthly = BigDecimal.ZERO;
        if (remaining.signum() > 0 && goal.getDeadline() != null && goal.getDeadline().isAfter(LocalDate.now())) {
            long months = Math.max(1, ChronoUnit.MONTHS.between(YearMonth.now().atDay(1), YearMonth.from(goal.getDeadline()).atDay(1)) + 1);
            requiredMonthly = remaining.divide(BigDecimal.valueOf(months), 2, RoundingMode.CEILING);
        }

        LocalDate projectedDate = null;
        if (remaining.signum() == 0) {
            projectedDate = LocalDate.now();
        } else if (!contributions.isEmpty()) {
            BigDecimal recentTotal = contributions.stream()
                    .filter(item -> !item.getContributedAt().isBefore(currentMonth.minusMonths(2).atDay(1).atStartOfDay()))
                    .map(SavingGoalContribution::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal averageMonthly = recentTotal.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP);
            if (averageMonthly.signum() > 0) {
                long months = remaining.divide(averageMonthly, 0, RoundingMode.CEILING).longValue();
                projectedDate = LocalDate.now().plusMonths(Math.max(1, months));
            }
        }
        return new SavingGoalResponse(goal.getId(), goal.getName(), goal.getTargetAmount(), goal.getCurrentAmount(), goal.getDeadline(), requiredMonthly, projectedDate, monthly);
    }
}