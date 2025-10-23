import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { IndexData, SectorData, ServiceResponse, ServiceError, HealthStatus } from '@/lib/types';
import { validateIndexData, validateSectorData } from '@/lib/validation';

interface PolygonAggregateResponse {
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results: Array<{
    v: number; // volume
    vw: number; // volume weighted average price
    o: number; // open
    c: number; // close
    h: number; // high
    l: number; // low
    t: number; // timestamp
    n: number; // number of transactions
  }>;
  status: string;
  request_id: string;
  count: number;
}

interface PolygonTickerDetailsResponse {
  results: {
    ticker: string;
    name: string;
    market: string;
    locale: string;
    primary_exchange: string;
    type: string;
    active: boolean;
    currency_name: string;
    cik?: string;
    composite_figi?: string;
    share_class_figi?: string;
    market_cap?: number;
    phone_number?: string;
    address?: {
      address1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
    };
    description?: string;
    sic_code?: string;
    sic_description?: string;
    ticker_root?: string;
    homepage_url?: string;
    total_employees?: number;
    list_date?: string;
    branding?: {
      logo_url?: string;
      icon_url?: string;
    };
    share_class_shares_outstanding?: number;
    weighted_shares_outstanding?: number;
  };
  status: string;
  request_id: string;
}

export class PolygonService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl = 'https://api.polygon.io';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Major sector ETFs for breadth analysis
  private readonly sectorETFs = {
    'XLK': 'Technology Select Sector SPDR Fund',
    'XLF': 'Financial Select Sector SPDR Fund',
    'XLV': 'Health Care Select Sector SPDR Fund',
    'XLE': 'Energy Select Sector SPDR Fund',
    'XLI': 'Industrial Select Sector SPDR Fund',
    'XLC': 'Communication Services Select Sector SPDR Fund',
    'XLY': 'Consumer Discretionary Select Sector SPDR Fund',
    'XLP': 'Consumer Staples Select Sector SPDR Fund',
    'XLU': 'Utilities Select Sector SPDR Fund',
    'XLB': 'Materials Select Sector SPDR Fund',
    'XLRE': 'Real Estate Select Sector SPDR Fund'
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.POLYGON_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Polygon API key not provided. Service will use mock data.');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(
      (config) => {
        // Add API key to params if not in headers
        if (this.apiKey && !config.headers.Authorization) {
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
          service: 'polygon',
          message: error.message || 'Unknown Polygon API error',
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
   * Fetch aggregated data for a symbol
   */
  private async fetchAggregates(
    symbol: string, 
    timespan: 'minute' | 'hour' | 'day' = 'day',
    multiplier: number = 1,
    from: string,
    to: string
  ): Promise<PolygonAggregateResponse> {
    const cacheKey = `aggregates_${symbol}_${timespan}_${from}_${to}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return cached;
    }

    if (!this.apiKey) {
      // Return mock data when no API key
      return this.generateMockAggregateData(symbol);
    }

    try {
      const response: AxiosResponse<PolygonAggregateResponse> = await this.client.get(
        `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`,
        {
          params: {
            adjusted: true,
            sort: 'desc',
            limit: 50
          }
        }
      );

      this.setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Polygon aggregates for ${symbol}:`, error);
      // Return mock data as fallback
      return this.generateMockAggregateData(symbol);
    }
  }

  /**
   * Generate mock aggregate data for testing
   */
  private generateMockAggregateData(symbol: string): PolygonAggregateResponse {
    const basePrice = symbol === 'SPY' ? 450 : symbol === 'QQQ' ? 380 : 200;
    const results = [];
    
    for (let i = 49; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const randomChange = (Math.random() - 0.5) * 0.02; // ±1% random change
      const price = basePrice * (1 + randomChange * (i / 10));
      const volume = Math.floor(Math.random() * 50000000) + 10000000;
      
      results.push({
        v: volume,
        vw: price,
        o: price * 0.999,
        c: price,
        h: price * 1.005,
        l: price * 0.995,
        t: date.getTime(),
        n: Math.floor(Math.random() * 10000) + 1000
      });
    }

    return {
      ticker: symbol,
      queryCount: 1,
      resultsCount: results.length,
      adjusted: true,
      results,
      status: 'OK',
      request_id: 'mock_request',
      count: results.length
    };
  }

  /**
   * Fetch market data for major indexes
   */
  async fetchMarketData(symbols: string[] = ['SPY', 'QQQ', 'IWM']): Promise<ServiceResponse<Record<string, IndexData>>> {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const dataPromises = symbols.map(async (symbol) => {
        const aggregateData = await this.fetchAggregates(symbol, 'day', 1, fromDate, toDate);
        return { symbol, data: aggregateData };
      });

      const results = await Promise.all(dataPromises);
      const indexData: Record<string, IndexData> = {};

      for (const { symbol, data } of results) {
        if (data.results && data.results.length > 0) {
          const latest = data.results[0]; // Most recent (sorted desc)
          const previous = data.results[1];
          
          const closes = data.results.map(r => r.c).reverse(); // Oldest to newest
          const highs = data.results.map(r => r.h).reverse();
          const lows = data.results.map(r => r.l).reverse();
          
          // Calculate technical indicators using our math functions
          const { trendScore9, getLatestEMA, calculateATR } = await import('@/lib/math');
          
          const trendScore = closes.length >= 10 ? trendScore9(closes) : 0;
          const ema20 = closes.length >= 20 ? getLatestEMA(closes, 20) : latest.c;
          const ema50 = closes.length >= 50 ? getLatestEMA(closes, 50) : latest.c;
          const atr14 = closes.length >= 15 ? calculateATR(highs, lows, closes, 14) : latest.h - latest.l;

          indexData[symbol] = {
            symbol,
            price: latest.c,
            change: previous ? latest.c - previous.c : 0,
            changePercent: previous ? ((latest.c - previous.c) / previous.c) * 100 : 0,
            volume: latest.v,
            ema20,
            ema50,
            trendScore9: trendScore,
            atr14,
            timestamp: new Date(latest.t)
          };

          // Validate the data
          validateIndexData(indexData[symbol]);
        }
      }

      return {
        data: indexData,
        timestamp: new Date(),
        source: 'polygon',
        status: this.apiKey ? 'success' : 'cached'
      };

    } catch (error) {
      console.error('Error fetching market data from Polygon:', error);
      
      // Return mock data as fallback
      const mockData = this.generateMockMarketData(symbols);
      return {
        data: mockData,
        timestamp: new Date(),
        source: 'polygon_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch sector ETF data for breadth calculations
   */
  async fetchSectorETFs(): Promise<ServiceResponse<Record<string, SectorData>>> {
    try {
      const symbols = Object.keys(this.sectorETFs);
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const dataPromises = symbols.map(async (symbol) => {
        const aggregateData = await this.fetchAggregates(symbol, 'day', 1, fromDate, toDate);
        return { symbol, data: aggregateData };
      });

      const results = await Promise.all(dataPromises);
      const sectorData: Record<string, SectorData> = {};

      for (const { symbol, data } of results) {
        if (data.results && data.results.length > 0) {
          const latest = data.results[0];
          const previous = data.results[1];
          
          const closes = data.results.map(r => r.c).reverse();
          
          // Calculate trend score
          const { trendScore9 } = await import('@/lib/math');
          const trendScore = closes.length >= 10 ? trendScore9(closes) : 0;
          
          // Determine recommendation based on trend score
          let recommendation: 'BUY' | 'SELL' | 'HOLD' | 'AVOID' = 'HOLD';
          if (trendScore >= 5) recommendation = 'BUY';
          else if (trendScore <= -3) recommendation = 'AVOID';
          else if (trendScore >= 3) recommendation = 'HOLD';
          else if (trendScore <= -1) recommendation = 'SELL';

          sectorData[symbol] = {
            symbol,
            name: this.sectorETFs[symbol as keyof typeof this.sectorETFs],
            price: latest.c,
            change: previous ? latest.c - previous.c : 0,
            changePercent: previous ? ((latest.c - previous.c) / previous.c) * 100 : 0,
            volume: latest.v,
            trendScore9: trendScore,
            relativeStrength: trendScore / 9, // Normalize to -1 to 1
            recommendation,
            timestamp: new Date(latest.t)
          };

          // Validate the data
          validateSectorData(sectorData[symbol]);
        }
      }

      return {
        data: sectorData,
        timestamp: new Date(),
        source: 'polygon',
        status: this.apiKey ? 'success' : 'cached'
      };

    } catch (error) {
      console.error('Error fetching sector ETF data from Polygon:', error);
      
      // Return mock data as fallback
      const mockData = this.generateMockSectorData();
      return {
        data: mockData,
        timestamp: new Date(),
        source: 'polygon_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch volume data for specific symbol
   */
  async fetchVolumeData(symbol: string): Promise<ServiceResponse<{ volume: number; avgVolume: number; volumeRatio: number }>> {
    try {
      const today = new Date();
      const tenDaysAgo = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000);
      
      const fromDate = tenDaysAgo.toISOString().split('T')[0];
      const toDate = today.toISOString().split('T')[0];

      const aggregateData = await this.fetchAggregates(symbol, 'day', 1, fromDate, toDate);
      
      if (aggregateData.results && aggregateData.results.length > 0) {
        const volumes = aggregateData.results.map(r => r.v);
        const currentVolume = volumes[0]; // Most recent
        const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
        const volumeRatio = currentVolume / avgVolume;

        return {
          data: {
            volume: currentVolume,
            avgVolume,
            volumeRatio
          },
          timestamp: new Date(),
          source: 'polygon',
          status: 'success'
        };
      }

      throw new Error('No volume data available');

    } catch (error) {
      console.error(`Error fetching volume data for ${symbol}:`, error);
      
      // Return mock data as fallback
      return {
        data: {
          volume: 50000000,
          avgVolume: 45000000,
          volumeRatio: 1.11
        },
        timestamp: new Date(),
        source: 'polygon_mock',
        status: 'degraded',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate mock market data for testing
   */
  private generateMockMarketData(symbols: string[]): Record<string, IndexData> {
    const mockData: Record<string, IndexData> = {};
    
    symbols.forEach(symbol => {
      const basePrice = symbol === 'SPY' ? 450 : symbol === 'QQQ' ? 380 : 200;
      const randomChange = (Math.random() - 0.5) * 0.02;
      const price = basePrice * (1 + randomChange);
      
      mockData[symbol] = {
        symbol,
        price,
        change: price * randomChange,
        changePercent: randomChange * 100,
        volume: Math.floor(Math.random() * 50000000) + 10000000,
        ema20: price * 0.998,
        ema50: price * 0.995,
        trendScore9: Math.floor(Math.random() * 19) - 9, // -9 to 9
        atr14: price * 0.02,
        timestamp: new Date()
      };
    });

    return mockData;
  }

  /**
   * Generate mock sector data for testing
   */
  private generateMockSectorData(): Record<string, SectorData> {
    const mockData: Record<string, SectorData> = {};
    
    Object.entries(this.sectorETFs).forEach(([symbol, name]) => {
      const basePrice = 100 + Math.random() * 200;
      const randomChange = (Math.random() - 0.5) * 0.03;
      const price = basePrice * (1 + randomChange);
      const trendScore = Math.floor(Math.random() * 19) - 9;
      
      let recommendation: 'BUY' | 'SELL' | 'HOLD' | 'AVOID' = 'HOLD';
      if (trendScore >= 5) recommendation = 'BUY';
      else if (trendScore <= -3) recommendation = 'AVOID';
      else if (trendScore >= 3) recommendation = 'HOLD';
      else if (trendScore <= -1) recommendation = 'SELL';
      
      mockData[symbol] = {
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

    return mockData;
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false; // No API key, can't test real connection
      }

      const response = await this.client.get('/v3/reference/tickers', {
        params: { limit: 1 }
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Polygon connection test failed:', error);
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
      service: 'polygon',
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
}

// Export singleton instance
export const polygonService = new PolygonService();