import { Pool, PoolClient, QueryResult } from 'pg';
import { PaperPosition, TradeAnalysis } from '../paper/PaperTradingEngine';

export interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
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

export class PostgreSQLManager {
  private pool: Pool;
  private config: PostgreSQLConfig;

  constructor(config: PostgreSQLConfig) {
    this.config = config;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.max || 20,
      idleTimeoutMillis: config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis || 10000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  // Connection management
  async connect(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const client = await this.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Paper Account Operations
  async createPaperAccount(userId: string, initialBalance: number = 100000): Promise<PaperAccountRecord> {
    const query = `
      INSERT INTO paper_accounts (user_id, account_name, initial_balance, current_balance, available_balance)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [userId, 'Default Account', initialBalance, initialBalance, initialBalance];
    const result = await this.query(query, values);
    return this.mapAccountFromDatabase(result.rows[0]);
  }

  async getPaperAccount(accountId: string): Promise<PaperAccountRecord | null> {
    const query = 'SELECT * FROM paper_accounts WHERE id = $1';
    const result = await this.query(query, [accountId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapAccountFromDatabase(result.rows[0]);
  }

  async updatePaperAccountBalance(accountId: string, newBalance: number, availableBalance: number): Promise<void> {
    const query = `
      UPDATE paper_accounts 
      SET current_balance = $1, available_balance = $2, updated_at = NOW()
      WHERE id = $3
    `;
    
    await this.query(query, [newBalance, availableBalance, accountId]);
  }

  // Paper Position Operations
  async createPaperPosition(position: Omit<PaperPosition, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaperPosition> {
    const query = `
      INSERT INTO paper_positions (
        account_id, signal_id, ticker, side, contract_type, option_symbol,
        strike, expiration, quantity, entry_price, current_price,
        pnl, pnl_percent, confidence, conviction, regime, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    
    const values = [
      position.accountId, position.signalId, position.ticker, position.side,
      position.contractType, position.optionSymbol, position.strike, position.expiration,
      position.quantity, position.entryPrice, position.currentPrice, position.pnl,
      position.pnlPercent, position.confidence, position.conviction, position.regime, position.status
    ];
    
    const result = await this.query(query, values);
    return this.mapPositionFromDatabase(result.rows[0]);
  }

  async getPaperPositions(accountId: string, status?: string): Promise<PaperPosition[]> {
    let query = 'SELECT * FROM paper_positions WHERE account_id = $1';
    const params: any[] = [accountId];
    
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await this.query(query, params);
    return result.rows.map(row => this.mapPositionFromDatabase(row));
  }

  async updatePaperPosition(positionId: string, updates: Partial<PaperPosition>): Promise<void> {
    const setClause = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'createdAt' && key !== 'updatedAt')
      .map((key, index) => `${this.camelToSnake(key)} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates).filter((_, index) => 
      Object.keys(updates)[index] !== 'id' && 
      Object.keys(updates)[index] !== 'createdAt' && 
      Object.keys(updates)[index] !== 'updatedAt'
    );
    
    const query = `UPDATE paper_positions SET ${setClause}, updated_at = NOW() WHERE id = $1`;
    await this.query(query, [positionId, ...values]);
  }

  // Trade Analysis Operations
  async createTradeAnalysis(analysis: Omit<TradeAnalysis, 'id' | 'createdAt'>): Promise<TradeAnalysis> {
    const query = `
      INSERT INTO trade_analysis (
        account_id, position_id, signal_id, ticker, entry_confidence,
        exit_confidence, expected_move, actual_move, pnl, holding_period,
        max_favorable_excursion, max_adverse_excursion, exit_reason, learnings
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const values = [
      analysis.accountId, analysis.positionId, analysis.signalId, analysis.ticker,
      analysis.entryConfidence, analysis.exitConfidence, analysis.expectedMove,
      analysis.actualMove, analysis.pnl, analysis.holdingPeriod,
      analysis.maxFavorableExcursion, analysis.maxAdverseExcursion,
      analysis.exitReason, analysis.learnings
    ];
    
    const result = await this.query(query, values);
    return this.mapTradeAnalysisFromDatabase(result.rows[0]);
  }

  // Performance Metrics Operations
  async createPerformanceMetrics(metrics: Omit<PerformanceMetricsRecord, 'id' | 'created_at'>): Promise<PerformanceMetricsRecord> {
    const query = `
      INSERT INTO performance_metrics (
        account_id, period_start, period_end, total_trades, winning_trades,
        losing_trades, win_rate, total_pnl, average_win, average_loss,
        profit_factor, sharpe_ratio, max_drawdown, max_drawdown_percent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const values = [
      metrics.account_id, metrics.period_start, metrics.period_end,
      metrics.total_trades, metrics.winning_trades, metrics.losing_trades,
      metrics.win_rate, metrics.total_pnl, metrics.average_win,
      metrics.average_loss, metrics.profit_factor, metrics.sharpe_ratio,
      metrics.max_drawdown, metrics.max_drawdown_percent
    ];
    
    const result = await this.query(query, values);
    return result.rows[0];
  }

  // System Logs Operations
  async createSystemLog(log: {
    level: string;
    category: string;
    message: string;
    correlationId?: string;
    userId?: string;
    accountId?: string;
    ticker?: string;
    positionId?: string;
    orderId?: string;
    metadata?: any;
  }): Promise<void> {
    const query = `
      INSERT INTO system_logs (
        level, category, message, correlation_id, user_id, account_id,
        ticker, position_id, order_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    const values = [
      log.level, log.category, log.message, log.correlationId,
      log.userId, log.accountId, log.ticker, log.positionId,
      log.orderId, log.metadata ? JSON.stringify(log.metadata) : null
    ];
    
    await this.query(query, values);
  }

  // Audit Logs Operations
  async createAuditLog(log: {
    eventType: string;
    resource: string;
    action: string;
    userId?: string;
    accountId?: string;
    outcome: string;
    errorMessage?: string;
    metadata?: any;
  }): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        event_type, resource, action, user_id, account_id,
        outcome, error_message, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    const values = [
      log.eventType, log.resource, log.action, log.userId,
      log.accountId, log.outcome, log.errorMessage,
      log.metadata ? JSON.stringify(log.metadata) : null
    ];
    
    await this.query(query, values);
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // Helper methods
  private mapAccountFromDatabase(row: any): PaperAccountRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      initial_balance: parseFloat(row.initial_balance),
      current_balance: parseFloat(row.current_balance),
      total_pnl: parseFloat(row.total_pnl || 0),
      available_balance: parseFloat(row.available_balance),
      margin_used: parseFloat(row.margin_used || 0),
      risk_settings: row.risk_settings,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapPositionFromDatabase(row: any): PaperPosition {
    return {
      id: row.id,
      accountId: row.account_id,
      signalId: row.signal_id,
      ticker: row.ticker,
      side: row.side,
      contractType: row.contract_type,
      optionSymbol: row.option_symbol,
      strike: parseFloat(row.strike),
      expiration: new Date(row.expiration),
      quantity: row.quantity,
      entryPrice: parseFloat(row.entry_price),
      currentPrice: row.current_price ? parseFloat(row.current_price) : undefined,
      exitPrice: row.exit_price ? parseFloat(row.exit_price) : undefined,
      pnl: parseFloat(row.pnl || 0),
      pnlPercent: parseFloat(row.pnl_percent || 0),
      maxFavorableExcursion: parseFloat(row.max_favorable_excursion || 0),
      maxAdverseExcursion: parseFloat(row.max_adverse_excursion || 0),
      confidence: parseFloat(row.confidence),
      conviction: row.conviction ? parseFloat(row.conviction) : undefined,
      regime: row.regime,
      status: row.status,
      exitReason: row.exit_reason,
      entryTimestamp: new Date(row.entry_timestamp),
      exitTimestamp: row.exit_timestamp ? new Date(row.exit_timestamp) : undefined,
      greeks: row.greeks,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private mapTradeAnalysisFromDatabase(row: any): TradeAnalysis {
    return {
      id: row.id,
      accountId: row.account_id,
      positionId: row.position_id,
      signalId: row.signal_id,
      ticker: row.ticker,
      entryConfidence: parseFloat(row.entry_confidence),
      exitConfidence: row.exit_confidence ? parseFloat(row.exit_confidence) : undefined,
      expectedMove: row.expected_move ? parseFloat(row.expected_move) : undefined,
      actualMove: row.actual_move ? parseFloat(row.actual_move) : undefined,
      pnl: parseFloat(row.pnl),
      holdingPeriod: row.holding_period,
      maxFavorableExcursion: row.max_favorable_excursion ? parseFloat(row.max_favorable_excursion) : undefined,
      maxAdverseExcursion: row.max_adverse_excursion ? parseFloat(row.max_adverse_excursion) : undefined,
      exitReason: row.exit_reason,
      learnings: row.learnings,
      createdAt: new Date(row.created_at)
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
