package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.AddSavingGoalFundsRequest;
import com.fintech.smartwealth.dto.SavingGoalRequest;
import com.fintech.smartwealth.dto.SavingGoalResponse;
import com.fintech.smartwealth.entity.SavingGoal;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.SavingGoalRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SavingGoalService {
    private final SavingGoalRepository savingGoalRepository;
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
        return toResponse(savingGoalRepository.save(goal));
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
        return new SavingGoalResponse(goal.getId(), goal.getName(), goal.getTargetAmount(), goal.getCurrentAmount(), goal.getDeadline());
    }
}