import { EventEmitter } from 'events';

/**
 * Drawdown and Loss Protection System
 * 
 * Implements comprehensive protection against drawdowns and consecutive losses:
 * - Maximum drawdown monitoring with 5% threshold and defensive mode
 * - Consecutive loss tracking with 50% position size reduction after 2 losses
 * - Automatic risk adjustment based on performance metrics
 * - Recovery tracking and normal mode restoration
 */

export interface DrawdownLossConfig {
  maxDrawdownThreshold: number; // 0.05 (5%)
  defensiveModeThreshold: number; // 0.04 (4% - early warning)
  consecutiveLossLimit: number; // 2 losses
  positionReductionFactor: number; // 0.5 (50% reduction)
  defensiveModeMultiplier: number; // 0.3 (30% of normal size)
  recoveryThreshold: number; // 0.02 (2% - recovery level)
  monitoringPeriodDays: number; // 30 days
}

export interface ProtectionState {
  // Drawdown tracking
  currentDrawdown: number;
  maxDrawdown: number;
  peakEquity: number;
  currentEquity: number;
  
  // Consecutive loss tracking
  consecutiveLosses: number;
  lastLossDate?: Date;
  
  // Protection status
  isInDefensiveMode: boolean;
  defensiveModeStartDate?: Date;
  positionSizeMultiplier: number;
  
  // Risk level
  riskLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  
  lastUpdate: Date;
}

export interface TradeOutcome {
  timestamp: Date;
  ticker: string;
  result: 'WIN' | 'LOSS';
  pnl: number;
  confidence: number;
}

export interface EquitySnapshot {
  timestamp: Date;
  equity: number;
  balance: number;
  dailyPnL: number;
}

export class DrawdownLossProtection extends EventEmitter {
  private config: DrawdownLossConfig;
  private state: ProtectionState;
  private equityHistory: EquitySnapshot[] = [];
  private tradeHistory: TradeOutcome[] = [];

  constructor(config: DrawdownLossConfig) {
    super();
    this.config = config;
    this.state = this.initializeState();
  }

  /**
   * Update equity and check for drawdown conditions
   */
  public updateEquity(snapshot: EquitySnapshot): ProtectionState {
    this.equityHistory.push(snapshot);
    this.trimEquityHistory();

    // Update peak equity if new high
    if (snapshot.equity > this.state.peakEquity) {
      this.state.peakEquity = snapshot.equity;
      
      // Check if we can exit defensive mode
      if (this.state.isInDefensiveMode) {
        this.checkRecoveryConditions(snapshot);
      }
    }

    // Calculate current drawdown
    this.state.currentEquity = snapshot.equity;
    this.state.currentDrawdown = this.calculateDrawdown(this.state.peakEquity, snapshot.equity);
    
    // Update max drawdown
    if (this.state.currentDrawdown > this.state.maxDrawdown) {
      this.state.maxDrawdown = this.state.currentDrawdown;
    }

    // Check drawdown thresholds
    this.checkDrawdownThresholds();
    
    // Update risk level and position multiplier
    this.updateRiskLevel();
    this.updatePositionSizeMultiplier();
    
    this.state.lastUpdate = new Date();
    this.emit('protectionStateUpdated', this.state);

    return { ...this.state };
  }

  /**
   * Record trade outcome for consecutive loss tracking
   */
  public recordTradeOutcome(outcome: TradeOutcome): void {
    this.tradeHistory.push(outcome);
    this.trimTradeHistory();

    if (outcome.result === 'LOSS') {
      this.state.consecutiveLosses++;
      this.state.lastLossDate = outcome.timestamp;
      
      // Check consecutive loss threshold
      if (this.state.consecutiveLosses >= this.config.consecutiveLossLimit) {
        this.activateConsecutiveLossProtection();
      }
    } else if (outcome.result === 'WIN') {
      // Reset consecutive losses on win
      if (this.state.consecutiveLosses > 0) {
        this.emit('consecutiveLossesReset', {
          previousCount: this.state.consecutiveLosses,
          timestamp: outcome.timestamp
        });
      }
      this.state.consecutiveLosses = 0;
    }

    // Update protection state
    this.updateRiskLevel();
    this.updatePositionSizeMultiplier();

    this.emit('tradeOutcomeRecorded', {
      outcome,
      consecutiveLosses: this.state.consecutiveLosses,
      protectionState: this.state
    });
  }

  /**
   * Get current protection state
   */
  public getProtectionState(): ProtectionState {
    return { ...this.state };
  }

  /**
   * Get position size multiplier
   */
  public getPositionSizeMultiplier(): number {
    return this.state.positionSizeMultiplier;
  }

  /**
   * Check if defensive mode is active
   */
  public isDefensiveModeActive(): boolean {
    return this.state.isInDefensiveMode;
  }

  /**
   * Force defensive mode activation
   */
  public activateDefensiveMode(reason: string): void {
    if (!this.state.isInDefensiveMode) {
      this.state.isInDefensiveMode = true;
      this.state.defensiveModeStartDate = new Date();
      this.updatePositionSizeMultiplier();
      
      this.emit('defensiveModeActivated', {
        reason,
        drawdown: this.state.currentDrawdown,
        consecutiveLosses: this.state.consecutiveLosses,
        timestamp: new Date()
      });
    }
  }  /
**
   * Force defensive mode deactivation
   */
  public deactivateDefensiveMode(reason: string): void {
    if (this.state.isInDefensiveMode) {
      this.state.isInDefensiveMode = false;
      this.state.defensiveModeStartDate = undefined;
      this.updatePositionSizeMultiplier();
      
      this.emit('defensiveModeDeactivated', {
        reason,
        drawdown: this.state.currentDrawdown,
        timestamp: new Date()
      });
    }
  }

  /**
   * Reset consecutive losses counter
   */
  public resetConsecutiveLosses(): void {
    const previousCount = this.state.consecutiveLosses;
    this.state.consecutiveLosses = 0;
    this.updatePositionSizeMultiplier();
    
    this.emit('consecutiveLossesReset', {
      previousCount,
      timestamp: new Date()
    });
  }

  /**
   * Reset drawdown tracking
   */
  public resetDrawdownTracking(): void {
    this.state.maxDrawdown = 0;
    this.state.currentDrawdown = 0;
    this.state.peakEquity = this.state.currentEquity;
    
    this.emit('drawdownTrackingReset', {
      timestamp: new Date()
    });
  }

  // Private helper methods

  private initializeState(): ProtectionState {
    return {
      currentDrawdown: 0,
      maxDrawdown: 0,
      peakEquity: 0,
      currentEquity: 0,
      consecutiveLosses: 0,
      isInDefensiveMode: false,
      positionSizeMultiplier: 1.0,
      riskLevel: 'NORMAL',
      lastUpdate: new Date()
    };
  }

  private calculateDrawdown(peak: number, current: number): number {
    if (peak <= 0) return 0;
    return Math.max(0, (peak - current) / peak);
  }

  private checkDrawdownThresholds(): void {
    const currentDrawdown = this.state.currentDrawdown;

    // Check for defensive mode activation
    if (!this.state.isInDefensiveMode && currentDrawdown >= this.config.maxDrawdownThreshold) {
      this.activateDefensiveMode(`Maximum drawdown threshold reached: ${(currentDrawdown * 100).toFixed(2)}%`);
    }
    // Check for early warning
    else if (!this.state.isInDefensiveMode && currentDrawdown >= this.config.defensiveModeThreshold) {
      this.emit('drawdownWarning', {
        currentDrawdown,
        threshold: this.config.defensiveModeThreshold,
        message: `Approaching defensive mode threshold: ${(currentDrawdown * 100).toFixed(2)}%`,
        timestamp: new Date()
      });
    }
  }

  private checkRecoveryConditions(snapshot: EquitySnapshot): void {
    const currentDrawdown = this.calculateDrawdown(this.state.peakEquity, snapshot.equity);
    
    // Check if we can exit defensive mode
    if (currentDrawdown <= this.config.recoveryThreshold) {
      this.deactivateDefensiveMode(`Recovery threshold reached: ${(currentDrawdown * 100).toFixed(2)}%`);
    }
  }

  private activateConsecutiveLossProtection(): void {
    this.emit('consecutiveLossProtectionActivated', {
      consecutiveLosses: this.state.consecutiveLosses,
      threshold: this.config.consecutiveLossLimit,
      positionReduction: this.config.positionReductionFactor,
      timestamp: new Date()
    });
  }

  private updateRiskLevel(): void {
    const drawdown = this.state.currentDrawdown;
    const consecutiveLosses = this.state.consecutiveLosses;
    
    let newRiskLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

    if (drawdown >= this.config.maxDrawdownThreshold || consecutiveLosses >= this.config.consecutiveLossLimit) {
      newRiskLevel = 'CRITICAL';
    } else if (drawdown >= this.config.defensiveModeThreshold || consecutiveLosses >= this.config.consecutiveLossLimit - 1) {
      newRiskLevel = 'HIGH';
    } else if (drawdown >= this.config.defensiveModeThreshold * 0.7 || consecutiveLosses >= 1) {
      newRiskLevel = 'ELEVATED';
    } else {
      newRiskLevel = 'NORMAL';
    }

    if (newRiskLevel !== this.state.riskLevel) {
      const previousLevel = this.state.riskLevel;
      this.state.riskLevel = newRiskLevel;
      
      this.emit('riskLevelChanged', {
        previousLevel,
        newLevel: newRiskLevel,
        drawdown,
        consecutiveLosses,
        timestamp: new Date()
      });
    }
  }

  private updatePositionSizeMultiplier(): void {
    let multiplier = 1.0;

    // Apply defensive mode multiplier
    if (this.state.isInDefensiveMode) {
      multiplier *= this.config.defensiveModeMultiplier;
    }

    // Apply consecutive loss reduction
    if (this.state.consecutiveLosses >= this.config.consecutiveLossLimit) {
      multiplier *= this.config.positionReductionFactor;
    }

    // Apply gradual reduction based on drawdown severity
    const drawdownSeverity = this.state.currentDrawdown / this.config.maxDrawdownThreshold;
    if (drawdownSeverity > 0.5) {
      const additionalReduction = 1 - (drawdownSeverity - 0.5) * 0.4; // Up to 40% additional reduction
      multiplier *= Math.max(additionalReduction, 0.1); // Minimum 10% of normal size
    }

    // Ensure minimum multiplier
    multiplier = Math.max(multiplier, 0.05); // Minimum 5% of normal size

    if (Math.abs(multiplier - this.state.positionSizeMultiplier) > 0.01) {
      const previousMultiplier = this.state.positionSizeMultiplier;
      this.state.positionSizeMultiplier = multiplier;
      
      this.emit('positionSizeMultiplierChanged', {
        previousMultiplier,
        newMultiplier: multiplier,
        reason: this.getMultiplierChangeReason(),
        timestamp: new Date()
      });
    }
  }

  private getMultiplierChangeReason(): string {
    const reasons: string[] = [];
    
    if (this.state.isInDefensiveMode) {
      reasons.push('Defensive mode active');
    }
    if (this.state.consecutiveLosses >= this.config.consecutiveLossLimit) {
      reasons.push(`${this.state.consecutiveLosses} consecutive losses`);
    }
    if (this.state.currentDrawdown > this.config.defensiveModeThreshold) {
      reasons.push(`${(this.state.currentDrawdown * 100).toFixed(1)}% drawdown`);
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Risk adjustment';
  }

  private trimEquityHistory(): void {
    const cutoffDate = new Date(Date.now() - this.config.monitoringPeriodDays * 24 * 60 * 60 * 1000);
    this.equityHistory = this.equityHistory.filter(snapshot => snapshot.timestamp >= cutoffDate);
  }

  private trimTradeHistory(): void {
    // Keep last 500 trades for analysis
    if (this.tradeHistory.length > 500) {
      this.tradeHistory = this.tradeHistory.slice(-500);
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<DrawdownLossConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get configuration
   */
  public getConfig(): DrawdownLossConfig {
    return { ...this.config };
  }

  /**
   * Get protection statistics
   */
  public getProtectionStats(): {
    drawdown: {
      current: number;
      maximum: number;
      threshold: number;
    };
    consecutiveLosses: {
      current: number;
      maximum: number;
      threshold: number;
    };
    protection: {
      defensiveMode: boolean;
      positionMultiplier: number;
      riskLevel: string;
    };
    performance: {
      totalTrades: number;
      winRate: number;
      recentWins: number;
      recentLosses: number;
    };
  } {
    const recentTrades = this.tradeHistory.slice(-20); // Last 20 trades
    const wins = recentTrades.filter(t => t.result === 'WIN').length;
    const losses = recentTrades.filter(t => t.result === 'LOSS').length;
    
    // Calculate max consecutive losses from history
    let maxConsecutiveLosses = 0;
    let currentStreak = 0;
    for (const trade of this.tradeHistory) {
      if (trade.result === 'LOSS') {
        currentStreak++;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return {
      drawdown: {
        current: this.state.currentDrawdown,
        maximum: this.state.maxDrawdown,
        threshold: this.config.maxDrawdownThreshold
      },
      consecutiveLosses: {
        current: this.state.consecutiveLosses,
        maximum: maxConsecutiveLosses,
        threshold: this.config.consecutiveLossLimit
      },
      protection: {
        defensiveMode: this.state.isInDefensiveMode,
        positionMultiplier: this.state.positionSizeMultiplier,
        riskLevel: this.state.riskLevel
      },
      performance: {
        totalTrades: this.tradeHistory.length,
        winRate: this.tradeHistory.length > 0 
          ? this.tradeHistory.filter(t => t.result === 'WIN').length / this.tradeHistory.length 
          : 0,
        recentWins: wins,
        recentLosses: losses
      }
    };
  }
}