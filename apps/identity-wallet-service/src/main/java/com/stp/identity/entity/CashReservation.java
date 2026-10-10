package com.stp.identity.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * CashReservation — tracks reserved cash for pending BUY orders.
 * 
 * Lifecycle:
 * ACTIVE   — cash is reserved, order is pending
 * CAPTURED — cash has been captured for a completed trade
 * RELEASED — cash has been released back to available (order cancelled/failed)
 * 
 * Idempotency: Each reservation has a unique idempotency_key to prevent
 * duplicate reservations from retried requests.
 */
@Entity
@Table(name = "cash_reservations")
public class CashReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "wallet_id", nullable = false)
    private UUID walletId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "order_id", nullable = false, length = 255)
    private String orderId;

    /** Reserved amount in paise */
    @Column(name = "reserved_amount_paise", nullable = false)
    private long reservedAmountPaise;

    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReservationStatus status = ReservationStatus.ACTIVE;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 255)
    private String idempotencyKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public enum ReservationStatus {
        ACTIVE, CAPTURED, RELEASED
    }

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    // === Getters and Setters ===

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getWalletId() { return walletId; }
    public void setWalletId(UUID walletId) { this.walletId = walletId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public long getReservedAmountPaise() { return reservedAmountPaise; }
    public void setReservedAmountPaise(long reservedAmountPaise) { this.reservedAmountPaise = reservedAmountPaise; }

    public ReservationStatus getStatus() { return status; }
    public void setStatus(ReservationStatus status) { this.status = status; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
