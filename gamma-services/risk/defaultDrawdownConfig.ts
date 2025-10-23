import { DrawdownLossConfig } from './DrawdownLossProtection';

/**
 * Default Drawdown and Loss Protection Configuration
 * 
 * Production-ready settings for drawdown monitoring and consecutive loss protection
 * based on institutional risk management best practices
 */

export const DEFAULT_DRAWDOWN_CONFIG: DrawdownLossConfig = {
  maxDrawdownThreshold: 0.05,        // 5% maximum drawdown threshold
  defensiveModeThreshold: 0.04,      // 4% early warning threshold
  consecutiveLossLimit: 2,           // 2 consecutive losses trigger protection
  positionReductionFactor: 0.5,      // 50% position size reduction
  defensiveModeMultiplier: 0.3,      // 30% of normal size in defensive mode
  recoveryThreshold: 0.02,           // 2% drawdown for recovery
  monitoringPeriodDays: 30           // 30 days of equity history
};

/**
 * Conservative configuration for high-risk periods
 */
export const CONSERVATIVE_DRAWDOWN_CONFIG: DrawdownLossConfig = {
  maxDrawdownThreshold: 0.03,        // 3% maximum drawdown
  defensiveModeThreshold: 0.025,     // 2.5% early warning
  consecutiveLossLimit: 1,           // 1 consecutive loss trigger
  positionReductionFactor: 0.3,      // 30% position size reduction
  defensiveModeMultiplier: 0.2,      // 20% of normal size in defensive mode
  recoveryThreshold: 0.015,          // 1.5% drawdown for recovery
  monitoringPeriodDays: 30
};

/**
 * Aggressive configuration for low-risk periods
 */
export const AGGRESSIVE_DRAWDOWN_CONFIG: DrawdownLossConfig = {
  maxDrawdownThreshold: 0.07,        // 7% maximum drawdown
  defensiveModeThreshold: 0.06,      // 6% early warning
  consecutiveLossLimit: 3,           // 3 consecutive losses trigger
  positionReductionFactor: 0.7,      // 70% position size reduction
  defensiveModeMultiplier: 0.5,      // 50% of normal size in defensive mode
  recoveryThreshold: 0.03,           // 3% drawdown for recovery
  monitoringPeriodDays: 30
};

/**
 * Get drawdown configuration based on market conditions
 */
export function getDrawdownConfigForConditions(
  volatility: 'LOW' | 'MEDIUM' | 'HIGH',
  marketRegime: string
): DrawdownLossConfig {
  if (volatility === 'HIGH' || marketRegime === 'BEAR_MARKET') {
    return CONSERVATIVE_DRAWDOWN_CONFIG;
  } else if (volatility === 'LOW' && marketRegime === 'BULL_MARKET') {
    return AGGRESSIVE_DRAWDOWN_CONFIG;
  }
  
  return DEFAULT_DRAWDOWN_CONFIG;
}