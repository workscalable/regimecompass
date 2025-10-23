import { 
  MarketSnapshot, 
  PredictiveSignals, 
  MomentumDivergence, 
  VolumeAnalysis, 
  OptionsFlow, 
  ProjectedLevels, 
  RegimeProbability,
  InstitutionalFlow,
  ServiceResponse
} from './types';
import { detectDivergences } from './technical/divergences';
import { analyzeVolumeConfirmation } from './technical/volumeAnalysis';
import { optionsFlowService } from '../services/optionsFlowService';
import { calculatePivotLevels, calculateATR } from './math';

/**
 * Predictive Engine - Orchestrates all forward-looking analysis
 * Combines momentum divergences, volume analysis, options flow, and institutional sentiment
 * Generates probability-based regime forecasts and trading signals
 */

export interface PredictiveAnalysis {
  signals: PredictiveSignals;
  overallBias: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  timeframe: '1-3 days' | '3-7 days' | '1-2 weeks';
  keyInsights: string[];
  tradingImplications: TradingImplications;
  regimeForecast: RegimeForecast;
}

export interface TradingImplications {
  recommendedAction: 'aggressive_long' | 'cautious_long' | 'neutral' | 'cautious_short' | 'aggressive_short';
  positionSizing: 'full' | 'reduced' | 'minimal';
  riskLevel: 'low' | 'medium' | 'high';
  keyLevels: {
    support: number[];
    resistance: number[];
    targets: number[];
  };
}

export interface RegimeForecast {
  nextWeekProbabilities: {
    BULL: number;
    BEAR: number;
    NEUTRAL: number;
  };
  nextMonthProbabilities: {
    BULL: number;
    BEAR: number;
    NEUTRAL: number;
  };
  changeDrivers: string[];
  catalysts: string[];
}

export class PredictiveEngine {
  
  /**
   * Generate comprehensive predictive analysis
   */
  async generatePredictions(snapshot: MarketSnapshot): Promise<PredictiveAnalysis> {
    try {
      // Generate all predictive signals
      const signals = await this.generatePredictiveSignals(snapshot);
      
      // Analyze overall bias and confidence
      const overallAnalysis = this.analyzeOverallBias(signals);
      
      // Generate trading implications
      const tradingImplications = this.generateTradingImplications(signals, snapshot);
      
      // Create regime forecast
      const regimeForecast = this.generateRegimeForecast(signals, snapshot);
      
      // Extract key insights
      const keyInsights = this.extractKeyInsights(signals, overallAnalysis);

      return {
        signals,
        overallBias: overallAnalysis.bias,
        confidence: overallAnalysis.confidence,
        timeframe: overallAnalysis.timeframe,
        keyInsights,
        tradingImplications,
        regimeForecast
      };

    } catch (error) {
      console.error('Error generating predictions:', error);
      
      // Return fallback analysis
      return this.generateFallbackAnalysis(snapshot);
    }
  }

  /**
   * Generate all predictive signals
   */
  async generatePredictiveSignals(snapshot: MarketSnapshot): Promise<PredictiveSignals> {
    // Analyze momentum divergences
    const momentumDivergence = await this.analyzeDivergences(snapshot);
    
    // Analyze volume patterns
    const volumeAnalysis = this.analyzeVolume(snapshot);
    
    // Analyze options flow
    const optionsFlow = await this.analyzeOptionsFlow(snapshot);
    
    // Calculate projected levels
    const projectedLevels = this.calculateProjectedLevels(snapshot);
    
    // Calculate regime probabilities
    const regimeProbability = await this.calculateRegimeProbability(snapshot);
    
    // Analyze institutional flow (optional)
    const institutionalFlow = await this.analyzeInstitutionalFlow(snapshot);

    return {
      momentumDivergence,
      volumeAnalysis,
      optionsFlow,
      projectedLevels,
      regimeProbability,
      institutionalFlow
    };
  }

  /**
   * Analyze momentum divergences
   */
  async analyzeDivergences(snapshot: MarketSnapshot): Promise<MomentumDivergence> {
    try {
      // Extract price data for SPY (primary index)
      const spyData = snapshot.indexes.SPY;
      
      // We need historical price data for divergence analysis
      // In a real implementation, this would come from the data services
      // For now, we'll create a simplified analysis based on available data
      
      const mockPrices = this.generateMockPriceHistory(spyData.price, 30);
      const mockHighs = mockPrices.map(p => p * 1.01);
      const mockLows = mockPrices.map(p => p * 0.99);
      
      return detectDivergences(mockPrices, mockHighs, mockLows);
      
    } catch (error) {
      console.error('Error analyzing divergences:', error);
      return this.createEmptyDivergence();
    }
  }

  /**
   * Analyze volume patterns
   */
  analyzeVolume(snapshot: MarketSnapshot): VolumeAnalysis {
    try {
      // Extract volume data for SPY
      const spyData = snapshot.indexes.SPY;
      
      // Generate mock historical data for volume analysis
      const mockPrices = this.generateMockPriceHistory(spyData.price, 10);
      const mockVolumes = this.generateMockVolumeHistory(spyData.volume, 10);
      
      return analyzeVolumeConfirmation(mockPrices, mockVolumes);
      
    } catch (error) {
      console.error('Error analyzing volume:', error);
      return this.createEmptyVolumeAnalysis();
    }
  }

  /**
   * Analyze options flow
   */
  async analyzeOptionsFlow(snapshot: MarketSnapshot): Promise<OptionsFlow> {
    try {
      const optionsAnalysis = await optionsFlowService.analyzeOptionsFlow('SPY');
      return optionsAnalysis.data.flow;
      
    } catch (error) {
      console.error('Error analyzing options flow:', error);
      return this.createEmptyOptionsFlow();
    }
  }

  /**
   * Calculate projected support/resistance levels
   */
  calculateProjectedLevels(snapshot: MarketSnapshot): ProjectedLevels {
    try {
      const spyData = snapshot.indexes.SPY;
      const currentPrice = spyData.price;
      const atr = spyData.atr14;
      
      // Generate mock historical data for pivot calculation
      const mockHighs = this.generateMockPriceHistory(currentPrice * 1.02, 5);
      const mockLows = this.generateMockPriceHistory(currentPrice * 0.98, 5);
      const mockCloses = this.generateMockPriceHistory(currentPrice, 5);
      
      const pivots = calculatePivotLevels(mockHighs, mockLows, mockCloses);
      
      // Calculate projected moves based on ATR
      const projectedUpside = currentPrice + (atr * 1.5);
      const projectedDownside = currentPrice - (atr * 1.5);
      
      return {
        support: pivots.support,
        resistance: pivots.resistance,
        pivot: pivots.pivot,
        expectedMove: atr * 1.5,
        projectedUpside,
        projectedDownside,
        expectedRange: [projectedDownside, projectedUpside]
      };
      
    } catch (error) {
      console.error('Error calculating projected levels:', error);
      return this.createEmptyProjectedLevels(snapshot.indexes.SPY.price);
    }
  }

  /**
   * Calculate regime probability forecasts
   */
  async calculateRegimeProbability(snapshot: MarketSnapshot): Promise<RegimeProbability> {
    try {
      const currentRegime = snapshot.regime;
      const regimeStrength = snapshot.derivedSignals.regimeStrength;
      
      // Get predictive inputs
      const divergence = await this.analyzeDivergences(snapshot);
      const volume = this.analyzeVolume(snapshot);
      const options = await this.analyzeOptionsFlow(snapshot);
      
      // Calculate base probabilities based on current regime strength
      let baseBullProb = 0.33;
      let baseBearProb = 0.33;
      let baseNeutralProb = 0.34;
      
      if (currentRegime === 'BULL') {
        baseBullProb = 0.6 + (regimeStrength / 100) * 0.2;
        baseBearProb = 0.2 - (regimeStrength / 100) * 0.1;
        baseNeutralProb = 0.2;
      } else if (currentRegime === 'BEAR') {
        baseBearProb = 0.6 + (regimeStrength / 100) * 0.2;
        baseBullProb = 0.2 - (regimeStrength / 100) * 0.1;
        baseNeutralProb = 0.2;
      }
      
      // Adjust based on predictive signals
      const adjustments = this.calculateProbabilityAdjustments(divergence, volume, options);
      
      // Next week probabilities
      const nextWeekBull = Math.max(0.05, Math.min(0.9, baseBullProb + adjustments.bullish));
      const nextWeekBear = Math.max(0.05, Math.min(0.9, baseBearProb + adjustments.bearish));
      const nextWeekNeutral = Math.max(0.05, 1 - nextWeekBull - nextWeekBear);
      
      // Next month probabilities (more mean-reverting)
      const nextMonthBull = Math.max(0.1, Math.min(0.7, baseBullProb + adjustments.bullish * 0.5));
      const nextMonthBear = Math.max(0.1, Math.min(0.7, baseBearProb + adjustments.bearish * 0.5));
      const nextMonthNeutral = Math.max(0.1, 1 - nextMonthBull - nextMonthBear);
      
      return {
        nextWeek: {
          BULL: nextWeekBull,
          BEAR: nextWeekBear,
          NEUTRAL: nextWeekNeutral
        },
        nextMonth: {
          BULL: nextMonthBull,
          BEAR: nextMonthBear,
          NEUTRAL: nextMonthNeutral
        }
      };
      
    } catch (error) {
      console.error('Error calculating regime probability:', error);
      return this.createDefaultRegimeProbability();
    }
  }

  /**
   * Analyze institutional flow (optional)
   */
  async analyzeInstitutionalFlow(snapshot: MarketSnapshot): Promise<InstitutionalFlow | undefined> {
    try {
      // This would integrate with institutional flow data sources
      // For now, return undefined as it's optional
      return undefined;
      
    } catch (error) {
      console.error('Error analyzing institutional flow:', error);
      return undefined;
    }
  }

  /**
   * Analyze overall bias from all signals
   */
  private analyzeOverallBias(signals: PredictiveSignals): {
    bias: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    timeframe: '1-3 days' | '3-7 days' | '1-2 weeks';
  } {
    const signalWeights = {
      divergence: 0.25,
      volume: 0.25,
      options: 0.30,
      regime: 0.20
    };

    let bullishScore = 0;
    let bearishScore = 0;
    let totalWeight = 0;

    // Momentum divergence signal
    if (signals.momentumDivergence.type === 'bullish') {
      bullishScore += signals.momentumDivergence.strength * signalWeights.divergence;
      totalWeight += signalWeights.divergence;
    } else if (signals.momentumDivergence.type === 'bearish') {
      bearishScore += signals.momentumDivergence.strength * signalWeights.divergence;
      totalWeight += signalWeights.divergence;
    }

    // Volume signal
    if (signals.volumeAnalysis.thrust === 'up' && signals.volumeAnalysis.confirmation) {
      bullishScore += 0.7 * signalWeights.volume;
      totalWeight += signalWeights.volume;
    } else if (signals.volumeAnalysis.thrust === 'down' && signals.volumeAnalysis.confirmation) {
      bearishScore += 0.7 * signalWeights.volume;
      totalWeight += signalWeights.volume;
    }

    // Options flow signal
    if (signals.optionsFlow.bias === 'bullish') {
      bullishScore += signals.optionsFlow.confidence * signalWeights.options;
      totalWeight += signalWeights.options;
    } else if (signals.optionsFlow.bias === 'bearish') {
      bearishScore += signals.optionsFlow.confidence * signalWeights.options;
      totalWeight += signalWeights.options;
    }

    // Regime probability signal
    const regimeSignal = Math.max(
      signals.regimeProbability.nextWeek.BULL,
      signals.regimeProbability.nextWeek.BEAR
    );
    if (signals.regimeProbability.nextWeek.BULL > signals.regimeProbability.nextWeek.BEAR) {
      bullishScore += regimeSignal * signalWeights.regime;
    } else {
      bearishScore += regimeSignal * signalWeights.regime;
    }
    totalWeight += signalWeights.regime;

    // Determine overall bias
    let bias: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 0;

    if (bullishScore > bearishScore && bullishScore > 0.3) {
      bias = 'bullish';
      confidence = bullishScore / totalWeight;
    } else if (bearishScore > bullishScore && bearishScore > 0.3) {
      bias = 'bearish';
      confidence = bearishScore / totalWeight;
    } else {
      confidence = 0.3; // Low confidence in neutral
    }

    // Determine timeframe based on signal types
    let timeframe: '1-3 days' | '3-7 days' | '1-2 weeks' = '3-7 days';
    if (signals.momentumDivergence.timeframe === 'short' || signals.optionsFlow.unusualActivity) {
      timeframe = '1-3 days';
    } else if (signals.momentumDivergence.timeframe === 'long') {
      timeframe = '1-2 weeks';
    }

    return { bias, confidence, timeframe };
  }

  /**
   * Generate trading implications
   */
  private generateTradingImplications(
    signals: PredictiveSignals, 
    snapshot: MarketSnapshot
  ): TradingImplications {
    const overallBias = this.analyzeOverallBias(signals);
    
    // Determine recommended action
    let recommendedAction: TradingImplications['recommendedAction'] = 'neutral';
    let positionSizing: TradingImplications['positionSizing'] = 'reduced';
    let riskLevel: TradingImplications['riskLevel'] = 'medium';

    if (overallBias.bias === 'bullish') {
      if (overallBias.confidence > 0.7) {
        recommendedAction = 'aggressive_long';
        positionSizing = 'full';
        riskLevel = 'medium';
      } else if (overallBias.confidence > 0.5) {
        recommendedAction = 'cautious_long';
        positionSizing = 'reduced';
        riskLevel = 'medium';
      }
    } else if (overallBias.bias === 'bearish') {
      if (overallBias.confidence > 0.7) {
        recommendedAction = 'aggressive_short';
        positionSizing = 'full';
        riskLevel = 'high';
      } else if (overallBias.confidence > 0.5) {
        recommendedAction = 'cautious_short';
        positionSizing = 'reduced';
        riskLevel = 'medium';
      }
    }

    // Adjust for regime alignment
    if (snapshot.regime === 'BULL' && overallBias.bias === 'bearish') {
      riskLevel = 'high'; // Counter-trend is riskier
    } else if (snapshot.regime === 'BEAR' && overallBias.bias === 'bullish') {
      riskLevel = 'high';
    }

    return {
      recommendedAction,
      positionSizing,
      riskLevel,
      keyLevels: {
        support: signals.projectedLevels.support,
        resistance: signals.projectedLevels.resistance,
        targets: [signals.projectedLevels.projectedUpside, signals.projectedLevels.projectedDownside]
      }
    };
  }

  /**
   * Generate regime forecast
   */
  private generateRegimeForecast(
    signals: PredictiveSignals, 
    snapshot: MarketSnapshot
  ): RegimeForecast {
    const changeDrivers: string[] = [];
    const catalysts: string[] = [];

    // Identify change drivers
    if (signals.momentumDivergence.type !== 'none') {
      changeDrivers.push(`${signals.momentumDivergence.type} momentum divergence`);
    }

    if (signals.volumeAnalysis.thrust !== 'none') {
      changeDrivers.push(`Volume ${signals.volumeAnalysis.thrust} thrust`);
    }

    if (signals.optionsFlow.unusualActivity) {
      changeDrivers.push('Unusual options activity');
      catalysts.push('Large institutional positioning');
    }

    if (Math.abs(signals.optionsFlow.putCallRatio - 1) > 0.5) {
      catalysts.push('Extreme sentiment readings');
    }

    return {
      nextWeekProbabilities: signals.regimeProbability.nextWeek,
      nextMonthProbabilities: signals.regimeProbability.nextMonth,
      changeDrivers,
      catalysts
    };
  }

  /**
   * Extract key insights from analysis
   */
  private extractKeyInsights(
    signals: PredictiveSignals, 
    overallAnalysis: { bias: string; confidence: number; timeframe: string }
  ): string[] {
    const insights: string[] = [];

    // Overall bias insight
    if (overallAnalysis.confidence > 0.6) {
      insights.push(
        `Strong ${overallAnalysis.bias} bias with ${(overallAnalysis.confidence * 100).toFixed(0)}% confidence over ${overallAnalysis.timeframe}`
      );
    }

    // Divergence insights
    if (signals.momentumDivergence.type !== 'none') {
      insights.push(
        `${signals.momentumDivergence.type} momentum divergence detected with ${(signals.momentumDivergence.strength * 100).toFixed(0)}% strength`
      );
    }

    // Volume insights
    if (signals.volumeAnalysis.volumeSpike) {
      insights.push(
        `Volume spike detected (${signals.volumeAnalysis.volumeRatio.toFixed(1)}x normal) ${signals.volumeAnalysis.confirmation ? 'confirming' : 'without confirming'} price action`
      );
    }

    // Options insights
    if (signals.optionsFlow.unusualActivity) {
      insights.push(
        `Unusual options activity with ${signals.optionsFlow.bias} bias (P/C ratio: ${signals.optionsFlow.putCallRatio.toFixed(2)})`
      );
    }

    // Regime probability insights
    const maxProb = Math.max(
      signals.regimeProbability.nextWeek.BULL,
      signals.regimeProbability.nextWeek.BEAR,
      signals.regimeProbability.nextWeek.NEUTRAL
    );
    
    if (maxProb > 0.6) {
      const likelyRegime = signals.regimeProbability.nextWeek.BULL === maxProb ? 'BULL' :
                          signals.regimeProbability.nextWeek.BEAR === maxProb ? 'BEAR' : 'NEUTRAL';
      insights.push(
        `${(maxProb * 100).toFixed(0)}% probability of ${likelyRegime} regime next week`
      );
    }

    return insights;
  }

  // Helper methods for generating mock data and fallbacks

  private generateMockPriceHistory(currentPrice: number, periods: number): number[] {
    const prices = [currentPrice];
    for (let i = 1; i < periods; i++) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% random walk
      prices.unshift(prices[0] * (1 + change));
    }
    return prices;
  }

  private generateMockVolumeHistory(currentVolume: number, periods: number): number[] {
    const volumes = [currentVolume];
    for (let i = 1; i < periods; i++) {
      const change = (Math.random() - 0.5) * 0.3; // ±15% volume variation
      volumes.unshift(Math.max(1000000, volumes[0] * (1 + change)));
    }
    return volumes;
  }

  private calculateProbabilityAdjustments(
    divergence: MomentumDivergence,
    volume: VolumeAnalysis,
    options: OptionsFlow
  ): { bullish: number; bearish: number } {
    let bullishAdj = 0;
    let bearishAdj = 0;

    // Divergence adjustments
    if (divergence.type === 'bullish') {
      bullishAdj += divergence.strength * 0.2;
    } else if (divergence.type === 'bearish') {
      bearishAdj += divergence.strength * 0.2;
    }

    // Volume adjustments
    if (volume.thrust === 'up' && volume.confirmation) {
      bullishAdj += 0.15;
    } else if (volume.thrust === 'down' && volume.confirmation) {
      bearishAdj += 0.15;
    }

    // Options adjustments
    if (options.bias === 'bullish') {
      bullishAdj += options.confidence * 0.1;
    } else if (options.bias === 'bearish') {
      bearishAdj += options.confidence * 0.1;
    }

    return { bullish: bullishAdj, bearish: bearishAdj };
  }

  private createEmptyDivergence(): MomentumDivergence {
    return {
      type: 'none',
      strength: 0,
      timeframe: 'short',
      rsiDivergence: false,
      macdDivergence: false,
      hiddenDivergence: false,
      pricePoints: [],
      indicatorPoints: []
    };
  }

  private createEmptyVolumeAnalysis(): VolumeAnalysis {
    return {
      confirmation: false,
      thrust: 'none',
      exhaustion: false,
      volumeSpike: false,
      accumulationDistribution: 0,
      volumeRatio: 1,
      trend: 'stable'
    };
  }

  private createEmptyOptionsFlow(): OptionsFlow {
    return {
      bias: 'neutral',
      confidence: 0.5,
      unusualActivity: false,
      callVolume: 0,
      putVolume: 0,
      putCallRatio: 1,
      impliedVolatilityTrend: 'flat',
      largeBlockTrades: 0,
      forwardBias: 'neutral'
    };
  }

  private createEmptyProjectedLevels(currentPrice: number): ProjectedLevels {
    return {
      support: [currentPrice * 0.98, currentPrice * 0.96],
      resistance: [currentPrice * 1.02, currentPrice * 1.04],
      pivot: currentPrice,
      expectedMove: currentPrice * 0.02,
      projectedUpside: currentPrice * 1.02,
      projectedDownside: currentPrice * 0.98,
      expectedRange: [currentPrice * 0.98, currentPrice * 1.02]
    };
  }

  private createDefaultRegimeProbability(): RegimeProbability {
    return {
      nextWeek: { BULL: 0.33, BEAR: 0.33, NEUTRAL: 0.34 },
      nextMonth: { BULL: 0.33, BEAR: 0.33, NEUTRAL: 0.34 }
    };
  }

  private generateFallbackAnalysis(snapshot: MarketSnapshot): PredictiveAnalysis {
    const fallbackSignals: PredictiveSignals = {
      momentumDivergence: this.createEmptyDivergence(),
      volumeAnalysis: this.createEmptyVolumeAnalysis(),
      optionsFlow: this.createEmptyOptionsFlow(),
      projectedLevels: this.createEmptyProjectedLevels(snapshot.indexes.SPY.price),
      regimeProbability: this.createDefaultRegimeProbability()
    };

    return {
      signals: fallbackSignals,
      overallBias: 'neutral',
      confidence: 0.3,
      timeframe: '3-7 days',
      keyInsights: ['Predictive analysis unavailable - using fallback data'],
      tradingImplications: {
        recommendedAction: 'neutral',
        positionSizing: 'minimal',
        riskLevel: 'medium',
        keyLevels: {
          support: [snapshot.indexes.SPY.price * 0.98],
          resistance: [snapshot.indexes.SPY.price * 1.02],
          targets: []
        }
      },
      regimeForecast: {
        nextWeekProbabilities: { BULL: 0.33, BEAR: 0.33, NEUTRAL: 0.34 },
        nextMonthProbabilities: { BULL: 0.33, BEAR: 0.33, NEUTRAL: 0.34 },
        changeDrivers: [],
        catalysts: []
      }
    };
  }
}

// Export singleton instance
export const predictiveEngine = new PredictiveEngine();