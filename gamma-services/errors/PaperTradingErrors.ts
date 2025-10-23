/**
 * Comprehensive error handling system for Paper Trading
 * Provides structured error types, recovery mechanisms, and graceful degradation
 */

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ErrorCategory = 
  | 'TRADE_EXECUTION' 
  | 'DATA_SOURCE' 
  | 'POSITION_MANAGEMENT' 
  | 'RISK_VALIDATION' 
  | 'DATABASE' 
  | 'API_CONNECTIVITY' 
  | 'VALIDATION' 
  | 'CONFIGURATION' 
  | 'SYSTEM';

export interface ErrorContext {
  timestamp: Date;
  operation: string;
  ticker?: string;
  positionId?: string;
  accountId?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
  correlationId?: string;
}

export interface ErrorRecoveryAction {
  type: 'RETRY' | 'FALLBACK' | 'SKIP' | 'ABORT' | 'DEGRADE';
  description: string;
  maxAttempts?: number;
  backoffMs?: number;
  fallbackData?: any;
}

/**
 * Base Paper Trading Error class with enhanced context and recovery options
 */
export class PaperTradingError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly recoverable: boolean;
  public readonly context: ErrorContext;
  public readonly recoveryActions: ErrorRecoveryAction[];
  public readonly timestamp: Date;
  public readonly correlationId: string;

  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    recoverable: boolean = true,
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message);
    this.name = 'PaperTradingError';
    this.code = code;
    this.severity = severity;
    this.category = category;
    this.recoverable = recoverable;
    this.timestamp = new Date();
    this.correlationId = context.correlationId || this.generateCorrelationId();
    
    this.context = {
      timestamp: this.timestamp,
      operation: 'unknown',
      correlationId: this.correlationId,
      stackTrace: this.stack,
      ...context
    };
    
    this.recoveryActions = recoveryActions;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaperTradingError);
    }
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert error to structured log format
   */
  public toLogFormat(): Record<string, any> {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        severity: this.severity,
        category: this.category,
        recoverable: this.recoverable,
        correlationId: this.correlationId,
        timestamp: this.timestamp.toISOString()
      },
      context: this.context,
      recoveryActions: this.recoveryActions,
      stack: this.stack
    };
  }

  /**
   * Check if error should trigger system alert
   */
  public shouldAlert(): boolean {
    return this.severity === 'CRITICAL' || this.severity === 'HIGH';
  }

  /**
   * Get recommended recovery action
   */
  public getRecommendedRecovery(): ErrorRecoveryAction | null {
    return this.recoveryActions.length > 0 ? this.recoveryActions[0] : null;
  }
}

/**
 * Trade Execution Errors
 */
export class TradeExecutionError extends PaperTradingError {
  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'HIGH',
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message, code, severity, 'TRADE_EXECUTION', true, context, recoveryActions);
    this.name = 'TradeExecutionError';
  }
}

/**
 * Data Source Errors (API, Market Data)
 */
export class DataSourceError extends PaperTradingError {
  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'MEDIUM',
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message, code, severity, 'DATA_SOURCE', true, context, recoveryActions);
    this.name = 'DataSourceError';
  }
}

/**
 * Position Management Errors
 */
export class PositionManagementError extends PaperTradingError {
  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'MEDIUM',
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message, code, severity, 'POSITION_MANAGEMENT', true, context, recoveryActions);
    this.name = 'PositionManagementError';
  }
}

/**
 * Risk Validation Errors
 */
export class RiskValidationError extends PaperTradingError {
  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'HIGH',
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message, code, severity, 'RISK_VALIDATION', false, context, recoveryActions);
    this.name = 'RiskValidationError';
  }
}

/**
 * Database Errors
 */
export class DatabaseError extends PaperTradingError {
  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'HIGH',
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message, code, severity, 'DATABASE', true, context, recoveryActions);
    this.name = 'DatabaseError';
  }
}

/**
 * API Connectivity Errors
 */
export class APIConnectivityError extends PaperTradingError {
  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'MEDIUM',
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message, code, severity, 'API_CONNECTIVITY', true, context, recoveryActions);
    this.name = 'APIConnectivityError';
  }
}

/**
 * Validation Errors
 */
export class ValidationError extends PaperTradingError {
  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'MEDIUM',
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message, code, severity, 'VALIDATION', false, context, recoveryActions);
    this.name = 'ValidationError';
  }
}

/**
 * Configuration Errors
 */
export class ConfigurationError extends PaperTradingError {
  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'CRITICAL',
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message, code, severity, 'CONFIGURATION', false, context, recoveryActions);
    this.name = 'ConfigurationError';
  }
}

/**
 * System Errors
 */
export class SystemError extends PaperTradingError {
  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'CRITICAL',
    context: Partial<ErrorContext> = {},
    recoveryActions: ErrorRecoveryAction[] = []
  ) {
    super(message, code, severity, 'SYSTEM', true, context, recoveryActions);
    this.name = 'SystemError';
  }
}

/**
 * Error Code Constants
 */
export const ERROR_CODES = {
  // Trade Execution
  TRADE_EXECUTION_FAILED: 'TRADE_001',
  INSUFFICIENT_FUNDS: 'TRADE_002',
  INVALID_SIGNAL: 'TRADE_003',
  POSITION_SIZE_ZERO: 'TRADE_004',
  CONTRACT_NOT_FOUND: 'TRADE_005',
  
  // Data Source
  API_RATE_LIMITED: 'DATA_001',
  API_UNAVAILABLE: 'DATA_002',
  STALE_DATA: 'DATA_003',
  INVALID_RESPONSE: 'DATA_004',
  TIMEOUT: 'DATA_005',
  
  // Position Management
  POSITION_NOT_FOUND: 'POS_001',
  INVALID_POSITION_STATE: 'POS_002',
  POSITION_UPDATE_FAILED: 'POS_003',
  CLOSE_POSITION_FAILED: 'POS_004',
  
  // Risk Validation
  RISK_LIMIT_EXCEEDED: 'RISK_001',
  PORTFOLIO_HEAT_HIGH: 'RISK_002',
  DRAWDOWN_LIMIT: 'RISK_003',
  CONCENTRATION_RISK: 'RISK_004',
  
  // Database
  CONNECTION_FAILED: 'DB_001',
  QUERY_FAILED: 'DB_002',
  TRANSACTION_FAILED: 'DB_003',
  CONSTRAINT_VIOLATION: 'DB_004',
  
  // API Connectivity
  POLYGON_API_ERROR: 'API_001',
  TRADIER_API_ERROR: 'API_002',
  NETWORK_ERROR: 'API_003',
  AUTH_FAILED: 'API_004',
  
  // Validation
  INVALID_TICKER: 'VAL_001',
  INVALID_CONFIDENCE: 'VAL_002',
  INVALID_TIMEFRAME: 'VAL_003',
  MISSING_REQUIRED_FIELD: 'VAL_004',
  
  // Configuration
  MISSING_CONFIG: 'CFG_001',
  INVALID_CONFIG: 'CFG_002',
  ENV_VAR_MISSING: 'CFG_003',
  
  // System
  MEMORY_EXHAUSTED: 'SYS_001',
  CPU_OVERLOAD: 'SYS_002',
  DISK_FULL: 'SYS_003',
  SERVICE_UNAVAILABLE: 'SYS_004'
} as const;

/**
 * Predefined recovery actions
 */
export const RECOVERY_ACTIONS = {
  RETRY_WITH_BACKOFF: (maxAttempts: number = 3, backoffMs: number = 1000): ErrorRecoveryAction => ({
    type: 'RETRY',
    description: `Retry operation up to ${maxAttempts} times with ${backoffMs}ms backoff`,
    maxAttempts,
    backoffMs
  }),
  
  FALLBACK_TO_CACHE: (fallbackData?: any): ErrorRecoveryAction => ({
    type: 'FALLBACK',
    description: 'Use cached data as fallback',
    fallbackData
  }),
  
  FALLBACK_TO_SYNTHETIC: (): ErrorRecoveryAction => ({
    type: 'FALLBACK',
    description: 'Use synthetic pricing model as fallback'
  }),
  
  SKIP_OPERATION: (): ErrorRecoveryAction => ({
    type: 'SKIP',
    description: 'Skip this operation and continue'
  }),
  
  ABORT_OPERATION: (): ErrorRecoveryAction => ({
    type: 'ABORT',
    description: 'Abort operation and return error'
  }),
  
  DEGRADE_SERVICE: (): ErrorRecoveryAction => ({
    type: 'DEGRADE',
    description: 'Continue with reduced functionality'
  })
} as const;