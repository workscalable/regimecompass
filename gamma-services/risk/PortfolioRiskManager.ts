import { EventEmitter } from 'events';
import { DrawdownLossProtection, DrawdownLossConfig, ProtectionState, TradeOutcome, EquitySnapshot } from './DrawdownLossProtection';

/**
 * Portfolio Risk Management Core
 * 
 * Implements comprehensive portfolio-level risk controls with:
 * - Portfolio heat calculation (2% per trade, 20% total limit)
 * - Position sizing validation with confidence-based adjustments
 * - Risk violation detection and alerting system
 * - Real-time risk monitoring and automatic responses
 */

export interface RiskLimits {
  maxRiskPerTrade: number; // 0.02 (2%)
  maxPortfolioHeat: number; // 0.20 (20%)
  maxDrawdown: number; // 0.05 (5%)
  maxConsecutiveLosses: number; // 2
  maxDailyLoss: number; // 0.03 (3%)
  vixThreshold: number; // 30
}

export interface PortfolioRisk {
  currentHeat: number;
  drawdown: number;
  consecutiveLosses: number;
  dailyPnL: number;
  riskScore: number;
  violations: RiskViolation[];
  lastUpdate: Date;
}

export interface RiskViolation {
  type: 'HEAT_EXCEEDED' | 'DRAWDOWN_EXCEEDED' | 'CONSECUTIVE_LOSSES' | 'DAILY_LOSS' | 'VIX_THRESHOLD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentValue: number;
  threshold: number;
  recommendation: string;
  timestamp: Date;
}

export interface RiskValidation {
  isValid: boolean;
  violations: RiskViolation[];
  adjustedSize?: number;
  recommendation: string;
}

export interface PositionRisk {
  positionId: string;
  ticker: string;
  riskAmount: number;
  riskPercent: number;
  heatContribution: number;
  confidence: number;
}

export interface AccountSnapshot {
  timestamp: Date;
  balance: number;
  equity: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dailyPnL: number;
}exp
ort class PortfolioRiskManager extends EventEmitter {
  private riskLimits: RiskLimits;
  private currentRisk: PortfolioRisk;
  private accountHistory: AccountSnapshot[] = [];
  private consecutiveLossCount: number = 0;
  private lastTradeResult: 'WIN' | 'LOSS' | null = null;

  constructor(limits: RiskLimits) {
    super();
    this.riskLimits = limits;
    this.currentRisk = this.initializeRisk();
  }

  /**
   * Calculate portfolio heat based on current positions
   * Portfolio heat = sum of all position risks / account balance
   */
  public calculatePortfolioHeat(positions: any[], accountBalance: number): number {
    if (positions.length === 0 || accountBalance <= 0) {
      return 0;
    }

    const totalRisk = positions.reduce((sum, position) => {
      return sum + this.calculatePositionRisk(position);
    }, 0);

    return totalRisk / accountBalance;
  }

  /**
   * Validate a new trade against risk limits
   */
  public validateTrade(
    tradeRisk: number,
    confidence: number,
    currentPositions: any[],
    accountBalance: number
  ): RiskValidation {
    const violations: RiskViolation[] = [];
    let adjustedSize: number | undefined;
    let isValid = true;

    // Check per-trade risk limit (2%)
    const tradeRiskPercent = tradeRisk / accountBalance;
    if (tradeRiskPercent > this.riskLimits.maxRiskPerTrade) {
      violations.push({
        type: 'HEAT_EXCEEDED',
        severity: 'HIGH',
        currentValue: tradeRiskPercent,
        threshold: this.riskLimits.maxRiskPerTrade,
        recommendation: `Reduce position size to ${(this.riskLimits.maxRiskPerTrade * accountBalance).toFixed(2)}`,
        timestamp: new Date()
      });
      
      adjustedSize = this.riskLimits.maxRiskPerTrade * accountBalance;
      isValid = false;
    }

    // Check portfolio heat limit (20%)
    const currentHeat = this.calculatePortfolioHeat(currentPositions, accountBalance);
    const projectedHeat = currentHeat + tradeRiskPercent;
    
    if (projectedHeat > this.riskLimits.maxPortfolioHeat) {
      violations.push({
        type: 'HEAT_EXCEEDED',
        severity: 'CRITICAL',
        currentValue: projectedHeat,
        threshold: this.riskLimits.maxPortfolioHeat,
        recommendation: 'Halt new trades until portfolio heat reduces',
        timestamp: new Date()
      });
      
      isValid = false;
    }

    // Check consecutive losses
    if (this.consecutiveLossCount >= this.riskLimits.maxConsecutiveLosses) {
      violations.push({
        type: 'CONSECUTIVE_LOSSES',
        severity: 'HIGH',
        currentValue: this.consecutiveLossCount,
        threshold: this.riskLimits.maxConsecutiveLosses,
        recommendation: 'Reduce position size by 50% until next winning trade',
        timestamp: new Date()
      });
      
      adjustedSize = (adjustedSize || tradeRisk) * 0.5;
    }

    // Apply confidence-based adjustments
    const confidenceMultiplier = this.getConfidenceMultiplier(confidence);
    if (adjustedSize) {
      adjustedSize *= confidenceMultiplier;
    }

    return {
      isValid,
      violations,
      adjustedSize,
      recommendation: this.generateRecommendation(violations, confidence)
    };
  }  /**

   * Update portfolio risk metrics
   */
  public updatePortfolioRisk(
    positions: any[],
    accountBalance: number,
    accountSnapshot: AccountSnapshot
  ): PortfolioRisk {
    this.accountHistory.push(accountSnapshot);
    
    // Keep only last 30 days of history
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.accountHistory = this.accountHistory.filter(
      snapshot => snapshot.timestamp >= thirtyDaysAgo
    );

    const currentHeat = this.calculatePortfolioHeat(positions, accountBalance);
    const drawdown = this.calculateDrawdown();
    const dailyPnL = accountSnapshot.dailyPnL;
    const riskScore = this.calculateRiskScore(currentHeat, drawdown, this.consecutiveLossCount);

    this.currentRisk = {
      currentHeat,
      drawdown,
      consecutiveLosses: this.consecutiveLossCount,
      dailyPnL,
      riskScore,
      violations: this.checkRiskViolations(currentHeat, drawdown, dailyPnL),
      lastUpdate: new Date()
    };

    // Emit risk events
    this.emitRiskEvents();

    return this.currentRisk;
  }

  /**
   * Record trade outcome for consecutive loss tracking
   */
  public recordTradeOutcome(outcome: 'WIN' | 'LOSS', pnl: number): void {
    this.lastTradeResult = outcome;
    
    if (outcome === 'LOSS') {
      this.consecutiveLossCount++;
    } else {
      this.consecutiveLossCount = 0; // Reset on win
    }

    this.emit('tradeOutcome', {
      outcome,
      pnl,
      consecutiveLosses: this.consecutiveLossCount,
      timestamp: new Date()
    });
  }

  /**
   * Get current portfolio risk status
   */
  public getCurrentRisk(): PortfolioRisk {
    return { ...this.currentRisk };
  }

  /**
   * Check if trading should be halted
   */
  public shouldHaltTrading(): boolean {
    return this.currentRisk.violations.some(
      violation => violation.severity === 'CRITICAL'
    );
  }

  /**
   * Get position sizing multiplier based on current risk state
   */
  public getPositionSizeMultiplier(): number {
    let multiplier = 1.0;

    // Reduce size based on consecutive losses
    if (this.consecutiveLossCount >= this.riskLimits.maxConsecutiveLosses) {
      multiplier *= 0.5;
    }

    // Reduce size based on drawdown
    if (this.currentRisk.drawdown >= this.riskLimits.maxDrawdown * 0.8) {
      multiplier *= 0.7;
    }

    // Reduce size based on portfolio heat
    if (this.currentRisk.currentHeat >= this.riskLimits.maxPortfolioHeat * 0.8) {
      multiplier *= 0.8;
    }

    return Math.max(multiplier, 0.1); // Minimum 10% of normal size
  } 
 // Private helper methods

  private initializeRisk(): PortfolioRisk {
    return {
      currentHeat: 0,
      drawdown: 0,
      consecutiveLosses: 0,
      dailyPnL: 0,
      riskScore: 0,
      violations: [],
      lastUpdate: new Date()
    };
  }

  private calculatePositionRisk(position: any): number {
    // Calculate the maximum potential loss for the position
    if (position.type === 'OPTION') {
      // For options, risk is the premium paid
      return Math.abs(position.premium * position.contracts * 100);
    } else {
      // For stocks, risk is based on stop loss or position size
      const stopLossDistance = position.stopLoss 
        ? Math.abs(position.entryPrice - position.stopLoss)
        : position.entryPrice * 0.02; // Default 2% stop
      
      return stopLossDistance * position.shares;
    }
  }

  private calculateDrawdown(): number {
    if (this.accountHistory.length < 2) {
      return 0;
    }

    const peak = Math.max(...this.accountHistory.map(s => s.equity));
    const current = this.accountHistory[this.accountHistory.length - 1].equity;
    
    return peak > 0 ? (peak - current) / peak : 0;
  }

  private calculateRiskScore(heat: number, drawdown: number, consecutiveLosses: number): number {
    // Risk score from 0-100 (higher = more risky)
    const heatScore = (heat / this.riskLimits.maxPortfolioHeat) * 40;
    const drawdownScore = (drawdown / this.riskLimits.maxDrawdown) * 40;
    const lossScore = (consecutiveLosses / this.riskLimits.maxConsecutiveLosses) * 20;
    
    return Math.min(heatScore + drawdownScore + lossScore, 100);
  }

  private checkRiskViolations(heat: number, drawdown: number, dailyPnL: number): RiskViolation[] {
    const violations: RiskViolation[] = [];

    // Portfolio heat violations
    if (heat >= this.riskLimits.maxPortfolioHeat) {
      violations.push({
        type: 'HEAT_EXCEEDED',
        severity: 'CRITICAL',
        currentValue: heat,
        threshold: this.riskLimits.maxPortfolioHeat,
        recommendation: 'Halt new trades and consider closing positions',
        timestamp: new Date()
      });
    } else if (heat >= this.riskLimits.maxPortfolioHeat * 0.8) {
      violations.push({
        type: 'HEAT_EXCEEDED',
        severity: 'HIGH',
        currentValue: heat,
        threshold: this.riskLimits.maxPortfolioHeat * 0.8,
        recommendation: 'Reduce position sizes for new trades',
        timestamp: new Date()
      });
    }

    // Drawdown violations
    if (drawdown >= this.riskLimits.maxDrawdown) {
      violations.push({
        type: 'DRAWDOWN_EXCEEDED',
        severity: 'CRITICAL',
        currentValue: drawdown,
        threshold: this.riskLimits.maxDrawdown,
        recommendation: 'Enter defensive mode - halt trading',
        timestamp: new Date()
      });
    }

    // Consecutive losses
    if (this.consecutiveLossCount >= this.riskLimits.maxConsecutiveLosses) {
      violations.push({
        type: 'CONSECUTIVE_LOSSES',
        severity: 'HIGH',
        currentValue: this.consecutiveLossCount,
        threshold: this.riskLimits.maxConsecutiveLosses,
        recommendation: 'Reduce position sizes by 50%',
        timestamp: new Date()
      });
    }

    // Daily loss limit
    const dailyLossPercent = Math.abs(dailyPnL) / (this.accountHistory[this.accountHistory.length - 1]?.balance || 100000);
    if (dailyPnL < 0 && dailyLossPercent >= this.riskLimits.maxDailyLoss) {
      violations.push({
        type: 'DAILY_LOSS',
        severity: 'HIGH',
        currentValue: dailyLossPercent,
        threshold: this.riskLimits.maxDailyLoss,
        recommendation: 'Stop trading for the day',
        timestamp: new Date()
      });
    }

    return violations;
  }  private g
etConfidenceMultiplier(confidence: number): number {
    // Adjust position size based on confidence level
    if (confidence >= 0.8) {
      return 1.2; // Increase size for high confidence
    } else if (confidence >= 0.7) {
      return 1.0; // Normal size
    } else if (confidence >= 0.6) {
      return 0.8; // Reduce size for lower confidence
    } else {
      return 0.5; // Significantly reduce for very low confidence
    }
  }

  private generateRecommendation(violations: RiskViolation[], confidence: number): string {
    if (violations.length === 0) {
      return `Trade approved with ${(confidence * 100).toFixed(0)}% confidence`;
    }

    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL');
    if (criticalViolations.length > 0) {
      return 'Trade rejected due to critical risk violations';
    }

    const highViolations = violations.filter(v => v.severity === 'HIGH');
    if (highViolations.length > 0) {
      return 'Trade approved with reduced position size due to elevated risk';
    }

    return 'Trade approved with minor risk adjustments';
  }

  private emitRiskEvents(): void {
    // Emit risk level changes
    this.emit('riskUpdate', this.currentRisk);

    // Emit specific violation alerts
    this.currentRisk.violations.forEach(violation => {
      this.emit('riskViolation', violation);
    });

    // Emit trading halt signal if needed
    if (this.shouldHaltTrading()) {
      this.emit('tradingHalt', {
        reason: 'Critical risk violations detected',
        violations: this.currentRisk.violations.filter(v => v.severity === 'CRITICAL'),
        timestamp: new Date()
      });
    }
  }

  /**
   * Update risk limits (for configuration changes)
   */
  public updateRiskLimits(newLimits: Partial<RiskLimits>): void {
    this.riskLimits = { ...this.riskLimits, ...newLimits };
    this.emit('riskLimitsUpdated', this.riskLimits);
  }

  /**
   * Get risk limits
   */
  public getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  /**
   * Reset consecutive loss counter (manual override)
   */
  public resetConsecutiveLosses(): void {
    this.consecutiveLossCount = 0;
    this.emit('consecutiveLossesReset', { timestamp: new Date() });
  }

  /**
   * Get detailed position risk breakdown
   */
  public getPositionRiskBreakdown(positions: any[]): PositionRisk[] {
    return positions.map(position => ({
      positionId: position.id,
      ticker: position.ticker,
      riskAmount: this.calculatePositionRisk(position),
      riskPercent: this.calculatePositionRisk(position) / (position.accountBalance || 100000),
      heatContribution: this.calculatePositionRisk(position) / (position.accountBalance || 100000),
      confidence: position.confidence || 0
    }));
  }
}  /**
  
 * Get drawdown and loss protection system
   */
  public getDrawdownProtection(): DrawdownLossProtection {
    return this.drawdownProtection;
  }

  /**
   * Setup event handlers for drawdown protection
   */
  private setupDrawdownProtectionEvents(): void {
    this.drawdownProtection.on('defensiveModeActivated', (data) => {
      this.emit('defensiveModeActivated', data);
    });

    this.drawdownProtection.on('consecutiveLossProtectionActivated', (data) => {
      this.emit('consecutiveLossProtectionActivated', data);
    });

    this.drawdownProtection.on('positionSizeMultiplierChanged', (data) => {
      this.emit('positionSizeMultiplierChanged', data);
    });
  }

  /**
   * Enhanced position size multiplier that includes drawdown protection
   */
  public getEnhancedPositionSizeMultiplier(): number {
    const baseMultiplier = this.getPositionSizeMultiplier();
    const protectionMultiplier = this.drawdownProtection.getPositionSizeMultiplier();
    return baseMultiplier * protectionMultiplier;
  }

  /**
   * Update portfolio risk with drawdown protection integration
   */
  public updatePortfolioRiskWithProtection(
    positions: any[],
    accountBalance: number,
    accountSnapshot: AccountSnapshot
  ): PortfolioRisk {
    // Update standard portfolio risk
    const portfolioRisk = this.updatePortfolioRisk(positions, accountBalance, accountSnapshot);
    
    // Update drawdown protection with equity snapshot
    const equitySnapshot: EquitySnapshot = {
      timestamp: accountSnapshot.timestamp,
      equity: accountSnapshot.equity,
      balance: accountSnapshot.balance,
      dailyPnL: accountSnapshot.dailyPnL
    };
    
    this.drawdownProtection.updateEquity(equitySnapshot);
    
    return portfolioRisk;
  }

  /**
   * Record trade outcome with drawdown protection integration
   */
  public recordTradeOutcomeWithProtection(
    outcome: 'WIN' | 'LOSS', 
    pnl: number, 
    ticker: string, 
    confidence: number
  ): void {
    // Record in standard risk manager
    this.recordTradeOutcome(outcome, pnl);
    
    // Record in drawdown protection
    const tradeOutcome: TradeOutcome = {
      timestamp: new Date(),
      ticker,
      result: outcome,
      pnl,
      confidence
    };
    
    this.drawdownProtection.recordTradeOutcome(tradeOutcome);
  }