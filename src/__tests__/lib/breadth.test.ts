import {
  calculateBreadthFromSectors,
  calculateBreadthFromTrendScores,
  calculateComprehensiveBreadth,
  analyzeBreadthMomentum,
  calculateBreadthStrength,
  identifyBreadthPatterns,
  generateBreadthSignals,
  calculateSectorParticipation
} from '@/lib/breadth';
import { SectorData, BreadthData } from '@/lib/types';

describe('Breadth Analysis', () => {
  let mockSectors: Record<string, SectorData>;

  beforeEach(() => {
    mockSectors = {
      XLK: {
        symbol: 'XLK',
        name: 'Technology',
        price: 180,
        change: 1.8,
        changePercent: 1.0,
        volume: 15000000,
        trendScore9: 6,
        relativeStrength: 0.5,
        recommendation: 'BUY',
        timestamp: new Date()
      },
      XLF: {
        symbol: 'XLF',
        name: 'Financials',
        price: 40,
        change: 0.4,
        changePercent: 1.0,
        volume: 20000000,
        trendScore9: 3,
        relativeStrength: 0.2,
        recommendation: 'HOLD',
        timestamp: new Date()
      },
      XLE: {
        symbol: 'XLE',
        name: 'Energy',
        price: 85,
        change: -1.7,
        changePercent: -2.0,
        volume: 12000000,
        trendScore9: -4,
        relativeStrength: -0.8,
        recommendation: 'AVOID',
        timestamp: new Date()
      }
    };
  });

  describe('calculateBreadthFromSectors', () => {
    it('should calculate correct breadth percentage', () => {
      const breadth = calculateBreadthFromSectors(mockSectors);
      
      // 2 out of 3 sectors positive = 66.7%
      expect(breadth).toBeCloseTo(0.667, 2);
    });

    it('should handle empty sectors', () => {
      const breadth = calculateBreadthFromSectors({});
      expect(breadth).toBe(0.5); // Default neutral
    });

    it('should handle all negative sectors', () => {
      const negativeSectors = {
        XLE: { ...mockSectors.XLE, changePercent: -1.0 },
        XLU: { ...mockSectors.XLE, changePercent: -0.5 },
        XLP: { ...mockSectors.XLE, changePercent: -2.0 }
      };
      
      const breadth = calculateBreadthFromSectors(negativeSectors);
      expect(breadth).toBe(0);
    });
  });

  describe('calculateBreadthFromTrendScores', () => {
    it('should calculate breadth from trend scores', () => {
      const scores = { XLK: 6, XLF: 3, XLE: -4 };
      const breadth = calculateBreadthFromTrendScores(scores);
      
      // 2 out of 3 positive = 66.7%
      expect(breadth).toBeCloseTo(0.667, 2);
    });

    it('should handle zero scores correctly', () => {
      const scores = { XLK: 0, XLF: 1, XLE: -1 };
      const breadth = calculateBreadthFromTrendScores(scores);
      
      // Only 1 out of 3 positive = 33.3%
      expect(breadth).toBeCloseTo(0.333, 2);
    });
  });

  describe('calculateComprehensiveBreadth', () => {
    it('should calculate comprehensive breadth data', () => {
      const breadth = calculateComprehensiveBreadth(mockSectors);
      
      expect(breadth.breadthPct).toBeCloseTo(0.667, 2);
      expect(breadth.advancingStocks).toBeGreaterThan(0);
      expect(breadth.decliningStocks).toBeGreaterThan(0);
      expect(breadth.advanceDeclineRatio).toBeGreaterThan(0);
      expect(breadth.newHighs).toBeGreaterThanOrEqual(0);
      expect(breadth.newLows).toBeGreaterThanOrEqual(0);
    });

    it('should estimate stock counts correctly', () => {
      const breadth = calculateComprehensiveBreadth(mockSectors);
      
      const totalStocks = breadth.advancingStocks + breadth.decliningStocks + breadth.unchangedStocks;
      expect(totalStocks).toBe(135); // 3 sectors * 45 stocks per sector
    });
  });

  describe('analyzeBreadthMomentum', () => {
    it('should analyze momentum with historical data', () => {
      const currentBreadth: BreadthData = {
        breadthPct: 0.7,
        advancingStocks: 350,
        decliningStocks: 150,
        unchangedStocks: 0,
        newHighs: 50,
        newLows: 10,
        advanceDeclineRatio: 2.33
      };

      const historicalBreadth: BreadthData[] = [
        { ...currentBreadth, breadthPct: 0.6 },
        { ...currentBreadth, breadthPct: 0.65 }
      ];

      const momentum = analyzeBreadthMomentum(currentBreadth, historicalBreadth);
      
      expect(momentum.trend).toBe('improving');
      expect(momentum.strength).toBeGreaterThan(0.5);
      expect(momentum.momentum).toBeDefined();
    });

    it('should detect deteriorating breadth', () => {
      const currentBreadth: BreadthData = {
        breadthPct: 0.3,
        advancingStocks: 150,
        decliningStocks: 350,
        unchangedStocks: 0,
        newHighs: 5,
        newLows: 45,
        advanceDeclineRatio: 0.43
      };

      const historicalBreadth: BreadthData[] = [
        { ...currentBreadth, breadthPct: 0.5 },
        { ...currentBreadth, breadthPct: 0.4 }
      ];

      const momentum = analyzeBreadthMomentum(currentBreadth, historicalBreadth);
      
      expect(momentum.trend).toBe('deteriorating');
      expect(momentum.strength).toBeLessThan(0.5);
    });
  });

  describe('calculateBreadthStrength', () => {
    it('should calculate strength score correctly', () => {
      const breadth: BreadthData = {
        breadthPct: 0.8,
        advancingStocks: 400,
        decliningStocks: 100,
        unchangedStocks: 0,
        newHighs: 60,
        newLows: 5,
        advanceDeclineRatio: 4.0
      };

      const strength = calculateBreadthStrength(breadth);
      
      expect(strength).toBeGreaterThan(0.8);
      expect(strength).toBeLessThanOrEqual(1.0);
    });

    it('should give low strength for weak breadth', () => {
      const breadth: BreadthData = {
        breadthPct: 0.2,
        advancingStocks: 100,
        decliningStocks: 400,
        unchangedStocks: 0,
        newHighs: 2,
        newLows: 50,
        advanceDeclineRatio: 0.25
      };

      const strength = calculateBreadthStrength(breadth);
      
      expect(strength).toBeLessThan(0.3);
    });
  });

  describe('identifyBreadthPatterns', () => {
    it('should identify breadth thrust pattern', () => {
      const breadth: BreadthData = {
        breadthPct: 0.92,
        advancingStocks: 460,
        decliningStocks: 40,
        unchangedStocks: 0,
        newHighs: 80,
        newLows: 2,
        advanceDeclineRatio: 11.5
      };

      const pattern = identifyBreadthPatterns(breadth);
      
      expect(pattern.pattern).toBe('thrust');
      expect(pattern.signal).toBe('bullish');
      expect(pattern.confidence).toBeGreaterThan(0.7);
    });

    it('should identify exhaustion pattern', () => {
      const breadth: BreadthData = {
        breadthPct: 0.05,
        advancingStocks: 25,
        decliningStocks: 475,
        unchangedStocks: 0,
        newHighs: 1,
        newLows: 95,
        advanceDeclineRatio: 0.05
      };

      const pattern = identifyBreadthPatterns(breadth);
      
      expect(pattern.pattern).toBe('exhaustion');
      expect(pattern.signal).toBe('bullish'); // Contrarian signal
      expect(pattern.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('generateBreadthSignals', () => {
    it('should generate BULL regime support signal', () => {
      const breadth: BreadthData = {
        breadthPct: 0.68,
        advancingStocks: 340,
        decliningStocks: 160,
        unchangedStocks: 0,
        newHighs: 45,
        newLows: 8,
        advanceDeclineRatio: 2.125
      };

      const signals = generateBreadthSignals(breadth);
      
      expect(signals.regimeSupport).toBe('bull');
      expect(signals.actionSignal).toBe('buy');
      expect(signals.reasoning).toContain('Strong breadth at 68.0% supports BULL regime');
    });

    it('should generate BEAR regime support signal', () => {
      const breadth: BreadthData = {
        breadthPct: 0.32,
        advancingStocks: 160,
        decliningStocks: 340,
        unchangedStocks: 0,
        newHighs: 5,
        newLows: 55,
        advanceDeclineRatio: 0.47
      };

      const signals = generateBreadthSignals(breadth);
      
      expect(signals.regimeSupport).toBe('bear');
      expect(signals.actionSignal).toBe('reduce');
      expect(signals.reasoning).toContain('Weak breadth at 32.0% supports BEAR regime');
    });
  });

  describe('calculateSectorParticipation', () => {
    it('should calculate participation metrics', () => {
      const participation = calculateSectorParticipation(mockSectors);
      
      expect(participation.participationRate).toBeGreaterThan(0);
      expect(participation.leadingSectors).toHaveLength(3);
      expect(participation.laggingSectors).toHaveLength(3);
      expect(participation.rotationSignal).toBeDefined();
    });

    it('should identify rotation signals', () => {
      const growthSectors = {
        XLK: { ...mockSectors.XLK, changePercent: 2.5 },
        XLY: { ...mockSectors.XLK, symbol: 'XLY', changePercent: 2.0 },
        XLC: { ...mockSectors.XLK, symbol: 'XLC', changePercent: 1.8 }
      };

      const participation = calculateSectorParticipation(growthSectors);
      
      expect(participation.rotationSignal).toBe('into_growth');
    });
  });
});