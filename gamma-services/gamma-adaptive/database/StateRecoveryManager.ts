import { EventEmitter } from 'events';
import { 
  TickerState, 
  MultiTickerState, 
  GammaAdaptiveConfig,
  TickerStatus 
} from '../types/core.js';
import { PersistenceManager, SystemRecoveryData, CheckpointType } from './PersistenceManager.js';
import { TickerStateManager } from '../orchestrators/TickerStateManager.js';

/**
 * State recovery manager for system resilience and crash recovery
 * Handles system state restoration, validation, and recovery procedures
 */
export class StateRecoveryManager extends EventEmitter {
  private persistenceManager: PersistenceManager;
  private stateManager: TickerStateManager;
  private orchestratorId: string;
  private recoveryConfig: RecoveryConfig;
  private checkpointInterval?: NodeJS.Timeout;
  private lastCheckpointTime: Date = new Date();

  constructor(
    orchestratorId: string,
    persistenceManager: PersistenceManager,
    stateManager: TickerStateManager,
    recoveryConfig: RecoveryConfig = DEFAULT_RECOVERY_CONFIG
  ) {
    super();
    this.orchestratorId = orchestratorId;
    this.persistenceManager = persistenceManager;
    this.stateManager = stateManager;
    this.recoveryConfig = recoveryConfig;
  }

  /**
   * Initialize recovery manager and start periodic checkpoints
   */
  public async initialize(): Promise<void> {
    console.log('Initializing State Recovery Manager...');

    // Start periodic checkpointing if enabled
    if (this.recoveryConfig.enablePeriodicCheckpoints) {
      this.startPeriodicCheckpoints();
    }

    // Set up graceful shutdown handling
    this.setupGracefulShutdown();

    this.emit('recovery:initialized', {
      orchestratorId: this.orchestratorId,
      checkpointInterval: this.recoveryConfig.checkpointIntervalMs
    });

    console.log('State Recovery Manager initialized');
  }

  /**
   * Shutdown recovery manager
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down State Recovery Manager...');

    // Stop periodic checkpoints
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
      this.checkpointInterval = undefined;
    }

    // Create shutdown checkpoint
    try {
      await this.createCheckpoint('SHUTDOWN');
    } catch (error) {
      console.error('Error creating shutdown checkpoint:', error);
    }

    this.emit('recovery:shutdown', {
      orchestratorId: this.orchestratorId
    });

    console.log('State Recovery Manager shutdown complete');
  }

  /**
   * Attempt to recover system state from persistent storage
   */
  public async recoverSystemState(): Promise<RecoveryResult> {
    console.log('Attempting system state recovery...');

    try {
      // Get recovery data from persistence
      const recoveryData = await this.persistenceManager.recoverSystemState();
      
      if (!recoveryData) {
        console.log('No recovery data found - starting fresh');
        return {
          success: true,
          recovered: false,
          message: 'No previous state found - starting fresh',
          tickersRecovered: 0,
          recoveryTime: new Date()
        };
      }

      // Validate recovery data
      const validationResult = this.validateRecoveryData(recoveryData);
      if (!validationResult.valid) {
        console.warn('Recovery data validation failed:', validationResult.errors);
        
        if (!this.recoveryConfig.allowPartialRecovery) {
          return {
            success: false,
            recovered: false,
            message: `Recovery validation failed: ${validationResult.errors.join(', ')}`,
            tickersRecovered: 0,
            recoveryTime: new Date()
          };
        }
      }

      // Perform recovery
      const recoveryResult = await this.performRecovery(recoveryData);
      
      this.emit('recovery:completed', {
        orchestratorId: this.orchestratorId,
        success: recoveryResult.success,
        tickersRecovered: recoveryResult.tickersRecovered,
        checkpointAge: Date.now() - recoveryData.checkpointTime.getTime()
      });

      return recoveryResult;

    } catch (error) {
      console.error('System state recovery failed:', error);
      
      const errorResult: RecoveryResult = {
        success: false,
        recovered: false,
        message: `Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tickersRecovered: 0,
        recoveryTime: new Date(),
        error: error instanceof Error ? error : new Error('Unknown recovery error')
      };

      this.emit('recovery:failed', {
        orchestratorId: this.orchestratorId,
        error: errorResult.error
      });

      return errorResult;
    }
  }

  /**
   * Create system checkpoint
   */
  public async createCheckpoint(
    type: CheckpointType = 'PERIODIC',
    systemState?: MultiTickerState,
    activeTasks: any[] = []
  ): Promise<string> {
    try {
      // Get current system state if not provided
      const currentState = systemState || this.getCurrentSystemState();
      
      // Create checkpoint
      const checkpointId = await this.persistenceManager.createSystemCheckpoint(
        type,
        currentState,
        activeTasks
      );

      this.lastCheckpointTime = new Date();

      this.emit('checkpoint:created', {
        orchestratorId: this.orchestratorId,
        checkpointId,
        type,
        tickerCount: Object.keys(currentState.tickers).length
      });

      return checkpointId;
    } catch (error) {
      console.error('Error creating checkpoint:', error);
      this.emit('checkpoint:failed', {
        orchestratorId: this.orchestratorId,
        type,
        error
      });
      throw error;
    }
  }

  /**
   * Validate ticker state consistency
   */
  public validateStateConsistency(): StateValidationResult {
    const allStates = this.stateManager.getAllStates();
    const issues: string[] = [];
    const warnings: string[] = [];

    for (const state of allStates) {
      // Check for invalid state combinations
      if (state.status === 'COOLDOWN' && !state.cooldownUntil) {
        issues.push(`${state.ticker}: COOLDOWN state without cooldown expiry`);
      }

      if (state.status === 'GO' && state.confidence < 0.6) {
        warnings.push(`${state.ticker}: GO state with low confidence (${state.confidence})`);
      }

      // Check for stale states
      const stateAge = Date.now() - state.stateEntryTime.getTime();
      const maxStateAge = this.getMaxStateAge(state.status);
      
      if (stateAge > maxStateAge) {
        warnings.push(`${state.ticker}: State ${state.status} is stale (${Math.round(stateAge / 60000)}min old)`);
      }

      // Check for invalid confidence/conviction values
      if (state.confidence < 0 || state.confidence > 1) {
        issues.push(`${state.ticker}: Invalid confidence value (${state.confidence})`);
      }

      if (state.conviction < 0 || state.conviction > 1) {
        issues.push(`${state.ticker}: Invalid conviction value (${state.conviction})`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
      tickersChecked: allStates.length,
      validationTime: new Date()
    };
  }

  /**
   * Repair inconsistent states
   */
  public async repairInconsistentStates(): Promise<RepairResult> {
    const validation = this.validateStateConsistency();
    const repairActions: RepairAction[] = [];

    if (validation.valid) {
      return {
        success: true,
        actionsPerformed: [],
        tickersRepaired: 0,
        repairTime: new Date()
      };
    }

    try {
      const allStates = this.stateManager.getAllStates();

      for (const state of allStates) {
        // Repair COOLDOWN states without expiry
        if (state.status === 'COOLDOWN' && !state.cooldownUntil) {
          const newCooldownUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
          this.stateManager.updateTickerState(state.ticker, {
            cooldownUntil: newCooldownUntil
          });
          
          repairActions.push({
            ticker: state.ticker,
            action: 'SET_COOLDOWN_EXPIRY',
            description: 'Added missing cooldown expiry time',
            value: newCooldownUntil.toISOString()
          });
        }

        // Reset stale states
        const stateAge = Date.now() - state.stateEntryTime.getTime();
        const maxStateAge = this.getMaxStateAge(state.status);
        
        if (stateAge > maxStateAge) {
          this.stateManager.forceStateTransition(state.ticker, 'READY', 'Stale state reset');
          
          repairActions.push({
            ticker: state.ticker,
            action: 'RESET_STALE_STATE',
            description: `Reset stale ${state.status} state to READY`,
            value: `${Math.round(stateAge / 60000)}min old`
          });
        }

        // Clamp invalid confidence/conviction values
        let needsUpdate = false;
        const updates: Partial<TickerState> = {};

        if (state.confidence < 0 || state.confidence > 1) {
          updates.confidence = Math.max(0, Math.min(1, state.confidence));
          needsUpdate = true;
          
          repairActions.push({
            ticker: state.ticker,
            action: 'CLAMP_CONFIDENCE',
            description: 'Clamped confidence to valid range',
            value: `${state.confidence} → ${updates.confidence}`
          });
        }

        if (state.conviction < 0 || state.conviction > 1) {
          updates.conviction = Math.max(0, Math.min(1, state.conviction));
          needsUpdate = true;
          
          repairActions.push({
            ticker: state.ticker,
            action: 'CLAMP_CONVICTION',
            description: 'Clamped conviction to valid range',
            value: `${state.conviction} → ${updates.conviction}`
          });
        }

        if (needsUpdate) {
          this.stateManager.updateTickerState(state.ticker, updates);
        }
      }

      const result: RepairResult = {
        success: true,
        actionsPerformed: repairActions,
        tickersRepaired: new Set(repairActions.map(a => a.ticker)).size,
        repairTime: new Date()
      };

      this.emit('state:repaired', {
        orchestratorId: this.orchestratorId,
        ...result
      });

      return result;

    } catch (error) {
      console.error('Error repairing inconsistent states:', error);
      
      return {
        success: false,
        actionsPerformed: repairActions,
        tickersRepaired: 0,
        repairTime: new Date(),
        error: error instanceof Error ? error : new Error('Unknown repair error')
      };
    }
  }

  /**
   * Get recovery statistics
   */
  public getRecoveryStatistics(): RecoveryStatistics {
    return {
      orchestratorId: this.orchestratorId,
      lastCheckpointTime: this.lastCheckpointTime,
      checkpointInterval: this.recoveryConfig.checkpointIntervalMs,
      periodicCheckpointsEnabled: this.recoveryConfig.enablePeriodicCheckpoints,
      partialRecoveryAllowed: this.recoveryConfig.allowPartialRecovery,
      maxRecoveryAge: this.recoveryConfig.maxRecoveryAgeMs,
      timeSinceLastCheckpoint: Date.now() - this.lastCheckpointTime.getTime()
    };
  }

  /**
   * Perform the actual recovery process
   */
  private async performRecovery(recoveryData: SystemRecoveryData): Promise<RecoveryResult> {
    let tickersRecovered = 0;
    const errors: string[] = [];

    try {
      // Check if recovery data is too old
      const recoveryAge = Date.now() - recoveryData.checkpointTime.getTime();
      if (recoveryAge > this.recoveryConfig.maxRecoveryAgeMs) {
        if (!this.recoveryConfig.allowPartialRecovery) {
          return {
            success: false,
            recovered: false,
            message: `Recovery data too old (${Math.round(recoveryAge / 60000)}min)`,
            tickersRecovered: 0,
            recoveryTime: new Date()
          };
        }
        console.warn(`Recovery data is old (${Math.round(recoveryAge / 60000)}min) but proceeding with partial recovery`);
      }

      // Recover ticker states
      for (const tickerState of recoveryData.tickerStates) {
        try {
          // Validate ticker state before recovery
          if (this.isValidTickerState(tickerState)) {
            // Initialize ticker if not exists
            if (!this.stateManager.getTickerState(tickerState.ticker)) {
              this.stateManager.initializeTicker(tickerState.ticker);
            }

            // Update with recovered state
            this.stateManager.updateTickerState(tickerState.ticker, {
              status: tickerState.status,
              confidence: tickerState.confidence,
              conviction: tickerState.conviction,
              fibZone: tickerState.fibZone,
              gammaExposure: tickerState.gammaExposure,
              recommendedOption: tickerState.recommendedOption,
              stateEntryTime: tickerState.stateEntryTime,
              cooldownUntil: tickerState.cooldownUntil
            }, true); // Force update

            tickersRecovered++;
          } else {
            errors.push(`Invalid ticker state for ${tickerState.ticker}`);
          }
        } catch (error) {
          errors.push(`Failed to recover ${tickerState.ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Validate recovered state consistency
      const validation = this.validateStateConsistency();
      if (!validation.valid && validation.issues.length > 0) {
        console.warn('State inconsistencies detected after recovery:', validation.issues);
        
        if (this.recoveryConfig.autoRepairAfterRecovery) {
          console.log('Attempting automatic repair...');
          await this.repairInconsistentStates();
        }
      }

      const success = tickersRecovered > 0 || recoveryData.tickerStates.length === 0;
      
      return {
        success,
        recovered: true,
        message: `Recovered ${tickersRecovered}/${recoveryData.tickerStates.length} tickers`,
        tickersRecovered,
        recoveryTime: new Date(),
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      return {
        success: false,
        recovered: false,
        message: `Recovery process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tickersRecovered,
        recoveryTime: new Date(),
        error: error instanceof Error ? error : new Error('Unknown recovery error')
      };
    }
  }

  /**
   * Validate recovery data integrity
   */
  private validateRecoveryData(recoveryData: SystemRecoveryData): ValidationResult {
    const errors: string[] = [];

    // Check data age
    const dataAge = Date.now() - recoveryData.checkpointTime.getTime();
    if (dataAge > this.recoveryConfig.maxRecoveryAgeMs) {
      errors.push(`Recovery data is too old (${Math.round(dataAge / 60000)} minutes)`);
    }

    // Validate ticker states
    for (const tickerState of recoveryData.tickerStates) {
      if (!this.isValidTickerState(tickerState)) {
        errors.push(`Invalid ticker state for ${tickerState.ticker}`);
      }
    }

    // Check for required fields
    if (!recoveryData.systemState) {
      errors.push('Missing system state data');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual ticker state
   */
  private isValidTickerState(state: TickerState): boolean {
    return (
      typeof state.ticker === 'string' &&
      state.ticker.length > 0 &&
      ['READY', 'SET', 'GO', 'COOLDOWN'].includes(state.status) &&
      typeof state.confidence === 'number' &&
      state.confidence >= 0 &&
      state.confidence <= 1 &&
      typeof state.conviction === 'number' &&
      state.conviction >= 0 &&
      state.conviction <= 1 &&
      state.stateEntryTime instanceof Date
    );
  }

  /**
   * Get current system state for checkpointing
   */
  private getCurrentSystemState(): MultiTickerState {
    const allStates = this.stateManager.getAllStates();
    const stats = this.stateManager.getStateStatistics();
    
    return {
      orchestratorId: this.orchestratorId,
      activeTickerCount: stats.totalTickers,
      totalSignalsProcessed: 0, // Would need to be tracked separately
      activeTrades: stats.activePositions,
      portfolioHeat: 0, // Would need to be calculated
      systemHealth: {
        status: 'HEALTHY',
        components: {},
        overallScore: 1.0
      },
      tickers: Object.fromEntries(allStates.map(state => [state.ticker, state])),
      performance: {
        processingLatency: 0,
        throughput: 0,
        errorRate: 0,
        uptime: 99.9
      },
      lastUpdate: new Date()
    };
  }

  /**
   * Start periodic checkpoint creation
   */
  private startPeriodicCheckpoints(): void {
    this.checkpointInterval = setInterval(async () => {
      try {
        await this.createCheckpoint('PERIODIC');
      } catch (error) {
        console.error('Error creating periodic checkpoint:', error);
      }
    }, this.recoveryConfig.checkpointIntervalMs);

    console.log(`Periodic checkpoints started (interval: ${this.recoveryConfig.checkpointIntervalMs}ms)`);
  }

  /**
   * Set up graceful shutdown handling
   */
  private setupGracefulShutdown(): void {
    const shutdownHandler = async (signal: string) => {
      console.log(`Received ${signal}, creating shutdown checkpoint...`);
      try {
        await this.createCheckpoint('SHUTDOWN');
      } catch (error) {
        console.error('Error creating shutdown checkpoint:', error);
      }
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  }

  /**
   * Get maximum allowed age for a state
   */
  private getMaxStateAge(status: TickerStatus): number {
    const maxAges = {
      'READY': 24 * 60 * 60 * 1000,    // 24 hours
      'SET': 2 * 60 * 60 * 1000,       // 2 hours
      'GO': 30 * 60 * 1000,            // 30 minutes
      'COOLDOWN': 60 * 60 * 1000       // 1 hour
    };

    return maxAges[status];
  }
}

// Supporting interfaces and types
export interface RecoveryConfig {
  enablePeriodicCheckpoints: boolean;
  checkpointIntervalMs: number;
  maxRecoveryAgeMs: number;
  allowPartialRecovery: boolean;
  autoRepairAfterRecovery: boolean;
}

export interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  message: string;
  tickersRecovered: number;
  recoveryTime: Date;
  errors?: string[];
  error?: Error;
}

export interface StateValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  tickersChecked: number;
  validationTime: Date;
}

export interface RepairResult {
  success: boolean;
  actionsPerformed: RepairAction[];
  tickersRepaired: number;
  repairTime: Date;
  error?: Error;
}

export interface RepairAction {
  ticker: string;
  action: string;
  description: string;
  value: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface RecoveryStatistics {
  orchestratorId: string;
  lastCheckpointTime: Date;
  checkpointInterval: number;
  periodicCheckpointsEnabled: boolean;
  partialRecoveryAllowed: boolean;
  maxRecoveryAge: number;
  timeSinceLastCheckpoint: number;
}

// Default recovery configuration
export const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  enablePeriodicCheckpoints: true,
  checkpointIntervalMs: 5 * 60 * 1000, // 5 minutes
  maxRecoveryAgeMs: 60 * 60 * 1000,    // 1 hour
  allowPartialRecovery: true,
  autoRepairAfterRecovery: true
};