-- PostgreSQL initialization for Identity & Wallet Service
-- This runs automatically when the container is created for the first time.

-- Ensure the database exists (created by POSTGRES_DB env var)
-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Note: Schema migrations are handled by Flyway in the Identity & Wallet Service.
-- This file only sets up prerequisites that Flyway needs.

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE identity_wallet_db TO iw_service;
