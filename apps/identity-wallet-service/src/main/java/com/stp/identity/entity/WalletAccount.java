package com.stp.identity.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * WalletAccount entity — maps to the 'wallet_accounts' table.
 * All monetary values are stored in integer paise (1 INR = 100 paise).
 * 
 * Invariants:
 * - available_balance_paise >= 0 (enforced by DB constraint)
 * - reserved_balance_paise >= 0 (enforced by DB constraint)
 * - total_balance = available_balance + reserved_balance
 * 
 * Uses optimistic locking via @Version to prevent lost updates.
 */
@Entity
@Table(name = "wallet_accounts")
public class WalletAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "available_balance_paise", nullable = false)
    private long availableBalancePaise = 0;

    @Column(name = "reserved_balance_paise", nullable = false)
    private long reservedBalancePaise = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    /**
     * Total balance = available + reserved
     */
    public long getTotalBalancePaise() {
        return availableBalancePaise + reservedBalancePaise;
    }

    // === Getters and Setters ===

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public long getAvailableBalancePaise() { return availableBalancePaise; }
    public void setAvailableBalancePaise(long availableBalancePaise) { this.availableBalancePaise = availableBalancePaise; }

    public long getReservedBalancePaise() { return reservedBalancePaise; }
    public void setReservedBalancePaise(long reservedBalancePaise) { this.reservedBalancePaise = reservedBalancePaise; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }
}
