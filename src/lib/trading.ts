// Trading Orchestration System Types
// Comprehensive type definitions for the 7-module trading system

export type SignalStage = 'READY' | 'SET' | 'GO' | 'ACTIVE' | 'TARGET_HIT' | 'STOPPED' | 'CLOSED';
export type PatternType = 'Triangle' | 'Flag' | 'Pennant' | 'Wedge' | 'Channel';
export type Direction = 'LONG' | 'SHORT';
export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
export type OptionType = 'CALL' | 'PUT';
export type FlowBias = 'CALL' | 'PUT' | 'NEUTRAL';

// Pattern Recognition Types
export interface TrianglePattern {
  symbol: string;
  pattern: PatternType;
  range: [number, number];
  volatilityCompression: number;
  timeframe: Timeframe;
  status: 'MONITOR' | 'READY' | 'BREAKOUT' | 'INVALID';
  swingHighs: number[];
  swingLows: number[];
  compressionRatio: number;
  atrRatio: number;
  volumeContraction: number;
  timestamp: Date;
}

export interface PatternMetrics {
  compressionRatio: number;
  atrRatio: number;
  volumeContraction: number;
  breakoutProbability: number;
  targetLevels: number[];
  supportLevels: number[];
  resistanceLevels: number[];
}

// Multi-Timeframe Confirmation Types
export interface TimeframeConfirmation {
  timeframe: Timeframe;
  deltaSlope: number;
  volumeExpansion: number;
  bidAskImbalance: number;
  flowBias: number;
  stratContinuity: number;
  confirmation: boolean;
  strength: number;
}

export interface MultiTFConfirmation {
  symbol: string;
  htfConfirmations: TimeframeConfirmation[];
  ltfConfirmations: TimeframeConfirmation[];
  overallConfirmation: boolean;
  confidence: number;
  status: 'READY' | 'GO' | 'WAIT';
  timestamp: Date;
}

// Order Flow Analysis Types
export interface OrderFlowMetrics {
  symbol: string;
  deltaStrength: number;
  volumeExpansion: number;
  orderBookPressure: number;
  bidAskSpread: number;
  volumeProfile: {
    vwap: number;
    poc: number; // Point of Control
    valueArea: [number, number];
  };
  timestamp: Date;
}

export interface DeltaAnalysis {
  deltaSlope: number;
  deltaAcceleration: number;
  volumeDelta: number;
  priceDelta: number;
  imbalance: number;
  strength: number;
}

// Options Flow Intelligence Types
export interface OptionsFlowData {
  symbol: string;
  flowBias: FlowBias;
  flowConfidence: number;
  premiumSurge: number;
  unusualActivity: boolean;
  callVolume: number;
  putVolume: number;
  putCallRatio: number;
  largeBlockTrades: number;
  impliedVolatilityTrend: 'rising' | 'falling' | 'flat';
  timestamp: Date;
}

export interface OptionsSweep {
  symbol: string;
  optionSymbol: string;
  strike: number;
  expiration: string;
  type: OptionType;
  size: number;
  premium: number;
  timestamp: Date;
  unusual: boolean;
}

// Strike Recommendation Types
export interface StrikeRecommendation {
  strike: number;
  type: OptionType;
  expiry: string;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  bid: number;
  ask: number;
  mid: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  probability: number;
  riskReward: number;
}

export interface StrikeSelection {
  symbol: string;
  recommendedStrikes: StrikeRecommendation[];
  confidence: number;
  reasoning: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  maxDTE: number;
  timestamp: Date;
}

// Trade Decision Engine Types
export interface TradeSignal {
  symbol: string;
  pattern: PatternType;
  direction: Direction;
  entry: number;
  targets: number[];
  stopLoss: number;
  confidenceScore: number;
  recommendedStrikes: StrikeRecommendation[];
  confirmations: {
    LTF: string[];
    HTF: string[];
  };
  signalEvolution: SignalEvolution[];
  timestamp: Date;
}

export interface ConfidenceBreakdown {
  htfBreakout: number;
  ltfAlignment: number;
  orderFlowBias: number;
  deltaStrength: number;
  volumeExpansion: number;
  total: number;
}

// Signal Evolution Tracker Types
export interface SignalEvolution {
  stage: SignalStage;
  time: string;
  confidence: number;
  metrics?: {
    price: number;
    volume: number;
    delta: number;
    volatility: number;
  };
  notes?: string;
}

export interface SignalLifecycle {
  symbol: string;
  lifecycle: SignalEvolution[];
  finalResult: 'TARGET_HIT' | 'STOPPED' | 'CLOSED' | 'EXPIRED';
  pnlPct: number;
  maxDrawdown: number;
  duration: number; // minutes
  peakConfidence: number;
  startTime: Date;
  endTime?: Date;
}

// Core Signal Payload Interface
export interface SignalPayload {
  symbol: string;
  pattern: PatternType;
  direction: Direction;
  entry: number;
  targets: number[];
  stopLoss: number;
  confidenceScore: number;
  recommendedStrikes: StrikeRecommendation[];
  confirmations: {
    LTF: string[];
    HTF: string[];
  };
  signalEvolution: SignalEvolution[];
  timestamp: Date;
}

// Event Bus Types
export interface SignalEvent {
  type: 'SIGNAL_GENERATED' | 'SIGNAL_UPDATED' | 'SIGNAL_CLOSED' | 'STAGE_CHANGE';
  payload: SignalPayload | SignalLifecycle;
  timestamp: Date;
}

// Database Types
export interface SignalRecord {
  id: string;
  symbol: string;
  pattern: PatternType;
  direction: Direction;
  entry: number;
  targets: number[];
  stopLoss: number;
  confidenceScore: number;
  status: SignalStage;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  pnl?: number;
  maxDrawdown?: number;
}

// Configuration Types
export interface TradingConfig {
  patternDetection: {
    triangleCompressionThreshold: number;
    atrRatioThreshold: number;
    volumeContractionThreshold: number;
  };
  confirmations: {
    htfDeltaSlopeThreshold: number;
    ltfVolumeExpansionThreshold: number;
    bidAskImbalanceThreshold: number;
    flowBiasThreshold: number;
    stratContinuityThreshold: number;
  };
  orderFlow: {
    deltaStrengthThreshold: number;
    volumeExpansionThreshold: number;
    orderBookPressureThreshold: number;
  };
  options: {
    maxDTE: number;
    minDelta: number;
    maxDelta: number;
    minVolume: number;
    minOpenInterest: number;
  };
  risk: {
    maxPositionSize: number;
    stopLossATRMultiplier: number;
    targetATRMultiplier: number;
    maxDrawdown: number;
  };
}

// API Response Types
export interface TradingSystemResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: Date;
  source: string;
}

// Health Check Types
export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  modules: {
    patternDetector: 'online' | 'offline' | 'degraded';
    mtfOrchestrator: 'online' | 'offline' | 'degraded';
    orderFlowAnalyzer: 'online' | 'offline' | 'degraded';
    optionsFlowModule: 'online' | 'offline' | 'degraded';
    strikeSelector: 'online' | 'offline' | 'degraded';
    tradeDecisionEngine: 'online' | 'offline' | 'degraded';
    signalTracker: 'online' | 'offline' | 'degraded';
  };
  dataSources: {
    polygon: 'online' | 'offline' | 'degraded';
    tradier: 'online' | 'offline' | 'degraded';
    finnhub: 'online' | 'offline' | 'degraded';
    twelveData: 'online' | 'offline' | 'degraded';
  };
  performance: {
    avgProcessingTime: number;
    signalsPerMinute: number;
    errorRate: number;
    cacheHitRate: number;
  };
  timestamp: Date;
}

// Export all types
export * from './types';


