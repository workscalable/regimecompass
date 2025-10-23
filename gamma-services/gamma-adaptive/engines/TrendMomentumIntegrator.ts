import { EventEmitter } from 'events';
import { TrendCompositeEngine, TrendCompositeResult } from './TrendCompositeEngine';
import { MomentumAnalysisEngine, MomentumDivergenceResult } from './MomentumAnalysisEngine';

/**
 * Trend Momentum Integrator - Combines trend composite and momentum analysis
 * Provides unified analysis with regime-aware adjustments and confidence scoring
 */
export class TrendMomentumIntegrator extends EventEmitter {
  private trendEngine: TrendCompositeEngine;
  private momentumEngine: MomentumAnalysisEngine;

  private readonly INTEGRATION_WEIGHTS = {
    TREND: 0.60,      // 60% weight for trend analysis
    MOMENTUM: 0.40    // 40% weight for momentum analysis
  };

  private readonly REGIME_ADJUSTMENTS = {
    TREND_MOMENTUM_ALIGNMENT: {
      STRONG_AGREEMENT: 1.2,    // Both trend and momentum strongly agree
      MODERATE_AGREEMENT: 1.1,  // Both trend and momentum moderately agree
      NEUTRAL: 1.0,             // Mixed or neutral signals
      DISAGREEMENT: 0.8,        // Trend and momentum disagree
      STRONG_DISAGREEMENT: 0.6  // Strong disagreement between trend and momentum
    }
  };

  constructor() {
    super();
    this.trendEngine = new TrendCompositeEngine();
    this.momentumEngine = new MomentumAnalysisEngine();

    // Forward events from child engines
    this.trendEngine.on('trend:calculated', (result) => {
      this.emit('trend:calculated', result);
    });

    this.momentumEngine.on('momentum:analyzed', (result) => {
      this.emit('momentum:analyzed', result);
    });
  }

  /**
   * Perform integrated trend and momentum analysis
   */
  public async analyzeIntegratedSignal(ticker: string): Promise<IntegratedAnalysisResult> {
    try {
      // Run both analyses concurrently
      const [trendResult, momentumResult] = await Promise.all([
        this.trendEngine.calculateTrendComposite(ticker),
        this.momentumEngine.analyzeMomentumDivergence(ticker)
      ]);

      // Calculate integrated confidence score
      const integratedConfidence = this.calculateIntegratedConfidence(trendResult, momentumResult);

      // Determine signal alignment and strength
      const alignment = this.calculateTrendMomentumAlignment(trendResult, momentumResult);
      const signalStrength = this.calculateSignalStrength(trendResult, momentumResult, alignment);

      // Apply regime-aware adjustments
      const regimeAdjustment = this.calculateRegimeAdjustment(trendResult, momentumResult, alignment);
      const adjustedConfidence = this.applyRegimeAdjustment(integratedConfidence, regimeAdjustment);

      // Determine overall signal direction
      const signalDirection = this.determineSignalDirection(trendResult, momentumResult, alignment);

      // Calculate risk-adjusted position sizing recommendation
      const positionSizing = this.calculatePositionSizing(adjustedConfidence, signalStrength, alignment);

      // Generate actionable insights
      const insights = this.generateActionableInsights(trendResult, momentumResult, alignment, adjustedConfidence);

      const result: IntegratedAnalysisResult = {
        ticker,
        integratedConfidence: Number(adjustedConfidence.toFixed(3)),
        signalDirection,
        signalStrength: Number(signalStrength.toFixed(3)),
        alignment: Number(alignment.toFixed(3)),
        positionSizing: Number(positionSizing.toFixed(3)),
        regimeAdjustment: Number(regimeAdjustment.toFixed(3)),
        trendAnalysis: trendResult,
        momentumAnalysis: momentumResult,
        insights,
        timestamp: new Date()
      };

      this.emit('integrated:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error in integrated analysis for ${ticker}:`, error);
      return this.getDefaultIntegratedResult(ticker);
    }
  }

  /**
   * Calculate integrated confidence from trend and momentum analysis
   */
  private calculateIntegratedConfidence(trend: TrendCompositeResult, momentum: MomentumDivergenceResult): number {
    // Weight trend and momentum confidence scores
    const trendConfidence = this.normalizeTrendConfidence(trend);
    const momentumConfidence = momentum.confidence;

    const weightedConfidence = 
      (trendConfidence * this.INTEGRATION_WEIGHTS.TREND) +
      (momentumConfidence * this.INTEGRATION_WEIGHTS.MOMENTUM);

    return Math.max(0, Math.min(1, weightedConfidence));
  }

  /**
   * Normalize trend confidence to 0-1 scale
   */
  private normalizeTrendConfidence(trend: TrendCompositeResult): number {
    // Combine trend quality and strength for confidence
    const qualityWeight = 0.6;
    const strengthWeight = 0.4;
    
    return (trend.quality * qualityWeight) + (trend.strength * strengthWeight);
  }

  /**
   * Calculate alignment between trend and momentum signals
   */
  private calculateTrendMomentumAlignment(trend: TrendCompositeResult, momentum: MomentumDivergenceResult): number {
    // Convert trend direction to numerical score
    const trendScore = this.getTrendDirectionScore(trend.direction);
    
    // Convert momentum divergence to numerical score
    const momentumScore = this.getMomentumDivergenceScore(momentum.divergenceType);
    
    // Calculate alignment (1.0 = perfect agreement, 0.0 = perfect disagreement)
    const alignment = 1 - Math.abs(trendScore - momentumScore);
    
    // Factor in momentum alignment within indicators
    const momentumInternalAlignment = momentum.alignment;
    
    // Weighted combination
    return (alignment * 0.7) + (momentumInternalAlignment * 0.3);
  }

  /**
   * Convert trend direction to numerical score
   */
  private getTrendDirectionScore(direction: string): number {
    switch (direction) {
      case 'BULLISH': return 1.0;
      case 'BEARISH': return 0.0;
      case 'NEUTRAL': return 0.5;
      default: return 0.5;
    }
  }

  /**
   * Convert momentum divergence type to numerical score
   */
  private getMomentumDivergenceScore(divergenceType: string): number {
    switch (divergenceType) {
      case 'BULLISH': return 1.0;
      case 'BEARISH': return 0.0;
      case 'NONE': return 0.5;
      default: return 0.5;
    }
  }

  /**
   * Calculate overall signal strength
   */
  private calculateSignalStrength(trend: TrendCompositeResult, momentum: MomentumDivergenceResult, alignment: number): number {
    // Base strength from trend and momentum
    const trendStrength = trend.strength;
    const momentumStrength = momentum.strength;
    
    // Weighted combination
    const baseStrength = 
      (trendStrength * this.INTEGRATION_WEIGHTS.TREND) +
      (momentumStrength * this.INTEGRATION_WEIGHTS.MOMENTUM);
    
    // Boost strength when trend and momentum align
    const alignmentBoost = alignment * 0.3;
    
    return Math.max(0, Math.min(1, baseStrength + alignmentBoost));
  }

  /**
   * Calculate regime adjustment factor
   */
  private calculateRegimeAdjustment(trend: TrendCompositeResult, momentum: MomentumDivergenceResult, alignment: number): number {
    // Determine agreement level
    const agreementLevel = this.determineAgreementLevel(trend, momentum, alignment);
    
    // Get base adjustment from agreement level
    const baseAdjustment = this.REGIME_ADJUSTMENTS.TREND_MOMENTUM_ALIGNMENT[agreementLevel];
    
    // Factor in regime contexts
    const trendRegimeAdjustment = trend.regimeAdjustment;
    const momentumRegimeContext = this.getMomentumRegimeAdjustment(momentum.regimeContext);
    
    // Combine adjustments
    const combinedAdjustment = baseAdjustment + (trendRegimeAdjustment * 0.3) + (momentumRegimeContext * 0.2);
    
    return Math.max(0.5, Math.min(1.5, combinedAdjustment)); // Limit adjustment range
  }

  /**
   * Determine agreement level between trend and momentum
   */
  private determineAgreementLevel(trend: TrendCompositeResult, momentum: MomentumDivergenceResult, alignment: number): keyof typeof this.REGIME_ADJUSTMENTS.TREND_MOMENTUM_ALIGNMENT {
    const trendStrong = trend.strength > 0.7 && trend.quality > 0.7;
    const momentumStrong = momentum.strength > 0.7 && momentum.confidence > 0.7;
    
    if (alignment > 0.8) {
      return trendStrong && momentumStrong ? 'STRONG_AGREEMENT' : 'MODERATE_AGREEMENT';
    } else if (alignment > 0.6) {
      return 'MODERATE_AGREEMENT';
    } else if (alignment > 0.4) {
      return 'NEUTRAL';
    } else if (alignment > 0.2) {
      return 'DISAGREEMENT';
    } else {
      return 'STRONG_DISAGREEMENT';
    }
  }

  /**
   * Get momentum regime adjustment
   */
  private getMomentumRegimeAdjustment(regime: string): number {
    const adjustments: Record<string, number> = {
      'OVERBOUGHT': -0.1,  // Reduce confidence in overbought conditions
      'OVERSOLD': 0.1,     // Increase confidence in oversold conditions
      'BULLISH': 0.05,     // Slight boost in bullish momentum
      'BEARISH': -0.05,    // Slight reduction in bearish momentum
      'NEUTRAL': 0.0       // No adjustment
    };
    
    return adjustments[regime] || 0.0;
  }

  /**
   * Apply regime adjustment to confidence
   */
  private applyRegimeAdjustment(confidence: number, adjustment: number): number {
    return Math.max(0, Math.min(1, confidence * adjustment));
  }

  /**
   * Determine overall signal direction
   */
  private determineSignalDirection(trend: TrendCompositeResult, momentum: MomentumDivergenceResult, alignment: number): SignalDirection {
    const trendScore = this.getTrendDirectionScore(trend.direction);
    const momentumScore = this.getMomentumDivergenceScore(momentum.divergenceType);
    
    // Weight by confidence and alignment
    const trendWeight = this.normalizeTrendConfidence(trend) * alignment;
    const momentumWeight = momentum.confidence * alignment;
    
    const weightedScore = 
      (trendScore * trendWeight + momentumScore * momentumWeight) / 
      (trendWeight + momentumWeight || 1);
    
    if (weightedScore > 0.6) {
      return 'BULLISH';
    } else if (weightedScore < 0.4) {
      return 'BEARISH';
    } else {
      return 'NEUTRAL';
    }
  }

  /**
   * Calculate position sizing recommendation
   */
  private calculatePositionSizing(confidence: number, strength: number, alignment: number): number {
    // Base position size from confidence
    let positionSize = confidence;
    
    // Adjust for signal strength
    positionSize *= (0.5 + (strength * 0.5)); // Scale by strength
    
    // Adjust for alignment
    positionSize *= (0.7 + (alignment * 0.3)); // Boost when aligned
    
    // Apply conservative scaling (max 80% of calculated size)
    positionSize *= 0.8;
    
    return Math.max(0.1, Math.min(1.0, positionSize)); // Ensure reasonable range
  }

  /**
   * Generate actionable insights
   */
  private generateActionableInsights(
    trend: TrendCompositeResult, 
    momentum: MomentumDivergenceResult, 
    alignment: number, 
    confidence: number
  ): ActionableInsights {
    const insights: ActionableInsights = {
      primarySignal: this.getPrimarySignalInsight(trend, momentum, alignment),
      riskFactors: this.identifyRiskFactors(trend, momentum, alignment),
      opportunities: this.identifyOpportunities(trend, momentum, confidence),
      recommendations: this.generateRecommendations(trend, momentum, alignment, confidence)
    };
    
    return insights;
  }

  /**
   * Get primary signal insight
   */
  private getPrimarySignalInsight(trend: TrendCompositeResult, momentum: MomentumDivergenceResult, alignment: number): string {
    if (alignment > 0.7) {
      if (trend.direction === 'BULLISH' && momentum.divergenceType === 'BULLISH') {
        return `Strong bullish confluence: Trend analysis shows ${trend.direction.toLowerCase()} direction with ${(trend.strength * 100).toFixed(0)}% strength, while momentum shows ${momentum.divergenceType.toLowerCase()} divergence with ${(momentum.confidence * 100).toFixed(0)}% confidence.`;
      } else if (trend.direction === 'BEARISH' && momentum.divergenceType === 'BEARISH') {
        return `Strong bearish confluence: Trend analysis shows ${trend.direction.toLowerCase()} direction with ${(trend.strength * 100).toFixed(0)}% strength, while momentum shows ${momentum.divergenceType.toLowerCase()} divergence with ${(momentum.confidence * 100).toFixed(0)}% confidence.`;
      }
    } else if (alignment < 0.4) {
      return `Conflicting signals: Trend analysis suggests ${trend.direction.toLowerCase()} direction while momentum shows ${momentum.divergenceType.toLowerCase()} divergence. Exercise caution.`;
    }
    
    return `Mixed signals: Trend shows ${trend.direction.toLowerCase()} bias with ${(trend.quality * 100).toFixed(0)}% quality, momentum analysis shows ${momentum.divergenceType.toLowerCase()} divergence.`;
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(trend: TrendCompositeResult, momentum: MomentumDivergenceResult, alignment: number): string[] {
    const risks: string[] = [];
    
    if (alignment < 0.5) {
      risks.push('Trend and momentum signals are not aligned, increasing uncertainty');
    }
    
    if (trend.quality < 0.5) {
      risks.push('Trend quality is below average, indicating inconsistent price action');
    }
    
    if (momentum.confidence < 0.5) {
      risks.push('Momentum divergence confidence is low, signals may be unreliable');
    }
    
    if (momentum.regimeContext === 'OVERBOUGHT') {
      risks.push('Momentum indicators are in overbought territory, potential for reversal');
    } else if (momentum.regimeContext === 'OVERSOLD') {
      risks.push('Momentum indicators are in oversold territory, potential for bounce');
    }
    
    if (trend.regimeAdjustment < -0.05) {
      risks.push('Current market regime is unfavorable for trend-following strategies');
    }
    
    return risks;
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(trend: TrendCompositeResult, momentum: MomentumDivergenceResult, confidence: number): string[] {
    const opportunities: string[] = [];
    
    if (confidence > 0.7) {
      opportunities.push('High confidence signal presents strong trading opportunity');
    }
    
    if (trend.strength > 0.7 && trend.quality > 0.7) {
      opportunities.push('Strong, high-quality trend provides good trend-following opportunity');
    }
    
    if (momentum.divergenceType !== 'NONE' && momentum.confidence > 0.6) {
      opportunities.push(`${momentum.divergenceType.toLowerCase()} momentum divergence suggests potential reversal opportunity`);
    }
    
    if (momentum.alignment > 0.8) {
      opportunities.push('Strong momentum indicator alignment increases signal reliability');
    }
    
    return opportunities;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    trend: TrendCompositeResult, 
    momentum: MomentumDivergenceResult, 
    alignment: number, 
    confidence: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (confidence > 0.7 && alignment > 0.7) {
      recommendations.push('Consider taking a position in line with the signal direction');
      recommendations.push('Use standard position sizing given high confidence');
    } else if (confidence > 0.5 && alignment > 0.5) {
      recommendations.push('Consider a smaller position size due to moderate confidence');
      recommendations.push('Monitor for confirmation from additional indicators');
    } else {
      recommendations.push('Wait for better signal alignment before taking positions');
      recommendations.push('Consider this a monitoring situation rather than trading opportunity');
    }
    
    if (momentum.regimeContext === 'OVERBOUGHT' || momentum.regimeContext === 'OVERSOLD') {
      recommendations.push(`Monitor for potential reversal given ${momentum.regimeContext.toLowerCase()} conditions`);
    }
    
    recommendations.push('Set appropriate stop losses based on recent support/resistance levels');
    recommendations.push('Consider scaling into positions if signal strengthens');
    
    return recommendations;
  }

  /**
   * Get default integrated result for error cases
   */
  private getDefaultIntegratedResult(ticker: string): IntegratedAnalysisResult {
    return {
      ticker,
      integratedConfidence: 0.3,
      signalDirection: 'NEUTRAL',
      signalStrength: 0.3,
      alignment: 0.5,
      positionSizing: 0.2,
      regimeAdjustment: 1.0,
      trendAnalysis: {
        ticker,
        composite: 0.5,
        strength: 0.3,
        direction: 'NEUTRAL',
        quality: 0.3,
        timeframeBreakdown: {},
        regimeAdjustment: 0.0,
        timestamp: new Date()
      },
      momentumAnalysis: {
        ticker,
        compositeScore: 0.5,
        divergenceType: 'NONE',
        strength: 0,
        confidence: 0.3,
        alignment: 0.5,
        regimeContext: 'NEUTRAL',
        indicators: {
          rsi: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' },
          stochastic: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' },
          cci: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' },
          williamsR: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' },
          macd: { type: 'NONE', strength: 0, confidence: 0, description: 'No data' }
        },
        momentumValues: {
          rsi: 50, stochasticK: 50, stochasticD: 50, cci: 0, williamsR: -50,
          macdLine: 0, macdSignal: 0, macdHistogram: 0
        },
        timestamp: new Date()
      },
      insights: {
        primarySignal: 'Insufficient data for analysis',
        riskFactors: ['No reliable data available'],
        opportunities: [],
        recommendations: ['Wait for data availability before trading']
      },
      timestamp: new Date()
    };
  }
}

// Supporting interfaces
export interface IntegratedAnalysisResult {
  ticker: string;
  integratedConfidence: number;
  signalDirection: SignalDirection;
  signalStrength: number;
  alignment: number;
  positionSizing: number;
  regimeAdjustment: number;
  trendAnalysis: TrendCompositeResult;
  momentumAnalysis: MomentumDivergenceResult;
  insights: ActionableInsights;
  timestamp: Date;
}

export interface ActionableInsights {
  primarySignal: string;
  riskFactors: string[];
  opportunities: string[];
  recommendations: string[];
}

export type SignalDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';