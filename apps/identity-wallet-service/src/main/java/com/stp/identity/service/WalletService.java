package com.stp.identity.service;

import com.stp.identity.dto.WalletDto;
import com.stp.identity.entity.CashReservation;
import com.stp.identity.entity.WalletAccount;
import com.stp.identity.entity.WalletLedger;
import com.stp.identity.repository.CashReservationRepository;
import com.stp.identity.repository.WalletAccountRepository;
import com.stp.identity.repository.WalletLedgerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Wallet service — manages virtual cash balances, reservations, and ledger.
 * 
 * All operations use ACID transactions with pessimistic row locking
 * to prevent concurrent modifications from corrupting balances.
 * 
 * Invariants:
 * 1. available_balance >= 0 (enforced by DB constraint + application check)
 * 2. reserved_balance >= 0 (enforced by DB constraint + application check)
 * 3. Every balance change produces a ledger entry
 * 4. All operations are idempotent via idempotency keys
 * 
 * Financial flow for BUY:
 *   reserve() → available -= amount, reserved += amount
 *   capture() → reserved -= amount (cash is spent)
 *   release() → reserved -= amount, available += amount (cancellation)
 * 
 * Financial flow for SELL:
 *   credit() → available += amount (proceeds received)
 */
@Service
public class WalletService {

    private static final Logger log = LoggerFactory.getLogger(WalletService.class);

    private final WalletAccountRepository walletAccountRepository;
    private final WalletLedgerRepository walletLedgerRepository;
    private final CashReservationRepository cashReservationRepository;

    public WalletService(WalletAccountRepository walletAccountRepository,
                         WalletLedgerRepository walletLedgerRepository,
                         CashReservationRepository cashReservationRepository) {
        this.walletAccountRepository = walletAccountRepository;
        this.walletLedgerRepository = walletLedgerRepository;
        this.cashReservationRepository = cashReservationRepository;
    }

    /**
     * Get wallet summary for a user.
     */
    @Transactional(readOnly = true)
    public WalletDto.WalletResponse getWallet(UUID userId) {
        WalletAccount wallet = walletAccountRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found for user"));
        return toWalletResponse(wallet);
    }

    /**
     * Get wallet transactions (ledger entries) for a user.
     */
    @Transactional(readOnly = true)
    public Page<WalletDto.TransactionResponse> getTransactions(UUID userId, Pageable pageable) {
        return walletLedgerRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toTransactionResponse);
    }

    /**
     * Reserve cash for a BUY order.
     * 
     * Atomically:
     * 1. Check idempotency — return existing reservation if key already used
     * 2. Lock wallet row (SELECT FOR UPDATE)
     * 3. Verify sufficient available balance
     * 4. Deduct from available, add to reserved
     * 5. Create reservation record
     * 6. Create ledger entry
     * 
     * @throws IllegalArgumentException if wallet not found
     * @throws IllegalStateException if insufficient funds
     */
    @Transactional
    public WalletDto.ReservationResponse reserveCash(WalletDto.ReservationRequest request) {
        UUID userId = UUID.fromString(request.userId());

        // Idempotency check — return existing reservation if this key was already processed
        var existing = cashReservationRepository.findByIdempotencyKey(request.idempotencyKey());
        if (existing.isPresent()) {
            CashReservation res = existing.get();
            log.info("Idempotent reservation hit: key={}, reservationId={}", request.idempotencyKey(), res.getId());
            WalletAccount wallet = walletAccountRepository.findByUserId(userId)
                    .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));
            return toReservationResponse(res, wallet.getAvailableBalancePaise());
        }

        // Lock wallet for update
        WalletAccount wallet = walletAccountRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found for user: " + userId));

        // Check sufficient funds
        if (wallet.getAvailableBalancePaise() < request.amountPaise()) {
            log.warn("Insufficient funds: userId={}, available={}, requested={}",
                    userId, wallet.getAvailableBalancePaise(), request.amountPaise());
            throw new IllegalStateException("Insufficient funds. Available: "
                    + wallet.getAvailableBalancePaise() + " paise, Requested: " + request.amountPaise() + " paise");
        }

        // Move cash from available to reserved
        wallet.setAvailableBalancePaise(wallet.getAvailableBalancePaise() - request.amountPaise());
        wallet.setReservedBalancePaise(wallet.getReservedBalancePaise() + request.amountPaise());
        walletAccountRepository.save(wallet);

        // Create reservation record
        CashReservation reservation = new CashReservation();
        reservation.setWalletId(wallet.getId());
        reservation.setUserId(userId);
        reservation.setOrderId(request.orderId());
        reservation.setReservedAmountPaise(request.amountPaise());
        reservation.setStatus(CashReservation.ReservationStatus.ACTIVE);
        reservation.setIdempotencyKey(request.idempotencyKey());
        reservation = cashReservationRepository.save(reservation);

        // Record in ledger
        WalletLedger ledger = new WalletLedger();
        ledger.setWalletId(wallet.getId());
        ledger.setUserId(userId);
        ledger.setEntryType(WalletLedger.EntryType.DEBIT_RESERVE);
        ledger.setAmountPaise(request.amountPaise());
        ledger.setBalanceAfterPaise(wallet.getAvailableBalancePaise());
        ledger.setReferenceId(reservation.getId().toString());
        ledger.setReferenceType("CASH_RESERVATION");
        ledger.setDescription("Cash reserved for order " + request.orderId());
        ledger.setIdempotencyKey("reserve-" + request.idempotencyKey());
        walletLedgerRepository.save(ledger);

        log.info("Cash reserved: userId={}, amount={}, reservationId={}, orderId={}",
                userId, request.amountPaise(), reservation.getId(), request.orderId());

        return toReservationResponse(reservation, wallet.getAvailableBalancePaise());
    }

    /**
     * Capture reserved cash for a completed BUY trade.
     * 
     * The capture amount may be less than or equal to the reserved amount.
     * If less, the excess is released back to available.
     * 
     * @param reservationId the reservation to capture
     * @param request capture details with amount and idempotency key
     */
    @Transactional
    public WalletDto.ReservationResponse captureCash(UUID reservationId, WalletDto.CaptureRequest request) {
        // Idempotency check
        if (walletLedgerRepository.existsByIdempotencyKey("capture-" + request.idempotencyKey())) {
            CashReservation res = cashReservationRepository.findById(reservationId)
                    .orElseThrow(() -> new IllegalArgumentException("Reservation not found"));
            WalletAccount wallet = walletAccountRepository.findByUserId(res.getUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));
            log.info("Idempotent capture hit: key={}", request.idempotencyKey());
            return toReservationResponse(res, wallet.getAvailableBalancePaise());
        }

        CashReservation reservation = cashReservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found: " + reservationId));

        if (reservation.getStatus() != CashReservation.ReservationStatus.ACTIVE) {
            throw new IllegalStateException("Reservation is not active: " + reservation.getStatus());
        }

        if (request.captureAmountPaise() > reservation.getReservedAmountPaise()) {
            throw new IllegalArgumentException("Capture amount exceeds reserved amount");
        }

        // Lock wallet
        WalletAccount wallet = walletAccountRepository.findByUserIdForUpdate(reservation.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));

        long excessPaise = reservation.getReservedAmountPaise() - request.captureAmountPaise();

        // Deduct captured amount from reserved
        wallet.setReservedBalancePaise(wallet.getReservedBalancePaise() - reservation.getReservedAmountPaise());

        // Release excess back to available
        if (excessPaise > 0) {
            wallet.setAvailableBalancePaise(wallet.getAvailableBalancePaise() + excessPaise);
        }

        walletAccountRepository.save(wallet);

        // Update reservation status
        reservation.setStatus(CashReservation.ReservationStatus.CAPTURED);
        cashReservationRepository.save(reservation);

        // Record capture in ledger
        WalletLedger captureLedger = new WalletLedger();
        captureLedger.setWalletId(wallet.getId());
        captureLedger.setUserId(reservation.getUserId());
        captureLedger.setEntryType(WalletLedger.EntryType.DEBIT_CAPTURE);
        captureLedger.setAmountPaise(request.captureAmountPaise());
        captureLedger.setBalanceAfterPaise(wallet.getAvailableBalancePaise());
        captureLedger.setReferenceId(reservationId.toString());
        captureLedger.setReferenceType("CASH_CAPTURE");
        captureLedger.setDescription("Cash captured for completed trade, order " + reservation.getOrderId());
        captureLedger.setIdempotencyKey("capture-" + request.idempotencyKey());
        walletLedgerRepository.save(captureLedger);

        // Record excess release in ledger if applicable
        if (excessPaise > 0) {
            WalletLedger releaseLedger = new WalletLedger();
            releaseLedger.setWalletId(wallet.getId());
            releaseLedger.setUserId(reservation.getUserId());
            releaseLedger.setEntryType(WalletLedger.EntryType.CREDIT_RELEASE);
            releaseLedger.setAmountPaise(excessPaise);
            releaseLedger.setBalanceAfterPaise(wallet.getAvailableBalancePaise());
            releaseLedger.setReferenceId(reservationId.toString());
            releaseLedger.setReferenceType("EXCESS_RELEASE");
            releaseLedger.setDescription("Excess reservation released for order " + reservation.getOrderId());
            releaseLedger.setIdempotencyKey("release-excess-" + request.idempotencyKey());
            walletLedgerRepository.save(releaseLedger);
        }

        log.info("Cash captured: reservationId={}, captured={}, excess={}", reservationId, request.captureAmountPaise(), excessPaise);

        return toReservationResponse(reservation, wallet.getAvailableBalancePaise());
    }

    /**
     * Release reserved cash back to available (order cancelled or failed).
     */
    @Transactional
    public WalletDto.ReservationResponse releaseCash(UUID reservationId) {
        CashReservation reservation = cashReservationRepository.findById(reservationId)
                .orElseThrow(() -> new IllegalArgumentException("Reservation not found: " + reservationId));

        if (reservation.getStatus() != CashReservation.ReservationStatus.ACTIVE) {
            throw new IllegalStateException("Reservation is not active: " + reservation.getStatus());
        }

        // Lock wallet
        WalletAccount wallet = walletAccountRepository.findByUserIdForUpdate(reservation.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));

        // Move cash from reserved back to available
        wallet.setReservedBalancePaise(wallet.getReservedBalancePaise() - reservation.getReservedAmountPaise());
        wallet.setAvailableBalancePaise(wallet.getAvailableBalancePaise() + reservation.getReservedAmountPaise());
        walletAccountRepository.save(wallet);

        // Update reservation status
        reservation.setStatus(CashReservation.ReservationStatus.RELEASED);
        cashReservationRepository.save(reservation);

        // Record in ledger
        WalletLedger ledger = new WalletLedger();
        ledger.setWalletId(wallet.getId());
        ledger.setUserId(reservation.getUserId());
        ledger.setEntryType(WalletLedger.EntryType.CREDIT_RELEASE);
        ledger.setAmountPaise(reservation.getReservedAmountPaise());
        ledger.setBalanceAfterPaise(wallet.getAvailableBalancePaise());
        ledger.setReferenceId(reservationId.toString());
        ledger.setReferenceType("RESERVATION_RELEASE");
        ledger.setDescription("Cash released for cancelled/failed order " + reservation.getOrderId());
        ledger.setIdempotencyKey("release-" + reservation.getIdempotencyKey());
        walletLedgerRepository.save(ledger);

        log.info("Cash released: reservationId={}, amount={}", reservationId, reservation.getReservedAmountPaise());

        return toReservationResponse(reservation, wallet.getAvailableBalancePaise());
    }

    /**
     * Credit cash for SELL trade proceeds.
     * Directly adds to available balance (no reservation involved).
     */
    @Transactional
    public WalletDto.WalletResponse creditCash(WalletDto.CreditRequest request) {
        UUID userId = UUID.fromString(request.userId());

        // Idempotency check
        if (walletLedgerRepository.existsByIdempotencyKey("credit-" + request.idempotencyKey())) {
            log.info("Idempotent credit hit: key={}", request.idempotencyKey());
            WalletAccount wallet = walletAccountRepository.findByUserId(userId)
                    .orElseThrow(() -> new IllegalArgumentException("Wallet not found"));
            return toWalletResponse(wallet);
        }

        // Lock wallet
        WalletAccount wallet = walletAccountRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalArgumentException("Wallet not found for user: " + userId));

        // Credit available balance
        wallet.setAvailableBalancePaise(wallet.getAvailableBalancePaise() + request.amountPaise());
        walletAccountRepository.save(wallet);

        // Record in ledger
        WalletLedger ledger = new WalletLedger();
        ledger.setWalletId(wallet.getId());
        ledger.setUserId(userId);
        ledger.setEntryType(WalletLedger.EntryType.CREDIT_SELL);
        ledger.setAmountPaise(request.amountPaise());
        ledger.setBalanceAfterPaise(wallet.getAvailableBalancePaise());
        ledger.setReferenceId(request.orderId());
        ledger.setReferenceType("SELL_PROCEEDS");
        ledger.setDescription("SELL trade proceeds for order " + request.orderId());
        ledger.setIdempotencyKey("credit-" + request.idempotencyKey());
        walletLedgerRepository.save(ledger);

        log.info("Cash credited: userId={}, amount={}, orderId={}", userId, request.amountPaise(), request.orderId());

        return toWalletResponse(wallet);
    }

    // === Mappers ===

    private WalletDto.WalletResponse toWalletResponse(WalletAccount wallet) {
        return new WalletDto.WalletResponse(
                wallet.getId().toString(),
                wallet.getUserId().toString(),
                wallet.getAvailableBalancePaise(),
                wallet.getReservedBalancePaise(),
                wallet.getTotalBalancePaise(),
                wallet.getUpdatedAt().toString());
    }

    private WalletDto.ReservationResponse toReservationResponse(CashReservation reservation, long availableBalancePaise) {
        return new WalletDto.ReservationResponse(
                reservation.getId().toString(),
                reservation.getUserId().toString(),
                reservation.getOrderId(),
                reservation.getReservedAmountPaise(),
                reservation.getStatus().name(),
                availableBalancePaise);
    }

    private WalletDto.TransactionResponse toTransactionResponse(WalletLedger ledger) {
        return new WalletDto.TransactionResponse(
                ledger.getId().toString(),
                ledger.getEntryType().name(),
                ledger.getAmountPaise(),
                ledger.getBalanceAfterPaise(),
                ledger.getReferenceId(),
                ledger.getReferenceType(),
                ledger.getDescription(),
                ledger.getCreatedAt().toString());
    }
}
