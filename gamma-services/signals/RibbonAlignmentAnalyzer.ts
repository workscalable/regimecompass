import { EventBus } from '../core/EventBus';
import { createLogger } from '../logging/Logger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

/**
 * Ribbon Alignment Analyzer
 * 
 * Implements comprehensive moving average ribbon analysis including:
 * - Multi-timeframe moving average convergence
 * - Ribbon strength measurement
 * - Trend alignment across timeframes
 * - Moving average support/resistance levels
 * 
 * Contributes 15% to the overall signal confidence calculation
 */

export interface RibbonConfiguration {
  shortPeriods: number[];    // Fast MAs: [5, 8, 13]
  mediumPeriods: number[];   // Medium MAs: [21, 34, 55]
  longPeriods: number[];     // Slow MAs: [89, 144, 233]
  timeframes: string[];      // ['1m', '5m', '15m', '1h', '4h', '1d']
  alignmentThreshold: number; // Minimum alignment percentage for strong signal
}

export interface MovingAverageData {
  period: number;
  timeframe: string;
  value: number;
  slope: number;           // Rate of change
  strength: number;        // 0-1 strength of the trend
  direction: 'UP' | 'DOWN' | 'SIDEWAYS';
}

export interface RibbonAlignment {
  timeframe: string;
  shortRibbonAlignment: number;    // 0-1 alignment of short MAs
  mediumRibbonAlignment: number;   // 0-1 alignment of medium MAs
  longRibbonAlignment: number;     // 0-1 alignment of long MAs
  overallAlignment: number;        // 0-1 overall ribbon alignment
  ribbonDirection: 'BULLISH' | 'BEARISH' | 'MIXED';
  ribbonStrength: number;          // 0-1 strength of alignment
  convergencePoints: ConvergencePoint[];
}

export interface ConvergencePoint {
  priceLevel: number;
  timeframe: string;
  convergingMAs: number[];         // Periods of converging MAs
  convergenceStrength: number;     // 0-1 strength of convergence
  supportResistanceLevel: 'SUPPORT' | 'RESISTANCE' | 'NEUTRAL';
  significance: number;            // 0-1 significance of the level
}

export interface MultiTimeframeAlignment {
  ticker: string;
  timestamp: Date;
  timeframeAlignments: Map<string, RibbonAlignment>;
  crossTimeframeConsensus: number;     // 0-1 agreement across timeframes
  dominantTimeframe: string;           // Timeframe with strongest signal
  alignmentTrend: 'IMPROVING' | 'DETERIORATING' | 'STABLE';
  supportResistanceLevels: SupportResistanceLevel[];
}

export interface SupportResistanceLevel {
  priceLevel: number;
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number;                    // 0-1 strength based on MA confluence
  timeframesConfirming: string[];      // Timeframes confirming this level
  movingAverages: number[];            // MA periods at this level
  significance: number;                // 0-1 overall significance
}

export interface RibbonAlignmentResult {
  ticker: string;
  shortTermAlignment: number;          // 0-1 short-term MA alignment score
  mediumTermAlignment: number;         // 0-1 medium-term MA alignment score
  longTermAlignment: number;           // 0-1 long-term MA alignment score
  multiTimeframeAlignment: number;     // 0-1 cross-timeframe alignment score
  overallRibbonAlignment: number;      // 0-1 final weighted ribbon score
  confidence: number;                  // 0-1 confidence in the analysis
  breakdown: {
    shortTerm: number;
    mediumTerm: number;
    longTerm: number;
    multiTimeframe: number;
  };
  supportingData: MultiTimeframeAlignment;
}

export class RibbonAlignmentAnalyzer {
  private eventBus: EventBus;
  private logger = createLogger({ component: 'RibbonAlignmentAnalyzer' });
  
  // Default ribbon configuration
  private config: RibbonConfiguration = {
    shortPeriods: [5, 8, 13],
    mediumPeriods: [21, 34, 55],
    longPeriods: [89, 144, 233],
    timeframes: ['1m', '5m', '15m', '1h', '4h', '1d'],
    alignmentThreshold: 0.7
  };
  
  // Historical data cache
  private alignmentHistory = new Map<string, MultiTimeframeAlignment[]>();
  private analysisCache = new Map<string, RibbonAlignmentResult>();
  
  constructor(eventBus: EventBus, customConfig?: Partial<RibbonConfiguration>) {
    this.eventBus = eventBus;
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    this.setupEventListeners();
  }

  /**
   * Measure ribbon alignment for a ticker
   * Main entry point for ribbon alignment analysis
   */
  public async measureRibbonAlignment(
    ticker: string,
    multiTimeframeData: Map<string, PriceBar[]>
  ): Promise<RibbonAlignmentResult> {
    return await performanceMonitor.trackOperation(`ribbon-alignment-${ticker}`, async () => {
      try {
        // Calculate moving averages for all timeframes
        const timeframeAlignments = new Map<string, RibbonAlignment>();
        
        for (const [timeframe, priceData] of multiTimeframeData) {
          if (this.config.timeframes.includes(timeframe)) {
            const alignment = await this.calculateTimeframeAlignment(timeframe, priceData);
            timeframeAlignments.set(timeframe, alignment);
          }
        }
        
        // Analyze cross-timeframe consensus
        const crossTimeframeConsensus = this.calculateCrossTimeframeConsensus(timeframeAlignments);
        
        // Identify dominant timeframe
        const dominantTimeframe = this.identifyDominantTimeframe(timeframeAlignments);
        
        // Determine alignment trend
        const alignmentTrend = this.determineAlignmentTrend(ticker, timeframeAlignments);
        
        // Identify support/resistance levels
        const supportResistanceLevels = this.identifySupportResistanceLevels(timeframeAlignments);
        
        // Create multi-timeframe alignment data
        const multiTimeframeAlignment: MultiTimeframeAlignment = {
          ticker,
          timestamp: new Date(),
          timeframeAlignments,
          crossTimeframeConsensus,
          dominantTimeframe,
          alignmentTrend,
          supportResistanceLevels
        };
        
        // Calculate alignment scores
        const shortTermAlignment = this.calculateShortTermAlignment(timeframeAlignments);
        const mediumTermAlignment = this.calculateMediumTermAlignment(timeframeAlignments);
        const longTermAlignment = this.calculateLongTermAlignment(timeframeAlignments);
        const multiTimeframeAlignmentScore = crossTimeframeConsensus;
        
        // Calculate overall ribbon alignment with weighting
        const overallRibbonAlignment = this.calculateOverallAlignment(
          shortTermAlignment,
          mediumTermAlignment,
          longTermAlignment,
          multiTimeframeAlignmentScore
        );
        
        // Calculate confidence based on data quality and consistency
        const confidence = this.calculateAnalysisConfidence(multiTimeframeAlignment);
        
        const result: RibbonAlignmentResult = {
          ticker,
          shortTermAlignment,
          mediumTermAlignment,
          longTermAlignment,
          multiTimeframeAlignment: multiTimeframeAlignmentScore,
          overallRibbonAlignment,
          confidence,
          breakdown: {
            shortTerm: shortTermAlignment * 0.3,
            mediumTerm: mediumTermAlignment * 0.3,
            longTerm: longTermAlignment * 0.2,
            multiTimeframe: multiTimeframeAlignmentScore * 0.2
          },
          supportingData: multiTimeframeAlignment
        };
        
        // Cache result and update history
        this.analysisCache.set(ticker, result);
        this.updateAlignmentHistory(ticker, multiTimeframeAlignment);
        
        // Emit analysis event
        this.eventBus.emit('ribbon:alignment:analyzed', {
          ticker,
          result,
          timestamp: new Date()
        });
        
        await this.logger.info('RIBBON_ANALYSIS', `Ribbon alignment analyzed for ${ticker}`, {
          ticker,
          overallAlignment: overallRibbonAlignment,
          confidence,
          dominantTimeframe
        });
        
        return result;
        
      } catch (error) {
        await this.logger.error('RIBBON_ANALYSIS', `Error analyzing ribbon alignment for ${ticker}`, {
          ticker,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, error as Error);
        
        throw error;
      }
    });
  }

  /**
   * Calculate ribbon alignment for a specific timeframe
   */
  private async calculateTimeframeAlignment(
    timeframe: string,
    priceData: PriceBar[]
  ): Promise<RibbonAlignment> {
    // Calculate all moving averages
    const shortMAs = this.calculateMovingAverages(priceData, this.config.shortPeriods, timeframe);
    const mediumMAs = this.calculateMovingAverages(priceData, this.config.mediumPeriods, timeframe);
    const longMAs = this.calculateMovingAverages(priceData, this.config.longPeriods, timeframe);
    
    // Calculate alignment for each ribbon group
    const shortRibbonAlignment = this.calculateRibbonGroupAlignment(shortMAs);
    const mediumRibbonAlignment = this.calculateRibbonGroupAlignment(mediumMAs);
    const longRibbonAlignment = this.calculateRibbonGroupAlignment(longMAs);
    
    // Calculate overall alignment
    const overallAlignment = (
      shortRibbonAlignment * 0.4 +
      mediumRibbonAlignment * 0.35 +
      longRibbonAlignment * 0.25
    );
    
    // Determine ribbon direction
    const ribbonDirection = this.determineRibbonDirection(shortMAs, mediumMAs, longMAs);
    
    // Calculate ribbon strength
    const ribbonStrength = this.calculateRibbonStrength(shortMAs, mediumMAs, longMAs);
    
    // Find convergence points
    const convergencePoints = this.findConvergencePoints(
      [...shortMAs, ...mediumMAs, ...longMAs],
      timeframe
    );
    
    return {
      timeframe,
      shortRibbonAlignment,
      mediumRibbonAlignment,
      longRibbonAlignment,
      overallAlignment,
      ribbonDirection,
      ribbonStrength,
      convergencePoints
    };
  }

  /**
   * Calculate moving averages for given periods
   */
  private calculateMovingAverages(
    priceData: PriceBar[],
    periods: number[],
    timeframe: string
  ): MovingAverageData[] {
    const movingAverages: MovingAverageData[] = [];
    
    for (const period of periods) {
      if (priceData.length >= period) {
        const ma = this.calculateSMA(priceData, period);
        const slope = this.calculateSlope(ma, 5); // 5-period slope
        const strength = this.calculateTrendStrength(ma, 10);
        const direction = this.determineTrendDirection(slope);
        
        movingAverages.push({
          period,
          timeframe,
          value: ma[ma.length - 1],
          slope,
          strength,
          direction
        });
      }
    }
    
    return movingAverages;
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(priceData: PriceBar[], period: number): number[] {
    const sma: number[] = [];
    
    for (let i = period - 1; i < priceData.length; i++) {
      const sum = priceData.slice(i - period + 1, i + 1)
        .reduce((total, bar) => total + bar.close, 0);
      sma.push(sum / period);
    }
    
    return sma;
  }

  /**
   * Calculate ribbon group alignment (how well MAs are ordered)
   */
  private calculateRibbonGroupAlignment(mas: MovingAverageData[]): number {
    if (mas.length < 2) return 0.5;
    
    // Sort MAs by period (shortest to longest)
    const sortedMAs = [...mas].sort((a, b) => a.period - b.period);
    
    let alignmentScore = 0;
    let totalComparisons = 0;
    
    // Check if MAs are properly ordered (bullish: short > long, bearish: short < long)
    for (let i = 0; i < sortedMAs.length - 1; i++) {
      for (let j = i + 1; j < sortedMAs.length; j++) {
        const shortMA = sortedMAs[i];
        const longMA = sortedMAs[j];
        
        // Determine expected relationship based on trend direction
        const expectedBullish = shortMA.value > longMA.value;
        const expectedBearish = shortMA.value < longMA.value;
        
        // Check if relationship matches trend direction
        const avgDirection = this.getAverageDirection(sortedMAs);
        
        if (avgDirection === 'UP' && expectedBullish) {
          alignmentScore += 1;
        } else if (avgDirection === 'DOWN' && expectedBearish) {
          alignmentScore += 1;
        } else if (avgDirection === 'SIDEWAYS') {
          // For sideways markets, give partial credit for any ordering
          alignmentScore += 0.5;
        }
        
        totalComparisons++;
      }
    }
    
    return totalComparisons > 0 ? alignmentScore / totalComparisons : 0.5;
  }

  /**
   * Calculate cross-timeframe consensus
   */
  private calculateCrossTimeframeConsensus(
    timeframeAlignments: Map<string, RibbonAlignment>
  ): number {
    if (timeframeAlignments.size === 0) return 0;
    
    const alignments = Array.from(timeframeAlignments.values());
    
    // Calculate average alignment across timeframes
    const avgAlignment = alignments.reduce((sum, alignment) => 
      sum + alignment.overallAlignment, 0) / alignments.length;
    
    // Calculate consensus (how similar alignments are across timeframes)
    const variance = alignments.reduce((sum, alignment) => 
      sum + Math.pow(alignment.overallAlignment - avgAlignment, 2), 0) / alignments.length;
    
    const consensus = Math.max(0, 1 - Math.sqrt(variance));
    
    // Weight by average alignment strength
    return avgAlignment * consensus;
  }

  /**
   * Identify dominant timeframe (strongest signal)
   */
  private identifyDominantTimeframe(
    timeframeAlignments: Map<string, RibbonAlignment>
  ): string {
    let maxStrength = 0;
    let dominantTimeframe = '';
    
    for (const [timeframe, alignment] of timeframeAlignments) {
      const strength = alignment.overallAlignment * alignment.ribbonStrength;
      if (strength > maxStrength) {
        maxStrength = strength;
        dominantTimeframe = timeframe;
      }
    }
    
    return dominantTimeframe || this.config.timeframes[0];
  }

  /**
   * Determine alignment trend over time
   */
  private determineAlignmentTrend(
    ticker: string,
    currentAlignments: Map<string, RibbonAlignment>
  ): 'IMPROVING' | 'DETERIORATING' | 'STABLE' {
    const history = this.alignmentHistory.get(ticker);
    if (!history || history.length < 2) return 'STABLE';
    
    const previousAlignment = history[history.length - 2];
    const currentAvgAlignment = Array.from(currentAlignments.values())
      .reduce((sum, alignment) => sum + alignment.overallAlignment, 0) / currentAlignments.size;
    
    const previousAvgAlignment = Array.from(previousAlignment.timeframeAlignments.values())
      .reduce((sum, alignment) => sum + alignment.overallAlignment, 0) / previousAlignment.timeframeAlignments.size;
    
    const change = currentAvgAlignment - previousAvgAlignment;
    
    if (change > 0.05) return 'IMPROVING';
    if (change < -0.05) return 'DETERIORATING';
    return 'STABLE';
  }

  /**
   * Identify support/resistance levels from MA convergence
   */
  private identifySupportResistanceLevels(
    timeframeAlignments: Map<string, RibbonAlignment>
  ): SupportResistanceLevel[] {
    const levels: SupportResistanceLevel[] = [];
    const levelMap = new Map<number, {
      timeframes: string[],
      mas: number[],
      strength: number
    }>();
    
    // Collect convergence points from all timeframes
    for (const [timeframe, alignment] of timeframeAlignments) {
      for (const convergence of alignment.convergencePoints) {
        const roundedLevel = Math.round(convergence.priceLevel * 100) / 100;
        
        if (!levelMap.has(roundedLevel)) {
          levelMap.set(roundedLevel, {
            timeframes: [],
            mas: [],
            strength: 0
          });
        }
        
        const levelData = levelMap.get(roundedLevel)!;
        levelData.timeframes.push(timeframe);
        levelData.mas.push(...convergence.convergingMAs);
        levelData.strength += convergence.convergenceStrength;
      }
    }
    
    // Convert to support/resistance levels
    for (const [priceLevel, data] of levelMap) {
      if (data.timeframes.length >= 2) { // Require at least 2 timeframes
        levels.push({
          priceLevel,
          type: data.strength > 0.5 ? 'RESISTANCE' : 'SUPPORT',
          strength: data.strength / data.timeframes.length,
          timeframesConfirming: data.timeframes,
          movingAverages: [...new Set(data.mas)], // Remove duplicates
          significance: Math.min(1.0, data.timeframes.length / this.config.timeframes.length)
        });
      }
    }
    
    return levels.sort((a, b) => b.significance - a.significance);
  }

  /**
   * Find convergence points where multiple MAs meet
   */
  private findConvergencePoints(
    mas: MovingAverageData[],
    timeframe: string
  ): ConvergencePoint[] {
    const convergencePoints: ConvergencePoint[] = [];
    const tolerance = 0.005; // 0.5% tolerance for convergence
    
    // Group MAs by similar values
    const groups: MovingAverageData[][] = [];
    
    for (const ma of mas) {
      let addedToGroup = false;
      
      for (const group of groups) {
        const groupAvg = group.reduce((sum, m) => sum + m.value, 0) / group.length;
        const diff = Math.abs(ma.value - groupAvg) / groupAvg;
        
        if (diff <= tolerance) {
          group.push(ma);
          addedToGroup = true;
          break;
        }
      }
      
      if (!addedToGroup) {
        groups.push([ma]);
      }
    }
    
    // Create convergence points for groups with multiple MAs
    for (const group of groups) {
      if (group.length >= 2) {
        const avgPrice = group.reduce((sum, ma) => sum + ma.value, 0) / group.length;
        const convergingMAs = group.map(ma => ma.period);
        const strength = Math.min(1.0, group.length / mas.length);
        
        convergencePoints.push({
          priceLevel: avgPrice,
          timeframe,
          convergingMAs,
          convergenceStrength: strength,
          supportResistanceLevel: this.determineSupportResistance(group),
          significance: strength
        });
      }
    }
    
    return convergencePoints;
  }

  // Scoring methods
  private calculateShortTermAlignment(timeframeAlignments: Map<string, RibbonAlignment>): number {
    const shortTimeframes = ['1m', '5m', '15m'];
    let totalAlignment = 0;
    let count = 0;
    
    for (const [timeframe, alignment] of timeframeAlignments) {
      if (shortTimeframes.includes(timeframe)) {
        totalAlignment += alignment.shortRibbonAlignment;
        count++;
      }
    }
    
    return count > 0 ? totalAlignment / count : 0.5;
  }

  private calculateMediumTermAlignment(timeframeAlignments: Map<string, RibbonAlignment>): number {
    const mediumTimeframes = ['1h', '4h'];
    let totalAlignment = 0;
    let count = 0;
    
    for (const [timeframe, alignment] of timeframeAlignments) {
      if (mediumTimeframes.includes(timeframe)) {
        totalAlignment += alignment.mediumRibbonAlignment;
        count++;
      }
    }
    
    return count > 0 ? totalAlignment / count : 0.5;
  }

  private calculateLongTermAlignment(timeframeAlignments: Map<string, RibbonAlignment>): number {
    const longTimeframes = ['1d'];
    let totalAlignment = 0;
    let count = 0;
    
    for (const [timeframe, alignment] of timeframeAlignments) {
      if (longTimeframes.includes(timeframe)) {
        totalAlignment += alignment.longRibbonAlignment;
        count++;
      }
    }
    
    return count > 0 ? totalAlignment / count : 0.5;
  }

  private calculateOverallAlignment(
    shortTerm: number,
    mediumTerm: number,
    longTerm: number,
    multiTimeframe: number
  ): number {
    return (
      shortTerm * 0.3 +
      mediumTerm * 0.3 +
      longTerm * 0.2 +
      multiTimeframe * 0.2
    );
  }

  // Helper methods
  private setupEventListeners(): void {
    this.eventBus.on('market:data:price', (data) => {
      // Handle real-time price data updates
    });
  }

  private calculateSlope(values: number[], periods: number): number {
    if (values.length < periods) return 0;
    
    const recentValues = values.slice(-periods);
    const n = recentValues.length;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentValues[i];
      sumXY += i * recentValues[i];
      sumX2 += i * i;
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }

  private calculateTrendStrength(values: number[], periods: number): number {
    if (values.length < periods) return 0;
    
    const recentValues = values.slice(-periods);
    const slope = this.calculateSlope(values, periods);
    const avgValue = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Normalize slope by average value to get relative strength
    const relativeSlope = Math.abs(slope) / avgValue;
    return Math.min(1.0, relativeSlope * 100);
  }

  private determineTrendDirection(slope: number): 'UP' | 'DOWN' | 'SIDEWAYS' {
    const threshold = 0.001; // Adjust based on price scale
    
    if (slope > threshold) return 'UP';
    if (slope < -threshold) return 'DOWN';
    return 'SIDEWAYS';
  }

  private getAverageDirection(mas: MovingAverageData[]): 'UP' | 'DOWN' | 'SIDEWAYS' {
    const upCount = mas.filter(ma => ma.direction === 'UP').length;
    const downCount = mas.filter(ma => ma.direction === 'DOWN').length;
    
    if (upCount > downCount) return 'UP';
    if (downCount > upCount) return 'DOWN';
    return 'SIDEWAYS';
  }

  private determineRibbonDirection(
    shortMAs: MovingAverageData[],
    mediumMAs: MovingAverageData[],
    longMAs: MovingAverageData[]
  ): 'BULLISH' | 'BEARISH' | 'MIXED' {
    const allMAs = [...shortMAs, ...mediumMAs, ...longMAs];
    const upCount = allMAs.filter(ma => ma.direction === 'UP').length;
    const downCount = allMAs.filter(ma => ma.direction === 'DOWN').length;
    
    if (upCount > downCount * 1.5) return 'BULLISH';
    if (downCount > upCount * 1.5) return 'BEARISH';
    return 'MIXED';
  }

  private calculateRibbonStrength(
    shortMAs: MovingAverageData[],
    mediumMAs: MovingAverageData[],
    longMAs: MovingAverageData[]
  ): number {
    const allMAs = [...shortMAs, ...mediumMAs, ...longMAs];
    const avgStrength = allMAs.reduce((sum, ma) => sum + ma.strength, 0) / allMAs.length;
    return avgStrength;
  }

  private determineSupportResistance(mas: MovingAverageData[]): 'SUPPORT' | 'RESISTANCE' | 'NEUTRAL' {
    const avgDirection = this.getAverageDirection(mas);
    
    if (avgDirection === 'UP') return 'SUPPORT';
    if (avgDirection === 'DOWN') return 'RESISTANCE';
    return 'NEUTRAL';
  }

  private updateAlignmentHistory(ticker: string, data: MultiTimeframeAlignment): void {
    if (!this.alignmentHistory.has(ticker)) {
      this.alignmentHistory.set(ticker, []);
    }
    
    const history = this.alignmentHistory.get(ticker)!;
    history.push(data);
    
    // Keep only recent history
    if (history.length > 50) {
      history.shift();
    }
  }

  private calculateAnalysisConfidence(data: MultiTimeframeAlignment): number {
    let confidence = 0.5; // Base confidence
    
    // Data quality factors
    if (data.timeframeAlignments.size >= 4) {
      confidence += 0.2;
    }
    
    if (data.crossTimeframeConsensus > 0.7) {
      confidence += 0.15;
    }
    
    if (data.supportResistanceLevels.length > 0) {
      confidence += 0.1;
    }
    
    if (data.alignmentTrend === 'IMPROVING') {
      confidence += 0.05;
    }
    
    return Math.min(1.0, confidence);
  }
}

// Supporting interfaces
export interface PriceBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}