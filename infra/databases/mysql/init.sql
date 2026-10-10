-- MySQL initialization for Order Service
-- This runs automatically when the container is created for the first time.
-- The database and user are created by MYSQL_DATABASE/MYSQL_USER env vars.

-- Enable binary logging is configured via container command args.

-- Grant additional privileges needed for the application
ALTER USER 'order_service'@'%' IDENTIFIED WITH mysql_native_password BY 'dev_mysql_pass';
GRANT ALL PRIVILEGES ON order_service_db.* TO 'order_service'@'%';
FLUSH PRIVILEGES;

-- Note: Order Service schema definition
CREATE TABLE IF NOT EXISTS order_service_db.orders (
    order_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    side ENUM('BUY', 'SELL') NOT NULL,
    order_type ENUM('MARKET', 'LIMIT') NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    limit_price_paise BIGINT NULL,
    execution_price_paise BIGINT NULL,
    total_value_paise BIGINT NULL,
    status VARCHAR(20) NOT NULL,
    rejection_reason TEXT NULL,
    reservation_id VARCHAR(36) NULL,
    idempotency_key VARCHAR(64) NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_symbol (symbol),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_service_db.trades (
    trade_id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    side ENUM('BUY', 'SELL') NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price_paise BIGINT NOT NULL,
    total_value_paise BIGINT NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_trades_user_id (user_id),
    INDEX idx_trades_order_id (order_id),
    INDEX idx_trades_symbol (symbol),
    INDEX idx_trades_executed_at (executed_at),
    FOREIGN KEY (order_id) REFERENCES order_service_db.orders(order_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_service_db.outbox_messages (
    outbox_id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL UNIQUE,
    event_type VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(32) NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL,
    correlation_id VARCHAR(36) NOT NULL,
    causation_id VARCHAR(36) NULL,
    event_version INT NOT NULL DEFAULT 1,
    payload JSON NOT NULL,
    status ENUM('PENDING', 'PUBLISHED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    INDEX idx_outbox_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_service_db.idempotency_records (
    idempotency_key VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    order_id VARCHAR(36) NOT NULL,
    response_body JSON NOT NULL,
    status_code INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_idempotency_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_service_db.sagas (
    saga_id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    current_step VARCHAR(32) NOT NULL,
    status ENUM('STARTED', 'COMPLETED', 'FAILED', 'COMPENSATING', 'COMPENSATED') NOT NULL,
    reservation_id VARCHAR(36) NULL,
    error_message TEXT NULL,
    payload JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sagas_order (order_id),
    INDEX idx_sagas_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

