import { RiskManagementConfig } from './RiskManagementService';
import { DEFAULT_DRAWDOWN_CONFIG } from './defaultDrawdownConfig';
import { DEFAULT_MARKET_RISK_CONFIG } from './defaultMarketRiskConfig';

/**
 * Default Risk Management Configuration
 * 
 * Production-ready default settings for the Gamma Adaptive System
 * based on institutional risk management best practices
 */

export const DEFAULT_RISK_CONFIG: RiskManagementConfig = {
  // Core risk limits
  riskLimits: {
    maxRiskPerTrade: 0.02,        // 2% per trade
    maxPortfolioHeat: 0.20,       // 20% total portfolio heat
    maxDrawdown: 0.05,            // 5% maximum drawdown
    maxConsecutiveLosses: 2,      // 2 consecutive losses trigger reduction
    maxDailyLoss: 0.03,           // 3% maximum daily loss
    vixThreshold: 30              // VIX threshold for volatility adjustments
  },

  // Position sizing configuration
  positionSizing: {
    maxRiskPerTrade: 0.02,
    maxPortfolioHeat: 0.20,
    maxDrawdown: 0.05,
    
    // Fibonacci zone multipliers
    fibZoneMultipliers: {
      'COMPRESSION': 1.2,         // Increase size in compression
      'MID_EXPANSION': 1.0,       // Normal size
      'FULL_EXPANSION': 0.8,      // Reduce size
      'OVER_EXTENSION': 0.4,      // Significantly reduce
      'EXHAUSTION': 0.0           // No trades in exhaustion
    },
    
    // Confidence-based multipliers
    confidenceMultipliers: {
      high: 1.2,                  // >= 80% confidence
      medium: 1.0,                // 60-80% confidence
      low: 0.5                    // < 60% confidence
    },
    
    // Market regime adjustments
    regimeAdjustments: {
      'BULL_MARKET': 1.1,
      'BEAR_MARKET': 0.8,
      'SIDEWAYS': 0.9,
      'HIGH_VOLATILITY': 0.7,
      'LOW_VOLATILITY': 1.0
    },
    
    // VIX-based adjustments
    vixAdjustments: {
      low: 1.0,                   // VIX < 20
      medium: 0.8,                // VIX 20-30
      high: 0.5                   // VIX > 30
    }
  },

  // Alert system configuration
  alerts: {
    // Alert channels
    channels: [
      {
        type: 'DASHBOARD',
        config: { enabled: true }
      },
      {
        type: 'LOG',
        config: { enabled: true }
      },
      {
        type: 'WEBHOOK',
        config: { 
          enabled: false,
          endpoint: process.env.RISK_WEBHOOK_URL
        }
      },
      {
        type: 'EMAIL',
        config: { 
          enabled: false,
          recipients: process.env.RISK_EMAIL_RECIPIENTS?.split(',') || []
        }
      }
    ],

    // Alert thresholds
    thresholds: [
      {
        metric: 'PORTFOLIO_HEAT',
        warning: 0.15,              // 15% warning
        critical: 0.18,             // 18% critical
        enabled: true
      },
      {
        metric: 'DRAWDOWN',
        warning: 0.03,              // 3% warning
        critical: 0.045,            // 4.5% critical
        enabled: true
      },
      {
        metric: 'CONSECUTIVE_LOSSES',
        warning: 1,                 // 1 loss warning
        critical: 2,                // 2 losses critical
        enabled: true
      },
      {
        metric: 'DAILY_LOSS',
        warning: 0.02,              // 2% daily loss warning
        critical: 0.025,            // 2.5% daily loss critical
        enabled: true
      },
      {
        metric: 'VIX',
        warning: 25,                // VIX 25 warning
        critical: 35,               // VIX 35 critical
        enabled: true
      }
    ],

    // Escalation rules
    escalationRules: [
      {
        violationType: 'HEAT_EXCEEDED',
        severity: 'HIGH',
        delayMinutes: 5,
        channels: ['EMAIL', 'WEBHOOK'],
        autoActions: ['NOTIFY_ADMIN']
      },
      {
        violationType: 'HEAT_EXCEEDED',
        severity: 'CRITICAL',
        delayMinutes: 1,
        channels: ['EMAIL', 'SMS', 'WEBHOOK'],
        autoActions: ['HALT_TRADING', 'NOTIFY_ADMIN']
      },
      {
        violationType: 'DRAWDOWN_EXCEEDED',
        severity: 'CRITICAL',
        delayMinutes: 0,
        channels: ['EMAIL', 'SMS', 'WEBHOOK'],
        autoActions: ['HALT_TRADING', 'REDUCE_POSITIONS', 'NOTIFY_ADMIN']
      },
      {
        violationType: 'CONSECUTIVE_LOSSES',
        severity: 'HIGH',
        delayMinutes: 2,
        channels: ['EMAIL'],
        autoActions: ['NOTIFY_ADMIN']
      }
    ],

    // Automated actions
    autoActions: [
      {
        trigger: 'HEAT_EXCEEDED',
        severity: 'CRITICAL',
        action: 'HALT_TRADING',
        parameters: { reason: 'Portfolio heat exceeded critical threshold' }
      },
      {
        trigger: 'DRAWDOWN_EXCEEDED',
        severity: 'CRITICAL',
        action: 'REDUCE_POSITIONS',
        parameters: { percentage: 50 }
      },
      {
        trigger: 'CONSECUTIVE_LOSSES',
        severity: 'HIGH',
        action: 'NOTIFY_ADMIN',
        parameters: { urgency: 'HIGH' }
      },
      {
        trigger: 'DAILY_LOSS',
        severity: 'CRITICAL',
        action: 'HALT_TRADING',
        parameters: { reason: 'Daily loss limit exceeded' }
      }
    ]
  },

  // Drawdown and loss protection
  drawdownProtection: DEFAULT_DRAWDOWN_CONFIG,

  // Market-based risk adjustments
  marketRiskAdjustments: DEFAULT_MARKET_RISK_CONFIG,

  // System enabled by default
  enabled: true
};

/**
 * Conservative risk configuration for high-volatility periods
 */
export const CONSERVATIVE_RISK_CONFIG: Partial<RiskManagementConfig> = {
  riskLimits: {
    maxRiskPerTrade: 0.015,       // 1.5% per trade
    maxPortfolioHeat: 0.15,       // 15% total portfolio heat
    maxDrawdown: 0.03,            // 3% maximum drawdown
    maxConsecutiveLosses: 1,      // 1 consecutive loss trigger
    maxDailyLoss: 0.02,           // 2% maximum daily loss
    vixThreshold: 25              // Lower VIX threshold
  },
  positionSizing: {
    maxRiskPerTrade: 0.015,
    maxPortfolioHeat: 0.15,
    maxDrawdown: 0.03,
    confidenceMultipliers: {
      high: 1.0,                  // No size increase even for high confidence
      medium: 0.8,
      low: 0.3
    },
    vixAdjustments: {
      low: 0.9,
      medium: 0.6,
      high: 0.3
    }
  }
};

/**
 * Aggressive risk configuration for low-volatility periods
 */
export const AGGRESSIVE_RISK_CONFIG: Partial<RiskManagementConfig> = {
  riskLimits: {
    maxRiskPerTrade: 0.025,       // 2.5% per trade
    maxPortfolioHeat: 0.25,       // 25% total portfolio heat
    maxDrawdown: 0.07,            // 7% maximum drawdown
    maxConsecutiveLosses: 3,      // 3 consecutive losses
    maxDailyLoss: 0.04,           // 4% maximum daily loss
    vixThreshold: 35              // Higher VIX threshold
  },
  positionSizing: {
    maxRiskPerTrade: 0.025,
    maxPortfolioHeat: 0.25,
    maxDrawdown: 0.07,
    confidenceMultipliers: {
      high: 1.5,                  // Increase size for high confidence
      medium: 1.2,
      low: 0.7
    },
    fibZoneMultipliers: {
      'COMPRESSION': 1.5,
      'MID_EXPANSION': 1.2,
      'FULL_EXPANSION': 1.0,
      'OVER_EXTENSION': 0.6,
      'EXHAUSTION': 0.0
    }
  }
};

/**
 * Get risk configuration based on market conditions
 */
export function getRiskConfigForMarketConditions(vix: number, regime: string): RiskManagementConfig {
  const baseConfig = { ...DEFAULT_RISK_CONFIG };
  
  if (vix > 30 || regime === 'HIGH_VOLATILITY') {
    return {
      ...baseConfig,
      ...CONSERVATIVE_RISK_CONFIG,
      riskLimits: { ...baseConfig.riskLimits, ...CONSERVATIVE_RISK_CONFIG.riskLimits },
      positionSizing: { ...baseConfig.positionSizing, ...CONSERVATIVE_RISK_CONFIG.positionSizing }
    };
  } else if (vix < 15 && regime === 'LOW_VOLATILITY') {
    return {
      ...baseConfig,
      ...AGGRESSIVE_RISK_CONFIG,
      riskLimits: { ...baseConfig.riskLimits, ...AGGRESSIVE_RISK_CONFIG.riskLimits },
      positionSizing: { ...baseConfig.positionSizing, ...AGGRESSIVE_RISK_CONFIG.positionSizing }
    };
  }
  
  return baseConfig;
}