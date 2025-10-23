import { TrendMomentumIntegrator } from '../TrendMomentumIntegrator';

describe('TrendMomentumIntegrator', () => {
  let integrator: TrendMomentumIntegrator;

  beforeEach(() => {
    integrator = new TrendMomentumIntegrator();
  });

  describe('analyzeIntegratedSignal', () => {
    it('should return integrated analysis result', async () => {
      const ticker = 'AAPL';
      const result = await integrator.analyzeIntegratedSignal(ticker);

      expect(result).toBeDefined();
      expect(result.ticker).toBe(ticker);
      expect(result.integratedConfidence).toBeGreaterThanOrEqual(0);
      expect(result.integratedConfidence).toBeLessThanOrEqual(1);
      expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(result.signalDirection);
      expect(result.signalStrength).toBeGreaterThanOrEqual(0);
      expect(result.signalStrength).toBeLessThanOrEqual(1);
      expect(result.alignment).toBeGreaterThanOrEqual(0);
      expect(result.alignment).toBeLessThanOrEqual(1);
      expect(result.positionSizing).toBeGreaterThanOrEqual(0);
      expect(result.positionSizing).toBeLessThanOrEqual(1);
    });

    it('should include trend analysis results', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      expect(result.trendAnalysis).toBeDefined();
      expect(result.trendAnalysis.composite).toBeGreaterThanOrEqual(0);
      expect(result.trendAnalysis.composite).toBeLessThanOrEqual(1);
      expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(result.trendAnalysis.direction);
      expect(result.trendAnalysis.strength).toBeGreaterThanOrEqual(0);
      expect(result.trendAnalysis.quality).toBeGreaterThanOrEqual(0);
    });

    it('should include momentum analysis results', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      expect(result.momentumAnalysis).toBeDefined();
      expect(result.momentumAnalysis.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.momentumAnalysis.compositeScore).toBeLessThanOrEqual(1);
      expect(['BULLISH', 'BEARISH', 'NONE']).toContain(result.momentumAnalysis.divergenceType);
      expect(result.momentumAnalysis.confidence).toBeGreaterThanOrEqual(0);
      expect(result.momentumAnalysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should provide actionable insights', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      expect(result.insights).toBeDefined();
      expect(result.insights.primarySignal).toBeDefined();
      expect(Array.isArray(result.insights.riskFactors)).toBe(true);
      expect(Array.isArray(result.insights.opportunities)).toBe(true);
      expect(Array.isArray(result.insights.recommendations)).toBe(true);
    });

    it('should emit integrated:analyzed event', async () => {
      const eventPromise = new Promise((resolve) => {
        integrator.once('integrated:analyzed', resolve);
      });

      await integrator.analyzeIntegratedSignal('AAPL');
      const eventResult = await eventPromise;

      expect(eventResult).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Test with invalid ticker to trigger error handling
      const result = await integrator.analyzeIntegratedSignal('');

      expect(result).toBeDefined();
      expect(result.integratedConfidence).toBeLessThan(0.5); // Should return low confidence default
    });
  });

  describe('integration weights and calculations', () => {
    it('should properly weight trend and momentum components', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      // Integrated confidence should be influenced by both trend and momentum
      expect(result.integratedConfidence).toBeDefined();
      
      // Signal strength should consider both components
      expect(result.signalStrength).toBeDefined();
      
      // Alignment should measure agreement between trend and momentum
      expect(result.alignment).toBeGreaterThanOrEqual(0);
      expect(result.alignment).toBeLessThanOrEqual(1);
    });

    it('should apply regime adjustments', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      expect(result.regimeAdjustment).toBeDefined();
      expect(result.regimeAdjustment).toBeGreaterThan(0); // Should be positive multiplier
    });

    it('should calculate appropriate position sizing', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      expect(result.positionSizing).toBeGreaterThanOrEqual(0.1); // Minimum position size
      expect(result.positionSizing).toBeLessThanOrEqual(1.0);   // Maximum position size
    });
  });

  describe('momentum indicator analysis', () => {
    it('should include all momentum indicators', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      expect(result.momentumAnalysis.indicators).toBeDefined();
      expect(result.momentumAnalysis.indicators.rsi).toBeDefined();
      expect(result.momentumAnalysis.indicators.stochastic).toBeDefined();
      expect(result.momentumAnalysis.indicators.cci).toBeDefined();
      expect(result.momentumAnalysis.indicators.williamsR).toBeDefined();
      expect(result.momentumAnalysis.indicators.macd).toBeDefined();
    });

    it('should provide current momentum values', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      expect(result.momentumAnalysis.momentumValues).toBeDefined();
      expect(typeof result.momentumAnalysis.momentumValues.rsi).toBe('number');
      expect(typeof result.momentumAnalysis.momentumValues.stochasticK).toBe('number');
      expect(typeof result.momentumAnalysis.momentumValues.cci).toBe('number');
      expect(typeof result.momentumAnalysis.momentumValues.williamsR).toBe('number');
      expect(typeof result.momentumAnalysis.momentumValues.macdLine).toBe('number');
    });

    it('should classify momentum regime correctly', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      const validRegimes = ['OVERBOUGHT', 'OVERSOLD', 'BULLISH', 'BEARISH', 'NEUTRAL'];
      expect(validRegimes).toContain(result.momentumAnalysis.regimeContext);
    });
  });

  describe('trend composite analysis', () => {
    it('should analyze multiple timeframes', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      expect(result.trendAnalysis.timeframeBreakdown).toBeDefined();
      // Should have analysis for multiple timeframes
      const timeframes = Object.keys(result.trendAnalysis.timeframeBreakdown);
      expect(timeframes.length).toBeGreaterThan(0);
    });

    it('should calculate trend quality metrics', async () => {
      const result = await integrator.analyzeIntegratedSignal('AAPL');

      expect(result.trendAnalysis.quality).toBeGreaterThanOrEqual(0);
      expect(result.trendAnalysis.quality).toBeLessThanOrEqual(1);
      expect(result.trendAnalysis.strength).toBeGreaterThanOrEqual(0);
      expect(result.trendAnalysis.strength).toBeLessThanOrEqual(1);
    });
  });
});

// Integration test with multiple tickers
describe('TrendMomentumIntegrator - Multiple Tickers', () => {
  let integrator: TrendMomentumIntegrator;

  beforeEach(() => {
    integrator = new TrendMomentumIntegrator();
  });

  it('should handle multiple ticker analysis concurrently', async () => {
    const tickers = ['AAPL', 'MSFT', 'GOOGL'];
    
    const results = await Promise.all(
      tickers.map(ticker => integrator.analyzeIntegratedSignal(ticker))
    );

    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.ticker).toBe(tickers[index]);
      expect(result.integratedConfidence).toBeGreaterThanOrEqual(0);
      expect(result.integratedConfidence).toBeLessThanOrEqual(1);
    });
  });

  it('should emit events for each analysis', async () => {
    const events: any[] = [];
    
    integrator.on('integrated:analyzed', (result) => {
      events.push(result);
    });

    await Promise.all([
      integrator.analyzeIntegratedSignal('AAPL'),
      integrator.analyzeIntegratedSignal('MSFT')
    ]);

    expect(events).toHaveLength(2);
    expect(events[0].ticker).toBeDefined();
    expect(events[1].ticker).toBeDefined();
  });
});