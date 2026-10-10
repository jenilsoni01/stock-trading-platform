package com.stp.identity.controller;

import com.stp.identity.dto.WalletDto;
import com.stp.identity.service.WalletService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Internal wallet controller — used by other services (Order Service) for
 * cash reservation, capture, release, and credit operations.
 * 
 * These endpoints are NOT exposed through the API Gateway to end users.
 * In production, they would be protected by mTLS or an internal API key.
 * For this project, they are accessible on the internal network only.
 */
@RestController
@RequestMapping("/internal/v1/wallet")
public class InternalWalletController {

    private static final Logger log = LoggerFactory.getLogger(InternalWalletController.class);

    private final WalletService walletService;

    public InternalWalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    /**
     * Reserve cash for a BUY order.
     * Called by Order Service during order validation.
     */
    @PostMapping("/reservations")
    public ResponseEntity<WalletDto.ReservationResponse> reserveCash(
            @Valid @RequestBody WalletDto.ReservationRequest request) {
        log.info("Cash reservation request: userId={}, orderId={}, amount={}",
                request.userId(), request.orderId(), request.amountPaise());
        WalletDto.ReservationResponse response = walletService.reserveCash(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Capture reserved cash for a completed BUY trade.
     * Called by Order Service after trade execution.
     */
    @PostMapping("/reservations/{id}/capture")
    public ResponseEntity<WalletDto.ReservationResponse> captureCash(
            @PathVariable UUID id,
            @Valid @RequestBody WalletDto.CaptureRequest request) {
        log.info("Cash capture request: reservationId={}, amount={}", id, request.captureAmountPaise());
        WalletDto.ReservationResponse response = walletService.captureCash(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Release reserved cash back to available (order cancelled/failed).
     * Called by Order Service during saga compensation.
     */
    @PostMapping("/reservations/{id}/release")
    public ResponseEntity<WalletDto.ReservationResponse> releaseCash(@PathVariable UUID id) {
        log.info("Cash release request: reservationId={}", id);
        WalletDto.ReservationResponse response = walletService.releaseCash(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Credit cash for SELL trade proceeds.
     * Called by Order Service after SELL trade execution.
     */
    @PostMapping("/credit")
    public ResponseEntity<WalletDto.WalletResponse> creditCash(
            @Valid @RequestBody WalletDto.CreditRequest request) {
        log.info("Cash credit request: userId={}, amount={}, orderId={}",
                request.userId(), request.amountPaise(), request.orderId());
        WalletDto.WalletResponse response = walletService.creditCash(request);
        return ResponseEntity.ok(response);
    }
}
