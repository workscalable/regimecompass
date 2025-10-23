import { EventEmitter } from 'events';

/**
 * Trend Composite Engine - Multi-timeframe trend analysis with regime awareness
 * Provides sophisticated trend strength calculation across multiple timeframes
 */
export class TrendCompositeEngine extends EventEmitter {
  private readonly TIMEFRAME_WEIGHTS = {
    '1m': 0.05,   // Very short term
    '5m': 0.10,   // Short term
    '15m': 0.15,  // Medium short term
    '1h': 0.25,   // Medium term
    '4h': 0.20,   // Medium long term
    '1d': 0.25    // Long term
  };

  private readonly TREND_INDICATORS = {
    SMA: { periods: [20, 50, 200], weight: 0.25 },
    EMA: { periods: [12, 26, 50], weight: 0.25 },
    VWMA: { periods: [20, 50], weight: 0.20 },
    ADX: { period: 14, weight: 0.15 },
    MACD: { fast: 12, slow: 26, signal: 9, weight: 0.15 }
  };

  /**
   * Calculate comprehensive trend composite score
   */
  public async calculateTrendComposite(ticker: string): Promise<TrendCompositeResult> {
    try {
      // Get multi-timeframe trend analysis
      const timeframeTrends = await this.analyzeMultiTimeframeTrends(ticker);
      
      // Calculate weighted composite
      const composite = this.calculateWeightedComposite(timeframeTrends);
      
      // Get trend strength and direction
      const trendStrength = this.calculateTrendStrength(timeframeTrends);
      const trendDirection = this.determineTrendDirection(Object.values(timeframeTrends));
      
      // Apply regime adjustment
      const regimeAdjustment = await this.getRegimeAdjustment(ticker);
      const adjustedComposite = this.applyRegimeAdjustment(composite, regimeAdjustment);
      
      // Calculate trend quality metrics
      const quality = this.calculateTrendQuality(timeframeTrends);
      
      const result: TrendCompositeResult = {
        ticker,
        composite: Number(adjustedComposite.toFixed(3)),
        strength: Number(trendStrength.toFixed(3)),
        direction: trendDirection,
        quality: Number(quality.toFixed(3)),
        timeframeBreakdown: timeframeTrends,
        regimeAdjustment: Number(regimeAdjustment.toFixed(3)),
        timestamp: new Date()
      };

      this.emit('trend:calculated', result);
      return result;
      
    } catch (error) {
      console.error(`Error calculating trend composite for ${ticker}:`, error);
      
      // Return neutral trend on error
      return {
        ticker,
        composite: 0.5,
        strength: 0.3,
        direction: 'NEUTRAL',
        quality: 0.2,
        timeframeBreakdown: {},
        regimeAdjustment: 0.0,
        timestamp: new Date()
      };
    }
  }

  /**
   * Analyze trends across multiple timeframes
   */
  private async analyzeMultiTimeframeTrends(ticker: string): Promise<Record<string, TimeframeTrend>> {
    const timeframeTrends: Record<string, TimeframeTrend> = {};
    
    for (const timeframe of Object.keys(this.TIMEFRAME_WEIGHTS)) {
      try {
        const trend = await this.analyzeSingleTimeframeTrend(ticker, timeframe);
        timeframeTrends[timeframe] = trend;
      } catch (error) {
        console.error(`Error analyzing ${timeframe} trend for ${ticker}:`, error);
        // Use neutral trend for failed timeframes
        timeframeTrends[timeframe] = {
          timeframe,
          score: 0.5,
          direction: 'NEUTRAL',
          strength: 0.3,
          indicators: {}
        };
      }
    }
    
    return timeframeTrends;
  }

  /**
   * Analyze trend for a single timeframe
   */
  private async analyzeSingleTimeframeTrend(ticker: string, timeframe: string): Promise<TimeframeTrend> {
    // Get price data for timeframe
    const priceData = await this.getPriceData(ticker, timeframe, 200);
    
    // Calculate individual trend indicators
    const indicators: Record<string, number> = {};
    
    // Simple Moving Averages
    indicators.sma20 = this.calculateSMA(priceData, 20);
    indicators.sma50 = this.calculateSMA(priceData, 50);
    indicators.sma200 = this.calculateSMA(priceData, 200);
    
    // Exponential Moving Averages
    indicators.ema12 = this.calculateEMA(priceData, 12);
    indicators.ema26 = this.calculateEMA(priceData, 26);
    indicators.ema50 = this.calculateEMA(priceData, 50);
    
    // Volume Weighted Moving Average
    indicators.vwma20 = this.calculateVWMA(priceData, 20);
    indicators.vwma50 = this.calculateVWMA(priceData, 50);
    
    // Average Directional Index (trend strength)
    indicators.adx = this.calculateADX(priceData, 14);
    
    // MACD
    const macd = this.calculateMACD(priceData, 12, 26, 9);
    indicators.macd = macd.histogram;
    indicators.macdSignal = macd.signal;
    
    // Calculate overall trend score for this timeframe
    const score = this.calculateTimeframeTrendScore(indicators, priceData);
    const direction = this.determineTrendDirection([{ score, direction: 'NEUTRAL', strength: 0, timeframe, indicators }]);
    const strength = indicators.adx / 100; // Normalize ADX to 0-1
    
    return {
      timeframe,
      score: Number(score.toFixed(3)),
      direction,
      strength: Number(strength.toFixed(3)),
      indicators
    };
  }

  /**
   * Calculate weighted composite from timeframe trends
   */
  private calculateWeightedComposite(timeframeTrends: Record<string, TimeframeTrend>): number {
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [timeframe, trend] of Object.entries(timeframeTrends)) {
      const weight = this.TIMEFRAME_WEIGHTS[timeframe as keyof typeof this.TIMEFRAME_WEIGHTS] || 0;
      weightedSum += trend.score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Calculate overall trend strength
   */
  private calculateTrendStrength(timeframeTrends: Record<string, TimeframeTrend>): number {
    const strengths = Object.values(timeframeTrends).map(trend => trend.strength);
    return strengths.reduce((sum, strength) => sum + strength, 0) / strengths.length;
  }

  /**
   * Determine overall trend direction
   */
  private determineTrendDirection(timeframeTrends: TimeframeTrend[]): TrendDirection {
    const bullishCount = timeframeTrends.filter(trend => trend.direction === 'BULLISH').length;
    const bearishCount = timeframeTrends.filter(trend => trend.direction === 'BEARISH').length;
    const neutralCount = timeframeTrends.filter(trend => trend.direction === 'NEUTRAL').length;
    
    if (bullishCount > bearishCount + neutralCount) {
      return 'BULLISH';
    } else if (bearishCount > bullishCount + neutralCount) {
      return 'BEARISH';
    } else {
      return 'NEUTRAL';
    }
  }

  /**
   * Calculate trend quality (consistency across timeframes)
   */
  private calculateTrendQuality(timeframeTrends: Record<string, TimeframeTrend>): number {
    const trends = Object.values(timeframeTrends);
    const scores = trends.map(trend => trend.score);
    
    // Calculate standard deviation (lower = higher quality)
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to quality score (0-1, higher is better)
    return Math.max(0, 1 - (stdDev * 2));
  }

  /**
   * Get regime adjustment factor
   */
  private async getRegimeAdjustment(ticker: string): Promise<number> {
    try {
      // TODO: Integrate with RegimeCompass or similar system
      const regime = await this.getCurrentRegime(ticker);
      
      const regimeAdjustments = {
        'BULL': 0.1,      // +10% in bull markets
        'BEAR': -0.1,     // -10% in bear markets
        'NEUTRAL': 0.0,   // No adjustment
        'VOLATILE': -0.05 // -5% in volatile markets
      };
      
      return regimeAdjustments[regime] || 0.0;
    } catch (error) {
      return 0.0; // No adjustment on error
    }
  }

  /**
   * Apply regime adjustment to composite score
   */
  private applyRegimeAdjustment(composite: number, adjustment: number): number {
    return Math.max(0, Math.min(1, composite + adjustment));
  }

  /**
   * Calculate trend score for a single timeframe
   */
  private calculateTimeframeTrendScore(indicators: Record<string, number>, priceData: PriceBar[]): number {
    const currentPrice = priceData[priceData.length - 1].close;
    let score = 0.5; // Start neutral
    
    // SMA analysis
    if (indicators.sma20 && indicators.sma50 && indicators.sma200) {
      if (currentPrice > indicators.sma20 && indicators.sma20 > indicators.sma50 && indicators.sma50 > indicators.sma200) {
        score += 0.2; // Strong bullish alignment
      } else if (currentPrice < indicators.sma20 && indicators.sma20 < indicators.sma50 && indicators.sma50 < indicators.sma200) {
        score -= 0.2; // Strong bearish alignment
      }
    }
    
    // EMA analysis
    if (indicators.ema12 && indicators.ema26) {
      if (indicators.ema12 > indicators.ema26) {
        score += 0.1; // Bullish EMA cross
      } else {
        score -= 0.1; // Bearish EMA cross
      }
    }
    
    // MACD analysis
    if (indicators.macd && indicators.macdSignal) {
      if (indicators.macd > 0 && indicators.macd > indicators.macdSignal) {
        score += 0.1; // Bullish MACD
      } else if (indicators.macd < 0 && indicators.macd < indicators.macdSignal) {
        score -= 0.1; // Bearish MACD
      }
    }
    
    // ADX strength adjustment
    if (indicators.adx) {
      const adxStrength = indicators.adx / 100;
      score = 0.5 + ((score - 0.5) * adxStrength); // Scale by trend strength
    }
    
    return Math.max(0, Math.min(1, score));
  }

  // Technical indicator calculations
  private calculateSMA(priceData: PriceBar[], period: number): number {
    if (priceData.length < period) return 0;
    
    const prices = priceData.slice(-period).map(bar => bar.close);
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  private calculateEMA(priceData: PriceBar[], period: number): number {
    if (priceData.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = priceData[0].close;
    
    for (let i = 1; i < priceData.length; i++) {
      ema = (priceData[i].close * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private calculateVWMA(priceData: PriceBar[], period: number): number {
    if (priceData.length < period) return 0;
    
    const recentData = priceData.slice(-period);
    let weightedSum = 0;
    let volumeSum = 0;
    
    for (const bar of recentData) {
      weightedSum += bar.close * bar.volume;
      volumeSum += bar.volume;
    }
    
    return volumeSum > 0 ? weightedSum / volumeSum : 0;
  }

  private calculateADX(priceData: PriceBar[], period: number): number {
    if (priceData.length < period + 1) return 0;
    
    // Simplified ADX calculation
    let totalTrueRange = 0;
    let totalDMPlus = 0;
    let totalDMMinus = 0;
    
    for (let i = 1; i < Math.min(priceData.length, period + 1); i++) {
      const current = priceData[i];
      const previous = priceData[i - 1];
      
      // True Range
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      totalTrueRange += tr;
      
      // Directional Movement
      const dmPlus = current.high - previous.high > previous.low - current.low ? 
        Math.max(0, current.high - previous.high) : 0;
      const dmMinus = previous.low - current.low > current.high - previous.high ? 
        Math.max(0, previous.low - current.low) : 0;
      
      totalDMPlus += dmPlus;
      totalDMMinus += dmMinus;
    }
    
    const diPlus = totalTrueRange > 0 ? (totalDMPlus / totalTrueRange) * 100 : 0;
    const diMinus = totalTrueRange > 0 ? (totalDMMinus / totalTrueRange) * 100 : 0;
    
    const dx = diPlus + diMinus > 0 ? Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100 : 0;
    
    return dx;
  }

  private calculateMACD(priceData: PriceBar[], fastPeriod: number, slowPeriod: number, signalPeriod: number): MACDResult {
    const fastEMA = this.calculateEMA(priceData, fastPeriod);
    const slowEMA = this.calculateEMA(priceData, slowPeriod);
    const macdLine = fastEMA - slowEMA;
    
    // Simplified signal line (would normally be EMA of MACD line)
    const signalLine = macdLine * 0.9; // Approximation
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram
    };
  }

  /**
   * Get price data for analysis
   */
  private async getPriceData(ticker: string, timeframe: string, periods: number): Promise<PriceBar[]> {
    // TODO: Integrate with actual market data service
    // This is a placeholder implementation
    
    const mockData: PriceBar[] = [];
    const basePrice = 100;
    
    for (let i = 0; i < periods; i++) {
      const trend = 0.001; // Slight uptrend
      const noise = (Math.random() - 0.5) * 0.02; // ±1% noise
      const price = basePrice * (1 + (trend * i) + noise);
      
      mockData.push({
        timestamp: new Date(Date.now() - (periods - i) * this.getTimeframeMs(timeframe)),
        open: price * 0.999,
        high: price * 1.005,
        low: price * 0.995,
        close: price,
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    return mockData;
  }

  /**
   * Get current market regime
   */
  private async getCurrentRegime(ticker: string): Promise<MarketRegime> {
    // TODO: Integrate with RegimeCompass
    return 'NEUTRAL'; // Placeholder
  }

  /**
   * Convert timeframe string to milliseconds
   */
  private getTimeframeMs(timeframe: string): number {
    const timeframeMs: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    
    return timeframeMs[timeframe] || 60 * 1000;
  }
}

// Supporting interfaces
export interface TrendCompositeResult {
  ticker: string;
  composite: number;
  strength: number;
  direction: TrendDirection;
  quality: number;
  timeframeBreakdown: Record<string, TimeframeTrend>;
  regimeAdjustment: number;
  timestamp: Date;
}

export interface TimeframeTrend {
  timeframe: string;
  score: number;
  direction: TrendDirection;
  strength: number;
  indicators: Record<string, number>;
}

export type TrendDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type MarketRegime = 'BULL' | 'BEAR' | 'NEUTRAL' | 'VOLATILE';

interface PriceBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}