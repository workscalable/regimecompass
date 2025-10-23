-- Migration 002: Indexes and Performance Optimization
-- This migration adds indexes for better query performance

-- Indexes for paper_positions
CREATE INDEX IF NOT EXISTS idx_paper_positions_account_id ON paper_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_paper_positions_ticker ON paper_positions(ticker);
CREATE INDEX IF NOT EXISTS idx_paper_positions_status ON paper_positions(status);
CREATE INDEX IF NOT EXISTS idx_paper_positions_created_at ON paper_positions(created_at);
CREATE INDEX IF NOT EXISTS idx_paper_positions_expiration ON paper_positions(expiration);
CREATE INDEX IF NOT EXISTS idx_paper_positions_confidence ON paper_positions(confidence);

-- Indexes for paper_orders
CREATE INDEX IF NOT EXISTS idx_paper_orders_account_id ON paper_orders(account_id);
CREATE INDEX IF NOT EXISTS idx_paper_orders_position_id ON paper_orders(position_id);
CREATE INDEX IF NOT EXISTS idx_paper_orders_status ON paper_orders(status);
CREATE INDEX IF NOT EXISTS idx_paper_orders_ticker ON paper_orders(ticker);
CREATE INDEX IF NOT EXISTS idx_paper_orders_created_at ON paper_orders(created_at);

-- Indexes for trade_analysis
CREATE INDEX IF NOT EXISTS idx_trade_analysis_account_id ON trade_analysis(account_id);
CREATE INDEX IF NOT EXISTS idx_trade_analysis_ticker ON trade_analysis(ticker);
CREATE INDEX IF NOT EXISTS idx_trade_analysis_created_at ON trade_analysis(created_at);
CREATE INDEX IF NOT EXISTS idx_trade_analysis_signal_id ON trade_analysis(signal_id);

-- Indexes for performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_account_id ON performance_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_period ON performance_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);

-- Indexes for system_logs
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_correlation_id ON system_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_account_id ON system_logs(account_id);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome ON audit_logs(outcome);

-- Indexes for system_alerts
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_system_alerts_alert_type ON system_alerts(alert_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_paper_positions_account_status ON paper_positions(account_id, status);
CREATE INDEX IF NOT EXISTS idx_paper_positions_ticker_status ON paper_positions(ticker, status);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_created ON system_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at);
