import { EventEmitter } from 'events';

/**
 * Ribbon Alignment Engine - Moving average convergence analysis across timeframes
 * Provides sophisticated ribbon alignment measurement and trend strength assessment
 */
export class RibbonAlignmentEngine extends EventEmitter {
  private readonly RIBBON_PERIODS = [8, 13, 21, 34, 55, 89, 144]; // Fibonacci-based periods
  private readonly TIMEFRAMES = ['5m', '15m', '1h', '4h', '1d']; // Multiple timeframes for analysis
  
  private readonly ALIGNMENT_WEIGHTS = {
    PERFECT_ALIGNMENT: 1.0,
    STRONG_ALIGNMENT: 0.8,
    MODERATE_ALIGNMENT: 0.6,
    WEAK_ALIGNMENT: 0.4,
    NO_ALIGNMENT: 0.2,
    CONFLICTING: 0.0
  };

  private readonly RIBBON_TYPES = {
    EMA: 'EMA', // Exponential Moving Average
    SMA: 'SMA', // Simple Moving Average
    WMA: 'WMA', // Weighted Moving Average
    HULL: 'HULL' // Hull Moving Average
  };

  /**
   * Measure comprehensive ribbon alignment for a ticker
   */
  public async measureRibbonAlignment(ticker: string): Promise<RibbonAlignmentResult> {
    try {
      // Analyze ribbon alignment across multiple timeframes
      const timeframeAnalysis = await this.analyzeMultiTimeframeRibbons(ticker);
      
      // Calculate composite alignment score
      const compositeAlignment = this.calculateCompositeAlignment(timeframeAnalysis);
      
      // Determine ribbon strength and direction
      const ribbonStrength = this.calculateRibbonStrength(timeframeAnalysis);
      const ribbonDirection = this.determineRibbonDirection(timeframeAnalysis);
      
      // Analyze ribbon convergence/divergence patterns
      const convergenceAnalysis = this.analyzeRibbonConvergence(timeframeAnalysis);
      
      // Calculate ribbon momentum and acceleration
      const ribbonMomentum = this.calculateRibbonMomentum(timeframeAnalysis);
      
      // Assess ribbon quality and consistency
      const ribbonQuality = this.assessRibbonQuality(timeframeAnalysis);
      
      // Determine ribbon regime
      const ribbonRegime = this.determineRibbonRegime(compositeAlignment, ribbonStrength, convergenceAnalysis);
      
      // Calculate confidence based on alignment consistency
      const confidence = this.calculateAlignmentConfidence(timeframeAnalysis, ribbonQuality);

      const result: RibbonAlignmentResult = {
        ticker,
        compositeAlignment: Number(compositeAlignment.toFixed(3)),
        ribbonStrength: Number(ribbonStrength.toFixed(3)),
        ribbonDirection,
        ribbonQuality: Number(ribbonQuality.toFixed(3)),
        ribbonMomentum: Number(ribbonMomentum.toFixed(3)),
        timeframeAnalysis,
        convergenceAnalysis,
        ribbonRegime,
        confidence: Number(confidence.toFixed(3)),
        timestamp: new Date()
      };

      this.emit('ribbon:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error measuring ribbon alignment for ${ticker}:`, error);
      return this.getDefaultRibbonResult(ticker);
    }
  }

  /**
   * Analyze ribbon alignment across multiple timeframes
   */
  private async analyzeMultiTimeframeRibbons(ticker: string): Promise<Record<string, TimeframeRibbonAnalysis>> {
    const analysis: Record<string, TimeframeRibbonAnalysis> = {};
    
    for (const timeframe of this.TIMEFRAMES) {
      try {
        analysis[timeframe] = await this.analyzeSingleTimeframeRibbon(ticker, timeframe);
      } catch (error) {
        console.error(`Error analyzing ${timeframe} ribbon for ${ticker}:`, error);
        // Use neutral analysis for failed timeframes
        analysis[timeframe] = this.getDefaultTimeframeAnalysis(timeframe);
      }
    }
    
    return analysis;
  }

  /**
   * Analyze ribbon for a single timeframe
   */
  private async analyzeSingleTimeframeRibbon(ticker: string, timeframe: string): Promise<TimeframeRibbonAnalysis> {
    // Get price data for the timeframe
    const priceData = await this.getPriceData(ticker, timeframe, 200);
    
    if (priceData.length < Math.max(...this.RIBBON_PERIODS) + 10) {
      return this.getDefaultTimeframeAnalysis(timeframe);
    }

    // Calculate different types of moving averages
    const emaRibbon = this.calculateEMARibbon(priceData);
    const smaRibbon = this.calculateSMARibbon(priceData);
    const wmaRibbon = this.calculateWMARibbon(priceData);
    const hullRibbon = this.calculateHullRibbon(priceData);

    // Analyze alignment for each ribbon type
    const emaAlignment = this.analyzeRibbonAlignment(emaRibbon, priceData[priceData.length - 1].close);
    const smaAlignment = this.analyzeRibbonAlignment(smaRibbon, priceData[priceData.length - 1].close);
    const wmaAlignment = this.analyzeRibbonAlignment(wmaRibbon, priceData[priceData.length - 1].close);
    const hullAlignment = this.analyzeRibbonAlignment(hullRibbon, priceData[priceData.length - 1].close);

    // Calculate composite alignment for this timeframe
    const alignmentScore = this.calculateTimeframeAlignmentScore([
      emaAlignment, smaAlignment, wmaAlignment, hullAlignment
    ]);

    // Determine ribbon slope and trend strength
    const ribbonSlope = this.calculateRibbonSlope(emaRibbon);
    const trendStrength = this.calculateTrendStrength(emaRibbon, priceData);

    // Analyze ribbon spacing and compression
    const ribbonSpacing = this.analyzeRibbonSpacing(emaRibbon);
    const ribbonCompression = this.calculateRibbonCompression(emaRibbon);

    // Calculate ribbon momentum
    const momentum = this.calculateTimeframeMomentum(emaRibbon, priceData);

    return {
      timeframe,
      alignmentScore: Number(alignmentScore.toFixed(3)),
      ribbonSlope: Number(ribbonSlope.toFixed(6)),
      trendStrength: Number(trendStrength.toFixed(3)),
      ribbonSpacing: Number(ribbonSpacing.toFixed(3)),
      ribbonCompression: Number(ribbonCompression.toFixed(3)),
      momentum: Number(momentum.toFixed(3)),
      ribbons: {
        ema: emaRibbon,
        sma: smaRibbon,
        wma: wmaRibbon,
        hull: hullRibbon
      },
      alignments: {
        ema: emaAlignment,
        sma: smaAlignment,
        wma: wmaAlignment,
        hull: hullAlignment
      }
    };
  }

  /**
   * Calculate EMA ribbon
   */
  private calculateEMARibbon(priceData: PriceBar[]): MovingAverageRibbon {
    const ribbon: MovingAverageRibbon = {
      periods: this.RIBBON_PERIODS,
      values: {},
      currentPrice: priceData[priceData.length - 1].close
    };

    for (const period of this.RIBBON_PERIODS) {
      ribbon.values[period] = this.calculateEMA(priceData, period);
    }

    return ribbon;
  }

  /**
   * Calculate SMA ribbon
   */
  private calculateSMARibbon(priceData: PriceBar[]): MovingAverageRibbon {
    const ribbon: MovingAverageRibbon = {
      periods: this.RIBBON_PERIODS,
      values: {},
      currentPrice: priceData[priceData.length - 1].close
    };

    for (const period of this.RIBBON_PERIODS) {
      ribbon.values[period] = this.calculateSMA(priceData, period);
    }

    return ribbon;
  }

  /**
   * Calculate WMA ribbon
   */
  private calculateWMARibbon(priceData: PriceBar[]): MovingAverageRibbon {
    const ribbon: MovingAverageRibbon = {
      periods: this.RIBBON_PERIODS,
      values: {},
      currentPrice: priceData[priceData.length - 1].close
    };

    for (const period of this.RIBBON_PERIODS) {
      ribbon.values[period] = this.calculateWMA(priceData, period);
    }

    return ribbon;
  }

  /**
   * Calculate Hull MA ribbon
   */
  private calculateHullRibbon(priceData: PriceBar[]): MovingAverageRibbon {
    const ribbon: MovingAverageRibbon = {
      periods: this.RIBBON_PERIODS,
      values: {},
      currentPrice: priceData[priceData.length - 1].close
    };

    for (const period of this.RIBBON_PERIODS) {
      ribbon.values[period] = this.calculateHullMA(priceData, period);
    }

    return ribbon;
  }

  /**
   * Analyze ribbon alignment
   */
  private analyzeRibbonAlignment(ribbon: MovingAverageRibbon, currentPrice: number): RibbonAlignment {
    const maValues = this.RIBBON_PERIODS.map(period => ribbon.values[period]).filter(val => val > 0);
    
    if (maValues.length < 3) {
      return {
        type: 'NO_ALIGNMENT',
        strength: 0,
        direction: 'NEUTRAL',
        pricePosition: 'NEUTRAL'
      };
    }

    // Sort MA values to check alignment
    const sortedMAs = [...maValues].sort((a, b) => a - b);
    const isAscending = JSON.stringify(maValues) === JSON.stringify(sortedMAs);
    const isDescending = JSON.stringify(maValues) === JSON.stringify(sortedMAs.reverse());

    // Determine alignment type
    let alignmentType: AlignmentType;
    let strength: number;

    if (isAscending) {
      alignmentType = 'PERFECT_ALIGNMENT';
      strength = 1.0;
    } else if (isDescending) {
      alignmentType = 'PERFECT_ALIGNMENT';
      strength = 1.0;
    } else {
      // Calculate partial alignment
      const alignmentScore = this.calculatePartialAlignment(maValues);
      if (alignmentScore > 0.8) {
        alignmentType = 'STRONG_ALIGNMENT';
        strength = alignmentScore;
      } else if (alignmentScore > 0.6) {
        alignmentType = 'MODERATE_ALIGNMENT';
        strength = alignmentScore;
      } else if (alignmentScore > 0.4) {
        alignmentType = 'WEAK_ALIGNMENT';
        strength = alignmentScore;
      } else {
        alignmentType = 'NO_ALIGNMENT';
        strength = alignmentScore;
      }
    }

    // Determine direction
    const fastMA = maValues[0]; // Shortest period
    const slowMA = maValues[maValues.length - 1]; // Longest period
    const direction: RibbonDirection = fastMA > slowMA ? 'BULLISH' : fastMA < slowMA ? 'BEARISH' : 'NEUTRAL';

    // Determine price position relative to ribbon
    const avgMA = maValues.reduce((sum, val) => sum + val, 0) / maValues.length;
    let pricePosition: PricePosition;
    if (currentPrice > avgMA * 1.02) {
      pricePosition = 'ABOVE';
    } else if (currentPrice < avgMA * 0.98) {
      pricePosition = 'BELOW';
    } else {
      pricePosition = 'WITHIN';
    }

    return {
      type: alignmentType,
      strength,
      direction,
      pricePosition
    };
  }

  /**
   * Calculate partial alignment score
   */
  private calculatePartialAlignment(maValues: number[]): number {
    if (maValues.length < 2) return 0;

    let correctOrder = 0;
    let totalPairs = 0;

    // Check if shorter MAs are above longer MAs (bullish) or vice versa
    for (let i = 0; i < maValues.length - 1; i++) {
      for (let j = i + 1; j < maValues.length; j++) {
        totalPairs++;
        // For bullish alignment, shorter period MA should be above longer period MA
        if ((i < j && maValues[i] >= maValues[j]) || (i > j && maValues[i] <= maValues[j])) {
          correctOrder++;
        }
      }
    }

    return totalPairs > 0 ? correctOrder / totalPairs : 0;
  }

  /**
   * Calculate timeframe alignment score
   */
  private calculateTimeframeAlignmentScore(alignments: RibbonAlignment[]): number {
    const weights = [0.3, 0.25, 0.2, 0.25]; // EMA, SMA, WMA, Hull weights
    let weightedScore = 0;
    let totalWeight = 0;

    for (let i = 0; i < alignments.length && i < weights.length; i++) {
      const alignment = alignments[i];
      const weight = weights[i];
      const score = this.ALIGNMENT_WEIGHTS[alignment.type] * alignment.strength;
      
      weightedScore += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }

  /**
   * Calculate ribbon slope
   */
  private calculateRibbonSlope(ribbon: MovingAverageRibbon): number {
    const fastMA = ribbon.values[this.RIBBON_PERIODS[0]]; // 8 period
    const slowMA = ribbon.values[this.RIBBON_PERIODS[this.RIBBON_PERIODS.length - 1]]; // 144 period
    
    if (slowMA === 0) return 0;
    
    return (fastMA - slowMA) / slowMA;
  }

  /**
   * Calculate trend strength based on ribbon
   */
  private calculateTrendStrength(ribbon: MovingAverageRibbon, priceData: PriceBar[]): number {
    const currentPrice = priceData[priceData.length - 1].close;
    const maValues = this.RIBBON_PERIODS.map(period => ribbon.values[period]);
    
    // Calculate distance from price to ribbon center
    const ribbonCenter = maValues.reduce((sum, val) => sum + val, 0) / maValues.length;
    const priceDistance = Math.abs(currentPrice - ribbonCenter) / ribbonCenter;
    
    // Calculate ribbon spread (volatility indicator)
    const maxMA = Math.max(...maValues);
    const minMA = Math.min(...maValues);
    const ribbonSpread = (maxMA - minMA) / ribbonCenter;
    
    // Trend strength is higher when price is far from ribbon and ribbon is tight
    const strength = Math.min(1, priceDistance / (ribbonSpread + 0.01));
    
    return strength;
  }

  /**
   * Analyze ribbon spacing
   */
  private analyzeRibbonSpacing(ribbon: MovingAverageRibbon): number {
    const maValues = this.RIBBON_PERIODS.map(period => ribbon.values[period]);
    const avgMA = maValues.reduce((sum, val) => sum + val, 0) / maValues.length;
    
    // Calculate average spacing between consecutive MAs
    let totalSpacing = 0;
    for (let i = 0; i < maValues.length - 1; i++) {
      const spacing = Math.abs(maValues[i] - maValues[i + 1]) / avgMA;
      totalSpacing += spacing;
    }
    
    return totalSpacing / (maValues.length - 1);
  }

  /**
   * Calculate ribbon compression
   */
  private calculateRibbonCompression(ribbon: MovingAverageRibbon): number {
    const maValues = this.RIBBON_PERIODS.map(period => ribbon.values[period]);
    const maxMA = Math.max(...maValues);
    const minMA = Math.min(...maValues);
    const avgMA = maValues.reduce((sum, val) => sum + val, 0) / maValues.length;
    
    // Compression is the ratio of ribbon range to average value
    return (maxMA - minMA) / avgMA;
  }

  /**
   * Calculate timeframe momentum
   */
  private calculateTimeframeMomentum(ribbon: MovingAverageRibbon, priceData: PriceBar[]): number {
    if (priceData.length < 10) return 0;
    
    const currentPrice = priceData[priceData.length - 1].close;
    const pastPrice = priceData[priceData.length - 10].close;
    const fastMA = ribbon.values[this.RIBBON_PERIODS[0]];
    
    // Price momentum
    const priceMomentum = (currentPrice - pastPrice) / pastPrice;
    
    // MA momentum (how fast the fast MA is moving)
    const maMomentum = (currentPrice - fastMA) / fastMA;
    
    // Combined momentum
    return (priceMomentum + maMomentum) / 2;
  }

  /**
   * Calculate composite alignment across timeframes
   */
  private calculateCompositeAlignment(timeframeAnalysis: Record<string, TimeframeRibbonAnalysis>): number {
    const timeframeWeights = {
      '5m': 0.1,
      '15m': 0.15,
      '1h': 0.25,
      '4h': 0.3,
      '1d': 0.2
    };

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [timeframe, analysis] of Object.entries(timeframeAnalysis)) {
      const weight = timeframeWeights[timeframe as keyof typeof timeframeWeights] || 0.1;
      weightedSum += analysis.alignmentScore * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Calculate ribbon strength
   */
  private calculateRibbonStrength(timeframeAnalysis: Record<string, TimeframeRibbonAnalysis>): number {
    const strengths = Object.values(timeframeAnalysis).map(analysis => analysis.trendStrength);
    return strengths.reduce((sum, strength) => sum + strength, 0) / strengths.length;
  }

  /**
   * Determine ribbon direction
   */
  private determineRibbonDirection(timeframeAnalysis: Record<string, TimeframeRibbonAnalysis>): RibbonDirection {
    const directions = Object.values(timeframeAnalysis).map(analysis => {
      return analysis.alignments.ema.direction;
    });

    const bullishCount = directions.filter(dir => dir === 'BULLISH').length;
    const bearishCount = directions.filter(dir => dir === 'BEARISH').length;

    if (bullishCount > bearishCount) {
      return 'BULLISH';
    } else if (bearishCount > bullishCount) {
      return 'BEARISH';
    } else {
      return 'NEUTRAL';
    }
  }

  /**
   * Analyze ribbon convergence/divergence
   */
  private analyzeRibbonConvergence(timeframeAnalysis: Record<string, TimeframeRibbonAnalysis>): ConvergenceAnalysis {
    const compressions = Object.values(timeframeAnalysis).map(analysis => analysis.ribbonCompression);
    const avgCompression = compressions.reduce((sum, comp) => sum + comp, 0) / compressions.length;
    
    const spacings = Object.values(timeframeAnalysis).map(analysis => analysis.ribbonSpacing);
    const avgSpacing = spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length;

    let convergenceType: ConvergenceType;
    let strength: number;

    if (avgCompression < 0.02 && avgSpacing < 0.01) {
      convergenceType = 'STRONG_CONVERGENCE';
      strength = 1 - avgCompression;
    } else if (avgCompression < 0.05 && avgSpacing < 0.02) {
      convergenceType = 'MODERATE_CONVERGENCE';
      strength = 1 - (avgCompression * 2);
    } else if (avgCompression > 0.1 || avgSpacing > 0.05) {
      convergenceType = 'DIVERGENCE';
      strength = Math.min(1, avgCompression * 2);
    } else {
      convergenceType = 'NEUTRAL';
      strength = 0.5;
    }

    return {
      type: convergenceType,
      strength: Number(strength.toFixed(3)),
      compression: Number(avgCompression.toFixed(3)),
      spacing: Number(avgSpacing.toFixed(3))
    };
  }

  /**
   * Calculate ribbon momentum
   */
  private calculateRibbonMomentum(timeframeAnalysis: Record<string, TimeframeRibbonAnalysis>): number {
    const momentums = Object.values(timeframeAnalysis).map(analysis => analysis.momentum);
    return momentums.reduce((sum, momentum) => sum + momentum, 0) / momentums.length;
  }

  /**
   * Assess ribbon quality
   */
  private assessRibbonQuality(timeframeAnalysis: Record<string, TimeframeRibbonAnalysis>): number {
    let qualityScore = 0;
    const analyses = Object.values(timeframeAnalysis);

    // Quality based on alignment consistency across timeframes
    const alignmentScores = analyses.map(analysis => analysis.alignmentScore);
    const alignmentConsistency = 1 - this.calculateStandardDeviation(alignmentScores);
    qualityScore += alignmentConsistency * 0.4;

    // Quality based on trend strength consistency
    const trendStrengths = analyses.map(analysis => analysis.trendStrength);
    const strengthConsistency = 1 - this.calculateStandardDeviation(trendStrengths);
    qualityScore += strengthConsistency * 0.3;

    // Quality based on momentum consistency
    const momentums = analyses.map(analysis => analysis.momentum);
    const momentumConsistency = 1 - this.calculateStandardDeviation(momentums);
    qualityScore += momentumConsistency * 0.3;

    return Math.max(0, Math.min(1, qualityScore));
  }

  /**
   * Determine ribbon regime
   */
  private determineRibbonRegime(
    alignment: number, 
    strength: number, 
    convergence: ConvergenceAnalysis
  ): RibbonRegime {
    if (convergence.type === 'STRONG_CONVERGENCE' && strength < 0.3) {
      return 'COMPRESSION';
    } else if (convergence.type === 'DIVERGENCE' && strength > 0.7) {
      return 'EXPANSION';
    } else if (alignment > 0.8 && strength > 0.6) {
      return 'STRONG_TREND';
    } else if (alignment > 0.6 && strength > 0.4) {
      return 'MODERATE_TREND';
    } else if (alignment < 0.4 || strength < 0.3) {
      return 'CHOPPY';
    } else {
      return 'TRANSITIONAL';
    }
  }

  /**
   * Calculate alignment confidence
   */
  private calculateAlignmentConfidence(
    timeframeAnalysis: Record<string, TimeframeRibbonAnalysis>,
    quality: number
  ): number {
    let confidence = 0.5;

    // Boost confidence for consistent alignment across timeframes
    const alignmentScores = Object.values(timeframeAnalysis).map(analysis => analysis.alignmentScore);
    const avgAlignment = alignmentScores.reduce((sum, score) => sum + score, 0) / alignmentScores.length;
    confidence += avgAlignment * 0.3;

    // Boost confidence for high quality
    confidence += quality * 0.2;

    // Boost confidence for strong trend strength
    const trendStrengths = Object.values(timeframeAnalysis).map(analysis => analysis.trendStrength);
    const avgStrength = trendStrengths.reduce((sum, strength) => sum + strength, 0) / trendStrengths.length;
    confidence += avgStrength * 0.2;

    return Math.max(0.2, Math.min(1, confidence));
  }

  // Technical indicator calculations
  private calculateEMA(priceData: PriceBar[], period: number): number {
    if (priceData.length < period) return 0;

    const multiplier = 2 / (period + 1);
    let ema = priceData[0].close;

    for (let i = 1; i < priceData.length; i++) {
      ema = (priceData[i].close * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateSMA(priceData: PriceBar[], period: number): number {
    if (priceData.length < period) return 0;

    const prices = priceData.slice(-period).map(bar => bar.close);
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  private calculateWMA(priceData: PriceBar[], period: number): number {
    if (priceData.length < period) return 0;

    const prices = priceData.slice(-period).map(bar => bar.close);
    let weightedSum = 0;
    let weightSum = 0;

    for (let i = 0; i < prices.length; i++) {
      const weight = i + 1;
      weightedSum += prices[i] * weight;
      weightSum += weight;
    }

    return weightSum > 0 ? weightedSum / weightSum : 0;
  }

  private calculateHullMA(priceData: PriceBar[], period: number): number {
    if (priceData.length < period) return 0;

    // Hull MA = WMA(2 * WMA(n/2) - WMA(n), sqrt(n))
    const halfPeriod = Math.floor(period / 2);
    const sqrtPeriod = Math.floor(Math.sqrt(period));

    const wmaHalf = this.calculateWMA(priceData, halfPeriod);
    const wmaFull = this.calculateWMA(priceData, period);
    const hullValue = 2 * wmaHalf - wmaFull;

    // Create synthetic data for final WMA calculation
    const syntheticData = priceData.slice(-sqrtPeriod).map((bar, index) => ({
      ...bar,
      close: index === sqrtPeriod - 1 ? hullValue : bar.close
    }));

    return this.calculateWMA(syntheticData, sqrtPeriod);
  }

  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  // Utility methods
  private async getPriceData(ticker: string, timeframe: string, periods: number): Promise<PriceBar[]> {
    // TODO: Integrate with actual market data service
    // Mock data generation for demonstration
    const mockData: PriceBar[] = [];
    const basePrice = 100;
    let currentPrice = basePrice;

    for (let i = 0; i < periods; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% random change
      currentPrice *= (1 + change);

      const high = currentPrice * (1 + Math.random() * 0.01);
      const low = currentPrice * (1 - Math.random() * 0.01);

      mockData.push({
        timestamp: new Date(Date.now() - (periods - i) * this.getTimeframeMs(timeframe)),
        open: i === 0 ? basePrice : mockData[i - 1].close,
        high,
        low,
        close: currentPrice,
        volume: Math.floor(Math.random() * 1000000)
      });
    }

    return mockData;
  }

  private getTimeframeMs(timeframe: string): number {
    const timeframeMs: Record<string, number> = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };

    return timeframeMs[timeframe] || 60 * 1000;
  }

  private getDefaultTimeframeAnalysis(timeframe: string): TimeframeRibbonAnalysis {
    const defaultRibbon: MovingAverageRibbon = {
      periods: this.RIBBON_PERIODS,
      values: {},
      currentPrice: 100
    };

    // Initialize with neutral values
    for (const period of this.RIBBON_PERIODS) {
      defaultRibbon.values[period] = 100;
    }

    const defaultAlignment: RibbonAlignment = {
      type: 'NO_ALIGNMENT',
      strength: 0,
      direction: 'NEUTRAL',
      pricePosition: 'NEUTRAL'
    };

    return {
      timeframe,
      alignmentScore: 0.5,
      ribbonSlope: 0,
      trendStrength: 0.3,
      ribbonSpacing: 0.02,
      ribbonCompression: 0.05,
      momentum: 0,
      ribbons: {
        ema: defaultRibbon,
        sma: defaultRibbon,
        wma: defaultRibbon,
        hull: defaultRibbon
      },
      alignments: {
        ema: defaultAlignment,
        sma: defaultAlignment,
        wma: defaultAlignment,
        hull: defaultAlignment
      }
    };
  }

  private getDefaultRibbonResult(ticker: string): RibbonAlignmentResult {
    return {
      ticker,
      compositeAlignment: 0.5,
      ribbonStrength: 0.3,
      ribbonDirection: 'NEUTRAL',
      ribbonQuality: 0.3,
      ribbonMomentum: 0,
      timeframeAnalysis: {},
      convergenceAnalysis: {
        type: 'NEUTRAL',
        strength: 0.5,
        compression: 0.05,
        spacing: 0.02
      },
      ribbonRegime: 'TRANSITIONAL',
      confidence: 0.3,
      timestamp: new Date()
    };
  }
}

// Supporting interfaces and types
export interface RibbonAlignmentResult {
  ticker: string;
  compositeAlignment: number;
  ribbonStrength: number;
  ribbonDirection: RibbonDirection;
  ribbonQuality: number;
  ribbonMomentum: number;
  timeframeAnalysis: Record<string, TimeframeRibbonAnalysis>;
  convergenceAnalysis: ConvergenceAnalysis;
  ribbonRegime: RibbonRegime;
  confidence: number;
  timestamp: Date;
}

export interface TimeframeRibbonAnalysis {
  timeframe: string;
  alignmentScore: number;
  ribbonSlope: number;
  trendStrength: number;
  ribbonSpacing: number;
  ribbonCompression: number;
  momentum: number;
  ribbons: {
    ema: MovingAverageRibbon;
    sma: MovingAverageRibbon;
    wma: MovingAverageRibbon;
    hull: MovingAverageRibbon;
  };
  alignments: {
    ema: RibbonAlignment;
    sma: RibbonAlignment;
    wma: RibbonAlignment;
    hull: RibbonAlignment;
  };
}

export interface MovingAverageRibbon {
  periods: number[];
  values: Record<number, number>;
  currentPrice: number;
}

export interface RibbonAlignment {
  type: AlignmentType;
  strength: number;
  direction: RibbonDirection;
  pricePosition: PricePosition;
}

export interface ConvergenceAnalysis {
  type: ConvergenceType;
  strength: number;
  compression: number;
  spacing: number;
}

export type AlignmentType = 'PERFECT_ALIGNMENT' | 'STRONG_ALIGNMENT' | 'MODERATE_ALIGNMENT' | 'WEAK_ALIGNMENT' | 'NO_ALIGNMENT' | 'CONFLICTING';
export type RibbonDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type PricePosition = 'ABOVE' | 'BELOW' | 'WITHIN' | 'NEUTRAL';
export type ConvergenceType = 'STRONG_CONVERGENCE' | 'MODERATE_CONVERGENCE' | 'NEUTRAL' | 'DIVERGENCE';
export type RibbonRegime = 'STRONG_TREND' | 'MODERATE_TREND' | 'COMPRESSION' | 'EXPANSION' | 'CHOPPY' | 'TRANSITIONAL';

interface PriceBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}