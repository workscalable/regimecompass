import { EventEmitter } from 'events';
import { 
  TrianglePattern, 
  PatternMetrics, 
  SignalStage, 
  PatternType, 
  Timeframe 
} from '@/lib/trading';
import { IndexData } from '@/lib/types';

/**
 * TrianglePlayDetector_v2 - Advanced Pattern Recognition Module
 * 
 * Detects symmetrical triangles (compression → expansion) on multiple timeframes
 * Computes swing highs/lows, compression ratio, ATR ratio, and volume contraction
 * 
 * Features:
 * - Multi-timeframe pattern detection (15m, 30m, 1h)
 * - Advanced swing point identification
 * - Volatility compression analysis
 * - Volume contraction detection
 * - Breakout probability calculation
 */

export class TrianglePlayDetector_v2 extends EventEmitter {
  private patterns: Map<string, TrianglePattern> = new Map();
  private swingPoints: Map<string, { highs: number[]; lows: number[] }> = new Map();
  private readonly compressionThreshold = 0.4;
  private readonly atrRatioThreshold = 0.6;
  private readonly volumeContractionThreshold = 0.3;

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for pattern detection
   */
  private setupEventHandlers(): void {
    this.on('patternDetected', (pattern: TrianglePattern) => {
      console.log(`Triangle pattern detected for ${pattern.symbol}:`, {
        range: pattern.range,
        compression: pattern.volatilityCompression,
        timeframe: pattern.timeframe
      });
    });

    this.on('patternUpdated', (pattern: TrianglePattern) => {
      console.log(`Triangle pattern updated for ${pattern.symbol}:`, {
        status: pattern.status,
        compression: pattern.volatilityCompression
      });
    });

    this.on('patternInvalidated', (symbol: string, reason: string) => {
      console.log(`Triangle pattern invalidated for ${symbol}: ${reason}`);
    });
  }

  /**
   * Detect triangle patterns from market data
   */
  async detectPatterns(
    symbol: string, 
    marketData: IndexData[], 
    timeframe: Timeframe = '15m'
  ): Promise<TrianglePattern | null> {
    try {
      if (marketData.length < 20) {
        throw new Error('Insufficient data for pattern detection');
      }

      // Extract price and volume data
      const prices = marketData.map(d => d.price).reverse(); // Oldest to newest
      const volumes = marketData.map(d => d.volume).reverse();
      const highs = marketData.map(d => d.price * 1.002).reverse(); // Simulate high prices
      const lows = marketData.map(d => d.price * 0.998).reverse(); // Simulate low prices

      // Calculate swing points
      const swingPoints = this.calculateSwingPoints(prices, highs, lows);
      
      // Check if we have enough swing points for a triangle
      if (swingPoints.highs.length < 3 || swingPoints.lows.length < 3) {
        return null;
      }

      // Calculate pattern metrics
      const metrics = this.calculatePatternMetrics(
        prices, 
        volumes, 
        highs, 
        lows, 
        swingPoints
      );

      // Check if pattern meets triangle criteria
      if (!this.isValidTriangle(metrics)) {
        return null;
      }

      // Create triangle pattern
      const pattern: TrianglePattern = {
        symbol,
        pattern: 'Triangle',
        range: [Math.min(...swingPoints.lows), Math.max(...swingPoints.highs)],
        volatilityCompression: metrics.compressionRatio,
        timeframe,
        status: this.determinePatternStatus(metrics),
        swingHighs: swingPoints.highs,
        swingLows: swingPoints.lows,
        compressionRatio: metrics.compressionRatio,
        atrRatio: metrics.atrRatio,
        volumeContraction: metrics.volumeContraction,
        timestamp: new Date()
      };

      // Store pattern
      this.patterns.set(symbol, pattern);
      this.swingPoints.set(symbol, swingPoints);

      // Emit pattern detected event
      this.emit('patternDetected', pattern);

      return pattern;

    } catch (error) {
      console.error(`Error detecting triangle pattern for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Calculate swing highs and lows using peak detection
   */
  private calculateSwingPoints(
    prices: number[], 
    highs: number[], 
    lows: number[]
  ): { highs: number[]; lows: number[] } {
    const swingHighs: number[] = [];
    const swingLows: number[] = [];
    
    const lookback = Math.min(5, Math.floor(prices.length / 4));
    
    // Find swing highs
    for (let i = lookback; i < highs.length - lookback; i++) {
      let isSwingHigh = true;
      
      // Check if current point is higher than surrounding points
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && highs[j] >= highs[i]) {
          isSwingHigh = false;
          break;
        }
      }
      
      if (isSwingHigh) {
        swingHighs.push(highs[i]);
      }
    }
    
    // Find swing lows
    for (let i = lookback; i < lows.length - lookback; i++) {
      let isSwingLow = true;
      
      // Check if current point is lower than surrounding points
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i && lows[j] <= lows[i]) {
          isSwingLow = false;
          break;
        }
      }
      
      if (isSwingLow) {
        swingLows.push(lows[i]);
      }
    }
    
    return { highs: swingHighs, lows: swingLows };
  }

  /**
   * Calculate comprehensive pattern metrics
   */
  private calculatePatternMetrics(
    prices: number[],
    volumes: number[],
    highs: number[],
    lows: number[],
    swingPoints: { highs: number[]; lows: number[] }
  ): PatternMetrics {
    // Calculate ATR
    const atr = this.calculateATR(highs, lows, prices, 14);
    
    // Calculate compression ratio (range compression over time)
    const compressionRatio = this.calculateCompressionRatio(swingPoints);
    
    // Calculate ATR ratio (current ATR vs historical average)
    const atrRatio = this.calculateATRRatio(atr, highs, lows);
    
    // Calculate volume contraction
    const volumeContraction = this.calculateVolumeContraction(volumes);
    
    // Calculate breakout probability
    const breakoutProbability = this.calculateBreakoutProbability(
      compressionRatio, 
      atrRatio, 
      volumeContraction
    );
    
    // Calculate target levels
    const targetLevels = this.calculateTargetLevels(swingPoints, atr);
    
    return {
      compressionRatio,
      atrRatio,
      volumeContraction,
      breakoutProbability,
      targetLevels,
      supportLevels: swingPoints.lows.slice(-3), // Last 3 support levels
      resistanceLevels: swingPoints.highs.slice(-3) // Last 3 resistance levels
    };
  }

  /**
   * Calculate Average True Range (ATR)
   */
  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < period + 1) return 0;
    
    const trueRanges: number[] = [];
    
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trueRanges.push(tr);
    }
    
    // Calculate simple moving average of true ranges
    const atr = trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
    return atr;
  }

  /**
   * Calculate compression ratio (how much the range has compressed)
   */
  private calculateCompressionRatio(swingPoints: { highs: number[]; lows: number[] }): number {
    if (swingPoints.highs.length < 3 || swingPoints.lows.length < 3) return 0;
    
    // Get recent swing points
    const recentHighs = swingPoints.highs.slice(-3);
    const recentLows = swingPoints.lows.slice(-3);
    
    // Calculate current range
    const currentRange = Math.max(...recentHighs) - Math.min(...recentLows);
    
    // Calculate previous range (if available)
    if (swingPoints.highs.length >= 6 && swingPoints.lows.length >= 6) {
      const previousHighs = swingPoints.highs.slice(-6, -3);
      const previousLows = swingPoints.lows.slice(-6, -3);
      const previousRange = Math.max(...previousHighs) - Math.min(...previousLows);
      
      // Return compression ratio (0-1, where 1 = maximum compression)
      return Math.max(0, 1 - (currentRange / previousRange));
    }
    
    return 0.5; // Default moderate compression
  }

  /**
   * Calculate ATR ratio (current vs historical)
   */
  private calculateATRRatio(currentATR: number, highs: number[], lows: number[]): number {
    if (highs.length < 20) return 1;
    
    // Calculate historical ATR
    const historicalATR = this.calculateATR(highs, lows, highs, 20);
    
    if (historicalATR === 0) return 1;
    
    return currentATR / historicalATR;
  }

  /**
   * Calculate volume contraction
   */
  private calculateVolumeContraction(volumes: number[]): number {
    if (volumes.length < 10) return 0;
    
    const recentVolumes = volumes.slice(-5);
    const historicalVolumes = volumes.slice(-10, -5);
    
    const recentAvg = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
    const historicalAvg = historicalVolumes.reduce((sum, vol) => sum + vol, 0) / historicalVolumes.length;
    
    if (historicalAvg === 0) return 0;
    
    // Return contraction ratio (0-1, where 1 = maximum contraction)
    return Math.max(0, 1 - (recentAvg / historicalAvg));
  }

  /**
   * Calculate breakout probability based on multiple factors
   */
  private calculateBreakoutProbability(
    compressionRatio: number,
    atrRatio: number,
    volumeContraction: number
  ): number {
    // Weighted factors for breakout probability
    const compressionWeight = 0.4;
    const atrWeight = 0.3;
    const volumeWeight = 0.3;
    
    // Higher compression and lower ATR/volume suggest higher breakout probability
    const probability = 
      (compressionRatio * compressionWeight) +
      ((1 - atrRatio) * atrWeight) +
      (volumeContraction * volumeWeight);
    
    return Math.min(1, Math.max(0, probability));
  }

  /**
   * Calculate target levels based on pattern and ATR
   */
  private calculateTargetLevels(
    swingPoints: { highs: number[]; lows: number[] },
    atr: number
  ): number[] {
    if (swingPoints.highs.length === 0 || swingPoints.lows.length === 0) return [];
    
    const currentHigh = Math.max(...swingPoints.highs.slice(-3));
    const currentLow = Math.min(...swingPoints.lows.slice(-3));
    const range = currentHigh - currentLow;
    
    // Calculate targets based on pattern range
    const target1 = currentHigh + (range * 0.5);
    const target2 = currentHigh + range;
    const target3 = currentHigh + (range * 1.5);
    
    return [target1, target2, target3];
  }

  /**
   * Check if pattern meets triangle criteria
   */
  private isValidTriangle(metrics: PatternMetrics): boolean {
    return (
      metrics.compressionRatio >= this.compressionThreshold &&
      metrics.atrRatio <= this.atrRatioThreshold &&
      metrics.volumeContraction >= this.volumeContractionThreshold
    );
  }

  /**
   * Determine pattern status based on metrics
   */
  private determinePatternStatus(metrics: PatternMetrics): SignalStage {
    if (metrics.breakoutProbability >= 0.8) return 'GO';
    if (metrics.breakoutProbability >= 0.6) return 'READY';
    return 'MONITOR';
  }

  /**
   * Update existing pattern with new data
   */
  async updatePattern(symbol: string, newData: IndexData): Promise<TrianglePattern | null> {
    const existingPattern = this.patterns.get(symbol);
    if (!existingPattern) return null;

    try {
      // Add new data point and recalculate
      const updatedPattern = await this.detectPatterns(
        symbol, 
        [newData, ...Object.values(existingPattern)], 
        existingPattern.timeframe
      );

      if (updatedPattern) {
        this.emit('patternUpdated', updatedPattern);
        return updatedPattern;
      } else {
        // Pattern no longer valid
        this.patterns.delete(symbol);
        this.emit('patternInvalidated', symbol, 'Pattern structure broken');
        return null;
      }
    } catch (error) {
      console.error(`Error updating pattern for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get all active patterns
   */
  getActivePatterns(): TrianglePattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get pattern for specific symbol
   */
  getPattern(symbol: string): TrianglePattern | undefined {
    return this.patterns.get(symbol);
  }

  /**
   * Remove pattern
   */
  removePattern(symbol: string): boolean {
    const removed = this.patterns.delete(symbol);
    this.swingPoints.delete(symbol);
    return removed;
  }

  /**
   * Get pattern statistics
   */
  getPatternStats(): {
    totalPatterns: number;
    byStatus: Record<SignalStage, number>;
    byTimeframe: Record<Timeframe, number>;
    avgCompression: number;
    avgBreakoutProbability: number;
  } {
    const patterns = Array.from(this.patterns.values());
    
    const byStatus = patterns.reduce((acc, pattern) => {
      acc[pattern.status] = (acc[pattern.status] || 0) + 1;
      return acc;
    }, {} as Record<SignalStage, number>);

    const byTimeframe = patterns.reduce((acc, pattern) => {
      acc[pattern.timeframe] = (acc[pattern.timeframe] || 0) + 1;
      return acc;
    }, {} as Record<Timeframe, number>);

    const avgCompression = patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.compressionRatio, 0) / patterns.length 
      : 0;

    const avgBreakoutProbability = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.compressionRatio, 0) / patterns.length
      : 0;

    return {
      totalPatterns: patterns.length,
      byStatus,
      byTimeframe,
      avgCompression,
      avgBreakoutProbability
    };
  }

  /**
   * Clear all patterns
   */
  clearPatterns(): void {
    this.patterns.clear();
    this.swingPoints.clear();
  }
}

// Export singleton instance
export const triangleDetector = new TrianglePlayDetector_v2();


