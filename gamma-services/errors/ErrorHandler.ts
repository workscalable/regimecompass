import { EventEmitter } from 'events';
import { 
  PaperTradingError, 
  ErrorSeverity, 
  ErrorCategory, 
  ErrorRecoveryAction,
  TradeExecutionError,
  DataSourceError,
  PositionManagementError,
  RiskValidationError,
  DatabaseError,
  APIConnectivityError,
  ValidationError,
  ConfigurationError,
  SystemError,
  ERROR_CODES,
  RECOVERY_ACTIONS
} from './PaperTradingErrors';

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  recentErrors: PaperTradingError[];
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  nextAttemptTime: Date | null;
  threshold: number;
  timeout: number;
}

export class ErrorHandler extends EventEmitter {
  private errorMetrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByCategory: {
      TRADE_EXECUTION: 0,
      DATA_SOURCE: 0,
      POSITION_MANAGEMENT: 0,
      RISK_VALIDATION: 0,
      DATABASE: 0,
      API_CONNECTIVITY: 0,
      VALIDATION: 0,
      CONFIGURATION: 0,
      SYSTEM: 0
    },
    errorsBySeverity: {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    },
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    recentErrors: []
  };

  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private retryQueues: Map<string, Array<() => Promise<any>>> = new Map();
  private fallbackCache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map();

  constructor() {
    super();
    this.initializeCircuitBreakers();
    this.startErrorMetricsCleanup();
  }

  /**
   * Handle any error with automatic recovery attempts
   */
  public async handleError<T>(
    error: Error | PaperTradingError,
    operation: () => Promise<T>,
    context: {
      operationName: string;
      ticker?: string;
      positionId?: string;
      accountId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    const paperError = this.normalizeToPaperTradingError(error, context);
    
    // Record error metrics
    this.recordError(paperError);
    
    // Emit error event for monitoring
    this.emit('error-occurred', paperError);
    
    // Log error
    this.logError(paperError);
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(context.operationName)) {
      throw new SystemError(
        `Circuit breaker is open for ${context.operationName}`,
        ERROR_CODES.SERVICE_UNAVAILABLE,
        'HIGH',
        { operation: context.operationName }
      );
    }
    
    // Attempt recovery if error is recoverable
    if (paperError.recoverable && paperError.recoveryActions.length > 0) {
      return await this.attemptRecovery(paperError, operation, context);
    }
    
    // Update circuit breaker on failure
    this.recordFailure(context.operationName);
    
    throw paperError;
  }

  /**
   * Handle trade execution errors with specific recovery strategies
   */
  public async handleTradeExecutionError<T>(
    error: Error,
    retryOperation: () => Promise<T>,
    context: {
      ticker: string;
      signal: any;
      accountId: string;
    }
  ): Promise<T> {
    const tradeError = new TradeExecutionError(
      `Trade execution failed for ${context.ticker}: ${error.message}`,
      ERROR_CODES.TRADE_EXECUTION_FAILED,
      'HIGH',
      {
        operation: 'executePaperTrade',
        ticker: context.ticker,
        accountId: context.accountId,
        metadata: { signal: context.signal }
      },
      [
        RECOVERY_ACTIONS.RETRY_WITH_BACKOFF(2, 500),
        RECOVERY_ACTIONS.SKIP_OPERATION()
      ]
    );

    return await this.handleError(tradeError, retryOperation, {
      operationName: 'trade-execution',
      ticker: context.ticker,
      accountId: context.accountId
    });
  }

  /**
   * Handle data source errors with fallback mechanisms
   */
  public async handleDataSourceError<T>(
    error: Error,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    cacheKey?: string
  ): Promise<T> {
    const dataError = new DataSourceError(
      `Data source error: ${error.message}`,
      ERROR_CODES.API_UNAVAILABLE,
      'MEDIUM',
      {
        operation: 'fetchData',
        metadata: { cacheKey }
      },
      [
        RECOVERY_ACTIONS.RETRY_WITH_BACKOFF(3, 1000),
        ...(fallbackOperation ? [RECOVERY_ACTIONS.FALLBACK_TO_CACHE()] : []),
        ...(cacheKey ? [RECOVERY_ACTIONS.FALLBACK_TO_CACHE()] : [])
      ]
    );

    try {
      return await this.handleError(dataError, operation, {
        operationName: 'data-source'
      });
    } catch (recoveryError) {
      // Try fallback operation
      if (fallbackOperation) {
        try {
          console.log('Attempting fallback operation for data source error');
          return await fallbackOperation();
        } catch (fallbackError) {
          console.error('Fallback operation also failed:', fallbackError);
        }
      }

      // Try cached data
      if (cacheKey) {
        const cachedData = this.getCachedData(cacheKey);
        if (cachedData) {
          console.log(`Using cached data for ${cacheKey}`);
          return cachedData as T;
        }
      }

      throw recoveryError;
    }
  }

  /**
   * Handle position management errors
   */
  public async handlePositionError<T>(
    error: Error,
    operation: () => Promise<T>,
    context: {
      positionId: string;
      ticker: string;
      operation: string;
    }
  ): Promise<T> {
    const positionError = new PositionManagementError(
      `Position ${context.operation} failed for ${context.ticker}: ${error.message}`,
      ERROR_CODES.POSITION_UPDATE_FAILED,
      'MEDIUM',
      {
        operation: context.operation,
        positionId: context.positionId,
        ticker: context.ticker
      },
      [
        RECOVERY_ACTIONS.RETRY_WITH_BACKOFF(2, 300),
        RECOVERY_ACTIONS.SKIP_OPERATION()
      ]
    );

    return await this.handleError(positionError, operation, {
      operationName: 'position-management',
      positionId: context.positionId,
      ticker: context.ticker
    });
  }

  /**
   * Handle database errors with retry and fallback
   */
  public async handleDatabaseError<T>(
    error: Error,
    operation: () => Promise<T>,
    context: {
      query: string;
      table?: string;
    }
  ): Promise<T> {
    const dbError = new DatabaseError(
      `Database operation failed: ${error.message}`,
      ERROR_CODES.QUERY_FAILED,
      'HIGH',
      {
        operation: 'database-query',
        metadata: { query: context.query, table: context.table }
      },
      [
        RECOVERY_ACTIONS.RETRY_WITH_BACKOFF(3, 2000),
        RECOVERY_ACTIONS.DEGRADE_SERVICE()
      ]
    );

    return await this.handleError(dbError, operation, {
      operationName: 'database',
      metadata: context
    });
  }

  /**
   * Attempt error recovery based on recovery actions
   */
  private async attemptRecovery<T>(
    error: PaperTradingError,
    operation: () => Promise<T>,
    context: any
  ): Promise<T> {
    this.errorMetrics.recoveryAttempts++;

    for (const recoveryAction of error.recoveryActions) {
      try {
        console.log(`Attempting recovery: ${recoveryAction.description}`);
        
        switch (recoveryAction.type) {
          case 'RETRY':
            return await this.retryWithBackoff(
              operation,
              recoveryAction.maxAttempts || 3,
              recoveryAction.backoffMs || 1000
            );
            
          case 'FALLBACK':
            if (recoveryAction.fallbackData) {
              console.log('Using fallback data');
              return recoveryAction.fallbackData as T;
            }
            break;
            
          case 'SKIP':
            console.log('Skipping operation due to error');
            throw error; // Re-throw to indicate skip
            
          case 'DEGRADE':
            console.log('Continuing with degraded service');
            this.emit('service-degraded', { error, context });
            throw error; // Let caller handle degradation
            
          case 'ABORT':
            console.log('Aborting operation');
            throw error;
        }
      } catch (recoveryError) {
        console.error(`Recovery attempt failed: ${recoveryError.message}`);
        continue; // Try next recovery action
      }
    }

    this.errorMetrics.failedRecoveries++;
    throw error;
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    baseBackoffMs: number
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        if (attempt > 1) {
          this.errorMetrics.successfulRecoveries++;
          console.log(`Operation succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        const backoffMs = baseBackoffMs * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${backoffMs}ms`);
        await this.sleep(backoffMs);
      }
    }
    
    throw lastError!;
  }

  /**
   * Normalize any error to PaperTradingError
   */
  private normalizeToPaperTradingError(
    error: Error | PaperTradingError,
    context: any
  ): PaperTradingError {
    if (error instanceof PaperTradingError) {
      return error;
    }

    // Determine error type based on message or context
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new APIConnectivityError(
        error.message,
        ERROR_CODES.TIMEOUT,
        'MEDIUM',
        context,
        [RECOVERY_ACTIONS.RETRY_WITH_BACKOFF(3, 2000)]
      );
    }

    if (error.message.includes('database') || error.message.includes('connection')) {
      return new DatabaseError(
        error.message,
        ERROR_CODES.CONNECTION_FAILED,
        'HIGH',
        context,
        [RECOVERY_ACTIONS.RETRY_WITH_BACKOFF(3, 1000)]
      );
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return new ValidationError(
        error.message,
        ERROR_CODES.INVALID_RESPONSE,
        'MEDIUM',
        context
      );
    }

    // Default to system error
    return new SystemError(
      error.message,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      'HIGH',
      context,
      [RECOVERY_ACTIONS.RETRY_WITH_BACKOFF(2, 1000)]
    );
  }

  /**
   * Record error in metrics
   */
  private recordError(error: PaperTradingError): void {
    this.errorMetrics.totalErrors++;
    this.errorMetrics.errorsByCategory[error.category]++;
    this.errorMetrics.errorsBySeverity[error.severity]++;
    
    // Keep only last 100 errors
    this.errorMetrics.recentErrors.push(error);
    if (this.errorMetrics.recentErrors.length > 100) {
      this.errorMetrics.recentErrors = this.errorMetrics.recentErrors.slice(-100);
    }
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: PaperTradingError): void {
    const logData = error.toLogFormat();
    
    switch (error.severity) {
      case 'CRITICAL':
        console.error('CRITICAL ERROR:', logData);
        break;
      case 'HIGH':
        console.error('HIGH SEVERITY ERROR:', logData);
        break;
      case 'MEDIUM':
        console.warn('MEDIUM SEVERITY ERROR:', logData);
        break;
      case 'LOW':
        console.log('LOW SEVERITY ERROR:', logData);
        break;
    }
  }

  /**
   * Initialize circuit breakers for different services
   */
  private initializeCircuitBreakers(): void {
    const services = [
      'trade-execution',
      'data-source',
      'position-management',
      'database',
      'polygon-api',
      'tradier-api'
    ];

    services.forEach(service => {
      this.circuitBreakers.set(service, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
        threshold: 5, // Open after 5 failures
        timeout: 60000 // 1 minute timeout
      });
    });
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(service: string): boolean {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return false;

    if (breaker.isOpen && breaker.nextAttemptTime) {
      if (new Date() > breaker.nextAttemptTime) {
        // Reset circuit breaker
        breaker.isOpen = false;
        breaker.failureCount = 0;
        breaker.nextAttemptTime = null;
        console.log(`Circuit breaker reset for ${service}`);
        return false;
      }
      return true;
    }

    return breaker.isOpen;
  }

  /**
   * Record failure for circuit breaker
   */
  private recordFailure(service: string): void {
    const breaker = this.circuitBreakers.get(service);
    if (!breaker) return;

    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    if (breaker.failureCount >= breaker.threshold) {
      breaker.isOpen = true;
      breaker.nextAttemptTime = new Date(Date.now() + breaker.timeout);
      console.warn(`Circuit breaker opened for ${service} after ${breaker.failureCount} failures`);
      this.emit('circuit-breaker-opened', { service, failureCount: breaker.failureCount });
    }
  }

  /**
   * Cache data for fallback use
   */
  public cacheData(key: string, data: any, ttlMs: number = 300000): void {
    this.fallbackCache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttlMs
    });
  }

  /**
   * Get cached data if still valid
   */
  public getCachedData(key: string): any | null {
    const cached = this.fallbackCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp.getTime();
    if (age > cached.ttl) {
      this.fallbackCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Get error metrics
   */
  public getErrorMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  /**
   * Get circuit breaker status
   */
  public getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    this.circuitBreakers.forEach((state, service) => {
      status[service] = { ...state };
    });
    return status;
  }

  /**
   * Reset error metrics
   */
  public resetMetrics(): void {
    this.errorMetrics = {
      totalErrors: 0,
      errorsByCategory: {
        TRADE_EXECUTION: 0,
        DATA_SOURCE: 0,
        POSITION_MANAGEMENT: 0,
        RISK_VALIDATION: 0,
        DATABASE: 0,
        API_CONNECTIVITY: 0,
        VALIDATION: 0,
        CONFIGURATION: 0,
        SYSTEM: 0
      },
      errorsBySeverity: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0
      },
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      recentErrors: []
    };
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start periodic cleanup of old error data
   */
  private startErrorMetricsCleanup(): void {
    setInterval(() => {
      // Clean up old cached data
      const now = Date.now();
      for (const [key, cached] of Array.from(this.fallbackCache.entries())) {
        const age = now - cached.timestamp.getTime();
        if (age > cached.ttl) {
          this.fallbackCache.delete(key);
        }
      }

      // Clean up old errors (keep only last 24 hours)
      const cutoff = new Date(now - 24 * 60 * 60 * 1000);
      this.errorMetrics.recentErrors = this.errorMetrics.recentErrors.filter(
        error => error.timestamp > cutoff
      );
    }, 300000); // Run every 5 minutes
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();