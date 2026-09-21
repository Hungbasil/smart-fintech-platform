package com.fintech.smartwealth.controller;

import com.fintech.smartwealth.service.AdminService;
import com.fintech.smartwealth.web.ApiExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiExceptionHandler.class)
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminService adminService;

    @Test
    void healthEndpointShouldReturnBackendHealthContract() throws Exception {
        mockMvc.perform(get("/api/v1/admin/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database.status").value("UP"))
                .andExpect(jsonPath("$.database.message").value("Database connection healthy"))
                .andExpect(jsonPath("$.applicationVersion").value("1.0.0"));
    }

    @Test
    void freezeWalletShouldDelegateToAdminService() throws Exception {
        UUID walletId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/admin/wallets/{id}/freeze", walletId))
                .andExpect(status().isNoContent());

        verify(adminService).setWalletFrozen(walletId, true);
    }

    @Test
    void unfreezeWalletShouldDelegateToAdminService() throws Exception {
        UUID walletId = UUID.randomUUID();

        mockMvc.perform(post("/api/v1/admin/wallets/{id}/unfreeze", walletId))
                .andExpect(status().isNoContent());

        verify(adminService).setWalletFrozen(walletId, false);
    }

    @Test
    void deleteWalletShouldDelegateToAdminService() throws Exception {
        UUID walletId = UUID.randomUUID();

        mockMvc.perform(delete("/api/v1/admin/wallets/{id}", walletId))
                .andExpect(status().isNoContent());

        verify(adminService).deleteWallet(walletId);
    }

    @Test
    void walletsEndpointShouldReturnPagedResponse() throws Exception {
        when(adminService.getWallets(any())).thenReturn(new PageImpl<>(java.util.List.of()));

        mockMvc.perform(get("/api/v1/admin/wallets")
                        .param("page", "0")
                        .param("size", "10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());

        verify(adminService).getWallets(any());
    }
}
