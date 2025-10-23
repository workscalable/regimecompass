import {
  trendScore9,
  calculateEMA,
  calculateATR,
  calculateRSI,
  calculateMACD,
  checkEMAAlignment,
  calculateRegimeStrength,
  detectMomentumDivergence,
  analyzeVolumeConfirmation
} from '@/lib/math';

describe('Math Functions', () => {
  describe('trendScore9', () => {
    it('should calculate correct trend score for all up days', () => {
      const closes = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
      expect(trendScore9(closes)).toBe(9);
    });

    it('should calculate correct trend score for all down days', () => {
      const closes = [109, 108, 107, 106, 105, 104, 103, 102, 101, 100];
      expect(trendScore9(closes)).toBe(-9);
    });

    it('should calculate correct trend score for mixed days', () => {
      const closes = [100, 101, 100, 102, 101, 103, 102, 104, 103, 105];
      // 5 up days, 4 down days = +1
      expect(trendScore9(closes)).toBe(1);
    });

    it('should throw error for insufficient data', () => {
      const closes = [100, 101, 102];
      expect(() => trendScore9(closes)).toThrow('Need at least 10 closing prices');
    });
  });

  describe('calculateEMA', () => {
    it('should calculate EMA correctly', () => {
      const prices = [10, 11, 12, 13, 14, 15];
      const period = 3;
      const ema = calculateEMA(prices, period);
      
      expect(ema).toHaveLength(4); // 6 - 3 + 1
      expect(ema[0]).toBe(11); // SMA of first 3: (10+11+12)/3
      expect(ema[ema.length - 1]).toBeCloseTo(14.25, 2);
    });

    it('should throw error for insufficient data', () => {
      const prices = [10, 11];
      expect(() => calculateEMA(prices, 5)).toThrow('Need at least 5 prices');
    });
  });

  describe('calculateATR', () => {
    it('should calculate ATR correctly', () => {
      const highs = [12, 13, 14, 15, 16];
      const lows = [10, 11, 12, 13, 14];
      const closes = [11, 12, 13, 14, 15];
      
      const atr = calculateATR(highs, lows, closes, 3);
      expect(atr).toBeGreaterThan(0);
      expect(atr).toBeLessThan(5);
    });

    it('should throw error for mismatched array lengths', () => {
      const highs = [12, 13];
      const lows = [10];
      const closes = [11, 12];
      
      expect(() => calculateATR(highs, lows, closes)).toThrow('same length');
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI correctly', () => {
      const closes = Array.from({length: 20}, (_, i) => 100 + i);
      const rsi = calculateRSI(closes, 14);
      
      expect(rsi).toHaveLength(6); // 20 - 14
      expect(rsi[rsi.length - 1]).toBeGreaterThan(50); // Uptrend should have RSI > 50
      expect(rsi[rsi.length - 1]).toBeLessThan(100);
    });
  });

  describe('checkEMAAlignment', () => {
    it('should detect bullish EMA alignment', () => {
      const ema20 = 105;
      const ema50 = 100;
      
      expect(checkEMAAlignment(ema20, ema50, 'bull')).toBe(true);
      expect(checkEMAAlignment(ema20, ema50, 'bear')).toBe(false);
    });

    it('should detect bearish EMA alignment', () => {
      const ema20 = 95;
      const ema50 = 100;
      
      expect(checkEMAAlignment(ema20, ema50, 'bear')).toBe(true);
      expect(checkEMAAlignment(ema20, ema50, 'bull')).toBe(false);
    });

    it('should handle neutral zone correctly', () => {
      const ema20 = 100.1;
      const ema50 = 100;
      
      // Should not trigger bull signal (needs > 0.25% buffer)
      expect(checkEMAAlignment(ema20, ema50, 'bull')).toBe(false);
    });
  });

  describe('calculateRegimeStrength', () => {
    it('should calculate regime strength correctly', () => {
      const strength = calculateRegimeStrength(
        0.8,  // breadthPct
        7,    // trendScore
        true, // emaAlignment
        15,   // vixLevel
        true  // gammaSupport
      );
      
      expect(strength).toBeGreaterThan(80);
      expect(strength).toBeLessThanOrEqual(100);
    });

    it('should return low strength for weak conditions', () => {
      const strength = calculateRegimeStrength(
        0.3,   // breadthPct
        -2,    // trendScore
        false, // emaAlignment
        35,    // vixLevel
        false  // gammaSupport
      );
      
      expect(strength).toBeLessThan(30);
    });
  });

  describe('detectMomentumDivergence', () => {
    it('should detect bullish divergence', () => {
      const prices = [100, 95, 90, 85, 80, 85, 90, 95, 100, 98];
      const indicator = [50, 45, 40, 35, 30, 35, 40, 45, 50, 52];
      
      const divergence = detectMomentumDivergence(prices, indicator, 5);
      expect(divergence.type).toBe('bullish');
      expect(divergence.strength).toBeGreaterThan(0);
    });

    it('should detect no divergence for aligned signals', () => {
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
      const indicator = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59];
      
      const divergence = detectMomentumDivergence(prices, indicator, 5);
      expect(divergence.type).toBe('none');
    });
  });

  describe('analyzeVolumeConfirmation', () => {
    it('should detect up thrust on high volume', () => {
      const prices = [100, 101, 102, 103, 105];
      const volumes = [1000, 1100, 1200, 1300, 2000];
      
      const analysis = analyzeVolumeConfirmation(prices, volumes, 4);
      expect(analysis.upThrust).toBe(true);
      expect(analysis.volumeSpike).toBe(true);
    });

    it('should detect down thrust on high volume', () => {
      const prices = [105, 104, 103, 102, 100];
      const volumes = [1000, 1100, 1200, 1300, 2000];
      
      const analysis = analyzeVolumeConfirmation(prices, volumes, 4);
      expect(analysis.downThrust).toBe(true);
      expect(analysis.volumeSpike).toBe(true);
    });
  });
});