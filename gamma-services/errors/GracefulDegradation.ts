import { EventEmitter } from 'events';
import { PaperTradingError, ErrorCategory } from './PaperTradingErrors';

export type DegradationLevel = 'NONE' | 'MINIMAL' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface DegradationStrategy {
  level: DegradationLevel;
  description: string;
  affectedFeatures: string[];
  fallbackBehavior: string;
  autoRecover: boolean;
  maxDuration?: number; // Max time in ms before escalation
}

export interface ServiceStatus {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  degradationLevel: DegradationLevel;
  lastUpdate: Date;
  affectedFeatures: string[];
  estimatedRecovery?: Date;
}

/**
 * Manages graceful degradation of paper trading services
 * when external dependencies fail or performance degrades
 */
export class GracefulDegradationManager extends EventEmitter {
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private degradationStrategies: Map<string, DegradationStrategy[]> = new Map();
  private activeDegradations: Map<string, { strategy: DegradationStrategy; startTime: Date }> = new Map();
  private syntheticDataCache: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeDegradationStrategies();
    this.startHealthMonitoring();
  }

  /**
   * Initialize degradation strategies for different failure scenarios
   */
  private initializeDegradationStrategies(): void {
    // Options Data Source Failures
    this.degradationStrategies.set('options-data', [
      {
        level: 'MINIMAL',
        description: 'Use cached options data with staleness warnings',
        affectedFeatures: ['real-time-pricing'],
        fallbackBehavior: 'Use last known options prices with staleness indicators',
        autoRecover: true,
        maxDuration: 300000 // 5 minutes
      },
      {
        level: 'MODERATE',
        description: 'Switch to synthetic options pricing using Black-Scholes',
        affectedFeatures: ['real-time-pricing', 'greeks-accuracy'],
        fallbackBehavior: 'Calculate synthetic option prices using Black-Scholes model',
        autoRecover: true,
        maxDuration: 900000 // 15 minutes
      },
      {
        level: 'SEVERE',
        description: 'Disable new trades, maintain existing positions with estimated pricing',
        affectedFeatures: ['new-trades', 'accurate-pricing'],
        fallbackBehavior: 'Block new trades, use estimated pricing for existing positions',
        autoRecover: false
      }
    ]);

    // Database Failures
    this.degradationStrategies.set('database', [
      {
        level: 'MINIMAL',
        description: 'Use in-memory storage with periodic retry',
        affectedFeatures: ['persistence'],
        fallbackBehavior: 'Store data in memory, retry database operations periodically',
        autoRecover: true,
        maxDuration: 180000 // 3 minutes
      },
      {
        level: 'MODERATE',
        description: 'Read-only mode with cached data',
        affectedFeatures: ['data-updates', 'new-positions'],
        fallbackBehavior: 'Prevent new data writes, serve from cache',
        autoRecover: true,
        maxDuration: 600000 // 10 minutes
      },
      {
        level: 'SEVERE',
        description: 'Emergency shutdown with data preservation',
        affectedFeatures: ['all-operations'],
        fallbackBehavior: 'Save critical data to local storage, shutdown gracefully',
        autoRecover: false
      }
    ]);

    // Market Data Failures
    this.degradationStrategies.set('market-data', [
      {
        level: 'MINIMAL',
        description: 'Use delayed market data',
        affectedFeatures: ['real-time-updates'],
        fallbackBehavior: 'Continue with 15-minute delayed data',
        autoRecover: true,
        maxDuration: 600000 // 10 minutes
      },
      {
        level: 'MODERATE',
        description: 'Freeze position updates, maintain last known values',
        affectedFeatures: ['position-updates', 'pnl-tracking'],
        fallbackBehavior: 'Stop position updates, show last known PnL values',
        autoRecover: true,
        maxDuration: 1800000 // 30 minutes
      },
      {
        level: 'SEVERE',
        description: 'Emergency position closure at last known prices',
        affectedFeatures: ['all-trading'],
        fallbackBehavior: 'Close all positions at last known prices',
        autoRecover: false
      }
    ]);

    // Risk Management Failures
    this.degradationStrategies.set('risk-management', [
      {
        level: 'MINIMAL',
        description: 'Use conservative default risk limits',
        affectedFeatures: ['dynamic-risk-adjustment'],
        fallbackBehavior: 'Apply conservative static risk limits',
        autoRecover: true,
        maxDuration: 300000 // 5 minutes
      },
      {
        level: 'MODERATE',
        description: 'Reduce position sizes by 50%',
        affectedFeatures: ['normal-position-sizing'],
        fallbackBehavior: 'Halve all position sizes as safety measure',
        autoRecover: true,
        maxDuration: 900000 // 15 minutes
      },
      {
        level: 'SEVERE',
        description: 'Halt all new trades',
        affectedFeatures: ['new-trades'],
        fallbackBehavior: 'Block all new trade execution',
        autoRecover: false
      }
    ]);

    // Performance Degradation
    this.degradationStrategies.set('performance', [
      {
        level: 'MINIMAL',
        description: 'Reduce update frequency',
        affectedFeatures: ['update-frequency'],
        fallbackBehavior: 'Update positions every 30 seconds instead of real-time',
        autoRecover: true,
        maxDuration: 600000 // 10 minutes
      },
      {
        level: 'MODERATE',
        description: 'Disable non-essential features',
        affectedFeatures: ['analytics', 'learning-insights'],
        fallbackBehavior: 'Disable performance analytics and learning features',
        autoRecover: true,
        maxDuration: 1800000 // 30 minutes
      },
      {
        level: 'SEVERE',
        description: 'Emergency mode - essential operations only',
        affectedFeatures: ['all-non-essential'],
        fallbackBehavior: 'Only allow position monitoring and emergency closure',
        autoRecover: false
      }
    ]);
  }

  /**
   * Trigger degradation for a specific service
   */
  public async degradeService(
    service: string, 
    error: PaperTradingError,
    forceLevel?: DegradationLevel
  ): Promise<void> {
    const strategies = this.degradationStrategies.get(service);
    if (!strategies) {
      console.warn(`No degradation strategies defined for service: ${service}`);
      return;
    }

    // Determine appropriate degradation level
    const targetLevel = forceLevel || this.determineDegradationLevel(error);
    const strategy = strategies.find(s => s.level === targetLevel) || strategies[0];

    console.warn(`Degrading service ${service} to level ${strategy.level}: ${strategy.description}`);

    // Update service status
    this.serviceStatuses.set(service, {
      service,
      status: 'DEGRADED',
      degradationLevel: strategy.level,
      lastUpdate: new Date(),
      affectedFeatures: strategy.affectedFeatures,
      estimatedRecovery: strategy.maxDuration 
        ? new Date(Date.now() + strategy.maxDuration)
        : undefined
    });

    // Activate degradation
    this.activeDegradations.set(service, {
      strategy,
      startTime: new Date()
    });

    // Apply degradation strategy
    await this.applyDegradationStrategy(service, strategy);

    // Emit degradation event
    this.emit('service-degraded', {
      service,
      level: strategy.level,
      strategy,
      error
    });

    // Set auto-recovery timer if applicable
    if (strategy.autoRecover && strategy.maxDuration) {
      setTimeout(() => {
        this.attemptServiceRecovery(service);
      }, strategy.maxDuration);
    }
  }

  /**
   * Apply specific degradation strategy
   */
  private async applyDegradationStrategy(service: string, strategy: DegradationStrategy): Promise<void> {
    switch (service) {
      case 'options-data':
        await this.applyOptionsDataDegradation(strategy);
        break;
      case 'database':
        await this.applyDatabaseDegradation(strategy);
        break;
      case 'market-data':
        await this.applyMarketDataDegradation(strategy);
        break;
      case 'risk-management':
        await this.applyRiskManagementDegradation(strategy);
        break;
      case 'performance':
        await this.applyPerformanceDegradation(strategy);
        break;
    }
  }

  /**
   * Apply options data degradation
   */
  private async applyOptionsDataDegradation(strategy: DegradationStrategy): Promise<void> {
    switch (strategy.level) {
      case 'MINIMAL':
        // Enable stale data warnings
        this.emit('enable-stale-data-mode');
        break;
      case 'MODERATE':
        // Switch to synthetic pricing
        this.emit('enable-synthetic-pricing');
        await this.initializeSyntheticPricing();
        break;
      case 'SEVERE':
        // Block new trades
        this.emit('block-new-trades', { reason: 'options-data-unavailable' });
        break;
    }
  }

  /**
   * Apply database degradation
   */
  private async applyDatabaseDegradation(strategy: DegradationStrategy): Promise<void> {
    switch (strategy.level) {
      case 'MINIMAL':
        // Enable in-memory storage
        this.emit('enable-memory-storage');
        break;
      case 'MODERATE':
        // Enable read-only mode
        this.emit('enable-readonly-mode');
        break;
      case 'SEVERE':
        // Emergency shutdown
        this.emit('emergency-shutdown', { reason: 'database-failure' });
        break;
    }
  }

  /**
   * Apply market data degradation
   */
  private async applyMarketDataDegradation(strategy: DegradationStrategy): Promise<void> {
    switch (strategy.level) {
      case 'MINIMAL':
        // Use delayed data
        this.emit('use-delayed-data');
        break;
      case 'MODERATE':
        // Freeze position updates
        this.emit('freeze-position-updates');
        break;
      case 'SEVERE':
        // Emergency position closure
        this.emit('emergency-close-positions');
        break;
    }
  }

  /**
   * Apply risk management degradation
   */
  private async applyRiskManagementDegradation(strategy: DegradationStrategy): Promise<void> {
    switch (strategy.level) {
      case 'MINIMAL':
        // Use conservative limits
        this.emit('use-conservative-limits');
        break;
      case 'MODERATE':
        // Reduce position sizes
        this.emit('reduce-position-sizes', { factor: 0.5 });
        break;
      case 'SEVERE':
        // Halt new trades
        this.emit('halt-new-trades');
        break;
    }
  }

  /**
   * Apply performance degradation
   */
  private async applyPerformanceDegradation(strategy: DegradationStrategy): Promise<void> {
    switch (strategy.level) {
      case 'MINIMAL':
        // Reduce update frequency
        this.emit('reduce-update-frequency', { interval: 30000 });
        break;
      case 'MODERATE':
        // Disable non-essential features
        this.emit('disable-analytics');
        break;
      case 'SEVERE':
        // Emergency mode
        this.emit('enable-emergency-mode');
        break;
    }
  }

  /**
   * Determine degradation level based on error
   */
  private determineDegradationLevel(error: PaperTradingError): DegradationLevel {
    switch (error.severity) {
      case 'LOW':
        return 'MINIMAL';
      case 'MEDIUM':
        return 'MINIMAL';
      case 'HIGH':
        return 'MODERATE';
      case 'CRITICAL':
        return 'SEVERE';
      default:
        return 'MINIMAL';
    }
  }

  /**
   * Attempt to recover a degraded service
   */
  public async attemptServiceRecovery(service: string): Promise<boolean> {
    const degradation = this.activeDegradations.get(service);
    if (!degradation) {
      return true; // Already recovered
    }

    console.log(`Attempting recovery for service: ${service}`);

    try {
      // Test service health
      const isHealthy = await this.testServiceHealth(service);
      
      if (isHealthy) {
        await this.recoverService(service);
        return true;
      } else {
        // Escalate degradation if max duration exceeded
        const elapsed = Date.now() - degradation.startTime.getTime();
        if (degradation.strategy.maxDuration && elapsed > degradation.strategy.maxDuration) {
          await this.escalateDegradation(service);
        }
        return false;
      }
    } catch (error) {
      console.error(`Service recovery failed for ${service}:`, error);
      return false;
    }
  }

  /**
   * Recover a service from degraded state
   */
  private async recoverService(service: string): Promise<void> {
    console.log(`Recovering service: ${service}`);

    // Remove degradation
    this.activeDegradations.delete(service);

    // Update service status
    this.serviceStatuses.set(service, {
      service,
      status: 'HEALTHY',
      degradationLevel: 'NONE',
      lastUpdate: new Date(),
      affectedFeatures: []
    });

    // Emit recovery events
    this.emit('service-recovered', { service });
    this.emit('disable-degradation-mode', { service });

    // Re-enable features based on service
    switch (service) {
      case 'options-data':
        this.emit('disable-synthetic-pricing');
        this.emit('enable-real-time-pricing');
        break;
      case 'database':
        this.emit('disable-memory-storage');
        this.emit('disable-readonly-mode');
        break;
      case 'market-data':
        this.emit('enable-real-time-updates');
        this.emit('unfreeze-position-updates');
        break;
      case 'risk-management':
        this.emit('restore-normal-limits');
        this.emit('restore-position-sizes');
        break;
      case 'performance':
        this.emit('restore-update-frequency');
        this.emit('enable-analytics');
        break;
    }
  }

  /**
   * Escalate degradation to next level
   */
  private async escalateDegradation(service: string): Promise<void> {
    const currentDegradation = this.activeDegradations.get(service);
    if (!currentDegradation) return;

    const strategies = this.degradationStrategies.get(service);
    if (!strategies) return;

    const currentIndex = strategies.findIndex(s => s.level === currentDegradation.strategy.level);
    const nextStrategy = strategies[currentIndex + 1];

    if (nextStrategy) {
      console.warn(`Escalating degradation for ${service} to ${nextStrategy.level}`);
      await this.applyDegradationStrategy(service, nextStrategy);
      
      this.activeDegradations.set(service, {
        strategy: nextStrategy,
        startTime: new Date()
      });

      this.emit('degradation-escalated', {
        service,
        fromLevel: currentDegradation.strategy.level,
        toLevel: nextStrategy.level
      });
    }
  }

  /**
   * Test if a service is healthy
   */
  private async testServiceHealth(service: string): Promise<boolean> {
    // Simulate health check - in real implementation, this would test actual service
    try {
      switch (service) {
        case 'options-data':
          // Test options API
          return Math.random() > 0.3; // 70% success rate for demo
        case 'database':
          // Test database connection
          return Math.random() > 0.2; // 80% success rate for demo
        case 'market-data':
          // Test market data feed
          return Math.random() > 0.25; // 75% success rate for demo
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize synthetic pricing for options data fallback
   */
  private async initializeSyntheticPricing(): Promise<void> {
    // Initialize Black-Scholes calculator and cache recent data
    console.log('Initializing synthetic options pricing using Black-Scholes model');
    
    // Cache current market data for synthetic calculations
    this.syntheticDataCache.set('risk-free-rate', 0.05); // 5% risk-free rate
    this.syntheticDataCache.set('market-volatility', 0.20); // 20% implied volatility
    
    this.emit('synthetic-pricing-initialized');
  }

  /**
   * Get current service statuses
   */
  public getServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatuses.values());
  }

  /**
   * Get active degradations
   */
  public getActiveDegradations(): Array<{ service: string; strategy: DegradationStrategy; duration: number }> {
    const result: Array<{ service: string; strategy: DegradationStrategy; duration: number }> = [];
    
    this.activeDegradations.forEach((degradation, service) => {
      result.push({
        service,
        strategy: degradation.strategy,
        duration: Date.now() - degradation.startTime.getTime()
      });
    });
    
    return result;
  }

  /**
   * Force recovery of a service
   */
  public async forceRecovery(service: string): Promise<void> {
    await this.recoverService(service);
  }

  /**
   * Get overall system health
   */
  public getSystemHealth(): {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    degradedServices: number;
    criticalServices: number;
    affectedFeatures: string[];
  } {
    const statuses = Array.from(this.serviceStatuses.values());
    const degradedServices = statuses.filter(s => s.status === 'DEGRADED').length;
    const criticalServices = statuses.filter(s => s.degradationLevel === 'CRITICAL' || s.degradationLevel === 'SEVERE').length;
    
    const allAffectedFeatures = new Set<string>();
    statuses.forEach(status => {
      status.affectedFeatures.forEach(feature => allAffectedFeatures.add(feature));
    });

    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    if (criticalServices > 0) {
      overallStatus = 'CRITICAL';
    } else if (degradedServices > 0) {
      overallStatus = 'DEGRADED';
    }

    return {
      status: overallStatus,
      degradedServices,
      criticalServices,
      affectedFeatures: Array.from(allAffectedFeatures)
    };
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(async () => {
      // Check for auto-recovery opportunities
      for (const service of Array.from(this.activeDegradations.keys())) {
        const degradation = this.activeDegradations.get(service);
        if (degradation?.strategy.autoRecover) {
          await this.attemptServiceRecovery(service);
        }
      }
    }, 60000); // Check every minute
  }
}

// Export singleton instance
export const gracefulDegradationManager = new GracefulDegradationManager();