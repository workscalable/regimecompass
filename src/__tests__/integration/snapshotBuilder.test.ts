import { SnapshotBuilder } from '@/lib/snapshotBuilder';
import { dataSourceManager } from '@/services/dataSources';
import { regimeCompass } from '@/lib/regimeCompass';

// Mock dependencies
jest.mock('@/services/dataSources');
jest.mock('@/lib/regimeCompass');

const mockDataSourceManager = dataSourceManager as jest.Mocked<typeof dataSourceManager>;
const mockRegimeCompass = regimeCompass as jest.Mocked<typeof regimeCompass>;

describe('Snapshot Builder Integration', () => {
  let snapshotBuilder: SnapshotBuilder;

  beforeEach(() => {
    snapshotBuilder = new SnapshotBuilder();
    jest.clearAllMocks();
  });

  describe('buildMarketSnapshot', () => {
    it('should build complete market snapshot successfully', async () => {
      // Mock data source responses
      mockDataSourceManager.fetchAllMarketData.mockResolvedValue({
        marketData: {
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
        },
        sectorData: {
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
        },
        vixData: {
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
        },
        gammaData: {
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
        },
        optionsFlow: {
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
        },
        errors: []
      });

      // Mock regime classification
      mockRegimeCompass.classify.mockReturnValue({
        regime: 'BULL',
        confidence: 0.8,
        strength: 85,
        factors: {
          breadth: true,
          emaAlignment: true,
          trendScore: true,
          volatility: true,
          gamma: true
        },
        timestamp: new Date(),
        regimeDuration: 0
      });

      const snapshot = await snapshotBuilder.buildMarketSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.regime).toBe('BULL');
      expect(snapshot.indexes.SPY).toBeDefined();
      expect(snapshot.sectors.XLK).toBeDefined();
      expect(snapshot.vix).toBeDefined();
      expect(snapshot.gamma).toBeDefined();
      expect(snapshot.breadth).toBeDefined();
      expect(snapshot.derivedSignals).toBeDefined();
    });

    it('should handle partial data gracefully', async () => {
      // Mock partial data response
      mockDataSourceManager.fetchAllMarketData.mockResolvedValue({
        marketData: {
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
        },
        sectorData: null, // Missing sector data
        vixData: null,    // Missing VIX data
        gammaData: {
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
        },
        optionsFlow: null, // Missing options flow
        errors: ['VIX service unavailable', 'Sector data failed']
      });

      mockRegimeCompass.classify.mockReturnValue({
        regime: 'NEUTRAL',
        confidence: 0.5,
        strength: 50,
        factors: {
          breadth: false,
          emaAlignment: true,
          trendScore: true,
          volatility: false,
          gamma: true
        },
        timestamp: new Date(),
        regimeDuration: 0
      });

      const snapshot = await snapshotBuilder.buildMarketSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.regime).toBe('NEUTRAL');
      expect(snapshot.indexes.SPY).toBeDefined();
      // Should have fallback data for missing components
      expect(snapshot.vix).toBeDefined();
      expect(snapshot.breadth).toBeDefined();
    });

    it('should validate data integrity', async () => {
      // Mock response with some invalid data
      mockDataSourceManager.fetchAllMarketData.mockResolvedValue({
        marketData: {
          data: {
            SPY: {
              symbol: 'SPY',
              price: NaN, // Invalid price
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
          status: 'degraded'
        },
        sectorData: null,
        vixData: null,
        gammaData: null,
        optionsFlow: null,
        errors: []
      });

      mockRegimeCompass.classify.mockReturnValue({
        regime: 'NEUTRAL',
        confidence: 0.3,
        strength: 30,
        factors: {
          breadth: false,
          emaAlignment: false,
          trendScore: false,
          volatility: false,
          gamma: false
        },
        timestamp: new Date(),
        regimeDuration: 0
      });

      const snapshot = await snapshotBuilder.buildMarketSnapshot();

      // Should handle invalid data gracefully
      expect(snapshot).toBeDefined();
      expect(snapshot.indexes.SPY.price).not.toBeNaN();
    });
  });

  describe('calculateDerivedSignals', () => {
    it('should calculate derived signals correctly', async () => {
      const mockSnapshot = {
        timestamp: new Date(),
        regime: 'BULL' as const,
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
        sectors: {},
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
          trend: 'falling' as const,
          fiveDayChange: -2.3,
          timestamp: new Date()
        },
        gamma: {
          gex: -500000000,
          zeroGammaDist: 0.008,
          gammaFlip: 448,
          bias: 'supportive' as const,
          timestamp: new Date()
        },
        derivedSignals: {
          regimeStrength: 0,
          volatilityTrend: 'falling' as const,
          breadthMomentum: 'improving' as const
        }
      };

      // Test the derived signals calculation
      const derivedSignals = snapshotBuilder.calculateDerivedSignals(mockSnapshot);

      expect(derivedSignals.regimeStrength).toBeGreaterThan(0);
      expect(derivedSignals.volatilityTrend).toBeDefined();
      expect(derivedSignals.breadthMomentum).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle complete data source failure', async () => {
      mockDataSourceManager.fetchAllMarketData.mockRejectedValue(
        new Error('All services unavailable')
      );

      const snapshot = await snapshotBuilder.buildMarketSnapshot();

      // Should return a snapshot with fallback data
      expect(snapshot).toBeDefined();
      expect(snapshot.regime).toBeDefined();
      expect(snapshot.indexes).toBeDefined();
    });

    it('should handle regime classification failure', async () => {
      mockDataSourceManager.fetchAllMarketData.mockResolvedValue({
        marketData: { data: {}, timestamp: new Date(), source: 'test', status: 'success' },
        sectorData: null,
        vixData: null,
        gammaData: null,
        optionsFlow: null,
        errors: []
      });

      mockRegimeCompass.classify.mockImplementation(() => {
        throw new Error('Classification failed');
      });

      const snapshot = await snapshotBuilder.buildMarketSnapshot();

      // Should handle classification failure gracefully
      expect(snapshot).toBeDefined();
      expect(snapshot.regime).toBe('NEUTRAL'); // Default fallback
    });
  });

  describe('Performance', () => {
    it('should complete snapshot building within reasonable time', async () => {
      mockDataSourceManager.fetchAllMarketData.mockResolvedValue({
        marketData: { data: {}, timestamp: new Date(), source: 'test', status: 'success' },
        sectorData: { data: {}, timestamp: new Date(), source: 'test', status: 'success' },
        vixData: { data: {} as any, timestamp: new Date(), source: 'test', status: 'success' },
        gammaData: { data: {} as any, timestamp: new Date(), source: 'test', status: 'success' },
        optionsFlow: { data: {} as any, timestamp: new Date(), source: 'test', status: 'success' },
        errors: []
      });

      mockRegimeCompass.classify.mockReturnValue({
        regime: 'NEUTRAL',
        confidence: 0.5,
        strength: 50,
        factors: {
          breadth: false,
          emaAlignment: false,
          trendScore: false,
          volatility: false,
          gamma: false
        },
        timestamp: new Date(),
        regimeDuration: 0
      });

      const startTime = Date.now();
      await snapshotBuilder.buildMarketSnapshot();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});