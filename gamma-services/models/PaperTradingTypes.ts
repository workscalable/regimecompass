import { z } from 'zod';

// Core Enums
export const ContractType = z.enum(['CALL', 'PUT']);
export const PositionSide = z.enum(['LONG', 'SHORT']);
export const PositionStatus = z.enum(['OPEN', 'CLOSED', 'EXPIRED']);
export const ExitReason = z.enum(['PROFIT_TARGET', 'STOP_LOSS', 'TIME_DECAY', 'EXPIRATION', 'RISK_MANAGEMENT', 'MANUAL']);
export const MarketRegime = z.enum(['BULL', 'BEAR', 'NEUTRAL']);
export const SignalSource = z.enum(['REGIMECOMPASS', 'READYSETGO', 'MANUAL']);
export const Timeframe = z.enum(['SHORT', 'MEDIUM', 'LONG']);
export const TradeOutcome = z.enum(['WIN', 'LOSS']);
export const RiskEventType = z.enum(['REDUCE_POSITION', 'CLOSE_POSITION', 'HALT_TRADING', 'ALERT']);
export const RiskSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// Options Greeks Schema
export const OptionsGreeksSchema = z.object({
  delta: z.number().min(-1).max(1),
  gamma: z.number().min(0),
  theta: z.number().max(0),
  vega: z.number().min(0),
  rho: z.number(),
  impliedVolatility: z.number().min(0).max(5)
});

// Trade Signal Schema
export const TradeSignalSchema = z.object({
  signalId: z.string().min(1),
  ticker: z.string().min(1).max(10),
  side: PositionSide,
  confidence: z.number().min(0).max(1),
  conviction: z.number().min(0).max(1),
  expectedMove: z.number().min(0),
  timeframe: Timeframe,
  regime: MarketRegime,
  source: SignalSource,
  timestamp: z.date().optional().default(() => new Date())
});

// Paper Position Schema
export const PaperPositionSchema = z.object({
  id: z.string(),
  signalId: z.string(),
  ticker: z.string().min(1).max(10),
  optionSymbol: z.string().min(1),
  contractType: ContractType,
  strike: z.number().positive(),
  expiration: z.date(),
  side: PositionSide,
  quantity: z.number().int().positive(),
  entryPrice: z.number().positive(),
  currentPrice: z.number().nonnegative(),
  entryTimestamp: z.date(),
  exitTimestamp: z.date().optional(),
  exitPrice: z.number().nonnegative().optional(),
  pnl: z.number(),
  pnlPercent: z.number(),
  maxFavorableExcursion: z.number().nonnegative(),
  maxAdverseExcursion: z.number().nonpositive(),
  greeks: OptionsGreeksSchema,
  status: PositionStatus,
  confidence: z.number().min(0).max(1),
  conviction: z.number().min(0).max(1),
  regime: MarketRegime,
  exitReason: ExitReason.optional()
});

// Paper Order Schema
export const PaperOrderSchema = z.object({
  id: z.string(),
  ticker: z.string().min(1).max(10),
  optionSymbol: z.string().min(1),
  side: z.enum(['BUY', 'SELL']),
  quantity: z.number().int().positive(),
  price: z.number().positive(),
  type: ContractType,
  strike: z.number().positive(),
  expiration: z.string(),
  greeks: OptionsGreeksSchema,
  filled: z.boolean(),
  fillPrice: z.number().positive().optional(),
  timestamp: z.number()
});

// Trade Analysis Schema
export const TradeAnalysisSchema = z.object({
  signalId: z.string(),
  ticker: z.string().min(1).max(10),
  entryConfidence: z.number().min(0).max(1),
  exitConfidence: z.number().min(0).max(1),
  expectedMove: z.number().min(0),
  actualMove: z.number().min(0),
  pnl: z.number(),
  holdingPeriod: z.number().nonnegative(),
  maxFavorableExcursion: z.number().nonnegative(),
  maxAdverseExcursion: z.number().nonpositive(),
  exitReason: ExitReason,
  learnings: z.array(z.string())
});

// Risk Settings Schema
export const RiskSettingsSchema = z.object({
  maxRiskPerTrade: z.number().min(0).max(1).default(0.02),
  maxPortfolioHeat: z.number().min(0).max(1).default(0.20),
  maxDrawdown: z.number().min(0).max(1).default(0.10),
  maxConsecutiveLosses: z.number().int().min(1).default(3),
  maxPositionSize: z.number().min(0).max(1).default(0.10),
  stopLossPercent: z.number().min(0).max(1).default(0.50),
  profitTargetMultiple: z.number().min(1).default(2.0),
  timeDecayThreshold: z.number().min(0).max(1).default(0.30)
});

// Paper Account Schema
export const PaperAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  initialBalance: z.number().positive().default(100000),
  currentBalance: z.number().nonnegative(),
  totalPnL: z.number(),
  availableBalance: z.number().nonnegative(),
  marginUsed: z.number().nonnegative().default(0),
  riskSettings: RiskSettingsSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});

// Performance Metrics Schema
export const PerformanceMetricsSchema = z.object({
  totalTrades: z.number().int().nonnegative(),
  winningTrades: z.number().int().nonnegative(),
  losingTrades: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(100),
  totalPnL: z.number(),
  averageWin: z.number().nonnegative(),
  averageLoss: z.number().nonpositive(),
  profitFactor: z.number().nonnegative(),
  sharpeRatio: z.number().optional(),
  maxDrawdown: z.number().nonnegative(),
  maxDrawdownPercent: z.number().min(0).max(100),
  averageHoldingPeriod: z.number().nonnegative(),
  bestTrade: z.number(),
  worstTrade: z.number(),
  consecutiveWins: z.number().int().nonnegative(),
  consecutiveLosses: z.number().int().nonnegative(),
  accountBalance: z.number().nonnegative(),
  returnsPercent: z.number()
});

// Risk Validation Schema
export const RiskValidationSchema = z.object({
  approved: z.boolean(),
  reason: z.string().optional(),
  maxPositionSize: z.number().nonnegative(),
  riskScore: z.number().min(0).max(100),
  warnings: z.array(z.string())
});

// Risk Action Schema
export const RiskActionSchema = z.object({
  type: RiskEventType,
  positionId: z.string().optional(),
  severity: RiskSeverity,
  description: z.string(),
  autoExecute: z.boolean()
});

// Portfolio Risk Schema
export const PortfolioRiskSchema = z.object({
  totalExposure: z.number().nonnegative(),
  portfolioHeat: z.number().min(0).max(1),
  maxDrawdown: z.number().min(0).max(1),
  currentDrawdown: z.number().min(0).max(1),
  riskScore: z.number().min(0).max(100),
  concentrationRisk: z.number().min(0).max(1),
  correlationRisk: z.number().min(0).max(1)
});

// Market Data Schema
export const MarketDataSchema = z.object({
  ticker: z.string().min(1).max(10),
  price: z.number().positive(),
  timestamp: z.date(),
  options: z.record(z.string(), z.object({
    bid: z.number().nonnegative(),
    ask: z.number().positive(),
    midPrice: z.number().positive(),
    impliedVolatility: z.number().min(0).max(5),
    delta: z.number().min(-1).max(1),
    gamma: z.number().min(0),
    theta: z.number().max(0),
    vega: z.number().min(0)
  }))
});

// Option Contract Schema
export const OptionContractSchema = z.object({
  symbol: z.string().min(1),
  strike: z.number().positive(),
  expiration: z.date(),
  type: ContractType,
  bid: z.number().nonnegative(),
  ask: z.number().positive(),
  midPrice: z.number().positive(),
  volume: z.number().int().nonnegative(),
  openInterest: z.number().int().nonnegative(),
  impliedVolatility: z.number().min(0).max(5),
  greeks: OptionsGreeksSchema,
  daysToExpiration: z.number().int().nonnegative()
});

// Options Chain Schema
export const OptionsChainSchema = z.object({
  ticker: z.string().min(1).max(10),
  underlyingPrice: z.number().positive(),
  expirations: z.array(z.date()),
  calls: z.array(OptionContractSchema),
  puts: z.array(OptionContractSchema),
  timestamp: z.date()
});

// Learning Insight Schema
export const LearningInsightSchema = z.object({
  category: z.enum(['CONFIDENCE_CALIBRATION', 'MARKET_REGIME', 'OPTIONS_SELECTION', 'TIMING']),
  insight: z.string().min(1),
  confidence: z.number().min(0).max(1),
  supportingData: z.any(),
  actionable: z.boolean()
});

// Recommendation Schema
export const RecommendationSchema = z.object({
  type: z.enum(['POSITION_SIZING', 'ENTRY_TIMING', 'EXIT_STRATEGY', 'RISK_MANAGEMENT']),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  description: z.string().min(1),
  impact: z.string().min(1),
  implementation: z.string().min(1)
});

// Greeks Impact Schema
export const GreeksImpactSchema = z.object({
  deltaContribution: z.number(),
  gammaContribution: z.number(),
  thetaContribution: z.number(),
  vegaContribution: z.number(),
  totalGreeksImpact: z.number()
});

// Export TypeScript types
export type ContractType = z.infer<typeof ContractType>;
export type PositionSide = z.infer<typeof PositionSide>;
export type PositionStatus = z.infer<typeof PositionStatus>;
export type ExitReason = z.infer<typeof ExitReason>;
export type MarketRegime = z.infer<typeof MarketRegime>;
export type SignalSource = z.infer<typeof SignalSource>;
export type Timeframe = z.infer<typeof Timeframe>;
export type TradeOutcome = z.infer<typeof TradeOutcome>;
export type RiskEventType = z.infer<typeof RiskEventType>;
export type RiskSeverity = z.infer<typeof RiskSeverity>;

export type OptionsGreeks = z.infer<typeof OptionsGreeksSchema>;
export type TradeSignal = z.infer<typeof TradeSignalSchema>;
export type PaperPosition = z.infer<typeof PaperPositionSchema>;
export type PaperOrder = z.infer<typeof PaperOrderSchema>;
export type TradeAnalysis = z.infer<typeof TradeAnalysisSchema>;
export type RiskSettings = z.infer<typeof RiskSettingsSchema>;
export type PaperAccount = z.infer<typeof PaperAccountSchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;
export type RiskValidation = z.infer<typeof RiskValidationSchema>;
export type RiskAction = z.infer<typeof RiskActionSchema>;
export type PortfolioRisk = z.infer<typeof PortfolioRiskSchema>;
export type MarketData = z.infer<typeof MarketDataSchema>;
export type OptionContract = z.infer<typeof OptionContractSchema>;
export type OptionsChain = z.infer<typeof OptionsChainSchema>;
export type LearningInsight = z.infer<typeof LearningInsightSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type GreeksImpact = z.infer<typeof GreeksImpactSchema>;

// Validation helper functions
export const validateTradeSignal = (data: unknown): TradeSignal => {
  return TradeSignalSchema.parse(data);
};

export const validatePaperPosition = (data: unknown): PaperPosition => {
  return PaperPositionSchema.parse(data);
};

export const validateMarketData = (data: unknown): MarketData => {
  return MarketDataSchema.parse(data);
};

export const validateOptionContract = (data: unknown): OptionContract => {
  return OptionContractSchema.parse(data);
};

export const validateRiskSettings = (data: unknown): RiskSettings => {
  return RiskSettingsSchema.parse(data);
};

export const validatePerformanceMetrics = (data: unknown): PerformanceMetrics => {
  return PerformanceMetricsSchema.parse(data);
};

// Partial validation schemas for updates
export const PartialPaperPositionSchema = PaperPositionSchema.partial();
export const PartialRiskSettingsSchema = RiskSettingsSchema.partial();
export const PartialPaperAccountSchema = PaperAccountSchema.partial();

export type PartialPaperPosition = z.infer<typeof PartialPaperPositionSchema>;
export type PartialRiskSettings = z.infer<typeof PartialRiskSettingsSchema>;
export type PartialPaperAccount = z.infer<typeof PartialPaperAccountSchema>;

// Error types
export class PaperTradingValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'PaperTradingValidationError';
  }
}

export class PaperTradingError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'PaperTradingError';
  }
}

// Constants
export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxRiskPerTrade: 0.02,
  maxPortfolioHeat: 0.20,
  maxDrawdown: 0.10,
  maxConsecutiveLosses: 3,
  maxPositionSize: 0.10,
  stopLossPercent: 0.50,
  profitTargetMultiple: 2.0,
  timeDecayThreshold: 0.30
};

export const INITIAL_PAPER_BALANCE = 100000;

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4
} as const;

export const POSITION_SIZE_MULTIPLIERS = {
  HIGH_CONFIDENCE: 1.2,
  MEDIUM_CONFIDENCE: 1.0,
  LOW_CONFIDENCE: 0.8
} as const;