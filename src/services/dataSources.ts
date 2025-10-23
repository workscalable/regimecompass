import { polygonService } from './polygonService';
import { twelveDataService } from './twelveDataService';
import { tradierService } from './tradierService';
import { 
  ServiceResponse, 
  ServiceError, 
  HealthStatus, 
  SystemHealth,
  IndexData,
  SectorData,
  VIXData,
  GammaData,
  OptionsFlow
} from '@/lib/types';

interface DataSourceConfig {
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  fallbackEnabled: boolean;
}

interface ServiceStatus {
  name: string;
  isHealthy: boolean;
  lastError?: ServiceError;
  consecutiveFailures: number;
  lastSuccessTime?: Date;
}

export class DataSourceManager {
  private config: DataSourceConfig;
  private serviceStatuses = new Map<string, ServiceStatus>();
  private circuitBreakers = new Map<string, { isOpen: boolean; openTime?: Date; failureCount: number }>();
  
  // Circuit breaker thresholds
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  constructor(config?: Partial<DataSourceConfig>) {
    this.config = {
      retryAttempts: 2,
      retryDelay: 1000,
      timeout: 10000,
      fallbackEnabled: true,
      ...config
    };

    // Initialize service statuses
    this.serviceStatuses.set('polygon', {
      name: 'polygon',
      isHealthy: true,
      consecutiveFailures: 0
    });

    this.serviceStatuses.set('twelvedata', {
      name: 'twelvedata',
      isHealthy: true,
      consecutiveFailures: 0
    });

    this.serviceStatuses.set('tradier', {
      name: 'tradier',
      isHealthy: true,
      consecutiveFailures: 0
    });

    // Initialize circuit breakers
    this.circuitBreakers.set('polygon', { isOpen: false, failureCount: 0 });
    this.circuitBreakers.set('twelvedata', { isOpen: false, failureCount: 0 });
    this.circuitBreakers.set('tradier', { isOpen: false, failureCount: 0 });
  }

  /**
   * Execute a service call with retry logic and circuit breaker
   */
  private async executeWithRetry<T>(
    serviceName: string,
    operation: () => Promise<ServiceResponse<T>>,
    fallbackOperation?: () => Promise<ServiceResponse<T>>
  ): Promise<ServiceResponse<T>> {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    
    // Check circuit breaker
    if (circuitBreaker?.isOpen) {
      const now = Date.now();
      const openTime = circuitBreaker.openTime?.getTime() || 0;
      
      if (now - openTime < this.CIRCUIT_BREAKER_TIMEOUT) {
        console.warn(`Circuit breaker open for ${serviceName}, using fallback`);
        if (fallbackOperation) {
          return await fallbackOperation();
        }
        throw new Error(`Service circuit breaker is open for ${serviceName}`);
      } else {
        // Reset circuit breaker after timeout
        circuitBreaker.isOpen = false;
        circuitBreaker.failureCount = 0;
        console.info(`Circuit breaker reset for ${serviceName}`);
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
          )
        ]);

        // Success - reset failure tracking
        this.onServiceSuccess(serviceName);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.retryAttempts) {
          console.warn(`${serviceName} attempt ${attempt + 1} failed, retrying in ${this.config.retryDelay}ms:`, lastError.message);
          await this.delay(this.config.retryDelay * (attempt + 1)); // Exponential backoff
        }
      }
    }

    // All attempts failed
    this.onServiceFailure(serviceName, lastError!);

    // Try fallback if available
    if (fallbackOperation && this.config.fallbackEnabled) {
      console.info(`Using fallback for ${serviceName}`);
      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        console.error(`Fallback also failed for ${serviceName}:`, fallbackError);
      }
    }

    throw lastError;
  }

  /**
   * Handle service success
   */
  private onServiceSuccess(serviceName: string): void {
    const status = this.serviceStatuses.get(serviceName);
    if (status) {
      status.isHealthy = true;
      status.consecutiveFailures = 0;
      status.lastSuccessTime = new Date();
      status.lastError = undefined;
    }

    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.failureCount = 0;
      circuitBreaker.isOpen = false;
    }
  }

  /**
   * Handle service failure
   */
  private onServiceFailure(serviceName: string, error: Error): void {
    const status = this.serviceStatuses.get(serviceName);
    if (status) {
      status.isHealthy = false;
      status.consecutiveFailures++;
      status.lastError = {
        service: serviceName,
        message: error.message,
        retryable: true,
        timestamp: new Date()
      };
    }

    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.failureCount++;
      
      if (circuitBreaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
        circuitBreaker.isOpen = true;
        circuitBreaker.openTime = new Date();
        console.warn(`Circuit breaker opened for ${serviceName} after ${circuitBreaker.failureCount} failures`);
      }
    }
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch market data with fallback logic
   */
  async fetchMarketData(symbols?: string[]): Promise<ServiceResponse<Record<string, IndexData>>> {
    return this.executeWithRetry(
      'polygon',
      () => polygonService.fetchMarketData(symbols),
      () => this.generateFallbackMarketData(symbols || ['SPY', 'QQQ', 'IWM'])
    );
  }

  /**
   * Fetch sector ETF data with fallback logic
   */
  async fetchSectorData(): Promise<ServiceResponse<Record<string, SectorData>>> {
    return this.executeWithRetry(
      'polygon',
      () => polygonService.fetchSectorETFs(),
      () => this.generateFallbackSectorData()
    );
  }

  /**
   * Fetch VIX data with fallback logic
   */
  async fetchVIXData(): Promise<ServiceResponse<VIXData>> {
    return this.executeWithRetry(
      'twelvedata',
      () => twelveDataService.fetchVIXData(),
      () => this.generateFallbackVIXData()
    );
  }

  /**
   * Fetch gamma exposure data with fallback logic
   */
  async fetchGammaData(symbol?: string): Promise<ServiceResponse<GammaData>> {
    return this.executeWithRetry(
      'tradier',
      () => tradierService.fetchGammaExposure(symbol),
      () => this.generateFallbackGammaData()
    );
  }

  /**
   * Fetch options flow data with fallback logic
   */
  async fetchOptionsFlow(symbol?: string): Promise<ServiceResponse<OptionsFlow>> {
    return this.executeWithRetry(
      'tradier',
      () => tradierService.fetchOptionsFlow(symbol),
      () => this.generateFallbackOptionsFlow()
    );
  }

  /**
   * Fetch all market data concurrently using Promise.allSettled
   */
  async fetchAllMarketData(symbols?: string[]) {
    const [marketData, sectorData, vixData, gammaData, optionsFlow] = await Promise.allSettled([
      this.fetchMarketData(symbols),
      this.fetchSectorData(),
      this.fetchVIXData(),
      this.fetchGammaData(),
      this.fetchOptionsFlow()
    ]);

    return {
      marketData: marketData.status === 'fulfilled' ? marketData.value : null,
      sectorData: sectorData.status === 'fulfilled' ? sectorData.value : null,
      vixData: vixData.status === 'fulfilled' ? vixData.value : null,
      gammaData: gammaData.status === 'fulfilled' ? gammaData.value : null,
      optionsFlow: optionsFlow.status === 'fulfilled' ? optionsFlow.value : null,
      errors: [
        marketData.status === 'rejected' ? marketData.reason : null,
        sectorData.status === 'rejected' ? sectorData.reason : null,
        vixData.status === 'rejected' ? vixData.reason : null,
        gammaData.status === 'rejected' ? gammaData.reason : null,
        optionsFlow.status === 'rejected' ? optionsFlow.reason : null
      ].filter(Boolean)
    };
  }

  /**
   * Generate fallback market data
   */
  private async generateFallbackMarketData(symbols: string[]): Promise<ServiceResponse<Record<string, IndexData>>> {
    const fallbackData: Record<string, IndexData> = {};
    
    symbols.forEach(symbol => {
      const basePrice = symbol === 'SPY' ? 450 : symbol === 'QQQ' ? 380 : 200;
      const randomChange = (Math.random() - 0.5) * 0.02;
      const price = basePrice * (1 + randomChange);
      
      fallbackData[symbol] = {
        symbol,
        price,
        change: price * randomChange,
        changePercent: randomChange * 100,
        volume: Math.floor(Math.random() * 50000000) + 10000000,
        ema20: price * 0.998,
        ema50: price * 0.995,
        trendScore9: Math.floor(Math.random() * 19) - 9,
        atr14: price * 0.02,
        timestamp: new Date()
      };
    });

    return {
      data: fallbackData,
      timestamp: new Date(),
      source: 'fallback',
      status: 'degraded'
    };
  }

  /**
   * Generate fallback sector data
   */
  private async generateFallbackSectorData(): Promise<ServiceResponse<Record<string, SectorData>>> {
    const sectors = {
      'XLK': 'Technology Select Sector SPDR Fund',
      'XLF': 'Financial Select Sector SPDR Fund',
      'XLV': 'Health Care Select Sector SPDR Fund',
      'XLE': 'Energy Select Sector SPDR Fund',
      'XLI': 'Industrial Select Sector SPDR Fund'
    };

    const fallbackData: Record<string, SectorData> = {};
    
    Object.entries(sectors).forEach(([symbol, name]) => {
      const basePrice = 100 + Math.random() * 200;
      const randomChange = (Math.random() - 0.5) * 0.03;
      const price = basePrice * (1 + randomChange);
      const trendScore = Math.floor(Math.random() * 19) - 9;
      
      let recommendation: 'BUY' | 'SELL' | 'HOLD' | 'AVOID' = 'HOLD';
      if (trendScore >= 5) recommendation = 'BUY';
      else if (trendScore <= -3) recommendation = 'AVOID';
      
      fallbackData[symbol] = {
        symbol,
        name,
        price,
        change: price * randomChange,
        changePercent: randomChange * 100,
        volume: Math.floor(Math.random() * 20000000) + 5000000,
        trendScore9: trendScore,
        relativeStrength: trendScore / 9,
        recommendation,
        timestamp: new Date()
      };
    });

    return {
      data: fallbackData,
      timestamp: new Date(),
      source: 'fallback',
      status: 'degraded'
    };
  }

  /**
   * Generate fallback VIX data
   */
  private async generateFallbackVIXData(): Promise<ServiceResponse<VIXData>> {
    const baseVix = 18 + Math.random() * 10;
    const change = (Math.random() - 0.5) * 2;
    const currentVix = Math.max(10, baseVix + change);
    const fiveDayChange = (Math.random() - 0.5) * 4;

    const fallbackData: VIXData = {
      value: currentVix,
      change,
      changePercent: (change / baseVix) * 100,
      trend: fiveDayChange > 1 ? 'rising' : fiveDayChange < -1 ? 'falling' : 'flat',
      fiveDayChange,
      timestamp: new Date()
    };

    return {
      data: fallbackData,
      timestamp: new Date(),
      source: 'fallback',
      status: 'degraded'
    };
  }

  /**
   * Generate fallback gamma data
   */
  private async generateFallbackGammaData(): Promise<ServiceResponse<GammaData>> {
    const gex = (Math.random() - 0.5) * 2000000000;
    const zeroGammaDist = Math.random() * 0.02;
    
    const fallbackData: GammaData = {
      gex,
      zeroGammaDist,
      gammaFlip: 450 + (Math.random() - 0.5) * 20,
      bias: gex > 500000000 ? 'supportive' : gex < -500000000 ? 'suppressive' : 'neutral',
      timestamp: new Date()
    };

    return {
      data: fallbackData,
      timestamp: new Date(),
      source: 'fallback',
      status: 'degraded'
    };
  }

  /**
   * Generate fallback options flow data
   */
  private async generateFallbackOptionsFlow(): Promise<ServiceResponse<OptionsFlow>> {
    const callVolume = Math.floor(Math.random() * 1000000) + 100000;
    const putVolume = Math.floor(Math.random() * 800000) + 80000;
    const putCallRatio = putVolume / callVolume;
    
    const fallbackData: OptionsFlow = {
      bias: putCallRatio < 0.7 ? 'bullish' : putCallRatio > 1.3 ? 'bearish' : 'neutral',
      confidence: 0.5 + Math.random() * 0.3,
      unusualActivity: Math.random() > 0.7,
      callVolume,
      putVolume,
      putCallRatio,
      impliedVolatilityTrend: 'flat',
      largeBlockTrades: Math.floor(Math.random() * 50) + 10,
      forwardBias: 'neutral'
    };

    return {
      data: fallbackData,
      timestamp: new Date(),
      source: 'fallback',
      status: 'degraded'
    };
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const [polygonHealth, twelveDataHealth, tradierHealth] = await Promise.allSettled([
      polygonService.getHealthStatus(),
      twelveDataService.getHealthStatus(),
      tradierService.getHealthStatus()
    ]);

    const services: HealthStatus[] = [
      polygonHealth.status === 'fulfilled' ? polygonHealth.value : {
        service: 'polygon',
        status: 'offline' as const,
        responseTime: 0,
        lastCheck: new Date(),
        errorCount: 1,
        uptime: 0
      },
      twelveDataHealth.status === 'fulfilled' ? twelveDataHealth.value : {
        service: 'twelvedata',
        status: 'offline' as const,
        responseTime: 0,
        lastCheck: new Date(),
        errorCount: 1,
        uptime: 0
      },
      tradierHealth.status === 'fulfilled' ? tradierHealth.value : {
        service: 'tradier',
        status: 'offline' as const,
        responseTime: 0,
        lastCheck: new Date(),
        errorCount: 1,
        uptime: 0
      }
    ];

    // Determine overall system health
    const onlineServices = services.filter(s => s.status === 'online').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'critical';
    if (onlineServices >= 2) {
      overall = 'healthy';
    } else if (onlineServices >= 1 || degradedServices >= 2) {
      overall = 'degraded';
    } else {
      overall = 'critical';
    }

    // Calculate performance metrics
    const avgResponseTime = services.reduce((sum, s) => sum + s.responseTime, 0) / services.length;
    const errorRate = services.reduce((sum, s) => sum + s.errorCount, 0) / services.length;

    return {
      overall,
      services,
      dataFreshness: {
        marketData: 5, // minutes
        vixData: 5,
        optionsData: 10
      },
      performance: {
        avgResponseTime,
        cacheHitRate: 0.75, // TODO: Calculate actual cache hit rate
        errorRate: errorRate / 10 // Normalize error rate
      },
      timestamp: new Date()
    };
  }

  /**
   * Get service status summary
   */
  getServiceStatuses(): Map<string, ServiceStatus> {
    return new Map(this.serviceStatuses);
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuitBreaker(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
      circuitBreaker.openTime = undefined;
      console.info(`Circuit breaker manually reset for ${serviceName}`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DataSourceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear all service caches
   */
  clearAllCaches(): void {
    polygonService.clearCache?.();
    twelveDataService.clearCache?.();
    tradierService.clearCache?.();
  }
}

// Export singleton instance
export const dataSourceManager = new DataSourceManager();