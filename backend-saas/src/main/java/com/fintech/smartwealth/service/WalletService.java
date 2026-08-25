package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.CreateWalletRequest;
import com.fintech.smartwealth.dto.WalletResponse;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.entity.Wallet;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.repository.TransactionRepository;
import com.fintech.smartwealth.repository.RecurringTransactionRepository;
import com.fintech.smartwealth.repository.WalletRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final TransactionRepository transactionRepository;
    private final RecurringTransactionRepository recurringTransactionRepository;

    public List<WalletResponse> findAll() {
        if (securityUtils.isAdmin()) {
            return walletRepository.findAll().stream()
                    .map(this::toResponse)
                    .toList();
        }
        return walletRepository.findByUserId(securityUtils.getCurrentUserId()).stream()
                .map(this::toResponse)
                .toList();
    }

    public WalletResponse findById(UUID id) {
        if (securityUtils.isAdmin()) {
            Wallet wallet = walletRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
            return toResponse(wallet);
        }
        Wallet wallet = walletRepository.findByIdAndUserId(id, securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        return toResponse(wallet);
    }

    public WalletResponse create(CreateWalletRequest request) {
        UUID targetUserId = request.getUserId() != null ? request.getUserId() : securityUtils.getCurrentUserId();
        securityUtils.requireOwnership(targetUserId);

        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Wallet wallet = new Wallet();
        wallet.setName(request.getName());
        wallet.setBalance(request.getBalance());
        wallet.setUser(user);

        return toResponse(walletRepository.save(wallet));
    }

    public WalletResponse update(UUID id, CreateWalletRequest request) {
        Wallet wallet = walletRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        securityUtils.requireOwnership(wallet.getUser().getId());
        if (request.getBalance().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Wallet balance cannot be negative");
        }
        if (transactionRepository.existsByWalletId(id) && request.getBalance().compareTo(wallet.getBalance()) != 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Không thể thay đổi số dư ví vì ví đã có giao dịch liên kết. Bạn chỉ có thể đổi tên ví.");
        }
        wallet.setName(request.getName().trim());
        wallet.setBalance(request.getBalance());
        return toResponse(walletRepository.save(wallet));
    }

    public void delete(UUID id) {
        Wallet wallet = walletRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Wallet not found"));
        securityUtils.requireOwnership(wallet.getUser().getId());
        if (transactionRepository.existsByWalletId(id) || recurringTransactionRepository.existsByWalletId(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Không thể xóa ví vì ví đang được liên kết với giao dịch hoặc giao dịch định kỳ. Hãy xóa hoặc chuyển các liên kết trước.");
        }
        walletRepository.deleteById(id);
    }

    private WalletResponse toResponse(Wallet wallet) {
        return new WalletResponse(wallet.getId(), wallet.getName(), wallet.getBalance(), wallet.getUser().getId());
    }
}
