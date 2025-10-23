import { EventEmitter } from 'events';
import { VolumeProfileEngine, VolumeProfileResult } from './VolumeProfileEngine';
import { RibbonAlignmentEngine, RibbonAlignmentResult } from './RibbonAlignmentEngine';

/**
 * Volume Ribbon Integrator - Combines volume profile and ribbon alignment analysis
 * Provides unified analysis with volume-price-trend relationship insights
 */
export class VolumeRibbonIntegrator extends EventEmitter {
  private volumeEngine: VolumeProfileEngine;
  private ribbonEngine: RibbonAlignmentEngine;

  private readonly INTEGRATION_WEIGHTS = {
    VOLUME: 0.50,     // 50% weight for volume analysis
    RIBBON: 0.50      // 50% weight for ribbon alignment
  };

  private readonly CONFLUENCE_MULTIPLIERS = {
    STRONG_CONFLUENCE: 1.3,      // Volume and ribbon strongly agree
    MODERATE_CONFLUENCE: 1.1,    // Volume and ribbon moderately agree
    NEUTRAL: 1.0,                // Mixed or neutral signals
    WEAK_CONFLUENCE: 0.9,        // Some disagreement
    DIVERGENCE: 0.7              // Volume and ribbon disagree
  };

  constructor() {
    super();
    this.volumeEngine = new VolumeProfileEngine();
    this.ribbonEngine = new RibbonAlignmentEngine();

    // Forward events from child engines
    this.volumeEngine.on('volume:analyzed', (result) => {
      this.emit('volume:analyzed', result);
    });

    this.ribbonEngine.on('ribbon:analyzed', (result) => {
      this.emit('ribbon:analyzed', result);
    });
  }

  /**
   * Perform integrated volume profile and ribbon alignment analysis
   */
  public async analyzeVolumeRibbonIntegration(ticker: string): Promise<VolumeRibbonIntegrationResult> {
    try {
      // Run both analyses concurrently
      const [volumeResult, ribbonResult] = await Promise.all([
        this.volumeEngine.assessVolumeProfile(ticker),
        this.ribbonEngine.measureRibbonAlignment(ticker)
      ]);

      // Calculate integrated confidence score
      const integratedConfidence = this.calculateIntegratedConfidence(volumeResult, ribbonResult);

      // Analyze volume-ribbon confluence
      const confluence = this.analyzeVolumeRibbonConfluence(volumeResult, ribbonResult);

      // Calculate signal strength with confluence adjustment
      const signalStrength = this.calculateSignalStrength(volumeResult, ribbonResult, confluence);

      // Determine overall signal direction
      const signalDirection = this.determineSignalDirection(volumeResult, ribbonResult, confluence);

      // Analyze institutional vs technical alignment
      const institutionalTechnicalAlignment = this.analyzeInstitutionalTechnicalAlignment(volumeResult, ribbonResult);

      // Calculate volume-price-trend relationship strength
      const volumePriceTrendStrength = this.calculateVolumePriceTrendStrength(volumeResult, ribbonResult);

      // Generate trading insights
      const tradingInsights = this.generateTradingInsights(volumeResult, ribbonResult, confluence, integratedConfidence);

      // Calculate risk assessment
      const riskAssessment = this.calculateRiskAssessment(volumeResult, ribbonResult, confluence);

      const result: VolumeRibbonIntegrationResult = {
        ticker,
        integratedConfidence: Number(integratedConfidence.toFixed(3)),
        signalDirection,
        signalStrength: Number(signalStrength.toFixed(3)),
        confluence: Number(confluence.toFixed(3)),
        institutionalTechnicalAlignment: Number(institutionalTechnicalAlignment.toFixed(3)),
        volumePriceTrendStrength: Number(volumePriceTrendStrength.toFixed(3)),
        volumeAnalysis: volumeResult,
        ribbonAnalysis: ribbonResult,
        tradingInsights,
        riskAssessment,
        timestamp: new Date()
      };

      this.emit('volume-ribbon:integrated', result);
      return result;

    } catch (error) {
      console.error(`Error in volume-ribbon integration for ${ticker}:`, error);
      return this.getDefaultIntegrationResult(ticker);
    }
  }

  /**
   * Calculate integrated confidence from volume and ribbon analysis
   */
  private calculateIntegratedConfidence(volume: VolumeProfileResult, ribbon: RibbonAlignmentResult): number {
    // Weight volume and ribbon confidence scores
    const volumeConfidence = volume.confidence;
    const ribbonConfidence = ribbon.confidence;

    const baseConfidence = 
      (volumeConfidence * this.INTEGRATION_WEIGHTS.VOLUME) +
      (ribbonConfidence * this.INTEGRATION_WEIGHTS.RIBBON);

    // Boost confidence when both analyses are strong
    const strengthBonus = Math.min(0.2, (volumeConfidence * ribbonConfidence) * 0.3);

    return Math.max(0, Math.min(1, baseConfidence + strengthBonus));
  }

  /**
   * Analyze confluence between volume and ribbon signals
   */
  private analyzeVolumeRibbonConfluence(volume: VolumeProfileResult, ribbon: RibbonAlignmentResult): number {
    let confluenceScore = 0.5; // Start neutral

    // Volume distribution vs ribbon direction alignment
    const volumeBullish = volume.volumeProfile.volumeDistribution === 'BULLISH_SKEW';
    const volumeBearish = volume.volumeProfile.volumeDistribution === 'BEARISH_SKEW';
    const ribbonBullish = ribbon.ribbonDirection === 'BULLISH';
    const ribbonBearish = ribbon.ribbonDirection === 'BEARISH';

    if ((volumeBullish && ribbonBullish) || (volumeBearish && ribbonBearish)) {
      confluenceScore += 0.2; // Strong directional agreement
    } else if ((volumeBullish && ribbonBearish) || (volumeBearish && ribbonBullish)) {
      confluenceScore -= 0.2; // Directional disagreement
    }

    // Institutional flow vs ribbon strength alignment
    const institutionalStrong = volume.institutionalFlow.strength > 0.7;
    const ribbonStrong = ribbon.ribbonStrength > 0.7;

    if (institutionalStrong && ribbonStrong) {
      confluenceScore += 0.15; // Both show strong signals
    } else if (!institutionalStrong && !ribbonStrong) {
      confluenceScore -= 0.1; // Both show weak signals
    }

    // Volume regime vs ribbon regime alignment
    const volumeRegimeScore = this.getVolumeRegimeScore(volume.volumeRegime);
    const ribbonRegimeScore = this.getRibbonRegimeScore(ribbon.ribbonRegime);
    const regimeAlignment = 1 - Math.abs(volumeRegimeScore - ribbonRegimeScore);
    confluenceScore += (regimeAlignment - 0.5) * 0.15;

    // Price-volume confirmation vs ribbon alignment
    if (volume.volumePriceRelationship.priceVolumeConfirmation === 'STRONG_CONFIRMATION' && 
        ribbon.compositeAlignment > 0.7) {
      confluenceScore += 0.1;
    } else if (volume.volumePriceRelationship.priceVolumeConfirmation === 'DIVERGENCE' && 
               ribbon.compositeAlignment < 0.4) {
      confluenceScore -= 0.1;
    }

    return Math.max(0, Math.min(1, confluenceScore));
  }

  /**
   * Get volume regime score for comparison
   */
  private getVolumeRegimeScore(regime: string): number {
    const scores: Record<string, number> = {
      'ACCUMULATION': 0.8,
      'DISTRIBUTION': 0.2,
      'CLIMAX': 0.6,
      'LOW_VOLUME': 0.4,
      'NORMAL': 0.5
    };
    return scores[regime] || 0.5;
  }

  /**
   * Get ribbon regime score for comparison
   */
  private getRibbonRegimeScore(regime: string): number {
    const scores: Record<string, number> = {
      'STRONG_TREND': 0.9,
      'MODERATE_TREND': 0.7,
      'COMPRESSION': 0.3,
      'EXPANSION': 0.6,
      'CHOPPY': 0.2,
      'TRANSITIONAL': 0.5
    };
    return scores[regime] || 0.5;
  }

  /**
   * Calculate overall signal strength with confluence adjustment
   */
  private calculateSignalStrength(
    volume: VolumeProfileResult, 
    ribbon: RibbonAlignmentResult, 
    confluence: number
  ): number {
    // Base strength from volume and ribbon
    const volumeStrength = (volume.compositeScore - 0.5) * 2; // Normalize to -1 to 1
    const ribbonStrength = (ribbon.compositeAlignment - 0.5) * 2; // Normalize to -1 to 1

    // Weighted combination
    const baseStrength = Math.abs(
      (volumeStrength * this.INTEGRATION_WEIGHTS.VOLUME) +
      (ribbonStrength * this.INTEGRATION_WEIGHTS.RIBBON)
    );

    // Apply confluence multiplier
    const confluenceMultiplier = this.getConfluenceMultiplier(confluence);
    const adjustedStrength = baseStrength * confluenceMultiplier;

    return Math.max(0, Math.min(1, adjustedStrength));
  }

  /**
   * Get confluence multiplier
   */
  private getConfluenceMultiplier(confluence: number): number {
    if (confluence > 0.8) {
      return this.CONFLUENCE_MULTIPLIERS.STRONG_CONFLUENCE;
    } else if (confluence > 0.6) {
      return this.CONFLUENCE_MULTIPLIERS.MODERATE_CONFLUENCE;
    } else if (confluence > 0.4) {
      return this.CONFLUENCE_MULTIPLIERS.NEUTRAL;
    } else if (confluence > 0.2) {
      return this.CONFLUENCE_MULTIPLIERS.WEAK_CONFLUENCE;
    } else {
      return this.CONFLUENCE_MULTIPLIERS.DIVERGENCE;
    }
  }

  /**
   * Determine overall signal direction
   */
  private determineSignalDirection(
    volume: VolumeProfileResult, 
    ribbon: RibbonAlignmentResult, 
    confluence: number
  ): SignalDirection {
    // Get directional scores
    const volumeScore = this.getVolumeDirectionScore(volume);
    const ribbonScore = this.getRibbonDirectionScore(ribbon);

    // Weight by confidence and confluence
    const volumeWeight = volume.confidence * confluence;
    const ribbonWeight = ribbon.confidence * confluence;

    const weightedScore = 
      (volumeScore * volumeWeight + ribbonScore * ribbonWeight) / 
      (volumeWeight + ribbonWeight || 1);

    if (weightedScore > 0.6) {
      return 'BULLISH';
    } else if (weightedScore < 0.4) {
      return 'BEARISH';
    } else {
      return 'NEUTRAL';
    }
  }

  /**
   * Get volume direction score
   */
  private getVolumeDirectionScore(volume: VolumeProfileResult): number {
    let score = 0.5;

    // Volume distribution
    if (volume.volumeProfile.volumeDistribution === 'BULLISH_SKEW') {
      score += 0.2;
    } else if (volume.volumeProfile.volumeDistribution === 'BEARISH_SKEW') {
      score -= 0.2;
    }

    // Institutional bias
    if (volume.institutionalFlow.institutionalBias === 'BULLISH') {
      score += 0.15;
    } else if (volume.institutionalFlow.institutionalBias === 'BEARISH') {
      score -= 0.15;
    }

    // Volume regime
    if (volume.volumeRegime === 'ACCUMULATION') {
      score += 0.15;
    } else if (volume.volumeRegime === 'DISTRIBUTION') {
      score -= 0.15;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get ribbon direction score
   */
  private getRibbonDirectionScore(ribbon: RibbonAlignmentResult): number {
    let score = 0.5;

    // Ribbon direction
    if (ribbon.ribbonDirection === 'BULLISH') {
      score += 0.3;
    } else if (ribbon.ribbonDirection === 'BEARISH') {
      score -= 0.3;
    }

    // Ribbon momentum
    if (ribbon.ribbonMomentum > 0.1) {
      score += 0.1;
    } else if (ribbon.ribbonMomentum < -0.1) {
      score -= 0.1;
    }

    // Ribbon regime
    if (ribbon.ribbonRegime === 'STRONG_TREND' || ribbon.ribbonRegime === 'MODERATE_TREND') {
      score += 0.1;
    } else if (ribbon.ribbonRegime === 'CHOPPY') {
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze institutional vs technical alignment
   */
  private analyzeInstitutionalTechnicalAlignment(
    volume: VolumeProfileResult, 
    ribbon: RibbonAlignmentResult
  ): number {
    // Institutional signals from volume
    const institutionalStrength = volume.institutionalFlow.strength;
    const institutionalBias = volume.institutionalFlow.institutionalBias;

    // Technical signals from ribbon
    const technicalStrength = ribbon.ribbonStrength;
    const technicalDirection = ribbon.ribbonDirection;

    // Check directional alignment
    let alignment = 0.5;
    if ((institutionalBias === 'BULLISH' && technicalDirection === 'BULLISH') ||
        (institutionalBias === 'BEARISH' && technicalDirection === 'BEARISH')) {
      alignment += 0.3;
    } else if ((institutionalBias === 'BULLISH' && technicalDirection === 'BEARISH') ||
               (institutionalBias === 'BEARISH' && technicalDirection === 'BULLISH')) {
      alignment -= 0.3;
    }

    // Factor in strength correlation
    const strengthCorrelation = 1 - Math.abs(institutionalStrength - technicalStrength);
    alignment += (strengthCorrelation - 0.5) * 0.2;

    return Math.max(0, Math.min(1, alignment));
  }

  /**
   * Calculate volume-price-trend relationship strength
   */
  private calculateVolumePriceTrendStrength(
    volume: VolumeProfileResult, 
    ribbon: RibbonAlignmentResult
  ): number {
    // Volume-price relationship
    const volumePriceStrength = this.getVolumePriceStrength(volume.volumePriceRelationship.priceVolumeConfirmation);
    
    // Trend strength from ribbon
    const trendStrength = ribbon.ribbonStrength;
    
    // Volume efficiency
    const volumeEfficiency = volume.volumePriceRelationship.volumeEfficiency;
    
    // Ribbon quality
    const ribbonQuality = ribbon.ribbonQuality;

    // Combined strength
    return (volumePriceStrength * 0.3 + trendStrength * 0.3 + volumeEfficiency * 0.2 + ribbonQuality * 0.2);
  }

  /**
   * Get volume-price strength score
   */
  private getVolumePriceStrength(confirmation: string): number {
    const scores: Record<string, number> = {
      'STRONG_CONFIRMATION': 0.9,
      'MODERATE_CONFIRMATION': 0.7,
      'NEUTRAL': 0.5,
      'DIVERGENCE': 0.2
    };
    return scores[confirmation] || 0.5;
  }

  /**
   * Generate trading insights
   */
  private generateTradingInsights(
    volume: VolumeProfileResult,
    ribbon: RibbonAlignmentResult,
    confluence: number,
    confidence: number
  ): TradingInsights {
    const insights: TradingInsights = {
      primarySignal: this.getPrimarySignalInsight(volume, ribbon, confluence),
      volumeInsights: this.getVolumeInsights(volume),
      ribbonInsights: this.getRibbonInsights(ribbon),
      confluenceInsights: this.getConfluenceInsights(confluence, confidence),
      tradingRecommendations: this.getTradingRecommendations(volume, ribbon, confluence, confidence)
    };

    return insights;
  }

  /**
   * Get primary signal insight
   */
  private getPrimarySignalInsight(
    volume: VolumeProfileResult,
    ribbon: RibbonAlignmentResult,
    confluence: number
  ): string {
    if (confluence > 0.7) {
      const direction = volume.institutionalFlow.institutionalBias === 'BULLISH' ? 'bullish' : 'bearish';
      return `Strong ${direction} confluence: Volume shows ${volume.institutionalFlow.pattern.toLowerCase()} with ${(volume.institutionalFlow.strength * 100).toFixed(0)}% strength, while ribbon alignment is ${(ribbon.compositeAlignment * 100).toFixed(0)}% with ${ribbon.ribbonDirection.toLowerCase()} bias.`;
    } else if (confluence < 0.4) {
      return `Conflicting signals: Volume analysis suggests ${volume.institutionalFlow.institutionalBias.toLowerCase()} bias while ribbon shows ${ribbon.ribbonDirection.toLowerCase()} alignment. Exercise caution.`;
    } else {
      return `Mixed signals: Volume regime is ${volume.volumeRegime.toLowerCase()} with ${(volume.confidence * 100).toFixed(0)}% confidence, ribbon regime is ${ribbon.ribbonRegime.toLowerCase()} with ${(ribbon.confidence * 100).toFixed(0)}% confidence.`;
    }
  }

  /**
   * Get volume insights
   */
  private getVolumeInsights(volume: VolumeProfileResult): string[] {
    const insights: string[] = [];

    if (volume.institutionalFlow.strength > 0.7) {
      insights.push(`Strong institutional ${volume.institutionalFlow.pattern.toLowerCase()} detected with ${volume.institutionalFlow.volumeSpikes.length} volume spikes`);
    }

    if (volume.volumeProfile.volumeDistribution !== 'BALANCED') {
      insights.push(`Volume distribution shows ${volume.volumeProfile.volumeDistribution.toLowerCase().replace('_', ' ')} indicating directional bias`);
    }

    if (volume.volumePriceRelationship.priceVolumeConfirmation === 'STRONG_CONFIRMATION') {
      insights.push('Strong price-volume confirmation supports current trend direction');
    } else if (volume.volumePriceRelationship.priceVolumeConfirmation === 'DIVERGENCE') {
      insights.push('Price-volume divergence suggests potential trend weakness');
    }

    if (volume.institutionalFlow.darkPoolActivity > 0.6) {
      insights.push(`High dark pool activity (${(volume.institutionalFlow.darkPoolActivity * 100).toFixed(0)}%) suggests institutional positioning`);
    }

    return insights;
  }

  /**
   * Get ribbon insights
   */
  private getRibbonInsights(ribbon: RibbonAlignmentResult): string[] {
    const insights: string[] = [];

    if (ribbon.compositeAlignment > 0.8) {
      insights.push(`Excellent ribbon alignment (${(ribbon.compositeAlignment * 100).toFixed(0)}%) across multiple timeframes`);
    } else if (ribbon.compositeAlignment < 0.4) {
      insights.push('Poor ribbon alignment suggests choppy or transitional market conditions');
    }

    if (ribbon.ribbonStrength > 0.7) {
      insights.push(`Strong trend strength (${(ribbon.ribbonStrength * 100).toFixed(0)}%) supports directional moves`);
    }

    if (ribbon.convergenceAnalysis.type === 'STRONG_CONVERGENCE') {
      insights.push('Ribbon convergence suggests potential breakout or trend acceleration');
    } else if (ribbon.convergenceAnalysis.type === 'DIVERGENCE') {
      insights.push('Ribbon divergence indicates trend maturity or potential reversal');
    }

    if (Math.abs(ribbon.ribbonMomentum) > 0.1) {
      const direction = ribbon.ribbonMomentum > 0 ? 'bullish' : 'bearish';
      insights.push(`Strong ${direction} ribbon momentum (${(ribbon.ribbonMomentum * 100).toFixed(1)}%) detected`);
    }

    return insights;
  }

  /**
   * Get confluence insights
   */
  private getConfluenceInsights(confluence: number, confidence: number): string[] {
    const insights: string[] = [];

    if (confluence > 0.7 && confidence > 0.7) {
      insights.push('High confluence and confidence create strong trading opportunity');
    } else if (confluence < 0.4) {
      insights.push('Low confluence between volume and ribbon suggests waiting for better setup');
    }

    if (confluence > 0.6) {
      insights.push('Volume and technical analysis are in agreement, increasing signal reliability');
    }

    return insights;
  }

  /**
   * Get trading recommendations
   */
  private getTradingRecommendations(
    volume: VolumeProfileResult,
    ribbon: RibbonAlignmentResult,
    confluence: number,
    confidence: number
  ): string[] {
    const recommendations: string[] = [];

    if (confluence > 0.7 && confidence > 0.7) {
      recommendations.push('Consider taking positions in line with the signal direction');
      recommendations.push('Use standard position sizing given high confluence and confidence');
    } else if (confluence > 0.5 && confidence > 0.5) {
      recommendations.push('Consider smaller position sizes due to moderate confluence');
      recommendations.push('Wait for additional confirmation before increasing exposure');
    } else {
      recommendations.push('Avoid new positions until volume and ribbon signals align better');
      recommendations.push('Focus on risk management and position monitoring');
    }

    // Volume-specific recommendations
    if (volume.volumeRegime === 'CLIMAX') {
      recommendations.push('Monitor for potential reversal given climax volume conditions');
    } else if (volume.volumeRegime === 'LOW_VOLUME') {
      recommendations.push('Exercise caution due to low volume environment');
    }

    // Ribbon-specific recommendations
    if (ribbon.ribbonRegime === 'COMPRESSION') {
      recommendations.push('Prepare for potential breakout as ribbon compression often precedes strong moves');
    } else if (ribbon.ribbonRegime === 'CHOPPY') {
      recommendations.push('Avoid trend-following strategies in current choppy conditions');
    }

    recommendations.push('Set stops based on volume profile support/resistance levels');
    recommendations.push('Monitor ribbon alignment changes for trend continuation or reversal signals');

    return recommendations;
  }

  /**
   * Calculate risk assessment
   */
  private calculateRiskAssessment(
    volume: VolumeProfileResult,
    ribbon: RibbonAlignmentResult,
    confluence: number
  ): RiskAssessment {
    let riskScore = 0.5; // Start neutral

    // Reduce risk for high confluence
    if (confluence > 0.7) {
      riskScore -= 0.2;
    } else if (confluence < 0.4) {
      riskScore += 0.2;
    }

    // Adjust for volume regime
    if (volume.volumeRegime === 'CLIMAX') {
      riskScore += 0.15; // Higher risk in climax conditions
    } else if (volume.volumeRegime === 'LOW_VOLUME') {
      riskScore += 0.1; // Moderate risk in low volume
    }

    // Adjust for ribbon regime
    if (ribbon.ribbonRegime === 'CHOPPY') {
      riskScore += 0.15; // Higher risk in choppy conditions
    } else if (ribbon.ribbonRegime === 'STRONG_TREND') {
      riskScore -= 0.1; // Lower risk in strong trends
    }

    // Adjust for institutional flow
    if (volume.institutionalFlow.strength > 0.7) {
      riskScore -= 0.1; // Lower risk with strong institutional flow
    }

    const finalRiskScore = Math.max(0.1, Math.min(0.9, riskScore));
    
    let riskLevel: RiskLevel;
    if (finalRiskScore < 0.3) {
      riskLevel = 'LOW';
    } else if (finalRiskScore < 0.6) {
      riskLevel = 'MODERATE';
    } else {
      riskLevel = 'HIGH';
    }

    return {
      riskScore: Number(finalRiskScore.toFixed(3)),
      riskLevel,
      riskFactors: this.identifyRiskFactors(volume, ribbon, confluence),
      mitigationSuggestions: this.getMitigationSuggestions(volume, ribbon, confluence)
    };
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(
    volume: VolumeProfileResult,
    ribbon: RibbonAlignmentResult,
    confluence: number
  ): string[] {
    const factors: string[] = [];

    if (confluence < 0.4) {
      factors.push('Low confluence between volume and ribbon analysis increases uncertainty');
    }

    if (volume.volumeRegime === 'CLIMAX') {
      factors.push('Climax volume conditions suggest potential reversal risk');
    }

    if (ribbon.ribbonRegime === 'CHOPPY') {
      factors.push('Choppy ribbon conditions indicate difficult trading environment');
    }

    if (volume.volumePriceRelationship.priceVolumeConfirmation === 'DIVERGENCE') {
      factors.push('Price-volume divergence suggests underlying weakness');
    }

    if (ribbon.ribbonQuality < 0.5) {
      factors.push('Poor ribbon quality indicates inconsistent trend signals');
    }

    if (volume.institutionalFlow.confidence < 0.5) {
      factors.push('Low institutional flow confidence reduces signal reliability');
    }

    return factors;
  }

  /**
   * Get mitigation suggestions
   */
  private getMitigationSuggestions(
    volume: VolumeProfileResult,
    ribbon: RibbonAlignmentResult,
    confluence: number
  ): string[] {
    const suggestions: string[] = [];

    if (confluence < 0.5) {
      suggestions.push('Reduce position sizes until volume and ribbon signals align better');
      suggestions.push('Use tighter stop losses to manage increased uncertainty');
    }

    if (volume.volumeRegime === 'LOW_VOLUME') {
      suggestions.push('Avoid large positions in low volume environment');
    }

    if (ribbon.ribbonRegime === 'COMPRESSION') {
      suggestions.push('Prepare for increased volatility as compression often leads to breakouts');
    }

    suggestions.push('Monitor volume profile POC and value area for support/resistance');
    suggestions.push('Watch for changes in ribbon alignment to confirm trend continuation');
    suggestions.push('Use multiple timeframe analysis to validate signals');

    return suggestions;
  }

  /**
   * Get default integration result for error cases
   */
  private getDefaultIntegrationResult(ticker: string): VolumeRibbonIntegrationResult {
    return {
      ticker,
      integratedConfidence: 0.3,
      signalDirection: 'NEUTRAL',
      signalStrength: 0.3,
      confluence: 0.5,
      institutionalTechnicalAlignment: 0.5,
      volumePriceTrendStrength: 0.3,
      volumeAnalysis: {
        ticker,
        compositeScore: 0.5,
        volumeProfile: {
          bins: [],
          pocPrice: 0,
          pocVolume: 0,
          valueAreaHigh: 0,
          valueAreaLow: 0,
          volumeDistribution: 'BALANCED'
        },
        institutionalFlow: {
          pattern: 'NEUTRAL',
          strength: 0.5,
          confidence: 0.3,
          volumeSpikes: [],
          darkPoolActivity: 0.5,
          institutionalBias: 'NEUTRAL'
        },
        volumeIndicators: {
          vwap: 0,
          obv: 0,
          accumulationDistribution: 0,
          moneyFlowIndex: 50,
          volumeOscillator: 0
        },
        volumePriceRelationship: {
          correlation: 0,
          priceVolumeConfirmation: 'NEUTRAL',
          volumeEfficiency: 0.5,
          supportResistanceStrength: 0.5
        },
        volumePatterns: [],
        volumeRegime: 'NORMAL',
        confidence: 0.3,
        timestamp: new Date()
      },
      ribbonAnalysis: {
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
      },
      tradingInsights: {
        primarySignal: 'Insufficient data for reliable analysis',
        volumeInsights: ['No significant volume patterns detected'],
        ribbonInsights: ['Ribbon alignment is neutral'],
        confluenceInsights: ['Volume and ribbon signals are mixed'],
        tradingRecommendations: ['Wait for clearer signals before trading']
      },
      riskAssessment: {
        riskScore: 0.6,
        riskLevel: 'MODERATE',
        riskFactors: ['Insufficient data quality'],
        mitigationSuggestions: ['Wait for better data before making trading decisions']
      },
      timestamp: new Date()
    };
  }
}

// Supporting interfaces
export interface VolumeRibbonIntegrationResult {
  ticker: string;
  integratedConfidence: number;
  signalDirection: SignalDirection;
  signalStrength: number;
  confluence: number;
  institutionalTechnicalAlignment: number;
  volumePriceTrendStrength: number;
  volumeAnalysis: VolumeProfileResult;
  ribbonAnalysis: RibbonAlignmentResult;
  tradingInsights: TradingInsights;
  riskAssessment: RiskAssessment;
  timestamp: Date;
}

export interface TradingInsights {
  primarySignal: string;
  volumeInsights: string[];
  ribbonInsights: string[];
  confluenceInsights: string[];
  tradingRecommendations: string[];
}

export interface RiskAssessment {
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: string[];
  mitigationSuggestions: string[];
}

export type SignalDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH';