import { RegimeCompass } from '@/lib/regimeCompass';
import { MarketSnapshot, RegimeType } from '@/lib/types';

describe('RegimeCompass', () => {
  let regimeCompass: RegimeCompass;
  let mockSnapshot: MarketSnapshot;

  beforeEach(() => {
    regimeCompass = new RegimeCompass();
    
    // Create a mock market snapshot
    mockSnapshot = {
      timestamp: new Date(),
      regime: 'NEUTRAL' as RegimeType,
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
    };
  });

  describe('classify', () => {
    it('should classify BULL regime when all factors align', () => {
      // Set up BULL conditions
      mockSnapshot.breadth.breadthPct = 0.65; // >= 62%
      mockSnapshot.indexes.SPY.ema20 = 450;
      mockSnapshot.indexes.SPY.ema50 = 445; // EMA20 > EMA50 * 1.0025
      mockSnapshot.indexes.SPY.trendScore9 = 5; // >= 3
      mockSnapshot.vix.value = 18; // < 20
      mockSnapshot.gamma.gex = -100000000; // <= 0

      const classification = regimeCompass.classify(mockSnapshot);
      
      expect(classification.regime).toBe('BULL');
      expect(classification.confidence).toBeGreaterThan(0.5);
      expect(classification.strength).toBeGreaterThan(50);
    });

    it('should classify BEAR regime when all factors align', () => {
      // Set up BEAR conditions
      mockSnapshot.breadth.breadthPct = 0.35; // <= 38%
      mockSnapshot.indexes.SPY.ema20 = 440;
      mockSnapshot.indexes.SPY.ema50 = 445; // EMA20 < EMA50 * 0.9975
      mockSnapshot.indexes.SPY.trendScore9 = -5; // <= -3
      mockSnapshot.vix.value = 25; // > 20
      mockSnapshot.gamma.gex = -200000000; // < 0

      const classification = regimeCompass.classify(mockSnapshot);
      
      expect(classification.regime).toBe('BEAR');
      expect(classification.confidence).toBeGreaterThan(0.5);
    });

    it('should classify NEUTRAL regime when factors are mixed', () => {
      // Mixed conditions
      mockSnapshot.breadth.breadthPct = 0.55; // Between 38% and 62%
      mockSnapshot.indexes.SPY.trendScore9 = 1; // Between -3 and 3

      const classification = regimeCompass.classify(mockSnapshot);
      
      expect(classification.regime).toBe('NEUTRAL');
    });

    it('should calculate confidence based on factor alignment', () => {
      // Strong alignment should give high confidence
      mockSnapshot.breadth.breadthPct = 0.75;
      mockSnapshot.indexes.SPY.trendScore9 = 7;
      mockSnapshot.vix.value = 15;

      const classification = regimeCompass.classify(mockSnapshot);
      
      expect(classification.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('detectEarlyWarningSignals', () => {
    it('should detect BULL to BEAR warning signals', () => {
      mockSnapshot.regime = 'BULL';
      mockSnapshot.breadth.breadthPct = 0.52; // Deteriorating below 55%
      mockSnapshot.indexes.SPY.trendScore9 = 1; // Momentum slowing
      mockSnapshot.vix.value = 22; // Rising above 18
      mockSnapshot.derivedSignals.volatilityTrend = 'rising';

      const warnings = regimeCompass.detectEarlyWarningSignals(mockSnapshot);
      
      expect(warnings.bullToBearWarning).toBe(true);
      expect(warnings.warningFactors.length).toBeGreaterThan(1);
      expect(warnings.confirmationLevel).toBe('medium');
    });

    it('should detect BEAR to BULL improvement signals', () => {
      mockSnapshot.regime = 'BEAR';
      mockSnapshot.breadth.breadthPct = 0.48; // Improving above 45%
      mockSnapshot.indexes.SPY.trendScore9 = -1; // Momentum improving
      mockSnapshot.vix.value = 22; // Declining below 25
      mockSnapshot.derivedSignals.volatilityTrend = 'falling';

      const warnings = regimeCompass.detectEarlyWarningSignals(mockSnapshot);
      
      expect(warnings.bearToBullWarning).toBe(true);
      expect(warnings.warningFactors.length).toBeGreaterThan(1);
    });

    it('should provide appropriate timeframe estimates', () => {
      mockSnapshot.regime = 'BULL';
      mockSnapshot.breadth.breadthPct = 0.45; // Multiple warning factors
      mockSnapshot.indexes.SPY.trendScore9 = 0;
      mockSnapshot.vix.value = 25;
      mockSnapshot.gamma.bias = 'suppressive';

      const warnings = regimeCompass.detectEarlyWarningSignals(mockSnapshot);
      
      expect(warnings.timeframe).toMatch(/\d+-\d+ (days|weeks)/);
      expect(warnings.confirmationLevel).toBe('high');
    });
  });

  describe('getDetailedAnalysis', () => {
    it('should provide comprehensive factor analysis', () => {
      const analysis = regimeCompass.getDetailedAnalysis(mockSnapshot);
      
      expect(analysis.classification).toBeDefined();
      expect(analysis.factorAnalysis).toBeDefined();
      expect(analysis.earlyWarnings).toBeDefined();
      
      // Check factor analysis structure
      expect(analysis.factorAnalysis.breadth).toHaveProperty('value');
      expect(analysis.factorAnalysis.breadth).toHaveProperty('status');
      expect(analysis.factorAnalysis.breadth).toHaveProperty('bullish');
      expect(analysis.factorAnalysis.breadth).toHaveProperty('bearish');
      
      expect(analysis.factorAnalysis.ema).toHaveProperty('ema20');
      expect(analysis.factorAnalysis.ema).toHaveProperty('ema50');
      expect(analysis.factorAnalysis.ema).toHaveProperty('spread');
      
      expect(analysis.factorAnalysis.trend).toHaveProperty('score');
      expect(analysis.factorAnalysis.volatility).toHaveProperty('vix');
      expect(analysis.factorAnalysis.gamma).toHaveProperty('gex');
    });

    it('should correctly assess factor status', () => {
      mockSnapshot.breadth.breadthPct = 0.75; // Strong
      
      const analysis = regimeCompass.getDetailedAnalysis(mockSnapshot);
      
      expect(analysis.factorAnalysis.breadth.status).toBe('Strong');
      expect(analysis.factorAnalysis.breadth.bullish).toBe(true);
    });
  });

  describe('isRegimeChangeImminent', () => {
    it('should detect imminent regime change with high warning count', () => {
      mockSnapshot.regime = 'BULL';
      mockSnapshot.breadth.breadthPct = 0.35; // Multiple warnings
      mockSnapshot.indexes.SPY.trendScore9 = -2;
      mockSnapshot.vix.value = 28;
      mockSnapshot.gamma.bias = 'suppressive';

      const changeAnalysis = regimeCompass.isRegimeChangeImminent(mockSnapshot);
      
      expect(changeAnalysis.imminent).toBe(true);
      expect(changeAnalysis.probability).toBeGreaterThan(0.5);
      expect(changeAnalysis.triggerFactors.length).toBeGreaterThan(2);
    });

    it('should not detect imminent change with few warnings', () => {
      mockSnapshot.regime = 'BULL';
      mockSnapshot.breadth.breadthPct = 0.68; // Strong conditions
      mockSnapshot.indexes.SPY.trendScore9 = 6;
      mockSnapshot.vix.value = 16;

      const changeAnalysis = regimeCompass.isRegimeChangeImminent(mockSnapshot);
      
      expect(changeAnalysis.imminent).toBe(false);
      expect(changeAnalysis.probability).toBeLessThan(0.5);
    });
  });

  describe('edge cases', () => {
    it('should handle missing or invalid data gracefully', () => {
      const invalidSnapshot = {
        ...mockSnapshot,
        breadth: {
          ...mockSnapshot.breadth,
          breadthPct: NaN
        }
      };

      expect(() => regimeCompass.classify(invalidSnapshot)).not.toThrow();
    });

    it('should handle extreme values correctly', () => {
      mockSnapshot.breadth.breadthPct = 1.0; // 100%
      mockSnapshot.indexes.SPY.trendScore9 = 9; // Maximum
      mockSnapshot.vix.value = 5; // Very low

      const classification = regimeCompass.classify(mockSnapshot);
      
      expect(classification.regime).toBe('BULL');
      expect(classification.strength).toBeGreaterThan(90);
    });
  });
});