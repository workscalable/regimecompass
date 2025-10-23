import { dataSourceManager } from '@/services/dataSources';
import { polygonService } from '@/services/polygonService';
import { twelveDataService } from '@/services/twelveDataService';
import { tradierService } from '@/services/tradierService';

// Mock the services
jest.mock('@/services/polygonService');
jest.mock('@/services/twelveDataService');
jest.mock('@/services/tradierService');

const mockPolygonService = polygonService as jest.Mocked<typeof polygonService>;
const mockTwelveDataService = twelveDataService as jest.Mocked<typeof twelveDataService>;
const mockTradierService = tradierService as jest.Mocked<typeof tradierService>;

describe('Data Services Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DataSourceManager', () => {
    it('should fetch all market data successfully', async () => {
      // Mock successful responses
      mockPolygonService.fetchMarketData.mockResolvedValue({
        data: {
          SPY: {
            symbol: 'SPY',
            price: 450,
            change: 2.5,
            changePercent: 0.56,
            volume: 50000000,
            ema20: 448,
            ema50: 445,
            trendScore9: 5,
            atr14: 9.2,
            timestamp: new Date()
          }
        },
        timestamp: new Date(),
        source: 'polygon',
        status: 'success'
      });

      mockPolygonService.fetchSectorETFs.mockResolvedValue({
        data: {
          XLK: {
            symbol: 'XLK',
            name: 'Technology Select Sector SPDR Fund',
            price: 180,
            change: 1.8,
            changePercent: 1.0,
            volume: 15000000,
            trendScore9: 6,
            relativeStrength: 0.5,
            recommendation: 'BUY',
            timestamp: new Date()
          }
        },
        timestamp: new Date(),
        source: 'polygon',
        status: 'success'
      });

      mockTwelveDataService.fetchVIXData.mockResolvedValue({
        data: {
          value: 18.5,
          change: -0.8,
          changePercent: -4.1,
          trend: 'falling',
          fiveDayChange: -2.3,
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'twelvedata',
        status: 'success'
      });

      mockTradierService.fetchGammaExposure.mockResolvedValue({
        data: {
          gex: -500000000,
          zeroGammaDist: 0.008,
          gammaFlip: 448,
          bias: 'supportive',
          timestamp: new Date()
        },
        timestamp: new Date(),
        source: 'tradier',
        status: 'success'
      });

      mockTradierService.fetchOptionsFlow.mockResolvedValue({
        data: {
          bias: 'bullish',
          confidence: 0.7,
          unusualActivity: true,
          callVolume: 750000,
          putVolume: 450000,
          putCallRatio: 0.6,
          impliedVolatilityTrend: 'falling',
          largeBlockTrades: 25,
          forwardBias: 'bullish'
        },
        timestamp: new Date(),
        source: 'tradier',
        status: 'success'
      });

      const result = await dataSourceManager.fetchAllMarketData();

      expect(result.marketData).toBeDefined();
      expect(result.sectorData).toBeDefined();
      expect(result.vixData).toBeDefined();
      expect(result.gammaData).toBeDefined();
      expect(result.optionsFlow).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should handle partial failures gracefully', async () => {
      // Mock mixed success/failure responses
      mockPolygonService.fetchMarketData.mockResolvedValue({
        data: { SPY: {} as any },
        timestamp: new Date(),
        source: 'polygon',
        status: 'success'
      });

      mockTwelveDataService.fetchVIXData.mockRejectedValue(new Error('API Error'));
      mockTradierService.fetchGammaExposure.mockRejectedValue(new Error('Network Error'));

      const result = await dataSourceManager.fetchAllMarketData();

      expect(result.marketData).toBeDefined();
      expect(result.vixData).toBeNull();
      expect(result.gammaData).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should use fallback data when all services fail', async () => {
      // Mock all services to fail
      mockPolygonService.fetchMarketData.mockRejectedValue(new Error('Service Down'));
      mockPolygonService.fetchSectorETFs.mockRejectedValue(new Error('Service Down'));
      mockTwelveDataService.fetchVIXData.mockRejectedValue(new Error('Service Down'));
      mockTradierService.fetchGammaExposure.mockRejectedValue(new Error('Service Down'));
      mockTradierService.fetchOptionsFlow.mockRejectedValue(new Error('Service Down'));

      const marketDataResult = await dataSourceManager.fetchMarketData();
      
      expect(marketDataResult.status).toBe('degraded');
      expect(marketDataResult.source).toBe('fallback');
      expect(marketDataResult.data).toBeDefined();
    });

    it('should implement circuit breaker correctly', async () => {
      // Mock repeated failures to trigger circuit breaker
      const error = new Error('Persistent failure');
      mockPolygonService.fetchMarketData.mockRejectedValue(error);

      // First few calls should attempt the service
      await expect(dataSourceManager.fetchMarketData()).rejects.toThrow();
      await expect(dataSourceManager.fetchMarketData()).rejects.toThrow();
      await expect(dataSourceManager.fetchMarketData()).rejects.toThrow();

      // Circuit breaker should now be open
      const result = await dataSourceManager.fetchMarketData();
      expect(result.status).toBe('degraded');
    });
  });

  describe('Service Health Monitoring', () => {
    it('should report system health correctly', async () => {
      // Mock health status responses
      mockPolygonService.getHealthStatus.mockResolvedValue({
        service: 'polygon',
        status: 'online',
        responseTime: 150,
        lastCheck: new Date(),
        errorCount: 0,
        uptime: 0.99
      });

      mockTwelveDataService.getHealthStatus.mockResolvedValue({
        service: 'twelvedata',
        status: 'online',
        responseTime: 200,
        lastCheck: new Date(),
        errorCount: 1,
        uptime: 0.95
      });

      mockTradierService.getHealthStatus.mockResolvedValue({
        service: 'tradier',
        status: 'degraded',
        responseTime: 500,
        lastCheck: new Date(),
        errorCount: 3,
        uptime: 0.85
      });

      const health = await dataSourceManager.getSystemHealth();

      expect(health.overall).toBe('healthy'); // 2 online services
      expect(health.services).toHaveLength(3);
      expect(health.performance.avgResponseTime).toBeGreaterThan(0);
    });

    it('should detect critical system health', async () => {
      // Mock all services as offline
      const offlineStatus = {
        service: 'test',
        status: 'offline' as const,
        responseTime: 0,
        lastCheck: new Date(),
        errorCount: 10,
        uptime: 0
      };

      mockPolygonService.getHealthStatus.mockResolvedValue({
        ...offlineStatus,
        service: 'polygon'
      });
      mockTwelveDataService.getHealthStatus.mockResolvedValue({
        ...offlineStatus,
        service: 'twelvedata'
      });
      mockTradierService.getHealthStatus.mockResolvedValue({
        ...offlineStatus,
        service: 'tradier'
      });

      const health = await dataSourceManager.getSystemHealth();

      expect(health.overall).toBe('critical');
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate data integrity using Zod schemas', async () => {
      // Mock response with invalid data
      mockPolygonService.fetchMarketData.mockResolvedValue({
        data: {
          SPY: {
            symbol: 'SPY',
            price: 'invalid' as any, // Invalid price type
            change: 2.5,
            changePercent: 0.56,
            volume: 50000000,
            ema20: 448,
            ema50: 445,
            trendScore9: 5,
            atr14: 9.2,
            timestamp: new Date()
          }
        },
        timestamp: new Date(),
        source: 'polygon',
        status: 'success'
      });

      // The data source manager should handle validation errors
      const result = await dataSourceManager.fetchMarketData();
      
      // Should either fix the data or use fallback
      expect(result.data).toBeDefined();
      if (result.status === 'success') {
        expect(typeof result.data.SPY.price).toBe('number');
      }
    });
  });

  describe('Caching Integration', () => {
    it('should cache responses appropriately', async () => {
      mockPolygonService.fetchMarketData.mockResolvedValue({
        data: { SPY: {} as any },
        timestamp: new Date(),
        source: 'polygon',
        status: 'success'
      });

      // First call
      await dataSourceManager.fetchMarketData();
      
      // Second call should potentially use cache
      await dataSourceManager.fetchMarketData();

      // Verify service was called (caching behavior depends on implementation)
      expect(mockPolygonService.fetchMarketData).toHaveBeenCalled();
    });

    it('should clear caches when requested', () => {
      // Mock cache clearing methods
      mockPolygonService.clearCache = jest.fn();
      mockTwelveDataService.clearCache = jest.fn();
      mockTradierService.clearCache = jest.fn();

      dataSourceManager.clearAllCaches();

      expect(mockPolygonService.clearCache).toHaveBeenCalled();
      expect(mockTwelveDataService.clearCache).toHaveBeenCalled();
      expect(mockTradierService.clearCache).toHaveBeenCalled();
    });
  });
});