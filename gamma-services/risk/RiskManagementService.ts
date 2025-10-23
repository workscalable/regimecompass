import { EventEmitter } from 'events';
import { PortfolioRiskManager, RiskLimits, PortfolioRisk, AccountSnapshot } from './PortfolioRiskManager';
import { DrawdownLossProtection, DrawdownLossConfig, ProtectionState } from './DrawdownLossProtection';
import { MarketBasedRiskAdjustments, MarketBasedRiskConfig, MarketConditions, RiskAdjustments, FibZone } from './MarketBasedRiskAdjustments';
import { PositionSizingEngine, PositionSizingConfig, SignalFactors, MarketConditions, PositionSize } from './PositionSizingEngine';
import { RiskAlertSystem, AlertConfig } from './RiskAlertSystem';

/**
 * Risk Management Service
 * 
 * Central service that coordinates all risk management activities:
 * - Portfolio risk monitoring and control
 * - Position sizing and validation
 * - Risk violation detection and alerting
 * - Automated risk mitigation actions
 * - Configuration management and reporting
 */

export interface RiskManagementConfig {
  riskLimits: RiskLimits;
  positionSizing: PositionSizingConfig;
  alerts: AlertConfig;
  drawdownProtection: DrawdownLossConfig;
  marketRiskAdjustments: MarketBasedRiskConfig;
  enabled: boolean;
}

export interface TradeRequest {
  ticker: string;
  signal: SignalFactors;
  optionPrice?: number;
  stopLoss?: number;
  accountBalance: number;
  currentPositions: any[];
  marketConditions: MarketConditions;
  fibZone: FibZone;
}

export interface TradeApproval {
  approved: boolean;
  positionSize?: PositionSize;
  violations: string[];
  recommendations: string[];
  riskAssessment: {
    tradeRisk: number;
    portfolioImpact: number;
    riskScore: number;
  };
}

export class RiskManagementService extends EventEmitter {
  private riskManager: PortfolioRiskManager;
  private positionSizer: PositionSizingEngine;
  private alertSystem: RiskAlertSystem;
  private marketRiskAdjustments: MarketBasedRiskAdjustments;
  private config: RiskManagementConfig;
  private isEnabled: boolean = true;

  constructor(config: RiskManagementConfig) {
    super();
    this.config = config;
    
    // Initialize components
    this.riskManager = new PortfolioRiskManager(config.riskLimits);
    this.positionSizer = new PositionSizingEngine(config.positionSizing, this.riskManager);
    this.alertSystem = new RiskAlertSystem(config.alerts);
    this.marketRiskAdjustments = new MarketBasedRiskAdjustments(config.marketRiskAdjustments);
    
    this.setupEventHandlers();
  }

  /**
   * Evaluate a trade request and provide approval/rejection
   */
  public async evaluateTradeRequest(request: TradeRequest): Promise<TradeApproval> {
    if (!this.isEnabled) {
      return {
        approved: false,
        violations: ['Risk management system is disabled'],
        recommendations: ['Enable risk management system'],
        riskAssessment: { tradeRisk: 0, portfolioImpact: 0, riskScore: 0 }
      };
    }

    try {
      // Update market conditions for risk adjustments
      this.marketRiskAdjustments.updateMarketConditions(request.marketConditions);

      // Calculate market-based risk adjustment
      const marketAdjustment = this.marketRiskAdjustments.calculateTradeRiskAdjustment(
        request.fibZone,
        request.signal.confidence,
        request.ticker
      );

      // Block trade if market conditions prohibit it (e.g., EXHAUSTION zone)
      if (!marketAdjustment.approved) {
        return {
          approved: false,
          violations: [`Trade blocked: ${marketAdjustment.reasoning.join(', ')}`],
          recommendations: ['Wait for better market conditions or Fibonacci zone'],
          riskAssessment: { tradeRisk: 0, portfolioImpact: 0, riskScore: 100 }
        };
      }

      // Calculate optimal position size
      const positionSize = this.positionSizer.calculateOptimalSize(
        request.signal,
        request.accountBalance,
        request.currentPositions,
        request.marketConditions,
        request.optionPrice,
        request.stopLoss
      );

      // Apply market-based risk adjustment to position size
      const adjustedPositionSize = {
        ...positionSize,
        contracts: Math.floor(positionSize.contracts * marketAdjustment.multiplier),
        riskAmount: positionSize.riskAmount * marketAdjustment.multiplier,
        riskPercent: positionSize.riskPercent * marketAdjustment.multiplier,
        heatContribution: positionSize.heatContribution * marketAdjustment.multiplier,
        reasoning: [...positionSize.reasoning, ...marketAdjustment.reasoning]
      };

      // Validate adjusted position size
      const validation = this.positionSizer.validatePositionSize(
        adjustedPositionSize,
        request.currentPositions,
        request.accountBalance
      );

      // Check with risk manager
      const riskValidation = this.riskManager.validateTrade(
        adjustedPositionSize.riskAmount,
        request.signal.confidence,
        request.currentPositions,
        request.accountBalance
      );

      // Combine results
      const approved = validation.isValid && riskValidation.isValid && !this.riskManager.shouldHaltTrading();
      const finalPositionSize = validation.adjustedSize || adjustedPositionSize;
      
      const violations = [
        ...validation.violations,
        ...riskValidation.violations.map(v => v.recommendation)
      ];

      const recommendations = this.generateRecommendations(
        validation,
        riskValidation,
        request.signal
      );

      const riskAssessment = {
        tradeRisk: finalPositionSize.riskPercent,
        portfolioImpact: finalPositionSize.heatContribution,
        riskScore: this.calculateTradeRiskScore(finalPositionSize, request)
      };

      // Log trade evaluation
      this.emit('tradeEvaluated', {
        ticker: request.ticker,
        approved,
        positionSize: finalPositionSize,
        violations,
        riskAssessment,
        timestamp: new Date()
      });

      return {
        approved,
        positionSize: finalPositionSize,
        violations,
        recommendations,
        riskAssessment
      };

    } catch (error) {
      console.error('Error evaluating trade request:', error);
      return {
        approved: false,
        violations: ['Internal error during risk evaluation'],
        recommendations: ['Contact system administrator'],
        riskAssessment: { tradeRisk: 0, portfolioImpact: 0, riskScore: 100 }
      };
    }
  }

  /**
   * Update portfolio risk metrics
   */
  public updatePortfolioRisk(
    positions: any[],
    accountBalance: number,
    accountSnapshot: AccountSnapshot
  ): PortfolioRisk {
    const portfolioRisk = this.riskManager.updatePortfolioRisk(
      positions,
      accountBalance,
      accountSnapshot
    );

    // Send to alert system
    this.alertSystem.processRiskUpdate(portfolioRisk);

    // Emit risk update event
    this.emit('portfolioRiskUpdated', portfolioRisk);

    return portfolioRisk;
  }

  /**
   * Record trade outcome for risk tracking
   */
  public recordTradeOutcome(outcome: 'WIN' | 'LOSS', pnl: number): void {
    this.riskManager.recordTradeOutcome(outcome, pnl);
    
    this.emit('tradeOutcomeRecorded', {
      outcome,
      pnl,
      consecutiveLosses: this.riskManager.getCurrentRisk().consecutiveLosses,
      timestamp: new Date()
    });
  }

  /**
   * Get current portfolio risk status
   */
  public getCurrentRisk(): PortfolioRisk {
    return this.riskManager.getCurrentRisk();
  }

  /**
   * Check if trading should be halted
   */
  public shouldHaltTrading(): boolean {
    return this.riskManager.shouldHaltTrading();
  }

  /**
   * Get position size multiplier based on current risk (enhanced with drawdown protection)
   */
  public getPositionSizeMultiplier(): number {
    return this.riskManager.getEnhancedPositionSizeMultiplier();
  }

  /**
   * Get drawdown protection state
   */
  public getDrawdownProtectionState(): ProtectionState {
    return this.riskManager.getDrawdownProtection().getProtectionState();
  }

  /**
   * Get drawdown protection statistics
   */
  public getDrawdownProtectionStats() {
    return this.riskManager.getDrawdownProtection().getProtectionStats();
  }

  /**
   * Update market conditions
   */
  public updateMarketConditions(conditions: MarketConditions): RiskAdjustments {
    return this.marketRiskAdjustments.updateMarketConditions(conditions);
  }

  /**
   * Get current market risk adjustments
   */
  public getMarketRiskAdjustments(): RiskAdjustments {
    return this.marketRiskAdjustments.getCurrentAdjustments();
  }

  /**
   * Get market risk assessment
   */
  public getMarketRiskAssessment() {
    return this.marketRiskAdjustments.getMarketRiskAssessment();
  }

  /**
   * Get Fibonacci zone multiplier
   */
  public getFibZoneMultiplier(zone: FibZone): number {
    return this.marketRiskAdjustments.getFibZoneMultiplier(zone);
  }

  /**
   * Check if trade is allowed in current market conditions
   */
  public isTradeAllowedInMarketConditions(fibZone: FibZone, confidence: number, ticker: string): {
    allowed: boolean;
    multiplier: number;
    reasoning: string[];
  } {
    const adjustment = this.marketRiskAdjustments.calculateTradeRiskAdjustment(fibZone, confidence, ticker);
    return {
      allowed: adjustment.approved,
      multiplier: adjustment.multiplier,
      reasoning: adjustment.reasoning
    };
  }  /**

   * Get active risk alerts
   */
  public getActiveAlerts() {
    return this.alertSystem.getActiveAlerts();
  }

  /**
   * Acknowledge a risk alert
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    return this.alertSystem.acknowledgeAlert(alertId, acknowledgedBy);
  }

  /**
   * Get risk management statistics
   */
  public getRiskStats() {
    const portfolioRisk = this.getCurrentRisk();
    const alertStats = this.alertSystem.getAlertStats();
    
    return {
      portfolio: portfolioRisk,
      alerts: alertStats,
      limits: this.riskManager.getRiskLimits(),
      positionSizing: this.positionSizer.getConfig(),
      systemStatus: {
        enabled: this.isEnabled,
        tradingHalted: this.shouldHaltTrading(),
        positionMultiplier: this.getPositionSizeMultiplier()
      }
    };
  }

  /**
   * Update risk management configuration
   */
  public updateConfig(newConfig: Partial<RiskManagementConfig>): void {
    if (newConfig.riskLimits) {
      this.riskManager.updateRiskLimits(newConfig.riskLimits);
    }
    
    if (newConfig.positionSizing) {
      this.positionSizer.updateConfig(newConfig.positionSizing);
    }
    
    if (newConfig.alerts) {
      this.alertSystem.updateConfig(newConfig.alerts);
    }
    
    if (newConfig.enabled !== undefined) {
      this.isEnabled = newConfig.enabled;
      this.alertSystem.setEnabled(newConfig.enabled);
    }

    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Enable/disable risk management system
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.alertSystem.setEnabled(enabled);
    this.emit('enabledChanged', enabled);
  }

  /**
   * Reset consecutive losses counter
   */
  public resetConsecutiveLosses(): void {
    this.riskManager.resetConsecutiveLosses();
  }

  /**
   * Get detailed position risk breakdown
   */
  public getPositionRiskBreakdown(positions: any[]) {
    return this.riskManager.getPositionRiskBreakdown(positions);
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Risk manager events
    this.riskManager.on('riskViolation', (violation) => {
      this.alertSystem.processRiskViolation(violation);
      this.emit('riskViolation', violation);
    });

    this.riskManager.on('tradingHalt', (data) => {
      this.emit('tradingHalt', data);
    });

    // Alert system events
    this.alertSystem.on('haltTrading', (data) => {
      this.emit('tradingHalt', data);
    });

    this.alertSystem.on('reducePositions', (data) => {
      this.emit('reducePositions', data);
    });

    this.alertSystem.on('closePositions', (data) => {
      this.emit('closePositions', data);
    });

    this.alertSystem.on('notifyAdmin', (data) => {
      this.emit('adminNotification', data);
    });
  }

  private generateRecommendations(
    validation: any,
    riskValidation: any,
    signal: SignalFactors
  ): string[] {
    const recommendations: string[] = [];

    if (!validation.isValid) {
      recommendations.push('Consider reducing position size to meet risk limits');
    }

    if (!riskValidation.isValid) {
      recommendations.push('Wait for portfolio heat to decrease before taking new positions');
    }

    if (signal.confidence < 0.7) {
      recommendations.push('Consider waiting for higher confidence signals');
    }

    if (signal.fibZone === 'EXHAUSTION') {
      recommendations.push('Avoid trading in EXHAUSTION Fibonacci zones');
    }

    const currentRisk = this.getCurrentRisk();
    if (currentRisk.consecutiveLosses >= 1) {
      recommendations.push('Consider reducing position size due to recent losses');
    }

    if (currentRisk.drawdown > 0.03) {
      recommendations.push('Monitor drawdown levels closely');
    }

    return recommendations;
  }

  private calculateTradeRiskScore(positionSize: PositionSize, request: TradeRequest): number {
    // Risk score from 0-100 (higher = more risky)
    let score = 0;

    // Position size risk (0-30 points)
    score += (positionSize.riskPercent / 0.02) * 30; // Normalized to 2% max

    // Confidence risk (0-25 points)
    score += (1 - request.signal.confidence) * 25;

    // Fibonacci zone risk (0-20 points)
    const fibRisk = {
      'COMPRESSION': 5,
      'MID_EXPANSION': 10,
      'FULL_EXPANSION': 15,
      'OVER_EXTENSION': 18,
      'EXHAUSTION': 20
    };
    score += fibRisk[request.signal.fibZone] || 10;

    // Portfolio heat risk (0-25 points)
    const currentHeat = this.riskManager.calculatePortfolioHeat(
      request.currentPositions,
      request.accountBalance
    );
    score += (currentHeat / 0.20) * 25; // Normalized to 20% max

    return Math.min(Math.round(score), 100);
  }

  /**
   * Generate risk management report
   */
  public generateRiskReport(): {
    summary: any;
    positions: any[];
    alerts: any[];
    recommendations: string[];
    performance: any;
  } {
    const portfolioRisk = this.getCurrentRisk();
    const alerts = this.getActiveAlerts();
    const stats = this.getRiskStats();

    return {
      summary: {
        portfolioHeat: portfolioRisk.currentHeat,
        drawdown: portfolioRisk.drawdown,
        consecutiveLosses: portfolioRisk.consecutiveLosses,
        riskScore: portfolioRisk.riskScore,
        tradingHalted: this.shouldHaltTrading(),
        positionMultiplier: this.getPositionSizeMultiplier()
      },
      positions: [], // Would be populated with actual positions
      alerts: alerts.map(alert => ({
        id: alert.id,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        acknowledged: alert.acknowledged
      })),
      recommendations: this.generateSystemRecommendations(portfolioRisk),
      performance: {
        alertStats: stats.alerts,
        systemUptime: this.isEnabled ? '100%' : '0%'
      }
    };
  }

  private generateSystemRecommendations(portfolioRisk: PortfolioRisk): string[] {
    const recommendations: string[] = [];

    if (portfolioRisk.currentHeat > 0.15) {
      recommendations.push('Consider reducing portfolio heat by closing some positions');
    }

    if (portfolioRisk.drawdown > 0.03) {
      recommendations.push('Monitor drawdown levels and consider defensive positioning');
    }

    if (portfolioRisk.consecutiveLosses >= 2) {
      recommendations.push('Review trading strategy due to consecutive losses');
    }

    if (portfolioRisk.riskScore > 70) {
      recommendations.push('Overall risk level is elevated - consider reducing exposure');
    }

    return recommendations;
  }
}