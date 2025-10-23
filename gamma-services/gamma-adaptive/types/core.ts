// Core types for Gamma Adaptive Trading System v3.0

export type FibZone = 'COMPRESSION' | 'MID_EXPANSION' | 'FULL_EXPANSION' | 'OVER_EXTENSION' | 'EXHAUSTION';

export type TickerStatus = 'READY' | 'SET' | 'GO' | 'COOLDOWN';

export interface TickerState {
  ticker: string;
  status: TickerStatus;
  confidence: number;
  conviction: number;
  fibZone: FibZone;
  gammaExposure: number;
  recommendedOption?: OptionRecommendation;
  position?: PaperPosition;
  lastUpdate: Date;
  stateEntryTime: Date;
  cooldownUntil?: Date;
}

export interface MultiTickerConfig {
  watchlist: string[];
  maxConcurrentTrades: number;
  confidenceThreshold: number;
  fibZoneBlocklist: FibZone[];
  updateInterval: number;
  priorityWeights: Record<string, number>;
}

export interface SignalFactors {
  ticker: string;
  trendComposite: number;
  momentumDivergence: number;
  volumeProfile: number;
  ribbonAlignment: number;
  fibConfluence: number;
  gammaExposure: number;
  timestamp: Date;
}

export interface ConfidenceResult {
  confidence: number;
  conviction: number;
  factors: SignalFactors;
  breakdown: {
    trendWeight: number;
    momentumWeight: number;
    volumeWeight: number;
    ribbonWeight: number;
    fibWeight: number;
    gammaWeight: number;
  };
}

export interface FibonacciAnalysis {
  currentZone: FibZone;
  expansionLevel: number;
  keyLevels: {
    support: number[];
    resistance: number[];
    targets: number[];
  };
  confluence: number;
  zoneMultiplier: number;
  riskAdjustment: number;
}

export interface FibLevel {
  level: number;
  type: 'SUPPORT' | 'RESISTANCE' | 'TARGET';
  strength: number;
  timeframe: string;
}

export interface GammaAnalysis {
  netGammaExposure: number;
  gammaFlip: number;
  volSuppressionLevel: number;
  accelerationZones: number[];
  pinningRisk: number;
  confidenceAdjustment: number;
}

export interface OptionsFlow {
  calls: FlowData[];
  puts: FlowData[];
  netFlow: number;
  timestamp: Date;
}

export interface FlowData {
  strike: number;
  volume: number;
  openInterest: number;
  gamma: number;
  notional: number;
}

export interface OptionRecommendation {
  symbol: string;
  strike: number;
  expiration: Date;
  type: 'CALL' | 'PUT';
  confidence: number;
  expectedMove: number;
  greeks: OptionsGreeks;
  riskReward: {
    maxRisk: number;
    maxReward: number;
    breakeven: number;
    profitProbability: number;
  };
  liquidity: {
    bidAskSpread: number;
    volume: number;
    openInterest: number;
    liquidityScore: number;
  };
}

export interface OptionsGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  impliedVolatility: number;
}

export interface PaperPosition {
  id: string;
  ticker: string;
  optionSymbol: string;
  contractType: 'CALL' | 'PUT';
  strike: number;
  expiration: Date;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  greeks: OptionsGreeks;
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
  confidence: number;
  entryTimestamp: Date;
  exitTimestamp?: Date;
}

export interface EnhancedSignal {
  ticker: string;
  timestamp: Date;
  confidence: number;
  conviction: number;
  factors: SignalFactors;
  fibAnalysis: FibonacciAnalysis;
  gammaAnalysis: GammaAnalysis;
  recommendations: OptionRecommendation[];
  riskAssessment: RiskAssessment;
  metadata: {
    regime: string;
    volatilityEnvironment: string;
    marketBreadth: number;
    sectorRotation: string;
  };
}

export interface RiskAssessment {
  riskScore: number;
  portfolioHeat: number;
  positionSize: number;
  maxRisk: number;
  stopLoss: number;
  profitTarget: number;
}

export interface MultiTickerState {
  orchestratorId: string;
  activeTickerCount: number;
  totalSignalsProcessed: number;
  activeTrades: number;
  portfolioHeat: number;
  systemHealth: SystemHealth;
  tickers: Record<string, TickerState>;
  performance: {
    processingLatency: number;
    throughput: number;
    errorRate: number;
    uptime: number;
  };
  lastUpdate: Date;
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  components: Record<string, ComponentHealth>;
  overallScore: number;
}

export interface ComponentHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
}

export interface PositionSize {
  contracts: number;
  notionalValue: number;
  riskAmount: number;
  riskPercent: number;
  heatContribution: number;
}

export interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  averageWin: number;
  averageLoss: number;
  calmarRatio: number;
  sortinoRatio: number;
  confidenceEffectiveness: number;
  fibZonePerformance: Record<FibZone, ZonePerformance>;
  tickerPerformance: Record<string, TickerPerformance>;
}

export interface ZonePerformance {
  trades: number;
  winRate: number;
  avgReturn: number;
  effectiveness: number;
}

export interface TickerPerformance {
  trades: number;
  winRate: number;
  avgReturn: number;
  totalPnL: number;
  sharpeRatio: number;
}

export interface GammaAdaptiveConfig {
  orchestrator: MultiTickerConfig;
  signalProcessing: {
    weights: Record<string, number>;
    thresholds: Record<string, number>;
    adjustments: Record<string, number>;
  };
  riskManagement: {
    positionSizing: PositionSizingConfig;
    limits: RiskLimits;
    fibZoneMultipliers: Record<FibZone, number>;
  };
  dataProviders: {
    primary: DataProviderConfig;
    fallback: DataProviderConfig;
    rateLimit: RateLimitConfig;
  };
  alerts: {
    channels: AlertChannel[];
    thresholds: AlertThreshold[];
  };
}

export interface PositionSizingConfig {
  maxRiskPerTrade: number;
  maxPortfolioHeat: number;
  maxDrawdown: number;
  fibZoneMultipliers: Record<FibZone, number>;
  confidenceMultipliers: {
    high: number;
    medium: number;
    low: number;
  };
  regimeAdjustments: Record<string, number>;
}

export interface RiskLimits {
  maxRiskPerTrade: number;
  maxPortfolioHeat: number;
  maxDrawdown: number;
  maxConsecutiveLosses: number;
  maxDailyLoss: number;
  vixThreshold: number;
}

export interface DataProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  rateLimit: number;
}

export interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  burstLimit: number;
}

export interface AlertChannel {
  type: string;
  enabled: boolean;
  webhook?: string;
  token?: string;
}

export interface AlertThreshold {
  type: string;
  priority: string;
}