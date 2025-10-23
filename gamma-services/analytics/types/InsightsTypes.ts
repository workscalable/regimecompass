import { MarketRegime } from '../../models/PaperTradingTypes';

export interface StrategyRecommendation {
  id: string;
  category: 'SIGNAL_OPTIMIZATION' | 'FIBONACCI_ZONES' | 'MARKET_REGIME';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  implementation: string[];
  expectedImprovement: string;
  supportingData: any;
  generatedAt: Date;
}

export interface FibonacciZoneOptimization {
  zone: 'COMPRESSION' | 'MID_EXPANSION' | 'FULL_EXPANSION' | 'OVER_EXTENSION' | 'EXHAUSTION';
  currentMultiplier: number;
  recommendedMultiplier: number;
  winRate: number;
  totalTrades: number;
  averagePnL: number;
  confidence: number;
}

export interface MarketRegimeAdaptation {
  regime: MarketRegime;
  signalAdjustments: Record<string, {
    currentWeight: number;
    recommendedWeight: number;
    effectiveness: number;
  }>;
  overallPerformance: {
    winRate: number;
    totalTrades: number;
  };
  recommendations: string[];
}

export interface SignalOptimizationMetrics {
  signalType: string;
  winRate: number;
  totalTrades: number;
  currentWeight: number;
  recommendedWeight: number;
  effectiveness: number;
  confidenceLevel: number;
}

export interface InsightsEngineConfig {
  minTradesForAnalysis: number;
  minTradesForRecommendation: number;
  confidenceThreshold: number;
  optimizationInterval: number;
  maxRecommendations: number;
}

export interface LearningInsightsEvent {
  type: 'RECOMMENDATION_GENERATED' | 'FIBONACCI_OPTIMIZED' | 'REGIME_ADAPTED';
  data: any;
  timestamp: Date;
  confidence: number;
}

export interface PerformanceImprovement {
  metric: string;
  beforeValue: number;
  afterValue: number;
  improvement: number;
  confidence: number;
  timeframe: string;
}

export interface ZonePerformanceMetrics {
  zone: string;
  trades: number;
  winRate: number;
  averagePnL: number;
  maxDrawdown: number;
  sharpeRatio: number;
  currentMultiplier: number;
  optimalMultiplier: number;
}

export interface RegimePerformanceBreakdown {
  regime: MarketRegime;
  totalTrades: number;
  winRate: number;
  averagePnL: number;
  maxDrawdown: number;
  bestSignals: string[];
  worstSignals: string[];
  recommendations: string[];
}