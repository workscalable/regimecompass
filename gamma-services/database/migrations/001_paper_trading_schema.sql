-- Paper Trading System Database Schema
-- Migration: 001_paper_trading_schema.sql

-- Paper Accounts Table
CREATE TABLE IF NOT EXISTS paper_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_balance DECIMAL(12,2) NOT NULL DEFAULT 100000,
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 100000,
  total_pnl DECIMAL(12,2) NOT NULL DEFAULT 0,
  available_balance DECIMAL(12,2) NOT NULL DEFAULT 100000,
  margin_used DECIMAL(12,2) NOT NULL DEFAULT 0,
  risk_settings JSONB NOT NULL DEFAULT '{
    "maxRiskPerTrade": 0.02,
    "maxPortfolioHeat": 0.20,
    "maxDrawdown": 0.10,
    "maxConsecutiveLosses": 3,
    "maxPositionSize": 0.10,
    "stopLossPercent": 0.50,
    "profitTargetMultiple": 2.0,
    "timeDecayThreshold": 0.30
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paper Positions Table
CREATE TABLE IF NOT EXISTS paper_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES paper_accounts(id) ON DELETE CASCADE,
  signal_id VARCHAR(50) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  option_symbol VARCHAR(50) NOT NULL,
  contract_type VARCHAR(4) NOT NULL CHECK (contract_type IN ('CALL', 'PUT')),
  strike DECIMAL(10,2) NOT NULL,
  expiration DATE NOT NULL,
  side VARCHAR(5) NOT NULL CHECK (side IN ('LONG', 'SHORT')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  entry_price DECIMAL(8,4) NOT NULL CHECK (entry_price > 0),
  current_price DECIMAL(8,4) NOT NULL CHECK (current_price >= 0),
  entry_timestamp TIMESTAMPTZ NOT NULL,
  exit_timestamp TIMESTAMPTZ,
  exit_price DECIMAL(8,4),
  pnl DECIMAL(12,2) NOT NULL DEFAULT 0,
  pnl_percent DECIMAL(8,4) NOT NULL DEFAULT 0,
  max_favorable_excursion DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_adverse_excursion DECIMAL(12,2) NOT NULL DEFAULT 0,
  greeks JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(10) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'EXPIRED')),
  confidence DECIMAL(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  conviction DECIMAL(4,3) NOT NULL CHECK (conviction >= 0 AND conviction <= 1),
  regime VARCHAR(10) NOT NULL CHECK (regime IN ('BULL', 'BEAR', 'NEUTRAL')),
  exit_reason VARCHAR(20) CHECK (exit_reason IN ('PROFIT_TARGET', 'STOP_LOSS', 'TIME_DECAY', 'EXPIRATION', 'RISK_MANAGEMENT', 'MANUAL')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade Analysis Table
CREATE TABLE IF NOT EXISTS trade_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID REFERENCES paper_positions(id) ON DELETE CASCADE,
  signal_id VARCHAR(50) NOT NULL,
  entry_confidence DECIMAL(4,3) NOT NULL CHECK (entry_confidence >= 0 AND entry_confidence <= 1),
  actual_outcome VARCHAR(4) NOT NULL CHECK (actual_outcome IN ('WIN', 'LOSS')),
  holding_period INTEGER NOT NULL CHECK (holding_period >= 0), -- in minutes
  confidence_effectiveness DECIMAL(6,4) NOT NULL,
  expected_vs_actual_move DECIMAL(6,4) NOT NULL,
  greeks_impact JSONB NOT NULL DEFAULT '{}',
  market_regime VARCHAR(10) NOT NULL CHECK (market_regime IN ('BULL', 'BEAR', 'NEUTRAL')),
  learnings TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES paper_accounts(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  total_trades INTEGER NOT NULL CHECK (total_trades >= 0),
  winning_trades INTEGER NOT NULL CHECK (winning_trades >= 0),
  losing_trades INTEGER NOT NULL CHECK (losing_trades >= 0),
  win_rate DECIMAL(5,2) NOT NULL CHECK (win_rate >= 0 AND win_rate <= 100),
  total_pnl DECIMAL(12,2) NOT NULL,
  average_win DECIMAL(12,2) NOT NULL DEFAULT 0,
  average_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
  profit_factor DECIMAL(6,2) NOT NULL DEFAULT 0,
  sharpe_ratio DECIMAL(6,4),
  max_drawdown DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_drawdown_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_trade_counts CHECK (winning_trades + losing_trades = total_trades)
);

-- Learning Data Table
CREATE TABLE IF NOT EXISTS learning_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_type VARCHAR(50) NOT NULL,
  confidence_adjustment DECIMAL(4,3) NOT NULL DEFAULT 0 CHECK (confidence_adjustment >= -0.2 AND confidence_adjustment <= 0.2),
  effectiveness_score DECIMAL(6,4) NOT NULL,
  sample_size INTEGER NOT NULL CHECK (sample_size > 0),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  insights JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(signal_type)
);

-- Risk Events Table
CREATE TABLE IF NOT EXISTS risk_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES paper_accounts(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('REDUCE_POSITION', 'CLOSE_POSITION', 'HALT_TRADING', 'ALERT')),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  position_id UUID REFERENCES paper_positions(id) ON DELETE SET NULL,
  auto_executed BOOLEAN NOT NULL DEFAULT FALSE,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paper_positions_account_id ON paper_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_paper_positions_ticker ON paper_positions(ticker);
CREATE INDEX IF NOT EXISTS idx_paper_positions_status ON paper_positions(status);
CREATE INDEX IF NOT EXISTS idx_paper_positions_signal_id ON paper_positions(signal_id);
CREATE INDEX IF NOT EXISTS idx_paper_positions_expiration ON paper_positions(expiration);

CREATE INDEX IF NOT EXISTS idx_trade_analyses_position_id ON trade_analyses(position_id);
CREATE INDEX IF NOT EXISTS idx_trade_analyses_signal_id ON trade_analyses(signal_id);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_account_id ON performance_metrics(account_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_period ON performance_metrics(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_learning_data_signal_type ON learning_data(signal_type);
CREATE INDEX IF NOT EXISTS idx_learning_data_last_updated ON learning_data(last_updated);

CREATE INDEX IF NOT EXISTS idx_risk_events_account_id ON risk_events(account_id);
CREATE INDEX IF NOT EXISTS idx_risk_events_severity ON risk_events(severity);
CREATE INDEX IF NOT EXISTS idx_risk_events_resolved ON risk_events(resolved);

-- Row Level Security (RLS) Policies
ALTER TABLE paper_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;

-- Policies for paper_accounts
CREATE POLICY "Users can view their own paper accounts" ON paper_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own paper accounts" ON paper_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own paper accounts" ON paper_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for paper_positions
CREATE POLICY "Users can view positions for their accounts" ON paper_positions
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert positions for their accounts" ON paper_positions
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update positions for their accounts" ON paper_positions
  FOR UPDATE USING (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

-- Policies for trade_analyses
CREATE POLICY "Users can view analyses for their positions" ON trade_analyses
  FOR SELECT USING (
    position_id IN (
      SELECT pp.id FROM paper_positions pp
      JOIN paper_accounts pa ON pp.account_id = pa.id
      WHERE pa.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert analyses for their positions" ON trade_analyses
  FOR INSERT WITH CHECK (
    position_id IN (
      SELECT pp.id FROM paper_positions pp
      JOIN paper_accounts pa ON pp.account_id = pa.id
      WHERE pa.user_id = auth.uid()
    )
  );

-- Policies for performance_metrics
CREATE POLICY "Users can view their performance metrics" ON performance_metrics
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

-- Learning data is shared across all users (read-only for users)
CREATE POLICY "Users can view learning data" ON learning_data
  FOR SELECT USING (true);

-- Service role can manage learning data
CREATE POLICY "Service role can manage learning data" ON learning_data
  FOR ALL USING (auth.role() = 'service_role');

-- Policies for risk_events
CREATE POLICY "Users can view their risk events" ON risk_events
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their risk events" ON risk_events
  FOR INSERT WITH CHECK (
    account_id IN (
      SELECT id FROM paper_accounts WHERE user_id = auth.uid()
    )
  );

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_paper_accounts_updated_at BEFORE UPDATE ON paper_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_paper_positions_updated_at BEFORE UPDATE ON paper_positions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate performance metrics
CREATE OR REPLACE FUNCTION calculate_performance_metrics(account_uuid UUID, start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  win_rate DECIMAL,
  total_pnl DECIMAL,
  average_win DECIMAL,
  average_loss DECIMAL,
  profit_factor DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH trade_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE pnl > 0) as wins,
      COUNT(*) FILTER (WHERE pnl < 0) as losses,
      SUM(pnl) as total_profit,
      AVG(pnl) FILTER (WHERE pnl > 0) as avg_win,
      AVG(pnl) FILTER (WHERE pnl < 0) as avg_loss
    FROM paper_positions 
    WHERE account_id = account_uuid 
      AND status IN ('CLOSED', 'EXPIRED')
      AND exit_timestamp BETWEEN start_date AND end_date
  )
  SELECT 
    total::INTEGER,
    wins::INTEGER,
    losses::INTEGER,
    CASE WHEN total > 0 THEN (wins::DECIMAL / total::DECIMAL * 100) ELSE 0 END,
    COALESCE(total_profit, 0),
    COALESCE(avg_win, 0),
    COALESCE(avg_loss, 0),
    CASE WHEN avg_loss < 0 THEN ABS(avg_win / avg_loss) ELSE 0 END
  FROM trade_stats;
END;
$$ LANGUAGE plpgsql;