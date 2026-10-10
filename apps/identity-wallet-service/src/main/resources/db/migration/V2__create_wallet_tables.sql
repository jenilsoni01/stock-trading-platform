-- ============================================
-- V2: Wallet tables
-- All monetary values in INTEGER PAISE (1 INR = 100 paise)
-- ============================================

-- Wallet accounts: one per user
CREATE TABLE IF NOT EXISTS wallet_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    available_balance_paise BIGINT NOT NULL DEFAULT 0,
    reserved_balance_paise BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    
    -- Invariant: balances can never go negative
    CONSTRAINT chk_available_balance_non_negative CHECK (available_balance_paise >= 0),
    CONSTRAINT chk_reserved_balance_non_negative CHECK (reserved_balance_paise >= 0)
);

CREATE INDEX idx_wallet_accounts_user_id ON wallet_accounts(user_id);

-- Wallet ledger: append-only record of every balance change
CREATE TABLE IF NOT EXISTS wallet_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallet_accounts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    entry_type VARCHAR(30) NOT NULL,
    amount_paise BIGINT NOT NULL,
    balance_after_paise BIGINT NOT NULL,
    reference_id VARCHAR(255),
    reference_type VARCHAR(50),
    description VARCHAR(500),
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Entry types: CREDIT_INITIAL, CREDIT_SELL, DEBIT_RESERVE, CREDIT_RELEASE, DEBIT_CAPTURE
    CONSTRAINT chk_entry_type CHECK (entry_type IN (
        'CREDIT_INITIAL', 'CREDIT_SELL', 'DEBIT_RESERVE', 
        'CREDIT_RELEASE', 'DEBIT_CAPTURE', 'CREDIT_REFUND'
    ))
);

CREATE INDEX idx_wallet_ledger_wallet_id ON wallet_ledger(wallet_id);
CREATE INDEX idx_wallet_ledger_user_id ON wallet_ledger(user_id);
CREATE INDEX idx_wallet_ledger_reference_id ON wallet_ledger(reference_id);
CREATE UNIQUE INDEX idx_wallet_ledger_idempotency ON wallet_ledger(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Cash reservations: track reserved amounts for pending orders
CREATE TABLE IF NOT EXISTS cash_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallet_accounts(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_id VARCHAR(255) NOT NULL,
    reserved_amount_paise BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    idempotency_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_reservation_amount_positive CHECK (reserved_amount_paise > 0),
    CONSTRAINT chk_reservation_status CHECK (status IN ('ACTIVE', 'CAPTURED', 'RELEASED'))
);

CREATE INDEX idx_cash_reservations_wallet_id ON cash_reservations(wallet_id);
CREATE INDEX idx_cash_reservations_order_id ON cash_reservations(order_id);
CREATE UNIQUE INDEX idx_cash_reservations_idempotency ON cash_reservations(idempotency_key);

-- Idempotency records for financial operations
CREATE TABLE IF NOT EXISTS idempotency_records (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    response_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
