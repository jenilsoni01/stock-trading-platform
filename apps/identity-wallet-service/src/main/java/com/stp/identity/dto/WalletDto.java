package com.stp.identity.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class WalletDto {

    /**
     * Wallet summary response
     */
    public record WalletResponse(
            String walletId,
            String userId,
            long availableBalancePaise,
            long reservedBalancePaise,
            long totalBalancePaise,
            String updatedAt
    ) {}

    /**
     * Cash reservation request (internal API)
     */
    public record ReservationRequest(
            @NotBlank(message = "User ID is required")
            String userId,

            @NotBlank(message = "Order ID is required")
            String orderId,

            @NotNull(message = "Amount is required")
            @Min(value = 1, message = "Amount must be positive")
            Long amountPaise,

            @NotBlank(message = "Idempotency key is required")
            String idempotencyKey
    ) {}

    /**
     * Reservation response
     */
    public record ReservationResponse(
            String reservationId,
            String userId,
            String orderId,
            long reservedAmountPaise,
            String status,
            long availableBalancePaise
    ) {}

    /**
     * Capture request (internal API)
     */
    public record CaptureRequest(
            @NotNull(message = "Capture amount is required")
            @Min(value = 1, message = "Capture amount must be positive")
            Long captureAmountPaise,

            @NotBlank(message = "Idempotency key is required")
            String idempotencyKey
    ) {}

    /**
     * Credit request for SELL proceeds (internal API)
     */
    public record CreditRequest(
            @NotBlank(message = "User ID is required")
            String userId,

            @NotNull(message = "Amount is required")
            @Min(value = 1, message = "Amount must be positive")
            Long amountPaise,

            @NotBlank(message = "Order ID is required")
            String orderId,

            @NotBlank(message = "Idempotency key is required")
            String idempotencyKey
    ) {}

    /**
     * Wallet transaction (ledger entry) response
     */
    public record TransactionResponse(
            String id,
            String entryType,
            long amountPaise,
            long balanceAfterPaise,
            String referenceId,
            String referenceType,
            String description,
            String createdAt
    ) {}
}
