-- Migration 001: Initial Schema
-- This migration creates the initial database schema for RegimeCompass

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paper trading accounts
CREATE TABLE IF NOT EXISTS paper_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_name VARCHAR(100) NOT NULL,
    initial_balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
    available_balance DECIMAL(15,2) NOT NULL DEFAULT 100000.00,
    total_pnl DECIMAL(15,2) DEFAULT 0.00,
    margin_used DECIMAL(15,2) DEFAULT 0.00,
    risk_settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paper positions
CREATE TABLE IF NOT EXISTS paper_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES paper_accounts(id) ON DELETE CASCADE,
    signal_id VARCHAR(100),
    ticker VARCHAR(10) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('LONG', 'SHORT')),
    contract_type VARCHAR(10) NOT NULL CHECK (contract_type IN ('CALL', 'PUT')),
    option_symbol VARCHAR(50) NOT NULL,
    strike DECIMAL(10,2) NOT NULL,
    expiration TIMESTAMP WITH TIME ZONE NOT NULL,
    quantity INTEGER NOT NULL,
    entry_price DECIMAL(10,4) NOT NULL,
    current_price DECIMAL(10,4),
    exit_price DECIMAL(10,4),
    pnl DECIMAL(15,2) DEFAULT 0.00,
    pnl_percent DECIMAL(8,4) DEFAULT 0.00,
    max_favorable_excursion DECIMAL(15,2) DEFAULT 0.00,
    max_adverse_excursion DECIMAL(15,2) DEFAULT 0.00,
    confidence DECIMAL(4,3) NOT NULL,
    conviction DECIMAL(4,3),
    regime VARCHAR(20) CHECK (regime IN ('BULL', 'BEAR', 'NEUTRAL')),
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'EXPIRED')),
    exit_reason VARCHAR(50),
    entry_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    exit_timestamp TIMESTAMP WITH TIME ZONE,
    greeks JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Paper orders
CREATE TABLE IF NOT EXISTS paper_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES paper_accounts(id) ON DELETE CASCADE,
    position_id UUID REFERENCES paper_positions(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    option_symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,4) NOT NULL,
    order_type VARCHAR(20) DEFAULT 'MARKET' CHECK (order_type IN ('MARKET', 'LIMIT', 'STOP')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED', 'REJECTED')),
    filled BOOLEAN DEFAULT false,
    fill_price DECIMAL(10,4),
    fill_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade analysis
CREATE TABLE IF NOT EXISTS trade_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES paper_accounts(id) ON DELETE CASCADE,
    position_id UUID REFERENCES paper_positions(id) ON DELETE CASCADE,
    signal_id VARCHAR(100) NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    entry_confidence DECIMAL(4,3) NOT NULL,
    exit_confidence DECIMAL(4,3),
    expected_move DECIMAL(8,4),
    actual_move DECIMAL(8,4),
    pnl DECIMAL(15,2) NOT NULL,
    holding_period BIGINT, -- in milliseconds
    max_favorable_excursion DECIMAL(15,2),
    max_adverse_excursion DECIMAL(15,2),
    exit_reason VARCHAR(50),
    learnings TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES paper_accounts(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,4) DEFAULT 0.00,
    total_pnl DECIMAL(15,2) DEFAULT 0.00,
    average_win DECIMAL(15,2) DEFAULT 0.00,
    average_loss DECIMAL(15,2) DEFAULT 0.00,
    profit_factor DECIMAL(8,4) DEFAULT 0.00,
    sharpe_ratio DECIMAL(8,4),
    max_drawdown DECIMAL(15,2) DEFAULT 0.00,
    max_drawdown_percent DECIMAL(8,4) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    correlation_id VARCHAR(100),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    account_id UUID REFERENCES paper_accounts(id) ON DELETE SET NULL,
    ticker VARCHAR(10),
    position_id UUID REFERENCES paper_positions(id) ON DELETE SET NULL,
    order_id UUID REFERENCES paper_orders(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    account_id UUID REFERENCES paper_accounts(id) ON DELETE SET NULL,
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System alerts
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);