package com.fintech.smartwealth.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fintech.smartwealth.dto.InvestmentRequest;
import com.fintech.smartwealth.dto.InvestmentResponse;
import com.fintech.smartwealth.entity.Investment;
import com.fintech.smartwealth.entity.User;
import com.fintech.smartwealth.repository.InvestmentRepository;
import com.fintech.smartwealth.repository.UserRepository;
import com.fintech.smartwealth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvestmentService {
    private final InvestmentRepository investmentRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final RestTemplate restTemplate;

    @Value("${binance.base-url:https://api.binance.com}")
    private String binanceBaseUrl;

    @Transactional(readOnly = true)
    public List<InvestmentResponse> findAll() {
        return investmentRepository.findByUserIdOrderByCoinSymbolAsc(securityUtils.getCurrentUserId())
                .stream().map(this::toResponse).toList();
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

    @Cacheable(value = "binance_prices", key = "#coinSymbol.toUpperCase()")
    public BigDecimal getCurrentPrice(String coinSymbol) {
        String symbol = normalizeSymbol(coinSymbol) + "USDT";
        try {
            BinancePriceResponse response = restTemplate.getForObject(
                    binanceBaseUrl + "/api/v3/ticker/price?symbol={symbol}",
                    BinancePriceResponse.class, symbol);
            if (response == null || response.price() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Binance returned an empty price");
            }
            return new BigDecimal(response.price());
        } catch (RestClientException | NumberFormatException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to fetch current price from Binance", exception);
        }
    }

    private void apply(Investment investment, InvestmentRequest request) {
        investment.setCoinSymbol(normalizeSymbol(request.coinSymbol()));
        investment.setQuantity(request.quantity());
        investment.setBuyPrice(request.buyPrice());
    }

    private InvestmentResponse toResponse(Investment investment) {
        BigDecimal currentPrice = getCurrentPrice(investment.getCoinSymbol());
        BigDecimal investedValue = investment.getQuantity().multiply(investment.getBuyPrice());
        BigDecimal currentValue = investment.getQuantity().multiply(currentPrice);
        BigDecimal profitLoss = currentValue.subtract(investedValue).setScale(2, RoundingMode.HALF_UP);
        BigDecimal percentage = investedValue.signum() == 0 ? BigDecimal.ZERO
                : profitLoss.multiply(BigDecimal.valueOf(100)).divide(investedValue, 2, RoundingMode.HALF_UP);
        return new InvestmentResponse(investment.getId(), investment.getCoinSymbol(), investment.getQuantity(),
                investment.getBuyPrice(), currentPrice, profitLoss, percentage);
    }

    private String normalizeSymbol(String coinSymbol) {
        String normalized = coinSymbol == null ? "" : coinSymbol.trim().toUpperCase(Locale.ROOT);
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

    private record BinancePriceResponse(@JsonProperty("symbol") String symbol, @JsonProperty("price") String price) {
    }
}
