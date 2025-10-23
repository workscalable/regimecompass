import { MarketBasedRiskConfig } from './MarketBasedRiskAdjustments';

/**
 * Default Market-Based Risk Adjustment Configuration
 * 
 * Production-ready settings for market condition-based risk adjustments
 * based on institutional risk management best practices
 */

export const DEFAULT_MARKET_RISK_CONFIG: MarketBasedRiskConfig = {
  // Fibonacci zone multipliers - EXHAUSTION zones blocked completely
  fibZoneMultipliers: {
    'COMPRESSION': 1.2,      // Increase size in compression (good setups)
    'MID_EXPANSION': 1.0,    // Normal size
    'FULL_EXPANSION': 0.8,   // Reduce size (late in move)
    'OVER_EXTENSION': 0.4,   // Significantly reduce (risky)
    'EXHAUSTION': 0.0        // Block trades completely
  },

  // VIX-based thresholds and multipliers
  vixThresholds: {
    low: 15,        // Low volatility threshold
    medium: 25,     // Medium volatility threshold  
    high: 35,       // High volatility threshold
    extreme: 50     // Extreme volatility threshold
  },
  vixMultipliers: {
    low: 1.0,       // No adjustment for low VIX
    medium: 0.8,    // 20% reduction for medium VIX
    high: 0.5,      // 50% reduction for high VIX (requirement)
    extreme: 0.2    // 80% reduction for extreme VIX
  },

  // Market regime adjustments
  regimeMultipliers: {
    'BULL_MARKET': 1.1,        // Slightly increase in bull markets
    'BEAR_MARKET': 0.7,        // Reduce significantly in bear markets
    'SIDEWAYS': 0.9,           // Slight reduction in sideways markets
    'HIGH_VOLATILITY': 0.6,    // Major reduction in high vol
    'LOW_VOLATILITY': 1.0      // Normal sizing in low vol
  },

  // Market breadth thresholds and multipliers
  breadthThresholds: {
    strong: 0.7,    // 70% of stocks above moving average
    neutral: 0.3,   // 30-70% range
    weak: 0.3       // Below 30%
  },
  breadthMultipliers: {
    strong: 1.1,    // Increase size with strong breadth
    neutral: 1.0,   // Normal size
    weak: 0.7       // Reduce size with weak breadth
  },

  // Sector rotation impact
  sectorRotationMultipliers: {
    favorable: 1.1,     // Increase when rotation is favorable
    neutral: 1.0,       // Normal sizing
    unfavorable: 0.8    // Reduce when rotation is unfavorable
  },

  // Update frequency
  updateIntervalMinutes: 5,   // Update every 5 minutes

  // Emergency override settings
  emergencyOverrides: {
    enabled: true,
    maxReduction: 0.1,      // 10% minimum position size
    triggerConditions: [
      'VIX > 50',
      'SPY daily change > 5%',
      'Put/Call ratio > 2.0',
      'Inverted yield curve + VIX > 30'
    ]
  }
};

/**
 * Conservative configuration for high-risk periods
 */
export const CONSERVATIVE_MARKET_RISK_CONFIG: Partial<MarketBasedRiskConfig> = {
  fibZoneMultipliers: {
    'COMPRESSION': 1.0,      // No increase even in compression
    'MID_EXPANSION': 0.8,    // Reduce normal sizing
    'FULL_EXPANSION': 0.5,   // Major reduction
    'OVER_EXTENSION': 0.2,   // Minimal sizing
    'EXHAUSTION': 0.0        // Still blocked
  },
  vixMultipliers: {
    low: 0.9,       // Reduce even in low VIX
    medium: 0.6,    // More aggressive reduction
    high: 0.3,      // Very conservative
    extreme: 0.1    // Minimal sizing
  },
  regimeMultipliers: {
    'BULL_MARKET': 0.9,        // Conservative even in bull
    'BEAR_MARKET': 0.5,        // Very conservative in bear
    'SIDEWAYS': 0.7,           // Reduced sideways
    'HIGH_VOLATILITY': 0.4,    // Minimal in high vol
    'LOW_VOLATILITY': 0.8      // Still conservative
  }
};

/**
 * Aggressive configuration for low-risk periods
 */
export const AGGRESSIVE_MARKET_RISK_CONFIG: Partial<MarketBasedRiskConfig> = {
  fibZoneMultipliers: {
    'COMPRESSION': 1.5,      // Significant increase in compression
    'MID_EXPANSION': 1.2,    // Increase normal sizing
    'FULL_EXPANSION': 1.0,   // Normal sizing even late
    'OVER_EXTENSION': 0.7,   // Less conservative
    'EXHAUSTION': 0.0        // Still blocked (safety)
  },
  vixMultipliers: {
    low: 1.2,       // Increase in low VIX
    medium: 1.0,    // No reduction in medium VIX
    high: 0.7,      // Less aggressive reduction
    extreme: 0.4    // Still conservative in extreme
  },
  regimeMultipliers: {
    'BULL_MARKET': 1.3,        // Aggressive in bull markets
    'BEAR_MARKET': 0.8,        // Less conservative in bear
    'SIDEWAYS': 1.0,           // Normal in sideways
    'HIGH_VOLATILITY': 0.8,    // Less reduction
    'LOW_VOLATILITY': 1.2      // Increase in low vol
  }
};

/**
 * Get market risk configuration based on overall market conditions
 */
export function getMarketRiskConfigForConditions(
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH',
  vix: number,
  regime: string
): MarketBasedRiskConfig {
  const baseConfig = { ...DEFAULT_MARKET_RISK_CONFIG };
  
  if (overallRisk === 'HIGH' || vix > 35) {
    return {
      ...baseConfig,
      ...CONSERVATIVE_MARKET_RISK_CONFIG,
      fibZoneMultipliers: { ...baseConfig.fibZoneMultipliers, ...CONSERVATIVE_MARKET_RISK_CONFIG.fibZoneMultipliers },
      vixMultipliers: { ...baseConfig.vixMultipliers, ...CONSERVATIVE_MARKET_RISK_CONFIG.vixMultipliers },
      regimeMultipliers: { ...baseConfig.regimeMultipliers, ...CONSERVATIVE_MARKET_RISK_CONFIG.regimeMultipliers }
    };
  } else if (overallRisk === 'LOW' && vix < 20 && regime === 'BULL_MARKET') {
    return {
      ...baseConfig,
      ...AGGRESSIVE_MARKET_RISK_CONFIG,
      fibZoneMultipliers: { ...baseConfig.fibZoneMultipliers, ...AGGRESSIVE_MARKET_RISK_CONFIG.fibZoneMultipliers },
      vixMultipliers: { ...baseConfig.vixMultipliers, ...AGGRESSIVE_MARKET_RISK_CONFIG.vixMultipliers },
      regimeMultipliers: { ...baseConfig.regimeMultipliers, ...AGGRESSIVE_MARKET_RISK_CONFIG.regimeMultipliers }
    };
  }
  
  return baseConfig;
}

/**
 * Validate market risk configuration
 */
export function validateMarketRiskConfig(config: MarketBasedRiskConfig): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate Fibonacci zone multipliers
  if (config.fibZoneMultipliers.EXHAUSTION !== 0) {
    errors.push('EXHAUSTION zone multiplier must be 0 (requirement)');
  }

  // Validate VIX thresholds are in ascending order
  const vixThresholds = [
    config.vixThresholds.low,
    config.vixThresholds.medium,
    config.vixThresholds.high,
    config.vixThresholds.extreme
  ];
  
  for (let i = 1; i < vixThresholds.length; i++) {
    if (vixThresholds[i] <= vixThresholds[i - 1]) {
      errors.push('VIX thresholds must be in ascending order');
      break;
    }
  }

  // Validate VIX multipliers are in descending order
  const vixMultipliers = [
    config.vixMultipliers.low,
    config.vixMultipliers.medium,
    config.vixMultipliers.high,
    config.vixMultipliers.extreme
  ];
  
  for (let i = 1; i < vixMultipliers.length; i++) {
    if (vixMultipliers[i] >= vixMultipliers[i - 1]) {
      warnings.push('VIX multipliers should generally decrease with higher volatility');
      break;
    }
  }

  // Check for requirement compliance
  if (config.vixMultipliers.high > 0.5) {
    errors.push('VIX high multiplier must be <= 0.5 (50% reduction requirement)');
  }

  // Validate emergency override settings
  if (config.emergencyOverrides.maxReduction > 0.2) {
    warnings.push('Emergency max reduction > 20% may be too permissive');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}