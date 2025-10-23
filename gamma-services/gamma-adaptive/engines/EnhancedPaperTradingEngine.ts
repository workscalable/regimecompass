import { EventEmitter } from 'events';

// Core Interfaces for Enhanced Paper Trading
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
  exitReason?: ExitReason;
  
  // Enhanced Greeks tracking
  entryGreeks: OptionsGreeks;
  currentGreeks: OptionsGreeks;
  greeksHistory: GreeksSnapshot[];
  
  // Execution simulation
  executionDetails: ExecutionDetails;
  
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

export interface ExecutionDetails {
  requestedPrice: number;
  executedPrice: number;
  bidAskSpread: number;
  slippage: number;
  marketImpact: number;
  executionTime: number; // milliseconds
  liquidityScore: number;
  executionQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
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

export interface MultiTickerAccount {
  accountId: string;
  initialBalance: number;
  currentBalance: number;
  availableBalance: number;
  totalPnL: number;
  totalPnLPercent: number;
  portfolioHeat: number;
  maxDrawdown: number;
  positionsByTicker: Map<string, MultiTickerPaperPosition[]>;
  riskMetrics: RiskMetrics;
  performanceMetrics: EnhancedPerformanceMetrics;
}

export interface RiskMetrics {
  portfolioHeat: number;
  maxPositionSize: number;
  correlationRisk: number;
  concentrationRisk: number;
  greeksExposure: PortfolioGreeks;
  varEstimate: number; // Value at Risk
  expectedShortfall: number;
}

export interface PortfolioGreeks {
  totalDelta: number;
  totalGamma: number;
  totalTheta: number;
  totalVega: number;
  totalRho: number;
  netExposure: number;
}

export interface EnhancedPerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  averageWin: number;
  averageLoss: number;
  averageHoldingPeriod: number;
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  
  // Greeks performance
  deltaEfficiency: number;
  thetaCapture: number;
  vegaPerformance: number;
  
  // Execution performance
  averageSlippage: number;
  executionQuality: number;
  
  // By ticker breakdown
  tickerPerformance: Map<string, TickerPerformance>;
}

export interface TickerPerformance {
  ticker: string;
  trades: number;
  winRate: number;
  totalPnL: number;
  averageHoldingPeriod: number;
  bestTrade: number;
  worstTrade: number;
  sharpeRatio: number;
}

export interface PaperTradeRequest {
  ticker: string;
  recommendation: OptionsRecommendation;
  confidence: number;
  expectedMove: number;
  positionSize: number;
  signalId: string;
  fibAnalysis?: FibonacciAnalysis;
}

export interface OptionsRecommendation {
  symbol: string;
  strike: number;
  expiration: Date;
  type: 'CALL' | 'PUT';
  entryPrice: number;
  greeks: OptionsGreeks;
  liquidity: LiquidityMetrics;
  riskReward: RiskReward;
}

export interface LiquidityMetrics {
  bidAskSpread: number;
  volume: number;
  openInterest: number;
  liquidityScore: number;
  liquidityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

export interface RiskReward {
  maxRisk: number;
  maxReward: number;
  breakeven: number;
  profitProbability: number;
  riskRewardRatio: number;
}

export interface FibonacciAnalysis {
  currentZone: string;
  zoneMultiplier: number;
  keyLevels: Array<{ level: number; type: string; strength: number }>;
}

export type ExitReason = 
  | 'PROFIT_TARGET' 
  | 'STOP_LOSS' 
  | 'TIME_DECAY' 
  | 'EXPIRATION' 
  | 'RISK_MANAGEMENT' 
  | 'MANUAL'
  | 'PORTFOLIO_HEAT'
  | 'CORRELATION_LIMIT';

export interface MarketDataUpdate {
  ticker: string;
  underlyingPrice: number;
  optionsPrices: Map<string, number>;
  impliedVolatilities: Map<string, number>;
  timestamp: Date;
}

/**
 * Enhanced Paper Trading Engine for Gamma Adaptive System
 * 
 * Implements multi-ticker paper trading with realistic execution simulation,
 * comprehensive Greeks tracking, and advanced performance analytics.
 */
export class EnhancedPaperTradingEngine extends EventEmitter {
  private account: MultiTickerAccount;
  private positions: Map<string, MultiTickerPaperPosition> = new Map();
  private closedPositions: MultiTickerPaperPosition[] = [];
  private marketData: Map<string, MarketDataUpdate> = new Map();
  
  // Configuration
  private readonly MAX_PORTFOLIO_HEAT = 0.20; // 20% max portfolio heat
  private readonly MAX_POSITION_SIZE = 0.05; // 5% max per position
  private readonly MAX_TICKER_CONCENTRATION = 0.30; // 30% max per ticker
  private readonly SLIPPAGE_MODEL = {
    excellent: 0.001, // 0.1% slippage for excellent liquidity
    good: 0.002,      // 0.2% slippage for good liquidity
    fair: 0.005,      // 0.5% slippage for fair liquidity
    poor: 0.010       // 1.0% slippage for poor liquidity
  };

  constructor(accountId: string, initialBalance: number = 100000) {
    super();
    
    this.account = {
      accountId,
      initialBalance,
      currentBalance: initialBalance,
      availableBalance: initialBalance,
      totalPnL: 0,
      totalPnLPercent: 0,
      portfolioHeat: 0,
      maxDrawdown: 0,
      positionsByTicker: new Map(),
      riskMetrics: this.initializeRiskMetrics(),
      performanceMetrics: this.initializePerformanceMetrics()
    };
    
    this.setupEventHandlers();
  }

  /**
   * Execute a paper trade with realistic simulation
   * Implements multi-ticker paper trading with concurrent position management
   */
  public async executePaperTrade(request: PaperTradeRequest): Promise<string> {
    try {
      // 1. Validate trade request
      this.validateTradeRequest(request);
      
      // 2. Check risk limits
      const riskValidation = this.validateRiskLimits(request);
      if (!riskValidation.approved) {
        throw new Error(`Trade rejected: ${riskValidation.reason}`);
      }
      
      // 3. Simulate realistic execution
      const executionDetails = this.simulateExecution(request.recommendation);
      
      // 4. Create position
      const position = this.createPosition(request, executionDetails);
      
      // 5. Update account and tracking
      this.updateAccountForNewPosition(position);
      
      // 6. Store position
      this.positions.set(position.id, position);
      this.addPositionToTicker(position);
      
      // 7. Emit events
      this.emit('trade:executed', {
        positionId: position.id,
        ticker: position.ticker,
        executionDetails,
        accountBalance: this.account.currentBalance
      });
      
      console.log(`📄 Enhanced paper trade executed: ${position.ticker} ${position.type} ${position.quantity} @ ${position.entryPrice}`);
      return position.id;
      
    } catch (error) {
      console.error('Enhanced paper trade execution failed:', error);
      this.emit('trade:failed', { request, error: error.message });
      throw error;
    }
  }

  /**
   * Update positions with real-time market data and Greeks
   * Create position tracking with real-time Greeks updates and time decay
   */
  public updatePositions(marketUpdate: MarketDataUpdate): void {
    this.marketData.set(marketUpdate.ticker, marketUpdate);
    
    // Update all positions for this ticker
    const tickerPositions = this.account.positionsByTicker.get(marketUpdate.ticker) || [];
    
    for (const position of tickerPositions) {
      if (position.status === 'OPEN') {
        this.updateSinglePosition(position, marketUpdate);
      }
    }
    
    // Update portfolio-level metrics
    this.updatePortfolioMetrics();
    
    // Check for exit conditions
    this.checkExitConditions(marketUpdate.ticker);
    
    // Emit portfolio update
    this.emit('portfolio:updated', {
      ticker: marketUpdate.ticker,
      portfolioValue: this.account.currentBalance,
      portfolioHeat: this.account.portfolioHeat,
      timestamp: marketUpdate.timestamp
    });
  }

  /**
   * Update individual position with Greeks and time decay tracking
   */
  private updateSinglePosition(position: MultiTickerPaperPosition, marketUpdate: MarketDataUpdate): void {
    const optionPrice = marketUpdate.optionsPrices.get(position.optionSymbol);
    const impliedVol = marketUpdate.impliedVolatilities.get(position.optionSymbol);
    
    if (!optionPrice) return;
    
    // Update current price and P&L
    const previousPrice = position.currentPrice;
    position.currentPrice = optionPrice;
    
    const pnl = (optionPrice - position.entryPrice) * position.quantity * 100;
    const pnlPercent = ((optionPrice - position.entryPrice) / position.entryPrice) * 100;
    
    position.pnl = pnl;
    position.pnlPercent = pnlPercent;
    
    // Update MFE/MAE
    if (pnl > position.maxFavorableExcursion) {
      position.maxFavorableExcursion = pnl;
    }
    if (pnl < position.maxAdverseExcursion) {
      position.maxAdverseExcursion = pnl;
    }
    
    // Calculate current Greeks
    const currentGreeks = this.calculateCurrentGreeks(
      position,
      marketUpdate.underlyingPrice,
      impliedVol || position.currentGreeks.impliedVolatility
    );
    
    // Calculate Greeks P&L contribution
    const greeksPnL = this.calculateGreeksPnLContribution(
      position,
      marketUpdate.underlyingPrice,
      previousPrice,
      optionPrice
    );
    
    // Update Greeks history
    const greeksSnapshot: GreeksSnapshot = {
      timestamp: marketUpdate.timestamp,
      underlyingPrice: marketUpdate.underlyingPrice,
      greeks: currentGreeks,
      pnlContribution: greeksPnL
    };
    
    position.currentGreeks = currentGreeks;
    position.greeksHistory.push(greeksSnapshot);
    
    // Update time decay tracking
    this.updateTimeDecayTracking(position, marketUpdate.timestamp);
    
    // Update volatility tracking
    if (impliedVol) {
      this.updateVolatilityTracking(position, impliedVol, marketUpdate.timestamp);
    }
    
    // Emit position update
    this.emit('position:updated', {
      positionId: position.id,
      ticker: position.ticker,
      pnl,
      pnlPercent,
      greeksSnapshot,
      timestamp: marketUpdate.timestamp
    });
  }

  /**
   * Calculate current Greeks based on market conditions
   */
  private calculateCurrentGreeks(
    position: MultiTickerPaperPosition,
    underlyingPrice: number,
    impliedVol: number
  ): OptionsGreeks {
    // Simplified Greeks calculation (in production, use proper Black-Scholes)
    const timeToExpiry = (position.expiration.getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000);
    const moneyness = underlyingPrice / position.strike;
    
    // Mock Greeks calculation based on moneyness and time
    const isCall = position.type === 'CALL';
    
    let delta: number;
    if (isCall) {
      delta = moneyness > 1 ? 0.6 + (moneyness - 1) * 0.3 : 0.3 + (moneyness - 0.8) * 1.5;
      delta = Math.max(0.05, Math.min(0.95, delta));
    } else {
      delta = moneyness < 1 ? -0.6 - (1 - moneyness) * 0.3 : -0.3 - (moneyness - 1) * 1.5;
      delta = Math.max(-0.95, Math.min(-0.05, delta));
    }
    
    const gamma = 0.01 * Math.exp(-Math.pow(Math.log(moneyness), 2) / 0.1) * Math.sqrt(timeToExpiry);
    const theta = -0.02 * impliedVol * Math.sqrt(timeToExpiry) / Math.sqrt(365);
    const vega = 0.1 * Math.sqrt(timeToExpiry) * underlyingPrice / 100;
    const rho = isCall ? 0.01 * timeToExpiry : -0.01 * timeToExpiry;
    
    return {
      delta,
      gamma,
      theta,
      vega,
      rho,
      impliedVolatility: impliedVol
    };
  }

  /**
   * Calculate Greeks contribution to P&L
   */
  private calculateGreeksPnLContribution(
    position: MultiTickerPaperPosition,
    underlyingPrice: number,
    previousOptionPrice: number,
    currentOptionPrice: number
  ): GreeksPnLContribution {
    const priceChange = currentOptionPrice - previousOptionPrice;
    const underlyingChange = underlyingPrice - (position.greeksHistory.length > 0 ? 
      position.greeksHistory[position.greeksHistory.length - 1].underlyingPrice : underlyingPrice);
    
    const greeks = position.currentGreeks;
    
    // Calculate individual Greek contributions
    const deltaContribution = greeks.delta * underlyingChange * position.quantity * 100;
    const gammaContribution = 0.5 * greeks.gamma * Math.pow(underlyingChange, 2) * position.quantity * 100;
    const thetaContribution = greeks.theta * (1/365) * position.quantity * 100; // Daily theta decay
    const vegaContribution = 0; // Would need IV change data
    const rhoContribution = 0; // Would need interest rate change data
    
    const totalContribution = deltaContribution + gammaContribution + thetaContribution + vegaContribution + rhoContribution;
    
    return {
      deltaContribution,
      gammaContribution,
      thetaContribution,
      vegaContribution,
      rhoContribution,
      totalContribution
    };
  }

  /**
   * Update time decay tracking for position
   */
  private updateTimeDecayTracking(position: MultiTickerPaperPosition, timestamp: Date): void {
    const daysToExpiration = (position.expiration.getTime() - timestamp.getTime()) / (24 * 60 * 60 * 1000);
    const timeValue = Math.max(0, position.currentPrice - this.calculateIntrinsicValue(position));
    const intrinsicValue = this.calculateIntrinsicValue(position);
    
    // Calculate theta decay since last update
    const lastSnapshot = position.timeDecayHistory[position.timeDecayHistory.length - 1];
    const thetaDecay = lastSnapshot ? timeValue - lastSnapshot.timeValue : 0;
    
    // Calculate acceleration factor (theta accelerates as expiration approaches)
    const accelerationFactor = daysToExpiration < 30 ? Math.exp(-(daysToExpiration / 10)) : 1;
    
    const snapshot: TimeDecaySnapshot = {
      timestamp,
      daysToExpiration,
      timeValue,
      intrinsicValue,
      thetaDecay,
      accelerationFactor
    };
    
    position.timeDecayHistory.push(snapshot);
    
    // Keep only last 100 snapshots
    if (position.timeDecayHistory.length > 100) {
      position.timeDecayHistory = position.timeDecayHistory.slice(-100);
    }
  }

  /**
   * Update volatility tracking for position
   */
  private updateVolatilityTracking(position: MultiTickerPaperPosition, impliedVol: number, timestamp: Date): void {
    const lastSnapshot = position.volatilityHistory[position.volatilityHistory.length - 1];
    const volChange = lastSnapshot ? impliedVol - lastSnapshot.impliedVolatility : 0;
    const vegaImpact = position.currentGreeks.vega * volChange * position.quantity * 100;
    
    // Determine if volatility is expanding
    const volExpansion = volChange > 0.02; // 2% IV increase threshold
    
    // Calculate volatility rank (simplified)
    const volatilityRank = Math.min(100, Math.max(0, impliedVol * 100));
    
    const snapshot: VolatilitySnapshot = {
      timestamp,
      impliedVolatility: impliedVol,
      historicalVolatility: impliedVol * 0.9, // Simplified
      volatilityRank,
      vegaImpact,
      volExpansion
    };
    
    position.volatilityHistory.push(snapshot);
    
    // Keep only last 100 snapshots
    if (position.volatilityHistory.length > 100) {
      position.volatilityHistory = position.volatilityHistory.slice(-100);
    }
  }

  /**
   * Calculate intrinsic value of option
   */
  private calculateIntrinsicValue(position: MultiTickerPaperPosition): number {
    const marketData = this.marketData.get(position.ticker);
    if (!marketData) return 0;
    
    const underlyingPrice = marketData.underlyingPrice;
    
    if (position.type === 'CALL') {
      return Math.max(0, underlyingPrice - position.strike);
    } else {
      return Math.max(0, position.strike - underlyingPrice);
    }
  }

  /**
   * Simulate realistic execution with bid/ask spreads and market impact
   */
  private simulateExecution(recommendation: OptionsRecommendation): ExecutionDetails {
    const requestedPrice = recommendation.entryPrice;
    const bidAskSpread = recommendation.liquidity.bidAskSpread;
    const liquidityRating = recommendation.liquidity.liquidityRating.toLowerCase() as keyof typeof this.SLIPPAGE_MODEL;
    
    // Calculate slippage based on liquidity
    const baseSlippage = this.SLIPPAGE_MODEL[liquidityRating] || this.SLIPPAGE_MODEL.poor;
    const slippage = baseSlippage * requestedPrice;
    
    // Calculate market impact (simplified)
    const marketImpact = bidAskSpread * 0.3; // Assume we pay 30% of spread
    
    // Calculate final execution price
    const executedPrice = requestedPrice + slippage + marketImpact;
    
    // Simulate execution time based on liquidity
    const executionTime = this.calculateExecutionTime(liquidityRating);
    
    // Determine execution quality
    const totalCost = slippage + marketImpact;
    const costPercentage = totalCost / requestedPrice;
    
    let executionQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (costPercentage < 0.002) executionQuality = 'EXCELLENT';
    else if (costPercentage < 0.005) executionQuality = 'GOOD';
    else if (costPercentage < 0.010) executionQuality = 'FAIR';
    else executionQuality = 'POOR';
    
    return {
      requestedPrice,
      executedPrice,
      bidAskSpread,
      slippage,
      marketImpact,
      executionTime,
      liquidityScore: recommendation.liquidity.liquidityScore,
      executionQuality
    };
  }

  /**
   * Calculate execution time based on liquidity
   */
  private calculateExecutionTime(liquidityRating: string): number {
    const baseTimes = {
      excellent: 50,   // 50ms
      good: 100,       // 100ms
      fair: 250,       // 250ms
      poor: 500        // 500ms
    };
    
    const baseTime = baseTimes[liquidityRating as keyof typeof baseTimes] || baseTimes.poor;
    
    // Add random variation (±50%)
    const variation = (Math.random() - 0.5) * baseTime;
    return Math.max(10, baseTime + variation);
  }

  /**
   * Create new position from trade request
   */
  private createPosition(request: PaperTradeRequest, executionDetails: ExecutionDetails): MultiTickerPaperPosition {
    const positionId = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: positionId,
      ticker: request.ticker,
      optionSymbol: request.recommendation.symbol,
      type: request.recommendation.type,
      strike: request.recommendation.strike,
      expiration: request.recommendation.expiration,
      quantity: request.positionSize,
      entryPrice: executionDetails.executedPrice,
      currentPrice: executionDetails.executedPrice,
      entryTimestamp: new Date(),
      status: 'OPEN',
      pnl: 0,
      pnlPercent: 0,
      maxFavorableExcursion: 0,
      maxAdverseExcursion: 0,
      confidence: request.confidence,
      expectedMove: request.expectedMove,
      signalId: request.signalId,
      entryGreeks: request.recommendation.greeks,
      currentGreeks: request.recommendation.greeks,
      greeksHistory: [],
      executionDetails,
      timeDecayHistory: [],
      volatilityHistory: []
    };
  }

  /**
   * Validate trade request against risk limits
   */
  private validateRiskLimits(request: PaperTradeRequest): { approved: boolean; reason?: string } {
    // Check portfolio heat
    const positionValue = request.recommendation.entryPrice * request.positionSize * 100;
    const newHeat = (positionValue / this.account.currentBalance);
    
    if (this.account.portfolioHeat + newHeat > this.MAX_PORTFOLIO_HEAT) {
      return { approved: false, reason: 'Portfolio heat limit exceeded' };
    }
    
    // Check position size limit
    if (newHeat > this.MAX_POSITION_SIZE) {
      return { approved: false, reason: 'Position size limit exceeded' };
    }
    
    // Check ticker concentration
    const tickerPositions = this.account.positionsByTicker.get(request.ticker) || [];
    const tickerExposure = tickerPositions.reduce((sum, pos) => 
      sum + (pos.currentPrice * pos.quantity * 100), 0);
    const newTickerExposure = (tickerExposure + positionValue) / this.account.currentBalance;
    
    if (newTickerExposure > this.MAX_TICKER_CONCENTRATION) {
      return { approved: false, reason: 'Ticker concentration limit exceeded' };
    }
    
    // Check available balance
    if (positionValue > this.account.availableBalance) {
      return { approved: false, reason: 'Insufficient available balance' };
    }
    
    return { approved: true };
  }

  /**
   * Validate trade request format and data
   */
  private validateTradeRequest(request: PaperTradeRequest): void {
    if (!request.ticker || !request.recommendation || !request.signalId) {
      throw new Error('Invalid trade request: missing required fields');
    }
    
    if (request.positionSize <= 0) {
      throw new Error('Invalid position size: must be greater than 0');
    }
    
    if (request.confidence < 0 || request.confidence > 1) {
      throw new Error('Invalid confidence: must be between 0 and 1');
    }
    
    if (request.recommendation.expiration <= new Date()) {
      throw new Error('Invalid expiration: must be in the future');
    }
  }

  /**
   * Update account metrics for new position
   */
  private updateAccountForNewPosition(position: MultiTickerPaperPosition): void {
    const positionValue = position.entryPrice * position.quantity * 100;
    
    // Update available balance
    this.account.availableBalance -= positionValue;
    
    // Update portfolio heat
    this.account.portfolioHeat = this.calculatePortfolioHeat();
    
    // Update risk metrics
    this.updateRiskMetrics();
  }

  /**
   * Add position to ticker tracking
   */
  private addPositionToTicker(position: MultiTickerPaperPosition): void {
    if (!this.account.positionsByTicker.has(position.ticker)) {
      this.account.positionsByTicker.set(position.ticker, []);
    }
    
    this.account.positionsByTicker.get(position.ticker)!.push(position);
  }

  /**
   * Calculate current portfolio heat
   */
  private calculatePortfolioHeat(): number {
    let totalExposure = 0;
    
    for (const position of this.positions.values()) {
      if (position.status === 'OPEN') {
        totalExposure += position.currentPrice * position.quantity * 100;
      }
    }
    
    return totalExposure / this.account.currentBalance;
  }

  /**
   * Update portfolio-level metrics
   */
  private updatePortfolioMetrics(): void {
    // Calculate total P&L
    let totalPnL = 0;
    for (const position of this.positions.values()) {
      if (position.status === 'OPEN') {
        totalPnL += position.pnl;
      }
    }
    
    // Add closed positions P&L
    totalPnL += this.closedPositions.reduce((sum, pos) => sum + pos.pnl, 0);
    
    this.account.totalPnL = totalPnL;
    this.account.totalPnLPercent = (totalPnL / this.account.initialBalance) * 100;
    this.account.currentBalance = this.account.initialBalance + totalPnL;
    
    // Update portfolio heat
    this.account.portfolioHeat = this.calculatePortfolioHeat();
    
    // Update max drawdown
    const currentDrawdown = Math.max(0, this.account.initialBalance - this.account.currentBalance);
    this.account.maxDrawdown = Math.max(this.account.maxDrawdown, currentDrawdown);
    
    // Update risk metrics
    this.updateRiskMetrics();
    
    // Update performance metrics
    this.updatePerformanceMetrics();
  }

  /**
   * Update risk metrics
   */
  private updateRiskMetrics(): void {
    const openPositions = Array.from(this.positions.values()).filter(p => p.status === 'OPEN');
    
    // Calculate portfolio Greeks
    const portfolioGreeks = this.calculatePortfolioGreeks(openPositions);
    
    // Calculate correlation risk (simplified)
    const correlationRisk = this.calculateCorrelationRisk(openPositions);
    
    // Calculate concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(openPositions);
    
    // Calculate VaR (simplified)
    const varEstimate = this.calculateVaR(openPositions);
    
    this.account.riskMetrics = {
      portfolioHeat: this.account.portfolioHeat,
      maxPositionSize: this.MAX_POSITION_SIZE,
      correlationRisk,
      concentrationRisk,
      greeksExposure: portfolioGreeks,
      varEstimate,
      expectedShortfall: varEstimate * 1.3 // Simplified ES calculation
    };
  }

  /**
   * Calculate portfolio Greeks exposure
   */
  private calculatePortfolioGreeks(positions: MultiTickerPaperPosition[]): PortfolioGreeks {
    let totalDelta = 0;
    let totalGamma = 0;
    let totalTheta = 0;
    let totalVega = 0;
    let totalRho = 0;
    let netExposure = 0;
    
    for (const position of positions) {
      const multiplier = position.quantity * 100; // Contract multiplier
      
      totalDelta += position.currentGreeks.delta * multiplier;
      totalGamma += position.currentGreeks.gamma * multiplier;
      totalTheta += position.currentGreeks.theta * multiplier;
      totalVega += position.currentGreeks.vega * multiplier;
      totalRho += position.currentGreeks.rho * multiplier;
      
      netExposure += position.currentPrice * multiplier;
    }
    
    return {
      totalDelta,
      totalGamma,
      totalTheta,
      totalVega,
      totalRho,
      netExposure
    };
  }

  /**
   * Calculate correlation risk (simplified)
   */
  private calculateCorrelationRisk(positions: MultiTickerPaperPosition[]): number {
    const tickers = new Set(positions.map(p => p.ticker));
    const tickerCount = tickers.size;
    const positionCount = positions.length;
    
    // Simple correlation risk: more positions in fewer tickers = higher risk
    return positionCount > 0 ? 1 - (tickerCount / positionCount) : 0;
  }

  /**
   * Calculate concentration risk
   */
  private calculateConcentrationRisk(positions: MultiTickerPaperPosition[]): number {
    const tickerExposures = new Map<string, number>();
    let totalExposure = 0;
    
    for (const position of positions) {
      const exposure = position.currentPrice * position.quantity * 100;
      tickerExposures.set(position.ticker, (tickerExposures.get(position.ticker) || 0) + exposure);
      totalExposure += exposure;
    }
    
    if (totalExposure === 0) return 0;
    
    // Calculate Herfindahl index for concentration
    let herfindahl = 0;
    for (const exposure of tickerExposures.values()) {
      const share = exposure / totalExposure;
      herfindahl += share * share;
    }
    
    return herfindahl;
  }

  /**
   * Calculate Value at Risk (simplified)
   */
  private calculateVaR(positions: MultiTickerPaperPosition[]): number {
    if (positions.length === 0) return 0;
    
    // Simplified VaR calculation based on portfolio value and volatility
    const portfolioValue = positions.reduce((sum, pos) => 
      sum + (pos.currentPrice * pos.quantity * 100), 0);
    
    // Assume 2% daily volatility for simplicity
    const dailyVolatility = 0.02;
    const confidenceLevel = 1.645; // 95% confidence (z-score)
    
    return portfolioValue * dailyVolatility * confidenceLevel;
  }

  /**
   * Check exit conditions for positions
   */
  private checkExitConditions(ticker: string): void {
    const positions = this.account.positionsByTicker.get(ticker) || [];
    
    for (const position of positions) {
      if (position.status !== 'OPEN') continue;
      
      // Check expiration
      if (position.expiration <= new Date()) {
        this.closePosition(position.id, 'EXPIRATION');
        continue;
      }
      
      // Check profit target (100% gain)
      if (position.pnlPercent >= 100) {
        this.closePosition(position.id, 'PROFIT_TARGET');
        continue;
      }
      
      // Check stop loss (50% loss)
      if (position.pnlPercent <= -50) {
        this.closePosition(position.id, 'STOP_LOSS');
        continue;
      }
      
      // Check time decay (close if < 7 DTE and losing money)
      const daysToExpiration = (position.expiration.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      if (daysToExpiration < 7 && position.pnl < 0) {
        this.closePosition(position.id, 'TIME_DECAY');
        continue;
      }
    }
  }

  /**
   * Close a position with specified reason
   */
  public closePosition(positionId: string, reason: ExitReason): boolean {
    const position = this.positions.get(positionId);
    if (!position || position.status !== 'OPEN') {
      return false;
    }
    
    // Update position
    position.status = 'CLOSED';
    position.exitTimestamp = new Date();
    position.exitPrice = position.currentPrice;
    position.exitReason = reason;
    
    // Move to closed positions
    this.closedPositions.push(position);
    this.positions.delete(positionId);
    
    // Remove from ticker tracking
    const tickerPositions = this.account.positionsByTicker.get(position.ticker) || [];
    const index = tickerPositions.findIndex(p => p.id === positionId);
    if (index >= 0) {
      tickerPositions.splice(index, 1);
    }
    
    // Update account
    const positionValue = position.entryPrice * position.quantity * 100;
    this.account.availableBalance += positionValue + position.pnl;
    
    // Update metrics
    this.updatePortfolioMetrics();
    
    // Emit event
    this.emit('position:closed', {
      positionId,
      ticker: position.ticker,
      pnl: position.pnl,
      pnlPercent: position.pnlPercent,
      reason,
      holdingPeriod: position.exitTimestamp.getTime() - position.entryTimestamp.getTime()
    });
    
    console.log(`📄 Position closed: ${position.ticker} ${position.type} P&L: ${position.pnl.toFixed(2)} (${reason})`);
    return true;
  }

  /**
   * Get account summary
   */
  public getAccountSummary(): MultiTickerAccount {
    return { ...this.account };
  }

  /**
   * Get open positions
   */
  public getOpenPositions(): MultiTickerPaperPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get positions by ticker
   */
  public getPositionsByTicker(ticker: string): MultiTickerPaperPosition[] {
    return this.account.positionsByTicker.get(ticker) || [];
  }

  /**
   * Get closed positions
   */
  public getClosedPositions(): MultiTickerPaperPosition[] {
    return [...this.closedPositions];
  }

  /**
   * Initialize risk metrics
   */
  private initializeRiskMetrics(): RiskMetrics {
    return {
      portfolioHeat: 0,
      maxPositionSize: this.MAX_POSITION_SIZE,
      correlationRisk: 0,
      concentrationRisk: 0,
      greeksExposure: {
        totalDelta: 0,
        totalGamma: 0,
        totalTheta: 0,
        totalVega: 0,
        totalRho: 0,
        netExposure: 0
      },
      varEstimate: 0,
      expectedShortfall: 0
    };
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): EnhancedPerformanceMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      averageWin: 0,
      averageLoss: 0,
      averageHoldingPeriod: 0,
      bestTrade: 0,
      worstTrade: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      deltaEfficiency: 0,
      thetaCapture: 0,
      vegaPerformance: 0,
      averageSlippage: 0,
      executionQuality: 0,
      tickerPerformance: new Map()
    };
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const allTrades = [...this.closedPositions];
    
    if (allTrades.length === 0) return;
    
    const winningTrades = allTrades.filter(t => t.pnl > 0);
    const losingTrades = allTrades.filter(t => t.pnl < 0);
    
    // Basic metrics
    this.account.performanceMetrics.totalTrades = allTrades.length;
    this.account.performanceMetrics.winningTrades = winningTrades.length;
    this.account.performanceMetrics.losingTrades = losingTrades.length;
    this.account.performanceMetrics.winRate = (winningTrades.length / allTrades.length) * 100;
    
    // P&L metrics
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    
    this.account.performanceMetrics.averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
    this.account.performanceMetrics.averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
    this.account.performanceMetrics.profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    
    // Best/worst trades
    this.account.performanceMetrics.bestTrade = Math.max(...allTrades.map(t => t.pnl));
    this.account.performanceMetrics.worstTrade = Math.min(...allTrades.map(t => t.pnl));
    
    // Holding period
    const avgHoldingPeriod = allTrades.reduce((sum, t) => {
      if (t.exitTimestamp) {
        return sum + (t.exitTimestamp.getTime() - t.entryTimestamp.getTime());
      }
      return sum;
    }, 0) / allTrades.length;
    
    this.account.performanceMetrics.averageHoldingPeriod = avgHoldingPeriod / (1000 * 60 * 60); // Convert to hours
    
    // Calculate Sharpe ratio (simplified)
    const returns = allTrades.map(t => t.pnlPercent / 100);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    
    this.account.performanceMetrics.sharpeRatio = returnStdDev > 0 ? 
      (avgReturn * Math.sqrt(252)) / (returnStdDev * Math.sqrt(252)) : 0;
    
    // Update execution metrics
    const avgSlippage = allTrades.reduce((sum, t) => sum + t.executionDetails.slippage, 0) / allTrades.length;
    this.account.performanceMetrics.averageSlippage = avgSlippage;
    
    // Update ticker performance
    this.updateTickerPerformance(allTrades);
  }

  /**
   * Update ticker-specific performance metrics
   */
  private updateTickerPerformance(allTrades: MultiTickerPaperPosition[]): void {
    const tickerTrades = new Map<string, MultiTickerPaperPosition[]>();
    
    // Group trades by ticker
    for (const trade of allTrades) {
      if (!tickerTrades.has(trade.ticker)) {
        tickerTrades.set(trade.ticker, []);
      }
      tickerTrades.get(trade.ticker)!.push(trade);
    }
    
    // Calculate performance for each ticker
    for (const [ticker, trades] of tickerTrades) {
      const winningTrades = trades.filter(t => t.pnl > 0);
      const winRate = (winningTrades.length / trades.length) * 100;
      const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
      
      const avgHoldingPeriod = trades.reduce((sum, t) => {
        if (t.exitTimestamp) {
          return sum + (t.exitTimestamp.getTime() - t.entryTimestamp.getTime());
        }
        return sum;
      }, 0) / trades.length / (1000 * 60 * 60); // Hours
      
      const bestTrade = Math.max(...trades.map(t => t.pnl));
      const worstTrade = Math.min(...trades.map(t => t.pnl));
      
      // Calculate Sharpe ratio for ticker
      const returns = trades.map(t => t.pnlPercent / 100);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const returnStdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      );
      const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
      
      const tickerPerf: TickerPerformance = {
        ticker,
        trades: trades.length,
        winRate,
        totalPnL,
        averageHoldingPeriod,
        bestTrade,
        worstTrade,
        sharpeRatio
      };
      
      this.account.performanceMetrics.tickerPerformance.set(ticker, tickerPerf);
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle market data updates
    this.on('market:data', (data: MarketDataUpdate) => {
      this.updatePositions(data);
    });
    
    // Handle position management events
    this.on('position:close', (data: { positionId: string; reason: ExitReason }) => {
      this.closePosition(data.positionId, data.reason);
    });
  }

  /**
   * Force close all positions (risk management)
   */
  public forceCloseAllPositions(reason: ExitReason = 'RISK_MANAGEMENT'): number {
    const openPositions = Array.from(this.positions.values()).filter(p => p.status === 'OPEN');
    let closedCount = 0;
    
    for (const position of openPositions) {
      if (this.closePosition(position.id, reason)) {
        closedCount++;
      }
    }
    
    console.log(`📄 Force closed ${closedCount} positions due to ${reason}`);
    return closedCount;
  }

  /**
   * Reset account to initial state
   */
  public resetAccount(newBalance: number = 100000): void {
    // Close all positions
    this.forceCloseAllPositions('MANUAL');
    
    // Reset account
    this.account.initialBalance = newBalance;
    this.account.currentBalance = newBalance;
    this.account.availableBalance = newBalance;
    this.account.totalPnL = 0;
    this.account.totalPnLPercent = 0;
    this.account.portfolioHeat = 0;
    this.account.maxDrawdown = 0;
    this.account.positionsByTicker.clear();
    this.account.riskMetrics = this.initializeRiskMetrics();
    this.account.performanceMetrics = this.initializePerformanceMetrics();
    
    // Clear history
    this.closedPositions = [];
    this.marketData.clear();
    
    console.log(`📄 Enhanced paper account reset to ${newBalance}`);
  }
}