import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { GammaData, OptionsFlow, ServiceResponse, ServiceError, TradingBias, VolatilityTrend, HealthStatus } from '@/lib/types';
import { GammaDataSchema, OptionsFlowSchema } from '@/lib/validation';

interface TradierQuoteResponse {
  quotes: {
    quote: Array<{
      symbol: string;
      description: string;
      exch: string;
      type: string;
      last: number;
      change: number;
      volume: number;
      open: number;
      high: number;
      low: number;
      close: number;
      bid: number;
      ask: number;
      underlying?: string;
      strike?: number;
      expiration_date?: string;
      expiration_type?: string;
      option_type?: string;
      contract_size?: number;
      open_interest?: number;
      bid_size?: number;
      ask_size?: number;
      average_volume?: number;
      last_volume?: number;
      trade_date?: number;
      prevclose?: number;
      week_52_high?: number;
      week_52_low?: number;
      biddate?: number;
      bidexch?: string;
      bid_iv?: number;
      askdate?: number;
      askexch?: string;
      ask_iv?: number;
      last_iv?: number;
      delta?: number;
      gamma?: number;
      theta?: number;
      vega?: number;
      rho?: number;
    }>;
  };
}

interface TradierOptionsChainResponse {
  options: {
    option: Array<{
      symbol: string;
      description: string;
      exch: string;
      type: string;
      last: number;
      change: number;
      volume: number;
      open: number;
      high: number;
      low: number;
      close: number;
      bid: number;
      ask: number;
      underlying: string;
      strike: number;
      expiration_date: string;
      expiration_type: string;
      option_type: string;
      contract_size: number;
      open_interest: number;
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      rho: number;
      bid_iv: number;
      mid_iv: number;
      ask_iv: number;
    }>;
  };
}

interface TradierMarketCalendarResponse {
  calendar: {
    month: number;
    year: number;
    days: {
      day: Array<{
        date: string;
        status: string;
        description?: string;
        premarket?: {
          start: string;
          end: string;
        };
        open?: {
          start: string;
          end: string;
        };
        postmarket?: {
          start: string;
          end: string;
        };
      }>;
    };
  };
}

export class TradierService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl = 'https://api.tradier.com/v1';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes for options data

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TRADIER_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Tradier API key not provided. Service will use mock data.');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const serviceError: ServiceError = {
          service: 'tradier',
          message: error.message || 'Unknown Tradier API error',
          statusCode: error.response?.status,
          retryable: error.response?.status >= 500 || error.code === 'ECONNABORTED',
          timestamp: new Date()
        };
        return Promise.reject(serviceError);
      }
    );
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTimeout;
  }

  /**
   * Get cached data if available and valid
   */
  private getCachedData(cacheKey: string): any | null {
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)?.data;
    }
    return null;
  }

  /**
   * Cache data with timestamp
   */
  private setCachedData(cacheKey: string, data: any): void {
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  /**
   * Calculate gamma exposure from options chain
   */
  private calculateGammaExposure(optionsChain: any[]): { gex: number; zeroGammaDist: number; gammaFlip: number } {
    if (!optionsChain || optionsChain.length === 0) {
      return { gex: 0, zeroGammaDist: 0.01, gammaFlip: 0 };
    }

    let totalCallGamma = 0;
    let totalPutGamma = 0;
    let totalCallOI = 0;
    let totalPutOI = 0;
    let underlyingPrice = 0;

    // Find underlying price from options data
    if (optionsChain.length > 0) {
      // Estimate underlying price from ATM options
      const strikes = optionsChain.map(opt => opt.strike).sort((a, b) => a - b);
      underlyingPrice = strikes[Math.floor(strikes.length / 2)];
    }

    // Calculate gamma exposure
    optionsChain.forEach(option => {
      const gamma = option.gamma || 0;
      const openInterest = option.open_interest || 0;
      const notionalGamma = gamma * openInterest * 100 * underlyingPrice; // 100 shares per contract

      if (option.option_type === 'call') {
        totalCallGamma += notionalGamma;
        totalCallOI += openInterest;
      } else if (option.option_type === 'put') {
        totalPutGamma += notionalGamma;
        totalPutOI += openInterest;
      }
    });

    // Net gamma exposure (calls are positive, puts are negative for dealers)
    const gex = totalCallGamma - totalPutGamma;

    // Zero gamma distance (simplified calculation)
    const zeroGammaDist = Math.abs(gex) / (underlyingPrice * 1000000); // Normalize

    // Gamma flip level (where dealers switch from long to short gamma)
    const gammaFlip = underlyingPrice * (1 + (gex > 0 ? 0.02 : -0.02));

    return { gex, zeroGammaDist, gammaFlip };
  }

  /**
   * Generate mock gamma data for testing
   */
  private generateMockGammaData(): GammaData {
    const gex = (Math.random() - 0.5) * 2000000000; // ±2B gamma exposure
    const zeroGammaDist = Math.random() * 0.02; // 0-2% distance
    const gammaFlip = 450 + (Math.random() - 0.5) * 20; // Around SPY price

    let bias: 'supportive' | 'suppressive' | 'neutral' = 'neutral';
    if (gex > 500000000 && zeroGammaDist < 0.01) bias = 'supportive';
    else if (gex < -500000000) bias = 'suppressive';

    return {
      gex,
      zeroGammaDist,
      gammaFlip,
      bias,
      timestamp: new Date()
    };
  }

  /**
   * Generate mock options flow data
   */
  private generateMockOptionsFlow(): OptionsFlow {
    const callVolume = Math.floor(Math.random() * 1000000) + 100000;
    const putVolume = Math.floor(Math.random() * 800000) + 80000;
    const putCallRatio = putVolume / callVolume;
    const unusualActivity = Math.random() > 0.7; // 30% chance of unusual activity
    
    let bias: TradingBias = 'neutral';
    if (putCallRatio < 0.7) bias = 'bullish';
    else if (putCallRatio > 1.3) bias = 'bearish';

    const ivTrends: VolatilityTrend[] = ['rising', 'falling', 'flat'];
    const impliedVolatilityTrend = ivTrends[Math.floor(Math.random() * ivTrends.length)];

    return {
      bias,
      confidence: 0.5 + Math.random() * 0.4, // 50-90% confidence
      unusualActivity,
      callVolume,
      putVolume,
      putCallRatio,
      impliedVolatilityTrend,
      largeBlockTrades: Math.floor(Math.random() * 50) + 10,
      forwardBias: bias
    };
  }

  /**
   * Fetch gamma exposure data
   */
  async fetchGammaExposure(symbol: string = 'SPY'): Promise<ServiceResponse<GammaData>> {
    const cacheKey = `gamma_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return {
        data: cached,
        timestamp: new Date(),
        source: 'tradier',
        status: 'cached'
      };
    }

    if (!this.apiKey) {
      // Return mock data when no API key
      const mockData = this.generateMockGammaData();
      return {
        data: mockData,
        timestamp: new Date(),
        source: 'tradier_mock',
        status: 'degraded'
      };
    }

    try {
      // Get next Friday expiration for weekly options
      const nextFriday = this.getNextFriday();
      const expirationDate = nextFriday.toISOString().split('T')[0];

      // Fetch options chain
      const response: AxiosResponse<TradierOptionsChainResponse> = await this.client.get('/markets/options/chains', {
        params: {
          symbol,
          expiration: expirationDate,
          greeks: true
        }
      });

      let optionsChain: any[] = [];
      if (response.data.options && response.data.options.option) {
        optionsChain = Array.isArray(response.data.options.option) 
          ? response.data.options.option 
          : [response.data.options.option];
      }

      const { gex, zeroGammaDist, gammaFlip } = this.calculateGammaExposure(optionsChain);

      // Determine gamma bias
      let bias: 'supportive' | 'suppressive' | 'neutral' = 'neutral';
      if (gex > 500000000 && zeroGammaDist < 0.01) {
        bias = 'supportive'; // Dealers long gamma, supportive of current price
      } else if (gex < -500000000) {
        bias = 'suppressive'; // Dealers short gamma, suppressive of price moves
      }

      const gammaData: GammaData = {
        gex,
        zeroGammaDist,
        gammaFlip,
        bias,
        timestamp: new Date()
      };

      // Validate the data
      GammaDataSchema.parse(gammaData);

      this.setCachedData(cacheKey, gammaData);

      return {
        data: gammaData,
        timestamp: new Date(),
        source: 'tradier',
        status: 'success'
      };

    } catch (error) {
      console.error(`Error fetching gamma exposure for ${symbol}:`, error);
      
      // Return mock data as fallback
      const mockData = this.generateMockGammaData();
      return {
        data: mockData,
        timestamp: new Date(),
        source: 'tradier_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze options flow for unusual activity
   */
  async fetchOptionsFlow(symbol: string = 'SPY'): Promise<ServiceResponse<OptionsFlow>> {
    const cacheKey = `options_flow_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return {
        data: cached,
        timestamp: new Date(),
        source: 'tradier',
        status: 'cached'
      };
    }

    if (!this.apiKey) {
      // Return mock data when no API key
      const mockData = this.generateMockOptionsFlow();
      return {
        data: mockData,
        timestamp: new Date(),
        source: 'tradier_mock',
        status: 'degraded'
      };
    }

    try {
      // Fetch multiple expirations for comprehensive analysis
      const expirations = this.getNextExpirations(3);
      const allOptionsData: any[] = [];

      for (const expiration of expirations) {
        try {
          const response: AxiosResponse<TradierOptionsChainResponse> = await this.client.get('/markets/options/chains', {
            params: {
              symbol,
              expiration: expiration.toISOString().split('T')[0],
              greeks: true
            }
          });

          if (response.data.options && response.data.options.option) {
            const options = Array.isArray(response.data.options.option) 
              ? response.data.options.option 
              : [response.data.options.option];
            allOptionsData.push(...options);
          }
        } catch (error) {
          console.warn(`Failed to fetch options for expiration ${expiration}:`, error);
        }
      }

      // Analyze options flow
      let totalCallVolume = 0;
      let totalPutVolume = 0;
      let largeBlockTrades = 0;
      let totalCallIV = 0;
      let totalPutIV = 0;
      let callCount = 0;
      let putCount = 0;

      allOptionsData.forEach(option => {
        const volume = option.volume || 0;
        const iv = option.mid_iv || 0;

        if (option.option_type === 'call') {
          totalCallVolume += volume;
          totalCallIV += iv;
          callCount++;
        } else if (option.option_type === 'put') {
          totalPutVolume += volume;
          totalPutIV += iv;
          putCount++;
        }

        // Count large block trades (>100 contracts)
        if (volume > 100) {
          largeBlockTrades++;
        }
      });

      const putCallRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 1;
      const avgCallIV = callCount > 0 ? totalCallIV / callCount : 0;
      const avgPutIV = putCount > 0 ? totalPutIV / putCount : 0;

      // Determine bias
      let bias: TradingBias = 'neutral';
      if (putCallRatio < 0.7) bias = 'bullish';
      else if (putCallRatio > 1.3) bias = 'bearish';

      // Determine IV trend (simplified)
      let impliedVolatilityTrend: VolatilityTrend = 'flat';
      if (avgCallIV > avgPutIV * 1.1) impliedVolatilityTrend = 'rising';
      else if (avgPutIV > avgCallIV * 1.1) impliedVolatilityTrend = 'falling';

      // Detect unusual activity
      const avgDailyVolume = (totalCallVolume + totalPutVolume) / 252; // Rough annual average
      const unusualActivity = (totalCallVolume + totalPutVolume) > avgDailyVolume * 2;

      const confidence = Math.min(0.9, 0.3 + (Math.abs(putCallRatio - 1) * 0.6) + (unusualActivity ? 0.2 : 0));

      const optionsFlow: OptionsFlow = {
        bias,
        confidence,
        unusualActivity,
        callVolume: totalCallVolume,
        putVolume: totalPutVolume,
        putCallRatio,
        impliedVolatilityTrend,
        largeBlockTrades,
        forwardBias: bias
      };

      // Validate the data
      OptionsFlowSchema.parse(optionsFlow);

      this.setCachedData(cacheKey, optionsFlow);

      return {
        data: optionsFlow,
        timestamp: new Date(),
        source: 'tradier',
        status: 'success'
      };

    } catch (error) {
      console.error(`Error fetching options flow for ${symbol}:`, error);
      
      // Return mock data as fallback
      const mockData = this.generateMockOptionsFlow();
      return {
        data: mockData,
        timestamp: new Date(),
        source: 'tradier_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Detect unusual options activity
   */
  async fetchUnusualActivity(symbol: string = 'SPY'): Promise<ServiceResponse<{ alerts: any[]; summary: string }>> {
    const cacheKey = `unusual_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return {
        data: cached,
        timestamp: new Date(),
        source: 'tradier',
        status: 'cached'
      };
    }

    if (!this.apiKey) {
      // Return mock unusual activity data
      const mockAlerts = [
        {
          symbol: `${symbol}240315C00450000`,
          type: 'call',
          strike: 450,
          expiration: '2024-03-15',
          volume: 5000,
          openInterest: 1200,
          volumeOIRatio: 4.17,
          description: 'High volume relative to open interest'
        }
      ];

      return {
        data: {
          alerts: mockAlerts,
          summary: `${mockAlerts.length} unusual activity alerts for ${symbol}`
        },
        timestamp: new Date(),
        source: 'tradier_mock',
        status: 'degraded'
      };
    }

    try {
      // This would typically use a specialized unusual activity endpoint
      // For now, we'll analyze the options chain for unusual patterns
      const optionsFlowResponse = await this.fetchOptionsFlow(symbol);
      const optionsFlow = optionsFlowResponse.data;

      const alerts: any[] = [];
      let summary = 'No unusual activity detected';

      if (optionsFlow.unusualActivity) {
        alerts.push({
          type: 'volume_spike',
          description: `Unusual options volume detected: ${optionsFlow.callVolume + optionsFlow.putVolume} contracts`,
          putCallRatio: optionsFlow.putCallRatio,
          confidence: optionsFlow.confidence
        });

        if (optionsFlow.largeBlockTrades > 20) {
          alerts.push({
            type: 'large_blocks',
            description: `${optionsFlow.largeBlockTrades} large block trades detected`,
            count: optionsFlow.largeBlockTrades
          });
        }

        summary = `${alerts.length} unusual activity alerts detected`;
      }

      const result = { alerts, summary };
      this.setCachedData(cacheKey, result);

      return {
        data: result,
        timestamp: new Date(),
        source: 'tradier',
        status: 'success'
      };

    } catch (error) {
      console.error(`Error fetching unusual activity for ${symbol}:`, error);
      
      return {
        data: {
          alerts: [],
          summary: 'Error fetching unusual activity data'
        },
        timestamp: new Date(),
        source: 'tradier_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get next Friday (typical options expiration)
   */
  private getNextFriday(): Date {
    const today = new Date();
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    const nextFriday = new Date(today);
    nextFriday.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    return nextFriday;
  }

  /**
   * Get next N option expirations
   */
  private getNextExpirations(count: number): Date[] {
    const expirations: Date[] = [];
    let currentFriday = this.getNextFriday();

    for (let i = 0; i < count; i++) {
      expirations.push(new Date(currentFriday));
      currentFriday.setDate(currentFriday.getDate() + 7); // Next week
    }

    return expirations;
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false; // No API key, can't test real connection
      }

      const response = await this.client.get('/markets/quotes', {
        params: {
          symbols: 'SPY'
        }
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Tradier connection test failed:', error);
      return false;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const startTime = Date.now();
    const isConnected = await this.testConnection();
    const responseTime = Date.now() - startTime;

    return {
      service: 'tradier',
      status: isConnected ? 'online' : (this.apiKey ? 'offline' : 'degraded'),
      responseTime,
      lastCheck: new Date(),
      errorCount: 0, // TODO: Implement error counting
      uptime: 1 // TODO: Implement uptime tracking
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      timeout: this.cacheTimeout
    };
  }
}

// Export singleton instance
export const tradierService = new TradierService();