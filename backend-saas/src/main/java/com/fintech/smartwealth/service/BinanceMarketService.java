package com.fintech.smartwealth.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fintech.smartwealth.dto.MarketCandleResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class BinanceMarketService {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${binance.base-url:https://api.binance.com}")
    private String binanceBaseUrl;

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

    @Cacheable(value = "binance_klines", key = "#coinSymbol.toUpperCase() + ':' + #interval + ':' + #limit")
    public List<MarketCandleResponse> getMarketCandles(String coinSymbol, String interval, int limit) {
        String symbol = normalizeSymbol(coinSymbol) + "USDT";
        if (!List.of("1m", "5m", "15m", "1h", "4h", "1d").contains(interval) || limit < 10 || limit > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid chart interval or limit");
        }
        try {
            String body = restTemplate.getForObject(binanceBaseUrl + "/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}", String.class, symbol, interval, limit);
            JsonNode rows = objectMapper.readTree(body);
            List<MarketCandleResponse> candles = new ArrayList<>();
            rows.forEach(row -> candles.add(new MarketCandleResponse(row.get(0).asLong(), new BigDecimal(row.get(1).asText()), new BigDecimal(row.get(2).asText()), new BigDecimal(row.get(3).asText()), new BigDecimal(row.get(4).asText()), new BigDecimal(row.get(5).asText()))));
            return candles;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to fetch chart data from Binance", exception);
        }
    }

    private String normalizeSymbol(String coinSymbol) {
        String normalized = coinSymbol == null ? "" : coinSymbol.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z0-9]{2,20}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Coin symbol must contain 2-20 letters or digits");
        }
        return normalized;
    }

    private record BinancePriceResponse(@JsonProperty("symbol") String symbol, @JsonProperty("price") String price) {
    }
}
