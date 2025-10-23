import { z } from 'zod';
import { MarketRegime, SignalSource, ExitReason } from '../../models/PaperTradingTypes';

// Trade Outcome Analysis Schema
export const TradeOutcomeAnalysisSchema = z.object({
  signalId: z.string(),
  ticker: z.string().min(1).max(10),
  predictedConfidence: z.number().min(0).max(1),
  actualOutcome: z.enum(['WIN', 'LOSS']),
  actualOutcomeValue: z.number().min(0).max(1),
  pnl: z.number(),
  pnlPercent: z.number(),
  holdingPeriod: z.number().nonnegative(),
  marketRegime: z.enum(['BULL', 'BEAR', 'NEUTRAL']),
  signalSource: z.enum(['REGIMECOMPASS', 'READYSETGO', 'MANUAL']),
  exitReason: z.string(),
  predictionError: z.number().nonnegative(),
  calibrationScore: z.number().nonnegative(),
  timestamp: z.date()
});

// Confidence Calibration Schema
export const ConfidenceCalibrationSchema = z.object({
  confidenceRange: z.string(),
  minConfidence: z.number().min(0).max(1),
  maxConfidence: z.number().min(0).max(1),
  totalTrades: z.number().int().nonnegative(),
  actualWinRate: z.number().min(0).max(1),
  expectedWinRate: z.number().min(0).max(1),
  calibrationError: z.number().min(-1).max(1),
  recommendedAdjustment: z.number().min(-0.2).max(0.2),
  reliability: z.number().min(0).max(1),
  lastUpdated: z.date()
});

// Signal Pattern Schema
export const SignalPatternSchema = z.object({
  patternId: z.string(),
  signalType: z.string(),
  patternDescription: z.string(),
  conditions: z.record(z.any()),
  historicalPerformance: z.object({
    totalOccurrences: z.number().int().nonnegative(),
    successfulTrades: z.number().int().nonnegative(),
    successRate: z.number().min(0).max(1),
    averagePnL: z.number(),
    averageHoldingPeriod: z.number().nonnegative()
  }),
  effectiveness: z.number().min(0).max(1),
  recommendedWeight: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  lastSeen: z.date(),
  createdAt: z.date()
});

// Signal Effectiveness Weighting Schema
export const SignalEffectivenessWeightingSchema = z.object({
  signalType: z.string(),
  currentWeight: z.number().min(0).max(1),
  recommendedWeight: z.number().min(0).max(1),
  effectiveness: z.number().min(0).max(1),
  totalContributions: z.number().int().nonnegative(),
  successfulContributions: z.number().int().nonnegative(),
  averageContribution: z.number().nonnegative(),
  weightAdjustment: z.number().min(-0.2).max(0.2),
  lastCalibrated: z.date()
});

// Learning Insight Schema
export const LearningInsightSchema = z.object({
  id: z.string(),
  category: z.enum(['CONFIDENCE_CALIBRATION', 'SIGNAL_EFFECTIVENESS', 'PATTERN_RECOGNITION', 'MARKET_REGIME', 'RISK_MANAGEMENT']),
  title: z.string().min(1),
  description: z.string().min(1),
  impact: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  actionable: z.boolean(),
  recommendation: z.string(),
  supportingData: z.any(),
  confidence: z.number().min(0).max(1),
  priority: z.number().int().min(1).max(10),
  generatedAt: z.date(),
  implementedAt: z.date().optional(),
  status: z.enum(['PENDING', 'IMPLEMENTED', 'REJECTED'])
});

// Algorithm Learning Configuration Schema
export const AlgorithmLearningConfigSchema = z.object({
  minTradesForCalibration: z.number().int().positive().default(20),
  calibrationUpdateFrequency: z.number().positive().default(24),
  maxCalibrationAdjustment: z.number().positive().max(0.5).default(0.2),
  minPatternOccurrences: z.number().int().positive().default(5),
  patternConfidenceThreshold: z.number().min(0).max(1).default(0.7),
  weightAdjustmentRate: z.number().positive().max(0.5).default(0.1),
  minSignalContributions: z.number().int().positive().default(10),
  insightGenerationFrequency: z.number().positive().default(12),
  minInsightConfidence: z.number().min(0).max(1).default(0.6),
  enableBoundedAdjustments: z.boolean().default(true),
  adjustmentDecayRate: z.number().min(0).max(1).default(0.95),
  validationSplitRatio: z.number().min(0.1).max(0.5).default(0.2)
});

// Learning Performance Metrics Schema
export const LearningPerformanceMetricsSchema = z.object({
  calibrationAccuracy: z.number().min(0).max(1),
  patternRecognitionRate: z.number().min(0).max(1),
  signalWeightOptimization: z.number().min(0).max(1),
  insightGenerationRate: z.number().nonnegative(),
  implementationSuccessRate: z.number().min(0).max(1),
  overfittingRisk: z.number().min(0).max(1),
  learningVelocity: z.number().nonnegative(),
  confidenceImprovement: z.number(),
  lastLearningCycle: z.date(),
  totalLearningCycles: z.number().int().nonnegative()
});

// Learning Event Schema
export const LearningEventSchema = z.object({
  eventType: z.enum(['CALIBRATION_UPDATED', 'PATTERN_RECOGNIZED', 'INSIGHT_GENERATED', 'WEIGHT_ADJUSTED', 'OVERFITTING_DETECTED']),
  timestamp: z.date(),
  data: z.any(),
  confidence: z.number().min(0).max(1).optional(),
  impact: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  correlationId: z.string().optional()
});

// Overfitting Detection Schema
export const OverfittingDetectionSchema = z.object({
  detectionMethod: z.enum(['VALIDATION_SPLIT', 'CROSS_VALIDATION', 'STATISTICAL_TEST']),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  indicators: z.array(z.string()),
  trainingAccuracy: z.number().min(0).max(1),
  validationAccuracy: z.number().min(0).max(1),
  accuracyGap: z.number().nonnegative(),
  recommendation: z.string(),
  detectedAt: z.date()
});

// Export TypeScript types
export type TradeOutcomeAnalysis = z.infer<typeof TradeOutcomeAnalysisSchema>;
export type ConfidenceCalibration = z.infer<typeof ConfidenceCalibrationSchema>;
export type SignalPattern = z.infer<typeof SignalPatternSchema>;
export type SignalEffectivenessWeighting = z.infer<typeof SignalEffectivenessWeightingSchema>;
export type LearningInsight = z.infer<typeof LearningInsightSchema>;
export type AlgorithmLearningConfig = z.infer<typeof AlgorithmLearningConfigSchema>;
export type LearningPerformanceMetrics = z.infer<typeof LearningPerformanceMetricsSchema>;
export type LearningEvent = z.infer<typeof LearningEventSchema>;
export type OverfittingDetection = z.infer<typeof OverfittingDetectionSchema>;

// Validation helper functions
export const validateTradeOutcomeAnalysis = (data: unknown): TradeOutcomeAnalysis => {
  return TradeOutcomeAnalysisSchema.parse(data);
};

export const validateConfidenceCalibration = (data: unknown): ConfidenceCalibration => {
  return ConfidenceCalibrationSchema.parse(data);
};

export const validateSignalPattern = (data: unknown): SignalPattern => {
  return SignalPatternSchema.parse(data);
};

export const validateLearningInsight = (data: unknown): LearningInsight => {
  return LearningInsightSchema.parse(data);
};

export const validateAlgorithmLearningConfig = (data: unknown): AlgorithmLearningConfig => {
  return AlgorithmLearningConfigSchema.parse(data);
};

// Constants
export const DEFAULT_LEARNING_CONFIG: AlgorithmLearningConfig = {
  minTradesForCalibration: 20,
  calibrationUpdateFrequency: 24,
  maxCalibrationAdjustment: 0.2,
  minPatternOccurrences: 5,
  patternConfidenceThreshold: 0.7,
  weightAdjustmentRate: 0.1,
  minSignalContributions: 10,
  insightGenerationFrequency: 12,
  minInsightConfidence: 0.6,
  enableBoundedAdjustments: true,
  adjustmentDecayRate: 0.95,
  validationSplitRatio: 0.2
};

export const SIGNAL_TYPES = [
  'trend',
  'momentum',
  'volume',
  'ribbon',
  'fibonacci',
  'gamma'
] as const;

export const CONFIDENCE_RANGES = [
  { min: 0.0, max: 0.5, label: 'Very Low' },
  { min: 0.5, max: 0.6, label: 'Low' },
  { min: 0.6, max: 0.7, label: 'Medium-Low' },
  { min: 0.7, max: 0.8, label: 'Medium-High' },
  { min: 0.8, max: 0.9, label: 'High' },
  { min: 0.9, max: 1.0, label: 'Very High' }
] as const;

export const LEARNING_THRESHOLDS = {
  EXCELLENT_CALIBRATION: 0.95,
  GOOD_CALIBRATION: 0.85,
  ACCEPTABLE_CALIBRATION: 0.75,
  POOR_CALIBRATION: 0.65,
  EXCELLENT_PATTERN_RECOGNITION: 0.90,
  GOOD_PATTERN_RECOGNITION: 0.80,
  ACCEPTABLE_PATTERN_RECOGNITION: 0.70,
  HIGH_OVERFITTING_RISK: 0.15,
  MEDIUM_OVERFITTING_RISK: 0.10,
  LOW_OVERFITTING_RISK: 0.05
} as const;

export const INSIGHT_PRIORITIES = {
  CRITICAL: 10,
  HIGH: 8,
  MEDIUM: 5,
  LOW: 2,
  INFORMATIONAL: 1
} as const;

// Error types
export class LearningError extends Error {
  constructor(
    message: string,
    public code: string,
    public category: 'CALIBRATION' | 'PATTERN_RECOGNITION' | 'OVERFITTING' | 'DATA' | 'CONFIGURATION' = 'DATA'
  ) {
    super(message);
    this.name = 'LearningError';
  }
}

export class OverfittingError extends Error {
  constructor(
    message: string,
    public riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    public indicators: string[]
  ) {
    super(message);
    this.name = 'OverfittingError';
  }
}

export class CalibrationError extends Error {
  constructor(
    message: string,
    public confidenceRange: string,
    public calibrationError: number
  ) {
    super(message);
    this.name = 'CalibrationError';
  }
}

// Utility functions
export function calculateBrierScore(predictions: number[], outcomes: number[]): number {
  if (predictions.length !== outcomes.length) {
    throw new Error('Predictions and outcomes arrays must have the same length');
  }
  
  const score = predictions.reduce((sum, pred, i) => {
    return sum + Math.pow(pred - outcomes[i], 2);
  }, 0);
  
  return score / predictions.length;
}

export function calculateCalibrationError(predictions: number[], outcomes: number[]): number {
  if (predictions.length === 0) return 0;
  
  const avgPrediction = predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length;
  const avgOutcome = outcomes.reduce((sum, outcome) => sum + outcome, 0) / outcomes.length;
  
  return avgOutcome - avgPrediction;
}

export function detectOverfitting(
  trainingAccuracy: number,
  validationAccuracy: number,
  threshold: number = 0.1
): boolean {
  return (trainingAccuracy - validationAccuracy) > threshold;
}

export function boundAdjustment(adjustment: number, maxAdjustment: number): number {
  return Math.max(-maxAdjustment, Math.min(maxAdjustment, adjustment));
}

export function calculateReliability(predictions: number[], outcomes: number[]): number {
  if (predictions.length === 0) return 0;
  
  const variance = predictions.reduce((sum, pred, i) => {
    return sum + Math.pow(pred - outcomes[i], 2);
  }, 0) / predictions.length;
  
  return Math.max(0, 1 - variance);
}