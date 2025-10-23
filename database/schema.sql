-- RegimeCompass Database Schema
-- Production-ready schema for the RegimeCompass trading system

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paper_positions_account_id ON paper_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_paper_positions_ticker ON paper_positions(ticker);
CREATE INDEX IF NOT EXISTS idx_paper_positions_status ON paper_positions(status);
CREATE INDEX IF NOT EXISTS idx_paper_positions_created_at ON paper_positions(created_at);

CREATE INDEX IF NOT EXISTS idx_paper_orders_account_id ON paper_orders(account_id);
CREATE INDEX IF NOT EXISTS idx_paper_orders_position_id ON paper_orders(position_id);
CREATE INDEX IF NOT EXISTS idx_paper_orders_status ON paper_orders(status);

CREATE INDEX IF NOT EXISTS idx_trade_analysis_account_id ON trade_analysis(account_id);
CREATE INDEX IF NOT EXISTS idx_trade_analysis_ticker ON trade_analysis(ticker);
CREATE INDEX IF NOT EXISTS idx_trade_analysis_created_at ON trade_analysis(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_account_id ON performance_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_period ON performance_metrics(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_correlation_id ON system_logs(correlation_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own accounts" ON paper_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own accounts" ON paper_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own accounts" ON paper_accounts FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can view own positions" ON paper_positions FOR SELECT USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own positions" ON paper_positions FOR INSERT WITH CHECK (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own positions" ON paper_positions FOR UPDATE USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own orders" ON paper_orders FOR SELECT USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own orders" ON paper_orders FOR INSERT WITH CHECK (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own orders" ON paper_orders FOR UPDATE USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own trade analysis" ON trade_analysis FOR SELECT USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own trade analysis" ON trade_analysis FOR INSERT WITH CHECK (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own performance metrics" ON performance_metrics FOR SELECT USING (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own performance metrics" ON performance_metrics FOR INSERT WITH CHECK (account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own system logs" ON system_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own system logs" ON system_logs FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own audit logs" ON audit_logs FOR INSERT WITH CHECK (user_id = auth.uid());

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_paper_accounts_updated_at BEFORE UPDATE ON paper_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_paper_positions_updated_at BEFORE UPDATE ON paper_positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_paper_orders_updated_at BEFORE UPDATE ON paper_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
