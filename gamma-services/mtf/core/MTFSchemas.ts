// File: /gamma-services/mtf/core/MTFSchemas.ts

import { z } from 'zod';

// Base schemas for MTF trading logic
export const TradeStateSchema = z.enum(['READY', 'SET', 'GO', 'TRADE', 'EXIT', 'ABORT']);

export const TimeframeSignalSchema = z.object({
  confidence: z.number().min(0).max(1),
  bias: z.enum(['LONG', 'SHORT', 'NEUTRAL']),
  powerCandle: z.boolean(),
  volumeSurge: z.boolean(),
  ribbonAlignment: z.number().min(0).max(1),
  momentumDivergence: z.number().min(-1).max(1),
  timestamp: z.number().positive()
});

export const MTFSignalBundleSchema = z.object({
  ticker: z.string().min(1).max(10),
  daily: TimeframeSignalSchema,
  hourly: TimeframeSignalSchema,
  thirty: TimeframeSignalSchema,
  regimeBias: z.number().min(-1).max(1),
  fibZone: z.number().min(0).max(5),
  gammaExposure: z.number().min(-1).max(1),
  vwapDeviation: z.number().min(-1).max(1),
  prevState: TradeStateSchema.optional(),
  sequenceStartTime: z.number().positive().optional()
});

export const TimeframeAlignmentSchema = z.object({
  daily: z.boolean(),
  hourly: z.boolean(),
  thirty: z.boolean()
});

export const RiskMetricsSchema = z.object({
  stopDistance: z.number().min(0).max(1),
  profitTarget: z.number().min(0).max(2),
  timeDecayBuffer: z.number().min(0).max(5)
});

export const TradeDecisionSchema = z.object({
  ticker: z.string().min(1).max(10),
  state: TradeStateSchema,
  confidence: z.number().min(0).max(1),
  mtfConfluence: z.number().min(0).max(1),
  size: z.number().min(0).max(10),
  direction: z.enum(['LONG', 'SHORT']),
  timestamp: z.string().datetime(),
  timeframeAlignment: TimeframeAlignmentSchema,
  notes: z.array(z.string()),
  riskMetrics: RiskMetricsSchema
});

export const TemporalContextSchema = z.object({
  sequenceAge: z.number().min(0),
  timeSinceExit: z.number().min(0),
  transitionCount: z.number().min(0),
  lastTransition: z.number().positive()
});

export const StateTransitionSchema = z.object({
  from: TradeStateSchema,
  to: TradeStateSchema,
  timestamp: z.number().positive(),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1)
});

export const SequenceDataSchema = z.object({
  ticker: z.string().min(1).max(10),
  currentState: TradeStateSchema,
  stateEntryTime: z.number().positive(),
  sequenceStartTime: z.number().positive(),
  lastTransitionTime: z.number().positive(),
  transitionHistory: z.array(StateTransitionSchema),
  cyclingPrevention: z.object({
    transitionCount: z.number().min(0),
    windowStart: z.number().positive(),
    blocked: z.boolean()
  })
});

export const AlertSchema = z.object({
  type: z.enum(['STATE_TRANSITION', 'CONFIDENCE_DECAY', 'RISK_ALERT', 'SYSTEM_STATUS']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  message: z.string().min(1),
  channels: z.array(z.enum(['slack', 'telegram', 'discord', 'dashboard'])),
  data: z.any().optional(),
  timestamp: z.number().positive()
});

export const TradeStateLogSchema = z.object({
  entries: z.array(TradeDecisionSchema),
  metadata: z.object({
    version: z.string(),
    createdAt: z.string().datetime(),
    lastUpdated: z.string().datetime()
  })
});

export const MTFConfigurationSchema = z.object({
  timeframeWeights: z.object({
    daily: z.number().min(0).max(1),
    hourly: z.number().min(0).max(1),
    thirty: z.number().min(0).max(1)
  }).refine(
    (weights) => Math.abs(weights.daily + weights.hourly + weights.thirty - 1.0) < 0.001,
    { message: "Timeframe weights must sum to 1.0" }
  ),
  confidenceThresholds: z.object({
    readyToSet: z.number().min(0).max(1),
    setToGo: z.number().min(0).max(1),
    goToTrade: z.number().min(0).max(1),
    tradeToExit: z.number().min(0).max(1)
  }),
  bonusMultipliers: z.object({
    powerCandle: z.number().min(0).max(0.2),
    volumeSurge: z.number().min(0).max(0.2),
    ribbonAlignment: z.number().min(0).max(0.2)
  }),
  riskAdjustments: z.object({
    highConfidenceMultiplier: z.number().min(0.5).max(5),
    mediumConfidenceMultiplier: z.number().min(0.5).max(5),
    lowConfidenceMultiplier: z.number().min(0.1).max(2),
    regimeBiasAdjustment: z.number().min(0).max(1)
  }),
  stateTiming: z.object({
    minimumStateDurations: z.object({
      READY: z.number().min(0).max(3600000),
      SET: z.number().min(0).max(3600000),
      GO: z.number().min(0).max(3600000),
      TRADE: z.number().min(0).max(3600000),
      EXIT: z.number().min(0).max(3600000),
      ABORT: z.number().min(0).max(3600000)
    }),
    sequenceTimeout: z.number().min(60000).max(86400000), // 1 minute to 24 hours
    cooldownPeriod: z.number().min(10000).max(3600000),   // 10 seconds to 1 hour
    maxTransitionsPerWindow: z.number().min(1).max(20),
    transitionWindow: z.number().min(60000).max(3600000)  // 1 minute to 1 hour
  }),
  fibonacciZones: z.object({
    compressionBonus: z.number().min(0).max(0.1),
    exhaustionPenalty: z.number().min(-0.2).max(0),
    extendedZoneStopMultiplier: z.number().min(0.1).max(2),
    extendedZoneTimeMultiplier: z.number().min(0.1).max(2)
  }),
  gammaExposure: z.object({
    maxAdjustment: z.number().min(0).max(0.5),
    adjustmentMultiplier: z.number().min(0).max(0.2),
    pinningRiskThreshold: z.number().min(0).max(1)
  }),
  alertSettings: z.object({
    enabled: z.boolean(),
    channels: z.object({
      slack: z.object({ enabled: z.boolean() }),
      telegram: z.object({ enabled: z.boolean() }),
      discord: z.object({ enabled: z.boolean() }),
      dashboard: z.object({ enabled: z.boolean() })
    }),
    cooldowns: z.object({
      LOW: z.number().min(1000).max(3600000),
      MEDIUM: z.number().min(1000).max(3600000),
      HIGH: z.number().min(1000).max(3600000),
      CRITICAL: z.number().min(1000).max(3600000)
    })
  }),
  persistence: z.object({
    logRetentionDays: z.number().min(1).max(365),
    maxLogEntries: z.number().min(100).max(100000),
    backupInterval: z.number().min(3600000).max(604800000), // 1 hour to 1 week
    compressionEnabled: z.boolean()
  })
});

// Type exports
export type TradeState = z.infer<typeof TradeStateSchema>;
export type TimeframeSignal = z.infer<typeof TimeframeSignalSchema>;
export type MTFSignalBundle = z.infer<typeof MTFSignalBundleSchema>;
export type TimeframeAlignment = z.infer<typeof TimeframeAlignmentSchema>;
export type RiskMetrics = z.infer<typeof RiskMetricsSchema>;
export type TradeDecision = z.infer<typeof TradeDecisionSchema>;
export type TemporalContext = z.infer<typeof TemporalContextSchema>;
export type StateTransition = z.infer<typeof StateTransitionSchema>;
export type SequenceData = z.infer<typeof SequenceDataSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type TradeStateLog = z.infer<typeof TradeStateLogSchema>;
export type MTFConfiguration = z.infer<typeof MTFConfigurationSchema>;

// Validation utility class
export class MTFValidator {
  public static validateSignalBundle(data: unknown): MTFSignalBundle {
    try {
      return MTFSignalBundleSchema.parse(data);
    } catch (error) {
      throw new Error(`Invalid MTF Signal Bundle: ${error.message}`);
    }
  }

  public static validateTradeDecision(data: unknown): TradeDecision {
    try {
      return TradeDecisionSchema.parse(data);
    } catch (error) {
      throw new Error(`Invalid Trade Decision: ${error.message}`);
    }
  }

  public static validateConfiguration(data: unknown): MTFConfiguration {
    try {
      return MTFConfigurationSchema.parse(data);
    } catch (error) {
      throw new Error(`Invalid MTF Configuration: ${error.message}`);
    }
  }

  public static validateAlert(data: unknown): Alert {
    try {
      return AlertSchema.parse(data);
    } catch (error) {
      throw new Error(`Invalid Alert: ${error.message}`);
    }
  }

  public static validateTemporalContext(data: unknown): TemporalContext {
    try {
      return TemporalContextSchema.parse(data);
    } catch (error) {
      throw new Error(`Invalid Temporal Context: ${error.message}`);
    }
  }

  public static validateSequenceData(data: unknown): SequenceData {
    try {
      return SequenceDataSchema.parse(data);
    } catch (error) {
      throw new Error(`Invalid Sequence Data: ${error.message}`);
    }
  }

  public static validateTradeStateLog(data: unknown): TradeStateLog {
    try {
      return TradeStateLogSchema.parse(data);
    } catch (error) {
      throw new Error(`Invalid Trade State Log: ${error.message}`);
    }
  }

  // Partial validation for updates
  public static validatePartialConfiguration(data: unknown): Partial<MTFConfiguration> {
    try {
      return MTFConfigurationSchema.partial().parse(data);
    } catch (error) {
      throw new Error(`Invalid Partial MTF Configuration: ${error.message}`);
    }
  }

  // Validation with custom error handling
  public static safeValidateSignalBundle(data: unknown): { 
    success: boolean; 
    data?: MTFSignalBundle; 
    errors?: string[] 
  } {
    try {
      const validData = MTFSignalBundleSchema.parse(data);
      return { success: true, data: validData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: [error.message] };
    }
  }

  public static safeValidateConfiguration(data: unknown): { 
    success: boolean; 
    data?: MTFConfiguration; 
    errors?: string[] 
  } {
    try {
      const validData = MTFConfigurationSchema.parse(data);
      return { success: true, data: validData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { success: false, errors };
      }
      return { success: false, errors: [error.message] };
    }
  }

  // Utility methods for common validations
  public static isValidTicker(ticker: string): boolean {
    return /^[A-Z]{1,10}$/.test(ticker);
  }

  public static isValidConfidence(confidence: number): boolean {
    return confidence >= 0 && confidence <= 1;
  }

  public static isValidTimestamp(timestamp: number): boolean {
    return timestamp > 0 && timestamp <= Date.now() + 86400000; // Allow up to 24 hours in future
  }

  public static isValidState(state: string): state is TradeState {
    return ['READY', 'SET', 'GO', 'TRADE', 'EXIT', 'ABORT'].includes(state);
  }

  public static isValidDirection(direction: string): direction is 'LONG' | 'SHORT' {
    return ['LONG', 'SHORT'].includes(direction);
  }

  public static isValidPriority(priority: string): priority is 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    return ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority);
  }

  // Sanitization methods
  public static sanitizeTicker(ticker: string): string {
    return ticker.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 10);
  }

  public static sanitizeConfidence(confidence: number): number {
    return Math.max(0, Math.min(1, confidence));
  }

  public static sanitizeSize(size: number): number {
    return Math.max(0, Math.min(10, Math.round(size * 100) / 100));
  }

  // Validation summary for debugging
  public static getValidationSummary(data: unknown, schema: z.ZodSchema): {
    isValid: boolean;
    errorCount: number;
    errors: string[];
    warnings: string[];
  } {
    try {
      schema.parse(data);
      return {
        isValid: true,
        errorCount: 0,
        errors: [],
        warnings: []
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        const warnings = errors.filter(err => err.includes('optional') || err.includes('default'));
        
        return {
          isValid: false,
          errorCount: errors.length,
          errors: errors.filter(err => !warnings.includes(err)),
          warnings
        };
      }
      
      return {
        isValid: false,
        errorCount: 1,
        errors: [error.message],
        warnings: []
      };
    }
  }
}