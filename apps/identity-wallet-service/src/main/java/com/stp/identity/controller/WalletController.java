package com.stp.identity.controller;

import com.stp.identity.dto.WalletDto;
import com.stp.identity.service.WalletService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Wallet controller — user-facing wallet endpoints.
 * All endpoints require JWT authentication.
 * User ID is always extracted from the JWT, never from the request.
 */
@RestController
@RequestMapping("/api/v1/wallet")
public class WalletController {

    private static final Logger log = LoggerFactory.getLogger(WalletController.class);

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    /**
     * Get wallet summary (available, reserved, total balance).
     */
    @GetMapping
    public ResponseEntity<WalletDto.WalletResponse> getWallet(Authentication authentication) {
        UUID userId = (UUID) authentication.getPrincipal();
        WalletDto.WalletResponse response = walletService.getWallet(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Deposit virtual funds into wallet.
     */
    @PostMapping("/deposit")
    public ResponseEntity<WalletDto.WalletResponse> depositFunds(
            Authentication authentication,
            @Valid @RequestBody WalletDto.DepositRequest request) {
        UUID userId = (UUID) authentication.getPrincipal();
        log.info("User {} depositing {} paise", userId, request.amountPaise());
        WalletDto.WalletResponse response = walletService.depositFunds(userId, request.amountPaise());
        return ResponseEntity.ok(response);
    }

    /**
     * Get wallet transaction history (ledger entries).
     */
    @GetMapping("/transactions")
    public ResponseEntity<Page<WalletDto.TransactionResponse>> getTransactions(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        UUID userId = (UUID) authentication.getPrincipal();
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<WalletDto.TransactionResponse> transactions = walletService.getTransactions(userId, pageable);
        return ResponseEntity.ok(transactions);
    }
}
