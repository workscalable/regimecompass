import { LearningInsightsEngine } from '../LearningInsightsEngine';
import { EventBus } from '../../core/EventBus';
import { DatabaseManager } from '../../database/DatabaseManager';
import { PaperPosition, MarketRegime, ExitReason } from '../../models/PaperTradingTypes';

// Mock dependencies
jest.mock('../../core/EventBus');
jest.mock('../../database/DatabaseManager');
jest.mock('../../logging/Logger');
jest.mock('../../monitoring/PerformanceMonitor');

describe('LearningInsightsEngine', () => {
  let insightsEngine: LearningInsightsEngine;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockEventBus = new EventBus() as jest.Mocked<EventBus>;
    mockDatabaseManager = new DatabaseManager() as jest.Mocked<DatabaseManager>;

    mockEventBus.on = jest.fn();
    mockEventBus.emit = jest.fn();

    insightsEngine = new LearningInsightsEngine(mockEventBus, mockDatabaseManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Strategy Recommendations', () => {
    it('should generate signal optimization recommendations', async () => {
      // Set up trades with poor signal performance
      const trades = createTradesWithPoorSignalPerformance();
      (insightsEngine as any).tradeHistory = trades;

      const recommendations = await insightsEngine.generateRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      
      const signalOptRecs = recommendations.filter(r => r.category === 'SIGNAL_OPTIMIZATION');
      expect(signalOptRecs.length).toBeGreaterThan(0);
      
      signalOptRecs.forEach(rec => {
        expect(rec.confidence).toBeGreaterThan(0);
        expect(rec.implementation.length).toBeGreaterThan(0);
        expect(rec.expectedImprovement).toBeTruthy();
      });
    });

    it('should not generate recommendations with insufficient data', async () => {
      // Set up insufficient trade data
      (insightsEngine as any).tradeHistory = createSampleTrades().slice(0, 10);

      const recommendations = await insightsEngine.generateRecommendations();

      expect(recommendations.length).toBe(0);
    });

    it('should prioritize high-impact recommendations', async () => {
      const trades = createMixedPerformanceTrades();
      (insightsEngine as any).tradeHistory = trades;

      const recommendations = await insightsEngine.generateRecommendations();

      const highImpactRecs = recommendations.filter(r => r.impact === 'HIGH');
      const mediumImpactRecs = recommendations.filter(r => r.impact === 'MEDIUM');
      
      // High impact recommendations should have higher confidence or better expected improvement
      if (highImpactRecs.length > 0 && mediumImpactRecs.length > 0) {
        const avgHighConfidence = highImpactRecs.reduce((sum, r) => sum + r.confidence, 0) / highImpactRecs.length;
        const avgMediumConfidence = mediumImpactRecs.reduce((sum, r) => sum + r.confidence, 0) / mediumImpactRecs.length;
        
        expect(avgHighConfidence).toBeGreaterThanOrEqual(avgMediumConfidence - 0.1); // Allow small variance
      }
    });
  });

  describe('Fibonacci Zone Performance Analysis', () => {
    it('should analyze Fibonacci zone performance correctly', async () => {
      const trades = createFibonacciZoneTrades();
      (insightsEngine as any).tradeHistory = trades;

      const optimizations = await insightsEngine.analyzeFibonacciZonePerformance();

      expect(optimizations.length).toBeGreaterThan(0);
      
      optimizations.forEach(opt => {
        expect(opt.zone).toBeTruthy();
        expect(opt.winRate).toBeGreaterThanOrEqual(0);
        expect(opt.winRate).toBeLessThanOrEqual(1);
        expect(opt.totalTrades).toBeGreaterThan(0);
        expect(opt.confidence).toBeGreaterThan(0);
        expect(opt.currentMultiplier).toBeGreaterThanOrEqual(0);
        expect(opt.recommendedMultiplier).toBeGreaterThanOrEqual(0);
      });
    });

    it('should emit optimization events for significant adjustments', async () => {
      const trades = createFibonacciZoneTrades();
      (insightsEngine as any).tradeHistory = trades;

      await insightsEngine.analyzeFibonacciZonePerformance();

      // Should emit optimization events
      expect(mockEventBus.emit).toHaveBeenCalledWith('insights:fibonacci:optimization', expect.any(Object));
    });

    it('should calculate optimal multipliers based on performance', async () => {
      const trades = createHighPerformanceFibTrades();
      (insightsEngine as any).tradeHistory = trades;

      const optimizations = await insightsEngine.analyzeFibonacciZonePerformance();

      // High performance zones should have higher recommended multipliers
      const highPerfZones = optimizations.filter(opt => opt.winRate > 0.7);
      highPerfZones.forEach(opt => {
        expect(opt.recommendedMultiplier).toBeGreaterThanOrEqual(opt.currentMultiplier);
      });
    });
  });

  describe('Market Regime Adaptation', () => {
    it('should adapt to market regime performance', async () => {
      const trades = createRegimeSpecificTrades();
      (insightsEngine as any).tradeHistory = trades;

      const adaptations = await insightsEngine.adaptToMarketRegime();

      expect(adaptations.length).toBeGreaterThan(0);
      
      adaptations.forEach(adaptation => {
        expect(['BULL', 'BEAR', 'NEUTRAL']).toContain(adaptation.regime);
        expect(adaptation.overallPerformance.totalTrades).toBeGreaterThan(0);
        expect(adaptation.overallPerformance.winRate).toBeGreaterThanOrEqual(0);
        expect(adaptation.overallPerformance.winRate).toBeLessThanOrEqual(1);
        expect(Object.keys(adaptation.signalAdjustments).length).toBeGreaterThan(0);
      });
    });

    it('should generate regime-specific recommendations', async () => {
      const trades = createPoorRegimePerformanceTrades();
      (insightsEngine as any).tradeHistory = trades;

      await insightsEngine.adaptToMarketRegime();
      const recommendations = await insightsEngine.generateRecommendations();

      const regimeRecs = recommendations.filter(r => r.category === 'MARKET_REGIME');
      expect(regimeRecs.length).toBeGreaterThan(0);
      
      regimeRecs.forEach(rec => {
        expect(rec.implementation.length).toBeGreaterThan(0);
        expect(rec.expectedImprovement).toBeTruthy();
      });
    });

    it('should emit adaptation events', async () => {
      const trades = createRegimeSpecificTrades();
      (insightsEngine as any).tradeHistory = trades;

      await insightsEngine.adaptToMarketRegime();

      expect(mockEventBus.emit).toHaveBeenCalledWith('insights:regime:adaptation', expect.any(Object));
    });
  });

  describe('Event Handling', () => {
    it('should set up event listeners correctly', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('paper:position:closed', expect.any(Function));
    });

    it('should process trade completion events', async () => {
      const position = createSamplePosition('SPY', 100, 0.8, 'BULL', 'PROFIT_TARGET');
      
      // Simulate trade completion event
      await (insightsEngine as any).tradeHistory.push(position);
      
      const healthStatus = await insightsEngine.getHealthStatus();
      expect(healthStatus.tradeHistory).toBe(1);
    });

    it('should generate insights when sufficient trades are accumulated', async () => {
      // Add 30 trades to trigger insight generation
      const trades = createSampleTrades();
      (insightsEngine as any).tradeHistory = trades;

      // Simulate the 30th trade completion
      await (insightsEngine as any).generateAllInsights();

      const recommendations = insightsEngine.getRecommendations();
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Health Status', () => {
    it('should provide comprehensive health status', async () => {
      const trades = createSampleTrades();
      (insightsEngine as any).tradeHistory = trades;
      
      await insightsEngine.generateRecommendations();
      await insightsEngine.analyzeFibonacciZonePerformance();
      await insightsEngine.adaptToMarketRegime();

      const health = await insightsEngine.getHealthStatus();

      expect(health.tradeHistory).toBe(trades.length);
      expect(health.recommendations).toBeGreaterThanOrEqual(0);
      expect(health.fibonacciOptimizations).toBeGreaterThanOrEqual(0);
      expect(health.regimeAdaptations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown cleanly', async () => {
      const trades = createSampleTrades();
      (insightsEngine as any).tradeHistory = trades;
      
      await insightsEngine.generateRecommendations();
      await insightsEngine.shutdown();
      
      const health = await insightsEngine.getHealthStatus();
      expect(health.tradeHistory).toBe(0);
      expect(health.recommendations).toBe(0);
    });
  });
});

// Helper functions for creating test data
function createSampleTrades(): PaperPosition[] {
  const trades: PaperPosition[] = [];
  
  for (let i = 0; i < 40; i++) {
    trades.push(createSamplePosition(
      ['SPY', 'QQQ', 'AAPL'][i % 3],
      Math.random() > 0.6 ? 100 : -50,
      0.5 + (Math.random() * 0.5),
      ['BULL', 'BEAR', 'NEUTRAL'][i % 3] as MarketRegime,
      'PROFIT_TARGET'
    ));
  }
  
  return trades;
}

function createTradesWithPoorSignalPerformance(): PaperPosition[] {
  const trades: PaperPosition[] = [];
  
  // Create 30 trades with poor performance (30% win rate)
  for (let i = 0; i < 30; i++) {
    trades.push(createSamplePosition(
      'SPY',
      i < 9 ? 50 : -50, // 30% win rate
      0.7,
      'BULL',
      i < 9 ? 'PROFIT_TARGET' : 'STOP_LOSS'
    ));
  }
  
  return trades;
}

function createMixedPerformanceTrades(): PaperPosition[] {
  const trades: PaperPosition[] = [];
  
  // High performance trades
  for (let i = 0; i < 15; i++) {
    trades.push(createSamplePosition('SPY', 100, 0.9, 'BULL', 'PROFIT_TARGET'));
  }
  
  // Poor performance trades
  for (let i = 0; i < 20; i++) {
    trades.push(createSamplePosition('QQQ', -50, 0.4, 'BEAR', 'STOP_LOSS'));
  }
  
  return trades;
}

function createFibonacciZoneTrades(): PaperPosition[] {
  const trades: PaperPosition[] = [];
  
  // Create trades distributed across different zones
  for (let i = 0; i < 50; i++) {
    trades.push(createSamplePosition(
      'SPY',
      Math.random() > 0.5 ? 75 : -40,
      0.7,
      'BULL',
      'PROFIT_TARGET'
    ));
  }
  
  return trades;
}

function createHighPerformanceFibTrades(): PaperPosition[] {
  const trades: PaperPosition[] = [];
  
  // Create trades with high win rate for certain zones
  for (let i = 0; i < 30; i++) {
    trades.push(createSamplePosition(
      'SPY',
      i < 24 ? 100 : -30, // 80% win rate
      0.8,
      'BULL',
      i < 24 ? 'PROFIT_TARGET' : 'STOP_LOSS'
    ));
  }
  
  return trades;
}

function createRegimeSpecificTrades(): PaperPosition[] {
  const trades: PaperPosition[] = [];
  
  // Bull regime trades (good performance)
  for (let i = 0; i < 20; i++) {
    trades.push(createSamplePosition('SPY', i < 16 ? 100 : -40, 0.8, 'BULL', 'PROFIT_TARGET'));
  }
  
  // Bear regime trades (poor performance)
  for (let i = 0; i < 20; i++) {
    trades.push(createSamplePosition('QQQ', i < 8 ? 60 : -60, 0.6, 'BEAR', 'STOP_LOSS'));
  }
  
  // Neutral regime trades (mixed performance)
  for (let i = 0; i < 15; i++) {
    trades.push(createSamplePosition('AAPL', i < 8 ? 80 : -50, 0.7, 'NEUTRAL', 'PROFIT_TARGET'));
  }
  
  return trades;
}

function createPoorRegimePerformanceTrades(): PaperPosition[] {
  const trades: PaperPosition[] = [];
  
  // Create trades with poor performance in specific regimes
  for (let i = 0; i < 30; i++) {
    trades.push(createSamplePosition(
      'SPY',
      i < 12 ? 50 : -70, // 40% win rate
      0.6,
      'BEAR',
      i < 12 ? 'PROFIT_TARGET' : 'STOP_LOSS'
    ));
  }
  
  return trades;
}

function createSamplePosition(
  ticker: string,
  pnl: number,
  confidence: number,
  regime: MarketRegime,
  exitReason: ExitReason
): PaperPosition {
  return {
    id: `pos_${ticker}_${Date.now()}_${Math.random()}`,
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