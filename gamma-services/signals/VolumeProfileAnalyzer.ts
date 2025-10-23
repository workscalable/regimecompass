import { EventBus } from '../core/EventBus';
import { createLogger } from '../logging/Logger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

/**
 * Volume Profile Analyzer
 * 
 * Implements comprehensive volume profile analysis including:
 * - Institutional flow analysis
 * - Volume patterns recognition
 * - Volume-price relationship analysis
 * - Volume confirmation signals
 * 
 * Contributes 20% to the overall signal confidence calculation
 */

export interface VolumeProfileData {
  ticker: string;
  timestamp: Date;
  volumeProfile: VolumeLevel[];
  totalVolume: number;
  averageVolume: number;
  volumeRatio: number; // Current vs average
  institutionalFlow: InstitutionalFlowData;
  volumePatterns: VolumePattern[];
  volumePriceRelationship: VolumePriceAnalysis;
}

export interface VolumeLevel {
  priceLevel: number;
  volume: number;
  volumePercent: number;
  classification: 'HIGH_VOLUME_NODE' | 'LOW_VOLUME_NODE' | 'POINT_OF_CONTROL' | 'VALUE_AREA';
  significance: number; // 0-1 score
}

export interface InstitutionalFlowData {
  netInstitutionalFlow: number;
  institutionalBuyVolume: number;
  institutionalSellVolume: number;
  retailFlow: number;
  darkPoolActivity: number;
  blockTradeVolume: number;
  institutionalConfidence: number; // 0-1 score
}

export interface VolumePattern {
  type: 'ACCUMULATION' | 'DISTRIBUTION' | 'BREAKOUT' | 'EXHAUSTION' | 'CLIMAX';
  strength: number; // 0-1
  duration: number; // bars/periods
  significance: number; // 0-1
  priceLevel: number;
  volume: number;
}

export interface VolumePriceAnalysis {
  priceVolumeCorrelation: number; // -1 to 1
  volumeConfirmation: number; // 0-1 (does volume confirm price movement?)
  volumeDivergence: number; // 0-1 (volume diverging from price?)
  volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  volumeEfficiency: number; // 0-1 (price movement per unit volume)
}

export interface VolumeProfileAnalysisResult {
  ticker: string;
  volumeScore: number; // 0-1 overall volume profile score
  institutionalScore: number; // 0-1 institutional flow score
  patternScore: number; // 0-1 volume pattern score
  confirmationScore: number; // 0-1 volume confirmation score
  overallVolumeProfile: number; // 0-1 final weighted score
  confidence: number; // 0-1 confidence in the analysis
  breakdown: {
    volumeProfile: number;
    institutionalFlow: number;
    volumePatterns: number;
    volumeConfirmation: number;
  };
  supportingData: VolumeProfileData;
}

export class VolumeProfileAnalyzer {
  private eventBus: EventBus;
  private logger = createLogger({ component: 'VolumeProfileAnalyzer' });
  
  // Configuration
  private config = {
    volumeProfileLevels: 50, // Number of price levels for volume profile
    institutionalThreshold: 10000, // Minimum volume for institutional classification
    patternMinDuration: 5, // Minimum bars for pattern recognition
    volumeAverageWindow: 20, // Periods for volume average calculation
    correlationWindow: 14, // Periods for price-volume correlation
    darkPoolThreshold: 0.1 // Minimum percentage for dark pool significance
  };
  
  // Historical data cache
  private volumeHistory = new Map<string, VolumeProfileData[]>();
  private analysisCache = new Map<string, VolumeProfileAnalysisResult>();
  
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  /**
   * Assess volume profile for a ticker
   * Main entry point for volume profile analysis
   */
  public async assessVolumeProfile(
    ticker: string,
    priceData: PriceBar[],
    volumeData: VolumeBar[],
    institutionalData?: InstitutionalData
  ): Promise<VolumeProfileAnalysisResult> {
    return await performanceMonitor.trackOperation(`volume-profile-${ticker}`, async () => {
      try {
        // Build volume profile
        const volumeProfile = this.buildVolumeProfile(priceData, volumeData);
        
        // Analyze institutional flow
        const institutionalFlow = await this.analyzeInstitutionalFlow(
          ticker, 
          volumeData, 
          institutionalData
        );
        
        // Identify volume patterns
        const volumePatterns = this.identifyVolumePatterns(priceData, volumeData);
        
        // Analyze volume-price relationship
        const volumePriceRelationship = this.analyzeVolumePriceRelationship(
          priceData, 
          volumeData
        );
        
        // Create comprehensive volume profile data
        const volumeProfileData: VolumeProfileData = {
          ticker,
          timestamp: new Date(),
          volumeProfile,
          totalVolume: volumeData.reduce((sum, bar) => sum + bar.volume, 0),
          averageVolume: this.calculateAverageVolume(volumeData),
          volumeRatio: this.calculateVolumeRatio(volumeData),
          institutionalFlow,
          volumePatterns,
          volumePriceRelationship
        };
        
        // Calculate scores
        const volumeScore = this.calculateVolumeScore(volumeProfile);
        const institutionalScore = this.calculateInstitutionalScore(institutionalFlow);
        const patternScore = this.calculatePatternScore(volumePatterns);
        const confirmationScore = this.calculateConfirmationScore(volumePriceRelationship);
        
        // Calculate overall volume profile score with weighting
        const overallVolumeProfile = this.calculateOverallScore(
          volumeScore,
          institutionalScore,
          patternScore,
          confirmationScore
        );
        
        // Calculate confidence based on data quality and consistency
        const confidence = this.calculateAnalysisConfidence(volumeProfileData);
        
        const result: VolumeProfileAnalysisResult = {
          ticker,
          volumeScore,
          institutionalScore,
          patternScore,
          confirmationScore,
          overallVolumeProfile,
          confidence,
          breakdown: {
            volumeProfile: volumeScore * 0.3,
            institutionalFlow: institutionalScore * 0.3,
            volumePatterns: patternScore * 0.2,
            volumeConfirmation: confirmationScore * 0.2
          },
          supportingData: volumeProfileData
        };
        
        // Cache result and update history
        this.analysisCache.set(ticker, result);
        this.updateVolumeHistory(ticker, volumeProfileData);
        
        // Emit analysis event
        this.eventBus.emit('volume:profile:analyzed', {
          ticker,
          result,
          timestamp: new Date()
        });
        
        await this.logger.info('VOLUME_ANALYSIS', `Volume profile analyzed for ${ticker}`, {
          ticker,
          overallScore: overallVolumeProfile,
          confidence,
          volumeRatio: volumeProfileData.volumeRatio
        });
        
        return result;
        
      } catch (error) {
        await this.logger.error('VOLUME_ANALYSIS', `Error analyzing volume profile for ${ticker}`, {
          ticker,
          error: error instanceof Error ? error.message : 'Unknown error'
        }, error as Error);
        
        throw error;
      }
    });
  }

  /**
   * Build volume profile from price and volume data
   */
  private buildVolumeProfile(priceData: PriceBar[], volumeData: VolumeBar[]): VolumeLevel[] {
    if (priceData.length !== volumeData.length) {
      throw new Error('Price and volume data length mismatch');
    }
    
    // Find price range
    const prices = priceData.flatMap(bar => [bar.high, bar.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    
    // Create price levels
    const levelSize = priceRange / this.config.volumeProfileLevels;
    const volumeLevels: VolumeLevel[] = [];
    
    // Initialize volume levels
    for (let i = 0; i < this.config.volumeProfileLevels; i++) {
      const priceLevel = minPrice + (i * levelSize);
      volumeLevels.push({
        priceLevel,
        volume: 0,
        volumePercent: 0,
        classification: 'LOW_VOLUME_NODE',
        significance: 0
      });
    }
    
    // Distribute volume across price levels
    const totalVolume = volumeData.reduce((sum, bar) => sum + bar.volume, 0);
    
    for (let i = 0; i < priceData.length; i++) {
      const priceBar = priceData[i];
      const volumeBar = volumeData[i];
      
      // Distribute volume across the price range of this bar
      const barRange = priceBar.high - priceBar.low;
      const volumePerPrice = volumeBar.volume / Math.max(barRange, levelSize);
      
      // Find affected levels
      const startLevel = Math.floor((priceBar.low - minPrice) / levelSize);
      const endLevel = Math.floor((priceBar.high - minPrice) / levelSize);
      
      for (let level = Math.max(0, startLevel); level <= Math.min(volumeLevels.length - 1, endLevel); level++) {
        volumeLevels[level].volume += volumePerPrice * levelSize;
      }
    }
    
    // Calculate percentages and classify levels
    volumeLevels.forEach(level => {
      level.volumePercent = level.volume / totalVolume;
    });
    
    // Find point of control (highest volume level)
    const pocLevel = volumeLevels.reduce((max, level) => 
      level.volume > max.volume ? level : max
    );
    pocLevel.classification = 'POINT_OF_CONTROL';
    pocLevel.significance = 1.0;
    
    // Classify other levels
    const avgVolume = totalVolume / volumeLevels.length;
    volumeLevels.forEach(level => {
      if (level === pocLevel) return;
      
      if (level.volume > avgVolume * 1.5) {
        level.classification = 'HIGH_VOLUME_NODE';
        level.significance = Math.min(1.0, level.volume / (avgVolume * 2));
      } else if (level.volume > avgVolume * 0.7) {
        level.classification = 'VALUE_AREA';
        level.significance = level.volume / avgVolume;
      } else {
        level.classification = 'LOW_VOLUME_NODE';
        level.significance = level.volume / avgVolume;
      }
    });
    
    return volumeLevels.sort((a, b) => b.volume - a.volume);
  }

  /**
   * Analyze institutional flow patterns
   */
  private async analyzeInstitutionalFlow(
    ticker: string,
    volumeData: VolumeBar[],
    institutionalData?: InstitutionalData
  ): Promise<InstitutionalFlowData> {
    // If institutional data is provided, use it directly
    if (institutionalData) {
      return {
        netInstitutionalFlow: institutionalData.netFlow,
        institutionalBuyVolume: institutionalData.buyVolume,
        institutionalSellVolume: institutionalData.sellVolume,
        retailFlow: institutionalData.retailFlow,
        darkPoolActivity: institutionalData.darkPoolVolume,
        blockTradeVolume: institutionalData.blockTradeVolume,
        institutionalConfidence: this.calculateInstitutionalConfidence(institutionalData)
      };
    }
    
    // Estimate institutional flow from volume patterns
    const totalVolume = volumeData.reduce((sum, bar) => sum + bar.volume, 0);
    const avgVolume = totalVolume / volumeData.length;
    
    let institutionalBuyVolume = 0;
    let institutionalSellVolume = 0;
    let blockTradeVolume = 0;
    
    // Identify potential institutional activity
    volumeData.forEach(bar => {
      if (bar.volume > this.config.institutionalThreshold) {
        // Assume large volume bars indicate institutional activity
        const institutionalPortion = Math.min(1.0, bar.volume / (avgVolume * 3));
        
        if (bar.buyVolume && bar.sellVolume) {
          institutionalBuyVolume += bar.buyVolume * institutionalPortion;
          institutionalSellVolume += bar.sellVolume * institutionalPortion;
        } else {
          // Estimate buy/sell split based on price action
          const buyRatio = bar.close > bar.open ? 0.6 : 0.4;
          institutionalBuyVolume += bar.volume * buyRatio * institutionalPortion;
          institutionalSellVolume += bar.volume * (1 - buyRatio) * institutionalPortion;
        }
        
        if (bar.volume > avgVolume * 5) {
          blockTradeVolume += bar.volume;
        }
      }
    });
    
    const netInstitutionalFlow = institutionalBuyVolume - institutionalSellVolume;
    const retailFlow = totalVolume - institutionalBuyVolume - institutionalSellVolume;
    
    return {
      netInstitutionalFlow,
      institutionalBuyVolume,
      institutionalSellVolume,
      retailFlow,
      darkPoolActivity: blockTradeVolume * 0.3, // Estimate dark pool as portion of block trades
      blockTradeVolume,
      institutionalConfidence: this.calculateInstitutionalConfidenceFromVolume(
        institutionalBuyVolume + institutionalSellVolume,
        totalVolume
      )
    };
  }

  /**
   * Identify volume patterns
   */
  private identifyVolumePatterns(priceData: PriceBar[], volumeData: VolumeBar[]): VolumePattern[] {
    const patterns: VolumePattern[] = [];
    const avgVolume = volumeData.reduce((sum, bar) => sum + bar.volume, 0) / volumeData.length;
    
    // Look for accumulation patterns
    const accumulationPattern = this.findAccumulationPattern(priceData, volumeData, avgVolume);
    if (accumulationPattern) patterns.push(accumulationPattern);
    
    // Look for distribution patterns
    const distributionPattern = this.findDistributionPattern(priceData, volumeData, avgVolume);
    if (distributionPattern) patterns.push(distributionPattern);
    
    // Look for breakout patterns
    const breakoutPattern = this.findBreakoutPattern(priceData, volumeData, avgVolume);
    if (breakoutPattern) patterns.push(breakoutPattern);
    
    // Look for exhaustion patterns
    const exhaustionPattern = this.findExhaustionPattern(priceData, volumeData, avgVolume);
    if (exhaustionPattern) patterns.push(exhaustionPattern);
    
    return patterns;
  }

  /**
   * Analyze volume-price relationship
   */
  private analyzeVolumePriceRelationship(priceData: PriceBar[], volumeData: VolumeBar[]): VolumePriceAnalysis {
    const window = Math.min(this.config.correlationWindow, priceData.length);
    const recentPriceData = priceData.slice(-window);
    const recentVolumeData = volumeData.slice(-window);
    
    // Calculate price changes and volume
    const priceChanges = recentPriceData.slice(1).map((bar, i) => 
      bar.close - recentPriceData[i].close
    );
    const volumes = recentVolumeData.slice(1).map(bar => bar.volume);
    
    // Calculate correlation
    const priceVolumeCorrelation = this.calculateCorrelation(priceChanges, volumes);
    
    // Calculate volume confirmation
    const volumeConfirmation = this.calculateVolumeConfirmation(priceChanges, volumes);
    
    // Calculate volume divergence
    const volumeDivergence = this.calculateVolumeDivergence(priceChanges, volumes);
    
    // Determine volume trend
    const volumeTrend = this.determineVolumeTrend(recentVolumeData);
    
    // Calculate volume efficiency
    const volumeEfficiency = this.calculateVolumeEfficiency(priceChanges, volumes);
    
    return {
      priceVolumeCorrelation,
      volumeConfirmation,
      volumeDivergence,
      volumeTrend,
      volumeEfficiency
    };
  }

  // Scoring methods
  private calculateVolumeScore(volumeProfile: VolumeLevel[]): number {
    const pocLevel = volumeProfile.find(level => level.classification === 'POINT_OF_CONTROL');
    const highVolumeNodes = volumeProfile.filter(level => level.classification === 'HIGH_VOLUME_NODE');
    
    let score = 0;
    
    // Point of control strength
    if (pocLevel) {
      score += pocLevel.significance * 0.4;
    }
    
    // High volume node distribution
    const nodeScore = highVolumeNodes.reduce((sum, node) => sum + node.significance, 0) / Math.max(1, highVolumeNodes.length);
    score += nodeScore * 0.3;
    
    // Volume distribution quality
    const distributionScore = this.calculateVolumeDistributionScore(volumeProfile);
    score += distributionScore * 0.3;
    
    return Math.min(1.0, score);
  }

  private calculateInstitutionalScore(institutionalFlow: InstitutionalFlowData): number {
    let score = 0;
    
    // Net institutional flow strength
    const flowStrength = Math.abs(institutionalFlow.netInstitutionalFlow) / 
      Math.max(1, institutionalFlow.institutionalBuyVolume + institutionalFlow.institutionalSellVolume);
    score += Math.min(1.0, flowStrength) * 0.4;
    
    // Institutional confidence
    score += institutionalFlow.institutionalConfidence * 0.3;
    
    // Block trade activity
    const totalInstitutional = institutionalFlow.institutionalBuyVolume + institutionalFlow.institutionalSellVolume;
    const blockTradeRatio = institutionalFlow.blockTradeVolume / Math.max(1, totalInstitutional);
    score += Math.min(1.0, blockTradeRatio) * 0.3;
    
    return Math.min(1.0, score);
  }

  private calculatePatternScore(patterns: VolumePattern[]): number {
    if (patterns.length === 0) return 0.5; // Neutral if no patterns
    
    // Weight patterns by significance and strength
    const weightedScore = patterns.reduce((sum, pattern) => {
      const patternWeight = this.getPatternWeight(pattern.type);
      return sum + (pattern.strength * pattern.significance * patternWeight);
    }, 0) / patterns.length;
    
    return Math.min(1.0, weightedScore);
  }

  private calculateConfirmationScore(volumePriceAnalysis: VolumePriceAnalysis): number {
    let score = 0;
    
    // Volume confirmation weight
    score += volumePriceAnalysis.volumeConfirmation * 0.4;
    
    // Correlation strength (absolute value)
    score += Math.abs(volumePriceAnalysis.priceVolumeCorrelation) * 0.3;
    
    // Volume efficiency
    score += volumePriceAnalysis.volumeEfficiency * 0.2;
    
    // Volume divergence penalty
    score -= volumePriceAnalysis.volumeDivergence * 0.1;
    
    return Math.max(0, Math.min(1.0, score));
  }

  private calculateOverallScore(
    volumeScore: number,
    institutionalScore: number,
    patternScore: number,
    confirmationScore: number
  ): number {
    // Weighted combination of all scores
    return (
      volumeScore * 0.3 +
      institutionalScore * 0.3 +
      patternScore * 0.2 +
      confirmationScore * 0.2
    );
  }

  // Helper methods
  private setupEventListeners(): void {
    this.eventBus.on('market:data:volume', (data) => {
      // Handle real-time volume data updates
    });
  }

  private calculateAverageVolume(volumeData: VolumeBar[]): number {
    const window = Math.min(this.config.volumeAverageWindow, volumeData.length);
    const recentData = volumeData.slice(-window);
    return recentData.reduce((sum, bar) => sum + bar.volume, 0) / recentData.length;
  }

  private calculateVolumeRatio(volumeData: VolumeBar[]): number {
    if (volumeData.length === 0) return 1.0;
    
    const currentVolume = volumeData[volumeData.length - 1].volume;
    const averageVolume = this.calculateAverageVolume(volumeData);
    
    return currentVolume / Math.max(1, averageVolume);
  }

  private updateVolumeHistory(ticker: string, data: VolumeProfileData): void {
    if (!this.volumeHistory.has(ticker)) {
      this.volumeHistory.set(ticker, []);
    }
    
    const history = this.volumeHistory.get(ticker)!;
    history.push(data);
    
    // Keep only recent history
    if (history.length > 100) {
      history.shift();
    }
  }

  private calculateAnalysisConfidence(data: VolumeProfileData): number {
    let confidence = 0.5; // Base confidence
    
    // Data quality factors
    if (data.volumeProfile.length >= this.config.volumeProfileLevels * 0.8) {
      confidence += 0.2;
    }
    
    if (data.institutionalFlow.institutionalConfidence > 0.7) {
      confidence += 0.15;
    }
    
    if (data.volumePatterns.length > 0) {
      confidence += 0.1;
    }
    
    if (Math.abs(data.volumePriceRelationship.priceVolumeCorrelation) > 0.5) {
      confidence += 0.15;
    }
    
    return Math.min(1.0, confidence);
  }

  // Pattern recognition methods (simplified implementations)
  private findAccumulationPattern(priceData: PriceBar[], volumeData: VolumeBar[], avgVolume: number): VolumePattern | null {
    // Look for sideways price action with increasing volume
    // This is a simplified implementation
    return null;
  }

  private findDistributionPattern(priceData: PriceBar[], volumeData: VolumeBar[], avgVolume: number): VolumePattern | null {
    // Look for sideways price action with high volume and selling pressure
    return null;
  }

  private findBreakoutPattern(priceData: PriceBar[], volumeData: VolumeBar[], avgVolume: number): VolumePattern | null {
    // Look for price breakout with volume confirmation
    return null;
  }

  private findExhaustionPattern(priceData: PriceBar[], volumeData: VolumeBar[], avgVolume: number): VolumePattern | null {
    // Look for climax volume with price reversal
    return null;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateVolumeConfirmation(priceChanges: number[], volumes: number[]): number {
    // Simplified volume confirmation calculation
    let confirmations = 0;
    
    for (let i = 0; i < priceChanges.length; i++) {
      const priceChange = priceChanges[i];
      const volume = volumes[i];
      const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
      
      // Strong price move with above-average volume = confirmation
      if (Math.abs(priceChange) > 0.01 && volume > avgVolume * 1.2) {
        confirmations++;
      }
    }
    
    return confirmations / priceChanges.length;
  }

  private calculateVolumeDivergence(priceChanges: number[], volumes: number[]): number {
    // Simplified divergence calculation
    return 0.1; // Placeholder
  }

  private determineVolumeTrend(volumeData: VolumeBar[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (volumeData.length < 5) return 'STABLE';
    
    const recent = volumeData.slice(-5);
    const older = volumeData.slice(-10, -5);
    
    const recentAvg = recent.reduce((sum, bar) => sum + bar.volume, 0) / recent.length;
    const olderAvg = older.reduce((sum, bar) => sum + bar.volume, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'INCREASING';
    if (change < -0.1) return 'DECREASING';
    return 'STABLE';
  }

  private calculateVolumeEfficiency(priceChanges: number[], volumes: number[]): number {
    if (priceChanges.length === 0) return 0;
    
    const totalPriceChange = priceChanges.reduce((sum, change) => sum + Math.abs(change), 0);
    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    
    return totalVolume > 0 ? totalPriceChange / totalVolume : 0;
  }

  private calculateVolumeDistributionScore(volumeProfile: VolumeLevel[]): number {
    // Measure how well volume is distributed across price levels
    const totalVolume = volumeProfile.reduce((sum, level) => sum + level.volume, 0);
    const expectedVolumePerLevel = totalVolume / volumeProfile.length;
    
    // Calculate variance from expected distribution
    const variance = volumeProfile.reduce((sum, level) => {
      const diff = level.volume - expectedVolumePerLevel;
      return sum + (diff * diff);
    }, 0) / volumeProfile.length;
    
    // Lower variance = better distribution = higher score
    const normalizedVariance = Math.min(1.0, variance / (expectedVolumePerLevel * expectedVolumePerLevel));
    return 1.0 - normalizedVariance;
  }

  private calculateInstitutionalConfidence(data: InstitutionalData): number {
    // Calculate confidence based on institutional data quality
    let confidence = 0.5;
    
    if (data.dataQuality && data.dataQuality > 0.8) confidence += 0.3;
    if (data.blockTradeVolume > 0) confidence += 0.2;
    
    return Math.min(1.0, confidence);
  }

  private calculateInstitutionalConfidenceFromVolume(institutionalVolume: number, totalVolume: number): number {
    const institutionalRatio = institutionalVolume / totalVolume;
    return Math.min(1.0, institutionalRatio * 2); // Scale to 0-1
  }

  private getPatternWeight(type: VolumePattern['type']): number {
    const weights = {
      'ACCUMULATION': 0.8,
      'DISTRIBUTION': 0.8,
      'BREAKOUT': 1.0,
      'EXHAUSTION': 0.9,
      'CLIMAX': 0.7
    };
    return weights[type] || 0.5;
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

export interface VolumeBar {
  timestamp: Date;
  volume: number;
  buyVolume?: number;
  sellVolume?: number;
}

export interface InstitutionalData {
  netFlow: number;
  buyVolume: number;
  sellVolume: number;
  retailFlow: number;
  darkPoolVolume: number;
  blockTradeVolume: number;
  dataQuality?: number;
}