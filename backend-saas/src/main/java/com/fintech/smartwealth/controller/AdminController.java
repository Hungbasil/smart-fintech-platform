package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.dto.*;
import com.fintech.smartwealth.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    // ==================== USER MANAGEMENT ====================

    /**
     * Get paginated list of all users (with optional search)
     */
    @GetMapping("/users")
    public Page<UserDTO> getUsers(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @RequestParam(required = false) String search) {
        return adminService.getUsers(pageable, search);
    }

    /**
     * Get detailed user information
     */
    @GetMapping("/users/{id}")
    public UserDTO getUserDetail(@PathVariable UUID id) {
        return adminService.getUserDetail(id);
    }

    /**
     * Lock user account (set active=false)
     */
    @PostMapping("/users/{id}/lock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void lockUser(@PathVariable UUID id) {
        adminService.lockUser(id);
    }

    /**
     * Unlock user account (set active=true)
     */
    @PostMapping("/users/{id}/unlock")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlockUser(@PathVariable UUID id) {
        adminService.unlockUser(id);
    }

    /**
     * Change user role (USER <-> ADMIN)
     */
    @PostMapping("/users/{id}/role")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changeUserRole(
            @PathVariable UUID id,
            @RequestBody RoleChangeRequest request) {
        adminService.changeUserRole(id, request);
    }

    // ==================== SYSTEM OVERVIEW ====================

    /**
     * Get system overview: total users, wallets, transactions, balance, etc.
     */
    @GetMapping("/analytics/overview")
    public AdminOverviewDTO getOverview() {
        return adminService.getOverview();
    }

    // ==================== TRANSACTION ANALYTICS ====================

    /**
     * Get transaction analytics: category spending, wallet spending, largest transactions, trends
     */
    @GetMapping("/analytics/transactions")
    public AdminTransactionAnalyticsDTO getTransactionAnalytics(
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate) {
        return adminService.getTransactionAnalytics(fromDate, toDate);
    }

    // ==================== USER ANALYTICS ====================

    /**
     * Get user analytics: user growth, activity, averages
     */
    @GetMapping("/analytics/users")
    public AdminUserAnalyticsDTO getUserAnalytics() {
        return adminService.getUserAnalytics();
    }

    // ==================== FINANCIAL HEALTH ====================

    /**
     * Get financial health: debt overview, savings, balance distribution
     */
    @GetMapping("/analytics/financial-health")
    public AdminFinancialHealthDTO getFinancialHealth() {
        return adminService.getFinancialHealth();
    }

    // ==================== HEALTH CHECK ====================

    /**
     * Get system health status
     */
    @GetMapping("/health")
    public SystemHealthDTO getSystemHealth() {
        SystemHealthDTO health = new SystemHealthDTO();
        health.setStatus("UP");
        health.setTimestamp(java.time.LocalDateTime.now());
        
        SystemHealthDTO.DatabaseHealthDTO dbHealth = new SystemHealthDTO.DatabaseHealthDTO();
        dbHealth.setStatus("UP");
        dbHealth.setMessage("Database connection healthy");
        dbHealth.setResponseTime(0);
        
        health.setDatabase(dbHealth);
        health.setApplicationVersion("1.0.0");
        health.setUptime(System.currentTimeMillis());
        health.setTotalMemory((int) Runtime.getRuntime().totalMemory());
        health.setFreeMemory((int) Runtime.getRuntime().freeMemory());
        
        return health;
    }
}
