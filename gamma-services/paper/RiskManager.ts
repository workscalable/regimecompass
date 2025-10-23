import { TradeSignal, PaperPosition } from './PaperTradingEngine';
import { OptionContract } from '../data/OptionsChainService';

export interface RiskValidation {
  approved: boolean;
  reason?: string;
  maxPositionSize: number;
  riskScore: number;
  warnings: string[];
}

export interface RiskAction {
  type: 'REDUCE_POSITION' | 'CLOSE_POSITION' | 'HALT_TRADING' | 'ALERT';
  positionId?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  autoExecute: boolean;
}

export interface PortfolioRisk {
  totalExposure: number;
  portfolioHeat: number;
  maxDrawdown: number;
  currentDrawdown: number;
  riskScore: number;
  concentrationRisk: number;
  correlationRisk: number;
}

export interface RiskSettings {
  maxRiskPerTrade: number; // Percentage of account
  maxPortfolioHeat: number; // Percentage of account at risk
  maxDrawdown: number; // Maximum acceptable drawdown
  maxConsecutiveLosses: number;
  maxPositionSize: number; // Percentage of account per position
  stopLossPercent: number;
  profitTargetMultiple: number;
  timeDecayThreshold: number;
}

export class RiskManager {
  private riskSettings: RiskSettings = {
    maxRiskPerTrade: 0.02, // 2%
    maxPortfolioHeat: 0.20, // 20%
    maxDrawdown: 0.10, // 10%
    maxConsecutiveLosses: 3,
    maxPositionSize: 0.10, // 10%
    stopLossPercent: 0.50, // 50% loss
    profitTargetMultiple: 2.0, // 2x risk
    timeDecayThreshold: 0.30 // 30% time decay
  };

  private consecutiveLosses: number = 0;
  private peakAccountValue: number = 100000;
  private tradingHalted: boolean = false;

  constructor(customSettings?: Partial<RiskSettings>) {
    if (customSettings) {
      this.riskSettings = { ...this.riskSettings, ...customSettings };
    }
  }

  public async validateTrade(signal: TradeSignal, accountBalance: number): Promise<RiskValidation> {
    const warnings: string[] = [];
    let riskScore = 0;

    // Check if trading is halted
    if (this.tradingHalted) {
      return {
        approved: false,
        reason: 'Trading is currently halted due to risk limits',
        maxPositionSize: 0,
        riskScore: 100,
        warnings: ['Trading halted']
      };
    }

    // Check account balance
    if (accountBalance <= 0) {
      return {
        approved: false,
        reason: 'Insufficient account balance',
        maxPositionSize: 0,
        riskScore: 100,
        warnings: ['No available balance']
      };
    }

    // Check consecutive losses
    if (this.consecutiveLosses >= this.riskSettings.maxConsecutiveLosses) {
      warnings.push(`${this.consecutiveLosses} consecutive losses - reducing position size`);
      riskScore += 30;
    }

    // Check drawdown
    const currentDrawdown = (this.peakAccountValue - accountBalance) / this.peakAccountValue;
    if (currentDrawdown >= this.riskSettings.maxDrawdown) {
      return {
        approved: false,
        reason: `Maximum drawdown exceeded: ${(currentDrawdown * 100).toFixed(1)}%`,
        maxPositionSize: 0,
        riskScore: 100,
        warnings: ['Maximum drawdown exceeded']
      };
    }

    if (currentDrawdown >= this.riskSettings.maxDrawdown * 0.8) {
      warnings.push('Approaching maximum drawdown limit');
      riskScore += 25;
    }

    // Check confidence level
    if (signal.confidence < 0.5) {
      warnings.push('Low confidence signal - consider reducing position size');
      riskScore += 15;
    }

    // Calculate maximum position size
    const maxRiskAmount = accountBalance * this.riskSettings.maxRiskPerTrade;
    const maxPositionValue = accountBalance * this.riskSettings.maxPositionSize;
    const maxPositionSize = Math.min(maxRiskAmount, maxPositionValue);

    // Adjust for consecutive losses
    const lossAdjustment = Math.max(0.5, 1 - (this.consecutiveLosses * 0.1));
    const adjustedMaxPositionSize = maxPositionSize * lossAdjustment;

    return {
      approved: true,
      maxPositionSize: adjustedMaxPositionSize,
      riskScore,
      warnings
    };
  }

  public calculatePositionSize(
    signal: TradeSignal, 
    contract: OptionContract, 
    accountBalance: number
  ): number {
    const validation = this.validateTrade(signal, accountBalance);
    if (!validation.approved) {
      return 0;
    }

    const contractValue = contract.midPrice * 100;
    let positionSize = Math.floor(validation.maxPositionSize / contractValue);

    // Adjust based on confidence
    const confidenceMultiplier = this.getConfidenceMultiplier(signal.confidence);
    positionSize = Math.floor(positionSize * confidenceMultiplier);

    // Adjust based on conviction
    positionSize = Math.floor(positionSize * signal.conviction);

    // Ensure minimum 1 contract
    return Math.max(1, positionSize);
  }

  public checkPortfolioRisk(openPositions: PaperPosition[], accountBalance: number): boolean {
    const portfolioMetrics = this.getPortfolioMetrics(openPositions, accountBalance);
    
    // Check portfolio heat
    if (portfolioMetrics.portfolioHeat > this.riskSettings.maxPortfolioHeat) {
      return false;
    }

    // Check concentration risk
    if (portfolioMetrics.concentrationRisk > 0.5) { // 50% in single ticker
      return false;
    }

    return true;
  }

  public enforceRiskLimits(positions: PaperPosition[], accountBalance: number): RiskAction[] {
    const actions: RiskAction[] = [];
    const portfolioMetrics = this.getPortfolioMetrics(positions, accountBalance);

    // Check for critical drawdown
    if (portfolioMetrics.currentDrawdown >= this.riskSettings.maxDrawdown) {
      this.tradingHalted = true;
      actions.push({
        type: 'HALT_TRADING',
        severity: 'CRITICAL',
        description: 'Maximum drawdown exceeded - halting all trading',
        autoExecute: true
      });

      // Close all positions
      for (const position of positions) {
        if (position.status === 'OPEN') {
          actions.push({
            type: 'CLOSE_POSITION',
            positionId: position.id,
            severity: 'CRITICAL',
            description: 'Closing position due to maximum drawdown',
            autoExecute: true
          });
        }
      }
    }

    // Check for high portfolio heat
    if (portfolioMetrics.portfolioHeat > this.riskSettings.maxPortfolioHeat) {
      actions.push({
        type: 'ALERT',
        severity: 'HIGH',
        description: `Portfolio heat at ${(portfolioMetrics.portfolioHeat * 100).toFixed(1)}% - consider reducing positions`,
        autoExecute: false
      });
    }

    // Check individual positions for stop losses
    for (const position of positions) {
      if (position.status === 'OPEN') {
        const lossPercent = Math.abs(position.pnlPercent);
        
        if (lossPercent >= this.riskSettings.stopLossPercent * 100) {
          actions.push({
            type: 'CLOSE_POSITION',
            positionId: position.id,
            severity: 'HIGH',
            description: `Stop loss triggered at ${lossPercent.toFixed(1)}% loss`,
            autoExecute: true
          });
        }

        // Check for time decay
        const daysToExpiration = this.getDaysToExpiration(position.expiration);
        const timeDecayRisk = this.calculateTimeDecayRisk(position, daysToExpiration);
        
        if (timeDecayRisk > this.riskSettings.timeDecayThreshold) {
          actions.push({
            type: 'ALERT',
            positionId: position.id,
            severity: 'MEDIUM',
            description: `High time decay risk - ${daysToExpiration} days to expiration`,
            autoExecute: false
          });
        }
      }
    }

    return actions;
  }

  public getPortfolioMetrics(positions: PaperPosition[], accountBalance: number): PortfolioRisk {
    let totalExposure = 0;
    let totalPnL = 0;
    const tickerExposure: Record<string, number> = {};

    for (const position of positions) {
      if (position.status === 'OPEN') {
        const exposure = position.currentPrice * position.quantity * 100;
        totalExposure += exposure;
        totalPnL += position.pnl;

        tickerExposure[position.ticker] = (tickerExposure[position.ticker] || 0) + exposure;
      }
    }

    const portfolioHeat = totalExposure / accountBalance;
    const currentDrawdown = Math.max(0, (this.peakAccountValue - accountBalance) / this.peakAccountValue);
    
    // Update peak if account has grown
    if (accountBalance > this.peakAccountValue) {
      this.peakAccountValue = accountBalance;
    }

    // Calculate concentration risk (max exposure in single ticker)
    const maxTickerExposure = Math.max(...Object.values(tickerExposure), 0);
    const concentrationRisk = maxTickerExposure / accountBalance;

    // Simple correlation risk calculation (placeholder)
    const correlationRisk = Object.keys(tickerExposure).length > 5 ? 0.3 : 0.7;

    // Overall risk score
    const riskScore = Math.min(100, 
      (portfolioHeat * 40) + 
      (currentDrawdown * 30) + 
      (concentrationRisk * 20) + 
      (correlationRisk * 10)
    );

    return {
      totalExposure,
      portfolioHeat,
      maxDrawdown: this.riskSettings.maxDrawdown,
      currentDrawdown,
      riskScore,
      concentrationRisk,
      correlationRisk
    };
  }

  public recordTradeOutcome(pnl: number): void {
    if (pnl < 0) {
      this.consecutiveLosses++;
    } else {
      this.consecutiveLosses = 0;
    }
  }

  public resetTradingHalt(): void {
    this.tradingHalted = false;
    this.consecutiveLosses = 0;
  }

  public updateRiskSettings(newSettings: Partial<RiskSettings>): void {
    this.riskSettings = { ...this.riskSettings, ...newSettings };
  }

  public getRiskSettings(): RiskSettings {
    return { ...this.riskSettings };
  }

  private getConfidenceMultiplier(confidence: number): number {
    if (confidence >= 0.8) return 1.2;
    if (confidence >= 0.7) return 1.0;
    if (confidence >= 0.6) return 0.8;
    return 0.6;
  }

  private getDaysToExpiration(expiration: Date): number {
    const now = new Date();
    const diffTime = expiration.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateTimeDecayRisk(position: PaperPosition, daysToExpiration: number): number {
    // Simple time decay risk calculation
    // Risk increases as expiration approaches and position is losing money
    const timeRisk = Math.max(0, 1 - (daysToExpiration / 30)); // Higher risk as expiration approaches
    const pnlRisk = position.pnl < 0 ? Math.abs(position.pnlPercent) / 100 : 0;
    
    return Math.min(1, timeRisk + pnlRisk);
  }
}