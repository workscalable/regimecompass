import { PortfolioRiskManager, RiskLimits } from './PortfolioRiskManager';

/**
 * Position Sizing Engine
 * 
 * Calculates optimal position sizes based on:
 * - Risk management rules (2% per trade, 20% portfolio heat)
 * - Confidence levels and signal strength
 * - Fibonacci zone multipliers
 * - Market regime adjustments
 * - VIX-based volatility adjustments
 */

export interface PositionSizingConfig {
  maxRiskPerTrade: number; // 0.02 (2%)
  maxPortfolioHeat: number; // 0.20 (20%)
  maxDrawdown: number; // 0.05 (5%)
  fibZoneMultipliers: Record<FibZone, number>;
  confidenceMultipliers: {
    high: number; // >= 0.8
    medium: number; // 0.6-0.8
    low: number; // < 0.6
  };
  regimeAdjustments: Record<string, number>;
  vixAdjustments: {
    low: number; // VIX < 20
    medium: number; // VIX 20-30
    high: number; // VIX > 30
  };
}

export type FibZone = 'COMPRESSION' | 'MID_EXPANSION' | 'FULL_EXPANSION' | 'OVER_EXTENSION' | 'EXHAUSTION';

export interface PositionSize {
  contracts: number;
  notionalValue: number;
  riskAmount: number;
  riskPercent: number;
  heatContribution: number;
  adjustments: {
    confidence: number;
    fibZone: number;
    regime: number;
    vix: number;
    risk: number;
  };
  reasoning: string[];
}

export interface SignalFactors {
  ticker: string;
  confidence: number;
  conviction: number;
  fibZone: FibZone;
  expectedMove: number;
  volatility: number;
  regime: string;
}

export interface MarketConditions {
  vix: number;
  regime: string;
  volatilityEnvironment: 'LOW' | 'MEDIUM' | 'HIGH';
  marketBreadth: number;
}

export class PositionSizingEngine {
  private config: PositionSizingConfig;
  private riskManager: PortfolioRiskManager;

  constructor(config: PositionSizingConfig, riskManager: PortfolioRiskManager) {
    this.config = config;
    this.riskManager = riskManager;
  }

  /**
   * Calculate optimal position size for a trade
   */
  public calculateOptimalSize(
    signal: SignalFactors,
    accountBalance: number,
    currentPositions: any[],
    marketConditions: MarketConditions,
    optionPrice?: number,
    stopLoss?: number
  ): PositionSize {
    const reasoning: string[] = [];
    
    // Start with base position size (2% of account)
    const baseRiskAmount = accountBalance * this.config.maxRiskPerTrade;
    reasoning.push(`Base risk: ${(this.config.maxRiskPerTrade * 100).toFixed(1)}% = $${baseRiskAmount.toFixed(2)}`);

    // Apply confidence multiplier
    const confidenceMultiplier = this.getConfidenceMultiplier(signal.confidence);
    const confidenceAdjustedRisk = baseRiskAmount * confidenceMultiplier;
    reasoning.push(`Confidence (${(signal.confidence * 100).toFixed(0)}%): ${confidenceMultiplier.toFixed(2)}x = $${confidenceAdjustedRisk.toFixed(2)}`);

    // Apply Fibonacci zone multiplier
    const fibMultiplier = this.config.fibZoneMultipliers[signal.fibZone] || 1.0;
    const fibAdjustedRisk = confidenceAdjustedRisk * fibMultiplier;
    reasoning.push(`Fib zone (${signal.fibZone}): ${fibMultiplier.toFixed(2)}x = $${fibAdjustedRisk.toFixed(2)}`);

    // Apply regime adjustment
    const regimeMultiplier = this.config.regimeAdjustments[marketConditions.regime] || 1.0;
    const regimeAdjustedRisk = fibAdjustedRisk * regimeMultiplier;
    reasoning.push(`Regime (${marketConditions.regime}): ${regimeMultiplier.toFixed(2)}x = $${regimeAdjustedRisk.toFixed(2)}`);

    // Apply VIX adjustment
    const vixMultiplier = this.getVixMultiplier(marketConditions.vix);
    const vixAdjustedRisk = regimeAdjustedRisk * vixMultiplier;
    reasoning.push(`VIX (${marketConditions.vix.toFixed(1)}): ${vixMultiplier.toFixed(2)}x = $${vixAdjustedRisk.toFixed(2)}`);

    // Apply portfolio risk adjustment
    const riskMultiplier = this.riskManager.getPositionSizeMultiplier();
    const finalRiskAmount = vixAdjustedRisk * riskMultiplier;
    reasoning.push(`Risk adjustment: ${riskMultiplier.toFixed(2)}x = $${finalRiskAmount.toFixed(2)}`);

    // Calculate position size based on instrument type
    let contracts: number;
    let notionalValue: number;

    if (optionPrice) {
      // Options position sizing
      contracts = Math.floor(finalRiskAmount / (optionPrice * 100));
      notionalValue = contracts * optionPrice * 100;
    } else {
      // Stock position sizing (assuming stop loss)
      const stopDistance = stopLoss ? Math.abs(signal.expectedMove - stopLoss) : signal.expectedMove * 0.02;
      const shares = Math.floor(finalRiskAmount / stopDistance);
      contracts = shares;
      notionalValue = shares * signal.expectedMove;
    }

    // Ensure minimum position size
    contracts = Math.max(contracts, 1);

    const actualRiskAmount = optionPrice ? contracts * optionPrice * 100 : finalRiskAmount;
    const riskPercent = actualRiskAmount / accountBalance;
    const heatContribution = riskPercent;

    return {
      contracts,
      notionalValue,
      riskAmount: actualRiskAmount,
      riskPercent,
      heatContribution,
      adjustments: {
        confidence: confidenceMultiplier,
        fibZone: fibMultiplier,
        regime: regimeMultiplier,
        vix: vixMultiplier,
        risk: riskMultiplier
      },
      reasoning
    };
  }  
/**
   * Validate position size against risk limits
   */
  public validatePositionSize(
    positionSize: PositionSize,
    currentPositions: any[],
    accountBalance: number
  ): { isValid: boolean; violations: string[]; adjustedSize?: PositionSize } {
    const violations: string[] = [];
    
    // Check per-trade risk limit
    if (positionSize.riskPercent > this.config.maxRiskPerTrade) {
      violations.push(`Trade risk ${(positionSize.riskPercent * 100).toFixed(1)}% exceeds limit ${(this.config.maxRiskPerTrade * 100).toFixed(1)}%`);
    }

    // Check portfolio heat
    const currentHeat = this.riskManager.calculatePortfolioHeat(currentPositions, accountBalance);
    const projectedHeat = currentHeat + positionSize.heatContribution;
    
    if (projectedHeat > this.config.maxPortfolioHeat) {
      violations.push(`Portfolio heat ${(projectedHeat * 100).toFixed(1)}% would exceed limit ${(this.config.maxPortfolioHeat * 100).toFixed(1)}%`);
    }

    // If violations exist, calculate adjusted size
    let adjustedSize: PositionSize | undefined;
    if (violations.length > 0) {
      const maxAllowableRisk = Math.min(
        this.config.maxRiskPerTrade * accountBalance,
        (this.config.maxPortfolioHeat - currentHeat) * accountBalance
      );
      
      if (maxAllowableRisk > 0) {
        const adjustmentFactor = maxAllowableRisk / positionSize.riskAmount;
        adjustedSize = {
          ...positionSize,
          contracts: Math.max(1, Math.floor(positionSize.contracts * adjustmentFactor)),
          riskAmount: maxAllowableRisk,
          riskPercent: maxAllowableRisk / accountBalance,
          heatContribution: maxAllowableRisk / accountBalance,
          reasoning: [...positionSize.reasoning, `Adjusted for risk limits: ${adjustmentFactor.toFixed(2)}x`]
        };
        adjustedSize.notionalValue = adjustedSize.contracts * (positionSize.notionalValue / positionSize.contracts);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      adjustedSize
    };
  }

  /**
   * Adjust position size for portfolio heat
   */
  public adjustForPortfolioHeat(baseSize: number, currentHeat: number): number {
    const heatUtilization = currentHeat / this.config.maxPortfolioHeat;
    
    if (heatUtilization >= 0.9) {
      return baseSize * 0.2; // Severely reduce if near limit
    } else if (heatUtilization >= 0.8) {
      return baseSize * 0.5; // Reduce by half
    } else if (heatUtilization >= 0.6) {
      return baseSize * 0.8; // Moderate reduction
    }
    
    return baseSize; // No adjustment needed
  }

  /**
   * Apply Fibonacci zone multiplier
   */
  public applyFibZoneMultiplier(baseSize: number, zone: FibZone): number {
    const multiplier = this.config.fibZoneMultipliers[zone] || 1.0;
    return baseSize * multiplier;
  }

  /**
   * Get confidence-based multiplier
   */
  private getConfidenceMultiplier(confidence: number): number {
    if (confidence >= 0.8) {
      return this.config.confidenceMultipliers.high;
    } else if (confidence >= 0.6) {
      return this.config.confidenceMultipliers.medium;
    } else {
      return this.config.confidenceMultipliers.low;
    }
  }

  /**
   * Get VIX-based multiplier
   */
  private getVixMultiplier(vix: number): number {
    if (vix > 30) {
      return this.config.vixAdjustments.high;
    } else if (vix > 20) {
      return this.config.vixAdjustments.medium;
    } else {
      return this.config.vixAdjustments.low;
    }
  }

  /**
   * Calculate base position size
   */
  private calculateBaseSize(confidence: number, accountBalance: number): number {
    return accountBalance * this.config.maxRiskPerTrade;
  }

  /**
   * Apply regime adjustment
   */
  private applyRegimeAdjustment(size: number, regime: string): number {
    const adjustment = this.config.regimeAdjustments[regime] || 1.0;
    return size * adjustment;
  }

  /**
   * Update position sizing configuration
   */
  public updateConfig(newConfig: Partial<PositionSizingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): PositionSizingConfig {
    return { ...this.config };
  }
}