package com.stp.identity.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * WalletLedger — append-only record of every balance-changing operation.
 * 
 * Entry types:
 * - CREDIT_INITIAL: Starting balance on registration
 * - CREDIT_SELL: Cash credited from SELL trade proceeds
 * - DEBIT_RESERVE: Cash moved from available to reserved for BUY order
 * - CREDIT_RELEASE: Cash released back from reserved to available
 * - DEBIT_CAPTURE: Cash captured (deducted) for completed BUY trade
 * - CREDIT_REFUND: Cash refunded due to failed operation
 */
@Entity
@Table(name = "wallet_ledger")
public class WalletLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "entry_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private EntryType entryType;

    /** Amount in paise. Always positive — direction indicated by entryType. */
    @Column(name = "amount_paise", nullable = false)
    private long amountPaise;

    /** Available balance after this operation, in paise. */
    @Column(name = "balance_after_paise", nullable = false)
    private long balanceAfterPaise;

    /** Reference to the related entity (orderId, reservationId, etc.) */
    @Column(name = "reference_id", length = 255)
    private String referenceId;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "description", length = 500)
    private String description;

    /** Ensures idempotent financial operations */
    @Column(name = "idempotency_key", length = 255)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public enum EntryType {
        CREDIT_INITIAL,
        CREDIT_SELL,
        DEBIT_RESERVE,
        CREDIT_RELEASE,
        DEBIT_CAPTURE,
        CREDIT_REFUND
    }

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
    }

    // === Getters and Setters ===

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getWalletId() { return walletId; }
    public void setWalletId(UUID walletId) { this.walletId = walletId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public EntryType getEntryType() { return entryType; }
    public void setEntryType(EntryType entryType) { this.entryType = entryType; }

    public long getAmountPaise() { return amountPaise; }
    public void setAmountPaise(long amountPaise) { this.amountPaise = amountPaise; }

    public long getBalanceAfterPaise() { return balanceAfterPaise; }
    public void setBalanceAfterPaise(long balanceAfterPaise) { this.balanceAfterPaise = balanceAfterPaise; }

    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }

    public String getReferenceType() { return referenceType; }
    public void setReferenceType(String referenceType) { this.referenceType = referenceType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
}
