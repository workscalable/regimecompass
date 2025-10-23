/**
 * Gamma Adaptive System - Risk Management Module
 * 
 * Comprehensive portfolio risk management system with:
 * - Portfolio heat calculation and monitoring
 * - Position sizing with confidence-based adjustments
 * - Risk violation detection and alerting
 * - Automated risk mitigation actions
 * - Real-time risk monitoring and reporting
 */

// Core risk management components
export { PortfolioRiskManager } from './PortfolioRiskManager';
export { PositionSizingEngine } from './PositionSizingEngine';
export { RiskAlertSystem } from './RiskAlertSystem';
export { RiskManagementService } from './RiskManagementService';
export { DrawdownLossProtection } from './DrawdownLossProtection';
export { MarketBasedRiskAdjustments } from './MarketBasedRiskAdjustments';

// Configuration and defaults
export { 
  DEFAULT_RISK_CONFIG, 
  CONSERVATIVE_RISK_CONFIG, 
  AGGRESSIVE_RISK_CONFIG,
  getRiskConfigForMarketConditions 
} from './defaultRiskConfig';

export {
  DEFAULT_DRAWDOWN_CONFIG,
  CONSERVATIVE_DRAWDOWN_CONFIG,
  AGGRESSIVE_DRAWDOWN_CONFIG,
  getDrawdownConfigForConditions
} from './defaultDrawdownConfig';

export {
  DEFAULT_MARKET_RISK_CONFIG,
  CONSERVATIVE_MARKET_RISK_CONFIG,
  AGGRESSIVE_MARKET_RISK_CONFIG,
  getMarketRiskConfigForConditions,
  validateMarketRiskConfig
} from './defaultMarketRiskConfig';

// Type exports
export type {
  RiskLimits,
  PortfolioRisk,
  RiskViolation,
  RiskValidation,
  PositionRisk,
  AccountSnapshot
} from './PortfolioRiskManager';

export type {
  PositionSizingConfig,
  PositionSize,
  SignalFactors,
  MarketConditions,
  FibZone
} from './PositionSizingEngine';

export type {
  AlertConfig,
  AlertChannel,
  AlertThreshold,
  EscalationRule,
  AutoAction,
  Alert
} from './RiskAlertSystem';

export type {
  RiskManagementConfig,
  TradeRequest,
  TradeApproval
} from './RiskManagementService';

export type {
  DrawdownLossConfig,
  ProtectionState,
  TradeOutcome,
  EquitySnapshot
} from './DrawdownLossProtection';

export type {
  MarketBasedRiskConfig,
  MarketConditions,
  RiskAdjustments,
  FibZone,
  MarketRegime,
  VolatilityEnvironment
} from './MarketBasedRiskAdjustments';