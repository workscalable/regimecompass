import { PerformanceAnalyticsEngine } from '../PerformanceAnalyticsEngine';
import { EventBus } from '../../core/EventBus';
import { DatabaseManager } from '../../database/DatabaseManager';
import { PaperPosition, TradeAnalysis, MarketRegime, ExitReason } from '../../models/PaperTradingTypes';

// Mock dependencies
jest.mock('../../core/EventBus');
jest.mock('../../database/DatabaseManager');
jest.mock('../../logging/Logger');
jest.mock('../../monitoring/PerformanceMonitor');

describe('PerformanceAnalyticsEngine', () => {
  let analyticsEngine: PerformanceAnalyticsEngine;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockEventBus = new EventBus() as jest.Mocked<EventBus>;
    mockDatabaseManager = new DatabaseManager() as jest.Mocked<DatabaseManager>;

    mockEventBus.on = jest.fn();
    mockEventBus.emit = jest.fn();

    analyticsEngine = new PerformanceAnalyticsEngine(
      mockEventBus,
      mockDatabaseManager
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Real-Time Metrics Calculation', () => {
    it('should calculate basic performance metrics correctly', async () => {
      const sampleTrades: PaperPosition[] = [
        createSampleTrade('SPY', 100, 0.8, 'BULL', 'PROFIT_TARGET'),
        createSampleTrade('QQQ', -50, 0.7, 'BULL', 'STOP_LOSS'),
        createSampleTrade('AAPL', 75, 0.9, 'BULL', 'PROFIT_TARGET')
      ];

      (analyticsEngine as any).tradesCache = sampleTrades;
      (analyticsEngine as any).lastCacheUpdate = new Date();

      const metrics = await analyticsEngine.calculateRealTimeMetrics();

      expect(metrics.totalTrades).toBe(3);
      expect(metrics.winningTrades).toBe(2);
      expect(metrics.losingTrades).toBe(1);
      expect(metrics.winRate).toBeCloseTo(0.67, 2);
      expect(metrics.totalPnL).toBe(125);
    });

    it('should handle empty trade data gracefully', async () => {
      (analyticsEngine as any).tradesCache = [];
      (analyticsEngine as any).lastCacheUpdate = new Date();

      const metrics = await analyticsEngine.calculateRealTimeMetrics();

      expect(metrics.totalTrades).toBe(0);
      expect(metrics.winRate).toBe(0);
      expect(metrics.totalPnL).toBe(0);
    });
  });

  describe('Confidence Effectiveness Analysis', () => {
    it('should analyze confidence effectiveness across ranges', async () => {
      const trades: PaperPosition[] = [
        createSampleTrade('SPY', 100, 0.9, 'BULL', 'PROFIT_TARGET'),
        createSampleTrade('QQQ', 75, 0.85, 'BULL', 'PROFIT_TARGET'),
        createSampleTrade('AAPL', -25, 0.8, 'BULL', 'STOP_LOSS')
      ];

      (analyticsEngine as any).tradesCache = trades;
      (analyticsEngine as any).lastCacheUpdate = new Date();

      const effectiveness = await analyticsEngine.analyzeConfidenceEffectiveness();

      expect(effectiveness.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Breakdown', () => {
    it('should generate comprehensive performance breakdown', async () => {
      const trades: PaperPosition[] = [
        createSampleTrade('SPY', 100, 0.8, 'BULL', 'PROFIT_TARGET'),
        createSampleTrade('QQQ', 75, 0.9, 'BULL', 'PROFIT_TARGET')
      ];

      (analyticsEngine as any).tradesCache = trades;
      (analyticsEngine as any).lastCacheUpdate = new Date();

      const breakdown = await analyticsEngine.generatePerformanceBreakdown();

      expect(breakdown.byTicker).toHaveProperty('SPY');
      expect(breakdown.byTicker).toHaveProperty('QQQ');
      expect(breakdown.byRegime).toHaveProperty('BULL');
    });
  });

  describe('Real-Time Analytics', () => {
    it('should start and stop correctly', async () => {
      await analyticsEngine.startRealTimeAnalytics();
      
      const healthStatus = await analyticsEngine.getHealthStatus();
      expect(healthStatus.isRunning).toBe(true);

      analyticsEngine.stopRealTimeAnalytics();
      
      const stoppedStatus = await analyticsEngine.getHealthStatus();
      expect(stoppedStatus.isRunning).toBe(false);
    });
  });
});

function createSampleTrade(
  ticker: string,
  pnl: number,
  confidence: number,
  regime: MarketRegime,
  exitReason: ExitReason
): PaperPosition {
  return {
    id: `pos_${ticker}_${Date.now()}`,
    signalId: `signal_${ticker}_${Date.now()}`,
    ticker,
    optionSymbol: `${ticker}240315C450`,
    contractType: 'CALL',
    strike: 450,
    expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    side: 'LONG',
    quantity: 1,
    entryPrice: 2.50,
    currentPrice: pnl > 0 ? 3.00 : 2.00,
    entryTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    exitTimestamp: new Date(),
    exitPrice: pnl > 0 ? 3.00 : 2.00,
    pnl,
    pnlPercent: (pnl / 250) * 100,
    maxFavorableExcursion: Math.max(pnl, 0),
    maxAdverseExcursion: Math.min(pnl, 0),
    greeks: {
      delta: 0.5,
      gamma: 0.1,
      theta: -0.05,
      vega: 0.2,
      rho: 0.01,
      impliedVolatility: 0.25
    },
    status: 'CLOSED',
    confidence,
    conviction: confidence * 0.8,
    regime,
    exitReason
  };
}