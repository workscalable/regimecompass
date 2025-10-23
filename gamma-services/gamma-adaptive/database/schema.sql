-- Gamma Adaptive Trading System v3.0 Database Schema Extensions
-- Multi-Ticker Orchestrator State and Recovery Tables

-- Multi-Ticker Orchestrator State Table
CREATE TABLE IF NOT EXISTS orchestrator_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orchestrator_id VARCHAR(50) UNIQUE NOT NULL,
  active_ticker_count INTEGER NOT NULL DEFAULT 0,
  total_signals_processed BIGINT NOT NULL DEFAULT 0,
  active_trades INTEGER NOT NULL DEFAULT 0,
  portfolio_heat DECIMAL(5,2) NOT NULL DEFAULT 0,
  system_health JSONB NOT NULL DEFAULT '{"status": "HEALTHY", "components": {}, "overallScore": 1.0}',
  performance_metrics JSONB NOT NULL DEFAULT '{"processingLatency": 0, "throughput": 0, "errorRate": 0, "uptime": 0}',
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for orchestrator lookup
CREATE INDEX IF NOT EXISTS idx_orchestrator_state_orchestrator_id ON orchestrator_state(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_state_updated_at ON orchestrator_state(updated_at);

-- Ticker States Table
CREATE TABLE IF NOT EXISTS ticker_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orchestrator_id VARCHAR(50) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('READY', 'SET', 'GO', 'COOLDOWN')),
  confidence DECIMAL(4,3) NOT NULL DEFAULT 0,
  conviction DECIMAL(4,3) NOT NULL DEFAULT 0,
  fib_zone VARCHAR(20) NOT NULL DEFAULT 'MID_EXPANSION' CHECK (fib_zone IN ('COMPRESSION', 'MID_EXPANSION', 'FULL_EXPANSION', 'OVER_EXTENSION', 'EXHAUSTION')),
  gamma_exposure DECIMAL(6,4) NOT NULL DEFAULT 0,
  recommended_option JSONB,
  position_id UUID REFERENCES paper_positions(id),
  state_entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cooldown_until TIMESTAMPTZ,
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(orchestrator_id, ticker)
);

-- Create indexes for ticker states
CREATE INDEX IF NOT EXISTS idx_ticker_states_orchestrator_id ON ticker_states(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_ticker_states_ticker ON ticker_states(ticker);
CREATE INDEX IF NOT EXISTS idx_ticker_states_status ON ticker_states(status);
CREATE INDEX IF NOT EXISTS idx_ticker_states_updated_at ON ticker_states(updated_at);
CREATE INDEX IF NOT EXISTS idx_ticker_states_cooldown_until ON ticker_states(cooldown_until) WHERE cooldown_until IS NOT NULL;

-- State Transition History Table
CREATE TABLE IF NOT EXISTS state_transitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orchestrator_id VARCHAR(50) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  from_status VARCHAR(10) NOT NULL CHECK (from_status IN ('READY', 'SET', 'GO', 'COOLDOWN')),
  to_status VARCHAR(10) NOT NULL CHECK (to_status IN ('READY', 'SET', 'GO', 'COOLDOWN')),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  confidence DECIMAL(4,3),
  conviction DECIMAL(4,3),
  fib_zone VARCHAR(20),
  gamma_exposure DECIMAL(6,4),
  transition_reason VARCHAR(100),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for state transitions
CREATE INDEX IF NOT EXISTS idx_state_transitions_orchestrator_id ON state_transitions(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_state_transitions_ticker ON state_transitions(ticker);
CREATE INDEX IF NOT EXISTS idx_state_transitions_created_at ON state_transitions(created_at);
CREATE INDEX IF NOT EXISTS idx_state_transitions_ticker_created_at ON state_transitions(ticker, created_at);

-- Enhanced Signals Table
CREATE TABLE IF NOT EXISTS enhanced_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orchestrator_id VARCHAR(50) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  confidence DECIMAL(4,3) NOT NULL,
  conviction DECIMAL(4,3) NOT NULL,
  signal_factors JSONB NOT NULL,
  fib_analysis JSONB NOT NULL,
  gamma_analysis JSONB NOT NULL,
  recommendations JSONB NOT NULL DEFAULT '[]',
  risk_assessment JSONB NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for enhanced signals
CREATE INDEX IF NOT EXISTS idx_enhanced_signals_orchestrator_id ON enhanced_signals(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_signals_ticker ON enhanced_signals(ticker);
CREATE INDEX IF NOT EXISTS idx_enhanced_signals_created_at ON enhanced_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_signals_confidence ON enhanced_signals(confidence);

-- Performance Analytics Table
CREATE TABLE IF NOT EXISTS performance_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orchestrator_id VARCHAR(50) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL,
  fib_zone_performance JSONB NOT NULL DEFAULT '{}',
  ticker_performance JSONB NOT NULL DEFAULT '{}',
  processing_statistics JSONB NOT NULL DEFAULT '{}',
  learning_insights JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance analytics
CREATE INDEX IF NOT EXISTS idx_performance_analytics_orchestrator_id ON performance_analytics(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_period_start ON performance_analytics(period_start);
CREATE INDEX IF NOT EXISTS idx_performance_analytics_created_at ON performance_analytics(created_at);

-- Algorithm Learning Data Table
CREATE TABLE IF NOT EXISTS algorithm_learning (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orchestrator_id VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('CONFIDENCE_CALIBRATION', 'FIB_ZONE_EFFECTIVENESS', 'SIGNAL_OPTIMIZATION', 'RISK_ADJUSTMENT', 'PRIORITY_TUNING')),
  insight TEXT NOT NULL,
  confidence DECIMAL(4,3) NOT NULL,
  impact VARCHAR(10) NOT NULL CHECK (impact IN ('HIGH', 'MEDIUM', 'LOW')),
  recommendation TEXT NOT NULL,
  implementation TEXT NOT NULL,
  supporting_data JSONB NOT NULL DEFAULT '{}',
  applied BOOLEAN DEFAULT FALSE,
  applied_at TIMESTAMPTZ,
  effectiveness_score DECIMAL(4,3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for algorithm learning
CREATE INDEX IF NOT EXISTS idx_algorithm_learning_orchestrator_id ON algorithm_learning(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_algorithm_learning_category ON algorithm_learning(category);
CREATE INDEX IF NOT EXISTS idx_algorithm_learning_applied ON algorithm_learning(applied);
CREATE INDEX IF NOT EXISTS idx_algorithm_learning_created_at ON algorithm_learning(created_at);

-- System Recovery Checkpoints Table
CREATE TABLE IF NOT EXISTS system_checkpoints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orchestrator_id VARCHAR(50) NOT NULL,
  checkpoint_type VARCHAR(20) NOT NULL CHECK (checkpoint_type IN ('STARTUP', 'PERIODIC', 'SHUTDOWN', 'ERROR_RECOVERY')),
  system_state JSONB NOT NULL,
  ticker_states JSONB NOT NULL DEFAULT '{}',
  active_tasks JSONB NOT NULL DEFAULT '[]',
  configuration JSONB NOT NULL DEFAULT '{}',
  performance_snapshot JSONB NOT NULL DEFAULT '{}',
  recovery_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for system checkpoints
CREATE INDEX IF NOT EXISTS idx_system_checkpoints_orchestrator_id ON system_checkpoints(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_system_checkpoints_type ON system_checkpoints(checkpoint_type);
CREATE INDEX IF NOT EXISTS idx_system_checkpoints_created_at ON system_checkpoints(created_at);

-- Configuration History Table
CREATE TABLE IF NOT EXISTS configuration_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orchestrator_id VARCHAR(50) NOT NULL,
  configuration_type VARCHAR(30) NOT NULL CHECK (configuration_type IN ('ORCHESTRATOR', 'SIGNAL_PROCESSING', 'RISK_MANAGEMENT', 'DATA_PROVIDERS', 'ALERTS')),
  previous_config JSONB,
  new_config JSONB NOT NULL,
  change_reason VARCHAR(200),
  changed_by VARCHAR(50),
  validation_result JSONB,
  rollback_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for configuration history
CREATE INDEX IF NOT EXISTS idx_configuration_history_orchestrator_id ON configuration_history(orchestrator_id);
CREATE INDEX IF NOT EXISTS idx_configuration_history_type ON configuration_history(configuration_type);
CREATE INDEX IF NOT EXISTS idx_configuration_history_created_at ON configuration_history(created_at);

-- Data Retention Policies (Comments for implementation)
-- 
-- RETENTION POLICY RECOMMENDATIONS:
-- - ticker_states: Keep current state + 7 days of history
-- - state_transitions: Keep 30 days for analysis
-- - enhanced_signals: Keep 7 days for debugging
-- - performance_analytics: Keep 1 year for long-term analysis
-- - algorithm_learning: Keep indefinitely (valuable for ML)
-- - system_checkpoints: Keep 30 days for recovery
-- - configuration_history: Keep 1 year for audit trail

-- Cleanup Functions (to be implemented in application)
-- 
-- CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
-- BEGIN
--   -- Clean up old state transitions (keep 30 days)
--   DELETE FROM state_transitions WHERE created_at < NOW() - INTERVAL '30 days';
--   
--   -- Clean up old enhanced signals (keep 7 days)
--   DELETE FROM enhanced_signals WHERE created_at < NOW() - INTERVAL '7 days';
--   
--   -- Clean up old system checkpoints (keep 30 days)
--   DELETE FROM system_checkpoints WHERE created_at < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_orchestrator_state_updated_at ON orchestrator_state;
CREATE TRIGGER update_orchestrator_state_updated_at
    BEFORE UPDATE ON orchestrator_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticker_states_updated_at ON ticker_states;
CREATE TRIGGER update_ticker_states_updated_at
    BEFORE UPDATE ON ticker_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW active_ticker_summary AS
SELECT 
    ts.orchestrator_id,
    ts.ticker,
    ts.status,
    ts.confidence,
    ts.conviction,
    ts.fib_zone,
    ts.gamma_exposure,
    ts.state_entry_time,
    ts.cooldown_until,
    EXTRACT(EPOCH FROM (NOW() - ts.state_entry_time)) * 1000 as time_in_state_ms,
    pp.id as position_id,
    pp.pnl as position_pnl,
    pp.status as position_status
FROM ticker_states ts
LEFT JOIN paper_positions pp ON ts.position_id = pp.id
WHERE ts.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY ts.confidence DESC, ts.conviction DESC;

CREATE OR REPLACE VIEW orchestrator_health_summary AS
SELECT 
    os.orchestrator_id,
    os.active_ticker_count,
    os.total_signals_processed,
    os.active_trades,
    os.portfolio_heat,
    os.system_health->>'status' as health_status,
    os.performance_metrics->>'processingLatency' as avg_latency_ms,
    os.performance_metrics->>'throughput' as throughput_per_sec,
    os.performance_metrics->>'errorRate' as error_rate,
    os.updated_at as last_update,
    COUNT(ts.id) as actual_ticker_count,
    COUNT(CASE WHEN ts.status = 'READY' THEN 1 END) as ready_count,
    COUNT(CASE WHEN ts.status = 'SET' THEN 1 END) as set_count,
    COUNT(CASE WHEN ts.status = 'GO' THEN 1 END) as go_count,
    COUNT(CASE WHEN ts.status = 'COOLDOWN' THEN 1 END) as cooldown_count
FROM orchestrator_state os
LEFT JOIN ticker_states ts ON os.orchestrator_id = ts.orchestrator_id
GROUP BY os.id, os.orchestrator_id, os.active_ticker_count, os.total_signals_processed, 
         os.active_trades, os.portfolio_heat, os.system_health, os.performance_metrics, os.updated_at;

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gamma_trading_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gamma_trading_user;
-- GRANT SELECT ON active_ticker_summary, orchestrator_health_summary TO gamma_trading_user;