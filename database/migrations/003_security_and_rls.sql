-- Migration 003: Row Level Security and Security Policies
-- This migration sets up Row Level Security (RLS) for data isolation

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for paper_accounts table
CREATE POLICY "Users can view own accounts" ON paper_accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own accounts" ON paper_accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own accounts" ON paper_accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own accounts" ON paper_accounts FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for paper_positions table
CREATE POLICY "Users can view own positions" ON paper_positions FOR SELECT USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own positions" ON paper_positions FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own positions" ON paper_positions FOR UPDATE USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own positions" ON paper_positions FOR DELETE USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);

-- RLS Policies for paper_orders table
CREATE POLICY "Users can view own orders" ON paper_orders FOR SELECT USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own orders" ON paper_orders FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own orders" ON paper_orders FOR UPDATE USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own orders" ON paper_orders FOR DELETE USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);

-- RLS Policies for trade_analysis table
CREATE POLICY "Users can view own trade analysis" ON trade_analysis FOR SELECT USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own trade analysis" ON trade_analysis FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own trade analysis" ON trade_analysis FOR UPDATE USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);

-- RLS Policies for performance_metrics table
CREATE POLICY "Users can view own performance metrics" ON performance_metrics FOR SELECT USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own performance metrics" ON performance_metrics FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own performance metrics" ON performance_metrics FOR UPDATE USING (
    account_id IN (SELECT id FROM paper_accounts WHERE user_id = auth.uid())
);

-- RLS Policies for system_logs table
CREATE POLICY "Users can view own system logs" ON system_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own system logs" ON system_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "System can insert logs for any user" ON system_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for audit_logs table
CREATE POLICY "Users can view own audit logs" ON audit_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own audit logs" ON audit_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "System can insert audit logs for any user" ON audit_logs FOR INSERT WITH CHECK (true);

-- RLS Policies for system_alerts table
CREATE POLICY "Users can view own alerts" ON system_alerts FOR SELECT USING (acknowledged_by = auth.uid());
CREATE POLICY "Users can update own alerts" ON system_alerts FOR UPDATE USING (acknowledged_by = auth.uid());
CREATE POLICY "System can insert alerts for any user" ON system_alerts FOR INSERT WITH CHECK (true);

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paper_accounts_updated_at 
    BEFORE UPDATE ON paper_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paper_positions_updated_at 
    BEFORE UPDATE ON paper_positions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paper_orders_updated_at 
    BEFORE UPDATE ON paper_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
