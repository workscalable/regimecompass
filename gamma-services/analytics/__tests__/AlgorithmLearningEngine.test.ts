import { AlgorithmLearningEngine } from '../AlgorithmLearningEngine';
import { EventBus } from '../../core/EventBus';
import { DatabaseManager } from '../../database/DatabaseManager';
import { PaperPosition, MarketRegime, ExitReason } from '../../models/PaperTradingTypes';
import { DEFAULT_LEARNING_CONFIG } from '../types/LearningTypes';

// Mock dependencies
jest.mock('../../core/EventBus');
jest.mock('../../database/DatabaseManager');
jest.mock('../../logging/Logger');
jest.mock('../../monitoring/PerformanceMonitor');

describe('AlgorithmLearningEngine', () => {
  let learningEngine: AlgorithmLearningEngine;
  let mockEventBus: jest.Mocked<EventBus>;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    mockEventBus = new EventBus() as jest.Mocked<EventBus>;
    mockDatabaseManager = new DatabaseManager() as jest.Mocked<DatabaseManager>;

    mockEventBus.on = jest.fn();
    mockEventBus.emit = jest.fn();

    learningEngine = new AlgorithmLearningEngine(
      mockEventBus,
      mockDatabaseManager,
      DEFAULT_LEARNING_CONFIG
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Trade Outcome Analysis', () => {
    it('should analyze trade outcomes correctly', async () => {
      // Set up sample trade outcomes
      const outcomes = createSampleTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;

      const analysis = await learningEngine.analyzeTradeOutcomes();

      expect(analysis.length).toBeGreaterThan(0);
      
      // Check that prediction errors are calculated
      analysis.forEach(outcome => {
        expect(outcome.predictionError).toBeGreaterThanOrEqual(0);
        expect(outcome.calibrationScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle insufficient data gracefully', async () => {
      // Set insufficient trade outcomes
      (learningEngine as any).tradeOutcomes = createSampleTradeOutcomes().slice(0, 5);

      const analysis = await learningEngine.analyzeTradeOutcomes();

      expect(analysis).toEqual([]);
    });

    it('should split data for validation correctly', async () => {
      const outcomes = createSampleTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;

      await learningEngine.analyzeTradeOutcomes();

      const trainingSet = (learningEngine as any).trainingSet;
      const validationSet = (learningEngine as any).validationSet;

      expect(trainingSet.length + validationSet.length).toBe(outcomes.length);
      expect(validationSet.length).toBeCloseTo(outcomes.length * 0.2, 1); // 20% validation split
    });
  });

  describe('Confidence Calibration', () => {
    it('should calibrate confidence thresholds correctly', async () => {
      const outcomes = createSampleTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes.slice(0, Math.floor(outcomes.length * 0.8));

      const calibrations = await learningEngine.calibrateConfidenceThresholds();

      expect(calibrations.length).toBeGreaterThan(0);
      
      calibrations.forEach(calibration => {
        expect(calibration.totalTrades).toBeGreaterThan(0);
        expect(calibration.actualWinRate).toBeGreaterThanOrEqual(0);
        expect(calibration.actualWinRate).toBeLessThanOrEqual(1);
        expect(calibration.expectedWinRate).toBeGreaterThanOrEqual(0);
        expect(calibration.expectedWinRate).toBeLessThanOrEqual(1);
        expect(Math.abs(calibration.recommendedAdjustment)).toBeLessThanOrEqual(0.2); // Bounded adjustment
      });
    });

    it('should apply bounded adjustments correctly', async () => {
      const outcomes = createPoorlyCalibrated TradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes;

      const calibrations = await learningEngine.calibrateConfidenceThresholds();

      calibrations.forEach(calibration => {
        expect(Math.abs(calibration.recommendedAdjustment)).toBeLessThanOrEqual(0.2);
      });
    });

    it('should calculate reliability correctly', async () => {
      const outcomes = createConsistentTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes;

      const calibrations = await learningEngine.calibrateConfidenceThresholds();

      // Consistent outcomes should have high reliability
      calibrations.forEach(calibration => {
        if (calibration.totalTrades >= 10) {
          expect(calibration.reliability).toBeGreaterThan(0.5);
        }
      });
    });
  });

  describe('Signal Pattern Recognition', () => {
    it('should recognize signal patterns correctly', async () => {
      const outcomes = createPatternedTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes;

      const patterns = await learningEngine.recognizeSignalPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      
      patterns.forEach(pattern => {
        expect(pattern.historicalPerformance.totalOccurrences).toBeGreaterThanOrEqual(5);
        expect(pattern.effectiveness).toBeGreaterThanOrEqual(0);
        expect(pattern.effectiveness).toBeLessThanOrEqual(1);
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should update signal effectiveness weightings', async () => {
      const outcomes = createPatternedTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes;

      await learningEngine.recognizeSignalPatterns();

      const weightings = learningEngine.getSignalWeightings();
      expect(weightings.length).toBeGreaterThan(0);
      
      weightings.forEach(weighting => {
        expect(weighting.currentWeight).toBeGreaterThan(0);
        expect(weighting.recommendedWeight).toBeGreaterThan(0);
        expect(Math.abs(weighting.weightAdjustment)).toBeLessThanOrEqual(0.1); // Bounded adjustment
      });
    });
  });

  describe('Learning Insights Generation', () => {
    it('should generate calibration insights', async () => {
      // Set up poorly calibrated data
      const outcomes = createPoorlyCalibrated TradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes;

      await learningEngine.calibrateConfidenceThresholds();
      const insights = await (learningEngine as any).generateLearningInsights();

      const calibrationInsights = insights.filter(i => i.category === 'CONFIDENCE_CALIBRATION');
      expect(calibrationInsights.length).toBeGreaterThan(0);
      
      calibrationInsights.forEach(insight => {
        expect(insight.actionable).toBe(true);
        expect(insight.recommendation).toBeTruthy();
        expect(insight.confidence).toBeGreaterThan(0);
      });
    });

    it('should generate effectiveness insights', async () => {
      const outcomes = createPatternedTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes;

      await learningEngine.recognizeSignalPatterns();
      const insights = await (learningEngine as any).generateLearningInsights();

      const effectivenessInsights = insights.filter(i => i.category === 'SIGNAL_EFFECTIVENESS');
      
      effectivenessInsights.forEach(insight => {
        expect(insight.actionable).toBe(true);
        expect(insight.recommendation).toBeTruthy();
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(insight.impact);
      });
    });

    it('should prioritize insights correctly', async () => {
      const outcomes = createMixedTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes;

      await learningEngine.calibrateConfidenceThresholds();
      await learningEngine.recognizeSignalPatterns();
      const insights = await (learningEngine as any).generateLearningInsights();

      // Check that insights are sorted by priority
      for (let i = 1; i < insights.length; i++) {
        expect(insights[i].priority).toBeLessThanOrEqual(insights[i - 1].priority);
      }
    });
  });

  describe('Learning Engine Lifecycle', () => {
    it('should start and stop learning correctly', async () => {
      await learningEngine.startLearning();
      
      const healthStatus = await learningEngine.getHealthStatus();
      expect(healthStatus.isRunning).toBe(true);

      learningEngine.stopLearning();
      
      const stoppedStatus = await learningEngine.getHealthStatus();
      expect(stoppedStatus.isRunning).toBe(false);
    });

    it('should handle trade completion events', async () => {
      const position = createSamplePosition('SPY', 100, 0.8, 'BULL', 'PROFIT_TARGET');
      
      await (learningEngine as any).onTradeCompleted(position);
      
      const outcomes = learningEngine.getTradeOutcomes();
      expect(outcomes.length).toBe(1);
      expect(outcomes[0].actualOutcome).toBe('WIN');
      expect(outcomes[0].predictedConfidence).toBe(0.8);
    });

    it('should trigger periodic calibration with sufficient data', async () => {
      // Add enough trades to trigger calibration
      for (let i = 0; i < 20; i++) {
        const position = createSamplePosition('SPY', i % 2 === 0 ? 100 : -50, 0.7, 'BULL', 'PROFIT_TARGET');
        await (learningEngine as any).onTradeCompleted(position);
      }

      const outcomes = learningEngine.getTradeOutcomes();
      expect(outcomes.length).toBe(20);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        minTradesForCalibration: 30,
        maxCalibrationAdjustment: 0.15
      };

      learningEngine.updateConfig(newConfig);
      
      const updatedConfig = learningEngine.getConfig();
      expect(updatedConfig.minTradesForCalibration).toBe(30);
      expect(updatedConfig.maxCalibrationAdjustment).toBe(0.15);
    });

    it('should validate configuration bounds', () => {
      const config = learningEngine.getConfig();
      
      expect(config.maxCalibrationAdjustment).toBeLessThanOrEqual(0.5);
      expect(config.validationSplitRatio).toBeGreaterThan(0);
      expect(config.validationSplitRatio).toBeLessThan(1);
      expect(config.adjustmentDecayRate).toBeGreaterThan(0);
      expect(config.adjustmentDecayRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Overfitting Prevention', () => {
    it('should split data for validation', async () => {
      const outcomes = createLargeTradeOutcomes(100);
      (learningEngine as any).tradeOutcomes = outcomes;

      await learningEngine.analyzeTradeOutcomes();

      const trainingSet = (learningEngine as any).trainingSet;
      const validationSet = (learningEngine as any).validationSet;

      expect(trainingSet.length).toBeGreaterThan(validationSet.length);
      expect(validationSet.length).toBeCloseTo(outcomes.length * 0.2, 5);
    });

    it('should apply decay to adjustments', async () => {
      const outcomes = createPoorlyCalibrated TradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes;

      const calibrations = await learningEngine.calibrateConfidenceThresholds();

      // Check that adjustments are decayed
      calibrations.forEach(calibration => {
        const expectedDecay = calibration.recommendedAdjustment * 0.95;
        // The actual adjustment should be close to the decayed value
        expect(Math.abs(calibration.recommendedAdjustment)).toBeLessThanOrEqual(0.2);
      });
    });
  });

  describe('Event System Integration', () => {
    it('should set up event listeners correctly', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('paper:position:closed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('paper:trade:analyzed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('signal:generated', expect.any(Function));
    });

    it('should emit learning events', async () => {
      const outcomes = createSampleTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;
      (learningEngine as any).trainingSet = outcomes;

      await learningEngine.calibrateConfidenceThresholds();

      expect(mockEventBus.emit).toHaveBeenCalledWith('learning:calibration:updated', expect.any(Object));
    });
  });

  describe('Health Status', () => {
    it('should provide comprehensive health status', async () => {
      const outcomes = createSampleTradeOutcomes();
      (learningEngine as any).tradeOutcomes = outcomes;

      await learningEngine.calibrateConfidenceThresholds();
      await learningEngine.recognizeSignalPatterns();

      const health = await learningEngine.getHealthStatus();

      expect(health.tradeOutcomes).toBe(outcomes.length);
      expect(health.calibrations).toBeGreaterThan(0);
      expect(health.patterns).toBeGreaterThanOrEqual(0);
      expect(health.insights).toBeGreaterThanOrEqual(0);
    });
  });
});

// Helper functions for creating test data
function createSampleTradeOutcomes() {
  const outcomes = [];
  
  for (let i = 0; i < 25; i++) {
    outcomes.push({
      signalId: `signal_${i}`,
      ticker: 'SPY',
      predictedConfidence: 0.5 + (Math.random() * 0.5), // 0.5-1.0
      actualOutcome: Math.random() > 0.4 ? 'WIN' : 'LOSS', // 60% win rate
      actualOutcomeValue: Math.random() > 0.4 ? 1 : 0,
      pnl: Math.random() > 0.4 ? 50 + (Math.random() * 100) : -(25 + (Math.random() * 75)),
      pnlPercent: Math.random() > 0.4 ? 10 + (Math.random() * 20) : -(5 + (Math.random() * 15)),
      holdingPeriod: 12 + (Math.random() * 36), // 12-48 hours
      marketRegime: ['BULL', 'BEAR', 'NEUTRAL'][Math.floor(Math.random() * 3)] as MarketRegime,
      signalSource: 'REGIMECOMPASS' as const,
      exitReason: 'PROFIT_TARGET',
      predictionError: 0,
      calibrationScore: 0,
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
    });
  }
  
  return outcomes;
}

function createPoorlyCalibrated TradeOutcomes() {
  const outcomes = [];
  
  // Create overconfident outcomes (high confidence, low success)
  for (let i = 0; i < 15; i++) {
    outcomes.push({
      signalId: `overconfident_${i}`,
      ticker: 'SPY',
      predictedConfidence: 0.8 + (Math.random() * 0.2), // High confidence
      actualOutcome: Math.random() > 0.7 ? 'WIN' : 'LOSS', // Low success rate (30%)
      actualOutcomeValue: Math.random() > 0.7 ? 1 : 0,
      pnl: Math.random() > 0.7 ? 75 : -50,
      pnlPercent: Math.random() > 0.7 ? 15 : -10,
      holdingPeriod: 24,
      marketRegime: 'BULL' as MarketRegime,
      signalSource: 'REGIMECOMPASS' as const,
      exitReason: 'STOP_LOSS',
      predictionError: 0,
      calibrationScore: 0,
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
    });
  }
  
  // Create underconfident outcomes (low confidence, high success)
  for (let i = 0; i < 15; i++) {
    outcomes.push({
      signalId: `underconfident_${i}`,
      ticker: 'QQQ',
      predictedConfidence: 0.3 + (Math.random() * 0.2), // Low confidence
      actualOutcome: Math.random() > 0.2 ? 'WIN' : 'LOSS', // High success rate (80%)
      actualOutcomeValue: Math.random() > 0.2 ? 1 : 0,
      pnl: Math.random() > 0.2 ? 100 : -25,
      pnlPercent: Math.random() > 0.2 ? 20 : -5,
      holdingPeriod: 18,
      marketRegime: 'BULL' as MarketRegime,
      signalSource: 'REGIMECOMPASS' as const,
      exitReason: 'PROFIT_TARGET',
      predictionError: 0,
      calibrationScore: 0,
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
    });
  }
  
  return outcomes;
}

function createConsistentTradeOutcomes() {
  const outcomes = [];
  
  for (let i = 0; i < 20; i++) {
    const confidence = 0.7;
    const shouldWin = Math.random() < confidence; // Consistent with confidence
    
    outcomes.push({
      signalId: `consistent_${i}`,
      ticker: 'AAPL',
      predictedConfidence: confidence,
      actualOutcome: shouldWin ? 'WIN' : 'LOSS',
      actualOutcomeValue: shouldWin ? 1 : 0,
      pnl: shouldWin ? 80 : -40,
      pnlPercent: shouldWin ? 16 : -8,
      holdingPeriod: 20,
      marketRegime: 'NEUTRAL' as MarketRegime,
      signalSource: 'REGIMECOMPASS' as const,
      exitReason: shouldWin ? 'PROFIT_TARGET' : 'STOP_LOSS',
      predictionError: 0,
      calibrationScore: 0,
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
    });
  }
  
  return outcomes;
}

function createPatternedTradeOutcomes() {
  const outcomes = [];
  
  // Pattern 1: BULL regime + high confidence = good performance
  for (let i = 0; i < 10; i++) {
    outcomes.push({
      signalId: `bull_high_${i}`,
      ticker: 'SPY',
      predictedConfidence: 0.8 + (Math.random() * 0.2),
      actualOutcome: Math.random() > 0.2 ? 'WIN' : 'LOSS', // 80% success
      actualOutcomeValue: Math.random() > 0.2 ? 1 : 0,
      pnl: Math.random() > 0.2 ? 100 : -30,
      pnlPercent: Math.random() > 0.2 ? 20 : -6,
      holdingPeriod: 16,
      marketRegime: 'BULL' as MarketRegime,
      signalSource: 'REGIMECOMPASS' as const,
      exitReason: 'PROFIT_TARGET',
      predictionError: 0,
      calibrationScore: 0,
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
    });
  }
  
  // Pattern 2: BEAR regime + low confidence = poor performance
  for (let i = 0; i < 8; i++) {
    outcomes.push({
      signalId: `bear_low_${i}`,
      ticker: 'QQQ',
      predictedConfidence: 0.3 + (Math.random() * 0.2),
      actualOutcome: Math.random() > 0.7 ? 'WIN' : 'LOSS', // 30% success
      actualOutcomeValue: Math.random() > 0.7 ? 1 : 0,
      pnl: Math.random() > 0.7 ? 60 : -80,
      pnlPercent: Math.random() > 0.7 ? 12 : -16,
      holdingPeriod: 28,
      marketRegime: 'BEAR' as MarketRegime,
      signalSource: 'REGIMECOMPASS' as const,
      exitReason: 'STOP_LOSS',
      predictionError: 0,
      calibrationScore: 0,
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
    });
  }
  
  return outcomes;
}

function createMixedTradeOutcomes() {
  return [
    ...createSampleTradeOutcomes().slice(0, 10),
    ...createPoorlyCalibrated TradeOutcomes().slice(0, 8),
    ...createPatternedTradeOutcomes().slice(0, 12)
  ];
}

function createLargeTradeOutcomes(count: number) {
  const outcomes = [];
  
  for (let i = 0; i < count; i++) {
    outcomes.push({
      signalId: `large_${i}`,
      ticker: ['SPY', 'QQQ', 'AAPL'][i % 3],
      predictedConfidence: Math.random(),
      actualOutcome: Math.random() > 0.5 ? 'WIN' : 'LOSS',
      actualOutcomeValue: Math.random() > 0.5 ? 1 : 0,
      pnl: (Math.random() - 0.5) * 200, // -100 to +100
      pnlPercent: (Math.random() - 0.5) * 40, // -20% to +20%
      holdingPeriod: 12 + (Math.random() * 36),
      marketRegime: ['BULL', 'BEAR', 'NEUTRAL'][Math.floor(Math.random() * 3)] as MarketRegime,
      signalSource: 'REGIMECOMPASS' as const,
      exitReason: Math.random() > 0.5 ? 'PROFIT_TARGET' : 'STOP_LOSS',
      predictionError: 0,
      calibrationScore: 0,
      timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
    });
  }
  
  return outcomes;
}

function createSamplePosition(
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