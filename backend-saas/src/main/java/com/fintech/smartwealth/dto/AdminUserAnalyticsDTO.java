package com.fintech.smartwealth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserAnalyticsDTO {
    private long totalUsers;
    private long activeUsersThisMonth;
    private long newUsersThisMonth;
    private Map<LocalDate, Long> dailyUserRegistration; // user growth
    private double avgWalletsPerUser;
    private double avgTransactionsPerUser;
}
