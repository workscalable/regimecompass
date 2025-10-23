import { LearningInsightsEngine } from '../LearningInsightsEngine';
import { EventBus } from '../../core/EventBus';
import { DatabaseManager } from '../../database/DatabaseManager';
import { PaperPosition, MarketRegime } from '../../models/PaperTradingTypes';

/**
 * Test suite for Learning Insights Engine
 * 
 * Tests the core functionality of learning from trade outcomes
 * and generating actionable strategy recommendations.
 */

describe('LearningInsightsEngine', () => {
  let insightsEngine: LearningInsightsEngine;
  let eventBus: EventBus;
  let databaseManager: DatabaseManager;

  beforeEach(() => {
    eventBus = new EventBus();
    databaseManager = new DatabaseManager();
    insightsEngine = new LearningInsightsEngine(eventBus, databaseManager);
  });

  afterEach(async () => {
    await insightsEngine.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize with empty state', async () => {
      const health = await insightsEngine.getHealthStatus();
      
      expect(health.tradeHistory).toBe(0);
      expect(health.recommendations).toBe(0);
      expect(health.fibonacciOptimizations).toBe(0);
      expect(health.regimeAdaptations).toBe(0);
    });

    test('should set up event listeners', () => {
      const eventListeners = eventBus.listenerCount('paper:position:closed');
      expect(eventListeners).toBeGreaterThan(0);
    });
  });

  describe('Trade History Processing', () => {
    test('should accumulate trade history from events', async () => {
      const mockPosition = createMockPosition('SPY', 'BULL', 150, true);
      
      eventBus.emit('paper:position:closed', { position: mockPosition });
      
      // Allow event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const health = await insightsEngine.getHealthStatus();
      expect(health.tradeHistory).toBe(1);
    });

    test('should trigger analysis after sufficient trades', async () => {
      const recommendationsSpy = jest.spyOn(insightsEngine, 'generateRecommendations');
      
      // Generate 30 trades to trigger analysis
      for (let i = 0; i < 30; i++) {
        const position = createMockPosition('SPY', 'BULL', 100 + i, i % 2 === 0);
        eventBus.emit('paper:position:closed', { position });
      }
      
      // Allow event processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(recommendationsSpy).toHaveBeenCalled();
    });
  });

  describe('Strategy Recommendations', () => {
    beforeEach(async () => {
      // Generate sufficient trade history
      await generateMockTradeHistory(50);
    });

    test('should generate signal optimization recommendations', async () => {
      const recommendations = await insightsEngine.generateRecommendations();
      
      const signalRecs = recommendations.filter(rec => 
        rec.category === 'SIGNAL_OPTIMIZATION'
      );
      
      expect(signalRecs.length).toBeGreaterThan(0);
      expect(signalRecs[0]).toHaveProperty('title');
      expect(signalRecs[0]).toHaveProperty('confidence');
      expect(signalRecs[0]).toHaveProperty('implementation');
    });

    test('should prioritize high-impact recommendations', async () => {
      const recommendations = await insightsEngine.generateRecommendations();
      
      const highImpactRecs = recommendations.filter(rec => rec.impact === 'HIGH');
      const lowImpactRecs = recommendations.filter(rec => rec.impact === 'LOW');
      
      // High impact recommendations should have higher confidence
      if (highImpactRecs.length > 0 && lowImpactRecs.length > 0) {
        const avgHighConfidence = highImpactRecs.reduce((sum, rec) => sum + rec.confidence, 0) / highImpactRecs.length;
        const avgLowConfidence = lowImpactRecs.reduce((sum, rec) => sum + rec.confidence, 0) / lowImpactRecs.length;
        
        expect(avgHighConfidence).toBeGreaterThanOrEqual(avgLowConfidence);
      }
    });

    test('should emit recommendation events', async () => {
      const eventSpy = jest.fn();
      eventBus.on('insights:recommendations:generated', eventSpy);
      
      await insightsEngine.generateRecommendations();
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          recommendations: expect.any(Array),
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('Fibonacci Zone Analysis', () => {
    beforeEach(async () => {
      await generateMockTradeHistory(50);
    });

    test('should analyze zone performance', async () => {
      const optimizations = await insightsEngine.analyzeFibonacciZonePerformance();
      
      expect(optimizations.length).toBeGreaterThan(0);
      
      optimizations.forEach(opt => {
        expect(opt).toHaveProperty('zone');
        expect(opt).toHaveProperty('winRate');
        expect(opt).toHaveProperty('currentMultiplier');
        expect(opt).toHaveProperty('recommendedMultiplier');
        expect(opt.winRate).toBeGreaterThanOrEqual(0);
        expect(opt.winRate).toBeLessThanOrEqual(1);
      });
    });

    test('should recommend multiplier adjustments', async () => {
      const optimizations = await insightsEngine.analyzeFibonacciZonePerformance();
      
      const needingAdjustment = optimizations.filter(opt => 
        Math.abs(opt.recommendedMultiplier - opt.currentMultiplier) > 0.1
      );
      
      expect(needingAdjustment.length).toBeGreaterThan(0);
    });

    test('should emit optimization events', async () => {
      const eventSpy = jest.fn();
      eventBus.on('insights:fibonacci:optimization', eventSpy);
      
      await insightsEngine.analyzeFibonacciZonePerformance();
      
      // Should emit events for zones needing adjustment
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Market Regime Adaptation', () => {
    beforeEach(async () => {
      await generateMockTradeHistory(60, true); // Include regime diversity
    });

    test('should analyze regime-specific performance', async () => {
      const adaptations = await insightsEngine.adaptToMarketRegime();
      
      expect(adaptations.length).toBeGreaterThan(0);
      
      adaptations.forEach(adaptation => {
        expect(adaptation).toHaveProperty('regime');
        expect(adaptation).toHaveProperty('signalAdjustments');
        expect(adaptation).toHaveProperty('overallPerformance');
        expect(adaptation.overallPerformance.winRate).toBeGreaterThanOrEqual(0);
        expect(adaptation.overallPerformance.winRate).toBeLessThanOrEqual(1);
      });
    });

    test('should suggest signal weight adjustments', async () => {
      const adaptations = await insightsEngine.adaptToMarketRegime();
      
      const adaptation = adaptations[0];
      const signalAdjustments = Object.values(adaptation.signalAdjustments);
      
      expect(signalAdjustments.length).toBeGreaterThan(0);
      
      signalAdjustments.forEach(adj => {
        expect(adj).toHaveProperty('currentWeight');
        expect(adj).toHaveProperty('recommendedWeight');
        expect(adj).toHaveProperty('effectiveness');
      });
    });

    test('should emit adaptation events', async () => {
      const eventSpy = jest.fn();
      eventBus.on('insights:regime:adaptation', eventSpy);
      
      await insightsEngine.adaptToMarketRegime();
      
      expect(eventSpy).toHaveBeenCalled();
    });
  });

  describe('Learning Effectiveness', () => {
    test('should improve recommendations over time', async () => {
      // Generate initial trade history
      await generateMockTradeHistory(30);
      const initialRecs = await insightsEngine.generateRecommendations();
      
      // Generate more trades with better performance
      await generateMockTradeHistory(30, false, 0.8); // 80% win rate
      const improvedRecs = await insightsEngine.generateRecommendations();
      
      // Should have more confident recommendations
      const initialAvgConfidence = initialRecs.reduce((sum, rec) => sum + rec.confidence, 0) / initialRecs.length;
      const improvedAvgConfidence = improvedRecs.reduce((sum, rec) => sum + rec.confidence, 0) / improvedRecs.length;
      
      expect(improvedAvgConfidence).toBeGreaterThanOrEqual(initialAvgConfidence);
    });

    test('should prevent overfitting with bounded adjustments', async () => {
      await generateMockTradeHistory(50);
      const optimizations = await insightsEngine.analyzeFibonacciZonePerformance();
      
      // All multiplier adjustments should be within reasonable bounds
      optimizations.forEach(opt => {
        expect(opt.recommendedMultiplier).toBeGreaterThanOrEqual(0);
        expect(opt.recommendedMultiplier).toBeLessThanOrEqual(1.5);
        
        const adjustment = Math.abs(opt.recommendedMultiplier - opt.currentMultiplier);
        expect(adjustment).toBeLessThanOrEqual(0.5); // Reasonable adjustment limit
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle insufficient data gracefully', async () => {
      // Try to generate recommendations with insufficient data
      const recommendations = await insightsEngine.generateRecommendations();
      
      expect(recommendations).toEqual([]);
    });

    test('should handle invalid trade data', async () => {
      const invalidPosition = {
        ...createMockPosition('SPY', 'BULL', 100, true),
        pnl: NaN
      };
      
      expect(() => {
        eventBus.emit('paper:position:closed', { position: invalidPosition });
      }).not.toThrow();
    });
  });

  // Helper functions
  async function generateMockTradeHistory(
    count: number, 
    diverseRegimes: boolean = false, 
    winRate: number = 0.6
  ): Promise<void> {
    const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'];
    const regimes: MarketRegime[] = diverseRegimes 
      ? ['BULL', 'BEAR', 'NEUTRAL'] 
      : ['BULL'];
    
    for (let i = 0; i < count; i++) {
      const ticker = tickers[i % tickers.length];
      const regime = regimes[i % regimes.length];
      const isWin = Math.random() < winRate;
      const pnl = isWin ? Math.random() * 200 + 50 : -(Math.random() * 100 + 25);
      
      const position = createMockPosition(ticker, regime, pnl, isWin);
      eventBus.emit('paper:position:closed', { position });
    }
    
    // Allow event processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  function createMockPosition(
    ticker: string, 
    regime: MarketRegime, 
    pnl: number, 
    isWin: boolean
  ): PaperPosition {
    return {
      id: `test_${Date.now()}_${Math.random()}`,
      ticker,
      type: 'CALL',
      strike: 400 + Math.random() * 100,
      expiration: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      quantity: Math.floor(Math.random() * 5) + 1,
      entryPrice: Math.random() * 10 + 2,
      currentPrice: Math.random() * 10 + 2,
      pnl,
      unrealizedPnL: 0,
      maxFavorableExcursion: Math.abs(pnl) * 1.2,
      maxAdverseExcursion: Math.abs(pnl) * 0.8,
      entryTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      exitTime: new Date(),
      confidence: Math.random() * 0.4 + 0.6,
      signalId: `signal_${Math.floor(Math.random() * 1000)}`,
      regime,
      isOpen: false,
      greeks: {
        delta: Math.random() * 0.8 + 0.2,
        gamma: Math.random() * 0.1,
        theta: -(Math.random() * 0.5),
        vega: Math.random() * 0.3,
        rho: Math.random() * 0.1
      }
    };
  }
});