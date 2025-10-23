import { GET } from '@/app/api/daily/route';
import { GET as HealthGET } from '@/app/api/health/route';
import { NextRequest } from 'next/server';

// Mock the snapshot builder
jest.mock('@/lib/snapshotBuilder', () => ({
  SnapshotBuilder: jest.fn().mockImplementation(() => ({
    buildMarketSnapshot: jest.fn().mockResolvedValue({
      timestamp: new Date(),
      regime: 'BULL',
      indexes: {
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
      sectors: {
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
      breadth: {
        breadthPct: 0.65,
        advancingStocks: 325,
        decliningStocks: 175,
        unchangedStocks: 0,
        newHighs: 45,
        newLows: 12,
        advanceDeclineRatio: 1.86
      },
      vix: {
        value: 18.5,
        change: -0.8,
        changePercent: -4.1,
        trend: 'falling',
        fiveDayChange: -2.3,
        timestamp: new Date()
      },
      gamma: {
        gex: -500000000,
        zeroGammaDist: 0.008,
        gammaFlip: 448,
        bias: 'supportive',
        timestamp: new Date()
      },
      derivedSignals: {
        regimeStrength: 75,
        volatilityTrend: 'falling',
        breadthMomentum: 'improving'
      }
    })
  }))
}));

// Mock the data source manager
jest.mock('@/services/dataSources', () => ({
  dataSourceManager: {
    getSystemHealth: jest.fn().mockResolvedValue({
      overall: 'healthy',
      services: [
        {
          service: 'polygon',
          status: 'online',
          responseTime: 150,
          lastCheck: new Date(),
          errorCount: 0,
          uptime: 0.99
        },
        {
          service: 'twelvedata',
          status: 'online',
          responseTime: 200,
          lastCheck: new Date(),
          errorCount: 1,
          uptime: 0.95
        },
        {
          service: 'tradier',
          status: 'online',
          responseTime: 180,
          lastCheck: new Date(),
          errorCount: 0,
          uptime: 0.98
        }
      ],
      dataFreshness: {
        marketData: 2,
        vixData: 3,
        optionsData: 5
      },
      performance: {
        avgResponseTime: 176.67,
        cacheHitRate: 0.75,
        errorRate: 0.33
      },
      timestamp: new Date()
    })
  }
}));

describe('API Routes Integration', () => {
  describe('/api/daily', () => {
    it('should return market snapshot successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.regime).toBe('BULL');
      expect(data.data.indexes.SPY).toBeDefined();
      expect(data.data.sectors.XLK).toBeDefined();
      expect(data.data.breadth).toBeDefined();
      expect(data.data.vix).toBeDefined();
      expect(data.data.gamma).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock the snapshot builder to throw an error
      const { SnapshotBuilder } = require('@/lib/snapshotBuilder');
      const mockInstance = new SnapshotBuilder();
      mockInstance.buildMarketSnapshot.mockRejectedValueOnce(new Error('Service unavailable'));

      const request = new NextRequest('http://localhost:3000/api/daily');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should include proper CORS headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily');
      const response = await GET(request);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });

    it('should handle caching headers correctly', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily');
      const response = await GET(request);
      
      // Should have appropriate cache headers for market data
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toBeDefined();
    });
  });

  describe('/api/health', () => {
    it('should return system health status', async () => {
      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await HealthGET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.overall).toBe('healthy');
      expect(data.data.services).toHaveLength(3);
      expect(data.data.performance).toBeDefined();
    });

    it('should report degraded health when services are down', async () => {
      // Mock degraded health
      const { dataSourceManager } = require('@/services/dataSources');
      dataSourceManager.getSystemHealth.mockResolvedValueOnce({
        overall: 'degraded',
        services: [
          {
            service: 'polygon',
            status: 'online',
            responseTime: 150,
            lastCheck: new Date(),
            errorCount: 0,
            uptime: 0.99
          },
          {
            service: 'twelvedata',
            status: 'offline',
            responseTime: 0,
            lastCheck: new Date(),
            errorCount: 10,
            uptime: 0.5
          },
          {
            service: 'tradier',
            status: 'degraded',
            responseTime: 800,
            lastCheck: new Date(),
            errorCount: 5,
            uptime: 0.8
          }
        ],
        dataFreshness: {
          marketData: 10,
          vixData: 15,
          optionsData: 20
        },
        performance: {
          avgResponseTime: 316.67,
          cacheHitRate: 0.6,
          errorRate: 5.0
        },
        timestamp: new Date()
      });

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await HealthGET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.overall).toBe('degraded');
    });

    it('should handle health check errors', async () => {
      // Mock health check failure
      const { dataSourceManager } = require('@/services/dataSources');
      dataSourceManager.getSystemHealth.mockRejectedValueOnce(new Error('Health check failed'));

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await HealthGET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });
  });

  describe('API Response Format', () => {
    it('should follow consistent response format', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily');
      const response = await GET(request);
      const data = await response.json();
      
      // Check response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.success).toBe('boolean');
      expect(data.timestamp).toBeDefined();
    });

    it('should include metadata in responses', async () => {
      const request = new NextRequest('http://localhost:3000/api/daily');
      const response = await GET(request);
      const data = await response.json();
      
      expect(data.metadata).toBeDefined();
      expect(data.metadata.version).toBeDefined();
      expect(data.metadata.generatedAt).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () => 
        GET(new NextRequest('http://localhost:3000/api/daily'))
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed (no rate limiting in test)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return proper error format', async () => {
      // Force an error
      const { SnapshotBuilder } = require('@/lib/snapshotBuilder');
      const mockInstance = new SnapshotBuilder();
      mockInstance.buildMarketSnapshot.mockRejectedValueOnce(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/daily');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });

    it('should not expose sensitive error details', async () => {
      // Force an error with sensitive information
      const { SnapshotBuilder } = require('@/lib/snapshotBuilder');
      const mockInstance = new SnapshotBuilder();
      mockInstance.buildMarketSnapshot.mockRejectedValueOnce(
        new Error('Database connection failed: password=secret123')
      );

      const request = new NextRequest('http://localhost:3000/api/daily');
      const response = await GET(request);
      
      const data = await response.json();
      expect(data.error).not.toContain('password');
      expect(data.error).not.toContain('secret123');
    });
  });
});