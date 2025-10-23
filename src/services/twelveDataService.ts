import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { VIXData, ServiceResponse, ServiceError, VolatilityTrend, HealthStatus } from '@/lib/types';
import { VIXDataSchema } from '@/lib/validation';

interface TwelveDataTimeSeriesResponse {
  meta: {
    symbol: string;
    interval: string;
    currency: string;
    exchange_timezone: string;
    exchange: string;
    mic_code: string;
    type: string;
  };
  values: Array<{
    datetime: string;
    open: string;
    high: string;
    low: string;
    close: string;
    volume?: string;
  }>;
  status: string;
}

interface TwelveDataQuoteResponse {
  symbol: string;
  name: string;
  exchange: string;
  mic_code: string;
  currency: string;
  datetime: string;
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  previous_close: string;
  change: string;
  percent_change: string;
  average_volume: string;
  is_market_open: boolean;
}

interface TwelveDataTechnicalIndicatorResponse {
  meta: {
    symbol: string;
    indicator: {
      name: string;
      time_period?: number;
    };
    last_refreshed: string;
    interval: string;
    status: string;
  };
  values: Array<{
    datetime: string;
    [key: string]: string;
  }>;
  status: string;
}

export class TwelveDataService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl = 'https://api.twelvedata.com';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.TWELVEDATA_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Twelve Data API key not provided. Service will use mock data.');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for API key
    this.client.interceptors.request.use(
      (config) => {
        if (this.apiKey) {
          config.params = { ...config.params, apikey: this.apiKey };
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const serviceError: ServiceError = {
          service: 'twelvedata',
          message: error.message || 'Unknown Twelve Data API error',
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
   * Determine volatility trend from VIX data
   */
  private determineVolatilityTrend(currentVix: number, previousVix: number, fiveDayChange: number): VolatilityTrend {
    const shortTermChange = currentVix - previousVix;
    const threshold = 0.5; // Minimum change to consider trending

    if (Math.abs(shortTermChange) < threshold && Math.abs(fiveDayChange) < 1) {
      return 'flat';
    }

    // Prioritize 5-day trend over daily change
    if (Math.abs(fiveDayChange) > Math.abs(shortTermChange)) {
      return fiveDayChange > 0 ? 'rising' : 'falling';
    }

    return shortTermChange > 0 ? 'rising' : 'falling';
  }

  /**
   * Generate mock VIX data for testing
   */
  private generateMockVIXData(): VIXData {
    const baseVix = 18 + Math.random() * 10; // VIX between 18-28
    const change = (Math.random() - 0.5) * 2; // ±1 point change
    const currentVix = Math.max(10, baseVix + change);
    const previousVix = baseVix;
    const fiveDayChange = (Math.random() - 0.5) * 4; // ±2 point 5-day change

    return {
      value: currentVix,
      change,
      changePercent: (change / previousVix) * 100,
      trend: this.determineVolatilityTrend(currentVix, previousVix, fiveDayChange),
      fiveDayChange,
      timestamp: new Date()
    };
  }

  /**
   * Fetch VIX data
   */
  async fetchVIXData(): Promise<ServiceResponse<VIXData>> {
    const cacheKey = 'vix_data';
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return {
        data: cached,
        timestamp: new Date(),
        source: 'twelvedata',
        status: 'cached'
      };
    }

    if (!this.apiKey) {
      // Return mock data when no API key
      const mockData = this.generateMockVIXData();
      return {
        data: mockData,
        timestamp: new Date(),
        source: 'twelvedata_mock',
        status: 'degraded'
      };
    }

    try {
      // Fetch current VIX quote
      const quoteResponse: AxiosResponse<TwelveDataQuoteResponse> = await this.client.get('/quote', {
        params: {
          symbol: 'VIX',
          interval: '1day'
        }
      });

      // Fetch VIX time series for trend analysis
      const timeSeriesResponse: AxiosResponse<TwelveDataTimeSeriesResponse> = await this.client.get('/time_series', {
        params: {
          symbol: 'VIX',
          interval: '1day',
          outputsize: 10
        }
      });

      const quote = quoteResponse.data;
      const timeSeries = timeSeriesResponse.data;

      if (!quote || !timeSeries.values || timeSeries.values.length < 2) {
        throw new Error('Insufficient VIX data received');
      }

      const currentVix = parseFloat(quote.close);
      const previousVix = parseFloat(quote.previous_close);
      const change = parseFloat(quote.change);
      const changePercent = parseFloat(quote.percent_change);

      // Calculate 5-day change
      const fiveDaysAgo = timeSeries.values.length >= 6 ? parseFloat(timeSeries.values[5].close) : previousVix;
      const fiveDayChange = currentVix - fiveDaysAgo;

      const vixData: VIXData = {
        value: currentVix,
        change,
        changePercent,
        trend: this.determineVolatilityTrend(currentVix, previousVix, fiveDayChange),
        fiveDayChange,
        timestamp: new Date(quote.datetime)
      };

      // Validate the data
      VIXDataSchema.parse(vixData);

      this.setCachedData(cacheKey, vixData);

      return {
        data: vixData,
        timestamp: new Date(),
        source: 'twelvedata',
        status: 'success'
      };

    } catch (error) {
      console.error('Error fetching VIX data from Twelve Data:', error);
      
      // Return mock data as fallback
      const mockData = this.generateMockVIXData();
      return {
        data: mockData,
        timestamp: new Date(),
        source: 'twelvedata_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch moving averages for a symbol
   */
  async fetchMovingAverages(
    symbol: string, 
    periods: number[] = [20, 50]
  ): Promise<ServiceResponse<Record<string, number>>> {
    const cacheKey = `ma_${symbol}_${periods.join('_')}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return {
        data: cached,
        timestamp: new Date(),
        source: 'twelvedata',
        status: 'cached'
      };
    }

    if (!this.apiKey) {
      // Return mock data when no API key
      const mockData: Record<string, number> = {};
      const basePrice = symbol === 'SPY' ? 450 : 380;
      periods.forEach(period => {
        mockData[`ema${period}`] = basePrice * (1 - period * 0.001); // Slightly lower for longer periods
      });

      return {
        data: mockData,
        timestamp: new Date(),
        source: 'twelvedata_mock',
        status: 'degraded'
      };
    }

    try {
      const results: Record<string, number> = {};

      // Fetch EMA for each period
      for (const period of periods) {
        try {
          const response: AxiosResponse<TwelveDataTechnicalIndicatorResponse> = await this.client.get('/ema', {
            params: {
              symbol,
              interval: '1day',
              time_period: period,
              outputsize: 1
            }
          });

          if (response.data.values && response.data.values.length > 0) {
            const latestValue = response.data.values[0];
            const emaKey = Object.keys(latestValue).find(key => key !== 'datetime');
            if (emaKey) {
              results[`ema${period}`] = parseFloat(latestValue[emaKey]);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch EMA${period} for ${symbol}:`, error);
          // Use fallback calculation or skip this period
        }
      }

      this.setCachedData(cacheKey, results);

      return {
        data: results,
        timestamp: new Date(),
        source: 'twelvedata',
        status: 'success'
      };

    } catch (error) {
      console.error(`Error fetching moving averages for ${symbol}:`, error);
      
      // Return mock data as fallback
      const mockData: Record<string, number> = {};
      const basePrice = symbol === 'SPY' ? 450 : 380;
      periods.forEach(period => {
        mockData[`ema${period}`] = basePrice * (1 - period * 0.001);
      });

      return {
        data: mockData,
        timestamp: new Date(),
        source: 'twelvedata_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch technical indicators (RSI, MACD)
   */
  async fetchTechnicalIndicators(
    symbol: string
  ): Promise<ServiceResponse<{ rsi?: number; macd?: { macd: number; signal: number; histogram: number } }>> {
    const cacheKey = `tech_${symbol}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return {
        data: cached,
        timestamp: new Date(),
        source: 'twelvedata',
        status: 'cached'
      };
    }

    if (!this.apiKey) {
      // Return mock data when no API key
      const mockData = {
        rsi: 45 + Math.random() * 20, // RSI between 45-65
        macd: {
          macd: (Math.random() - 0.5) * 2,
          signal: (Math.random() - 0.5) * 1.5,
          histogram: (Math.random() - 0.5) * 0.5
        }
      };

      return {
        data: mockData,
        timestamp: new Date(),
        source: 'twelvedata_mock',
        status: 'degraded'
      };
    }

    try {
      const results: any = {};

      // Fetch RSI
      try {
        const rsiResponse: AxiosResponse<TwelveDataTechnicalIndicatorResponse> = await this.client.get('/rsi', {
          params: {
            symbol,
            interval: '1day',
            time_period: 14,
            outputsize: 1
          }
        });

        if (rsiResponse.data.values && rsiResponse.data.values.length > 0) {
          const latestRsi = rsiResponse.data.values[0];
          const rsiKey = Object.keys(latestRsi).find(key => key !== 'datetime');
          if (rsiKey) {
            results.rsi = parseFloat(latestRsi[rsiKey]);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch RSI for ${symbol}:`, error);
      }

      // Fetch MACD
      try {
        const macdResponse: AxiosResponse<TwelveDataTechnicalIndicatorResponse> = await this.client.get('/macd', {
          params: {
            symbol,
            interval: '1day',
            fast_period: 12,
            slow_period: 26,
            signal_period: 9,
            outputsize: 1
          }
        });

        if (macdResponse.data.values && macdResponse.data.values.length > 0) {
          const latestMacd = macdResponse.data.values[0];
          results.macd = {
            macd: parseFloat(latestMacd.macd || '0'),
            signal: parseFloat(latestMacd.macd_signal || '0'),
            histogram: parseFloat(latestMacd.macd_hist || '0')
          };
        }
      } catch (error) {
        console.warn(`Failed to fetch MACD for ${symbol}:`, error);
      }

      this.setCachedData(cacheKey, results);

      return {
        data: results,
        timestamp: new Date(),
        source: 'twelvedata',
        status: 'success'
      };

    } catch (error) {
      console.error(`Error fetching technical indicators for ${symbol}:`, error);
      
      // Return mock data as fallback
      const mockData = {
        rsi: 45 + Math.random() * 20,
        macd: {
          macd: (Math.random() - 0.5) * 2,
          signal: (Math.random() - 0.5) * 1.5,
          histogram: (Math.random() - 0.5) * 0.5
        }
      };

      return {
        data: mockData,
        timestamp: new Date(),
        source: 'twelvedata_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch market status
   */
  async fetchMarketStatus(): Promise<ServiceResponse<{ isOpen: boolean; nextOpen?: string; nextClose?: string }>> {
    const cacheKey = 'market_status';
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return {
        data: cached,
        timestamp: new Date(),
        source: 'twelvedata',
        status: 'cached'
      };
    }

    if (!this.apiKey) {
      // Return mock market status
      const now = new Date();
      const hour = now.getHours();
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      const isMarketHours = hour >= 9 && hour < 16; // Simplified market hours
      
      return {
        data: {
          isOpen: isWeekday && isMarketHours
        },
        timestamp: new Date(),
        source: 'twelvedata_mock',
        status: 'degraded'
      };
    }

    try {
      const response = await this.client.get('/market_state', {
        params: {
          exchange: 'NASDAQ'
        }
      });

      const marketData = {
        isOpen: response.data.is_market_open || false,
        nextOpen: response.data.next_open,
        nextClose: response.data.next_close
      };

      this.setCachedData(cacheKey, marketData);

      return {
        data: marketData,
        timestamp: new Date(),
        source: 'twelvedata',
        status: 'success'
      };

    } catch (error) {
      console.error('Error fetching market status:', error);
      
      // Return mock status as fallback
      const now = new Date();
      const hour = now.getHours();
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      const isMarketHours = hour >= 9 && hour < 16;
      
      return {
        data: {
          isOpen: isWeekday && isMarketHours
        },
        timestamp: new Date(),
        source: 'twelvedata_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false; // No API key, can't test real connection
      }

      const response = await this.client.get('/quote', {
        params: {
          symbol: 'SPY'
        }
      });
      
      return response.status === 200 && response.data.symbol === 'SPY';
    } catch (error) {
      console.error('Twelve Data connection test failed:', error);
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
      service: 'twelvedata',
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
export const twelveDataService = new TwelveDataService();