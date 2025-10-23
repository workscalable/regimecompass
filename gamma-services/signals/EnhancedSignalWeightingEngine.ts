import { EventBus } from '../core/EventBus';
import { TradeSignal, MarketRegime } from '../models/PaperTradingTypes';
import { VolumeProfileAnalyzer, VolumeProfileAnalysisResult, PriceBar, VolumeBar } from './VolumeProfileAnalyzer';
import { RibbonAlignmentAnalyzer, RibbonAlignmentResult } from './RibbonAlignmentAnalyzer';
import { FibExpansionEngine } from '../gamma-adaptive/engines/FibExpansionEngine';
import { GammaExposureEngine } from '../gamma-adaptive/engines/GammaExposureEngine';

export interface ConfidenceFactors {
  trendStrength: number;
  volumeConfirmation: number;
  supportResistance: number;
  momentumAlignment: number;
  volatilityEnvironment: number;
  marketBreadth: number;
  regimeAlignment: number;
  sectorStrength: number;
}

export interface SignalWeights {
  technical: number;
  fundamental: number;
  sentiment: number;
  momentum: number;
  volatility: number;
  regime: number;
  sector: number;
}

export interface TickerConfidenceData {
  ticker: string;
  confidence: number;
  confidenceDelta: number;
  lastUpdate: Date;
  factors: ConfidenceFactors;
  historicalConfidence: number[];
  averageConfidence: number;
  confidenceTrend: 'RISING' | 'FALLING' | 'STABLE';
  reliability: number; // How reliable this ticker's signals have been
}

export interface MultiTickerConfidenceOutput {
  aggregateConfidence: number;
  normalizedConfidences: Map<string, number>;
  topTickers: string[];
  confidenceDistribution: {
    high: string[]; // > 0.7
    medium: string[]; // 0.5 - 0.7
    low: string[]; // < 0.5
  };
  marketConsensus: number; // How aligned all tickers are
  recommendedFocus: 'SINGLE_TICKER' | 'MULTI_TICKER' | 'SELECTIVE';
}

export class EnhancedSignalWeightingEngine {
  private eventBus: EventBus;
  private weights: SignalWeights;
  private tickerConfidenceMap: Map<string, TickerConfidenceData> = new Map();
  private confidenceHistory: Map<string, number[]> = new Map();
  private integrationEnabled: boolean = false;
  private maxHistoryLength: number = 100;
  
  // New analyzers for volume profile and ribbon alignment
  private volumeProfileAnalyzer: VolumeProfileAnalyzer;
  private ribbonAlignmentAnalyzer: RibbonAlignmentAnalyzer;
  
  // Fibonacci and Gamma analyzers
  private fibExpansionEngine: FibExpansionEngine;
  private gammaExposureEngine: GammaExposureEngine;
  
  // Normalization parameters
  private confidenceNormalizationParams = {
    globalMean: 0.6,
    globalStdDev: 0.15,
    adaptiveWindow: 50,
    outlierThreshold: 2.5
  };

  constructor(customWeights?: Partial<SignalWeights>) {
    this.eventBus = new EventBus(); // Would be injected in real implementation
    
    this.weights = {
      technical: 0.35,
      fundamental: 0.15,
      sentiment: 0.10,
      momentum: 0.20,
      volatility: 0.08,
      regime: 0.07,
      sector: 0.05,
      ...customWeights
    };

    this.normalizeWeights();
    this.setupEventListeners();
    
    // Initialize new analyzers
    this.volumeProfileAnalyzer = new VolumeProfileAnalyzer(this.eventBus);
    this.ribbonAlignmentAnalyzer = new RibbonAlignmentAnalyzer(this.eventBus);
    
    // Initialize Fibonacci and Gamma engines
    this.fibExpansionEngine = new FibExpansionEngine();
    this.gammaExposureEngine = new GammaExposureEngine();
  }

  private normalizeWeights(): void {
    const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
    if (total > 0) {
      Object.keys(this.weights).forEach(key => {
        this.weights[key as keyof SignalWeights] /= total;
      });
    }
  }

  private setupEventListeners(): void {
    // Listen for market regime changes
    this.eventBus.on('regime:change', (data) => {
      this.handleRegimeChange(data.ticker, data.regime);
    });

    // Listen for market data updates
    this.eventBus.on('market:data:update', (data) => {
      this.handleMarketDataUpdate(data);
    });
  }

  public enablePaperTradingIntegration(): void {
    this.integrationEnabled = true;
    console.log('📊 Paper trading integration enabled for Enhanced SignalWeightingEngine');
  }

  // Core confidence computation with multi-ticker support
  public computeMultiTickerConfidence(
    tickerFactors: Map<string, ConfidenceFactors>
  ): MultiTickerConfidenceOutput {
    const confidenceResults = new Map<string, number>();
    const normalizedConfidences = new Map<string, number>();
    
    // Compute individual ticker confidences
    for (const [ticker, factors] of tickerFactors) {
      const confidence = this.computeTickerConfidence(ticker, factors);
      confidenceResults.set(ticker, confidence.confidence);
      
      // Update ticker data
      this.updateTickerConfidenceData(ticker, confidence.confidence, factors);
    }

    // Normalize confidences across all tickers
    const normalized = this.normalizeConfidencesAcrossTickers(confidenceResults);
    normalized.forEach((confidence, ticker) => {
      normalizedConfidences.set(ticker, confidence);
    });

    // Calculate aggregate metrics
    const aggregateConfidence = this.calculateAggregateConfidence(normalized);
    const topTickers = this.getTopTickers(normalized, 5);
    const confidenceDistribution = this.categorizeConfidences(normalized);
    const marketConsensus = this.calculateMarketConsensus(normalized);
    const recommendedFocus = this.determineRecommendedFocus(
      aggregateConfidence, 
      marketConsensus, 
      confidenceDistribution
    );

    // Emit multi-ticker confidence event
    if (this.integrationEnabled) {
      this.eventBus.emit('confidence:multi-ticker', {
        aggregateConfidence,
        topTickers,
        marketConsensus,
        recommendedFocus,
        timestamp: new Date()
      });
    }

    return {
      aggregateConfidence,
      normalizedConfidences,
      topTickers,
      confidenceDistribution,
      marketConsensus,
      recommendedFocus
    };
  }

  // Enhanced single ticker confidence computation
  public computeTickerConfidence(
    ticker: string, 
    factors: ConfidenceFactors
  ): {
    confidence: number;
    confidenceDelta: number;
    breakdown: Record<string, number>;
    reliability: number;
  } {
    // Calculate weighted confidence
    const breakdown = {
      technical: (factors.trendStrength * 0.6 + factors.supportResistance * 0.4) * this.weights.technical,
      momentum: (factors.momentumAlignment * 0.7 + factors.volumeConfirmation * 0.3) * this.weights.momentum,
      volatility: factors.volatilityEnvironment * this.weights.volatility,
      regime: factors.regimeAlignment * this.weights.regime,
      sector: factors.sectorStrength * this.weights.sector,
      marketBreadth: factors.marketBreadth * this.weights.sentiment
    };

    const rawConfidence = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    
    // Apply ticker-specific adjustments
    const tickerData = this.tickerConfidenceMap.get(ticker);
    let adjustedConfidence = rawConfidence;
    
    if (tickerData) {
      // Apply reliability adjustment
      const reliabilityAdjustment = (tickerData.reliability - 0.5) * 0.1;
      adjustedConfidence += reliabilityAdjustment;
      
      // Apply trend adjustment
      if (tickerData.confidenceTrend === 'RISING') {
        adjustedConfidence += 0.05;
      } else if (tickerData.confidenceTrend === 'FALLING') {
        adjustedConfidence -= 0.05;
      }
    }

    // Ensure confidence is within bounds
    const confidence = Math.max(0, Math.min(1, adjustedConfidence));
    
    // Calculate confidence delta
    const previousConfidence = tickerData?.confidence || confidence;
    const confidenceDelta = confidence - previousConfidence;

    // Get reliability score
    const reliability = tickerData?.reliability || 0.5;

    // Emit ticker-specific confidence event
    if (this.integrationEnabled) {
      this.eventBus.emit('confidence:ticker', {
        ticker,
        confidence,
        confidenceDelta,
        breakdown,
        reliability,
        timestamp: new Date()
      });
    }

    return {
      confidence,
      confidenceDelta,
      breakdown,
      reliability
    };
  }

  // Normalize confidences across all tickers for fair comparison
  private normalizeConfidencesAcrossTickers(
    confidences: Map<string, number>
  ): Map<string, number> {
    const values = Array.from(confidences.values());
    
    if (values.length === 0) return new Map();
    if (values.length === 1) return new Map([[Array.from(confidences.keys())[0], 0.5]]);

    // Calculate statistics
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Adaptive normalization based on market conditions
    const adaptiveMean = this.calculateAdaptiveMean(values);
    const adaptiveStdDev = Math.max(stdDev, 0.05); // Minimum std dev to prevent over-normalization

    const normalized = new Map<string, number>();

    for (const [ticker, confidence] of confidences) {
      // Z-score normalization with adaptive parameters
      let normalizedValue = (confidence - adaptiveMean) / adaptiveStdDev;
      
      // Apply outlier handling
      if (Math.abs(normalizedValue) > this.confidenceNormalizationParams.outlierThreshold) {
        normalizedValue = Math.sign(normalizedValue) * this.confidenceNormalizationParams.outlierThreshold;
      }
      
      // Convert back to 0-1 range using sigmoid function
      const sigmoidValue = 1 / (1 + Math.exp(-normalizedValue));
      
      // Apply final scaling to maintain reasonable distribution
      const finalValue = Math.max(0.1, Math.min(0.9, sigmoidValue));
      
      normalized.set(ticker, finalValue);
    }

    return normalized;
  }

  private calculateAdaptiveMean(values: number[]): number {
    // Use recent history to adapt the normalization baseline
    const recentWindow = Math.min(values.length, this.confidenceNormalizationParams.adaptiveWindow);
    const recentValues = values.slice(-recentWindow);
    
    const recentMean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Blend with global mean for stability
    const blendFactor = 0.7;
    return recentMean * blendFactor + this.confidenceNormalizationParams.globalMean * (1 - blendFactor);
  }

  private updateTickerConfidenceData(
    ticker: string, 
    confidence: number, 
    factors: ConfidenceFactors
  ): void {
    let tickerData = this.tickerConfidenceMap.get(ticker);
    
    if (!tickerData) {
      tickerData = {
        ticker,
        confidence,
        confidenceDelta: 0,
        lastUpdate: new Date(),
        factors,
        historicalConfidence: [confidence],
        averageConfidence: confidence,
        confidenceTrend: 'STABLE',
        reliability: 0.5
      };
    } else {
      // Update existing data
      const previousConfidence = tickerData.confidence;
      tickerData.confidence = confidence;
      tickerData.confidenceDelta = confidence - previousConfidence;
      tickerData.lastUpdate = new Date();
      tickerData.factors = factors;
      
      // Update historical data
      tickerData.historicalConfidence.push(confidence);
      if (tickerData.historicalConfidence.length > this.maxHistoryLength) {
        tickerData.historicalConfidence.shift();
      }
      
      // Recalculate derived metrics
      tickerData.averageConfidence = tickerData.historicalConfidence.reduce((sum, val) => sum + val, 0) / tickerData.historicalConfidence.length;
      tickerData.confidenceTrend = this.calculateConfidenceTrend(tickerData.historicalConfidence);
      tickerData.reliability = this.calculateReliability(ticker, tickerData.historicalConfidence);
    }
    
    this.tickerConfidenceMap.set(ticker, tickerData);
  }

  private calculateConfidenceTrend(history: number[]): 'RISING' | 'FALLING' | 'STABLE' {
    if (history.length < 5) return 'STABLE';
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    if (older.length === 0) return 'STABLE';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 0.05) return 'RISING';
    if (difference < -0.05) return 'FALLING';
    return 'STABLE';
  }

  private calculateReliability(ticker: string, history: number[]): number {
    // Simplified reliability calculation based on consistency
    if (history.length < 10) return 0.5;
    
    const variance = this.calculateVariance(history);
    const consistency = Math.max(0, 1 - variance * 2); // Lower variance = higher reliability
    
    // Factor in historical performance (would integrate with trade outcomes in real implementation)
    const baseReliability = 0.5;
    const reliabilityAdjustment = (consistency - 0.5) * 0.4;
    
    return Math.max(0.1, Math.min(0.9, baseReliability + reliabilityAdjustment));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  private calculateAggregateConfidence(confidences: Map<string, number>): number {
    if (confidences.size === 0) return 0.5;
    
    const values = Array.from(confidences.values());
    
    // Weighted average with emphasis on higher confidence tickers
    const weights = values.map(conf => Math.pow(conf, 1.5)); // Emphasize higher confidence
    const weightedSum = values.reduce((sum, conf, i) => sum + conf * weights[i], 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  private getTopTickers(confidences: Map<string, number>, count: number): string[] {
    return Array.from(confidences.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([ticker]) => ticker);
  }

  private categorizeConfidences(confidences: Map<string, number>): {
    high: string[];
    medium: string[];
    low: string[];
  } {
    const high: string[] = [];
    const medium: string[] = [];
    const low: string[] = [];
    
    for (const [ticker, confidence] of confidences) {
      if (confidence > 0.7) {
        high.push(ticker);
      } else if (confidence > 0.5) {
        medium.push(ticker);
      } else {
        low.push(ticker);
      }
    }
    
    return { high, medium, low };
  }

  private calculateMarketConsensus(confidences: Map<string, number>): number {
    if (confidences.size < 2) return 1.0;
    
    const values = Array.from(confidences.values());
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    // Lower variance = higher consensus
    return Math.max(0, 1 - variance * 4);
  }

  private determineRecommendedFocus(
    aggregateConfidence: number,
    marketConsensus: number,
    distribution: { high: string[]; medium: string[]; low: string[] }
  ): 'SINGLE_TICKER' | 'MULTI_TICKER' | 'SELECTIVE' {
    // High consensus and high confidence -> Multi-ticker
    if (marketConsensus > 0.7 && aggregateConfidence > 0.7) {
      return 'MULTI_TICKER';
    }
    
    // Low consensus but some high confidence tickers -> Selective
    if (marketConsensus < 0.5 && distribution.high.length > 0) {
      return 'SELECTIVE';
    }
    
    // One clear winner -> Single ticker
    if (distribution.high.length === 1 && distribution.medium.length <= 2) {
      return 'SINGLE_TICKER';
    }
    
    // Default to selective approach
    return 'SELECTIVE';
  }

  // Event handlers
  private handleRegimeChange(ticker: string, regime: MarketRegime): void {
    const tickerData = this.tickerConfidenceMap.get(ticker);
    if (tickerData) {
      // Adjust confidence based on regime alignment
      // This would be more sophisticated in a real implementation
      console.log(`📊 Regime change for ${ticker}: ${regime}`);
    }
  }

  private handleMarketDataUpdate(data: any): void {
    // Update confidence factors based on new market data
    // This would integrate with real market data feeds
  }

  // Public API methods
  public getTickerConfidenceData(ticker: string): TickerConfidenceData | undefined {
    return this.tickerConfidenceMap.get(ticker);
  }

  public getAllTickerData(): TickerConfidenceData[] {
    return Array.from(this.tickerConfidenceMap.values());
  }

  public updateWeights(newWeights: Partial<SignalWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
    this.normalizeWeights();
    
    console.log('📊 Signal weights updated:', this.weights);
  }

  public getWeights(): SignalWeights {
    return { ...this.weights };
  }

  public getConfidenceStatistics(): {
    totalTickers: number;
    averageConfidence: number;
    confidenceRange: { min: number; max: number };
    highConfidenceTickers: number;
    reliabilityDistribution: { high: number; medium: number; low: number };
  } {
    const allData = Array.from(this.tickerConfidenceMap.values());
    
    if (allData.length === 0) {
      return {
        totalTickers: 0,
        averageConfidence: 0,
        confidenceRange: { min: 0, max: 0 },
        highConfidenceTickers: 0,
        reliabilityDistribution: { high: 0, medium: 0, low: 0 }
      };
    }
    
    const confidences = allData.map(data => data.confidence);
    const reliabilities = allData.map(data => data.reliability);
    
    return {
      totalTickers: allData.length,
      averageConfidence: confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length,
      confidenceRange: {
        min: Math.min(...confidences),
        max: Math.max(...confidences)
      },
      highConfidenceTickers: confidences.filter(conf => conf > 0.7).length,
      reliabilityDistribution: {
        high: reliabilities.filter(rel => rel > 0.7).length,
        medium: reliabilities.filter(rel => rel >= 0.5 && rel <= 0.7).length,
        low: reliabilities.filter(rel => rel < 0.5).length
      }
    };
  }

  public resetTickerData(ticker?: string): void {
    if (ticker) {
      this.tickerConfidenceMap.delete(ticker);
      this.confidenceHistory.delete(ticker);
      console.log(`📊 Reset confidence data for ${ticker}`);
    } else {
      this.tickerConfidenceMap.clear();
      this.confidenceHistory.clear();
      console.log('📊 Reset all confidence data');
    }
  }

  public exportConfidenceData(): any {
    return {
      tickers: Array.from(this.tickerConfidenceMap.entries()).map(([ticker, data]) => ({
        ticker,
        ...data,
        historicalConfidence: [...data.historicalConfidence] // Clone array
      })),
      weights: this.weights,
      normalizationParams: this.confidenceNormalizationParams,
      exportTimestamp: new Date().toISOString()
    };
  }

  public importConfidenceData(data: any): void {
    try {
      // Import ticker data
      if (data.tickers && Array.isArray(data.tickers)) {
        for (const tickerData of data.tickers) {
          this.tickerConfidenceMap.set(tickerData.ticker, {
            ...tickerData,
            lastUpdate: new Date(tickerData.lastUpdate)
          });
        }
      }
      
      // Import weights
      if (data.weights) {
        this.weights = { ...this.weights, ...data.weights };
        this.normalizeWeights();
      }
      
      // Import normalization parameters
      if (data.normalizationParams) {
        this.confidenceNormalizationParams = { 
          ...this.confidenceNormalizationParams, 
          ...data.normalizationParams 
        };
      }
      
      console.log('📊 Confidence data imported successfully');
    } catch (error) {
      console.error('📊 Failed to import confidence data:', error);
    }
  }

  /**
   * Assess volume profile for a ticker
   * Implements 20% weight in overall signal confidence calculation
   */
  public async assessVolumeProfile(
    ticker: string,
    priceData: PriceBar[],
    volumeData: VolumeBar[],
    institutionalData?: any
  ): Promise<VolumeProfileAnalysisResult> {
    return await this.volumeProfileAnalyzer.assessVolumeProfile(
      ticker,
      priceData,
      volumeData,
      institutionalData
    );
  }

  /**
   * Measure ribbon alignment for a ticker
   * Implements 15% weight in overall signal confidence calculation
   */
  public async measureRibbonAlignment(
    ticker: string,
    multiTimeframeData: Map<string, PriceBar[]>
  ): Promise<RibbonAlignmentResult> {
    return await this.ribbonAlignmentAnalyzer.measureRibbonAlignment(
      ticker,
      multiTimeframeData
    );
  }

  /**
   * Enhanced confidence computation with volume profile and ribbon alignment
   * Implements the full weighted formula: trend(25%) + momentum(20%) + volume(20%) + ribbon(15%) + fib(10%) + gamma(10%)
   */
  public async computeEnhancedConfidenceWithVolumeAndRibbon(
    ticker: string,
    factors: ConfidenceFactors,
    priceData: PriceBar[],
    volumeData: VolumeBar[],
    multiTimeframeData: Map<string, PriceBar[]>,
    institutionalData?: any
  ): Promise<{
    confidence: number;
    confidenceDelta: number;
    breakdown: EnhancedConfidenceBreakdown;
    reliability: number;
    volumeProfile: VolumeProfileAnalysisResult;
    ribbonAlignment: RibbonAlignmentResult;
  }> {
    try {
      // Get volume profile analysis (20% weight)
      const volumeProfile = await this.assessVolumeProfile(
        ticker,
        priceData,
        volumeData,
        institutionalData
      );

      // Get ribbon alignment analysis (15% weight)
      const ribbonAlignment = await this.measureRibbonAlignment(
        ticker,
        multiTimeframeData
      );

      // Calculate enhanced confidence with new factors
      const enhancedBreakdown: EnhancedConfidenceBreakdown = {
        // Existing factors (adjusted weights)
        trendComposite: factors.trendStrength * 0.25,           // 25%
        momentumDivergence: factors.momentumAlignment * 0.20,   // 20%
        
        // New factors
        volumeProfile: volumeProfile.overallVolumeProfile * 0.20,      // 20%
        ribbonAlignment: ribbonAlignment.overallRibbonAlignment * 0.15, // 15%
        
        // Remaining factors
        fibConfluence: factors.supportResistance * 0.10,        // 10%
        gammaExposure: factors.volatilityEnvironment * 0.10,    // 10%
        
        // Additional context factors (weighted into existing categories)
        regimeAlignment: factors.regimeAlignment * 0.05,
        marketBreadth: factors.marketBreadth * 0.05
      };

      // Calculate total confidence
      const rawConfidence = Object.values(enhancedBreakdown).reduce((sum, value) => sum + value, 0);
      
      // Apply ticker-specific adjustments
      const tickerData = this.tickerConfidenceMap.get(ticker);
      let adjustedConfidence = rawConfidence;
      
      if (tickerData) {
        // Apply reliability adjustment
        const reliabilityAdjustment = (tickerData.reliability - 0.5) * 0.1;
        adjustedConfidence += reliabilityAdjustment;
        
        // Apply trend adjustment
        if (tickerData.confidenceTrend === 'RISING') {
          adjustedConfidence += 0.05;
        } else if (tickerData.confidenceTrend === 'FALLING') {
          adjustedConfidence -= 0.05;
        }
      }

      // Apply volume and ribbon quality adjustments
      const volumeQualityAdjustment = (volumeProfile.confidence - 0.5) * 0.05;
      const ribbonQualityAdjustment = (ribbonAlignment.confidence - 0.5) * 0.03;
      
      adjustedConfidence += volumeQualityAdjustment + ribbonQualityAdjustment;

      // Ensure confidence is within bounds
      const confidence = Math.max(0, Math.min(1, adjustedConfidence));
      
      // Calculate confidence delta
      const previousConfidence = tickerData?.confidence || confidence;
      const confidenceDelta = confidence - previousConfidence;

      // Get reliability score
      const reliability = tickerData?.reliability || 0.5;

      // Update ticker confidence data with enhanced factors
      const enhancedFactors: ConfidenceFactors = {
        ...factors,
        volumeConfirmation: volumeProfile.overallVolumeProfile,
        // Add ribbon alignment to existing factor (could extend interface)
      };
      
      this.updateTickerConfidenceData(ticker, confidence, enhancedFactors);

      // Emit enhanced confidence event
      if (this.integrationEnabled) {
        this.eventBus.emit('confidence:enhanced', {
          ticker,
          confidence,
          confidenceDelta,
          breakdown: enhancedBreakdown,
          reliability,
          volumeProfile: {
            score: volumeProfile.overallVolumeProfile,
            confidence: volumeProfile.confidence,
            institutionalFlow: volumeProfile.institutionalScore
          },
          ribbonAlignment: {
            score: ribbonAlignment.overallRibbonAlignment,
            confidence: ribbonAlignment.confidence,
            dominantTimeframe: ribbonAlignment.supportingData.dominantTimeframe
          },
          timestamp: new Date()
        });
      }

      return {
        confidence,
        confidenceDelta,
        breakdown: enhancedBreakdown,
        reliability,
        volumeProfile,
        ribbonAlignment
      };

    } catch (error) {
      console.error(`Error computing enhanced confidence for ${ticker}:`, error);
      
      // Fallback to basic confidence calculation
      const basicResult = this.computeTickerConfidence(ticker, factors);
      
      return {
        confidence: basicResult.confidence,
        confidenceDelta: basicResult.confidenceDelta,
        breakdown: this.convertToEnhancedBreakdown(basicResult.breakdown),
        reliability: basicResult.reliability,
        volumeProfile: this.createFallbackVolumeProfile(ticker),
        ribbonAlignment: this.createFallbackRibbonAlignment(ticker)
      };
    }
  }

  /**
   * Convert basic breakdown to enhanced breakdown format
   */
  private convertToEnhancedBreakdown(basicBreakdown: Record<string, number>): EnhancedConfidenceBreakdown {
    return {
      trendComposite: basicBreakdown.technical * 0.6 || 0,
      momentumDivergence: basicBreakdown.momentum || 0,
      volumeProfile: 0.5, // Neutral fallback
      ribbonAlignment: 0.5, // Neutral fallback
      fibConfluence: basicBreakdown.technical * 0.4 || 0,
      gammaExposure: basicBreakdown.volatility || 0,
      regimeAlignment: basicBreakdown.regime || 0,
      marketBreadth: basicBreakdown.marketBreadth || 0
    };
  }

  /**
   * Create fallback volume profile result
   */
  private createFallbackVolumeProfile(ticker: string): VolumeProfileAnalysisResult {
    return {
      ticker,
      volumeScore: 0.5,
      institutionalScore: 0.5,
      patternScore: 0.5,
      confirmationScore: 0.5,
      overallVolumeProfile: 0.5,
      confidence: 0.3,
      breakdown: {
        volumeProfile: 0.15,
        institutionalFlow: 0.15,
        volumePatterns: 0.1,
        volumeConfirmation: 0.1
      },
      supportingData: {
        ticker,
        timestamp: new Date(),
        volumeProfile: [],
        totalVolume: 0,
        averageVolume: 0,
        volumeRatio: 1.0,
        institutionalFlow: {
          netInstitutionalFlow: 0,
          institutionalBuyVolume: 0,
          institutionalSellVolume: 0,
          retailFlow: 0,
          darkPoolActivity: 0,
          blockTradeVolume: 0,
          institutionalConfidence: 0.5
        },
        volumePatterns: [],
        volumePriceRelationship: {
          priceVolumeCorrelation: 0,
          volumeConfirmation: 0.5,
          volumeDivergence: 0,
          volumeTrend: 'STABLE',
          volumeEfficiency: 0.5
        }
      }
    };
  }

  /**
   * Create fallback ribbon alignment result
   */
  private createFallbackRibbonAlignment(ticker: string): RibbonAlignmentResult {
    return {
      ticker,
      shortTermAlignment: 0.5,
      mediumTermAlignment: 0.5,
      longTermAlignment: 0.5,
      multiTimeframeAlignment: 0.5,
      overallRibbonAlignment: 0.5,
      confidence: 0.3,
      breakdown: {
        shortTerm: 0.15,
        mediumTerm: 0.15,
        longTerm: 0.1,
        multiTimeframe: 0.1
      },
      supportingData: {
        ticker,
        timestamp: new Date(),
        timeframeAlignments: new Map(),
        crossTimeframeConsensus: 0.5,
        dominantTimeframe: '1h',
        alignmentTrend: 'STABLE',
        supportResistanceLevels: []
      }
    };
  }

  /**
   * Get volume profile analyzer instance
   */
  public getVolumeProfileAnalyzer(): VolumeProfileAnalyzer {
    return this.volumeProfileAnalyzer;
  }

  /**
   * Get ribbon alignment analyzer instance
   */
  public getRibbonAlignmentAnalyzer(): RibbonAlignmentAnalyzer {
    return this.ribbonAlignmentAnalyzer;
  }

  /**
   * Calculate Fibonacci confluence for a ticker
   * Implements 10% weight in overall signal confidence calculation
   */
  public async calculateFibonacciConfluence(
    ticker: string,
    timeframe: string = '1D'
  ): Promise<FibonacciConfluenceResult> {
    try {
      const fibAnalysis = await this.fibExpansionEngine.analyzeExpansion(ticker, timeframe);
      
      // Calculate confluence score based on multiple factors
      const confluenceScore = this.calculateConfluenceScore(fibAnalysis);
      
      // Assess support/resistance levels strength
      const supportResistanceLevels = this.assessSupportResistanceLevels(fibAnalysis);
      
      // Identify expansion zones and their significance
      const expansionZoneAnalysis = this.analyzeExpansionZones(fibAnalysis);
      
      const result: FibonacciConfluenceResult = {
        ticker,
        timeframe,
        confluenceScore,
        currentZone: fibAnalysis.currentZone,
        expansionLevel: fibAnalysis.expansionLevel,
        zoneMultiplier: fibAnalysis.zoneMultiplier,
        supportResistanceLevels,
        expansionZoneAnalysis,
        keyLevels: fibAnalysis.keyLevels,
        confidence: this.calculateFibonacciConfidence(fibAnalysis),
        fibonacciAnalysis: fibAnalysis,
        timestamp: new Date()
      };
      
      // Emit Fibonacci confluence event
      this.eventBus.emit('fibonacci:confluence:calculated', {
        ticker,
        result,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      console.error(`Error calculating Fibonacci confluence for ${ticker}:`, error);
      return this.createFallbackFibonacciConfluence(ticker, timeframe);
    }
  }

  /**
   * Assess Gamma exposure impact on underlying movement
   * Implements 10% weight in overall signal confidence calculation
   */
  public async assessGammaExposure(
    ticker: string,
    timeframe: string = '1D'
  ): Promise<GammaExposureAssessment> {
    try {
      const gammaAnalysis = await this.gammaExposureEngine.analyzeExposure(ticker, timeframe);
      
      // Calculate gamma impact on price movement
      const movementImpact = this.calculateGammaMovementImpact(gammaAnalysis);
      
      // Assess market structure implications
      const marketStructureImpact = this.assessMarketStructureImpact(gammaAnalysis);
      
      // Analyze volatility suppression/acceleration effects
      const volatilityEffects = this.analyzeVolatilityEffects(gammaAnalysis);
      
      // Calculate confidence adjustment based on gamma exposure
      const confidenceAdjustment = this.calculateGammaConfidenceAdjustment(gammaAnalysis);
      
      const result: GammaExposureAssessment = {
        ticker,
        timeframe,
        netGammaExposure: gammaAnalysis.netGammaExposure,
        movementImpact,
        marketStructureImpact,
        volatilityEffects,
        confidenceAdjustment,
        gammaFlipLevel: gammaAnalysis.gammaFlipLevel,
        pinningRisk: gammaAnalysis.pinningRisk,
        accelerationZones: gammaAnalysis.accelerationZones,
        dealerPositioning: gammaAnalysis.dealerPositioning,
        confidence: this.calculateGammaConfidence(gammaAnalysis),
        gammaAnalysis: gammaAnalysis,
        timestamp: new Date()
      };
      
      // Emit gamma exposure event
      this.eventBus.emit('gamma:exposure:assessed', {
        ticker,
        result,
        timestamp: new Date()
      });
      
      return result;
      
    } catch (error) {
      console.error(`Error assessing gamma exposure for ${ticker}:`, error);
      return this.createFallbackGammaExposure(ticker, timeframe);
    }
  }

  /**
   * Complete enhanced confidence computation with all factors
   * Implements the full weighted formula: trend(25%) + momentum(20%) + volume(20%) + ribbon(15%) + fib(10%) + gamma(10%)
   */
  public async computeCompleteEnhancedConfidence(
    ticker: string,
    factors: ConfidenceFactors,
    priceData: PriceBar[],
    volumeData: VolumeBar[],
    multiTimeframeData: Map<string, PriceBar[]>,
    timeframe: string = '1D',
    institutionalData?: any
  ): Promise<CompleteEnhancedConfidenceResult> {
    try {
      // Get all analysis components
      const [volumeProfile, ribbonAlignment, fibonacciConfluence, gammaExposure] = await Promise.all([
        this.assessVolumeProfile(ticker, priceData, volumeData, institutionalData),
        this.measureRibbonAlignment(ticker, multiTimeframeData),
        this.calculateFibonacciConfluence(ticker, timeframe),
        this.assessGammaExposure(ticker, timeframe)
      ]);

      // Calculate complete enhanced confidence with all factors
      const completeBreakdown: CompleteEnhancedConfidenceBreakdown = {
        // Core factors with exact weights
        trendComposite: factors.trendStrength * 0.25,           // 25%
        momentumDivergence: factors.momentumAlignment * 0.20,   // 20%
        volumeProfile: volumeProfile.overallVolumeProfile * 0.20,      // 20%
        ribbonAlignment: ribbonAlignment.overallRibbonAlignment * 0.15, // 15%
        fibonacciConfluence: fibonacciConfluence.confluenceScore * 0.10, // 10%
        gammaExposure: this.normalizeGammaScore(gammaExposure.confidenceAdjustment) * 0.10, // 10%
        
        // Additional context factors
        regimeAlignment: factors.regimeAlignment * 0.03,
        marketBreadth: factors.marketBreadth * 0.02
      };

      // Calculate total confidence
      const rawConfidence = Object.values(completeBreakdown).reduce((sum, value) => sum + value, 0);
      
      // Apply advanced adjustments
      let adjustedConfidence = rawConfidence;
      
      // Fibonacci zone adjustment
      const fibZoneAdjustment = this.getFibonacciZoneAdjustment(fibonacciConfluence.currentZone);
      adjustedConfidence *= fibZoneAdjustment;
      
      // Gamma exposure adjustment
      const gammaAdjustment = this.getGammaExposureAdjustment(gammaExposure.netGammaExposure);
      adjustedConfidence *= gammaAdjustment;
      
      // Quality adjustments based on analysis confidence
      const qualityAdjustment = this.calculateQualityAdjustment(
        volumeProfile.confidence,
        ribbonAlignment.confidence,
        fibonacciConfluence.confidence,
        gammaExposure.confidence
      );
      adjustedConfidence += qualityAdjustment;

      // Apply ticker-specific adjustments
      const tickerData = this.tickerConfidenceMap.get(ticker);
      if (tickerData) {
        const reliabilityAdjustment = (tickerData.reliability - 0.5) * 0.1;
        adjustedConfidence += reliabilityAdjustment;
        
        if (tickerData.confidenceTrend === 'RISING') {
          adjustedConfidence += 0.05;
        } else if (tickerData.confidenceTrend === 'FALLING') {
          adjustedConfidence -= 0.05;
        }
      }

      // Ensure confidence is within bounds
      const confidence = Math.max(0, Math.min(1, adjustedConfidence));
      
      // Calculate confidence delta
      const previousConfidence = tickerData?.confidence || confidence;
      const confidenceDelta = confidence - previousConfidence;

      // Get reliability score
      const reliability = tickerData?.reliability || 0.5;

      // Calculate factor confluence (how well factors agree)
      const factorConfluence = this.calculateFactorConfluence(completeBreakdown);
      
      // Calculate signal strength (magnitude of the signal)
      const signalStrength = this.calculateSignalStrength(completeBreakdown);

      // Update ticker confidence data
      const enhancedFactors: ConfidenceFactors = {
        ...factors,
        volumeConfirmation: volumeProfile.overallVolumeProfile,
        supportResistance: fibonacciConfluence.confluenceScore
      };
      
      this.updateTickerConfidenceData(ticker, confidence, enhancedFactors);

      const result: CompleteEnhancedConfidenceResult = {
        ticker,
        confidence,
        confidenceDelta,
        breakdown: completeBreakdown,
        reliability,
        factorConfluence,
        signalStrength,
        adjustments: {
          fibonacciZoneAdjustment: fibZoneAdjustment,
          gammaExposureAdjustment: gammaAdjustment,
          qualityAdjustment,
          reliabilityAdjustment: tickerData ? (tickerData.reliability - 0.5) * 0.1 : 0
        },
        componentAnalysis: {
          volumeProfile,
          ribbonAlignment,
          fibonacciConfluence,
          gammaExposure
        },
        timestamp: new Date()
      };

      // Emit complete enhanced confidence event
      if (this.integrationEnabled) {
        this.eventBus.emit('confidence:complete:enhanced', {
          ticker,
          result,
          timestamp: new Date()
        });
      }

      return result;

    } catch (error) {
      console.error(`Error computing complete enhanced confidence for ${ticker}:`, error);
      
      // Fallback to previous enhanced calculation
      const fallbackResult = await this.computeEnhancedConfidenceWithVolumeAndRibbon(
        ticker,
        factors,
        priceData,
        volumeData,
        multiTimeframeData,
        institutionalData
      );
      
      return this.convertToCompleteResult(fallbackResult, ticker);
    }
  }

  // Helper methods for Fibonacci analysis
  private calculateConfluenceScore(fibAnalysis: any): number {
    // Calculate confluence based on multiple Fibonacci levels converging
    let confluenceScore = fibAnalysis.confluence || 0.5;
    
    // Boost score if in favorable zones
    if (fibAnalysis.currentZone === 'COMPRESSION') {
      confluenceScore *= 1.2;
    } else if (fibAnalysis.currentZone === 'EXHAUSTION') {
      confluenceScore *= 0.3;
    }
    
    return Math.min(1.0, confluenceScore);
  }

  private assessSupportResistanceLevels(fibAnalysis: any): SupportResistanceLevel[] {
    const levels: SupportResistanceLevel[] = [];
    
    if (fibAnalysis.keyLevels) {
      fibAnalysis.keyLevels.forEach((level: any) => {
        levels.push({
          price: level.price || level.level,
          type: level.type || (level.price > fibAnalysis.currentPrice ? 'RESISTANCE' : 'SUPPORT'),
          strength: level.strength || 0.5,
          fibonacciRatio: level.ratio,
          significance: level.significance || 0.5
        });
      });
    }
    
    return levels.sort((a, b) => b.strength - a.strength);
  }

  private analyzeExpansionZones(fibAnalysis: any): ExpansionZoneAnalysis {
    return {
      currentZone: fibAnalysis.currentZone,
      zoneStrength: fibAnalysis.zoneConfidence || 0.5,
      expansionLevel: fibAnalysis.expansionLevel,
      nextZoneTarget: this.getNextZoneTarget(fibAnalysis.currentZone),
      zoneRisk: this.getZoneRisk(fibAnalysis.currentZone),
      tradingImplications: this.getZoneTradingImplications(fibAnalysis.currentZone)
    };
  }

  private calculateFibonacciConfidence(fibAnalysis: any): number {
    let confidence = 0.5;
    
    if (fibAnalysis.zoneConfidence) confidence += fibAnalysis.zoneConfidence * 0.3;
    if (fibAnalysis.confluence > 0.7) confidence += 0.2;
    if (fibAnalysis.keyLevels && fibAnalysis.keyLevels.length > 2) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  // Helper methods for Gamma analysis
  private calculateGammaMovementImpact(gammaAnalysis: any): GammaMovementImpact {
    const netGamma = gammaAnalysis.netGammaExposure || 0;
    
    return {
      accelerationPotential: Math.abs(netGamma) > 1000000 ? 0.8 : 0.4,
      suppressionLevel: netGamma > 0 ? Math.min(0.8, netGamma / 5000000) : 0,
      breakoutPotential: netGamma < -1000000 ? 0.9 : 0.3,
      pinningRisk: gammaAnalysis.pinningRisk?.level === 'HIGH' ? 0.8 : 0.2
    };
  }

  private assessMarketStructureImpact(gammaAnalysis: any): MarketStructureImpact {
    return {
      dealerHedgingPressure: gammaAnalysis.dealerPositioning?.hedgingPressure || 0.5,
      flowAmplification: gammaAnalysis.marketMakerFlow?.amplificationFactor || 1.0,
      liquidityImpact: gammaAnalysis.riskMetrics?.liquidityRisk || 0.3,
      volatilityImpact: gammaAnalysis.volatilityEnvironment?.gammaContribution || 0.5
    };
  }

  private analyzeVolatilityEffects(gammaAnalysis: any): VolatilityEffects {
    const volEnv = gammaAnalysis.volatilityEnvironment;
    
    return {
      suppressionLevel: volEnv?.suppressionLevel || 0,
      breakoutPotential: volEnv?.breakoutPotential || 0.5,
      expectedVolatility: volEnv?.expectedVolatility || 0.2,
      realizedVolatility: volEnv?.realizedVolatility || 0.2,
      volOfVol: volEnv?.volOfVol || 0.1
    };
  }

  private calculateGammaConfidenceAdjustment(gammaAnalysis: any): number {
    const netGamma = gammaAnalysis.netGammaExposure || 0;
    
    // Negative gamma (dealer short gamma) = bullish for acceleration
    if (netGamma < -1000000) return 0.8; // High positive adjustment
    if (netGamma < 0) return 0.6; // Moderate positive adjustment
    if (netGamma > 1000000) return 0.3; // Negative adjustment (suppression)
    return 0.5; // Neutral
  }

  private calculateGammaConfidence(gammaAnalysis: any): number {
    let confidence = 0.5;
    
    if (gammaAnalysis.riskMetrics?.dataQuality > 0.8) confidence += 0.2;
    if (gammaAnalysis.dealerPositioning?.strength > 0.7) confidence += 0.15;
    if (gammaAnalysis.accelerationZones?.length > 0) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  // Advanced adjustment methods
  private getFibonacciZoneAdjustment(zone: string): number {
    const adjustments = {
      'COMPRESSION': 1.2,
      'MID_EXPANSION': 1.0,
      'FULL_EXPANSION': 0.9,
      'OVER_EXTENSION': 0.7,
      'EXHAUSTION': 0.3
    };
    return adjustments[zone as keyof typeof adjustments] || 1.0;
  }

  private getGammaExposureAdjustment(netGamma: number): number {
    if (netGamma < -2000000) return 1.2; // Strong negative gamma = acceleration potential
    if (netGamma < -500000) return 1.1;  // Moderate negative gamma
    if (netGamma > 2000000) return 0.8;  // Strong positive gamma = suppression
    if (netGamma > 500000) return 0.9;   // Moderate positive gamma
    return 1.0; // Neutral gamma
  }

  private calculateQualityAdjustment(
    volumeConfidence: number,
    ribbonConfidence: number,
    fibConfidence: number,
    gammaConfidence: number
  ): number {
    const avgConfidence = (volumeConfidence + ribbonConfidence + fibConfidence + gammaConfidence) / 4;
    return (avgConfidence - 0.5) * 0.1; // ±5% adjustment based on analysis quality
  }

  private calculateFactorConfluence(breakdown: CompleteEnhancedConfidenceBreakdown): number {
    const factors = [
      breakdown.trendComposite / 0.25,
      breakdown.momentumDivergence / 0.20,
      breakdown.volumeProfile / 0.20,
      breakdown.ribbonAlignment / 0.15,
      breakdown.fibonacciConfluence / 0.10,
      breakdown.gammaExposure / 0.10
    ];
    
    const mean = factors.reduce((sum, f) => sum + f, 0) / factors.length;
    const variance = factors.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / factors.length;
    
    // Lower variance = higher confluence
    return Math.max(0, 1 - Math.sqrt(variance));
  }

  private calculateSignalStrength(breakdown: CompleteEnhancedConfidenceBreakdown): number {
    const totalStrength = Object.values(breakdown).reduce((sum, value) => sum + Math.abs(value), 0);
    return Math.min(1.0, totalStrength);
  }

  private normalizeGammaScore(gammaAdjustment: number): number {
    // Normalize gamma confidence adjustment to 0-1 scale
    return Math.max(0, Math.min(1, gammaAdjustment));
  }

  // Fallback methods
  private createFallbackFibonacciConfluence(ticker: string, timeframe: string): FibonacciConfluenceResult {
    return {
      ticker,
      timeframe,
      confluenceScore: 0.5,
      currentZone: 'MID_EXPANSION',
      expansionLevel: 1.0,
      zoneMultiplier: 1.0,
      supportResistanceLevels: [],
      expansionZoneAnalysis: {
        currentZone: 'MID_EXPANSION',
        zoneStrength: 0.5,
        expansionLevel: 1.0,
        nextZoneTarget: 'FULL_EXPANSION',
        zoneRisk: 'MODERATE',
        tradingImplications: ['Monitor for zone transition']
      },
      keyLevels: [],
      confidence: 0.3,
      fibonacciAnalysis: null,
      timestamp: new Date()
    };
  }

  private createFallbackGammaExposure(ticker: string, timeframe: string): GammaExposureAssessment {
    return {
      ticker,
      timeframe,
      netGammaExposure: 0,
      movementImpact: {
        accelerationPotential: 0.5,
        suppressionLevel: 0.5,
        breakoutPotential: 0.5,
        pinningRisk: 0.5
      },
      marketStructureImpact: {
        dealerHedgingPressure: 0.5,
        flowAmplification: 1.0,
        liquidityImpact: 0.5,
        volatilityImpact: 0.5
      },
      volatilityEffects: {
        suppressionLevel: 0.5,
        breakoutPotential: 0.5,
        expectedVolatility: 0.2,
        realizedVolatility: 0.2,
        volOfVol: 0.1
      },
      confidenceAdjustment: 0.5,
      gammaFlipLevel: null,
      pinningRisk: { level: 'MODERATE', primaryPinLevel: null, secondaryPinLevels: [], pinStrength: 0.5, timeToExpiry: 7, openInterestConcentration: 0.5, pinningProbability: 0.5 },
      accelerationZones: [],
      dealerPositioning: { netGamma: 0, gammaPercentile: 50, positionType: 'NEUTRAL', strength: 0.5, flowDirection: 'NEUTRAL', concentrationRisk: 0.5, hedgingPressure: 0.5 },
      confidence: 0.3,
      gammaAnalysis: null,
      timestamp: new Date()
    };
  }

  private convertToCompleteResult(
    fallbackResult: any,
    ticker: string
  ): CompleteEnhancedConfidenceResult {
    return {
      ticker,
      confidence: fallbackResult.confidence,
      confidenceDelta: fallbackResult.confidenceDelta,
      breakdown: {
        trendComposite: fallbackResult.breakdown.trendComposite,
        momentumDivergence: fallbackResult.breakdown.momentumDivergence,
        volumeProfile: fallbackResult.breakdown.volumeProfile,
        ribbonAlignment: fallbackResult.breakdown.ribbonAlignment,
        fibonacciConfluence: 0.05, // 10% * 0.5 fallback
        gammaExposure: 0.05, // 10% * 0.5 fallback
        regimeAlignment: fallbackResult.breakdown.regimeAlignment || 0,
        marketBreadth: fallbackResult.breakdown.marketBreadth || 0
      },
      reliability: fallbackResult.reliability,
      factorConfluence: 0.5,
      signalStrength: 0.5,
      adjustments: {
        fibonacciZoneAdjustment: 1.0,
        gammaExposureAdjustment: 1.0,
        qualityAdjustment: 0,
        reliabilityAdjustment: 0
      },
      componentAnalysis: {
        volumeProfile: fallbackResult.volumeProfile,
        ribbonAlignment: fallbackResult.ribbonAlignment,
        fibonacciConfluence: this.createFallbackFibonacciConfluence(ticker, '1D'),
        gammaExposure: this.createFallbackGammaExposure(ticker, '1D')
      },
      timestamp: new Date()
    };
  }

  // Helper methods for zone analysis
  private getNextZoneTarget(currentZone: string): string {
    const zoneProgression = {
      'COMPRESSION': 'MID_EXPANSION',
      'MID_EXPANSION': 'FULL_EXPANSION',
      'FULL_EXPANSION': 'OVER_EXTENSION',
      'OVER_EXTENSION': 'EXHAUSTION',
      'EXHAUSTION': 'COMPRESSION'
    };
    return zoneProgression[currentZone as keyof typeof zoneProgression] || 'MID_EXPANSION';
  }

  private getZoneRisk(zone: string): string {
    const zoneRisks = {
      'COMPRESSION': 'LOW',
      'MID_EXPANSION': 'MODERATE',
      'FULL_EXPANSION': 'MODERATE_HIGH',
      'OVER_EXTENSION': 'HIGH',
      'EXHAUSTION': 'VERY_HIGH'
    };
    return zoneRisks[zone as keyof typeof zoneRisks] || 'MODERATE';
  }

  private getZoneTradingImplications(zone: string): string[] {
    const implications = {
      'COMPRESSION': ['Look for breakout opportunities', 'Consider accumulation', 'Set tight stops'],
      'MID_EXPANSION': ['Normal position sizing', 'Monitor for continuation', 'Standard risk management'],
      'FULL_EXPANSION': ['Consider profit taking', 'Reduce position sizes', 'Watch for reversal signals'],
      'OVER_EXTENSION': ['High reversal risk', 'Minimal new positions', 'Consider contrarian plays'],
      'EXHAUSTION': ['Avoid new positions', 'Exit existing positions', 'Wait for reset']
    };
    return implications[zone as keyof typeof implications] || ['Monitor closely'];
  }

  /**
   * Get Fibonacci expansion engine instance
   */
  public getFibExpansionEngine(): FibExpansionEngine {
    return this.fibExpansionEngine;
  }

  /**
   * Get Gamma exposure engine instance
   */
  public getGammaExposureEngine(): GammaExposureEngine {
    return this.gammaExposureEngine;
  }
}

// New interfaces for Fibonacci and Gamma integration
export interface FibonacciConfluenceResult {
  ticker: string;
  timeframe: string;
  confluenceScore: number;
  currentZone: string;
  expansionLevel: number;
  zoneMultiplier: number;
  supportResistanceLevels: SupportResistanceLevel[];
  expansionZoneAnalysis: ExpansionZoneAnalysis;
  keyLevels: any[];
  confidence: number;
  fibonacciAnalysis: any;
  timestamp: Date;
}

export interface SupportResistanceLevel {
  price: number;
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number;
  fibonacciRatio?: number;
  significance: number;
}

export interface ExpansionZoneAnalysis {
  currentZone: string;
  zoneStrength: number;
  expansionLevel: number;
  nextZoneTarget: string;
  zoneRisk: string;
  tradingImplications: string[];
}

export interface GammaExposureAssessment {
  ticker: string;
  timeframe: string;
  netGammaExposure: number;
  movementImpact: GammaMovementImpact;
  marketStructureImpact: MarketStructureImpact;
  volatilityEffects: VolatilityEffects;
  confidenceAdjustment: number;
  gammaFlipLevel: number | null;
  pinningRisk: any;
  accelerationZones: any[];
  dealerPositioning: any;
  confidence: number;
  gammaAnalysis: any;
  timestamp: Date;
}

export interface GammaMovementImpact {
  accelerationPotential: number;
  suppressionLevel: number;
  breakoutPotential: number;
  pinningRisk: number;
}

export interface MarketStructureImpact {
  dealerHedgingPressure: number;
  flowAmplification: number;
  liquidityImpact: number;
  volatilityImpact: number;
}

export interface VolatilityEffects {
  suppressionLevel: number;
  breakoutPotential: number;
  expectedVolatility: number;
  realizedVolatility: number;
  volOfVol: number;
}

export interface CompleteEnhancedConfidenceResult {
  ticker: string;
  confidence: number;
  confidenceDelta: number;
  breakdown: CompleteEnhancedConfidenceBreakdown;
  reliability: number;
  factorConfluence: number;
  signalStrength: number;
  adjustments: {
    fibonacciZoneAdjustment: number;
    gammaExposureAdjustment: number;
    qualityAdjustment: number;
    reliabilityAdjustment: number;
  };
  componentAnalysis: {
    volumeProfile: VolumeProfileAnalysisResult;
    ribbonAlignment: RibbonAlignmentResult;
    fibonacciConfluence: FibonacciConfluenceResult;
    gammaExposure: GammaExposureAssessment;
  };
  timestamp: Date;
}

export interface CompleteEnhancedConfidenceBreakdown {
  trendComposite: number;        // 25%
  momentumDivergence: number;    // 20%
  volumeProfile: number;         // 20%
  ribbonAlignment: number;       // 15%
  fibonacciConfluence: number;   // 10%
  gammaExposure: number;         // 10%
  regimeAlignment: number;       // Additional context
  marketBreadth: number;         // Additional context
}

// Enhanced confidence breakdown interface
export interface EnhancedConfidenceBreakdown {
  trendComposite: number;        // 25%
  momentumDivergence: number;    // 20%
  volumeProfile: number;         // 20%
  ribbonAlignment: number;       // 15%
  fibConfluence: number;         // 10%
  gammaExposure: number;         // 10%
  regimeAlignment: number;       // Additional context
  marketBreadth: number;         // Additional context
}