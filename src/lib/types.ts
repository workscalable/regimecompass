// Core regime types
export type RegimeType = 'BULL' | 'BEAR' | 'NEUTRAL';

export type VolatilityTrend = 'rising' | 'falling' | 'flat';

export type TradingBias = 'bullish' | 'bearish' | 'neutral';

export type DivergenceType = 'bullish' | 'bearish' | 'none';

export type ThrustType = 'up' | 'down' | 'none';

export type TimeframeType = 'short' | 'medium' | 'long';

export type RecommendationType = 'BUY' | 'SELL' | 'HOLD' | 'AVOID';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

// Market data interfaces
export interface BreadthData {
  breadthPct: number;
  advancingStocks: number;
  decliningStocks: number;
  unchangedStocks: number;
  newHighs: number;
  newLows: number;
  advanceDeclineRatio: number;
}

export interface IndexData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  ema20: number;
  ema50: number;
  trendScore9: number;
  atr14: number;
  vix?: number;
  gex?: number;
  zeroGammaDist?: number;
  rsi?: number;
  macd?: number;
  timestamp: Date;
}

export interface SectorData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trendScore9: number;
  relativeStrength: number;
  recommendation: RecommendationType;
  weight?: number;
  timestamp: Date;
}

export interface VIXData {
  value: number;
  change: number;
  changePercent: number;
  trend: VolatilityTrend;
  fiveDayChange: number;
  timestamp: Date;
}

export interface GammaData {
  gex: number;
  zeroGammaDist: number;
  gammaFlip: number;
  bias: 'supportive' | 'suppressive' | 'neutral';
  timestamp: Date;
}

// Regime classification interfaces
export interface RegimeFactors {
  breadth: boolean;
  emaAlignment: boolean;
  trendScore: boolean;
  volatility: boolean;
  gamma: boolean;
}

export interface RegimeClassification {
  regime: RegimeType;
  confidence: number;
  strength: number; // 0-100 scale
  factors: RegimeFactors;
  timestamp: Date;
  previousRegime?: RegimeType;
  regimeDuration: number; // days in current regime
}

export interface EarlyWarningSignals {
  bullToBearWarning: boolean;
  bearToBullWarning: boolean;
  confirmationLevel: ConfidenceLevel;
  warningFactors: string[];
  timeframe: string;
}

// Predictive signals interfaces
export interface MomentumDivergence {
  type: DivergenceType;
  strength: number; // 0-1 scale
  timeframe: TimeframeType;
  rsiDivergence: boolean;
  macdDivergence: boolean;
  hiddenDivergence: boolean;
  pricePoints: number[];
  indicatorPoints: number[];
}

export interface VolumeAnalysis {
  confirmation: boolean;
  thrust: ThrustType;
  exhaustion: boolean;
  volumeSpike: boolean;
  accumulationDistribution: number;
  volumeRatio: number; // current vs average
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface OptionsFlow {
  bias: TradingBias;
  confidence: number;
  unusualActivity: boolean;
  callVolume: number;
  putVolume: number;
  putCallRatio: number;
  impliedVolatilityTrend: VolatilityTrend;
  largeBlockTrades: number;
  forwardBias: TradingBias;
}

export interface ProjectedLevels {
  support: number[];
  resistance: number[];
  pivot: number;
  expectedMove: number;
  projectedUpside: number;
  projectedDownside: number;
  expectedRange: [number, number];
}

export interface RegimeProbability {
  nextWeek: {
    BULL: number;
    BEAR: number;
    NEUTRAL: number;
  };
  nextMonth: {
    BULL: number;
    BEAR: number;
    NEUTRAL: number;
  };
}

export interface PredictiveSignals {
  momentumDivergence: MomentumDivergence;
  volumeAnalysis: VolumeAnalysis;
  optionsFlow: OptionsFlow;
  projectedLevels: ProjectedLevels;
  regimeProbability: RegimeProbability;
  institutionalFlow?: InstitutionalFlow;
}

export interface InstitutionalFlow {
  netOptionsFlow: number;
  blockTradeRatio: number;
  darkPoolActivity: number;
  accumulationDistribution: number;
  forwardBias: 'accumulation' | 'distribution' | 'neutral';
  smartMoneyFlow: number;
}

// Trading and risk management interfaces
export interface TradingCandidate {
  symbol: string;
  name: string;
  type: 'LONG' | 'SHORT' | 'HEDGE';
  confidence: number;
  entry: number;
  stopLoss: number;
  target: number;
  positionSize: number;
  reasoning: string[];
  sector?: string;
  atr: number;
  riskReward: number;
  timeframe: string;
}

export interface RiskMetrics {
  positionSizeFactor: number;
  stopLossPct: number;
  targetATRx: number;
  maxDrawdown: number;
  volatilityAdjustment: number;
  portfolioHeat: number;
  vixAdjustment: number;
  correlationRisk: number;
}

export interface PositionSizingData {
  baseSize: number;
  adjustedSize: number;
  riskPerTrade: number;
  maxPositionSize: number;
  volatilityFactor: number;
  accountSize: number;
  currentExposure: number;
}

export interface PortfolioMetrics {
  totalExposure: number;
  longExposure: number;
  shortExposure: number;
  hedgeRatio: number;
  sectorConcentration: Record<string, number>;
  drawdown: number;
  sharpeRatio?: number;
  maxDrawdownLimit: number;
}

// Sector analysis interfaces
export interface SectorScores {
  [sectorSymbol: string]: number; // -9 to +9 trend score
}

export interface SectorRecommendations {
  overweight: string[]; // Top 3 sectors to overweight
  underweight: string[]; // Sectors to avoid
  neutral: string[]; // Sectors with neutral scores
  rotationSignal: 'into_growth' | 'into_value' | 'into_defensive' | 'mixed';
}

export interface SectorAllocation {
  sector: string;
  currentWeight: number;
  recommendedWeight: number;
  adjustment: number;
  reasoning: string;
}

// Forward-looking data interfaces
export interface ForwardLookingData {
  expectedRegimeChange: number; // 0-100 probability
  expectedChangeTimeframe: '1-3 days' | '3-7 days' | '1-2 weeks' | '2-4 weeks';
  recommendedAction: 'aggressive' | 'cautious' | 'wait' | 'hedge';
  keyLevelsToWatch: number[];
  catalysts: string[];
}

// Derived signals interface
export interface DerivedSignals {
  volatilityTrend: VolatilityTrend;
  momentumScore: number;
  regimeStrength: number;
  breadthMomentum: number;
  trendConsistency: number;
  marketStructure: 'healthy' | 'deteriorating' | 'oversold' | 'overbought';
}

// Main market snapshot interface
export interface MarketSnapshot {
  timestamp: Date;
  regime: RegimeType;
  regimeClassification: RegimeClassification;
  breadth: BreadthData;
  indexes: {
    SPY: IndexData;
    QQQ: IndexData;
    IWM: IndexData;
    [key: string]: IndexData;
  };
  sectors: Record<string, SectorData>;
  vix: VIXData;
  gamma: GammaData;
  derivedSignals: DerivedSignals;
  predictiveSignals: PredictiveSignals;
  riskMetrics: RiskMetrics;
  forwardLooking: ForwardLookingData;
  tradingCandidates: {
    long: TradingCandidate[];
    hedge: TradingCandidate[];
    avoid: string[];
  };
  sectorAnalysis: {
    scores: SectorScores;
    recommendations: SectorRecommendations;
    allocation: SectorAllocation[];
  };
  dataQuality: {
    sources: string[];
    freshness: number; // minutes since last update
    completeness: number; // 0-1 scale
    reliability: ConfidenceLevel;
  };
}

// API response interfaces
export interface ServiceResponse<T = any> {
  data: T;
  timestamp: Date;
  source: string;
  status: 'success' | 'error' | 'cached' | 'degraded';
  error?: string;
  cacheAge?: number;
}

export interface HealthStatus {
  service: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  lastCheck: Date;
  errorCount: number;
  uptime: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: HealthStatus[];
  dataFreshness: {
    marketData: number;
    vixData: number;
    optionsData: number;
  };
  performance: {
    avgResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
  };
  timestamp: Date;
}

// Configuration interfaces
export interface ApiConfig {
  polygonApiKey?: string;
  twelveDataApiKey?: string;
  tradierApiKey?: string;
  gexProvider: 'proxy' | 'none';
  rateLimits: {
    polygon: number;
    twelveData: number;
    tradier: number;
  };
  timeouts: {
    default: number;
    polygon: number;
    twelveData: number;
    tradier: number;
  };
}

export interface TradingConfig {
  riskPerTrade: number; // percentage
  maxPositionSize: number; // percentage
  maxDrawdown: number; // percentage
  vixThreshold: number;
  regimeConfidence: number;
  sectorConcentration: number;
}

// Export and integration interfaces
export interface ExportData {
  format: 'json' | 'csv' | 'webhook';
  data: MarketSnapshot;
  timestamp: Date;
  version: string;
}

export interface WebhookPayload {
  event: 'regime_change' | 'signal_update' | 'risk_alert';
  data: Partial<MarketSnapshot>;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
}

// Error interfaces
export interface ServiceError {
  service: string;
  message: string;
  statusCode?: number;
  retryable: boolean;
  timestamp: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
  expected: string;
}