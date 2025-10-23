import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PaperPosition, TradeAnalysis } from '../paper/PaperTradingEngine';

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export interface PaperAccountRecord {
  id: string;
  user_id: string;
  initial_balance: number;
  current_balance: number;
  total_pnl: number;
  available_balance: number;
  margin_used: number;
  risk_settings: any;
  created_at: string;
  updated_at: string;
}

export interface PerformanceMetricsRecord {
  id: string;
  account_id: string;
  period_start: string;
  period_end: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  average_win: number;
  average_loss: number;
  profit_factor: number;
  sharpe_ratio?: number;
  max_drawdown: number;
  max_drawdown_percent: number;
  created_at: string;
}

export class DatabaseManager {
  private supabase: SupabaseClient;

  constructor(config: DatabaseConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }

  // Paper Account Operations
  async createPaperAccount(userId: string, initialBalance: number = 100000): Promise<PaperAccountRecord> {
    const { data, error } = await this.supabase
      .from('paper_accounts')
      .insert({
        user_id: userId,
        initial_balance: initialBalance,
        current_balance: initialBalance,
        available_balance: initialBalance
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create paper account: ${error.message}`);
    }

    return data;
  }

  async getPaperAccount(userId: string): Promise<PaperAccountRecord | null> {
    const { data, error } = await this.supabase
      .from('paper_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to get paper account: ${error.message}`);
    }

    return data;
  }

  async updatePaperAccount(accountId: string, updates: Partial<PaperAccountRecord>): Promise<void> {
    const { error } = await this.supabase
      .from('paper_accounts')
      .update(updates)
      .eq('id', accountId);

    if (error) {
      throw new Error(`Failed to update paper account: ${error.message}`);
    }
  }

  // Paper Position Operations
  async createPaperPosition(position: Omit<PaperPosition, 'id'>): Promise<string> {
    const positionRecord = {
      account_id: position.signalId, // This should be mapped to actual account_id
      signal_id: position.signalId,
      ticker: position.ticker,
      option_symbol: position.optionSymbol,
      contract_type: position.contractType,
      strike: position.strike,
      expiration: position.expiration.toISOString().split('T')[0],
      side: position.side,
      quantity: position.quantity,
      entry_price: position.entryPrice,
      current_price: position.currentPrice,
      entry_timestamp: position.entryTimestamp.toISOString(),
      pnl: position.pnl,
      pnl_percent: position.pnlPercent,
      max_favorable_excursion: position.maxFavorableExcursion,
      max_adverse_excursion: position.maxAdverseExcursion,
      greeks: position.greeks,
      status: position.status,
      confidence: position.confidence,
      conviction: position.conviction,
      regime: position.regime
    };

    const { data, error } = await this.supabase
      .from('paper_positions')
      .insert(positionRecord)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create paper position: ${error.message}`);
    }

    return data.id;
  }

  async updatePaperPosition(positionId: string, updates: Partial<PaperPosition>): Promise<void> {
    const updateRecord: any = {};

    if (updates.currentPrice !== undefined) updateRecord.current_price = updates.currentPrice;
    if (updates.pnl !== undefined) updateRecord.pnl = updates.pnl;
    if (updates.pnlPercent !== undefined) updateRecord.pnl_percent = updates.pnlPercent;
    if (updates.maxFavorableExcursion !== undefined) updateRecord.max_favorable_excursion = updates.maxFavorableExcursion;
    if (updates.maxAdverseExcursion !== undefined) updateRecord.max_adverse_excursion = updates.maxAdverseExcursion;
    if (updates.greeks !== undefined) updateRecord.greeks = updates.greeks;
    if (updates.status !== undefined) updateRecord.status = updates.status;
    if (updates.exitPrice !== undefined) updateRecord.exit_price = updates.exitPrice;
    if (updates.exitTimestamp !== undefined) updateRecord.exit_timestamp = updates.exitTimestamp.toISOString();
    if (updates.exitReason !== undefined) updateRecord.exit_reason = updates.exitReason;

    const { error } = await this.supabase
      .from('paper_positions')
      .update(updateRecord)
      .eq('id', positionId);

    if (error) {
      throw new Error(`Failed to update paper position: ${error.message}`);
    }
  }

  async getPaperPositions(accountId: string, status?: 'OPEN' | 'CLOSED' | 'EXPIRED'): Promise<PaperPosition[]> {
    let query = this.supabase
      .from('paper_positions')
      .select('*')
      .eq('account_id', accountId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get paper positions: ${error.message}`);
    }

    return data.map(this.mapPositionRecord);
  }

  async getPaperPosition(positionId: string): Promise<PaperPosition | null> {
    const { data, error } = await this.supabase
      .from('paper_positions')
      .select('*')
      .eq('id', positionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get paper position: ${error.message}`);
    }

    return data ? this.mapPositionRecord(data) : null;
  }

  // Trade Analysis Operations
  async createTradeAnalysis(analysis: TradeAnalysis & { positionId: string }): Promise<void> {
    const analysisRecord = {
      position_id: analysis.positionId,
      signal_id: analysis.signalId,
      entry_confidence: analysis.entryConfidence,
      actual_outcome: analysis.pnl > 0 ? 'WIN' : 'LOSS',
      holding_period: analysis.holdingPeriod,
      confidence_effectiveness: this.calculateConfidenceEffectiveness(analysis),
      expected_vs_actual_move: analysis.expectedMove - analysis.actualMove,
      greeks_impact: {}, // Placeholder for Greeks impact calculation
      market_regime: 'NEUTRAL', // Would be passed from analysis
      learnings: analysis.learnings
    };

    const { error } = await this.supabase
      .from('trade_analyses')
      .insert(analysisRecord);

    if (error) {
      throw new Error(`Failed to create trade analysis: ${error.message}`);
    }
  }

  // Performance Metrics Operations
  async calculateAndStorePerformanceMetrics(accountId: string, startDate: Date, endDate: Date): Promise<PerformanceMetricsRecord> {
    // Use the database function to calculate metrics
    const { data, error } = await this.supabase
      .rpc('calculate_performance_metrics', {
        account_uuid: accountId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

    if (error) {
      throw new Error(`Failed to calculate performance metrics: ${error.message}`);
    }

    const metrics = data[0];
    
    // Store the calculated metrics
    const metricsRecord = {
      account_id: accountId,
      period_start: startDate.toISOString(),
      period_end: endDate.toISOString(),
      total_trades: metrics.total_trades,
      winning_trades: metrics.winning_trades,
      losing_trades: metrics.losing_trades,
      win_rate: metrics.win_rate,
      total_pnl: metrics.total_pnl,
      average_win: metrics.average_win,
      average_loss: metrics.average_loss,
      profit_factor: metrics.profit_factor,
      max_drawdown: 0, // Would be calculated separately
      max_drawdown_percent: 0
    };

    const { data: insertedData, error: insertError } = await this.supabase
      .from('performance_metrics')
      .insert(metricsRecord)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to store performance metrics: ${insertError.message}`);
    }

    return insertedData;
  }

  async getPerformanceMetrics(accountId: string, limit: number = 10): Promise<PerformanceMetricsRecord[]> {
    const { data, error } = await this.supabase
      .from('performance_metrics')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }

    return data;
  }

  // Learning Data Operations
  async updateLearningData(signalType: string, adjustment: number, effectiveness: number, sampleSize: number): Promise<void> {
    const { error } = await this.supabase
      .from('learning_data')
      .upsert({
        signal_type: signalType,
        confidence_adjustment: adjustment,
        effectiveness_score: effectiveness,
        sample_size: sampleSize,
        last_updated: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to update learning data: ${error.message}`);
    }
  }

  async getLearningData(signalType?: string): Promise<any[]> {
    let query = this.supabase.from('learning_data').select('*');
    
    if (signalType) {
      query = query.eq('signal_type', signalType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get learning data: ${error.message}`);
    }

    return data;
  }

  // Risk Events Operations
  async createRiskEvent(accountId: string, eventType: string, severity: string, description: string, positionId?: string): Promise<void> {
    const { error } = await this.supabase
      .from('risk_events')
      .insert({
        account_id: accountId,
        event_type: eventType,
        severity,
        description,
        position_id: positionId
      });

    if (error) {
      throw new Error(`Failed to create risk event: ${error.message}`);
    }
  }

  async getRiskEvents(accountId: string, resolved: boolean = false): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('risk_events')
      .select('*')
      .eq('account_id', accountId)
      .eq('resolved', resolved)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get risk events: ${error.message}`);
    }

    return data;
  }

  // Utility Methods
  private mapPositionRecord(record: any): PaperPosition {
    return {
      id: record.id,
      signalId: record.signal_id,
      ticker: record.ticker,
      optionSymbol: record.option_symbol,
      contractType: record.contract_type,
      strike: record.strike,
      expiration: new Date(record.expiration),
      side: record.side,
      quantity: record.quantity,
      entryPrice: record.entry_price,
      currentPrice: record.current_price,
      entryTimestamp: new Date(record.entry_timestamp),
      exitTimestamp: record.exit_timestamp ? new Date(record.exit_timestamp) : undefined,
      exitPrice: record.exit_price,
      pnl: record.pnl,
      pnlPercent: record.pnl_percent,
      maxFavorableExcursion: record.max_favorable_excursion,
      maxAdverseExcursion: record.max_adverse_excursion,
      greeks: record.greeks,
      status: record.status,
      confidence: record.confidence,
      conviction: record.conviction,
      regime: record.regime,
      exitReason: record.exit_reason
    };
  }

  private calculateConfidenceEffectiveness(analysis: TradeAnalysis): number {
    // Simple confidence effectiveness calculation
    const moveAccuracy = 1 - Math.abs(analysis.expectedMove - analysis.actualMove) / Math.abs(analysis.expectedMove);
    const profitabilityScore = analysis.pnl > 0 ? 1 : -1;
    return analysis.entryConfidence * moveAccuracy * profitabilityScore;
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('paper_accounts')
        .select('id')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }
}