import { EventEmitter } from 'events';

// Core PnL Tracking Interfaces
export interface RealTimePnLSnapshot {
  timestamp: Date;
  positionId: string;
  ticker: string;
  
  // Core P&L Components
  totalPnL: number;
  totalPnLPercent: number;
  intrinsicValue: number;
  timeValue: number;
  
  // Greeks Impact Breakdown
  greeksImpact: GreeksPnLBreakdown;
  
  // Volatility Impact
  volatilityImpact: VolatilityPnLImpact;
  
  // Time Decay Impact
  timeDecayImpact: TimeDecayPnLImpact;
  
  // Market Movement Impact
  marketMovementImpact: MarketMovementPnLImpact;
  
  // Excursion Tracking
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  currentExcursion: number;
  
  // Performance Metrics
  unrealizedPnL: number;
  realizedPnL: number;
  holdingPeriod: number; // in hours
  
  // Risk Metrics
  riskAdjustedReturn: number;
  sharpeContribution: number;
  drawdownContribution: number;
}

export interface GreeksPnLBreakdown {
  deltaContribution: number;
  gammaContribution: number;
  thetaContribution: number;
  vegaContribution: number;
  rhoContribution: number;
  totalGreeksContribution: number;
  
  // Greeks efficiency metrics
  deltaEfficiency: number; // How well delta captured price moves
  gammaAcceleration: number; // Gamma's acceleration effect
  thetaDecayRate: number; // Rate of time decay
  vegaVolatilityCapture: number; // Vega's volatility capture
}e
xport interface VolatilityPnLImpact {
  impliedVolatilityChange: number;
  vegaImpact: number;
  volExpansionBenefit: number;
  volContractionCost: number;
  volRank: number;
  volPercentile: number;
  
  // Volatility scenarios
  volCrushRisk: number;
  volExpansionOpportunity: number;
}

export interface TimeDecayPnLImpact {
  dailyThetaDecay: number;
  weeklyThetaDecay: number;
  accelerationFactor: number;
  timeValueRemaining: number;
  daysToExpiration: number;
  
  // Time decay scenarios
  weekendDecay: number;
  holidayDecay: number;
  acceleratedDecay: number;
}

export interface MarketMovementPnLImpact {
  underlyingPriceChange: number;
  underlyingPriceChangePercent: number;
  deltaAdjustedMove: number;
  gammaAdjustedMove: number;
  
  // Movement efficiency
  moveCapture: number; // How well position captured the move
  moveEfficiency: number; // Efficiency of move capture
  directionalAccuracy: number; // Accuracy of directional bet
}

export interface ExcursionAnalysis {
  positionId: string;
  
  // Maximum Favorable Excursion (MFE)
  mfeValue: number;
  mfePercent: number;
  mfeTimestamp: Date;
  mfeHoldingPeriod: number;
  
  // Maximum Adverse Excursion (MAE)
  maeValue: number;
  maePercent: number;
  maeTimestamp: Date;
  maeHoldingPeriod: number;
  
  // Excursion Patterns
  excursionPattern: ExcursionPattern;
  recoveryPattern: RecoveryPattern;
  
  // Risk Metrics
  riskRewardRatio: number;
  efficiencyRatio: number; // Final P&L / MFE
  drawdownRatio: number; // MAE / Entry Value
}

export interface ExcursionPattern {
  type: 'IMMEDIATE_PROFIT' | 'DELAYED_PROFIT' | 'VOLATILE' | 'STEADY_DECLINE' | 'RECOVERY';
  volatility: number;
  trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
  momentum: number;
}

export interface RecoveryPattern {
  hasRecovered: boolean;
  recoveryTime: number; // hours
  recoveryStrength: number; // 0-1 scale
  partialRecovery: boolean;
}

export interface PnLAttribution {
  positionId: string;
  totalPnL: number;
  
  // Attribution by source
  priceMovementAttribution: number; // Delta + Gamma
  timeDecayAttribution: number; // Theta
  volatilityAttribution: number; // Vega
  interestRateAttribution: number; // Rho
  residualAttribution: number; // Unexplained
  
  // Attribution percentages
  attributionBreakdown: {
    priceMovement: number;
    timeDecay: number;
    volatility: number;
    interestRate: number;
    residual: number;
  };
  
  // Confidence in attribution
  attributionConfidence: number;
  attributionQuality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PortfolioPnLSummary {
  timestamp: Date;
  
  // Total Portfolio Metrics
  totalUnrealizedPnL: number;
  totalRealizedPnL: number;
  totalPnL: number;
  totalPnLPercent: number;
  
  // By Ticker Breakdown
  tickerPnL: Map<string, TickerPnLSummary>;
  
  // Greeks Portfolio Impact
  portfolioGreeksImpact: GreeksPnLBreakdown;
  
  // Risk Metrics
  portfolioVaR: number;
  portfolioSharpe: number;
  portfolioDrawdown: number;
  
  // Performance Attribution
  bestPerformer: string;
  worstPerformer: string;
  topContributor: string;
  topDetractor: string;
}

export interface TickerPnLSummary {
  ticker: string;
  positionCount: number;
  totalPnL: number;
  totalPnLPercent: number;
  unrealizedPnL: number;
  realizedPnL: number;
  
  // Performance Metrics
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  
  // Greeks Impact
  greeksContribution: GreeksPnLBreakdown;
  
  // Risk Metrics
  concentration: number;
  correlation: number;
  volatility: number;
}

// Position data interface (from EnhancedPaperTradingEngine)
export interface MultiTickerPaperPosition {
  id: string;
  ticker: string;
  optionSymbol: string;
  type: 'CALL' | 'PUT';
  strike: number;
  expiration: Date;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  entryTimestamp: Date;
  exitTimestamp?: Date;
  exitPrice?: number;
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
  pnl: number;
  pnlPercent: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  confidence: number;
  expectedMove: number;
  signalId: string;
  
  // Enhanced Greeks tracking
  entryGreeks: OptionsGreeks;
  currentGreeks: OptionsGreeks;
  greeksHistory: GreeksSnapshot[];
  
  // Time decay tracking
  timeDecayHistory: TimeDecaySnapshot[];
  
  // Volatility impact tracking
  volatilityHistory: VolatilitySnapshot[];
}

export interface OptionsGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  impliedVolatility: number;
}

export interface GreeksSnapshot {
  timestamp: Date;
  underlyingPrice: number;
  greeks: OptionsGreeks;
  pnlContribution: GreeksPnLContribution;
}

export interface GreeksPnLContribution {
  deltaContribution: number;
  gammaContribution: number;
  thetaContribution: number;
  vegaContribution: number;
  rhoContribution: number;
  totalContribution: number;
}

export interface TimeDecaySnapshot {
  timestamp: Date;
  daysToExpiration: number;
  timeValue: number;
  intrinsicValue: number;
  thetaDecay: number;
  accelerationFactor: number;
}

export interface VolatilitySnapshot {
  timestamp: Date;
  impliedVolatility: number;
  historicalVolatility: number;
  volatilityRank: number;
  vegaImpact: number;
  volExpansion: boolean;
}

export interface MarketDataUpdate {
  ticker: string;
  underlyingPrice: number;
  optionsPrices: Map<string, number>;
  impliedVolatilities: Map<string, number>;
  timestamp: Date;
}/**
 * Com
prehensive PnL Tracking System for Gamma Adaptive Trading
 * 
 * Implements real-time PnL calculation with intrinsic value, time decay, and volatility changes.
 * Provides Greeks impact tracking and Maximum Favorable/Adverse Excursion analysis.
 */
export class ComprehensivePnLTracker extends EventEmitter {
  private pnlSnapshots: Map<string, RealTimePnLSnapshot[]> = new Map();
  private excursionAnalyses: Map<string, ExcursionAnalysis> = new Map();
  private attributionHistory: Map<string, PnLAttribution[]> = new Map();
  private portfolioHistory: PortfolioPnLSummary[] = [];
  
  // Configuration
  private readonly SNAPSHOT_RETENTION_HOURS = 24 * 7; // 7 days
  private readonly ATTRIBUTION_CONFIDENCE_THRESHOLD = 0.8;
  private readonly EXCURSION_UPDATE_INTERVAL = 60000; // 1 minute
  
  constructor() {
    super();
    this.setupPeriodicUpdates();
  }

  /**
   * Calculate real-time PnL with comprehensive breakdown
   * Implements real-time PnL calculation with intrinsic value, time decay, and volatility changes
   */
  public calculateRealTimePnL(
    position: MultiTickerPaperPosition,
    marketData: MarketDataUpdate,
    previousSnapshot?: RealTimePnLSnapshot
  ): RealTimePnLSnapshot {
    const timestamp = new Date();
    
    // Calculate core P&L components
    const totalPnL = position.pnl;
    const totalPnLPercent = position.pnlPercent;
    const intrinsicValue = this.calculateIntrinsicValue(position, marketData.underlyingPrice);
    const timeValue = Math.max(0, position.currentPrice - intrinsicValue);
    
    // Calculate Greeks impact breakdown
    const greeksImpact = this.calculateGreeksImpact(position, marketData, previousSnapshot);
    
    // Calculate volatility impact
    const volatilityImpact = this.calculateVolatilityImpact(position, marketData, previousSnapshot);
    
    // Calculate time decay impact
    const timeDecayImpact = this.calculateTimeDecayImpact(position, timestamp, previousSnapshot);
    
    // Calculate market movement impact
    const marketMovementImpact = this.calculateMarketMovementImpact(position, marketData, previousSnapshot);
    
    // Update excursion tracking
    const currentExcursion = totalPnL;
    const maxFavorableExcursion = Math.max(position.maxFavorableExcursion, currentExcursion);
    const maxAdverseExcursion = Math.min(position.maxAdverseExcursion, currentExcursion);
    
    // Calculate performance metrics
    const holdingPeriod = (timestamp.getTime() - position.entryTimestamp.getTime()) / (1000 * 60 * 60);
    const unrealizedPnL = position.status === 'OPEN' ? totalPnL : 0;
    const realizedPnL = position.status === 'CLOSED' ? totalPnL : 0;
    
    // Calculate risk metrics
    const riskAdjustedReturn = this.calculateRiskAdjustedReturn(position, totalPnL);
    const sharpeContribution = this.calculateSharpeContribution(position, totalPnL, holdingPeriod);
    const drawdownContribution = this.calculateDrawdownContribution(position, maxAdverseExcursion);
    
    const snapshot: RealTimePnLSnapshot = {
      timestamp,
      positionId: position.id,
      ticker: position.ticker,
      totalPnL,
      totalPnLPercent,
      intrinsicValue,
      timeValue,
      greeksImpact,
      volatilityImpact,
      timeDecayImpact,
      marketMovementImpact,
      maxFavorableExcursion,
      maxAdverseExcursion,
      currentExcursion,
      unrealizedPnL,
      realizedPnL,
      holdingPeriod,
      riskAdjustedReturn,
      sharpeContribution,
      drawdownContribution
    };
    
    // Store snapshot
    this.storeSnapshot(position.id, snapshot);
    
    // Update excursion analysis
    this.updateExcursionAnalysis(position, snapshot);
    
    // Emit real-time update
    this.emit('pnl:updated', snapshot);
    
    return snapshot;
  }

  /**
   * Calculate Greeks impact on P&L with detailed breakdown
   * Add Greeks impact tracking (Delta, Gamma, Theta, Vega) on position values
   */
  private calculateGreeksImpact(
    position: MultiTickerPaperPosition,
    marketData: MarketDataUpdate,
    previousSnapshot?: RealTimePnLSnapshot
  ): GreeksPnLBreakdown {
    const currentGreeks = position.currentGreeks;
    const multiplier = position.quantity * 100;
    
    // Get previous values for delta calculations
    const previousPrice = previousSnapshot ? 
      this.getPreviousUnderlyingPrice(position.id) : 
      marketData.underlyingPrice;
    
    const previousIV = previousSnapshot ?
      this.getPreviousImpliedVolatility(position.id) :
      currentGreeks.impliedVolatility;
    
    // Calculate individual Greek contributions
    const priceChange = marketData.underlyingPrice - previousPrice;
    const ivChange = currentGreeks.impliedVolatility - previousIV;
    const timeDecay = 1 / 365; // Daily time decay
    
    const deltaContribution = currentGreeks.delta * priceChange * multiplier;
    const gammaContribution = 0.5 * currentGreeks.gamma * Math.pow(priceChange, 2) * multiplier;
    const thetaContribution = currentGreeks.theta * timeDecay * multiplier;
    const vegaContribution = currentGreeks.vega * ivChange * multiplier;
    const rhoContribution = currentGreeks.rho * 0.0001 * multiplier; // Assume 1bp rate change
    
    const totalGreeksContribution = deltaContribution + gammaContribution + thetaContribution + vegaContribution + rhoContribution;
    
    // Calculate efficiency metrics
    const deltaEfficiency = this.calculateDeltaEfficiency(position, priceChange, deltaContribution);
    const gammaAcceleration = this.calculateGammaAcceleration(position, priceChange, gammaContribution);
    const thetaDecayRate = this.calculateThetaDecayRate(position, thetaContribution);
    const vegaVolatilityCapture = this.calculateVegaCapture(position, ivChange, vegaContribution);
    
    return {
      deltaContribution,
      gammaContribution,
      thetaContribution,
      vegaContribution,
      rhoContribution,
      totalGreeksContribution,
      deltaEfficiency,
      gammaAcceleration,
      thetaDecayRate,
      vegaVolatilityCapture
    };
  }

  /**
   * Calculate volatility impact on P&L
   */
  private calculateVolatilityImpact(
    position: MultiTickerPaperPosition,
    marketData: MarketDataUpdate,
    previousSnapshot?: RealTimePnLSnapshot
  ): VolatilityPnLImpact {
    const currentIV = marketData.impliedVolatilities.get(position.optionSymbol) || position.currentGreeks.impliedVolatility;
    const previousIV = previousSnapshot?.volatilityImpact.impliedVolatilityChange || currentIV;
    
    const impliedVolatilityChange = currentIV - previousIV;
    const vegaImpact = position.currentGreeks.vega * impliedVolatilityChange * position.quantity * 100;
    
    // Calculate volatility scenarios
    const volExpansionBenefit = position.currentGreeks.vega > 0 ? 
      position.currentGreeks.vega * 0.05 * position.quantity * 100 : 0; // 5% IV expansion
    
    const volContractionCost = position.currentGreeks.vega > 0 ? 
      position.currentGreeks.vega * -0.03 * position.quantity * 100 : 0; // 3% IV contraction
    
    // Calculate volatility rank and percentile (simplified)
    const volRank = Math.min(100, Math.max(0, currentIV * 100));
    const volPercentile = volRank;
    
    // Risk assessments
    const volCrushRisk = currentIV > 0.3 ? 0.8 : currentIV > 0.2 ? 0.5 : 0.2;
    const volExpansionOpportunity = currentIV < 0.15 ? 0.8 : currentIV < 0.25 ? 0.5 : 0.2;
    
    return {
      impliedVolatilityChange,
      vegaImpact,
      volExpansionBenefit,
      volContractionCost,
      volRank,
      volPercentile,
      volCrushRisk,
      volExpansionOpportunity
    };
  }

  /**
   * Calculate time decay impact on P&L
   */
  private calculateTimeDecayImpact(
    position: MultiTickerPaperPosition,
    timestamp: Date,
    previousSnapshot?: RealTimePnLSnapshot
  ): TimeDecayPnLImpact {
    const daysToExpiration = (position.expiration.getTime() - timestamp.getTime()) / (24 * 60 * 60 * 1000);
    const multiplier = position.quantity * 100;
    
    // Calculate theta decay
    const dailyThetaDecay = position.currentGreeks.theta * multiplier;
    const weeklyThetaDecay = dailyThetaDecay * 7;
    
    // Calculate acceleration factor (theta accelerates near expiration)
    const accelerationFactor = daysToExpiration < 30 ? 
      Math.exp(-(daysToExpiration / 10)) : 1;
    
    // Calculate time value remaining
    const intrinsicValue = this.calculateIntrinsicValue(position, 0); // Will be updated with actual price
    const timeValueRemaining = Math.max(0, position.currentPrice - intrinsicValue);
    
    // Calculate special decay scenarios
    const weekendDecay = this.isWeekend(timestamp) ? dailyThetaDecay * 2 : 0; // Weekend theta
    const holidayDecay = this.isHoliday(timestamp) ? dailyThetaDecay * 1.5 : 0; // Holiday theta
    const acceleratedDecay = daysToExpiration < 7 ? dailyThetaDecay * accelerationFactor : dailyThetaDecay;
    
    return {
      dailyThetaDecay,
      weeklyThetaDecay,
      accelerationFactor,
      timeValueRemaining,
      daysToExpiration,
      weekendDecay,
      holidayDecay,
      acceleratedDecay
    };
  }

  /**
   * Calculate market movement impact on P&L
   */
  private calculateMarketMovementImpact(
    position: MultiTickerPaperPosition,
    marketData: MarketDataUpdate,
    previousSnapshot?: RealTimePnLSnapshot
  ): MarketMovementPnLImpact {
    const previousPrice = previousSnapshot ? 
      this.getPreviousUnderlyingPrice(position.id) : 
      marketData.underlyingPrice;
    
    const underlyingPriceChange = marketData.underlyingPrice - previousPrice;
    const underlyingPriceChangePercent = (underlyingPriceChange / previousPrice) * 100;
    
    // Calculate delta and gamma adjusted moves
    const deltaAdjustedMove = position.currentGreeks.delta * underlyingPriceChange;
    const gammaAdjustedMove = 0.5 * position.currentGreeks.gamma * Math.pow(underlyingPriceChange, 2);
    
    // Calculate movement efficiency metrics
    const expectedPnL = (deltaAdjustedMove + gammaAdjustedMove) * position.quantity * 100;
    const actualPnL = position.pnl - (previousSnapshot?.totalPnL || 0);
    
    const moveCapture = expectedPnL !== 0 ? actualPnL / expectedPnL : 0;
    const moveEfficiency = Math.min(1, Math.max(0, moveCapture));
    
    // Calculate directional accuracy
    const expectedDirection = position.type === 'CALL' ? 1 : -1;
    const actualDirection = Math.sign(underlyingPriceChange);
    const directionalAccuracy = expectedDirection === actualDirection ? 1 : 0;
    
    return {
      underlyingPriceChange,
      underlyingPriceChangePercent,
      deltaAdjustedMove,
      gammaAdjustedMove,
      moveCapture,
      moveEfficiency,
      directionalAccuracy
    };
  }

  /**
   * Update Maximum Favorable/Adverse Excursion analysis
   * Create Maximum Favorable/Adverse Excursion tracking throughout position lifecycle
   */
  private updateExcursionAnalysis(position: MultiTickerPaperPosition, snapshot: RealTimePnLSnapshot): void {
    let analysis = this.excursionAnalyses.get(position.id);
    
    if (!analysis) {
      // Initialize new excursion analysis
      analysis = {
        positionId: position.id,
        mfeValue: snapshot.maxFavorableExcursion,
        mfePercent: (snapshot.maxFavorableExcursion / (position.entryPrice * position.quantity * 100)) * 100,
        mfeTimestamp: snapshot.timestamp,
        mfeHoldingPeriod: snapshot.holdingPeriod,
        maeValue: snapshot.maxAdverseExcursion,
        maePercent: (snapshot.maxAdverseExcursion / (position.entryPrice * position.quantity * 100)) * 100,
        maeTimestamp: snapshot.timestamp,
        maeHoldingPeriod: snapshot.holdingPeriod,
        excursionPattern: this.analyzeExcursionPattern(position.id),
        recoveryPattern: this.analyzeRecoveryPattern(position.id),
        riskRewardRatio: 0,
        efficiencyRatio: 0,
        drawdownRatio: 0
      };
    }
    
    // Update MFE if new high
    if (snapshot.currentExcursion > analysis.mfeValue) {
      analysis.mfeValue = snapshot.currentExcursion;
      analysis.mfePercent = (snapshot.currentExcursion / (position.entryPrice * position.quantity * 100)) * 100;
      analysis.mfeTimestamp = snapshot.timestamp;
      analysis.mfeHoldingPeriod = snapshot.holdingPeriod;
    }
    
    // Update MAE if new low
    if (snapshot.currentExcursion < analysis.maeValue) {
      analysis.maeValue = snapshot.currentExcursion;
      analysis.maePercent = (snapshot.currentExcursion / (position.entryPrice * position.quantity * 100)) * 100;
      analysis.maeTimestamp = snapshot.timestamp;
      analysis.maeHoldingPeriod = snapshot.holdingPeriod;
    }
    
    // Update patterns
    analysis.excursionPattern = this.analyzeExcursionPattern(position.id);
    analysis.recoveryPattern = this.analyzeRecoveryPattern(position.id);
    
    // Calculate ratios
    const entryValue = position.entryPrice * position.quantity * 100;
    analysis.riskRewardRatio = analysis.maeValue !== 0 ? Math.abs(analysis.mfeValue / analysis.maeValue) : 0;
    analysis.efficiencyRatio = analysis.mfeValue !== 0 ? snapshot.totalPnL / analysis.mfeValue : 0;
    analysis.drawdownRatio = Math.abs(analysis.maeValue) / entryValue;
    
    this.excursionAnalyses.set(position.id, analysis);
    
    // Emit excursion update
    this.emit('excursion:updated', analysis);
  }

  /**
   * Generate comprehensive P&L attribution analysis
   */
  public generatePnLAttribution(position: MultiTickerPaperPosition, snapshot: RealTimePnLSnapshot): PnLAttribution {
    const totalPnL = snapshot.totalPnL;
    
    // Calculate attribution by source
    const priceMovementAttribution = snapshot.greeksImpact.deltaContribution + snapshot.greeksImpact.gammaContribution;
    const timeDecayAttribution = snapshot.greeksImpact.thetaContribution;
    const volatilityAttribution = snapshot.greeksImpact.vegaContribution;
    const interestRateAttribution = snapshot.greeksImpact.rhoContribution;
    
    // Calculate residual (unexplained P&L)
    const explainedPnL = priceMovementAttribution + timeDecayAttribution + volatilityAttribution + interestRateAttribution;
    const residualAttribution = totalPnL - explainedPnL;
    
    // Calculate attribution percentages
    const attributionBreakdown = {
      priceMovement: totalPnL !== 0 ? (priceMovementAttribution / totalPnL) * 100 : 0,
      timeDecay: totalPnL !== 0 ? (timeDecayAttribution / totalPnL) * 100 : 0,
      volatility: totalPnL !== 0 ? (volatilityAttribution / totalPnL) * 100 : 0,
      interestRate: totalPnL !== 0 ? (interestRateAttribution / totalPnL) * 100 : 0,
      residual: totalPnL !== 0 ? (residualAttribution / totalPnL) * 100 : 0
    };
    
    // Calculate attribution confidence and quality
    const residualPercent = Math.abs(attributionBreakdown.residual);
    const attributionConfidence = Math.max(0, 1 - (residualPercent / 100));
    
    let attributionQuality: 'HIGH' | 'MEDIUM' | 'LOW';
    if (attributionConfidence >= 0.9) attributionQuality = 'HIGH';
    else if (attributionConfidence >= 0.7) attributionQuality = 'MEDIUM';
    else attributionQuality = 'LOW';
    
    const attribution: PnLAttribution = {
      positionId: position.id,
      totalPnL,
      priceMovementAttribution,
      timeDecayAttribution,
      volatilityAttribution,
      interestRateAttribution,
      residualAttribution,
      attributionBreakdown,
      attributionConfidence,
      attributionQuality
    };
    
    // Store attribution
    this.storeAttribution(position.id, attribution);
    
    return attribution;
  }

  /**
   * Generate portfolio-level P&L summary
   */
  public generatePortfolioPnLSummary(positions: MultiTickerPaperPosition[]): PortfolioPnLSummary {
    const timestamp = new Date();
    
    // Calculate total portfolio metrics
    let totalUnrealizedPnL = 0;
    let totalRealizedPnL = 0;
    
    for (const position of positions) {
      if (position.status === 'OPEN') {
        totalUnrealizedPnL += position.pnl;
      } else {
        totalRealizedPnL += position.pnl;
      }
    }
    
    const totalPnL = totalUnrealizedPnL + totalRealizedPnL;
    const totalPnLPercent = 0; // Would need initial portfolio value
    
    // Group by ticker
    const tickerGroups = new Map<string, MultiTickerPaperPosition[]>();
    for (const position of positions) {
      if (!tickerGroups.has(position.ticker)) {
        tickerGroups.set(position.ticker, []);
      }
      tickerGroups.get(position.ticker)!.push(position);
    }
    
    // Calculate ticker summaries
    const tickerPnL = new Map<string, TickerPnLSummary>();
    for (const [ticker, tickerPositions] of tickerGroups) {
      const summary = this.calculateTickerSummary(ticker, tickerPositions);
      tickerPnL.set(ticker, summary);
    }
    
    // Calculate portfolio Greeks impact
    const portfolioGreeksImpact = this.calculatePortfolioGreeksImpact(positions);
    
    // Calculate risk metrics (simplified)
    const portfolioVaR = this.calculatePortfolioVaR(positions);
    const portfolioSharpe = this.calculatePortfolioSharpe(positions);
    const portfolioDrawdown = this.calculatePortfolioDrawdown(positions);
    
    // Find best/worst performers
    const tickerPnLArray = Array.from(tickerPnL.values());
    const bestPerformer = tickerPnLArray.reduce((best, current) => 
      current.totalPnL > best.totalPnL ? current : best, tickerPnLArray[0])?.ticker || '';
    
    const worstPerformer = tickerPnLArray.reduce((worst, current) => 
      current.totalPnL < worst.totalPnL ? current : worst, tickerPnLArray[0])?.ticker || '';
    
    const topContributor = bestPerformer;
    const topDetractor = worstPerformer;
    
    const summary: PortfolioPnLSummary = {
      timestamp,
      totalUnrealizedPnL,
      totalRealizedPnL,
      totalPnL,
      totalPnLPercent,
      tickerPnL,
      portfolioGreeksImpact,
      portfolioVaR,
      portfolioSharpe,
      portfolioDrawdown,
      bestPerformer,
      worstPerformer,
      topContributor,
      topDetractor
    };
    
    // Store portfolio summary
    this.portfolioHistory.push(summary);
    
    // Emit portfolio update
    this.emit('portfolio:summary', summary);
    
    return summary;
  }

  /**
   * Get P&L snapshots for a position
   */
  public getPnLSnapshots(positionId: string): RealTimePnLSnapshot[] {
    return this.pnlSnapshots.get(positionId) || [];
  }

  /**
   * Get excursion analysis for a position
   */
  public getExcursionAnalysis(positionId: string): ExcursionAnalysis | undefined {
    return this.excursionAnalyses.get(positionId);
  }

  /**
   * Get P&L attribution history for a position
   */
  public getAttributionHistory(positionId: string): PnLAttribution[] {
    return this.attributionHistory.get(positionId) || [];
  }

  /**
   * Get portfolio P&L history
   */
  public getPortfolioHistory(): PortfolioPnLSummary[] {
    return [...this.portfolioHistory];
  }  // ==
==========================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate intrinsic value of option
   */
  private calculateIntrinsicValue(position: MultiTickerPaperPosition, underlyingPrice: number): number {
    if (position.type === 'CALL') {
      return Math.max(0, underlyingPrice - position.strike);
    } else {
      return Math.max(0, position.strike - underlyingPrice);
    }
  }

  /**
   * Store P&L snapshot with retention management
   */
  private storeSnapshot(positionId: string, snapshot: RealTimePnLSnapshot): void {
    if (!this.pnlSnapshots.has(positionId)) {
      this.pnlSnapshots.set(positionId, []);
    }
    
    const snapshots = this.pnlSnapshots.get(positionId)!;
    snapshots.push(snapshot);
    
    // Clean up old snapshots (keep last 7 days)
    const cutoffTime = Date.now() - (this.SNAPSHOT_RETENTION_HOURS * 60 * 60 * 1000);
    const filteredSnapshots = snapshots.filter(s => s.timestamp.getTime() > cutoffTime);
    this.pnlSnapshots.set(positionId, filteredSnapshots);
  }

  /**
   * Store P&L attribution
   */
  private storeAttribution(positionId: string, attribution: PnLAttribution): void {
    if (!this.attributionHistory.has(positionId)) {
      this.attributionHistory.set(positionId, []);
    }
    
    this.attributionHistory.get(positionId)!.push(attribution);
  }

  /**
   * Get previous underlying price for calculations
   */
  private getPreviousUnderlyingPrice(positionId: string): number {
    const snapshots = this.pnlSnapshots.get(positionId) || [];
    if (snapshots.length < 2) return 0;
    
    // Get from market movement impact of previous snapshot
    const previousSnapshot = snapshots[snapshots.length - 2];
    return previousSnapshot.marketMovementImpact.underlyingPriceChange || 0;
  }

  /**
   * Get previous implied volatility for calculations
   */
  private getPreviousImpliedVolatility(positionId: string): number {
    const snapshots = this.pnlSnapshots.get(positionId) || [];
    if (snapshots.length < 2) return 0.2; // Default IV
    
    const previousSnapshot = snapshots[snapshots.length - 2];
    return previousSnapshot.volatilityImpact.impliedVolatilityChange || 0.2;
  }

  /**
   * Calculate delta efficiency
   */
  private calculateDeltaEfficiency(position: MultiTickerPaperPosition, priceChange: number, deltaContribution: number): number {
    if (priceChange === 0) return 1;
    
    const expectedContribution = position.currentGreeks.delta * priceChange * position.quantity * 100;
    return expectedContribution !== 0 ? deltaContribution / expectedContribution : 1;
  }

  /**
   * Calculate gamma acceleration effect
   */
  private calculateGammaAcceleration(position: MultiTickerPaperPosition, priceChange: number, gammaContribution: number): number {
    const gammaEffect = 0.5 * position.currentGreeks.gamma * Math.pow(priceChange, 2) * position.quantity * 100;
    return Math.abs(gammaEffect);
  }

  /**
   * Calculate theta decay rate
   */
  private calculateThetaDecayRate(position: MultiTickerPaperPosition, thetaContribution: number): number {
    const expectedTheta = position.currentGreeks.theta * (1/365) * position.quantity * 100;
    return Math.abs(thetaContribution / expectedTheta) || 1;
  }

  /**
   * Calculate vega volatility capture
   */
  private calculateVegaCapture(position: MultiTickerPaperPosition, ivChange: number, vegaContribution: number): number {
    if (ivChange === 0) return 1;
    
    const expectedVega = position.currentGreeks.vega * ivChange * position.quantity * 100;
    return expectedVega !== 0 ? vegaContribution / expectedVega : 1;
  }

  /**
   * Calculate risk-adjusted return
   */
  private calculateRiskAdjustedReturn(position: MultiTickerPaperPosition, totalPnL: number): number {
    const riskAmount = position.entryPrice * position.quantity * 100;
    return riskAmount !== 0 ? totalPnL / riskAmount : 0;
  }

  /**
   * Calculate Sharpe contribution
   */
  private calculateSharpeContribution(position: MultiTickerPaperPosition, totalPnL: number, holdingPeriod: number): number {
    if (holdingPeriod === 0) return 0;
    
    const annualizedReturn = (totalPnL / (position.entryPrice * position.quantity * 100)) * (8760 / holdingPeriod); // 8760 hours in year
    const riskFreeRate = 0.02; // 2% risk-free rate
    
    // Simplified Sharpe calculation (would need volatility for proper calculation)
    return annualizedReturn - riskFreeRate;
  }

  /**
   * Calculate drawdown contribution
   */
  private calculateDrawdownContribution(position: MultiTickerPaperPosition, maxAdverseExcursion: number): number {
    const entryValue = position.entryPrice * position.quantity * 100;
    return entryValue !== 0 ? Math.abs(maxAdverseExcursion) / entryValue : 0;
  }

  /**
   * Analyze excursion pattern
   */
  private analyzeExcursionPattern(positionId: string): ExcursionPattern {
    const snapshots = this.pnlSnapshots.get(positionId) || [];
    
    if (snapshots.length < 3) {
      return {
        type: 'IMMEDIATE_PROFIT',
        volatility: 0,
        trendDirection: 'SIDEWAYS',
        momentum: 0
      };
    }
    
    // Analyze P&L progression
    const pnlValues = snapshots.map(s => s.totalPnL);
    const firstPnL = pnlValues[0];
    const lastPnL = pnlValues[pnlValues.length - 1];
    const maxPnL = Math.max(...pnlValues);
    const minPnL = Math.min(...pnlValues);
    
    // Determine pattern type
    let type: ExcursionPattern['type'];
    if (lastPnL > firstPnL && maxPnL === lastPnL) {
      type = 'IMMEDIATE_PROFIT';
    } else if (lastPnL > firstPnL && maxPnL > lastPnL) {
      type = 'DELAYED_PROFIT';
    } else if (maxPnL > firstPnL && lastPnL < maxPnL && lastPnL > minPnL) {
      type = 'VOLATILE';
    } else if (lastPnL < firstPnL && minPnL === lastPnL) {
      type = 'STEADY_DECLINE';
    } else {
      type = 'RECOVERY';
    }
    
    // Calculate volatility
    const pnlMean = pnlValues.reduce((sum, val) => sum + val, 0) / pnlValues.length;
    const variance = pnlValues.reduce((sum, val) => sum + Math.pow(val - pnlMean, 2), 0) / pnlValues.length;
    const volatility = Math.sqrt(variance);
    
    // Determine trend direction
    let trendDirection: 'UP' | 'DOWN' | 'SIDEWAYS';
    if (lastPnL > firstPnL * 1.05) trendDirection = 'UP';
    else if (lastPnL < firstPnL * 0.95) trendDirection = 'DOWN';
    else trendDirection = 'SIDEWAYS';
    
    // Calculate momentum
    const recentPnL = pnlValues.slice(-3);
    const momentum = recentPnL.length > 1 ? 
      (recentPnL[recentPnL.length - 1] - recentPnL[0]) / recentPnL[0] : 0;
    
    return {
      type,
      volatility,
      trendDirection,
      momentum
    };
  }

  /**
   * Analyze recovery pattern
   */
  private analyzeRecoveryPattern(positionId: string): RecoveryPattern {
    const snapshots = this.pnlSnapshots.get(positionId) || [];
    
    if (snapshots.length < 3) {
      return {
        hasRecovered: false,
        recoveryTime: 0,
        recoveryStrength: 0,
        partialRecovery: false
      };
    }
    
    const pnlValues = snapshots.map(s => s.totalPnL);
    const minPnL = Math.min(...pnlValues);
    const minIndex = pnlValues.indexOf(minPnL);
    const currentPnL = pnlValues[pnlValues.length - 1];
    
    // Check if recovered from minimum
    const hasRecovered = currentPnL > minPnL * 0.5; // 50% recovery threshold
    const partialRecovery = currentPnL > minPnL && currentPnL < 0;
    
    // Calculate recovery time
    const recoveryTime = hasRecovered ? 
      (snapshots[snapshots.length - 1].timestamp.getTime() - snapshots[minIndex].timestamp.getTime()) / (1000 * 60 * 60) : 0;
    
    // Calculate recovery strength
    const recoveryStrength = minPnL !== 0 ? Math.min(1, Math.max(0, (currentPnL - minPnL) / Math.abs(minPnL))) : 0;
    
    return {
      hasRecovered,
      recoveryTime,
      recoveryStrength,
      partialRecovery
    };
  }

  /**
   * Calculate ticker summary
   */
  private calculateTickerSummary(ticker: string, positions: MultiTickerPaperPosition[]): TickerPnLSummary {
    const openPositions = positions.filter(p => p.status === 'OPEN');
    const closedPositions = positions.filter(p => p.status === 'CLOSED');
    
    const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
    const unrealizedPnL = openPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    const realizedPnL = closedPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    
    // Calculate performance metrics
    const winningTrades = closedPositions.filter(p => p.pnl > 0);
    const winRate = closedPositions.length > 0 ? (winningTrades.length / closedPositions.length) * 100 : 0;
    
    const totalWins = winningTrades.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalLosses = Math.abs(closedPositions.filter(p => p.pnl < 0).reduce((sum, pos) => sum + pos.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    
    // Calculate Sharpe ratio (simplified)
    const returns = closedPositions.map(p => p.pnlPercent / 100);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const returnStdDev = returns.length > 1 ? 
      Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length) : 0;
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    
    // Calculate max drawdown (simplified)
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;
    
    for (const position of closedPositions) {
      runningPnL += position.pnl;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    // Calculate Greeks contribution (simplified)
    const greeksContribution: GreeksPnLBreakdown = {
      deltaContribution: 0,
      gammaContribution: 0,
      thetaContribution: 0,
      vegaContribution: 0,
      rhoContribution: 0,
      totalGreeksContribution: 0,
      deltaEfficiency: 0,
      gammaAcceleration: 0,
      thetaDecayRate: 0,
      vegaVolatilityCapture: 0
    };
    
    return {
      ticker,
      positionCount: positions.length,
      totalPnL,
      totalPnLPercent: 0, // Would need initial value
      unrealizedPnL,
      realizedPnL,
      winRate,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      greeksContribution,
      concentration: positions.length / 10, // Simplified
      correlation: 0.5, // Simplified
      volatility: returnStdDev
    };
  }

  /**
   * Calculate portfolio Greeks impact
   */
  private calculatePortfolioGreeksImpact(positions: MultiTickerPaperPosition[]): GreeksPnLBreakdown {
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;
    let totalRho = 0;
    
    for (const position of positions) {
      if (position.status === 'OPEN') {
        const multiplier = position.quantity * 100;
        totalDelta += position.currentGreeks.delta * multiplier;
        totalGamma += position.currentGreeks.gamma * multiplier;
        totalTheta += position.currentGreeks.theta * multiplier;
        totalVega += position.currentGreeks.vega * multiplier;
        totalRho += position.currentGreeks.rho * multiplier;
      }
    }
    
    return {
      deltaContribution: totalDelta,
      gammaContribution: totalGamma,
      thetaContribution: totalTheta,
      vegaContribution: totalVega,
      rhoContribution: totalRho,
      totalGreeksContribution: totalDelta + totalGamma + totalTheta + totalVega + totalRho,
      deltaEfficiency: 1,
      gammaAcceleration: Math.abs(totalGamma),
      thetaDecayRate: Math.abs(totalTheta),
      vegaVolatilityCapture: Math.abs(totalVega)
    };
  }

  /**
   * Calculate portfolio VaR (simplified)
   */
  private calculatePortfolioVaR(positions: MultiTickerPaperPosition[]): number {
    const portfolioValue = positions.reduce((sum, pos) => 
      sum + (pos.currentPrice * pos.quantity * 100), 0);
    
    // Simplified VaR calculation (2% daily volatility, 95% confidence)
    return portfolioValue * 0.02 * 1.645;
  }

  /**
   * Calculate portfolio Sharpe ratio
   */
  private calculatePortfolioSharpe(positions: MultiTickerPaperPosition[]): number {
    const closedPositions = positions.filter(p => p.status === 'CLOSED');
    if (closedPositions.length === 0) return 0;
    
    const returns = closedPositions.map(p => p.pnlPercent / 100);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    
    return returnStdDev > 0 ? avgReturn / returnStdDev : 0;
  }

  /**
   * Calculate portfolio drawdown
   */
  private calculatePortfolioDrawdown(positions: MultiTickerPaperPosition[]): number {
    const closedPositions = positions.filter(p => p.status === 'CLOSED');
    if (closedPositions.length === 0) return 0;
    
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;
    
    for (const position of closedPositions) {
      runningPnL += position.pnl;
      if (runningPnL > peak) peak = runningPnL;
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown;
  }

  /**
   * Check if timestamp is weekend
   */
  private isWeekend(timestamp: Date): boolean {
    const day = timestamp.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  /**
   * Check if timestamp is holiday (simplified)
   */
  private isHoliday(timestamp: Date): boolean {
    // Simplified holiday check - would need proper holiday calendar
    const month = timestamp.getMonth();
    const date = timestamp.getDate();
    
    // Major US holidays
    return (month === 0 && date === 1) || // New Year's Day
           (month === 6 && date === 4) || // Independence Day
           (month === 11 && date === 25); // Christmas Day
  }

  /**
   * Setup periodic updates for excursion analysis
   */
  private setupPeriodicUpdates(): void {
    setInterval(() => {
      // Clean up old data
      this.cleanupOldData();
      
      // Emit periodic summary
      this.emit('periodic:cleanup', {
        snapshotCount: this.pnlSnapshots.size,
        excursionCount: this.excursionAnalyses.size,
        attributionCount: this.attributionHistory.size
      });
    }, this.EXCURSION_UPDATE_INTERVAL);
  }

  /**
   * Clean up old data to prevent memory leaks
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.SNAPSHOT_RETENTION_HOURS * 60 * 60 * 1000);
    
    // Clean up old snapshots
    for (const [positionId, snapshots] of this.pnlSnapshots) {
      const filteredSnapshots = snapshots.filter(s => s.timestamp.getTime() > cutoffTime);
      if (filteredSnapshots.length === 0) {
        this.pnlSnapshots.delete(positionId);
      } else {
        this.pnlSnapshots.set(positionId, filteredSnapshots);
      }
    }
    
    // Clean up old portfolio history (keep last 30 days)
    const portfolioCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    this.portfolioHistory = this.portfolioHistory.filter(p => p.timestamp.getTime() > portfolioCutoff);
  }

  /**
   * Get comprehensive P&L statistics
   */
  public getPnLStatistics(): {
    totalSnapshots: number;
    totalExcursions: number;
    totalAttributions: number;
    portfolioHistoryLength: number;
    oldestSnapshot: Date | null;
    newestSnapshot: Date | null;
  } {
    let totalSnapshots = 0;
    let oldestSnapshot: Date | null = null;
    let newestSnapshot: Date | null = null;
    
    for (const snapshots of this.pnlSnapshots.values()) {
      totalSnapshots += snapshots.length;
      
      for (const snapshot of snapshots) {
        if (!oldestSnapshot || snapshot.timestamp < oldestSnapshot) {
          oldestSnapshot = snapshot.timestamp;
        }
        if (!newestSnapshot || snapshot.timestamp > newestSnapshot) {
          newestSnapshot = snapshot.timestamp;
        }
      }
    }
    
    let totalAttributions = 0;
    for (const attributions of this.attributionHistory.values()) {
      totalAttributions += attributions.length;
    }
    
    return {
      totalSnapshots,
      totalExcursions: this.excursionAnalyses.size,
      totalAttributions,
      portfolioHistoryLength: this.portfolioHistory.length,
      oldestSnapshot,
      newestSnapshot
    };
  }
}