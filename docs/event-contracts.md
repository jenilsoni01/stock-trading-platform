# Event Contracts

## Event Envelope

Every event published to Kafka uses a standard envelope:

```json
{
  "eventId": "uuid-v4",
  "eventType": "orders.created",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:00.000Z",
  "aggregateId": "order-uuid",
  "aggregateType": "Order",
  "correlationId": "uuid-v4",
  "causationId": "uuid-v4",
  "payload": { ... }
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| eventId | UUID v4 | Yes | Unique event identifier. Used for consumer idempotency. |
| eventType | string | Yes | Dot-separated type name. |
| eventVersion | integer | Yes | Schema version. Start at 1. Increment on breaking changes. |
| occurredAt | ISO 8601 UTC | Yes | When the business event occurred. |
| aggregateId | string | Yes | ID of the owning aggregate. |
| aggregateType | string | No | Type of aggregate for routing/filtering. |
| correlationId | UUID v4 | Yes | Links all events in one business flow (e.g., one order lifecycle). |
| causationId | UUID v4 | No | The event or command that directly caused this event. |
| payload | object | Yes | Event-specific data. |

### Monetary Values

All monetary amounts are in **integer paise** (1 INR = 100 paise).

Example: ₹1,500.50 → `150050` paise

### Timestamp Format

ISO 8601 UTC: `2026-01-15T10:30:00.000Z`

---

## Kafka Topics

| Topic | Producer | Partition Key | Description |
|-------|----------|---------------|-------------|
| `orders.created` | Order Service | orderId | New order submitted |
| `orders.accepted` | Order Service | orderId | Order validated and accepted |
| `orders.rejected` | Order Service | orderId | Order validation failed |
| `orders.executed` | Order Service | orderId | Order fully executed |
| `orders.cancelled` | Order Service | orderId | Order cancelled |
| `trades.executed` | Order Service | orderId | Trade completed (contains trade details) |
| `wallet.reservation.completed` | Wallet Service | reservationId | Cash reserved successfully |
| `wallet.reservation.failed` | Wallet Service | reservationId | Cash reservation failed |
| `market.price.updated` | Market Data Service | symbol | Price update for a stock |
| `portfolio.updated` | Portfolio Service | userId | Portfolio projection updated |

---

## Event Payloads

### orders.created (v1)

```json
{
  "eventId": "e1a2b3c4-...",
  "eventType": "orders.created",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:00.000Z",
  "aggregateId": "ord-abc123",
  "aggregateType": "Order",
  "correlationId": "corr-xyz789",
  "causationId": "cmd-submit-001",
  "payload": {
    "orderId": "ord-abc123",
    "userId": "usr-def456",
    "symbol": "RELIANCE",
    "side": "BUY",
    "orderType": "MARKET",
    "quantity": 10,
    "estimatedPricePaise": 245000,
    "estimatedTotalPaise": 2450000,
    "idempotencyKey": "client-key-001",
    "status": "CREATED"
  }
}
```

### orders.accepted (v1)

```json
{
  "eventId": "e2b3c4d5-...",
  "eventType": "orders.accepted",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:01.000Z",
  "aggregateId": "ord-abc123",
  "aggregateType": "Order",
  "correlationId": "corr-xyz789",
  "causationId": "e1a2b3c4-...",
  "payload": {
    "orderId": "ord-abc123",
    "userId": "usr-def456",
    "symbol": "RELIANCE",
    "side": "BUY",
    "quantity": 10,
    "reservationId": "res-ghi789",
    "reservedAmountPaise": 2450000,
    "quotePricePaise": 245000,
    "status": "ACCEPTED"
  }
}
```

### orders.rejected (v1)

```json
{
  "eventId": "e3c4d5e6-...",
  "eventType": "orders.rejected",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:01.000Z",
  "aggregateId": "ord-abc123",
  "aggregateType": "Order",
  "correlationId": "corr-xyz789",
  "causationId": "e1a2b3c4-...",
  "payload": {
    "orderId": "ord-abc123",
    "userId": "usr-def456",
    "symbol": "RELIANCE",
    "side": "BUY",
    "quantity": 10,
    "rejectionReason": "INSUFFICIENT_FUNDS",
    "status": "REJECTED"
  }
}
```

### orders.executed (v1)

```json
{
  "eventId": "e4d5e6f7-...",
  "eventType": "orders.executed",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:02.000Z",
  "aggregateId": "ord-abc123",
  "aggregateType": "Order",
  "correlationId": "corr-xyz789",
  "causationId": "e2b3c4d5-...",
  "payload": {
    "orderId": "ord-abc123",
    "userId": "usr-def456",
    "symbol": "RELIANCE",
    "side": "BUY",
    "quantity": 10,
    "executionPricePaise": 245000,
    "totalValuePaise": 2450000,
    "tradeId": "trd-jkl012",
    "status": "EXECUTED"
  }
}
```

### orders.cancelled (v1)

```json
{
  "eventId": "e5e6f7g8-...",
  "eventType": "orders.cancelled",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:31:00.000Z",
  "aggregateId": "ord-abc123",
  "aggregateType": "Order",
  "correlationId": "corr-xyz789",
  "causationId": "cmd-cancel-001",
  "payload": {
    "orderId": "ord-abc123",
    "userId": "usr-def456",
    "symbol": "RELIANCE",
    "side": "BUY",
    "quantity": 10,
    "previousStatus": "ACCEPTED",
    "reservationId": "res-ghi789",
    "releasedAmountPaise": 2450000,
    "status": "CANCELLED"
  }
}
```

### trades.executed (v1)

```json
{
  "eventId": "e6f7g8h9-...",
  "eventType": "trades.executed",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:02.000Z",
  "aggregateId": "trd-jkl012",
  "aggregateType": "Trade",
  "correlationId": "corr-xyz789",
  "causationId": "e4d5e6f7-...",
  "payload": {
    "tradeId": "trd-jkl012",
    "orderId": "ord-abc123",
    "userId": "usr-def456",
    "symbol": "RELIANCE",
    "side": "BUY",
    "quantity": 10,
    "pricePaise": 245000,
    "totalValuePaise": 2450000,
    "executedAt": "2026-01-15T10:30:02.000Z"
  }
}
```

### wallet.reservation.completed (v1)

```json
{
  "eventId": "e7g8h9i0-...",
  "eventType": "wallet.reservation.completed",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:01.000Z",
  "aggregateId": "res-ghi789",
  "aggregateType": "WalletReservation",
  "correlationId": "corr-xyz789",
  "causationId": "cmd-reserve-001",
  "payload": {
    "reservationId": "res-ghi789",
    "userId": "usr-def456",
    "orderId": "ord-abc123",
    "reservedAmountPaise": 2450000,
    "availableBalancePaise": 7550000
  }
}
```

### wallet.reservation.failed (v1)

```json
{
  "eventId": "e8h9i0j1-...",
  "eventType": "wallet.reservation.failed",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:01.000Z",
  "aggregateId": "res-failed-001",
  "aggregateType": "WalletReservation",
  "correlationId": "corr-xyz789",
  "causationId": "cmd-reserve-001",
  "payload": {
    "userId": "usr-def456",
    "orderId": "ord-abc123",
    "requestedAmountPaise": 2450000,
    "availableBalancePaise": 1000000,
    "reason": "INSUFFICIENT_FUNDS"
  }
}
```

### market.price.updated (v1)

```json
{
  "eventId": "e9i0j1k2-...",
  "eventType": "market.price.updated",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:00.000Z",
  "aggregateId": "RELIANCE",
  "aggregateType": "Stock",
  "correlationId": "e9i0j1k2-...",
  "causationId": "e9i0j1k2-...",
  "payload": {
    "symbol": "RELIANCE",
    "pricePaise": 245000,
    "previousPricePaise": 244500,
    "changePaise": 500,
    "changePercent": "0.20",
    "timestamp": "2026-01-15T10:30:00.000Z"
  }
}
```

### portfolio.updated (v1)

```json
{
  "eventId": "e0j1k2l3-...",
  "eventType": "portfolio.updated",
  "eventVersion": 1,
  "occurredAt": "2026-01-15T10:30:03.000Z",
  "aggregateId": "usr-def456",
  "aggregateType": "Portfolio",
  "correlationId": "corr-xyz789",
  "causationId": "e6f7g8h9-...",
  "payload": {
    "userId": "usr-def456",
    "totalHoldings": 1,
    "totalInvestedPaise": 2450000,
    "currentValuePaise": 2450000,
    "unrealizedPnlPaise": 0,
    "realizedPnlPaise": 0,
    "lastProcessedEventId": "e6f7g8h9-...",
    "projectionTimestamp": "2026-01-15T10:30:03.000Z"
  }
}
```

## Idempotency

Consumers must track processed `eventId` values and skip duplicates.

**Portfolio Service**: Stores last processed offset and event ID in Redis.
**Notification Service**: Stores event ID in notification record, checks before creating.
**Order Service**: Uses outbox event ID deduplication in MySQL.

## Error Handling

### Retryable Errors
- Network timeout
- Database connection failure
- Kafka broker unavailable (temporary)

### Non-Retryable Errors
- Invalid event schema
- Business rule violation
- Unknown event type

Non-retryable errors should be sent to a dead-letter topic: `{original-topic}.dlq`

## Compatibility Rules

- New optional fields may be added without version bump
- Removing or renaming fields requires a new version
- Consumers must ignore unknown fields
- Producers must include all required fields for the declared version
