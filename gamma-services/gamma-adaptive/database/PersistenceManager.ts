import { Pool, PoolClient } from 'pg';
import { 
  TickerState, 
  MultiTickerState, 
  EnhancedSignal,
  PerformanceMetrics,
  GammaAdaptiveConfig
} from '../types/core.js';
import { StateTransition } from '../orchestrators/TickerStateManager.js';

/**
 * Comprehensive persistence manager for multi-ticker state and recovery
 * Handles database operations, state persistence, and system recovery
 */
export class PersistenceManager {
  private pool: Pool;
  private isInitialized: boolean = false;
  private orchestratorId: string;

  constructor(orchestratorId: string, databaseConfig?: DatabaseConfig) {
    this.orchestratorId = orchestratorId;
    
    // Initialize database connection pool
    this.pool = new Pool({
      host: databaseConfig?.host || process.env.DB_HOST || 'localhost',
      port: databaseConfig?.port || parseInt(process.env.DB_PORT || '5432'),
      database: databaseConfig?.database || process.env.DB_NAME || 'paper_trading',
      user: databaseConfig?.user || process.env.DB_USER || 'postgres',
      password: databaseConfig?.password || process.env.DB_PASSWORD || '',
      max: databaseConfig?.maxConnections || 20,
      idleTimeoutMillis: databaseConfig?.idleTimeout || 30000,
      connectionTimeoutMillis: databaseConfig?.connectionTimeout || 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
    });
  }

  /**
   * Initialize persistence manager and create tables if needed
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Initialize orchestrator state record
      await this.initializeOrchestratorState();

      this.isInitialized = true;
      console.log('Persistence manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize persistence manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown persistence manager
   */
  public async shutdown(): Promise<void> {
    try {
      await this.pool.end();
      this.isInitialized = false;
      console.log('Persistence manager shutdown complete');
    } catch (error) {
      console.error('Error during persistence manager shutdown:', error);
    }
  }

  /**
   * Persist orchestrator state
   */
  public async persistOrchestratorState(state: MultiTickerState): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Persistence manager not initialized');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Update orchestrator state
      await client.query(`
        UPDATE orchestrator_state 
        SET 
          active_ticker_count = $1,
          total_signals_processed = $2,
          active_trades = $3,
          portfolio_heat = $4,
          system_health = $5,
          performance_metrics = $6,
          updated_at = NOW()
        WHERE orchestrator_id = $7
      `, [
        state.activeTickerCount,
        state.totalSignalsProcessed,
        state.activeTrades,
        state.portfolioHeat,
        JSON.stringify(state.systemHealth),
        JSON.stringify(state.performance),
        this.orchestratorId
      ]);

      // Persist all ticker states
      for (const [ticker, tickerState] of Object.entries(state.tickers)) {
        await this.persistTickerState(client, tickerState);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error persisting orchestrator state:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Persist individual ticker state
   */
  public async persistTickerState(client: PoolClient | null, tickerState: TickerState): Promise<void> {
    const dbClient = client || await this.pool.connect();
    const shouldRelease = !client;

    try {
      await dbClient.query(`
        INSERT INTO ticker_states (
          orchestrator_id, ticker, status, confidence, conviction, 
          fib_zone, gamma_exposure, recommended_option, position_id,
          state_entry_time, cooldown_until, last_update
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (orchestrator_id, ticker) 
        DO UPDATE SET
          status = EXCLUDED.status,
          confidence = EXCLUDED.confidence,
          conviction = EXCLUDED.conviction,
          fib_zone = EXCLUDED.fib_zone,
          gamma_exposure = EXCLUDED.gamma_exposure,
          recommended_option = EXCLUDED.recommended_option,
          position_id = EXCLUDED.position_id,
          state_entry_time = EXCLUDED.state_entry_time,
          cooldown_until = EXCLUDED.cooldown_until,
          last_update = EXCLUDED.last_update,
          updated_at = NOW()
      `, [
        this.orchestratorId,
        tickerState.ticker,
        tickerState.status,
        tickerState.confidence,
        tickerState.conviction,
        tickerState.fibZone,
        tickerState.gammaExposure,
        tickerState.recommendedOption ? JSON.stringify(tickerState.recommendedOption) : null,
        tickerState.position?.id || null,
        tickerState.stateEntryTime,
        tickerState.cooldownUntil || null,
        tickerState.lastUpdate
      ]);
    } catch (error) {
      console.error(`Error persisting ticker state for ${tickerState.ticker}:`, error);
      throw error;
    } finally {
      if (shouldRelease) {
        dbClient.release();
      }
    }
  }

  /**
   * Record state transition
   */
  public async recordStateTransition(
    ticker: string, 
    transition: StateTransition,
    metadata?: any
  ): Promise<void> {
    if (!this.isInitialized) {
      return; // Fail silently if not initialized
    }

    try {
      await this.pool.query(`
        INSERT INTO state_transitions (
          orchestrator_id, ticker, from_status, to_status, duration_ms,
          transition_reason, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        this.orchestratorId,
        ticker,
        transition.from,
        transition.to,
        transition.duration,
        'Automatic transition', // Could be enhanced with actual reason
        metadata ? JSON.stringify(metadata) : null,
        transition.timestamp
      ]);
    } catch (error) {
      console.error(`Error recording state transition for ${ticker}:`, error);
      // Don't throw - transitions are for analytics, not critical
    }
  }

  /**
   * Persist enhanced signal
   */
  public async persistEnhancedSignal(signal: EnhancedSignal, processingTimeMs?: number): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.pool.query(`
        INSERT INTO enhanced_signals (
          orchestrator_id, ticker, confidence, conviction, signal_factors,
          fib_analysis, gamma_analysis, recommendations, risk_assessment,
          metadata, processing_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        this.orchestratorId,
        signal.ticker,
        signal.confidence,
        signal.conviction,
        JSON.stringify(signal.factors),
        JSON.stringify(signal.fibAnalysis),
        JSON.stringify(signal.gammaAnalysis),
        JSON.stringify(signal.recommendations),
        JSON.stringify(signal.riskAssessment),
        JSON.stringify(signal.metadata),
        processingTimeMs || null
      ]);
    } catch (error) {
      console.error(`Error persisting enhanced signal for ${signal.ticker}:`, error);
      // Don't throw - signal persistence is for analytics
    }
  }

  /**
   * Create system checkpoint for recovery
   */
  public async createSystemCheckpoint(
    checkpointType: CheckpointType,
    systemState: MultiTickerState,
    activeTasks: any[] = [],
    configuration?: GammaAdaptiveConfig
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Persistence manager not initialized');
    }

    try {
      const result = await this.pool.query(`
        INSERT INTO system_checkpoints (
          orchestrator_id, checkpoint_type, system_state, ticker_states,
          active_tasks, configuration, performance_snapshot, recovery_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        this.orchestratorId,
        checkpointType,
        JSON.stringify(systemState),
        JSON.stringify(systemState.tickers),
        JSON.stringify(activeTasks),
        configuration ? JSON.stringify(configuration) : null,
        JSON.stringify(systemState.performance),
        JSON.stringify({ version: '3.0', created_by: 'PersistenceManager' })
      ]);

      const checkpointId = result.rows[0].id;
      console.log(`System checkpoint created: ${checkpointId} (${checkpointType})`);
      return checkpointId;
    } catch (error) {
      console.error('Error creating system checkpoint:', error);
      throw error;
    }
  }

  /**
   * Recover system state from latest checkpoint
   */
  public async recoverSystemState(): Promise<SystemRecoveryData | null> {
    if (!this.isInitialized) {
      throw new Error('Persistence manager not initialized');
    }

    try {
      // Get latest checkpoint
      const checkpointResult = await this.pool.query(`
        SELECT * FROM system_checkpoints 
        WHERE orchestrator_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [this.orchestratorId]);

      if (checkpointResult.rows.length === 0) {
        console.log('No system checkpoint found for recovery');
        return null;
      }

      const checkpoint = checkpointResult.rows[0];

      // Get current ticker states
      const tickerStatesResult = await this.pool.query(`
        SELECT * FROM ticker_states 
        WHERE orchestrator_id = $1 
        ORDER BY updated_at DESC
      `, [this.orchestratorId]);

      const recoveryData: SystemRecoveryData = {
        checkpointId: checkpoint.id,
        checkpointType: checkpoint.checkpoint_type,
        systemState: checkpoint.system_state,
        tickerStates: tickerStatesResult.rows.map(row => this.mapRowToTickerState(row)),
        activeTasks: checkpoint.active_tasks || [],
        configuration: checkpoint.configuration,
        performanceSnapshot: checkpoint.performance_snapshot,
        checkpointTime: checkpoint.created_at,
        recoveryMetadata: checkpoint.recovery_metadata
      };

      console.log(`System state recovered from checkpoint: ${checkpoint.id}`);
      return recoveryData;
    } catch (error) {
      console.error('Error recovering system state:', error);
      throw error;
    }
  }

  /**
   * Get ticker state history
   */
  public async getTickerStateHistory(ticker: string, limit: number = 100): Promise<StateTransition[]> {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const result = await this.pool.query(`
        SELECT from_status, to_status, duration_ms, created_at as timestamp
        FROM state_transitions 
        WHERE orchestrator_id = $1 AND ticker = $2
        ORDER BY created_at DESC 
        LIMIT $3
      `, [this.orchestratorId, ticker, limit]);

      return result.rows.map(row => ({
        from: row.from_status,
        to: row.to_status,
        duration: row.duration_ms,
        timestamp: row.timestamp
      }));
    } catch (error) {
      console.error(`Error getting ticker state history for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Persist performance analytics
   */
  public async persistPerformanceAnalytics(
    periodStart: Date,
    periodEnd: Date,
    metrics: PerformanceMetrics,
    processingStats: any,
    learningInsights: any[] = []
  ): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.pool.query(`
        INSERT INTO performance_analytics (
          orchestrator_id, period_start, period_end, metrics,
          fib_zone_performance, ticker_performance, processing_statistics,
          learning_insights
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        this.orchestratorId,
        periodStart,
        periodEnd,
        JSON.stringify(metrics),
        JSON.stringify(metrics.fibZonePerformance || {}),
        JSON.stringify(metrics.tickerPerformance || {}),
        JSON.stringify(processingStats),
        JSON.stringify(learningInsights)
      ]);
    } catch (error) {
      console.error('Error persisting performance analytics:', error);
      // Don't throw - analytics persistence is not critical
    }
  }

  /**
   * Clean up old data based on retention policies
   */
  public async cleanupOldData(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Clean up old state transitions (keep 30 days)
      const transitionsResult = await client.query(`
        DELETE FROM state_transitions 
        WHERE created_at < NOW() - INTERVAL '30 days'
        AND orchestrator_id = $1
      `, [this.orchestratorId]);

      // Clean up old enhanced signals (keep 7 days)
      const signalsResult = await client.query(`
        DELETE FROM enhanced_signals 
        WHERE created_at < NOW() - INTERVAL '7 days'
        AND orchestrator_id = $1
      `, [this.orchestratorId]);

      // Clean up old system checkpoints (keep 30 days)
      const checkpointsResult = await client.query(`
        DELETE FROM system_checkpoints 
        WHERE created_at < NOW() - INTERVAL '30 days'
        AND orchestrator_id = $1
      `, [this.orchestratorId]);

      await client.query('COMMIT');

      console.log('Data cleanup completed:', {
        transitionsDeleted: transitionsResult.rowCount,
        signalsDeleted: signalsResult.rowCount,
        checkpointsDeleted: checkpointsResult.rowCount
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error during data cleanup:', error);
    } finally {
      client.release();
    }
  }

  /**
   * Get system health summary
   */
  public async getSystemHealthSummary(): Promise<SystemHealthSummary | null> {
    if (!this.isInitialized) {
      return null;
    }

    try {
      const result = await this.pool.query(`
        SELECT * FROM orchestrator_health_summary 
        WHERE orchestrator_id = $1
      `, [this.orchestratorId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        orchestratorId: row.orchestrator_id,
        activeTickerCount: row.active_ticker_count,
        actualTickerCount: row.actual_ticker_count,
        totalSignalsProcessed: row.total_signals_processed,
        activeTrades: row.active_trades,
        portfolioHeat: parseFloat(row.portfolio_heat),
        healthStatus: row.health_status,
        avgLatencyMs: parseFloat(row.avg_latency_ms || '0'),
        throughputPerSec: parseFloat(row.throughput_per_sec || '0'),
        errorRate: parseFloat(row.error_rate || '0'),
        lastUpdate: row.last_update,
        statusDistribution: {
          ready: row.ready_count || 0,
          set: row.set_count || 0,
          go: row.go_count || 0,
          cooldown: row.cooldown_count || 0
        }
      };
    } catch (error) {
      console.error('Error getting system health summary:', error);
      return null;
    }
  }

  /**
   * Initialize orchestrator state record
   */
  private async initializeOrchestratorState(): Promise<void> {
    try {
      await this.pool.query(`
        INSERT INTO orchestrator_state (orchestrator_id, configuration)
        VALUES ($1, $2)
        ON CONFLICT (orchestrator_id) DO NOTHING
      `, [this.orchestratorId, JSON.stringify({ initialized: true })]);
    } catch (error) {
      console.error('Error initializing orchestrator state:', error);
      throw error;
    }
  }

  /**
   * Map database row to TickerState object
   */
  private mapRowToTickerState(row: any): TickerState {
    return {
      ticker: row.ticker,
      status: row.status,
      confidence: parseFloat(row.confidence),
      conviction: parseFloat(row.conviction),
      fibZone: row.fib_zone,
      gammaExposure: parseFloat(row.gamma_exposure),
      recommendedOption: row.recommended_option ? JSON.parse(row.recommended_option) : undefined,
      position: undefined, // Would need to join with positions table
      lastUpdate: row.last_update,
      stateEntryTime: row.state_entry_time,
      cooldownUntil: row.cooldown_until
    };
  }
}

// Supporting interfaces and types
export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  maxConnections?: number;
  idleTimeout?: number;
  connectionTimeout?: number;
}

export type CheckpointType = 'STARTUP' | 'PERIODIC' | 'SHUTDOWN' | 'ERROR_RECOVERY';

export interface SystemRecoveryData {
  checkpointId: string;
  checkpointType: CheckpointType;
  systemState: any;
  tickerStates: TickerState[];
  activeTasks: any[];
  configuration?: any;
  performanceSnapshot: any;
  checkpointTime: Date;
  recoveryMetadata: any;
}

export interface SystemHealthSummary {
  orchestratorId: string;
  activeTickerCount: number;
  actualTickerCount: number;
  totalSignalsProcessed: number;
  activeTrades: number;
  portfolioHeat: number;
  healthStatus: string;
  avgLatencyMs: number;
  throughputPerSec: number;
  errorRate: number;
  lastUpdate: Date;
  statusDistribution: {
    ready: number;
    set: number;
    go: number;
    cooldown: number;
  };
}