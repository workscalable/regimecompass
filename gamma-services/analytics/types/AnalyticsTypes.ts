import { z } from 'zod';
import { MarketRegime, ExitReason } from '../../models/PaperTradingTypes';

// Performance Metrics Schema
export const RealTimeMetricsSchema = z.object({
  // Basic performance metrics
  totalTrades: z.number().int().nonnegative(),
  winningTrades: z.number().int().nonnegative(),
  losingTrades: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1),
  
  // Profitability metrics
  totalPnL: z.number(),
  averageWin: z.number().nonnegative(),
  averageLoss: z.number().nonpositive(),
  profitFactor: z.number().nonnegative(),
  
  // Risk-adjusted metrics
  sharpeRatio: z.number(),
  maxDrawdown: z.number().nonnegative(),
  maxDrawdownPercent: z.number().min(0).max(100),
  currentDrawdown: z.number().nonnegative(),
  currentDrawdownPercent: z.number().min(0).max(100),
  
  // Advanced metrics
  averageHoldingPeriod: z.number().nonnegative(),
  bestTrade: z.number(),
  worstTrade: z.number(),
  consecutiveWins: z.number().int().nonnegative(),
  consecutiveLosses: z.number().int().nonnegative(),
  
  // Confidence metrics
  averageConfidence: z.number().min(0).max(1),
  confidenceAccuracy: z.number().min(0).max(1),
  
  // Time-based metrics
  calculatedAt: z.date(),
  periodStart: z.date(),
  periodEnd: z.date()
});

// Confidence Effectiveness Schema
export const ConfidenceEffectivenessSchema = z.object({
  confidenceRange: z.string(),
  totalTrades: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1),
  averagePnL: z.number(),
  accuracy: z.number().min(0).max(1),
  calibration: z.number().min(0).max(1),
  recommendedAdjustment: z.number().min(-0.2).max(0.2)
});

// Signal Accuracy Schema
export const SignalAccuracySchema = z.object({
  signalType: z.string(),
  totalSignals: z.number().int().nonnegative(),
  successfulSignals: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1),
  averageContribution: z.number().min(0).max(1),
  effectiveness: z.number().min(0).max(1),
  recommendedWeight: z.number().min(0).max(1)
});

// Performance Breakdown Schema
export const PerformanceBreakdownSchema = z.object({
  byTicker: z.record(z.string(), RealTimeMetricsSchema),
  byStrategy: z.record(z.string(), RealTimeMetricsSchema),
  byRegime: z.record(z.enum(['BULL', 'BEAR', 'NEUTRAL']), RealTimeMetricsSchema),
  byConfidence: z.record(z.string(), RealTimeMetricsSchema),
  byExitReason: z.record(z.enum(['PROFIT_TARGET', 'STOP_LOSS', 'TIME_DECAY', 'EXPIRATION', 'RISK_MANAGEMENT', 'MANUAL']), RealTimeMetricsSchema),
  byTimeframe: z.object({
    daily: z.array(RealTimeMetricsSchema),
    weekly: z.array(RealTimeMetricsSchema),
    monthly: z.array(RealTimeMetricsSchema)
  })
});

// Analytics Configuration Schema
export const PerformanceAnalyticsConfigSchema = z.object({
  lookbackPeriodDays: z.number().int().positive().default(30),
  minTradesForAnalysis: z.number().int().positive().default(10),
  confidenceRanges: z.array(z.number().min(0).max(1)).default([0.4, 0.6, 0.8, 1.0]),
  realTimeUpdateIntervalMs: z.number().int().positive().default(5000),
  riskFreeRate: z.number().min(0).max(1).default(0.02),
  minWinRateThreshold: z.number().min(0).max(1).default(0.55),
  minProfitFactorThreshold: z.number().positive().default(1.5),
  maxDrawdownThreshold: z.number().min(0).max(1).default(0.05)
});

// Learning Insights Schema
export const LearningInsightSchema = z.object({
  category: z.enum(['CONFIDENCE_CALIBRATION', 'SIGNAL_EFFECTIVENESS', 'MARKET_REGIME', 'RISK_MANAGEMENT', 'TIMING']),
  insight: z.string().min(1),
  confidence: z.number().min(0).max(1),
  impact: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  actionable: z.boolean(),
  recommendation: z.string().optional(),
  supportingData: z.any(),
  generatedAt: z.date()
});

// Performance Alert Schema
export const PerformanceAlertSchema = z.object({
  id: z.string(),
  type: z.enum(['WIN_RATE_LOW', 'PROFIT_FACTOR_LOW', 'DRAWDOWN_HIGH', 'CONSECUTIVE_LOSSES', 'CONFIDENCE_DRIFT']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  message: z.string(),
  currentValue: z.number(),
  thresholdValue: z.number(),
  recommendation: z.string().optional(),
  triggeredAt: z.date(),
  acknowledged: z.boolean().default(false),
  acknowledgedAt: z.date().optional(),
  resolvedAt: z.date().optional()
});

// Analytics Event Schema
export const AnalyticsEventSchema = z.object({
  eventType: z.enum(['METRICS_UPDATED', 'ALERT_TRIGGERED', 'INSIGHT_GENERATED', 'CALIBRATION_ADJUSTED']),
  timestamp: z.date(),
  data: z.any(),
  correlationId: z.string().optional()
});

// Export TypeScript types
export type RealTimeMetrics = z.infer<typeof RealTimeMetricsSchema>;
export type ConfidenceEffectiveness = z.infer<typeof ConfidenceEffectivenessSchema>;
export type SignalAccuracy = z.infer<typeof SignalAccuracySchema>;
export type PerformanceBreakdown = z.infer<typeof PerformanceBreakdownSchema>;
export type PerformanceAnalyticsConfig = z.infer<typeof PerformanceAnalyticsConfigSchema>;
export type LearningInsight = z.infer<typeof LearningInsightSchema>;
export type PerformanceAlert = z.infer<typeof PerformanceAlertSchema>;
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// Validation helper functions
export const validateRealTimeMetrics = (data: unknown): RealTimeMetrics => {
  return RealTimeMetricsSchema.parse(data);
};

export const validateConfidenceEffectiveness = (data: unknown): ConfidenceEffectiveness => {
  return ConfidenceEffectivenessSchema.parse(data);
};

export const validateSignalAccuracy = (data: unknown): SignalAccuracy => {
  return SignalAccuracySchema.parse(data);
};

export const validatePerformanceBreakdown = (data: unknown): PerformanceBreakdown => {
  return PerformanceBreakdownSchema.parse(data);
};

export const validatePerformanceAnalyticsConfig = (data: unknown): PerformanceAnalyticsConfig => {
  return PerformanceAnalyticsConfigSchema.parse(data);
};

// Constants
export const DEFAULT_ANALYTICS_CONFIG: PerformanceAnalyticsConfig = {
  lookbackPeriodDays: 30,
  minTradesForAnalysis: 10,
  confidenceRanges: [0.4, 0.6, 0.8, 1.0],
  realTimeUpdateIntervalMs: 5000,
  riskFreeRate: 0.02,
  minWinRateThreshold: 0.55,
  minProfitFactorThreshold: 1.5,
  maxDrawdownThreshold: 0.05
};

export const CONFIDENCE_RANGES = {
  LOW: { min: 0.0, max: 0.6, label: 'Low Confidence' },
  MEDIUM: { min: 0.6, max: 0.8, label: 'Medium Confidence' },
  HIGH: { min: 0.8, max: 1.0, label: 'High Confidence' }
} as const;

export const SIGNAL_TYPES = [
  'trend',
  'momentum', 
  'volume',
  'ribbon',
  'fibonacci',
  'gamma'
] as const;

export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT_WIN_RATE: 0.70,
  GOOD_WIN_RATE: 0.60,
  ACCEPTABLE_WIN_RATE: 0.55,
  EXCELLENT_PROFIT_FACTOR: 2.0,
  GOOD_PROFIT_FACTOR: 1.5,
  ACCEPTABLE_PROFIT_FACTOR: 1.2,
  MAX_ACCEPTABLE_DRAWDOWN: 0.05,
  WARNING_DRAWDOWN: 0.03,
  EXCELLENT_SHARPE: 2.0,
  GOOD_SHARPE: 1.0,
  ACCEPTABLE_SHARPE: 0.5
} as const;

// Error types
export class AnalyticsError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: 'CALCULATION' | 'DATA' | 'CONFIGURATION' | 'SYSTEM' = 'SYSTEM'
  ) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

export class AnalyticsValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'AnalyticsValidationError';
  }
}