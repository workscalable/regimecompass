import { FibZone } from '../types/core.js';
import { EventEmitter } from 'events';

/**
 * Fibonacci Expansion Engine - Comprehensive Fibonacci expansion analysis with zone classification
 * Implements zone classification (COMPRESSION, MID_EXPANSION, FULL_EXPANSION, OVER_EXTENSION, EXHAUSTION)
 * with expansion level calculation and target identification
 */
export class FibExpansionEngine extends EventEmitter {
  // Standard Fibonacci ratios for expansion analysis
  private readonly FIBONACCI_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.414, 1.618, 2.0, 2.618, 3.618, 4.236];
  
  // Zone classification thresholds based on expansion levels
  private readonly ZONE_THRESHOLDS = {
    COMPRESSION: { min: 0, max: 0.618 },
    MID_EXPANSION: { min: 0.618, max: 1.272 },
    FULL_EXPANSION: { min: 1.272, max: 1.618 },
    OVER_EXTENSION: { min: 1.618, max: 2.618 },
    EXHAUSTION: { min: 2.618, max: Infinity }
  };
  
  // Zone-specific multipliers for position sizing and risk management
  private readonly ZONE_MULTIPLIERS: Record<FibZone, number> = {
    'COMPRESSION': 1.2,    // Boost confidence in compression zones
    'MID_EXPANSION': 1.0,  // Neutral multiplier
    'FULL_EXPANSION': 0.8, // Reduce confidence as extension increases
    'OVER_EXTENSION': 0.5, // Significant reduction in over-extension
    'EXHAUSTION': 0.0      // No positions in exhaustion zones
  };

  // Zone characteristics for analysis
  private readonly ZONE_CHARACTERISTICS = {
    'COMPRESSION': {
      description: 'Price consolidating near Fibonacci support/resistance',
      riskLevel: 'LOW',
      breakoutPotential: 'HIGH',
      recommendedAction: 'ACCUMULATE'
    },
    'MID_EXPANSION': {
      description: 'Price in normal expansion range',
      riskLevel: 'MODERATE',
      breakoutPotential: 'MODERATE',
      recommendedAction: 'HOLD'
    },
    'FULL_EXPANSION': {
      description: 'Price approaching full Fibonacci extension',
      riskLevel: 'MODERATE_HIGH',
      breakoutPotential: 'LOW',
      recommendedAction: 'REDUCE'
    },
    'OVER_EXTENSION': {
      description: 'Price significantly extended beyond normal levels',
      riskLevel: 'HIGH',
      breakoutPotential: 'VERY_LOW',
      recommendedAction: 'EXIT'
    },
    'EXHAUSTION': {
      description: 'Price in extreme exhaustion zone - high reversal risk',
      riskLevel: 'EXTREME',
      breakoutPotential: 'NONE',
      recommendedAction: 'AVOID'
    }
  };

  /**
   * Analyze comprehensive Fibonacci expansion with zone classification
   * Implements zone classification (COMPRESSION, MID_EXPANSION, FULL_EXPANSION, OVER_EXTENSION, EXHAUSTION)
   */
  public async analyzeExpansion(ticker: string, timeframe: string = '1D'): Promise<FibonacciAnalysis> {
    try {
      // Get comprehensive price data for analysis
      const priceData = await this.getPriceData(ticker, timeframe, 200);
      
      // Find multiple swing points for comprehensive analysis
      const swingPoints = this.findSignificantSwingPoints(priceData);
      const currentPrice = priceData[priceData.length - 1].close;
      
      // Analyze expansion for each swing point and find the most relevant
      const expansionAnalyses = swingPoints.map(swing => 
        this.analyzeSwingExpansion(swing, currentPrice)
      );
      
      // Select the most relevant expansion (closest to current price action)
      const primaryExpansion = this.selectPrimaryExpansion(expansionAnalyses, currentPrice);
      
      // Calculate comprehensive expansion level
      const expansionLevel = this.calculateExpansionLevel(
        primaryExpansion.swingHigh, 
        primaryExpansion.swingLow, 
        currentPrice
      );
      
      // Determine current zone with enhanced logic
      const currentZone = this.determineZoneWithConfidence(expansionLevel, primaryExpansion);
      
      // Calculate all Fibonacci levels for the primary swing
      const fibonacciLevels = this.calculateComprehensiveFibonacciLevels(
        primaryExpansion.swingHigh, 
        primaryExpansion.swingLow
      );
      
      // Identify key levels with strength analysis
      const keyLevels = this.identifyKeyLevelsWithStrength(fibonacciLevels, priceData, currentPrice);
      
      // Assess confluence at current price and nearby levels
      const confluence = this.assessMultiLevelConfluence(currentPrice, keyLevels, priceData);
      
      // Calculate zone-specific metrics
      const zoneMetrics = this.calculateZoneMetrics(currentZone, expansionLevel, primaryExpansion);
      
      // Generate expansion targets
      const expansionTargets = this.generateExpansionTargets(
        primaryExpansion.swingHigh, 
        primaryExpansion.swingLow, 
        currentZone
      );
      
      // Track expansion momentum and velocity
      const expansionTracking = this.trackExpansionMomentum(priceData, primaryExpansion);
      
      const result: FibonacciAnalysis = {
        ticker,
        timeframe,
        currentZone,
        expansionLevel: Number(expansionLevel.toFixed(4)),
        zoneConfidence: zoneMetrics.confidence,
        primarySwing: primaryExpansion,
        fibonacciLevels,
        keyLevels,
        confluence: Number(confluence.toFixed(3)),
        zoneMultiplier: this.ZONE_MULTIPLIERS[currentZone],
        riskAdjustment: this.applyZoneRiskAdjustment(currentZone),
        zoneCharacteristics: this.ZONE_CHARACTERISTICS[currentZone],
        expansionTargets,
        expansionTracking,
        timestamp: new Date()
      };

      this.emit('expansion:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error analyzing Fibonacci expansion for ${ticker}:`, error);
      return this.getDefaultExpansionAnalysis(ticker, timeframe);
    }
  }

  /**
   * Calculate zone multiplier for position sizing adjustments
   * Returns multiplier based on current Fibonacci zone for position sizing
   */
  public calculateZoneMultiplier(zone: FibZone): number {
    return this.ZONE_MULTIPLIERS[zone];
  }

  /**
   * Calculate comprehensive zone multiplier with additional factors
   */
  public calculateAdvancedZoneMultiplier(
    zone: FibZone, 
    expansionLevel: number, 
    confluence: number, 
    zoneConfidence: number
  ): ZoneMultiplierResult {
    // Base multiplier from zone
    const baseMultiplier = this.ZONE_MULTIPLIERS[zone];
    
    // Confluence adjustment (higher confluence = higher multiplier)
    const confluenceAdjustment = 1 + ((confluence - 0.5) * 0.3); // ±15% adjustment
    
    // Zone confidence adjustment
    const confidenceAdjustment = 1 + ((zoneConfidence - 0.5) * 0.2); // ±10% adjustment
    
    // Expansion level fine-tuning within zone
    const expansionAdjustment = this.calculateExpansionLevelAdjustment(zone, expansionLevel);
    
    // Calculate final multiplier
    const finalMultiplier = Math.max(0, 
      baseMultiplier * confluenceAdjustment * confidenceAdjustment * expansionAdjustment
    );
    
    return {
      baseMultiplier,
      confluenceAdjustment: Number(confluenceAdjustment.toFixed(3)),
      confidenceAdjustment: Number(confidenceAdjustment.toFixed(3)),
      expansionAdjustment: Number(expansionAdjustment.toFixed(3)),
      finalMultiplier: Number(finalMultiplier.toFixed(3)),
      zone,
      reasoning: this.generateMultiplierReasoning(zone, confluence, zoneConfidence, expansionLevel)
    };
  }

  /**
   * Apply zone-specific risk adjustments for stop loss and profit target modifications
   */
  public applyZoneRiskAdjustment(
    zone: FibZone, 
    baseStopLoss: number, 
    baseProfitTarget: number, 
    currentPrice: number,
    keyLevels?: KeyLevelWithStrength[]
  ): ZoneRiskAdjustment {
    const zoneRiskProfile = this.getZoneRiskProfile(zone);
    
    // Calculate adjusted stop loss
    const stopLossAdjustment = this.calculateStopLossAdjustment(zone, currentPrice, keyLevels);
    const adjustedStopLoss = baseStopLoss * stopLossAdjustment.multiplier;
    
    // Calculate adjusted profit targets
    const profitTargetAdjustment = this.calculateProfitTargetAdjustment(zone, currentPrice, keyLevels);
    const adjustedProfitTarget = baseProfitTarget * profitTargetAdjustment.multiplier;
    
    // Calculate risk-reward ratio adjustment
    const riskRewardAdjustment = this.calculateRiskRewardAdjustment(zone, adjustedStopLoss, adjustedProfitTarget, currentPrice);
    
    return {
      zone,
      riskProfile: zoneRiskProfile,
      stopLossAdjustment: {
        original: baseStopLoss,
        adjusted: Number(adjustedStopLoss.toFixed(2)),
        multiplier: stopLossAdjustment.multiplier,
        reasoning: stopLossAdjustment.reasoning
      },
      profitTargetAdjustment: {
        original: baseProfitTarget,
        adjusted: Number(adjustedProfitTarget.toFixed(2)),
        multiplier: profitTargetAdjustment.multiplier,
        reasoning: profitTargetAdjustment.reasoning
      },
      riskRewardRatio: riskRewardAdjustment,
      recommendedHoldTime: this.getRecommendedHoldTime(zone),
      exitStrategy: this.generateZoneExitStrategy(zone, adjustedStopLoss, adjustedProfitTarget)
    };
  }

  /**
   * Implement zone-based trade filtering and execution rules
   */
  public applyZoneTradeFiltering(
    zone: FibZone, 
    signalStrength: number, 
    confidence: number, 
    marketConditions: MarketConditions
  ): TradeFilteringResult {
    const zoneRules = this.getZoneTradeRules(zone);
    const filterResults: FilterResult[] = [];
    
    // Apply zone-specific filters
    
    // 1. Zone Allowance Filter
    const zoneAllowed = this.checkZoneAllowance(zone);
    filterResults.push({
      filterName: 'Zone Allowance',
      passed: zoneAllowed.allowed,
      reason: zoneAllowed.reason,
      impact: zoneAllowed.allowed ? 'NONE' : 'BLOCK_TRADE'
    });
    
    // 2. Minimum Confidence Filter
    const minConfidenceRequired = zoneRules.minConfidence;
    const confidencePassed = confidence >= minConfidenceRequired;
    filterResults.push({
      filterName: 'Minimum Confidence',
      passed: confidencePassed,
      reason: `Requires ${minConfidenceRequired}, got ${confidence}`,
      impact: confidencePassed ? 'NONE' : 'REDUCE_SIZE'
    });
    
    // 3. Signal Strength Filter
    const minStrengthRequired = zoneRules.minSignalStrength;
    const strengthPassed = signalStrength >= minStrengthRequired;
    filterResults.push({
      filterName: 'Signal Strength',
      passed: strengthPassed,
      reason: `Requires ${minStrengthRequired}, got ${signalStrength}`,
      impact: strengthPassed ? 'NONE' : 'REDUCE_SIZE'
    });
    
    // 4. Market Condition Filter
    const marketConditionFilter = this.checkMarketConditionCompatibility(zone, marketConditions);
    filterResults.push({
      filterName: 'Market Conditions',
      passed: marketConditionFilter.compatible,
      reason: marketConditionFilter.reason,
      impact: marketConditionFilter.compatible ? 'NONE' : 'MODIFY_STRATEGY'
    });
    
    // 5. Time-based Filter
    const timeFilter = this.checkTimeBasedRestrictions(zone);
    filterResults.push({
      filterName: 'Time Restrictions',
      passed: timeFilter.allowed,
      reason: timeFilter.reason,
      impact: timeFilter.allowed ? 'NONE' : 'DELAY_ENTRY'
    });
    
    // Determine overall trade decision
    const tradeDecision = this.determineTradeDecision(filterResults, zone);
    
    // Calculate adjusted position size
    const adjustedPositionSize = this.calculateAdjustedPositionSize(
      filterResults, 
      zone, 
      confidence, 
      signalStrength
    );
    
    return {
      zone,
      tradeAllowed: tradeDecision.allowed,
      tradeDecision: tradeDecision.decision,
      adjustedPositionSize: Number(adjustedPositionSize.toFixed(3)),
      filterResults,
      executionRules: this.generateExecutionRules(zone, tradeDecision, filterResults),
      riskManagementRules: this.generateRiskManagementRules(zone, adjustedPositionSize),
      reasoning: tradeDecision.reasoning
    };
  }

  /**
   * Comprehensive key level identification system with multi-timeframe analysis
   * Implements support, resistance, and target level detection with strength calculation
   */
  public async identifyKeyLevels(ticker: string, lookbackPeriod: number = 200): Promise<KeyLevelIdentificationResult> {
    try {
      // Get multi-timeframe price data for comprehensive analysis
      const timeframes = ['1D', '4H', '1H', '15M'];
      const multiTimeframeData = await this.getMultiTimeframePriceData(ticker, timeframes, lookbackPeriod);
      
      // Identify key levels across all timeframes
      const multiTimeframeLevels = await this.identifyMultiTimeframeLevels(multiTimeframeData);
      
      // Calculate level strength based on historical price action
      const levelsWithStrength = this.calculateLevelStrengths(multiTimeframeLevels, multiTimeframeData);
      
      // Perform multi-timeframe confluence analysis
      const confluenceAnalysis = this.performMultiTimeframeConfluence(levelsWithStrength);
      
      // Classify levels as support, resistance, or targets
      const classifiedLevels = this.classifyLevelTypes(levelsWithStrength, multiTimeframeData['1D']);
      
      // Rank levels by overall significance
      const rankedLevels = this.rankLevelsBySignificance(classifiedLevels);
      
      // Generate level clusters for confluence zones
      const levelClusters = this.generateLevelClusters(rankedLevels);
      
      // Calculate dynamic level zones
      const dynamicZones = this.calculateDynamicLevelZones(rankedLevels, multiTimeframeData['1D']);
      
      const result: KeyLevelIdentificationResult = {
        ticker,
        keyLevels: rankedLevels.slice(0, 20), // Top 20 most significant levels
        confluenceAnalysis,
        levelClusters,
        dynamicZones,
        multiTimeframeBreakdown: this.generateTimeframeBreakdown(multiTimeframeLevels),
        strengthMetrics: this.calculateOverallStrengthMetrics(rankedLevels),
        timestamp: new Date()
      };

      this.emit('key-levels:identified', result);
      return result;

    } catch (error) {
      console.error(`Error identifying key levels for ${ticker}:`, error);
      return this.getDefaultKeyLevelResult(ticker);
    }
  }

  /**
   * Legacy method for backward compatibility - now enhanced
   */
  private async identifyKeyLevelsLegacy(ticker: string, lookbackPeriod: number): Promise<FibLevel[]> {
    try {
      const priceData = await this.getPriceData(ticker, '1D', lookbackPeriod);
      const levels: FibLevel[] = [];
      
      // Find significant swing points
      const swingPoints = this.findSwingPoints(priceData);
      
      // Calculate Fibonacci levels for each swing
      for (const swing of swingPoints) {
        const fibLevels = this.calculateFibonacciLevels(swing.high, swing.low);
        
        for (const ratio of this.FIBONACCI_RATIOS) {
          const level = fibLevels[ratio];
          const strength = this.calculateLevelStrength(level, priceData);
          
          levels.push({
            level,
            type: this.determineLevelType(level, swing.high, swing.low),
            strength,
            timeframe: '1D'
          });
        }
      }
      
      // Sort by strength and return top levels
      return levels
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 20); // Top 20 levels
        
    } catch (error) {
      console.error(`Error identifying key levels for ${ticker}:`, error);
      return [];
    }
  }

  /**
   * Assess confluence at current price
   */
  public assessConfluence(price: number, levels: FibLevel[]): number {
    const proximityThreshold = price * 0.01; // 1% threshold
    let confluenceScore = 0;
    
    for (const level of levels) {
      const distance = Math.abs(price - level.level);
      
      if (distance <= proximityThreshold) {
        // Weight by level strength and proximity
        const proximityWeight = 1 - (distance / proximityThreshold);
        confluenceScore += level.strength * proximityWeight;
      }
    }
    
    // Normalize to 0-1 range
    return Math.min(1, confluenceScore / 3); // Assuming max 3 strong levels
  }

  /**
   * Calculate expansion level based on price movement
   */
  private calculateExpansionLevel(high: number, low: number, current: number): number {
    const range = high - low;
    if (range === 0) return 1.0;
    
    // Calculate how far current price has moved from the low
    const moveFromLow = current - low;
    
    // Express as multiple of the original range
    return moveFromLow / range;
  }

  /**
   * Determine Fibonacci zone based on expansion level
   */
  private determineZone(expansionLevel: number): FibZone {
    if (expansionLevel < 0.5) {
      return 'COMPRESSION';
    } else if (expansionLevel < 1.0) {
      return 'MID_EXPANSION';
    } else if (expansionLevel < 1.618) {
      return 'FULL_EXPANSION';
    } else if (expansionLevel < 2.618) {
      return 'OVER_EXTENSION';
    } else {
      return 'EXHAUSTION';
    }
  }

  /**
   * Apply zone-specific risk adjustment
   */
  private applyZoneRiskAdjustment(zone: FibZone): number {
    const riskAdjustments: Record<FibZone, number> = {
      'COMPRESSION': 0.03,   // Bonus for compression
      'MID_EXPANSION': 0.0,  // Neutral
      'FULL_EXPANSION': -0.02, // Slight penalty
      'OVER_EXTENSION': -0.05, // Penalty for overextension
      'EXHAUSTION': -0.10     // Strong penalty for exhaustion
    };
    
    return riskAdjustments[zone];
  }

  /**
   * Get price data for analysis
   */
  private async getPriceData(ticker: string, timeframe: string, periods: number = 200): Promise<PriceBar[]> {
    // TODO: Integrate with market data service
    // This is a placeholder implementation
    
    const mockData: PriceBar[] = [];
    const basePrice = 100;
    
    for (let i = 0; i < periods; i++) {
      const randomChange = (Math.random() - 0.5) * 0.04; // ±2% random change
      const price = basePrice * (1 + randomChange * i / periods);
      
      mockData.push({
        timestamp: new Date(Date.now() - (periods - i) * 24 * 60 * 60 * 1000),
        open: price * 0.99,
        high: price * 1.02,
        low: price * 0.98,
        close: price,
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    return mockData;
  }

  /**
   * Find swing high in price data
   */
  private findSwingHigh(priceData: PriceBar[]): number {
    return Math.max(...priceData.slice(-50).map(bar => bar.high)); // Last 50 periods
  }

  /**
   * Find swing low in price data
   */
  private findSwingLow(priceData: PriceBar[]): number {
    return Math.min(...priceData.slice(-50).map(bar => bar.low)); // Last 50 periods
  }

  /**
   * Find significant swing points
   */
  private findSwingPoints(priceData: PriceBar[]): SwingPoint[] {
    const swingPoints: SwingPoint[] = [];
    const lookback = 10;
    
    for (let i = lookback; i < priceData.length - lookback; i++) {
      const current = priceData[i];
      const isSwingHigh = this.isSwingHigh(priceData, i, lookback);
      const isSwingLow = this.isSwingLow(priceData, i, lookback);
      
      if (isSwingHigh || isSwingLow) {
        // Find corresponding swing point
        let correspondingPoint: PriceBar | null = null;
        
        if (isSwingHigh) {
          // Find recent swing low
          for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
            if (this.isSwingLow(priceData, j, lookback)) {
              correspondingPoint = priceData[j];
              break;
            }
          }
        } else {
          // Find recent swing high
          for (let j = i - 1; j >= Math.max(0, i - 50); j--) {
            if (this.isSwingHigh(priceData, j, lookback)) {
              correspondingPoint = priceData[j];
              break;
            }
          }
        }
        
        if (correspondingPoint) {
          swingPoints.push({
            high: Math.max(current.high, correspondingPoint.high),
            low: Math.min(current.low, correspondingPoint.low),
            timestamp: current.timestamp
          });
        }
      }
    }
    
    return swingPoints.slice(-10); // Return last 10 swing points
  }

  /**
   * Check if index is a swing high
   */
  private isSwingHigh(priceData: PriceBar[], index: number, lookback: number): boolean {
    const current = priceData[index].high;
    
    for (let i = index - lookback; i <= index + lookback; i++) {
      if (i !== index && i >= 0 && i < priceData.length) {
        if (priceData[i].high >= current) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check if index is a swing low
   */
  private isSwingLow(priceData: PriceBar[], index: number, lookback: number): boolean {
    const current = priceData[index].low;
    
    for (let i = index - lookback; i <= index + lookback; i++) {
      if (i !== index && i >= 0 && i < priceData.length) {
        if (priceData[i].low <= current) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Calculate Fibonacci levels between high and low
   */
  private calculateFibonacciLevels(high: number, low: number): Record<number, number> {
    const range = high - low;
    const levels: Record<number, number> = {};
    
    for (const ratio of this.FIBONACCI_RATIOS) {
      levels[ratio] = low + (range * ratio);
    }
    
    return levels;
  }

  /**
   * Calculate strength of a Fibonacci level
   */
  private calculateLevelStrength(level: number, priceData: PriceBar[]): number {
    let touches = 0;
    let bounces = 0;
    const threshold = level * 0.005; // 0.5% threshold
    
    for (let i = 1; i < priceData.length; i++) {
      const current = priceData[i];
      const previous = priceData[i - 1];
      
      // Check if price touched the level
      if (Math.abs(current.low - level) <= threshold || Math.abs(current.high - level) <= threshold) {
        touches++;
        
        // Check if it bounced
        if (i < priceData.length - 1) {
          const next = priceData[i + 1];
          if ((current.low <= level && next.close > level) || (current.high >= level && next.close < level)) {
            bounces++;
          }
        }
      }
    }
    
    // Strength based on touches and bounce rate
    const bounceRate = touches > 0 ? bounces / touches : 0;
    return Math.min(1, (touches * 0.1) + (bounceRate * 0.5));
  }

  /**
   * Determine level type based on position relative to swing points
   */
  private determineLevelType(level: number, high: number, low: number): 'SUPPORT' | 'RESISTANCE' | 'TARGET' {
    const midpoint = (high + low) / 2;
    
    if (level < midpoint) {
      return 'SUPPORT';
    } else if (level > high) {
      return 'TARGET';
    } else {
      return 'RESISTANCE';
    }
  }
}

  /**
   * Find significant swing points for comprehensive analysis
   */
  private findSignificantSwingPoints(priceData: PriceBar[]): SwingPoint[] {
    const swingPoints: SwingPoint[] = [];
    const lookback = 10;
    const minSwingSize = 0.02; // Minimum 2% swing size
    
    for (let i = lookback; i < priceData.length - lookback; i++) {
      const current = priceData[i];
      
      if (this.isSwingHigh(priceData, i, lookback)) {
        // Find corresponding swing low
        const correspondingLow = this.findCorrespondingSwingLow(priceData, i, lookback);
        if (correspondingLow && this.isSignificantSwing(current.high, correspondingLow.low, minSwingSize)) {
          swingPoints.push({
            swingHigh: current.high,
            swingLow: correspondingLow.low,
            highTimestamp: current.timestamp,
            lowTimestamp: correspondingLow.timestamp,
            swingSize: (current.high - correspondingLow.low) / correspondingLow.low,
            direction: 'BULLISH'
          });
        }
      }
      
      if (this.isSwingLow(priceData, i, lookback)) {
        // Find corresponding swing high
        const correspondingHigh = this.findCorrespondingSwingHigh(priceData, i, lookback);
        if (correspondingHigh && this.isSignificantSwing(correspondingHigh.high, current.low, minSwingSize)) {
          swingPoints.push({
            swingHigh: correspondingHigh.high,
            swingLow: current.low,
            highTimestamp: correspondingHigh.timestamp,
            lowTimestamp: current.timestamp,
            swingSize: (correspondingHigh.high - current.low) / current.low,
            direction: 'BEARISH'
          });
        }
      }
    }
    
    // Sort by recency and significance
    return swingPoints
      .sort((a, b) => b.swingSize - a.swingSize) // Sort by swing size
      .slice(0, 5); // Take top 5 most significant swings
  }

  /**
   * Analyze expansion for a specific swing point
   */
  private analyzeSwingExpansion(swing: SwingPoint, currentPrice: number): SwingExpansionAnalysis {
    const expansionLevel = this.calculateExpansionLevel(swing.swingHigh, swing.swingLow, currentPrice);
    const zone = this.determineZone(expansionLevel);
    const relevanceScore = this.calculateSwingRelevance(swing, currentPrice);
    
    return {
      swing,
      expansionLevel,
      zone,
      relevanceScore,
      priceDistance: Math.abs(currentPrice - (swing.swingHigh + swing.swingLow) / 2)
    };
  }

  /**
   * Select the most relevant expansion analysis
   */
  private selectPrimaryExpansion(analyses: SwingExpansionAnalysis[], currentPrice: number): SwingPoint {
    // Weight by relevance score and recency
    const scored = analyses.map(analysis => ({
      ...analysis,
      totalScore: analysis.relevanceScore * 0.7 + (1 / (analysis.priceDistance + 1)) * 0.3
    }));
    
    scored.sort((a, b) => b.totalScore - a.totalScore);
    return scored[0].swing;
  }

  /**
   * Determine zone with confidence scoring
   */
  private determineZoneWithConfidence(expansionLevel: number, swing: SwingPoint): FibZone {
    const zone = this.determineZone(expansionLevel);
    
    // Additional validation based on swing characteristics
    const swingAge = Date.now() - swing.highTimestamp.getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    
    // If swing is too old, default to MID_EXPANSION
    if (swingAge > maxAge) {
      return 'MID_EXPANSION';
    }
    
    return zone;
  }

  /**
   * Calculate comprehensive Fibonacci levels
   */
  private calculateComprehensiveFibonacciLevels(high: number, low: number): FibonacciLevels {
    const range = high - low;
    const levels: FibonacciLevels = {
      retracements: {},
      extensions: {},
      projections: {}
    };
    
    // Calculate retracement levels (from high back toward low)
    for (const ratio of this.FIBONACCI_RATIOS.filter(r => r <= 1.0)) {
      levels.retracements[ratio] = high - (range * ratio);
    }
    
    // Calculate extension levels (beyond the original move)
    for (const ratio of this.FIBONACCI_RATIOS.filter(r => r > 1.0)) {
      levels.extensions[ratio] = low + (range * ratio);
    }
    
    // Calculate projection levels (from low upward)
    for (const ratio of this.FIBONACCI_RATIOS) {
      levels.projections[ratio] = low + (range * ratio);
    }
    
    return levels;
  }

  /**
   * Identify key levels with strength analysis
   */
  private identifyKeyLevelsWithStrength(
    fibLevels: FibonacciLevels, 
    priceData: PriceBar[], 
    currentPrice: number
  ): KeyLevel[] {
    const keyLevels: KeyLevel[] = [];
    
    // Analyze retracement levels
    Object.entries(fibLevels.retracements).forEach(([ratio, level]) => {
      const strength = this.calculateLevelStrength(level, priceData);
      const type = this.determineLevelType(level, currentPrice);
      
      keyLevels.push({
        level: Number(level.toFixed(2)),
        ratio: Number(ratio),
        type,
        strength: Number(strength.toFixed(3)),
        category: 'RETRACEMENT',
        touches: this.countLevelTouches(level, priceData),
        lastTouch: this.getLastTouchDate(level, priceData)
      });
    });
    
    // Analyze extension levels
    Object.entries(fibLevels.extensions).forEach(([ratio, level]) => {
      const strength = this.calculateLevelStrength(level, priceData);
      const type = this.determineLevelType(level, currentPrice);
      
      keyLevels.push({
        level: Number(level.toFixed(2)),
        ratio: Number(ratio),
        type,
        strength: Number(strength.toFixed(3)),
        category: 'EXTENSION',
        touches: this.countLevelTouches(level, priceData),
        lastTouch: this.getLastTouchDate(level, priceData)
      });
    });
    
    // Sort by strength and return top levels
    return keyLevels
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 15); // Top 15 most significant levels
  }

  /**
   * Assess multi-level confluence
   */
  private assessMultiLevelConfluence(
    currentPrice: number, 
    keyLevels: KeyLevel[], 
    priceData: PriceBar[]
  ): number {
    const proximityThreshold = currentPrice * 0.01; // 1% threshold
    let confluenceScore = 0;
    let levelCount = 0;
    
    for (const level of keyLevels) {
      const distance = Math.abs(currentPrice - level.level);
      
      if (distance <= proximityThreshold) {
        // Weight by level strength, ratio significance, and proximity
        const proximityWeight = 1 - (distance / proximityThreshold);
        const ratioWeight = this.getRatioSignificance(level.ratio);
        const strengthWeight = level.strength;
        
        const levelConfluence = proximityWeight * ratioWeight * strengthWeight;
        confluenceScore += levelConfluence;
        levelCount++;
      }
    }
    
    // Bonus for multiple levels in confluence
    const multiLevelBonus = levelCount > 1 ? Math.min(0.3, (levelCount - 1) * 0.1) : 0;
    
    // Normalize and apply bonus
    const normalizedScore = Math.min(1, confluenceScore / 2); // Assuming max 2 strong confluences
    return Math.min(1, normalizedScore + multiLevelBonus);
  }

  /**
   * Calculate zone-specific metrics
   */
  private calculateZoneMetrics(zone: FibZone, expansionLevel: number, swing: SwingPoint): ZoneMetrics {
    const thresholds = this.ZONE_THRESHOLDS[zone];
    
    // Calculate confidence based on how well the expansion level fits the zone
    const zoneCenter = (thresholds.min + Math.min(thresholds.max, 5)) / 2; // Cap max at 5 for calculation
    const distanceFromCenter = Math.abs(expansionLevel - zoneCenter);
    const zoneWidth = Math.min(thresholds.max, 5) - thresholds.min;
    const confidence = Math.max(0.3, 1 - (distanceFromCenter / (zoneWidth / 2)));
    
    return {
      confidence: Number(confidence.toFixed(3)),
      expansionVelocity: this.calculateExpansionVelocity(swing),
      timeInZone: this.calculateTimeInZone(swing, zone),
      zoneStrength: this.calculateZoneStrength(zone, expansionLevel)
    };
  }

  /**
   * Generate expansion targets based on current zone
   */
  private generateExpansionTargets(high: number, low: number, zone: FibZone): ExpansionTarget[] {
    const range = high - low;
    const targets: ExpansionTarget[] = [];
    
    // Define target ratios based on current zone
    let targetRatios: number[] = [];
    
    switch (zone) {
      case 'COMPRESSION':
        targetRatios = [1.0, 1.272, 1.414, 1.618];
        break;
      case 'MID_EXPANSION':
        targetRatios = [1.414, 1.618, 2.0];
        break;
      case 'FULL_EXPANSION':
        targetRatios = [1.618, 2.0, 2.618];
        break;
      case 'OVER_EXTENSION':
        targetRatios = [2.0, 2.618]; // Limited targets in over-extension
        break;
      case 'EXHAUSTION':
        targetRatios = []; // No targets in exhaustion zone
        break;
    }
    
    targetRatios.forEach((ratio, index) => {
      const targetLevel = low + (range * ratio);
      const probability = this.calculateTargetProbability(ratio, zone);
      
      targets.push({
        level: Number(targetLevel.toFixed(2)),
        ratio,
        probability: Number(probability.toFixed(3)),
        priority: index + 1,
        timeframe: this.estimateTargetTimeframe(ratio, zone)
      });
    });
    
    return targets;
  }

  /**
   * Track expansion momentum and velocity
   */
  private trackExpansionMomentum(priceData: PriceBar[], swing: SwingPoint): ExpansionTracking {
    const recentBars = priceData.slice(-20); // Last 20 periods
    const currentPrice = recentBars[recentBars.length - 1].close;
    
    // Calculate expansion velocity (rate of expansion change)
    const expansionVelocity = this.calculateExpansionVelocity(swing);
    
    // Calculate momentum (price momentum in direction of expansion)
    const momentum = this.calculateExpansionMomentum(recentBars, swing);
    
    // Determine expansion phase
    const phase = this.determineExpansionPhase(currentPrice, swing);
    
    return {
      velocity: Number(expansionVelocity.toFixed(4)),
      momentum: Number(momentum.toFixed(3)),
      phase,
      accelerating: expansionVelocity > 0.1,
      decelerating: expansionVelocity < -0.1,
      lastUpdate: new Date()
    };
  }

  // Helper methods for comprehensive analysis
  private findCorrespondingSwingLow(priceData: PriceBar[], highIndex: number, lookback: number): PriceBar | null {
    for (let i = highIndex - 1; i >= Math.max(0, highIndex - 50); i--) {
      if (this.isSwingLow(priceData, i, lookback)) {
        return priceData[i];
      }
    }
    return null;
  }

  private findCorrespondingSwingHigh(priceData: PriceBar[], lowIndex: number, lookback: number): PriceBar | null {
    for (let i = lowIndex - 1; i >= Math.max(0, lowIndex - 50); i--) {
      if (this.isSwingHigh(priceData, i, lookback)) {
        return priceData[i];
      }
    }
    return null;
  }

  private isSignificantSwing(high: number, low: number, minSize: number): boolean {
    return (high - low) / low >= minSize;
  }

  private calculateSwingRelevance(swing: SwingPoint, currentPrice: number): number {
    const swingAge = Date.now() - swing.highTimestamp.getTime();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const ageScore = Math.max(0, 1 - (swingAge / maxAge));
    
    const sizeScore = Math.min(1, swing.swingSize / 0.2); // Normalize to 20% max swing
    const proximityScore = 1 / (1 + Math.abs(currentPrice - (swing.swingHigh + swing.swingLow) / 2) / currentPrice);
    
    return (ageScore * 0.3) + (sizeScore * 0.4) + (proximityScore * 0.3);
  }

  private determineLevelType(level: number, currentPrice: number): 'SUPPORT' | 'RESISTANCE' | 'TARGET' {
    if (level < currentPrice * 0.98) {
      return 'SUPPORT';
    } else if (level > currentPrice * 1.02) {
      return 'TARGET';
    } else {
      return 'RESISTANCE';
    }
  }

  private countLevelTouches(level: number, priceData: PriceBar[]): number {
    const threshold = level * 0.005; // 0.5% threshold
    let touches = 0;
    
    for (const bar of priceData) {
      if (Math.abs(bar.low - level) <= threshold || Math.abs(bar.high - level) <= threshold) {
        touches++;
      }
    }
    
    return touches;
  }

  private getLastTouchDate(level: number, priceData: PriceBar[]): Date | null {
    const threshold = level * 0.005;
    
    for (let i = priceData.length - 1; i >= 0; i--) {
      const bar = priceData[i];
      if (Math.abs(bar.low - level) <= threshold || Math.abs(bar.high - level) <= threshold) {
        return bar.timestamp;
      }
    }
    
    return null;
  }

  private getRatioSignificance(ratio: number): number {
    // Key Fibonacci ratios have higher significance
    const keyRatios = [0.382, 0.5, 0.618, 1.0, 1.272, 1.618, 2.0, 2.618];
    return keyRatios.includes(ratio) ? 1.0 : 0.7;
  }

  private calculateExpansionVelocity(swing: SwingPoint): number {
    const timeSpan = swing.highTimestamp.getTime() - swing.lowTimestamp.getTime();
    const daySpan = timeSpan / (24 * 60 * 60 * 1000);
    return daySpan > 0 ? swing.swingSize / daySpan : 0;
  }

  private calculateTimeInZone(swing: SwingPoint, zone: FibZone): number {
    // Simplified calculation - would need more historical data for accuracy
    return Math.random() * 10; // Placeholder: 0-10 days
  }

  private calculateZoneStrength(zone: FibZone, expansionLevel: number): number {
    const thresholds = this.ZONE_THRESHOLDS[zone];
    const zoneWidth = Math.min(thresholds.max, 5) - thresholds.min;
    const positionInZone = (expansionLevel - thresholds.min) / zoneWidth;
    
    // Strength is higher when positioned well within the zone
    return Math.max(0.3, 1 - Math.abs(positionInZone - 0.5) * 2);
  }

  private calculateTargetProbability(ratio: number, zone: FibZone): number {
    // Base probability decreases with higher ratios
    let baseProbability = Math.max(0.2, 1 - (ratio - 1) * 0.3);
    
    // Adjust based on current zone
    const zoneAdjustments = {
      'COMPRESSION': 1.2,
      'MID_EXPANSION': 1.0,
      'FULL_EXPANSION': 0.8,
      'OVER_EXTENSION': 0.5,
      'EXHAUSTION': 0.2
    };
    
    return Math.min(1, baseProbability * zoneAdjustments[zone]);
  }

  private estimateTargetTimeframe(ratio: number, zone: FibZone): string {
    // Higher ratios and more extended zones take longer
    const baseTimeframes = ['1-3 days', '3-7 days', '1-2 weeks', '2-4 weeks', '1-2 months'];
    const index = Math.min(4, Math.floor((ratio - 1) * 2));
    return baseTimeframes[index];
  }

  private calculateExpansionMomentum(recentBars: PriceBar[], swing: SwingPoint): number {
    if (recentBars.length < 2) return 0;
    
    const priceChange = recentBars[recentBars.length - 1].close - recentBars[0].close;
    const timeSpan = recentBars.length;
    
    return priceChange / (swing.swingHigh - swing.swingLow) / timeSpan;
  }

  private determineExpansionPhase(currentPrice: number, swing: SwingPoint): ExpansionPhase {
    const expansionLevel = this.calculateExpansionLevel(swing.swingHigh, swing.swingLow, currentPrice);
    
    if (expansionLevel < 0.5) return 'EARLY';
    if (expansionLevel < 1.0) return 'DEVELOPING';
    if (expansionLevel < 1.618) return 'MATURE';
    if (expansionLevel < 2.618) return 'LATE';
    return 'EXHAUSTED';
  }

  /**
   * Get multi-timeframe price data for comprehensive analysis
   */
  private async getMultiTimeframePriceData(
    ticker: string, 
    timeframes: string[], 
    periods: number
  ): Promise<Record<string, PriceBar[]>> {
    const multiTimeframeData: Record<string, PriceBar[]> = {};
    
    for (const timeframe of timeframes) {
      try {
        multiTimeframeData[timeframe] = await this.getPriceData(ticker, timeframe, periods);
      } catch (error) {
        console.error(`Error getting ${timeframe} data for ${ticker}:`, error);
        multiTimeframeData[timeframe] = [];
      }
    }
    
    return multiTimeframeData;
  }

  /**
   * Identify key levels across multiple timeframes
   */
  private async identifyMultiTimeframeLevels(
    multiTimeframeData: Record<string, PriceBar[]>
  ): Promise<Record<string, KeyLevelCandidate[]>> {
    const multiTimeframeLevels: Record<string, KeyLevelCandidate[]> = {};
    
    for (const [timeframe, priceData] of Object.entries(multiTimeframeData)) {
      if (priceData.length === 0) continue;
      
      const levels: KeyLevelCandidate[] = [];
      
      // Find swing points for this timeframe
      const swingPoints = this.findSignificantSwingPoints(priceData);
      
      // Generate Fibonacci levels from each swing
      for (const swing of swingPoints) {
        const fibLevels = this.calculateComprehensiveFibonacciLevels(swing.swingHigh, swing.swingLow);
        
        // Add retracement levels
        Object.entries(fibLevels.retracements).forEach(([ratio, level]) => {
          levels.push({
            level: Number(level.toFixed(2)),
            ratio: Number(ratio),
            timeframe,
            source: 'FIBONACCI_RETRACEMENT',
            swingHigh: swing.swingHigh,
            swingLow: swing.swingLow,
            swingDate: swing.highTimestamp,
            initialStrength: 0 // Will be calculated later
          });
        });
        
        // Add extension levels
        Object.entries(fibLevels.extensions).forEach(([ratio, level]) => {
          levels.push({
            level: Number(level.toFixed(2)),
            ratio: Number(ratio),
            timeframe,
            source: 'FIBONACCI_EXTENSION',
            swingHigh: swing.swingHigh,
            swingLow: swing.swingLow,
            swingDate: swing.highTimestamp,
            initialStrength: 0
          });
        });
      }
      
      // Add psychological levels (round numbers)
      const psychologicalLevels = this.identifyPsychologicalLevels(priceData);
      levels.push(...psychologicalLevels.map(level => ({
        level,
        ratio: 0,
        timeframe,
        source: 'PSYCHOLOGICAL' as const,
        swingHigh: 0,
        swingLow: 0,
        swingDate: new Date(),
        initialStrength: 0
      })));
      
      // Add pivot points
      const pivotLevels = this.calculatePivotPoints(priceData);
      levels.push(...pivotLevels.map(pivot => ({
        level: pivot.level,
        ratio: 0,
        timeframe,
        source: pivot.type as 'PIVOT_SUPPORT' | 'PIVOT_RESISTANCE',
        swingHigh: 0,
        swingLow: 0,
        swingDate: new Date(),
        initialStrength: 0
      })));
      
      multiTimeframeLevels[timeframe] = levels;
    }
    
    return multiTimeframeLevels;
  }

  /**
   * Calculate level strengths based on historical price action
   */
  private calculateLevelStrengths(
    multiTimeframeLevels: Record<string, KeyLevelCandidate[]>,
    multiTimeframeData: Record<string, PriceBar[]>
  ): Record<string, KeyLevelWithStrength[]> {
    const levelsWithStrength: Record<string, KeyLevelWithStrength[]> = {};
    
    for (const [timeframe, levels] of Object.entries(multiTimeframeLevels)) {
      const priceData = multiTimeframeData[timeframe];
      if (!priceData || priceData.length === 0) continue;
      
      levelsWithStrength[timeframe] = levels.map(level => {
        const strength = this.calculateAdvancedLevelStrength(level.level, priceData, timeframe);
        
        return {
          ...level,
          strength: strength.overallStrength,
          touches: strength.touches,
          bounces: strength.bounces,
          breakouts: strength.breakouts,
          volumeAtLevel: strength.volumeAtLevel,
          lastTouch: strength.lastTouch,
          averageHoldTime: strength.averageHoldTime,
          strengthComponents: strength.components
        };
      });
    }
    
    return levelsWithStrength;
  }

  /**
   * Advanced level strength calculation with multiple factors
   */
  private calculateAdvancedLevelStrength(
    level: number, 
    priceData: PriceBar[], 
    timeframe: string
  ): LevelStrengthAnalysis {
    const threshold = level * 0.005; // 0.5% threshold
    let touches = 0;
    let bounces = 0;
    let breakouts = 0;
    let totalVolumeAtLevel = 0;
    let lastTouch: Date | null = null;
    const holdTimes: number[] = [];
    let currentHoldStart: Date | null = null;
    
    for (let i = 1; i < priceData.length; i++) {
      const current = priceData[i];
      const previous = priceData[i - 1];
      
      const touchedLevel = Math.abs(current.low - level) <= threshold || 
                          Math.abs(current.high - level) <= threshold ||
                          (current.low <= level && current.high >= level);
      
      if (touchedLevel) {
        touches++;
        totalVolumeAtLevel += current.volume;
        lastTouch = current.timestamp;
        
        if (!currentHoldStart) {
          currentHoldStart = current.timestamp;
        }
        
        // Check for bounce (reversal from level)
        if (i < priceData.length - 2) {
          const next = priceData[i + 1];
          const nextNext = priceData[i + 2];
          
          // Bounce detection logic
          if ((current.low <= level && next.close > level && nextNext.close > level) ||
              (current.high >= level && next.close < level && nextNext.close < level)) {
            bounces++;
          }
        }
        
        // Check for breakout (sustained move through level)
        if (i < priceData.length - 5) {
          const futureCloses = priceData.slice(i + 1, i + 6).map(bar => bar.close);
          const avgFutureClose = futureCloses.reduce((sum, close) => sum + close, 0) / futureCloses.length;
          
          if (Math.abs(avgFutureClose - level) > threshold * 2) {
            breakouts++;
          }
        }
      } else if (currentHoldStart) {
        // End of hold period
        const holdTime = current.timestamp.getTime() - currentHoldStart.getTime();
        holdTimes.push(holdTime);
        currentHoldStart = null;
      }
    }
    
    // Calculate strength components
    const touchStrength = Math.min(1, touches / 10); // Normalize to max 10 touches
    const bounceRate = touches > 0 ? bounces / touches : 0;
    const breakoutResistance = touches > 0 ? 1 - (breakouts / touches) : 0;
    const volumeStrength = this.normalizeVolumeStrength(totalVolumeAtLevel, priceData);
    const recencyBonus = this.calculateRecencyBonus(lastTouch);
    const timeframeWeight = this.getTimeframeWeight(timeframe);
    
    const components = {
      touchStrength: Number(touchStrength.toFixed(3)),
      bounceRate: Number(bounceRate.toFixed(3)),
      breakoutResistance: Number(breakoutResistance.toFixed(3)),
      volumeStrength: Number(volumeStrength.toFixed(3)),
      recencyBonus: Number(recencyBonus.toFixed(3)),
      timeframeWeight: Number(timeframeWeight.toFixed(3))
    };
    
    // Calculate overall strength with weighted components
    const overallStrength = (
      touchStrength * 0.25 +
      bounceRate * 0.25 +
      breakoutResistance * 0.20 +
      volumeStrength * 0.15 +
      recencyBonus * 0.10 +
      timeframeWeight * 0.05
    );
    
    const averageHoldTime = holdTimes.length > 0 ? 
      holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length : 0;
    
    return {
      overallStrength: Number(overallStrength.toFixed(3)),
      touches,
      bounces,
      breakouts,
      volumeAtLevel: totalVolumeAtLevel,
      lastTouch,
      averageHoldTime: Math.round(averageHoldTime / (1000 * 60 * 60)), // Convert to hours
      components
    };
  }

  /**
   * Perform multi-timeframe confluence analysis
   */
  private performMultiTimeframeConfluence(
    levelsWithStrength: Record<string, KeyLevelWithStrength[]>
  ): MultiTimeframeConfluence {
    const confluenceZones: ConfluenceZone[] = [];
    const allLevels: KeyLevelWithStrength[] = [];
    
    // Collect all levels from all timeframes
    Object.values(levelsWithStrength).forEach(levels => {
      allLevels.push(...levels);
    });
    
    // Sort levels by price
    allLevels.sort((a, b) => a.level - b.level);
    
    // Find confluence zones (multiple levels within proximity)
    const proximityThreshold = 0.02; // 2% proximity threshold
    let i = 0;
    
    while (i < allLevels.length) {
      const baseLevel = allLevels[i];
      const confluenceLevels = [baseLevel];
      
      // Find all levels within proximity
      for (let j = i + 1; j < allLevels.length; j++) {
        const compareLevel = allLevels[j];
        const priceDistance = Math.abs(compareLevel.level - baseLevel.level) / baseLevel.level;
        
        if (priceDistance <= proximityThreshold) {
          confluenceLevels.push(compareLevel);
        } else {
          break; // Levels are sorted, so we can break here
        }
      }
      
      // Create confluence zone if multiple levels found
      if (confluenceLevels.length > 1) {
        const avgLevel = confluenceLevels.reduce((sum, level) => sum + level.level, 0) / confluenceLevels.length;
        const totalStrength = confluenceLevels.reduce((sum, level) => sum + level.strength, 0);
        const timeframes = [...new Set(confluenceLevels.map(level => level.timeframe))];
        
        confluenceZones.push({
          centerLevel: Number(avgLevel.toFixed(2)),
          levelCount: confluenceLevels.length,
          timeframeCount: timeframes.length,
          totalStrength: Number(totalStrength.toFixed(3)),
          averageStrength: Number((totalStrength / confluenceLevels.length).toFixed(3)),
          levels: confluenceLevels,
          timeframes,
          confluenceScore: this.calculateConfluenceScore(confluenceLevels, timeframes)
        });
      }
      
      i += confluenceLevels.length;
    }
    
    // Sort confluence zones by strength
    confluenceZones.sort((a, b) => b.confluenceScore - a.confluenceScore);
    
    return {
      confluenceZones: confluenceZones.slice(0, 10), // Top 10 confluence zones
      totalLevelsAnalyzed: allLevels.length,
      timeframesAnalyzed: Object.keys(levelsWithStrength).length,
      strongestConfluence: confluenceZones[0] || null,
      averageConfluenceStrength: confluenceZones.length > 0 ? 
        confluenceZones.reduce((sum, zone) => sum + zone.confluenceScore, 0) / confluenceZones.length : 0
    };
  }

  /**
   * Classify levels as support, resistance, or targets
   */
  private classifyLevelTypes(
    levelsWithStrength: Record<string, KeyLevelWithStrength[]>,
    currentPriceData: PriceBar[]
  ): KeyLevelWithStrength[] {
    const currentPrice = currentPriceData[currentPriceData.length - 1].close;
    const allLevels: KeyLevelWithStrength[] = [];
    
    Object.values(levelsWithStrength).forEach(levels => {
      levels.forEach(level => {
        // Classify based on position relative to current price
        let type: 'SUPPORT' | 'RESISTANCE' | 'TARGET';
        
        if (level.level < currentPrice * 0.98) {
          type = 'SUPPORT';
        } else if (level.level > currentPrice * 1.02) {
          type = 'TARGET';
        } else {
          type = 'RESISTANCE';
        }
        
        allLevels.push({
          ...level,
          type,
          distanceFromPrice: Math.abs(level.level - currentPrice) / currentPrice,
          pricePosition: level.level > currentPrice ? 'ABOVE' : level.level < currentPrice ? 'BELOW' : 'AT'
        });
      });
    });
    
    return allLevels;
  }

  /**
   * Rank levels by overall significance
   */
  private rankLevelsBySignificance(levels: KeyLevelWithStrength[]): KeyLevelWithStrength[] {
    return levels
      .map(level => ({
        ...level,
        significanceScore: this.calculateSignificanceScore(level)
      }))
      .sort((a, b) => b.significanceScore - a.significanceScore);
  }

  /**
   * Calculate significance score for ranking
   */
  private calculateSignificanceScore(level: KeyLevelWithStrength): number {
    const strengthWeight = 0.4;
    const proximityWeight = 0.2;
    const timeframeWeight = 0.15;
    const sourceWeight = 0.15;
    const recencyWeight = 0.1;
    
    // Proximity bonus (closer to current price = more significant)
    const proximityScore = Math.max(0, 1 - (level.distanceFromPrice * 10));
    
    // Timeframe significance
    const timeframeScore = this.getTimeframeWeight(level.timeframe);
    
    // Source significance
    const sourceScore = this.getSourceWeight(level.source);
    
    // Recency score
    const recencyScore = level.lastTouch ? this.calculateRecencyBonus(level.lastTouch) : 0.5;
    
    return (
      level.strength * strengthWeight +
      proximityScore * proximityWeight +
      timeframeScore * timeframeWeight +
      sourceScore * sourceWeight +
      recencyScore * recencyWeight
    );
  }

  /**
   * Generate level clusters for confluence zones
   */
  private generateLevelClusters(levels: KeyLevelWithStrength[]): LevelCluster[] {
    const clusters: LevelCluster[] = [];
    const clusterThreshold = 0.015; // 1.5% clustering threshold
    
    let i = 0;
    while (i < levels.length) {
      const clusterLevels = [levels[i]];
      const basePrice = levels[i].level;
      
      // Find all levels within clustering threshold
      for (let j = i + 1; j < levels.length; j++) {
        const priceDistance = Math.abs(levels[j].level - basePrice) / basePrice;
        if (priceDistance <= clusterThreshold) {
          clusterLevels.push(levels[j]);
        }
      }
      
      if (clusterLevels.length >= 2) {
        const avgPrice = clusterLevels.reduce((sum, level) => sum + level.level, 0) / clusterLevels.length;
        const totalStrength = clusterLevels.reduce((sum, level) => sum + level.strength, 0);
        
        clusters.push({
          centerPrice: Number(avgPrice.toFixed(2)),
          levelCount: clusterLevels.length,
          totalStrength: Number(totalStrength.toFixed(3)),
          averageStrength: Number((totalStrength / clusterLevels.length).toFixed(3)),
          priceRange: {
            min: Math.min(...clusterLevels.map(l => l.level)),
            max: Math.max(...clusterLevels.map(l => l.level))
          },
          levels: clusterLevels,
          clusterType: this.determineClusterType(clusterLevels)
        });
      }
      
      i += clusterLevels.length;
    }
    
    return clusters.sort((a, b) => b.totalStrength - a.totalStrength);
  }

  /**
   * Calculate dynamic level zones
   */
  private calculateDynamicLevelZones(
    levels: KeyLevelWithStrength[], 
    priceData: PriceBar[]
  ): DynamicLevelZone[] {
    const currentPrice = priceData[priceData.length - 1].close;
    const zones: DynamicLevelZone[] = [];
    
    // Create zones around significant levels
    const significantLevels = levels.filter(level => level.strength > 0.6).slice(0, 10);
    
    for (const level of significantLevels) {
      const volatility = this.calculateLocalVolatility(priceData, 20);
      const zoneWidth = volatility * 2; // Zone width based on volatility
      
      zones.push({
        centerLevel: level.level,
        upperBound: level.level + (level.level * zoneWidth),
        lowerBound: level.level - (level.level * zoneWidth),
        strength: level.strength,
        type: level.type || 'RESISTANCE',
        volatilityAdjusted: true,
        lastUpdate: new Date()
      });
    }
    
    return zones;
  }

  // Helper methods for key level identification
  private identifyPsychologicalLevels(priceData: PriceBar[]): number[] {
    if (priceData.length === 0) return [];
    
    const currentPrice = priceData[priceData.length - 1].close;
    const levels: number[] = [];
    
    // Round numbers (10, 20, 50, 100, etc.)
    const baseNumbers = [10, 20, 25, 50, 75, 100, 150, 200, 250, 500];
    
    for (const base of baseNumbers) {
      // Find levels around current price
      const multiplier = Math.floor(currentPrice / base);
      
      for (let i = -2; i <= 2; i++) {
        const level = (multiplier + i) * base;
        if (level > 0 && level > currentPrice * 0.5 && level < currentPrice * 2) {
          levels.push(level);
        }
      }
    }
    
    return [...new Set(levels)].sort((a, b) => a - b);
  }

  private calculatePivotPoints(priceData: PriceBar[]): Array<{level: number, type: string}> {
    if (priceData.length < 3) return [];
    
    const lastBar = priceData[priceData.length - 1];
    const high = lastBar.high;
    const low = lastBar.low;
    const close = lastBar.close;
    
    const pivot = (high + low + close) / 3;
    const r1 = (2 * pivot) - low;
    const s1 = (2 * pivot) - high;
    const r2 = pivot + (high - low);
    const s2 = pivot - (high - low);
    
    return [
      { level: pivot, type: 'PIVOT' },
      { level: r1, type: 'PIVOT_RESISTANCE' },
      { level: s1, type: 'PIVOT_SUPPORT' },
      { level: r2, type: 'PIVOT_RESISTANCE' },
      { level: s2, type: 'PIVOT_SUPPORT' }
    ];
  }

  private normalizeVolumeStrength(totalVolume: number, priceData: PriceBar[]): number {
    const avgVolume = priceData.reduce((sum, bar) => sum + bar.volume, 0) / priceData.length;
    return Math.min(1, totalVolume / (avgVolume * 5)); // Normalize to 5x average volume
  }

  private calculateRecencyBonus(lastTouch: Date | null): number {
    if (!lastTouch) return 0.3;
    
    const daysSinceTouch = (Date.now() - lastTouch.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0.1, Math.min(1, 1 - (daysSinceTouch / 30))); // Decay over 30 days
  }

  private getTimeframeWeight(timeframe: string): number {
    const weights: Record<string, number> = {
      '1D': 1.0,
      '4H': 0.8,
      '1H': 0.6,
      '15M': 0.4
    };
    return weights[timeframe] || 0.5;
  }

  private getSourceWeight(source: string): number {
    const weights: Record<string, number> = {
      'FIBONACCI_RETRACEMENT': 1.0,
      'FIBONACCI_EXTENSION': 0.9,
      'PSYCHOLOGICAL': 0.7,
      'PIVOT_SUPPORT': 0.6,
      'PIVOT_RESISTANCE': 0.6,
      'PIVOT': 0.5
    };
    return weights[source] || 0.5;
  }

  private calculateConfluenceScore(levels: KeyLevelWithStrength[], timeframes: string[]): number {
    const levelCount = levels.length;
    const timeframeCount = timeframes.length;
    const avgStrength = levels.reduce((sum, level) => sum + level.strength, 0) / levels.length;
    
    // Confluence score based on level count, timeframe diversity, and average strength
    return (levelCount * 0.3 + timeframeCount * 0.3 + avgStrength * 0.4);
  }

  private determineClusterType(levels: KeyLevelWithStrength[]): 'SUPPORT_CLUSTER' | 'RESISTANCE_CLUSTER' | 'MIXED_CLUSTER' {
    const supportCount = levels.filter(level => level.type === 'SUPPORT').length;
    const resistanceCount = levels.filter(level => level.type === 'RESISTANCE').length;
    
    if (supportCount > resistanceCount * 1.5) return 'SUPPORT_CLUSTER';
    if (resistanceCount > supportCount * 1.5) return 'RESISTANCE_CLUSTER';
    return 'MIXED_CLUSTER';
  }

  private calculateLocalVolatility(priceData: PriceBar[], periods: number): number {
    if (priceData.length < periods + 1) return 0.02; // Default 2%
    
    const recentData = priceData.slice(-periods);
    const returns = [];
    
    for (let i = 1; i < recentData.length; i++) {
      const returnValue = (recentData[i].close - recentData[i - 1].close) / recentData[i - 1].close;
      returns.push(returnValue);
    }
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private generateTimeframeBreakdown(
    multiTimeframeLevels: Record<string, KeyLevelCandidate[]>
  ): TimeframeBreakdown[] {
    return Object.entries(multiTimeframeLevels).map(([timeframe, levels]) => ({
      timeframe,
      levelCount: levels.length,
      fibonacciLevels: levels.filter(l => l.source.includes('FIBONACCI')).length,
      psychologicalLevels: levels.filter(l => l.source === 'PSYCHOLOGICAL').length,
      pivotLevels: levels.filter(l => l.source.includes('PIVOT')).length,
      averageStrength: levels.length > 0 ? 
        levels.reduce((sum, level) => sum + level.initialStrength, 0) / levels.length : 0
    }));
  }

  private calculateOverallStrengthMetrics(levels: KeyLevelWithStrength[]): StrengthMetrics {
    if (levels.length === 0) {
      return {
        averageStrength: 0,
        maxStrength: 0,
        minStrength: 0,
        strengthDistribution: { weak: 0, moderate: 0, strong: 0, veryStrong: 0 },
        totalLevelsAnalyzed: 0
      };
    }
    
    const strengths = levels.map(level => level.strength);
    const averageStrength = strengths.reduce((sum, strength) => sum + strength, 0) / strengths.length;
    const maxStrength = Math.max(...strengths);
    const minStrength = Math.min(...strengths);
    
    const distribution = {
      weak: strengths.filter(s => s < 0.3).length,
      moderate: strengths.filter(s => s >= 0.3 && s < 0.6).length,
      strong: strengths.filter(s => s >= 0.6 && s < 0.8).length,
      veryStrong: strengths.filter(s => s >= 0.8).length
    };
    
    return {
      averageStrength: Number(averageStrength.toFixed(3)),
      maxStrength: Number(maxStrength.toFixed(3)),
      minStrength: Number(minStrength.toFixed(3)),
      strengthDistribution: distribution,
      totalLevelsAnalyzed: levels.length
    };
  }

  private getDefaultKeyLevelResult(ticker: string): KeyLevelIdentificationResult {
    return {
      ticker,
      keyLevels: [],
      confluenceAnalysis: {
        confluenceZones: [],
        totalLevelsAnalyzed: 0,
        timeframesAnalyzed: 0,
        strongestConfluence: null,
        averageConfluenceStrength: 0
      },
      levelClusters: [],
      dynamicZones: [],
      multiTimeframeBreakdown: [],
      strengthMetrics: {
        averageStrength: 0,
        maxStrength: 0,
        minStrength: 0,
        strengthDistribution: { weak: 0, moderate: 0, strong: 0, veryStrong: 0 },
        totalLevelsAnalyzed: 0
      },
      timestamp: new Date()
    };
  }

  private getDefaultExpansionAnalysis(ticker: string, timeframe: string): FibonacciAnalysis {
    return {
      ticker,
      timeframe,
      currentZone: 'MID_EXPANSION',
      expansionLevel: 1.0,
      zoneConfidence: 0.5,
      primarySwing: {
        swingHigh: 100,
        swingLow: 90,
        highTimestamp: new Date(),
        lowTimestamp: new Date(),
        swingSize: 0.1,
        direction: 'BULLISH'
      },
      fibonacciLevels: {
        retracements: {},
        extensions: {},
        projections: {}
      },
      keyLevels: [],
      confluence: 0.5,
      zoneMultiplier: 1.0,
      riskAdjustment: 0.0,
      zoneCharacteristics: this.ZONE_CHARACTERISTICS['MID_EXPANSION'],
      expansionTargets: [],
      expansionTracking: {
        velocity: 0,
        momentum: 0,
        phase: 'DEVELOPING',
        accelerating: false,
        decelerating: false,
        lastUpdate: new Date()
      },
      timestamp: new Date()
    };
  }

// Supporting interfaces and types
export interface FibonacciAnalysis {
  ticker: string;
  timeframe: string;
  currentZone: FibZone;
  expansionLevel: number;
  zoneConfidence: number;
  primarySwing: SwingPoint;
  fibonacciLevels: FibonacciLevels;
  keyLevels: KeyLevel[];
  confluence: number;
  zoneMultiplier: number;
  riskAdjustment: number;
  zoneCharacteristics: ZoneCharacteristics;
  expansionTargets: ExpansionTarget[];
  expansionTracking: ExpansionTracking;
  timestamp: Date;
}

export interface SwingPoint {
  swingHigh: number;
  swingLow: number;
  highTimestamp: Date;
  lowTimestamp: Date;
  swingSize: number;
  direction: 'BULLISH' | 'BEARISH';
}

export interface FibonacciLevels {
  retracements: Record<number, number>;
  extensions: Record<number, number>;
  projections: Record<number, number>;
}

export interface KeyLevel {
  level: number;
  ratio: number;
  type: 'SUPPORT' | 'RESISTANCE' | 'TARGET';
  strength: number;
  category: 'RETRACEMENT' | 'EXTENSION' | 'PROJECTION';
  touches: number;
  lastTouch: Date | null;
}

export interface ZoneCharacteristics {
  description: string;
  riskLevel: string;
  breakoutPotential: string;
  recommendedAction: string;
}

export interface ExpansionTarget {
  level: number;
  ratio: number;
  probability: number;
  priority: number;
  timeframe: string;
}

export interface ExpansionTracking {
  velocity: number;
  momentum: number;
  phase: ExpansionPhase;
  accelerating: boolean;
  decelerating: boolean;
  lastUpdate: Date;
}

interface SwingExpansionAnalysis {
  swing: SwingPoint;
  expansionLevel: number;
  zone: FibZone;
  relevanceScore: number;
  priceDistance: number;
}

interface ZoneMetrics {
  confidence: number;
  expansionVelocity: number;
  timeInZone: number;
  zoneStrength: number;
}

interface PriceBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type ExpansionPhase = 'EARLY' | 'DEVELOPING' | 'MATURE' | 'LATE' | 'EXHAUSTED';

// Enhanced Key Level Identification Interfaces
export interface KeyLevelIdentificationResult {
  ticker: string;
  keyLevels: KeyLevelWithStrength[];
  confluenceAnalysis: MultiTimeframeConfluence;
  levelClusters: LevelCluster[];
  dynamicZones: DynamicLevelZone[];
  multiTimeframeBreakdown: TimeframeBreakdown[];
  strengthMetrics: StrengthMetrics;
  timestamp: Date;
}

export interface KeyLevelCandidate {
  level: number;
  ratio: number;
  timeframe: string;
  source: 'FIBONACCI_RETRACEMENT' | 'FIBONACCI_EXTENSION' | 'PSYCHOLOGICAL' | 'PIVOT_SUPPORT' | 'PIVOT_RESISTANCE' | 'PIVOT';
  swingHigh: number;
  swingLow: number;
  swingDate: Date;
  initialStrength: number;
}

export interface KeyLevelWithStrength extends KeyLevelCandidate {
  strength: number;
  touches: number;
  bounces: number;
  breakouts: number;
  volumeAtLevel: number;
  lastTouch: Date | null;
  averageHoldTime: number; // in hours
  strengthComponents: StrengthComponents;
  type?: 'SUPPORT' | 'RESISTANCE' | 'TARGET';
  distanceFromPrice?: number;
  pricePosition?: 'ABOVE' | 'BELOW' | 'AT';
  significanceScore?: number;
}

export interface StrengthComponents {
  touchStrength: number;
  bounceRate: number;
  breakoutResistance: number;
  volumeStrength: number;
  recencyBonus: number;
  timeframeWeight: number;
}

export interface LevelStrengthAnalysis {
  overallStrength: number;
  touches: number;
  bounces: number;
  breakouts: number;
  volumeAtLevel: number;
  lastTouch: Date | null;
  averageHoldTime: number;
  components: StrengthComponents;
}

export interface MultiTimeframeConfluence {
  confluenceZones: ConfluenceZone[];
  totalLevelsAnalyzed: number;
  timeframesAnalyzed: number;
  strongestConfluence: ConfluenceZone | null;
  averageConfluenceStrength: number;
}

export interface ConfluenceZone {
  centerLevel: number;
  levelCount: number;
  timeframeCount: number;
  totalStrength: number;
  averageStrength: number;
  levels: KeyLevelWithStrength[];
  timeframes: string[];
  confluenceScore: number;
}

export interface LevelCluster {
  centerPrice: number;
  levelCount: number;
  totalStrength: number;
  averageStrength: number;
  priceRange: {
    min: number;
    max: number;
  };
  levels: KeyLevelWithStrength[];
  clusterType: 'SUPPORT_CLUSTER' | 'RESISTANCE_CLUSTER' | 'MIXED_CLUSTER';
}

export interface DynamicLevelZone {
  centerLevel: number;
  upperBound: number;
  lowerBound: number;
  strength: number;
  type: 'SUPPORT' | 'RESISTANCE' | 'TARGET';
  volatilityAdjusted: boolean;
  lastUpdate: Date;
}

export interface TimeframeBreakdown {
  timeframe: string;
  levelCount: number;
  fibonacciLevels: number;
  psychologicalLevels: number;
  pivotLevels: number;
  averageStrength: number;
}

export interface StrengthMetrics {
  averageStrength: number;
  maxStrength: number;
  minStrength: number;
  strengthDistribution: {
    weak: number;      // < 0.3
    moderate: number;  // 0.3 - 0.6
    strong: number;    // 0.6 - 0.8
    veryStrong: number; // > 0.8
  };
  totalLevelsAnalyzed: number;
}

// Legacy interface for backward compatibility
export interface FibLevel {
  level: number;
  type: 'SUPPORT' | 'RESISTANCE' | 'TARGET';
  strength: number;
  timeframe: string;
}