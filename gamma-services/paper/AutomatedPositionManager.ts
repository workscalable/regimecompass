import { EventBus } from '../core/EventBus';
import { PaperPosition, ExitReason, RiskSettings, TradeSignal, OptionsGreeks } from '../models/PaperTradingTypes';
import { ExitConditionManager, ExitConditionConfig } from './ExitConditionManager';
import { RiskManager } from './RiskManager';
import { DatabaseManager } from '../database/DatabaseManager';
import { logger, createLogger } from '../logging/Logger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';
import { alertSystem } from '../alerts/AlertSystem';

export interface PositionManagementConfig {
  // Confidence-based exit parameters
  confidenceBasedExits: {
    highConfidence: {
      profitTarget: number; // e.g., 0.75 (75%)
      stopLoss: number; // e.g., 0.40 (40%)
      timeDecayThreshold: number; // e.g., 0.25 (25%)
    };
    mediumConfidence: {
      profitTarget: number; // e.g., 0.50 (50%)
      stopLoss: number; // e.g., 0.50 (50%)
      timeDecayThreshold: number; // e.g., 0.30 (30%)
    };
    lowConfidence: {
      profitTarget: number; // e.g., 0.30 (30%)
      stopLoss: number; // e.g., 0.60 (60%)
      timeDecayThreshold: number; // e.g., 0.35 (35%)
    };
  };
  
  // Time-based exit parameters
  timeBasedExits: {
    maxHoldingPeriodHours: number; // e.g., 72 hours
    expirationWarningDays: number; // e.g., 2 days
    forceExitBeforeExpirationHours: number; // e.g., 4 hours
    weekendExitEnabled: boolean;
  };
  
  // Portfolio heat management
  portfolioHeatManagement: {
    maxPortfolioHeat: number; // e.g., 0.20 (20%)
    heatReductionThreshold: number; // e.g., 0.15 (15%)
    emergencyExitThreshold: number; // e.g., 0.25 (25%)
    consecutiveLossLimit: number; // e.g., 3
    drawdownProtectionThreshold: number; // e.g., 0.05 (5%)
  };
  
  // Position sizing validation
  positionSizing: {
    maxRiskPerTrade: number; // e.g., 0.02 (2%)
    maxPositionSize: number; // e.g., 0.10 (10%)
    minPositionSize: number; // e.g., 0.001 (0.1%)
    confidenceMultipliers: {
      high: number; // e.g., 1.2
      medium: number; // e.g., 1.0
      low: number; // e.g., 0.8
    };
  };
  
  // Automation settings
  automation: {
    enableAutoExits: boolean;
    enablePositionSizeValidation: boolean;
    enablePortfolioHeatManagement: boolean;
    enableTimeBasedExits: boolean;
  };
}

export interface PortfolioHeatMetrics {
  currentHeat: number;
  maxHeat: number;
  heatByTicker: Record<string, number>;
  totalExposure: number;
  availableCapacity: number;
  riskScore: number;
  consecutiveLosses: number;
  currentDrawdown: number;
}

export interface PositionSizeValidation {
  approved: boolean;
  recommendedSize: number;
  originalSize: number;
  adjustmentReason?: string;
  riskMetrics: {
    riskPerTrade: number;
    portfolioHeatImpact: number;
    concentrationRisk: number;
  };
}

export interface TimeBasedExitCheck {
  positionId: string;
  shouldExit: boolean;
  reason: ExitReason;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeToExpiration: number; // hours
  holdingPeriod: number; // hours
  message: string;
}

export class AutomatedPositionManager {
  private config: PositionManagementConfig;
  private exitConditionManager: ExitConditionManager;
  private riskManager: RiskManager;
  private databaseManager: DatabaseManager;
  private eventBus: EventBus;
  private logger = createLogger({ component: 'AutomatedPositionManager' });
  
  private positions: Map<string, PaperPosition> = new Map();
  private portfolioHeat: number = 0;
  private consecutiveLosses: number = 0;
  private lastTradeWasWin: boolean = true;
  private currentDrawdown: number = 0;
  private peakAccountValue: number = 0;
  
  private monitoringInterval?: NodeJS.Timeout;
  private isShuttingDown: boolean = false;

  constructor(
    config: PositionManagementConfig,
    exitConditionManager: ExitConditionManager,
    riskManager: RiskManager,
    databaseManager: DatabaseManager,
    eventBus: EventBus
  ) {
    this.config = config;
    this.exitConditionManager = exitConditionManager;
    this.riskManager = riskManager;
    this.databaseManager = databaseManager;
    this.eventBus = eventBus;
    
    this.setupEventListeners();
    this.initializePortfolioTracking();
  }

  private setupEventListeners(): void {
    // Listen for new positions
    this.eventBus.on('paper:trade:executed', async (data) => {
      await this.onPositionCreated(data.position);
    });

    // Listen for position updates
    this.eventBus.on('paper:position:update', async (data) => {
      await this.onPositionUpdated(data.positionId, data.currentPrice, data.pnl, data.pnlPercent);
    });

    // Listen for position closures
    this.eventBus.on('paper:position:closed', async (data) => {
      await this.onPositionClosed(data.position, data.reason as ExitReason);
    });

    // Listen for account updates
    this.eventBus.on('paper:account:update', async (data) => {
      await this.onAccountUpdated(data.balance, data.totalPnL);
    });

    // Listen for market data updates
    this.eventBus.on('market:data', async (data) => {
      await this.onMarketDataUpdate(data);
    });
  }

  private async initializePortfolioTracking(): Promise<void> {
    try {
      // Load existing positions from database
      const existingPositions = await this.databaseManager.getPaperPositions('default-paper-account', 'OPEN');
      
      for (const position of existingPositions) {
        this.positions.set(position.id, position);
      }
      
      // Calculate initial portfolio heat
      await this.updatePortfolioHeat();
      
      await this.logger.info('SYSTEM', 'Automated position manager initialized', {
        metadata: {
          openPositions: this.positions.size,
          portfolioHeat: this.portfolioHeat
        }
      });
    } catch (error) {
      await this.logger.error('SYSTEM', 'Failed to initialize portfolio tracking', {}, error as Error);
    }
  }

  public async startAutomation(): Promise<void> {
    if (this.monitoringInterval) {
      this.stopAutomation();
    }

    // Start monitoring every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.performAutomatedChecks();
      }
    }, 30000);

    await this.logger.info('SYSTEM', 'Automated position management started');
  }

  public stopAutomation(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.logger.info('SYSTEM', 'Automated position management stopped');
  }

  private async performAutomatedChecks(): Promise<void> {
    try {
      await performanceMonitor.trackOperation('automated-position-checks', async () => {
        // 1. Check time-based exits
        if (this.config.automation.enableTimeBasedExits) {
          await this.checkTimeBasedExits();
        }

        // 2. Check portfolio heat management
        if (this.config.automation.enablePortfolioHeatManagement) {
          await this.checkPortfolioHeatManagement();
        }

        // 3. Check expiration handling
        await this.checkExpirationHandling();

        // 4. Update portfolio metrics
        await this.updatePortfolioHeat();
      });
    } catch (error) {
      await this.logger.error('SYSTEM', 'Error during automated checks', {}, error as Error);
    }
  }

  private async onPositionCreated(position: PaperPosition): Promise<void> {
    try {
      this.positions.set(position.id, position);
      
      // Set up confidence-based exit conditions
      await this.setupConfidenceBasedExits(position);
      
      // Update portfolio heat
      await this.updatePortfolioHeat();
      
      await this.logger.info('POSITION_MANAGEMENT', 'Position created and automated management enabled', {
        positionId: position.id,
        ticker: position.ticker,
        metadata: {
          confidence: position.confidence,
          portfolioHeat: this.portfolioHeat
        }
      });
    } catch (error) {
      await this.logger.error('POSITION_MANAGEMENT', 'Error setting up automated management for new position', {
        positionId: position.id
      }, error as Error);
    }
  }

  private async setupConfidenceBasedExits(position: PaperPosition): Promise<void> {
    const confidence = position.confidence;
    let exitParams;

    // Determine exit parameters based on confidence level
    if (confidence >= 0.8) {
      exitParams = this.config.confidenceBasedExits.highConfidence;
    } else if (confidence >= 0.6) {
      exitParams = this.config.confidenceBasedExits.mediumConfidence;
    } else {
      exitParams = this.config.confidenceBasedExits.lowConfidence;
    }

    // Configure exit condition manager with confidence-based parameters
    const exitConfig: ExitConditionConfig = {
      profitTargetPercent: exitParams.profitTarget * 100,
      stopLossPercent: exitParams.stopLoss * 100,
      timeDecayThreshold: exitParams.timeDecayThreshold,
      trailingStopPercent: 20, // Default trailing stop
      breakevenStopEnabled: confidence >= 0.7, // Only for higher confidence trades
      expirationDaysWarning: this.config.timeBasedExits.expirationWarningDays,
      enableAutoExit: this.config.automation.enableAutoExits
    };

    // Update exit condition manager configuration for this position
    this.exitConditionManager.updateConfig(exitConfig);

    await this.logger.info('POSITION_MANAGEMENT', 'Confidence-based exit conditions set', {
      positionId: position.id,
      metadata: {
        confidence: confidence,
        profitTarget: exitParams.profitTarget,
        stopLoss: exitParams.stopLoss,
        timeDecayThreshold: exitParams.timeDecayThreshold
      }
    });
  }

  private async onPositionUpdated(
    positionId: string,
    currentPrice: number,
    pnl: number,
    pnlPercent: number
  ): Promise<void> {
    const position = this.positions.get(positionId);
    if (!position) return;

    // Update position data
    position.currentPrice = currentPrice;
    position.pnl = pnl;
    position.pnlPercent = pnlPercent;

    // Update MFE/MAE
    if (pnl > position.maxFavorableExcursion) {
      position.maxFavorableExcursion = pnl;
    }
    if (pnl < position.maxAdverseExcursion) {
      position.maxAdverseExcursion = pnl;
    }

    // Check for automated exits based on Greeks impact
    await this.checkGreeksBasedExits(position);
  }

  private async checkGreeksBasedExits(position: PaperPosition): Promise<void> {
    const greeks = position.greeks;
    const timeToExpiration = this.calculateTimeToExpiration(position.expiration);
    
    // Check theta decay impact
    if (timeToExpiration < 7 && Math.abs(greeks.theta) > 0.05) {
      const thetaDecayRate = Math.abs(greeks.theta) / position.currentPrice;
      
      if (thetaDecayRate > this.getTimeDecayThreshold(position.confidence)) {
        await this.triggerAutomatedExit(position.id, 'TIME_DECAY', 
          `High theta decay detected: ${(thetaDecayRate * 100).toFixed(2)}% per day`);
      }
    }

    // Check gamma risk for positions near expiration
    if (timeToExpiration < 3 && greeks.gamma > 0.1) {
      await this.triggerAutomatedExit(position.id, 'RISK_MANAGEMENT',
        'High gamma risk near expiration');
    }
  }

  private getTimeDecayThreshold(confidence: number): number {
    if (confidence >= 0.8) {
      return this.config.confidenceBasedExits.highConfidence.timeDecayThreshold;
    } else if (confidence >= 0.6) {
      return this.config.confidenceBasedExits.mediumConfidence.timeDecayThreshold;
    } else {
      return this.config.confidenceBasedExits.lowConfidence.timeDecayThreshold;
    }
  }

  private async onPositionClosed(position: PaperPosition, reason: ExitReason): Promise<void> {
    // Remove from active tracking
    this.positions.delete(position.id);
    
    // Update consecutive loss tracking
    if (position.pnl > 0) {
      this.consecutiveLosses = 0;
      this.lastTradeWasWin = true;
    } else {
      this.consecutiveLosses++;
      this.lastTradeWasWin = false;
    }
    
    // Update portfolio heat
    await this.updatePortfolioHeat();
    
    await this.logger.info('POSITION_MANAGEMENT', 'Position closed and removed from automated management', {
      positionId: position.id,
      metadata: {
        pnl: position.pnl,
        reason: reason,
        consecutiveLosses: this.consecutiveLosses
      }
    });
  }

  private async onAccountUpdated(balance: number, totalPnL: number): Promise<void> {
    // Update peak account value for drawdown calculation
    if (balance > this.peakAccountValue) {
      this.peakAccountValue = balance;
    }
    
    // Calculate current drawdown
    this.currentDrawdown = (this.peakAccountValue - balance) / this.peakAccountValue;
    
    // Check drawdown protection
    if (this.currentDrawdown > this.config.portfolioHeatManagement.drawdownProtectionThreshold) {
      await this.triggerDrawdownProtection();
    }
  }

  private async triggerDrawdownProtection(): Promise<void> {
    await this.logger.warn('RISK_MANAGEMENT', 'Drawdown protection triggered', {
      metadata: {
        currentDrawdown: this.currentDrawdown,
        threshold: this.config.portfolioHeatManagement.drawdownProtectionThreshold
      }
    });

    // Reduce position sizes for new trades
    alertSystem.updateMetric('drawdown.protection.active', true);
    
    // Consider closing losing positions
    const losingPositions = Array.from(this.positions.values()).filter(p => p.pnl < 0);
    for (const position of losingPositions) {
      if (position.pnlPercent < -30) { // Close positions with >30% loss
        await this.triggerAutomatedExit(position.id, 'RISK_MANAGEMENT', 
          'Drawdown protection: closing losing position');
      }
    }
  }

  private async checkTimeBasedExits(): Promise<void> {
    const now = new Date();
    
    for (const position of Array.from(this.positions.values())) {
      const timeBasedCheck = this.evaluateTimeBasedExit(position, now);
      
      if (timeBasedCheck.shouldExit) {
        await this.triggerAutomatedExit(position.id, timeBasedCheck.reason, timeBasedCheck.message);
      }
    }
  }

  private evaluateTimeBasedExit(position: PaperPosition, now: Date): TimeBasedExitCheck {
    const holdingPeriodMs = now.getTime() - position.entryTimestamp.getTime();
    const holdingPeriodHours = holdingPeriodMs / (1000 * 60 * 60);
    const timeToExpirationHours = this.calculateTimeToExpiration(position.expiration);
    
    // Check maximum holding period
    if (holdingPeriodHours > this.config.timeBasedExits.maxHoldingPeriodHours) {
      return {
        positionId: position.id,
        shouldExit: true,
        reason: 'TIME_DECAY',
        urgency: 'MEDIUM',
        timeToExpiration: timeToExpirationHours,
        holdingPeriod: holdingPeriodHours,
        message: `Maximum holding period exceeded: ${holdingPeriodHours.toFixed(1)} hours`
      };
    }
    
    // Check force exit before expiration
    if (timeToExpirationHours < this.config.timeBasedExits.forceExitBeforeExpirationHours) {
      return {
        positionId: position.id,
        shouldExit: true,
        reason: 'EXPIRATION',
        urgency: 'HIGH',
        timeToExpiration: timeToExpirationHours,
        holdingPeriod: holdingPeriodHours,
        message: `Force exit before expiration: ${timeToExpirationHours.toFixed(1)} hours remaining`
      };
    }
    
    // Check weekend exit (if enabled)
    if (this.config.timeBasedExits.weekendExitEnabled && this.isWeekend(now)) {
      return {
        positionId: position.id,
        shouldExit: true,
        reason: 'RISK_MANAGEMENT',
        urgency: 'LOW',
        timeToExpiration: timeToExpirationHours,
        holdingPeriod: holdingPeriodHours,
        message: 'Weekend exit enabled'
      };
    }
    
    return {
      positionId: position.id,
      shouldExit: false,
      reason: 'MANUAL',
      urgency: 'LOW',
      timeToExpiration: timeToExpirationHours,
      holdingPeriod: holdingPeriodHours,
      message: 'No time-based exit required'
    };
  }

  private calculateTimeToExpiration(expiration: Date): number {
    const now = new Date();
    const timeToExpirationMs = expiration.getTime() - now.getTime();
    return Math.max(0, timeToExpirationMs / (1000 * 60 * 60)); // Convert to hours
  }

  private isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  }

  private async checkExpirationHandling(): Promise<void> {
    const now = new Date();
    
    for (const position of Array.from(this.positions.values())) {
      // Check if position has expired
      if (position.expiration <= now && position.status === 'OPEN') {
        await this.handleExpiredPosition(position);
      }
    }
  }

  private async handleExpiredPosition(position: PaperPosition): Promise<void> {
    try {
      // Calculate intrinsic value at expiration
      const intrinsicValue = await this.calculateIntrinsicValue(position);
      
      // Update position with expiration settlement
      position.exitPrice = intrinsicValue;
      position.exitTimestamp = new Date();
      position.status = 'EXPIRED';
      position.exitReason = 'EXPIRATION';
      
      // Calculate final PnL based on intrinsic value
      const finalPnL = (intrinsicValue - position.entryPrice) * position.quantity * 100;
      position.pnl = finalPnL;
      position.pnlPercent = ((intrinsicValue - position.entryPrice) / position.entryPrice) * 100;
      
      // Remove from active positions
      this.positions.delete(position.id);
      
      // Emit expiration event
      this.eventBus.emit('paper:position:expired', {
        position,
        intrinsicValue,
        finalPnL
      });
      
      await this.logger.info('POSITION_MANAGEMENT', 'Position expired and settled at intrinsic value', {
        positionId: position.id,
        metadata: {
          intrinsicValue: intrinsicValue,
          finalPnL: finalPnL
        }
      });
    } catch (error) {
      await this.logger.error('POSITION_MANAGEMENT', 'Error handling expired position', {
        positionId: position.id
      }, error as Error);
    }
  }

  private async calculateIntrinsicValue(position: PaperPosition): Promise<number> {
    try {
      // Get current underlying price from market data
      // For now, using a placeholder - would integrate with real market data
      const underlyingPrice = await this.getCurrentUnderlyingPrice(position.ticker);
      
      if (position.contractType === 'CALL') {
        return Math.max(0, underlyingPrice - position.strike);
      } else {
        return Math.max(0, position.strike - underlyingPrice);
      }
    } catch (error) {
      await this.logger.warn('POSITION_MANAGEMENT', 'Could not get current underlying price for intrinsic value calculation', {
        positionId: position.id,
        ticker: position.ticker
      });
      return 0; // Default to worthless if can't get price
    }
  }

  private async getCurrentUnderlyingPrice(ticker: string): Promise<number> {
    // Placeholder implementation - would integrate with market data service
    // For now, return a reasonable default
    return 100;
  }

  private async checkPortfolioHeatManagement(): Promise<void> {
    await this.updatePortfolioHeat();
    
    const heatMetrics = this.getPortfolioHeatMetrics();
    
    // Check emergency exit threshold
    if (heatMetrics.currentHeat > this.config.portfolioHeatManagement.emergencyExitThreshold) {
      await this.triggerEmergencyExits();
    }
    
    // Check heat reduction threshold
    else if (heatMetrics.currentHeat > this.config.portfolioHeatManagement.heatReductionThreshold) {
      await this.triggerHeatReduction();
    }
    
    // Check consecutive loss limit
    if (this.consecutiveLosses >= this.config.portfolioHeatManagement.consecutiveLossLimit) {
      await this.triggerConsecutiveLossProtection();
    }
  }

  private async triggerEmergencyExits(): Promise<void> {
    await this.logger.warn('RISK_MANAGEMENT', 'Emergency portfolio heat threshold exceeded - closing all positions', {
      metadata: {
        currentHeat: this.portfolioHeat,
        threshold: this.config.portfolioHeatManagement.emergencyExitThreshold
      }
    });
    
    // Close all positions immediately
    for (const position of Array.from(this.positions.values())) {
      await this.triggerAutomatedExit(position.id, 'RISK_MANAGEMENT', 
        'Emergency exit: portfolio heat exceeded');
    }
    
    alertSystem.updateMetric('emergency.exits.triggered', true);
  }

  private async triggerHeatReduction(): Promise<void> {
    await this.logger.info('RISK_MANAGEMENT', 'Portfolio heat reduction triggered', {
      metadata: {
        currentHeat: this.portfolioHeat,
        threshold: this.config.portfolioHeatManagement.heatReductionThreshold
      }
    });
    
    // Close losing positions first
    const losingPositions = Array.from(this.positions.values())
      .filter(p => p.pnl < 0)
      .sort((a, b) => a.pnl - b.pnl); // Sort by worst losses first
    
    for (const position of losingPositions.slice(0, 2)) { // Close worst 2 positions
      await this.triggerAutomatedExit(position.id, 'RISK_MANAGEMENT', 
        'Heat reduction: closing losing position');
    }
  }

  private async triggerConsecutiveLossProtection(): Promise<void> {
    await this.logger.warn('RISK_MANAGEMENT', 'Consecutive loss limit reached', {
      metadata: {
        consecutiveLosses: this.consecutiveLosses,
        limit: this.config.portfolioHeatManagement.consecutiveLossLimit
      }
    });
    
    // Reduce position sizes for future trades
    alertSystem.updateMetric('consecutive.loss.protection.active', true);
    
    // Consider closing remaining positions if they're not profitable
    const unprofitablePositions = Array.from(this.positions.values()).filter(p => p.pnl <= 0);
    for (const position of unprofitablePositions) {
      if (position.pnlPercent < -20) { // Close positions with >20% loss
        await this.triggerAutomatedExit(position.id, 'RISK_MANAGEMENT', 
          'Consecutive loss protection: closing unprofitable position');
      }
    }
  }

  private async triggerAutomatedExit(positionId: string, reason: ExitReason, message: string): Promise<void> {
    try {
      await this.logger.info('SYSTEM', 'Triggering automated exit', {
        positionId: positionId,
        metadata: {
          reason: reason,
          message: message
        }
      });
      
      // Emit exit signal
      this.eventBus.emit('exit:signal', {
        positionId: positionId,
        reason: reason
      });
      
      // Update metrics
      alertSystem.updateMetric('automated.exits.triggered', 1);
    } catch (error) {
      await this.logger.error('SYSTEM', 'Error triggering automated exit', {
        positionId: positionId,
        metadata: {
          reason: reason
        }
      }, error as Error);
    }
  }

  public async validatePositionSize(
    signal: TradeSignal,
    proposedSize: number,
    accountBalance: number
  ): Promise<PositionSizeValidation> {
    try {
      if (!this.config.automation.enablePositionSizeValidation) {
        return {
          approved: true,
          recommendedSize: proposedSize,
          originalSize: proposedSize,
          riskMetrics: {
            riskPerTrade: 0,
            portfolioHeatImpact: 0,
            concentrationRisk: 0
          }
        };
      }

      const riskPerTrade = (proposedSize * 100) / accountBalance; // Assuming $100 per contract
      const maxRiskPerTrade = this.config.positionSizing.maxRiskPerTrade;
      
      // Calculate portfolio heat impact
      const currentHeat = this.portfolioHeat;
      const estimatedHeatImpact = riskPerTrade;
      const projectedHeat = currentHeat + estimatedHeatImpact;
      
      // Calculate concentration risk
      const tickerExposure = this.getTickerExposure(signal.ticker);
      const concentrationRisk = (tickerExposure + (proposedSize * 100)) / accountBalance;
      
      let recommendedSize = proposedSize;
      let approved = true;
      let adjustmentReason: string | undefined;
      
      // Check maximum risk per trade
      if (riskPerTrade > maxRiskPerTrade) {
        recommendedSize = Math.floor((maxRiskPerTrade * accountBalance) / 100);
        adjustmentReason = `Risk per trade exceeded: ${(riskPerTrade * 100).toFixed(2)}% > ${(maxRiskPerTrade * 100).toFixed(2)}%`;
        approved = false;
      }
      
      // Check portfolio heat
      if (projectedHeat > this.config.portfolioHeatManagement.maxPortfolioHeat) {
        const availableHeat = this.config.portfolioHeatManagement.maxPortfolioHeat - currentHeat;
        recommendedSize = Math.floor((availableHeat * accountBalance) / 100);
        adjustmentReason = `Portfolio heat would exceed limit: ${(projectedHeat * 100).toFixed(2)}%`;
        approved = false;
      }
      
      // Apply confidence multiplier
      const confidenceMultiplier = this.getConfidenceMultiplier(signal.confidence);
      recommendedSize = Math.floor(recommendedSize * confidenceMultiplier);
      
      // Check minimum and maximum position size
      const minSize = Math.ceil((this.config.positionSizing.minPositionSize * accountBalance) / 100);
      const maxSize = Math.floor((this.config.positionSizing.maxPositionSize * accountBalance) / 100);
      
      recommendedSize = Math.max(minSize, Math.min(recommendedSize, maxSize));
      
      // Final approval check
      if (recommendedSize !== proposedSize) {
        approved = false;
        if (!adjustmentReason) {
          adjustmentReason = 'Position size adjusted for risk management';
        }
      }
      
      return {
        approved,
        recommendedSize,
        originalSize: proposedSize,
        adjustmentReason,
        riskMetrics: {
          riskPerTrade: (recommendedSize * 100) / accountBalance,
          portfolioHeatImpact: estimatedHeatImpact,
          concentrationRisk
        }
      };
    } catch (error) {
      await this.logger.error('SYSTEM', 'Error validating position size', {
        ticker: signal.ticker,
        metadata: {
          proposedSize: proposedSize
        }
      }, error as Error);
      
      return {
        approved: false,
        recommendedSize: 1, // Minimum safe size
        originalSize: proposedSize,
        adjustmentReason: 'Error during validation - using minimum size',
        riskMetrics: {
          riskPerTrade: 0,
          portfolioHeatImpact: 0,
          concentrationRisk: 0
        }
      };
    }
  }

  private getConfidenceMultiplier(confidence: number): number {
    if (confidence >= 0.8) {
      return this.config.positionSizing.confidenceMultipliers.high;
    } else if (confidence >= 0.6) {
      return this.config.positionSizing.confidenceMultipliers.medium;
    } else {
      return this.config.positionSizing.confidenceMultipliers.low;
    }
  }

  private getTickerExposure(ticker: string): number {
    let exposure = 0;
    for (const position of Array.from(this.positions.values())) {
      if (position.ticker === ticker && position.status === 'OPEN') {
        exposure += position.currentPrice * position.quantity * 100;
      }
    }
    return exposure;
  }

  private async updatePortfolioHeat(): Promise<void> {
    let totalExposure = 0;
    
    for (const position of Array.from(this.positions.values())) {
      if (position.status === 'OPEN') {
        totalExposure += Math.abs(position.pnl); // Use absolute PnL for heat calculation
      }
    }
    
    // Assuming account balance for heat calculation - would get from account service
    const accountBalance = 100000; // Placeholder
    this.portfolioHeat = totalExposure / accountBalance;
  }

  public getPortfolioHeatMetrics(): PortfolioHeatMetrics {
    const heatByTicker: Record<string, number> = {};
    let totalExposure = 0;
    
    for (const position of Array.from(this.positions.values())) {
      if (position.status === 'OPEN') {
        const exposure = position.currentPrice * position.quantity * 100;
        totalExposure += exposure;
        
        if (!heatByTicker[position.ticker]) {
          heatByTicker[position.ticker] = 0;
        }
        heatByTicker[position.ticker] += exposure;
      }
    }
    
    const accountBalance = 100000; // Placeholder
    const availableCapacity = this.config.portfolioHeatManagement.maxPortfolioHeat - this.portfolioHeat;
    
    return {
      currentHeat: this.portfolioHeat,
      maxHeat: this.config.portfolioHeatManagement.maxPortfolioHeat,
      heatByTicker,
      totalExposure,
      availableCapacity: Math.max(0, availableCapacity),
      riskScore: Math.min(100, (this.portfolioHeat / this.config.portfolioHeatManagement.maxPortfolioHeat) * 100),
      consecutiveLosses: this.consecutiveLosses,
      currentDrawdown: this.currentDrawdown
    };
  }

  private async onMarketDataUpdate(data: any): Promise<void> {
    // Update positions with new market data
    for (const position of Array.from(this.positions.values())) {
      if (position.ticker === data.ticker && data.options && data.options[position.optionSymbol]) {
        const optionData = data.options[position.optionSymbol];
        
        // Update position with new price and Greeks
        position.currentPrice = optionData.midPrice;
        position.greeks = {
          delta: optionData.delta,
          gamma: optionData.gamma,
          theta: optionData.theta,
          vega: optionData.vega,
          rho: position.greeks.rho,
          impliedVolatility: optionData.impliedVolatility
        };
        
        // Recalculate PnL
        const pnl = (position.currentPrice - position.entryPrice) * position.quantity * 100;
        position.pnl = pnl;
        position.pnlPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
        
        // Update MFE/MAE
        if (pnl > position.maxFavorableExcursion) {
          position.maxFavorableExcursion = pnl;
        }
        if (pnl < position.maxAdverseExcursion) {
          position.maxAdverseExcursion = pnl;
        }
      }
    }
  }

  public updateConfig(newConfig: Partial<PositionManagementConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('SYSTEM', 'Automated position management configuration updated');
  }

  public getConfig(): PositionManagementConfig {
    return { ...this.config };
  }

  public getStats(): {
    activePositions: number;
    portfolioHeat: number;
    consecutiveLosses: number;
    currentDrawdown: number;
    automatedExitsTriggered: number;
    positionSizeAdjustments: number;
  } {
    return {
      activePositions: this.positions.size,
      portfolioHeat: this.portfolioHeat,
      consecutiveLosses: this.consecutiveLosses,
      currentDrawdown: this.currentDrawdown,
      automatedExitsTriggered: 0, // Would track in production
      positionSizeAdjustments: 0 // Would track in production
    };
  }

  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.stopAutomation();
    this.positions.clear();
    
    await this.logger.info('SYSTEM', 'Automated position manager shutdown complete');
  }
}