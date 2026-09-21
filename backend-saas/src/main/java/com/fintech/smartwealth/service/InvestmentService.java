package com.fintech.smartwealth.service;

import com.fintech.smartwealth.dto.InvestmentRequest;
import com.fintech.smartwealth.dto.InvestmentResponse;
import com.fintech.smartwealth.dto.MarketPriceResponse;
import com.fintech.smartwealth.dto.MarketCandleResponse;
import com.fintech.smartwealth.entity.Investment;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.InvestmentRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class InvestmentService {
    private final InvestmentRepository investmentRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final BinanceMarketService binanceMarketService;

    @Transactional(readOnly = true)
    public List<InvestmentResponse> findAll() {
        return investmentRepository.findByUserIdOrderByCoinSymbolAsc(securityUtils.getCurrentUserId())
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<MarketPriceResponse> getMarketPrices(String symbols) {
        if (symbols == null || symbols.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one coin symbol is required");
        }
        return Arrays.stream(symbols.split(","))
                .map(String::trim)
                .filter(symbol -> !symbol.isBlank())
                .distinct()
                .map(symbol -> new MarketPriceResponse(normalizeSymbol(symbol), binanceMarketService.getCurrentPrice(symbol)))
                .toList();
    }

    public List<MarketCandleResponse> getMarketCandles(String coinSymbol, String interval, int limit) {
        return binanceMarketService.getMarketCandles(coinSymbol, interval, limit);
    }

    @Transactional
    public InvestmentResponse create(InvestmentRequest request) {
        User user = currentUser();
        Investment investment = new Investment();
        investment.setUser(user);
        apply(investment, request);
        return toResponse(investmentRepository.save(investment));
    }

    @Transactional
    public InvestmentResponse update(UUID id, InvestmentRequest request) {
        Investment investment = ownedInvestment(id);
        apply(investment, request);
        return toResponse(investmentRepository.save(investment));
    }

    @Transactional
    public void delete(UUID id) {
        investmentRepository.delete(ownedInvestment(id));
    }

    private void apply(Investment investment, InvestmentRequest request) {
        investment.setCoinSymbol(normalizeSymbol(request.coinSymbol()));
        investment.setQuantity(request.quantity());
        investment.setBuyPrice(request.buyPrice());
    }

    private InvestmentResponse toResponse(Investment investment) {
        BigDecimal currentPrice = binanceMarketService.getCurrentPrice(investment.getCoinSymbol());
        BigDecimal investedValue = investment.getQuantity().multiply(investment.getBuyPrice());
        BigDecimal currentValue = investment.getQuantity().multiply(currentPrice);
        BigDecimal profitLoss = currentValue.subtract(investedValue).setScale(2, RoundingMode.HALF_UP);
        BigDecimal percentage = investedValue.signum() == 0 ? BigDecimal.ZERO
                : profitLoss.multiply(BigDecimal.valueOf(100)).divide(investedValue, 2, RoundingMode.HALF_UP);
        return new InvestmentResponse(investment.getId(), investment.getCoinSymbol(), investment.getQuantity(),
                investment.getBuyPrice(), currentPrice, profitLoss, percentage);
    }

    private String normalizeSymbol(String coinSymbol) {
        String normalized = coinSymbol == null ? "" : coinSymbol.trim().toUpperCase(java.util.Locale.ROOT);
        if (!normalized.matches("[A-Z0-9]{2,20}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coin symbol must contain 2-20 letters or digits");
        }
        return normalized;
    }

    private User currentUser() {
        return userRepository.findById(securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Investment ownedInvestment(UUID id) {
        return investmentRepository.findByIdAndUserId(id, securityUtils.getCurrentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investment not found"));
    }

}
