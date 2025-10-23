import { EventEmitter } from 'events';
import { FibonacciGammaIntegrator, MultiFactorAnalysisResult } from './FibonacciGammaIntegrator';

/**
 * Signal Weighting Engine - Core multi-factor signal processing with enhanced confidence calculation
 * Implements the exact weighted formula: trend(25%) + momentum(20%) + volume(20%) + ribbon(15%) + fib(10%) + gamma(10%)
 */
export class SignalWeightingEngine extends EventEmitter {
  private fibonacciGammaIntegrator: FibonacciGammaIntegrator;

  // Exact weights as specified in requirements
  private readonly FACTOR_WEIGHTS = {
    TREND: 0.25,        // 25% weight for trend analysis
    MOMENTUM: 0.20,     // 20% weight for momentum analysis
    VOLUME: 0.20,       // 20% weight for volume analysis
    RIBBON: 0.15,       // 15% weight for ribbon alignment
    FIBONACCI: 0.10,    // 10% weight for Fibonacci analysis
    GAMMA: 0.10         // 10% weight for gamma exposure
  };

  // Conviction scoring thresholds
  private readonly CONVICTION_THRESHOLDS = {
    VERY_HIGH: 0.85,    // 85%+ conviction
    HIGH: 0.70,         // 70%+ conviction
    MODERATE: 0.55,     // 55%+ conviction
    LOW: 0.40,          // 40%+ conviction
    VERY_LOW: 0.25      // Below 25% conviction
  };

  // Factor normalization parameters
  private readonly NORMALIZATION_PARAMS = {
    MIN_FACTOR_CONFIDENCE: 0.1,  // Minimum factor confidence
    MAX_FACTOR_CONFIDENCE: 1.0,  // Maximum factor confidence
    OUTLIER_THRESHOLD: 2.0,      // Standard deviations for outlier detection
    SMOOTHING_FACTOR: 0.1        // Exponential smoothing for factor stability
  };

  constructor() {
    super();
    this.fibonacciGammaIntegrator = new FibonacciGammaIntegrator();

    // Forward events from integrator
    this.fibonacciGammaIntegrator.on('multi-factor:analyzed', (result) => {
      this.emit('multi-factor:analyzed', result);
    });
  }

  /**
   * Compute enhanced confidence with weighted formula and factor analysis
   */
  public async computeEnhancedConfidence(ticker: string): Promise<EnhancedConfidenceResult> {
    try {
      // Get comprehensive multi-factor analysis
      const multiFactorResult = await this.fibonacciGammaIntegrator.analyzeMultiFactorIntegration(ticker);

      // Extract and normalize individual factor confidences
      const normalizedFactors = this.normalizeFactorConfidences(multiFactorResult);

      // Apply the exact weighted formula
      const enhancedConfidence = this.applyWeightedFormula(normalizedFactors);

      // Calculate conviction scoring
      const convictionScore = this.calculateConvictionScoring(enhancedConfidence, normalizedFactors);

      // Generate confidence breakdown
      const confidenceBreakdown = this.generateConfidenceBreakdown(normalizedFactors, enhancedConfidence);

      // Analyze factor contributions
      const factorContributionAnalysis = this.analyzeFactorContributions(normalizedFactors);

      // Calculate factor stability and reliability
      const factorStability = this.calculateFactorStability(normalizedFactors);

      // Generate signal quality assessment
      const signalQuality = this.assessSignalQuality(enhancedConfidence, convictionScore, factorStability);

      // Create comprehensive result
      const result: EnhancedConfidenceResult = {
        ticker,
        enhancedConfidence: Number(enhancedConfidence.toFixed(3)),
        convictionScore: Number(convictionScore.toFixed(3)),
        convictionLevel: this.determineConvictionLevel(convictionScore),
        confidenceBreakdown,
        factorContributionAnalysis,
        factorStability: Number(factorStability.toFixed(3)),
        signalQuality,
        normalizedFactors,
        multiFactorAnalysis: multiFactorResult,
        timestamp: new Date()
      };

      this.emit('enhanced-confidence:calculated', result);
      return result;

    } catch (error) {
      console.error(`Error computing enhanced confidence for ${ticker}:`, error);
      return this.getDefaultEnhancedConfidenceResult(ticker);
    }
  }

  /**
   * Normalize factor confidences for consistent weighting
   */
  private normalizeFactorConfidences(multiFactorResult: MultiFactorAnalysisResult): NormalizedFactors {
    const factorBreakdown = multiFactorResult.factorBreakdown;

    // Extract raw confidences
    const rawConfidences = {
      trend: factorBreakdown.trend.confidence,
      momentum: factorBreakdown.momentum.confidence,
      volume: factorBreakdown.volume.confidence,
      ribbon: factorBreakdown.ribbon.confidence,
      fibonacci: factorBreakdown.fibonacci.confidence,
      gamma: factorBreakdown.gamma.confidence
    };

    // Apply normalization to ensure factors are within expected ranges
    const normalizedConfidences = this.applyFactorNormalization(rawConfidences);

    // Calculate factor strengths (combination of confidence and signal strength)
    const factorStrengths = {
      trend: (normalizedConfidences.trend + factorBreakdown.trend.strength) / 2,
      momentum: (normalizedConfidences.momentum + factorBreakdown.momentum.strength) / 2,
      volume: (normalizedConfidences.volume + factorBreakdown.volume.strength) / 2,
      ribbon: (normalizedConfidences.ribbon + factorBreakdown.ribbon.strength) / 2,
      fibonacci: (normalizedConfidences.fibonacci + factorBreakdown.fibonacci.strength) / 2,
      gamma: (normalizedConfidences.gamma + factorBreakdown.gamma.strength) / 2
    };

    // Calculate factor directions (normalized to 0-1 scale)
    const factorDirections = {
      trend: this.normalizeDirection(factorBreakdown.trend.direction),
      momentum: this.normalizeDirection(factorBreakdown.momentum.direction),
      volume: this.normalizeDirection(factorBreakdown.volume.direction),
      ribbon: this.normalizeDirection(factorBreakdown.ribbon.direction),
      fibonacci: this.normalizeDirection(factorBreakdown.fibonacci.direction),
      gamma: this.normalizeDirection(factorBreakdown.gamma.direction)
    };

    return {
      confidences: normalizedConfidences,
      strengths: factorStrengths,
      directions: factorDirections,
      weights: this.FACTOR_WEIGHTS
    };
  }

  /**
   * Apply factor normalization to handle outliers and ensure consistency
   */
  private applyFactorNormalization(rawConfidences: Record<string, number>): Record<string, number> {
    const values = Object.values(rawConfidences);
    
    // Calculate statistics for outlier detection
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const normalized: Record<string, number> = {};

    // Normalize each factor
    for (const [factor, confidence] of Object.entries(rawConfidences)) {
      let normalizedValue = confidence;

      // Handle outliers (values more than 2 standard deviations from mean)
      if (Math.abs(confidence - mean) > this.NORMALIZATION_PARAMS.OUTLIER_THRESHOLD * stdDev) {
        // Cap outliers to reasonable bounds
        normalizedValue = confidence > mean ? 
          Math.min(confidence, mean + this.NORMALIZATION_PARAMS.OUTLIER_THRESHOLD * stdDev) :
          Math.max(confidence, mean - this.NORMALIZATION_PARAMS.OUTLIER_THRESHOLD * stdDev);
      }

      // Ensure within bounds
      normalizedValue = Math.max(
        this.NORMALIZATION_PARAMS.MIN_FACTOR_CONFIDENCE,
        Math.min(this.NORMALIZATION_PARAMS.MAX_FACTOR_CONFIDENCE, normalizedValue)
      );

      normalized[factor] = normalizedValue;
    }

    return normalized;
  }

  /**
   * Apply the exact weighted formula: trend(25%) + momentum(20%) + volume(20%) + ribbon(15%) + fib(10%) + gamma(10%)
   */
  private applyWeightedFormula(factors: NormalizedFactors): number {
    const weightedSum = 
      (factors.confidences.trend * this.FACTOR_WEIGHTS.TREND) +
      (factors.confidences.momentum * this.FACTOR_WEIGHTS.MOMENTUM) +
      (factors.confidences.volume * this.FACTOR_WEIGHTS.VOLUME) +
      (factors.confidences.ribbon * this.FACTOR_WEIGHTS.RIBBON) +
      (factors.confidences.fibonacci * this.FACTOR_WEIGHTS.FIBONACCI) +
      (factors.confidences.gamma * this.FACTOR_WEIGHTS.GAMMA);

    // Verify weights sum to 1.0 (should always be true)
    const totalWeight = Object.values(this.FACTOR_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      console.warn(`Factor weights do not sum to 1.0: ${totalWeight}`);
    }

    return Math.max(0, Math.min(1, weightedSum));
  }

  /**
   * Calculate conviction scoring with non-linear scaling
   */
  private calculateConvictionScoring(enhancedConfidence: number, factors: NormalizedFactors): number {
    // Base conviction from enhanced confidence
    let conviction = enhancedConfidence;

    // Factor in strength consistency (how aligned are the factor strengths)
    const strengths = Object.values(factors.strengths);
    const strengthMean = strengths.reduce((sum, val) => sum + val, 0) / strengths.length;
    const strengthVariance = strengths.reduce((sum, val) => sum + Math.pow(val - strengthMean, 2), 0) / strengths.length;
    const strengthConsistency = Math.max(0, 1 - Math.sqrt(strengthVariance));
    
    // Factor in directional alignment (how aligned are the factor directions)
    const directions = Object.values(factors.directions);
    const directionMean = directions.reduce((sum, val) => sum + val, 0) / directions.length;
    const directionVariance = directions.reduce((sum, val) => sum + Math.pow(val - directionMean, 2), 0) / directions.length;
    const directionAlignment = Math.max(0, 1 - Math.sqrt(directionVariance));

    // Boost conviction when factors are consistent and aligned
    const consistencyBonus = (strengthConsistency + directionAlignment) / 2 * 0.2;
    conviction += consistencyBonus;

    // Apply non-linear scaling to emphasize high conviction signals
    conviction = Math.pow(conviction, 1.1); // Slightly exponential

    return Math.max(0, Math.min(1, conviction));
  }

  /**
   * Generate detailed confidence breakdown
   */
  private generateConfidenceBreakdown(factors: NormalizedFactors, enhancedConfidence: number): ConfidenceBreakdown {
    const breakdown: ConfidenceBreakdown = {
      totalConfidence: enhancedConfidence,
      factorContributions: {
        trend: {
          weight: this.FACTOR_WEIGHTS.TREND,
          confidence: factors.confidences.trend,
          strength: factors.strengths.trend,
          contribution: factors.confidences.trend * this.FACTOR_WEIGHTS.TREND,
          percentageOfTotal: (factors.confidences.trend * this.FACTOR_WEIGHTS.TREND) / enhancedConfidence * 100
        },
        momentum: {
          weight: this.FACTOR_WEIGHTS.MOMENTUM,
          confidence: factors.confidences.momentum,
          strength: factors.strengths.momentum,
          contribution: factors.confidences.momentum * this.FACTOR_WEIGHTS.MOMENTUM,
          percentageOfTotal: (factors.confidences.momentum * this.FACTOR_WEIGHTS.MOMENTUM) / enhancedConfidence * 100
        },
        volume: {
          weight: this.FACTOR_WEIGHTS.VOLUME,
          confidence: factors.confidences.volume,
          strength: factors.strengths.volume,
          contribution: factors.confidences.volume * this.FACTOR_WEIGHTS.VOLUME,
          percentageOfTotal: (factors.confidences.volume * this.FACTOR_WEIGHTS.VOLUME) / enhancedConfidence * 100
        },
        ribbon: {
          weight: this.FACTOR_WEIGHTS.RIBBON,
          confidence: factors.confidences.ribbon,
          strength: factors.strengths.ribbon,
          contribution: factors.confidences.ribbon * this.FACTOR_WEIGHTS.RIBBON,
          percentageOfTotal: (factors.confidences.ribbon * this.FACTOR_WEIGHTS.RIBBON) / enhancedConfidence * 100
        },
        fibonacci: {
          weight: this.FACTOR_WEIGHTS.FIBONACCI,
          confidence: factors.confidences.fibonacci,
          strength: factors.strengths.fibonacci,
          contribution: factors.confidences.fibonacci * this.FACTOR_WEIGHTS.FIBONACCI,
          percentageOfTotal: (factors.confidences.fibonacci * this.FACTOR_WEIGHTS.FIBONACCI) / enhancedConfidence * 100
        },
        gamma: {
          weight: this.FACTOR_WEIGHTS.GAMMA,
          confidence: factors.confidences.gamma,
          strength: factors.strengths.gamma,
          contribution: factors.confidences.gamma * this.FACTOR_WEIGHTS.GAMMA,
          percentageOfTotal: (factors.confidences.gamma * this.FACTOR_WEIGHTS.GAMMA) / enhancedConfidence * 100
        }
      },
      weightVerification: {
        totalWeights: Object.values(this.FACTOR_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
        isValid: Math.abs(Object.values(this.FACTOR_WEIGHTS).reduce((sum, weight) => sum + weight, 0) - 1.0) < 0.001
      }
    };

    return breakdown;
  }

  /**
   * Analyze factor contributions and identify key drivers
   */
  private analyzeFactorContributions(factors: NormalizedFactors): FactorContributionAnalysis {
    const contributions = Object.entries(factors.confidences).map(([factor, confidence]) => ({
      factor,
      confidence,
      strength: factors.strengths[factor as keyof typeof factors.strengths],
      weight: this.FACTOR_WEIGHTS[factor.toUpperCase() as keyof typeof this.FACTOR_WEIGHTS],
      weightedContribution: confidence * this.FACTOR_WEIGHTS[factor.toUpperCase() as keyof typeof this.FACTOR_WEIGHTS]
    }));

    // Sort by weighted contribution
    contributions.sort((a, b) => b.weightedContribution - a.weightedContribution);

    // Identify key drivers (top contributors)
    const keyDrivers = contributions.slice(0, 3).map(c => c.factor);

    // Identify weak factors (bottom contributors)
    const weakFactors = contributions.slice(-2).map(c => c.factor);

    // Calculate factor diversity (how evenly distributed are the contributions)
    const totalContribution = contributions.reduce((sum, c) => sum + c.weightedContribution, 0);
    const expectedContribution = totalContribution / contributions.length;
    const diversityScore = 1 - contributions.reduce((sum, c) => 
      sum + Math.abs(c.weightedContribution - expectedContribution), 0) / (2 * totalContribution);

    return {
      rankedContributions: contributions,
      keyDrivers,
      weakFactors,
      diversityScore: Number(diversityScore.toFixed(3)),
      dominantFactor: contributions[0].factor,
      dominantFactorContribution: Number(contributions[0].weightedContribution.toFixed(3))
    };
  }

  /**
   * Calculate factor stability and reliability
   */
  private calculateFactorStability(factors: NormalizedFactors): number {
    // Calculate coefficient of variation for confidences
    const confidences = Object.values(factors.confidences);
    const mean = confidences.reduce((sum, val) => sum + val, 0) / confidences.length;
    const variance = confidences.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / confidences.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;

    // Stability is inverse of coefficient of variation (lower CV = higher stability)
    const stability = Math.max(0, 1 - coefficientOfVariation);

    return stability;
  }

  /**
   * Assess overall signal quality
   */
  private assessSignalQuality(enhancedConfidence: number, convictionScore: number, factorStability: number): SignalQuality {
    // Calculate overall quality score
    const qualityScore = (enhancedConfidence * 0.4) + (convictionScore * 0.4) + (factorStability * 0.2);

    // Determine quality level
    let qualityLevel: QualityLevel;
    if (qualityScore >= 0.8) {
      qualityLevel = 'EXCELLENT';
    } else if (qualityScore >= 0.65) {
      qualityLevel = 'GOOD';
    } else if (qualityScore >= 0.5) {
      qualityLevel = 'FAIR';
    } else if (qualityScore >= 0.35) {
      qualityLevel = 'POOR';
    } else {
      qualityLevel = 'VERY_POOR';
    }

    // Generate quality insights
    const insights = this.generateQualityInsights(enhancedConfidence, convictionScore, factorStability, qualityLevel);

    return {
      overallScore: Number(qualityScore.toFixed(3)),
      level: qualityLevel,
      confidenceComponent: Number(enhancedConfidence.toFixed(3)),
      convictionComponent: Number(convictionScore.toFixed(3)),
      stabilityComponent: Number(factorStability.toFixed(3)),
      insights
    };
  }

  /**
   * Generate quality insights
   */
  private generateQualityInsights(confidence: number, conviction: number, stability: number, level: QualityLevel): string[] {
    const insights: string[] = [];

    if (level === 'EXCELLENT') {
      insights.push('Exceptional signal quality with high confidence, conviction, and stability');
    } else if (level === 'GOOD') {
      insights.push('Good signal quality suitable for standard position sizing');
    } else if (level === 'FAIR') {
      insights.push('Fair signal quality - consider reduced position sizing');
    } else {
      insights.push('Poor signal quality - avoid new positions or use minimal sizing');
    }

    if (confidence > 0.8) {
      insights.push('High confidence across multiple factors');
    } else if (confidence < 0.4) {
      insights.push('Low confidence suggests waiting for better setup');
    }

    if (conviction > 0.8) {
      insights.push('Strong conviction with aligned factor signals');
    } else if (conviction < 0.4) {
      insights.push('Weak conviction due to conflicting factor signals');
    }

    if (stability > 0.7) {
      insights.push('High factor stability increases signal reliability');
    } else if (stability < 0.4) {
      insights.push('Low factor stability suggests volatile signal conditions');
    }

    return insights;
  }

  /**
   * Determine conviction level from score
   */
  private determineConvictionLevel(convictionScore: number): ConvictionLevel {
    if (convictionScore >= this.CONVICTION_THRESHOLDS.VERY_HIGH) {
      return 'VERY_HIGH';
    } else if (convictionScore >= this.CONVICTION_THRESHOLDS.HIGH) {
      return 'HIGH';
    } else if (convictionScore >= this.CONVICTION_THRESHOLDS.MODERATE) {
      return 'MODERATE';
    } else if (convictionScore >= this.CONVICTION_THRESHOLDS.LOW) {
      return 'LOW';
    } else {
      return 'VERY_LOW';
    }
  }

  /**
   * Normalize direction strings to 0-1 scale
   */
  private normalizeDirection(direction: string): number {
    switch (direction.toUpperCase()) {
      case 'BULLISH':
      case 'BUYING':
      case 'ACCUMULATION':
        return 1.0;
      case 'BEARISH':
      case 'SELLING':
      case 'DISTRIBUTION':
        return 0.0;
      case 'NEUTRAL':
      case 'NONE':
      default:
        return 0.5;
    }
  }

  /**
   * Get default result for error cases
   */
  private getDefaultEnhancedConfidenceResult(ticker: string): EnhancedConfidenceResult {
    const defaultFactors: NormalizedFactors = {
      confidences: {
        trend: 0.3,
        momentum: 0.3,
        volume: 0.3,
        ribbon: 0.3,
        fibonacci: 0.3,
        gamma: 0.3
      },
      strengths: {
        trend: 0.3,
        momentum: 0.3,
        volume: 0.3,
        ribbon: 0.3,
        fibonacci: 0.3,
        gamma: 0.3
      },
      directions: {
        trend: 0.5,
        momentum: 0.5,
        volume: 0.5,
        ribbon: 0.5,
        fibonacci: 0.5,
        gamma: 0.5
      },
      weights: this.FACTOR_WEIGHTS
    };

    return {
      ticker,
      enhancedConfidence: 0.3,
      convictionScore: 0.3,
      convictionLevel: 'VERY_LOW',
      confidenceBreakdown: this.generateConfidenceBreakdown(defaultFactors, 0.3),
      factorContributionAnalysis: this.analyzeFactorContributions(defaultFactors),
      factorStability: 0.5,
      signalQuality: {
        overallScore: 0.3,
        level: 'POOR',
        confidenceComponent: 0.3,
        convictionComponent: 0.3,
        stabilityComponent: 0.5,
        insights: ['Insufficient data for reliable analysis']
      },
      normalizedFactors: defaultFactors,
      multiFactorAnalysis: {} as any, // Would be populated with actual default
      timestamp: new Date()
    };
  }
}

// Supporting interfaces and types
export interface EnhancedConfidenceResult {
  ticker: string;
  enhancedConfidence: number;
  convictionScore: number;
  convictionLevel: ConvictionLevel;
  confidenceBreakdown: ConfidenceBreakdown;
  factorContributionAnalysis: FactorContributionAnalysis;
  factorStability: number;
  signalQuality: SignalQuality;
  normalizedFactors: NormalizedFactors;
  multiFactorAnalysis: MultiFactorAnalysisResult;
  timestamp: Date;
}

export interface NormalizedFactors {
  confidences: Record<string, number>;
  strengths: Record<string, number>;
  directions: Record<string, number>;
  weights: Record<string, number>;
}

export interface ConfidenceBreakdown {
  totalConfidence: number;
  factorContributions: Record<string, FactorBreakdownItem>;
  weightVerification: {
    totalWeights: number;
    isValid: boolean;
  };
}

export interface FactorBreakdownItem {
  weight: number;
  confidence: number;
  strength: number;
  contribution: number;
  percentageOfTotal: number;
}

export interface FactorContributionAnalysis {
  rankedContributions: Array<{
    factor: string;
    confidence: number;
    strength: number;
    weight: number;
    weightedContribution: number;
  }>;
  keyDrivers: string[];
  weakFactors: string[];
  diversityScore: number;
  dominantFactor: string;
  dominantFactorContribution: number;
}

export interface SignalQuality {
  overallScore: number;
  level: QualityLevel;
  confidenceComponent: number;
  convictionComponent: number;
  stabilityComponent: number;
  insights: string[];
}

export type ConvictionLevel = 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';
export type QualityLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR';