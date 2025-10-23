import { z } from 'zod';

// Basic type schemas
export const RegimeTypeSchema = z.enum(['BULL', 'BEAR', 'NEUTRAL']);

export const VolatilityTrendSchema = z.enum(['rising', 'falling', 'flat']);

export const TradingBiasSchema = z.enum(['bullish', 'bearish', 'neutral']);

export const DivergenceTypeSchema = z.enum(['bullish', 'bearish', 'none']);

export const ThrustTypeSchema = z.enum(['up', 'down', 'none']);

export const TimeframeTypeSchema = z.enum(['short', 'medium', 'long']);

export const RecommendationTypeSchema = z.enum(['BUY', 'SELL', 'HOLD', 'AVOID']);

export const ConfidenceLevelSchema = z.enum(['low', 'medium', 'high']);

// Market data schemas
export const BreadthDataSchema = z.object({
  breadthPct: z.number().min(0).max(1),
  advancingStocks: z.number().int().nonnegative(),
  decliningStocks: z.number().int().nonnegative(),
  unchangedStocks: z.number().int().nonnegative(),
  newHighs: z.number().int().nonnegative(),
  newLows: z.number().int().nonnegative(),
  advanceDeclineRatio: z.number().positive(),
});

export const IndexDataSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().nonnegative(),
  ema20: z.number().positive(),
  ema50: z.number().positive(),
  trendScore9: z.number().int().min(-9).max(9),
  atr14: z.number().positive(),
  vix: z.number().positive().optional(),
  gex: z.number().optional(),
  zeroGammaDist: z.number().optional(),
  rsi: z.number().min(0).max(100).optional(),
  macd: z.number().optional(),
  timestamp: z.date(),
});

export const SectorDataSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().nonnegative(),
  trendScore9: z.number().int().min(-9).max(9),
  relativeStrength: z.number(),
  recommendation: RecommendationTypeSchema,
  weight: z.number().min(0).max(1).optional(),
  timestamp: z.date(),
});

export const VIXDataSchema = z.object({
  value: z.number().positive(),
  change: z.number(),
  changePercent: z.number(),
  trend: VolatilityTrendSchema,
  fiveDayChange: z.number(),
  timestamp: z.date(),
});

export const GammaDataSchema = z.object({
  gex: z.number(),
  zeroGammaDist: z.number(),
  gammaFlip: z.number(),
  bias: z.enum(['supportive', 'suppressive', 'neutral']),
  timestamp: z.date(),
});

// Regime classification schemas
export const RegimeFactorsSchema = z.object({
  breadth: z.boolean(),
  emaAlignment: z.boolean(),
  trendScore: z.boolean(),
  volatility: z.boolean(),
  gamma: z.boolean(),
});

export const RegimeClassificationSchema = z.object({
  regime: RegimeTypeSchema,
  confidence: z.number().min(0).max(1),
  strength: z.number().min(0).max(100),
  factors: RegimeFactorsSchema,
  timestamp: z.date(),
  previousRegime: RegimeTypeSchema.optional(),
  regimeDuration: z.number().int().nonnegative(),
});

export const EarlyWarningSignalsSchema = z.object({
  bullToBearWarning: z.boolean(),
  bearToBullWarning: z.boolean(),
  confirmationLevel: ConfidenceLevelSchema,
  warningFactors: z.array(z.string()),
  timeframe: z.string(),
});

// Predictive signals schemas
export const MomentumDivergenceSchema = z.object({
  type: DivergenceTypeSchema,
  strength: z.number().min(0).max(1),
  timeframe: TimeframeTypeSchema,
  rsiDivergence: z.boolean(),
  macdDivergence: z.boolean(),
  hiddenDivergence: z.boolean(),
  pricePoints: z.array(z.number()),
  indicatorPoints: z.array(z.number()),
});

export const VolumeAnalysisSchema = z.object({
  confirmation: z.boolean(),
  thrust: ThrustTypeSchema,
  exhaustion: z.boolean(),
  volumeSpike: z.boolean(),
  accumulationDistribution: z.number(),
  volumeRatio: z.number().positive(),
  trend: z.enum(['increasing', 'decreasing', 'stable']),
});

export const OptionsFlowSchema = z.object({
  bias: TradingBiasSchema,
  confidence: z.number().min(0).max(1),
  unusualActivity: z.boolean(),
  callVolume: z.number().nonnegative(),
  putVolume: z.number().nonnegative(),
  putCallRatio: z.number().positive(),
  impliedVolatilityTrend: VolatilityTrendSchema,
  largeBlockTrades: z.number().int().nonnegative(),
  forwardBias: TradingBiasSchema,
});

export const ProjectedLevelsSchema = z.object({
  support: z.array(z.number().positive()),
  resistance: z.array(z.number().positive()),
  pivot: z.number().positive(),
  expectedMove: z.number().positive(),
  projectedUpside: z.number().positive(),
  projectedDownside: z.number().positive(),
  expectedRange: z.tuple([z.number().positive(), z.number().positive()]),
});

export const RegimeProbabilitySchema = z.object({
  nextWeek: z.object({
    BULL: z.number().min(0).max(1),
    BEAR: z.number().min(0).max(1),
    NEUTRAL: z.number().min(0).max(1),
  }),
  nextMonth: z.object({
    BULL: z.number().min(0).max(1),
    BEAR: z.number().min(0).max(1),
    NEUTRAL: z.number().min(0).max(1),
  }),
});

export const InstitutionalFlowSchema = z.object({
  netOptionsFlow: z.number(),
  blockTradeRatio: z.number().min(0).max(1),
  darkPoolActivity: z.number().nonnegative(),
  accumulationDistribution: z.number(),
  forwardBias: z.enum(['accumulation', 'distribution', 'neutral']),
  smartMoneyFlow: z.number(),
});

export const PredictiveSignalsSchema = z.object({
  momentumDivergence: MomentumDivergenceSchema,
  volumeAnalysis: VolumeAnalysisSchema,
  optionsFlow: OptionsFlowSchema,
  projectedLevels: ProjectedLevelsSchema,
  regimeProbability: RegimeProbabilitySchema,
  institutionalFlow: InstitutionalFlowSchema.optional(),
});

// Trading and risk management schemas
export const TradingCandidateSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['LONG', 'SHORT', 'HEDGE']),
  confidence: z.number().min(0).max(1),
  entry: z.number().positive(),
  stopLoss: z.number().positive(),
  target: z.number().positive(),
  positionSize: z.number().positive(),
  reasoning: z.array(z.string()),
  sector: z.string().optional(),
  atr: z.number().positive(),
  riskReward: z.number().positive(),
  timeframe: z.string(),
});

export const RiskMetricsSchema = z.object({
  positionSizeFactor: z.number().positive(),
  stopLossPct: z.number().positive(),
  targetATRx: z.number().positive(),
  maxDrawdown: z.number().min(0).max(1),
  volatilityAdjustment: z.number().positive(),
  portfolioHeat: z.number().min(0).max(1),
  vixAdjustment: z.number().positive(),
  correlationRisk: z.number().min(0).max(1),
});

export const PositionSizingDataSchema = z.object({
  baseSize: z.number().positive(),
  adjustedSize: z.number().positive(),
  riskPerTrade: z.number().positive(),
  maxPositionSize: z.number().positive(),
  volatilityFactor: z.number().positive(),
  accountSize: z.number().positive(),
  currentExposure: z.number().min(0).max(1),
});

export const PortfolioMetricsSchema = z.object({
  totalExposure: z.number().min(0).max(1),
  longExposure: z.number().min(0).max(1),
  shortExposure: z.number().min(0).max(1),
  hedgeRatio: z.number().min(0).max(1),
  sectorConcentration: z.record(z.string(), z.number().min(0).max(1)),
  drawdown: z.number().min(0).max(1),
  sharpeRatio: z.number().optional(),
  maxDrawdownLimit: z.number().min(0).max(1),
});

// Sector analysis schemas
export const SectorScoresSchema = z.record(z.string(), z.number().int().min(-9).max(9));

export const SectorRecommendationsSchema = z.object({
  overweight: z.array(z.string()),
  underweight: z.array(z.string()),
  neutral: z.array(z.string()),
  rotationSignal: z.enum(['into_growth', 'into_value', 'into_defensive', 'mixed']),
});

export const SectorAllocationSchema = z.object({
  sector: z.string(),
  currentWeight: z.number().min(0).max(1),
  recommendedWeight: z.number().min(0).max(1),
  adjustment: z.number(),
  reasoning: z.string(),
});

// Forward-looking data schemas
export const ForwardLookingDataSchema = z.object({
  expectedRegimeChange: z.number().min(0).max(100),
  expectedChangeTimeframe: z.enum(['1-3 days', '3-7 days', '1-2 weeks', '2-4 weeks']),
  recommendedAction: z.enum(['aggressive', 'cautious', 'wait', 'hedge']),
  keyLevelsToWatch: z.array(z.number().positive()),
  catalysts: z.array(z.string()),
});

// Derived signals schema
export const DerivedSignalsSchema = z.object({
  volatilityTrend: VolatilityTrendSchema,
  momentumScore: z.number(),
  regimeStrength: z.number().min(0).max(100),
  breadthMomentum: z.number(),
  trendConsistency: z.number().min(0).max(1),
  marketStructure: z.enum(['healthy', 'deteriorating', 'oversold', 'overbought']),
});

// Main market snapshot schema
export const MarketSnapshotSchema = z.object({
  timestamp: z.date(),
  regime: RegimeTypeSchema,
  regimeClassification: RegimeClassificationSchema,
  breadth: BreadthDataSchema,
  indexes: z.object({
    SPY: IndexDataSchema,
    QQQ: IndexDataSchema,
    IWM: IndexDataSchema,
  }).and(z.record(z.string(), IndexDataSchema)),
  sectors: z.record(z.string(), SectorDataSchema),
  vix: VIXDataSchema,
  gamma: GammaDataSchema,
  derivedSignals: DerivedSignalsSchema,
  predictiveSignals: PredictiveSignalsSchema,
  riskMetrics: RiskMetricsSchema,
  forwardLooking: ForwardLookingDataSchema,
  tradingCandidates: z.object({
    long: z.array(TradingCandidateSchema),
    hedge: z.array(TradingCandidateSchema),
    avoid: z.array(z.string()),
  }),
  sectorAnalysis: z.object({
    scores: SectorScoresSchema,
    recommendations: SectorRecommendationsSchema,
    allocation: z.array(SectorAllocationSchema),
  }),
  dataQuality: z.object({
    sources: z.array(z.string()),
    freshness: z.number().nonnegative(),
    completeness: z.number().min(0).max(1),
    reliability: ConfidenceLevelSchema,
  }),
});

// API response schemas
export const ServiceResponseSchema = z.object({
  data: z.any(),
  timestamp: z.date(),
  source: z.string(),
  status: z.enum(['success', 'error', 'cached', 'degraded']),
  error: z.string().optional(),
  cacheAge: z.number().optional(),
});

export const HealthStatusSchema = z.object({
  service: z.string(),
  status: z.enum(['online', 'offline', 'degraded']),
  responseTime: z.number().nonnegative(),
  lastCheck: z.date(),
  errorCount: z.number().int().nonnegative(),
  uptime: z.number().min(0).max(1),
});

export const SystemHealthSchema = z.object({
  overall: z.enum(['healthy', 'degraded', 'critical']),
  services: z.array(HealthStatusSchema),
  dataFreshness: z.object({
    marketData: z.number().nonnegative(),
    vixData: z.number().nonnegative(),
    optionsData: z.number().nonnegative(),
  }),
  performance: z.object({
    avgResponseTime: z.number().nonnegative(),
    cacheHitRate: z.number().min(0).max(1),
    errorRate: z.number().min(0).max(1),
  }),
  timestamp: z.date(),
});

// Configuration schemas
export const ApiConfigSchema = z.object({
  polygonApiKey: z.string().optional(),
  twelveDataApiKey: z.string().optional(),
  tradierApiKey: z.string().optional(),
  gexProvider: z.enum(['proxy', 'none']),
  rateLimits: z.object({
    polygon: z.number().int().positive(),
    twelveData: z.number().int().positive(),
    tradier: z.number().int().positive(),
  }),
  timeouts: z.object({
    default: z.number().int().positive(),
    polygon: z.number().int().positive(),
    twelveData: z.number().int().positive(),
    tradier: z.number().int().positive(),
  }),
});

export const TradingConfigSchema = z.object({
  riskPerTrade: z.number().min(0).max(1),
  maxPositionSize: z.number().min(0).max(1),
  maxDrawdown: z.number().min(0).max(1),
  vixThreshold: z.number().positive(),
  regimeConfidence: z.number().min(0).max(1),
  sectorConcentration: z.number().min(0).max(1),
});

// Export and integration schemas
export const ExportDataSchema = z.object({
  format: z.enum(['json', 'csv', 'webhook']),
  data: MarketSnapshotSchema,
  timestamp: z.date(),
  version: z.string(),
});

export const WebhookPayloadSchema = z.object({
  event: z.enum(['regime_change', 'signal_update', 'risk_alert']),
  data: MarketSnapshotSchema.partial(),
  timestamp: z.date(),
  severity: z.enum(['info', 'warning', 'critical']),
});

// Error schemas
export const ServiceErrorSchema = z.object({
  service: z.string(),
  message: z.string(),
  statusCode: z.number().int().optional(),
  retryable: z.boolean(),
  timestamp: z.date(),
});

export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.any(),
  expected: z.string(),
});

// Validation helper functions
export function validateMarketSnapshot(data: unknown) {
  try {
    return MarketSnapshotSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Market snapshot validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

export function validateIndexData(data: unknown) {
  try {
    return IndexDataSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Index data validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

export function validateSectorData(data: unknown) {
  try {
    return SectorDataSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Sector data validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

export function validateTradingCandidate(data: unknown) {
  try {
    return TradingCandidateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Trading candidate validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

export function validateApiResponse(data: unknown) {
  try {
    return ServiceResponseSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`API response validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

// Partial validation for updates
export const PartialMarketSnapshotSchema = MarketSnapshotSchema.partial();
export const PartialIndexDataSchema = IndexDataSchema.partial();
export const PartialSectorDataSchema = SectorDataSchema.partial();

export function validatePartialMarketSnapshot(data: unknown) {
  try {
    return PartialMarketSnapshotSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Partial market snapshot validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}