/**
 * Gamma Adaptive System - Configuration Module
 * 
 * Comprehensive configuration management system with:
 * - Hot-reload capabilities without system restart
 * - Schema validation and error handling
 * - Environment-specific configuration support
 * - Real-time configuration change notifications
 * - Backup and rollback functionality
 */

// Core configuration components
export { ConfigurationManager } from './ConfigurationManager';
export { ConfigurationService } from './ConfigurationService';
export { ParameterCustomizationAPI } from './ParameterCustomizationAPI';

// Type exports
export type {
  GammaAdaptiveConfig,
  ConfigValidationResult,
  ConfigError,
  ConfigWarning
} from './ConfigurationManager';

export type {
  ConfigChangeEvent,
  ConfigSubscription
} from './ConfigurationService';

export type {
  WatchlistOperation,
  SignalWeightAdjustment,
  ConfidenceThresholdAdjustment,
  RiskParameterAdjustment,
  FibZoneMultiplierAdjustment,
  ParameterChangeResult,
  ParameterPreset
} from './ParameterCustomizationAPI';