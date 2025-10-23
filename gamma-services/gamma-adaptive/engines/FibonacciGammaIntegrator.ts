import { EventEmitter } from 'events';
import { FibExpansionEngine } from './FibExpansionEngine';
import { GammaExposureEngine } from './GammaExposureEngine';
import { TrendMomentumIntegrator, IntegratedAnalysisResult } from './TrendMomentumIntegrator';
import { VolumeRibbonIntegrator, VolumeRibbonIntegrationResult } from './VolumeRibbonIntegrator';

/**
 * Fibonacci Gamma Integrator - Advanced multi-factor analysis integration
 * Combines Fibonacci expansion and Gamma exposure with trend, momentum, volume, and ribbon analysis
 */
export class FibonacciGammaIntegrator extends EventEmitter {
  private fibEngine: FibExpansionEngine;
  private gammaEngine: GammaExposureEngine;
  private trendMomentumIntegrator: TrendMomentumIntegrator;
  private volumeRibbonIntegrator: VolumeRibbonIntegrator;

  private readonly FACTOR_WEIGHTS = {
    TREND: 0.25,        // 25% weight for trend analysis
    MOMENTUM: 0.20,     // 20% weight for momentum analysis
    VOLUME: 0.20,       // 20% weight for volume analysis
    RIBBON: 0.15,       // 15% weight for ribbon alignment
    FIBONACCI: 0.10,    // 10% weight for Fibonacci analysis
    GAMMA: 0.10         // 10% weight for gamma exposure
  };

  private readonly CONFLUENCE_THRESHOLDS = {
    VERY_HIGH: 0.85,    // 85%+ confluence across factors
    HIGH: 0.70,         // 70%+ confluence
    MODERATE: 0.55,     // 55%+ confluence
    LOW: 0.40,          // 40%+ confluence
    VERY_LOW: 0.25      // Below 25% confluence
  };

  private readonly FIBONACCI_ZONE_ADJUSTMENTS = {
    'COMPRESSION': 1.2,      // Boost confidence in compression zones
    'MID_EXPANSION': 1.0,    // Neutral adjustment
    'FULL_EXPANSION': 0.9,   // Slight reduction in full expansion
    'OVER_EXTENSION': 0.7,   // Reduce confidence in over-extension
    'EXHAUSTION': 0.0        // No positions in exhaustion zones
  };

  private readonly GAMMA_EXPOSURE_ADJUSTMENTS = {
    HIGH_POSITIVE: 0.8,      // Reduce confidence due to pinning risk
    MODERATE_POSITIVE: 0.9,  // Slight reduction
    NEUTRAL: 1.0,            // No adjustment
    MODERATE_NEGATIVE: 1.1,  // Slight boost for acceleration potential
    HIGH_NEGATIVE: 1.2       // Boost confidence for strong acceleration
  };

  constructor() {
    super();
    this.fibEngine = new FibExpansionEngine();
    this.gammaEngine = new GammaExposureEngine();
    this.trendMomentumIntegrator = new TrendMomentumIntegrator();
    this.volumeRibbonIntegrator = new VolumeRibbonIntegrator();

    // Forward events from child engines
    this.trendMomentumIntegrator.on('integrated:analyzed', (result) => {
      this.emit('trend-momentum:analyzed', result);
    });

    this.volumeRibbonIntegrator.on('volume-ribbon:integrated', (result) => {
      this.emit('volume-ribbon:analyzed', result);
    });
  }

  /**
   * Perform comprehensive multi-factor analysis integration
   */
  public async analyzeMultiFactorIntegration(ticker: string): Promise<MultiFactorAnalysisResult> {
    try {
      // Run all analyses concurrently
      const [
        trendMomentumResult,
        volumeRibbonResult,
        fibonacciResult,
        gammaResult
      ] = await Promise.all([
        this.trendMomentumIntegrator.analyzeIntegratedSignal(ticker),
        this.volumeRibbonIntegrator.analyzeVolumeRibbonIntegration(ticker),
        this.fibEngine.analyzeExpansion(ticker),
        this.gammaEngine.analyzeExposure(ticker)
      ]);

      // Calculate enhanced confidence with all factors
      const enhancedConfidence = this.computeEnhancedConfidence(
        trendMomentumResult,
        volumeRibbonResult,
        fibonacciResult,
        gammaResult
      );

      // Calculate multi-factor confluence
      const multiFactorConfluence = this.calculateMultiFactorConfluence(
        trendMomentumResult,
        volumeRibbonResult,
        fibonacciResult,
        gammaResult
      );

      // Determine overall signal direction with all factors
      const signalDirection = this.determineMultiFactorSignalDirection(
        trendMomentumResult,
        volumeRibbonResult,
        fibonacciResult,
        gammaResult,
        multiFactorConfluence
      );

      // Calculate signal strength with Fibonacci and Gamma adjustments
      const signalStrength = this.calculateAdjustedSignalStrength(
        trendMomentumResult,
        volumeRibbonResult,
        fibonacciResult,
        gammaResult,
        multiFactorConfluence
      );

      // Apply Fibonacci zone and Gamma exposure adjustments
      const fibonacciAdjustment = this.applyFibonacciZoneAdjustment(fibonacciResult, enhancedConfidence);
      const gammaAdjustment = this.applyGammaExposureAdjustment(gammaResult, enhancedConfidence);

      // Calculate final adjusted confidence
      const finalConfidence = this.calculateFinalConfidence(
        enhancedConfidence,
        fibonacciAdjustment,
        gammaAdjustment,
        multiFactorConfluence
      );

      // Generate comprehensive factor breakdown
      const factorBreakdown = this.generateFactorBreakdown(
        trendMomentumResult,
        volumeRibbonResult,
        fibonacciResult,
        gammaResult
      );

      // Calculate conviction scoring
      const convictionScore = this.calculateConvictionScore(
        finalConfidence,
        signalStrength,
        multiFactorConfluence
      );

      // Generate advanced trading insights
      const advancedInsights = this.generateAdvancedTradingInsights(
        trendMomentumResult,
        volumeRibbonResult,
        fibonacciResult,
        gammaResult,
        multiFactorConfluence,
        finalConfidence
      );

      // Calculate comprehensive risk assessment
      const riskAssessment = this.calculateComprehensiveRiskAssessment(
        trendMomentumResult,
        volumeRibbonResult,
        fibonacciResult,
        gammaResult,
        finalConfidence
      );

      const result: MultiFactorAnalysisResult = {
        ticker,
        enhancedConfidence: Number(finalConfidence.toFixed(3)),
        signalDirection,
        signalStrength: Number(signalStrength.toFixed(3)),
        multiFactorConfluence: Number(multiFactorConfluence.toFixed(3)),
        convictionScore: Number(convictionScore.toFixed(3)),
        fibonacciAdjustment: Number(fibonacciAdjustment.toFixed(3)),
        gammaAdjustment: Number(gammaAdjustment.toFixed(3)),
        factorBreakdown,
        trendMomentumAnalysis: trendMomentumResult,
        volumeRibbonAnalysis: volumeRibbonResult,
        fibonacciAnalysis: fibonacciResult,
        gammaAnalysis: gammaResult,
        advancedInsights,
        riskAssessment,
        timestamp: new Date()
      };

      this.emit('multi-factor:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error in multi-factor analysis for ${ticker}:`, error);
      return this.getDefaultMultiFactorResult(ticker);
    }
  }

  /**
   * Compute enhanced confidence with weighted formula
   * Formula: trend(25%) + momentum(20%) + volume(20%) + ribbon(15%) + fib(10%) + gamma(10%)
   */
  private computeEnhancedConfidence(
    trendMomentum: IntegratedAnalysisResult,
    volumeRibbon: VolumeRibbonIntegrationResult,
    fibonacci: any,
    gamma: any
  ): number {
    // Extract individual factor confidences
    const trendConfidence = trendMomentum.trendAnalysis.quality * trendMomentum.trendAnalysis.strength;
    const momentumConfidence = trendMomentum.momentumAnalysis.confidence;
    const volumeConfidence = volumeRibbon.volumeAnalysis.confidence;
    const ribbonConfidence = volumeRibbon.ribbonAnalysis.confidence;
    const fibonacciConfidence = this.calculateFibonacciConfidence(fibonacci);
    const gammaConfidence = this.calculateGammaConfidence(gamma);

    // Apply weighted formula
    const enhancedConfidence = 
      (trendConfidence * this.FACTOR_WEIGHTS.TREND) +
      (momentumConfidence * this.FACTOR_WEIGHTS.MOMENTUM) +
      (volumeConfidence * this.FACTOR_WEIGHTS.VOLUME) +
      (ribbonConfidence * this.FACTOR_WEIGHTS.RIBBON) +
      (fibonacciConfidence * this.FACTOR_WEIGHTS.FIBONACCI) +
      (gammaConfidence * this.FACTOR_WEIGHTS.GAMMA);

    return Math.max(0, Math.min(1, enhancedConfidence));
  }

  /**
   * Calculate multi-factor confluence
   */
  private calculateMultiFactorConfluence(
    trendMomentum: IntegratedAnalysisResult,
    volumeRibbon: VolumeRibbonIntegrationResult,
    fibonacci: any,
    gamma: any
  ): number {
    // Get directional signals from each factor
    const trendDirection = this.getDirectionScore(trendMomentum.signalDirection);
    const volumeDirection = this.getDirectionScore(volumeRibbon.signalDirection);
    const fibonacciDirection = this.getFibonacciDirectionScore(fibonacci);
    const gammaDirection = this.getGammaDirectionScore(gamma);

    // Calculate alignment between factors
    const directions = [trendDirection, volumeDirection, fibonacciDirection, gammaDirection];
    const avgDirection = directions.reduce((sum, dir) => sum + dir, 0) / directions.length;
    
    // Calculate how much each factor deviates from average
    const deviations = directions.map(dir => Math.abs(dir - avgDirection));
    const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
    
    // Confluence is inverse of deviation (lower deviation = higher confluence)
    const confluence = Math.max(0, 1 - (avgDeviation * 2));

    return confluence;
  }

  /**
   * Determine multi-factor signal direction
   */
  private determineMultiFactorSignalDirection(
    trendMomentum: IntegratedAnalysisResult,
    volumeRibbon: VolumeRibbonIntegrationResult,
    fibonacci: any,
    gamma: any,
    confluence: number
  ): SignalDirection {
    // Weight each factor's directional signal by its confidence and confluence
    const trendWeight = trendMomentum.integratedConfidence * confluence;
    const volumeWeight = volumeRibbon.integratedConfidence * confluence;
    const fibWeight = this.calculateFibonacciConfidence(fibonacci) * confluence;
    const gammaWeight = this.calculateGammaConfidence(gamma) * confluence;

    const trendScore = this.getDirectionScore(trendMomentum.signalDirection) * trendWeight;
    const volumeScore = this.getDirectionScore(volumeRibbon.signalDirection) * volumeWeight;
    const fibScore = this.getFibonacciDirectionScore(fibonacci) * fibWeight;
    const gammaScore = this.getGammaDirectionScore(gamma) * gammaWeight;

    const totalWeight = trendWeight + volumeWeight + fibWeight + gammaWeight;
    const weightedScore = totalWeight > 0 ? 
      (trendScore + volumeScore + fibScore + gammaScore) / totalWeight : 0.5;

    if (weightedScore > 0.6) {
      return 'BULLISH';
    } else if (weightedScore < 0.4) {
      return 'BEARISH';
    } else {
      return 'NEUTRAL';
    }
  }

  /**
   * Calculate adjusted signal strength with Fibonacci and Gamma factors
   */
  private calculateAdjustedSignalStrength(
    trendMomentum: IntegratedAnalysisResult,
    volumeRibbon: VolumeRibbonIntegrationResult,
    fibonacci: any,
    gamma: any,
    confluence: number
  ): number {
    // Base strength from existing integrations
    const baseStrength = (trendMomentum.signalStrength + volumeRibbon.signalStrength) / 2;
    
    // Fibonacci strength contribution
    const fibStrength = this.calculateFibonacciStrength(fibonacci);
    
    // Gamma strength contribution
    const gammaStrength = this.calculateGammaStrength(gamma);
    
    // Weighted combination
    const adjustedStrength = 
      (baseStrength * 0.7) +
      (fibStrength * this.FACTOR_WEIGHTS.FIBONACCI * 10) +
      (gammaStrength * this.FACTOR_WEIGHTS.GAMMA * 10);
    
    // Apply confluence multiplier
    return Math.max(0, Math.min(1, adjustedStrength * (0.5 + confluence * 0.5)));
  }

  /**
   * Apply Fibonacci zone adjustment
   */
  private applyFibonacciZoneAdjustment(fibonacci: any, confidence: number): number {
    const zoneMultiplier = this.FIBONACCI_ZONE_ADJUSTMENTS[fibonacci.currentZone] || 1.0;
    return confidence * zoneMultiplier;
  }

  /**
   * Apply Gamma exposure adjustment
   */
  private applyGammaExposureAdjustment(gamma: any, confidence: number): number {
    const exposureLevel = this.classifyGammaExposure(gamma.netGammaExposure);
    const gammaMultiplier = this.GAMMA_EXPOSURE_ADJUSTMENTS[exposureLevel] || 1.0;
    return confidence * gammaMultiplier;
  }

  /**
   * Calculate final confidence with all adjustments
   */
  private calculateFinalConfidence(
    baseConfidence: number,
    fibAdjustment: number,
    gammaAdjustment: number,
    confluence: number
  ): number {
    // Apply Fibonacci and Gamma adjustments
    let adjustedConfidence = baseConfidence;
    adjustedConfidence = Math.min(adjustedConfidence, fibAdjustment);
    adjustedConfidence *= (gammaAdjustment / baseConfidence);
    
    // Apply confluence boost
    const confluenceBoost = confluence > 0.7 ? 1.1 : confluence < 0.4 ? 0.9 : 1.0;
    adjustedConfidence *= confluenceBoost;
    
    return Math.max(0.1, Math.min(1, adjustedConfidence));
  }

  /**
   * Generate factor breakdown for analysis
   */
  private generateFactorBreakdown(
    trendMomentum: IntegratedAnalysisResult,
    volumeRibbon: VolumeRibbonIntegrationResult,
    fibonacci: any,
    gamma: any
  ): FactorBreakdown {
    return {
      trend: {
        contribution: this.FACTOR_WEIGHTS.TREND,
        confidence: trendMomentum.trendAnalysis.quality * trendMomentum.trendAnalysis.strength,
        direction: trendMomentum.trendAnalysis.direction,
        strength: trendMomentum.trendAnalysis.strength
      },
      momentum: {
        contribution: this.FACTOR_WEIGHTS.MOMENTUM,
        confidence: trendMomentum.momentumAnalysis.confidence,
        direction: trendMomentum.momentumAnalysis.divergenceType,
        strength: trendMomentum.momentumAnalysis.strength
      },
      volume: {
        contribution: this.FACTOR_WEIGHTS.VOLUME,
        confidence: volumeRibbon.volumeAnalysis.confidence,
        direction: volumeRibbon.volumeAnalysis.institutionalFlow.institutionalBias,
        strength: volumeRibbon.volumeAnalysis.institutionalFlow.strength
      },
      ribbon: {
        contribution: this.FACTOR_WEIGHTS.RIBBON,
        confidence: volumeRibbon.ribbonAnalysis.confidence,
        direction: volumeRibbon.ribbonAnalysis.ribbonDirection,
        strength: volumeRibbon.ribbonAnalysis.ribbonStrength
      },
      fibonacci: {
        contribution: this.FACTOR_WEIGHTS.FIBONACCI,
        confidence: this.calculateFibonacciConfidence(fibonacci),
        direction: this.getFibonacciDirection(fibonacci),
        strength: this.calculateFibonacciStrength(fibonacci)
      },
      gamma: {
        contribution: this.FACTOR_WEIGHTS.GAMMA,
        confidence: this.calculateGammaConfidence(gamma),
        direction: this.getGammaDirection(gamma),
        strength: this.calculateGammaStrength(gamma)
      }
    };
  }

  /**
   * Calculate conviction score
   */
  private calculateConvictionScore(
    confidence: number,
    strength: number,
    confluence: number
  ): number {
    // Conviction is a combination of confidence, strength, and confluence
    const convictionScore = (confidence * 0.4) + (strength * 0.3) + (confluence * 0.3);
    
    // Apply non-linear scaling for conviction
    return Math.pow(convictionScore, 1.2); // Slightly exponential to emphasize high conviction
  }

  /**
   * Generate advanced trading insights
   */
  private generateAdvancedTradingInsights(
    trendMomentum: IntegratedAnalysisResult,
    volumeRibbon: VolumeRibbonIntegrationResult,
    fibonacci: any,
    gamma: any,
    confluence: number,
    confidence: number
  ): AdvancedTradingInsights {
    return {
      primarySignal: this.generatePrimarySignalInsight(trendMomentum, volumeRibbon, fibonacci, gamma, confluence),
      fibonacciInsights: this.generateFibonacciInsights(fibonacci),
      gammaInsights: this.generateGammaInsights(gamma),
      confluenceInsights: this.generateConfluenceInsights(confluence, confidence),
      riskRewardAnalysis: this.generateRiskRewardAnalysis(fibonacci, gamma, confidence),
      positionSizingRecommendation: this.generatePositionSizingRecommendation(confidence, fibonacci, gamma),
      entryExitStrategy: this.generateEntryExitStrategy(trendMomentum, volumeRibbon, fibonacci, gamma)
    };
  }

  // Helper methods for calculations
  private getDirectionScore(direction: string): number {
    switch (direction) {
      case 'BULLISH': return 1.0;
      case 'BEARISH': return 0.0;
      case 'NEUTRAL': return 0.5;
      default: return 0.5;
    }
  }

  private calculateFibonacciConfidence(fibonacci: any): number {
    // Higher confidence when price is near key Fibonacci levels
    const confluenceLevel = fibonacci.confluence || 0.5;
    const zoneConfidence = fibonacci.currentZone === 'COMPRESSION' ? 0.8 : 
                          fibonacci.currentZone === 'EXHAUSTION' ? 0.2 : 0.6;
    return (confluenceLevel + zoneConfidence) / 2;
  }

  private calculateGammaConfidence(gamma: any): number {
    // Higher confidence when gamma exposure is clear (not neutral)
    const exposureStrength = Math.abs(gamma.netGammaExposure || 0);
    const pinningRisk = gamma.pinningRisk || 0.5;
    return Math.min(1, exposureStrength + (1 - pinningRisk) * 0.3);
  }

  private getFibonacciDirectionScore(fibonacci: any): number {
    // Fibonacci direction based on expansion level and zone
    if (fibonacci.currentZone === 'COMPRESSION') return 0.7; // Bullish bias in compression
    if (fibonacci.currentZone === 'EXHAUSTION') return 0.3; // Bearish bias in exhaustion
    return 0.5; // Neutral in other zones
  }

  private getGammaDirectionScore(gamma: any): number {
    const exposure = gamma.netGammaExposure || 0;
    if (exposure > 0.1) return 0.3; // Bearish bias with high positive gamma (pinning)
    if (exposure < -0.1) return 0.7; // Bullish bias with negative gamma (acceleration)
    return 0.5; // Neutral
  }

  private calculateFibonacciStrength(fibonacci: any): number {
    const expansionLevel = fibonacci.expansionLevel || 0.5;
    const confluence = fibonacci.confluence || 0.5;
    return (Math.abs(expansionLevel - 0.5) * 2 + confluence) / 2;
  }

  private calculateGammaStrength(gamma: any): number {
    const exposureStrength = Math.abs(gamma.netGammaExposure || 0);
    const volSuppression = gamma.volSuppressionLevel || 0.5;
    return Math.min(1, exposureStrength * 2 + volSuppression * 0.3);
  }

  private classifyGammaExposure(exposure: number): string {
    if (exposure > this.gammaEngine['GAMMA_THRESHOLDS'].HIGH_POSITIVE) return 'HIGH_POSITIVE';
    if (exposure > this.gammaEngine['GAMMA_THRESHOLDS'].MODERATE_POSITIVE) return 'MODERATE_POSITIVE';
    if (exposure < this.gammaEngine['GAMMA_THRESHOLDS'].HIGH_NEGATIVE) return 'HIGH_NEGATIVE';
    if (exposure < this.gammaEngine['GAMMA_THRESHOLDS'].MODERATE_NEGATIVE) return 'MODERATE_NEGATIVE';
    return 'NEUTRAL';
  }

  private getFibonacciDirection(fibonacci: any): string {
    return fibonacci.currentZone === 'COMPRESSION' ? 'BULLISH' :
           fibonacci.currentZone === 'EXHAUSTION' ? 'BEARISH' : 'NEUTRAL';
  }

  private getGammaDirection(gamma: any): string {
    const exposure = gamma.netGammaExposure || 0;
    return exposure > 0.1 ? 'BEARISH' : exposure < -0.1 ? 'BULLISH' : 'NEUTRAL';
  }

  // Insight generation methods (simplified for brevity)
  private generatePrimarySignalInsight(trendMomentum: any, volumeRibbon: any, fibonacci: any, gamma: any, confluence: number): string {
    if (confluence > 0.8) {
      return `Exceptional multi-factor confluence (${(confluence * 100).toFixed(0)}%) with ${fibonacci.currentZone} Fibonacci zone and ${this.classifyGammaExposure(gamma.netGammaExposure)} gamma exposure.`;
    } else if (confluence < 0.4) {
      return `Low confluence (${(confluence * 100).toFixed(0)}%) between factors suggests waiting for better alignment.`;
    } else {
      return `Moderate confluence (${(confluence * 100).toFixed(0)}%) with mixed signals across factors.`;
    }
  }

  private generateFibonacciInsights(fibonacci: any): string[] {
    const insights: string[] = [];
    insights.push(`Current Fibonacci zone: ${fibonacci.currentZone}`);
    insights.push(`Expansion level: ${(fibonacci.expansionLevel * 100).toFixed(0)}%`);
    if (fibonacci.currentZone === 'COMPRESSION') {
      insights.push('Compression zone suggests potential for significant price movement');
    } else if (fibonacci.currentZone === 'EXHAUSTION') {
      insights.push('Exhaustion zone indicates high reversal risk - avoid new positions');
    }
    return insights;
  }

  private generateGammaInsights(gamma: any): string[] {
    const insights: string[] = [];
    const exposureLevel = this.classifyGammaExposure(gamma.netGammaExposure);
    insights.push(`Net gamma exposure: ${exposureLevel}`);
    
    if (exposureLevel === 'HIGH_POSITIVE') {
      insights.push('High positive gamma creates pinning risk near key strikes');
    } else if (exposureLevel === 'HIGH_NEGATIVE') {
      insights.push('High negative gamma can accelerate price movements');
    }
    
    if (gamma.pinningRisk > 0.7) {
      insights.push(`High pinning risk (${(gamma.pinningRisk * 100).toFixed(0)}%) may limit price movement`);
    }
    
    return insights;
  }

  private generateConfluenceInsights(confluence: number, confidence: number): string[] {
    const insights: string[] = [];
    
    if (confluence > this.CONFLUENCE_THRESHOLDS.VERY_HIGH) {
      insights.push('Exceptional factor alignment creates high-probability setup');
    } else if (confluence > this.CONFLUENCE_THRESHOLDS.HIGH) {
      insights.push('Strong factor alignment supports directional bias');
    } else if (confluence < this.CONFLUENCE_THRESHOLDS.LOW) {
      insights.push('Poor factor alignment suggests avoiding new positions');
    }
    
    return insights;
  }

  private generateRiskRewardAnalysis(fibonacci: any, gamma: any, confidence: number): RiskRewardAnalysis {
    // Simplified risk-reward calculation
    const fibRisk = fibonacci.currentZone === 'EXHAUSTION' ? 0.8 : 0.4;
    const gammaRisk = Math.abs(gamma.netGammaExposure) > 0.3 ? 0.6 : 0.3;
    const overallRisk = (fibRisk + gammaRisk) / 2;
    
    const reward = confidence * 2; // Simplified reward calculation
    
    return {
      riskScore: Number(overallRisk.toFixed(2)),
      rewardPotential: Number(reward.toFixed(2)),
      riskRewardRatio: Number((reward / overallRisk).toFixed(2)),
      recommendation: reward / overallRisk > 2 ? 'FAVORABLE' : reward / overallRisk > 1 ? 'ACCEPTABLE' : 'UNFAVORABLE'
    };
  }

  private generatePositionSizingRecommendation(confidence: number, fibonacci: any, gamma: any): PositionSizingRecommendation {
    let baseSize = confidence;
    
    // Fibonacci zone adjustment
    if (fibonacci.currentZone === 'EXHAUSTION') {
      baseSize *= 0.0; // No positions in exhaustion
    } else if (fibonacci.currentZone === 'COMPRESSION') {
      baseSize *= 1.2; // Increase size in compression
    }
    
    // Gamma exposure adjustment
    const exposureLevel = this.classifyGammaExposure(gamma.netGammaExposure);
    if (exposureLevel === 'HIGH_POSITIVE') {
      baseSize *= 0.7; // Reduce size due to pinning risk
    }
    
    const finalSize = Math.max(0, Math.min(1, baseSize));
    
    return {
      recommendedSize: Number(finalSize.toFixed(2)),
      maxSize: Number(Math.min(1, finalSize * 1.5).toFixed(2)),
      reasoning: this.getPositionSizingReasoning(fibonacci, gamma, confidence)
    };
  }

  private generateEntryExitStrategy(trendMomentum: any, volumeRibbon: any, fibonacci: any, gamma: any): EntryExitStrategy {
    return {
      entryConditions: [
        'Wait for confluence above 70%',
        'Confirm with volume spike',
        'Avoid Fibonacci exhaustion zones'
      ],
      exitConditions: [
        'Take profits at Fibonacci targets',
        'Exit if confluence drops below 40%',
        'Monitor gamma flip levels for exits'
      ],
      stopLossStrategy: 'Set stops below key Fibonacci support levels',
      profitTargets: fibonacci.keyLevels?.targets || []
    };
  }

  private getPositionSizingReasoning(fibonacci: any, gamma: any, confidence: number): string[] {
    const reasons: string[] = [];
    
    if (confidence > 0.8) {
      reasons.push('High confidence supports larger position size');
    } else if (confidence < 0.4) {
      reasons.push('Low confidence requires smaller position size');
    }
    
    if (fibonacci.currentZone === 'EXHAUSTION') {
      reasons.push('Exhaustion zone requires zero position size');
    } else if (fibonacci.currentZone === 'COMPRESSION') {
      reasons.push('Compression zone allows increased position size');
    }
    
    const exposureLevel = this.classifyGammaExposure(gamma.netGammaExposure);
    if (exposureLevel === 'HIGH_POSITIVE') {
      reasons.push('High positive gamma exposure reduces recommended size');
    }
    
    return reasons;
  }

  private calculateComprehensiveRiskAssessment(
    trendMomentum: IntegratedAnalysisResult,
    volumeRibbon: VolumeRibbonIntegrationResult,
    fibonacci: any,
    gamma: any,
    confidence: number
  ): ComprehensiveRiskAssessment {
    // Combine risk factors from all analyses
    const trendRisks = trendMomentum.insights?.riskFactors || [];
    const volumeRisks = volumeRibbon.riskAssessment?.riskFactors || [];
    const fibRisks = this.getFibonacciRiskFactors(fibonacci);
    const gammaRisks = this.getGammaRiskFactors(gamma);
    
    const allRiskFactors = [...trendRisks, ...volumeRisks, ...fibRisks, ...gammaRisks];
    
    // Calculate overall risk score
    const riskScore = this.calculateOverallRiskScore(fibonacci, gamma, confidence);
    
    return {
      overallRiskScore: Number(riskScore.toFixed(2)),
      riskLevel: riskScore > 0.7 ? 'HIGH' : riskScore > 0.4 ? 'MODERATE' : 'LOW',
      riskFactors: allRiskFactors,
      mitigationStrategies: this.generateMitigationStrategies(fibonacci, gamma, allRiskFactors)
    };
  }

  private getFibonacciRiskFactors(fibonacci: any): string[] {
    const risks: string[] = [];
    if (fibonacci.currentZone === 'EXHAUSTION') {
      risks.push('Fibonacci exhaustion zone indicates high reversal risk');
    }
    if (fibonacci.currentZone === 'OVER_EXTENSION') {
      risks.push('Over-extended Fibonacci levels suggest caution');
    }
    return risks;
  }

  private getGammaRiskFactors(gamma: any): string[] {
    const risks: string[] = [];
    const exposureLevel = this.classifyGammaExposure(gamma.netGammaExposure);
    
    if (exposureLevel === 'HIGH_POSITIVE') {
      risks.push('High positive gamma exposure creates pinning risk');
    }
    if (gamma.pinningRisk > 0.7) {
      risks.push('High pinning risk may limit price movement');
    }
    if (gamma.volSuppressionLevel > 0.7) {
      risks.push('High volatility suppression reduces breakout potential');
    }
    
    return risks;
  }

  private calculateOverallRiskScore(fibonacci: any, gamma: any, confidence: number): number {
    let riskScore = 0.3; // Base risk
    
    // Fibonacci zone risk
    if (fibonacci.currentZone === 'EXHAUSTION') {
      riskScore += 0.4;
    } else if (fibonacci.currentZone === 'OVER_EXTENSION') {
      riskScore += 0.2;
    }
    
    // Gamma exposure risk
    const exposureLevel = this.classifyGammaExposure(gamma.netGammaExposure);
    if (exposureLevel === 'HIGH_POSITIVE') {
      riskScore += 0.2;
    }
    
    // Confidence adjustment (higher confidence = lower risk)
    riskScore *= (1.5 - confidence);
    
    return Math.max(0.1, Math.min(0.9, riskScore));
  }

  private generateMitigationStrategies(fibonacci: any, gamma: any, riskFactors: string[]): string[] {
    const strategies: string[] = [];
    
    if (fibonacci.currentZone === 'EXHAUSTION') {
      strategies.push('Avoid new positions in Fibonacci exhaustion zones');
    }
    
    if (this.classifyGammaExposure(gamma.netGammaExposure) === 'HIGH_POSITIVE') {
      strategies.push('Use smaller position sizes due to gamma pinning risk');
      strategies.push('Monitor key strike levels for potential pinning effects');
    }
    
    strategies.push('Use tight stop losses given multiple risk factors');
    strategies.push('Consider scaling into positions rather than full size immediately');
    
    return strategies;
  }

  private getDefaultMultiFactorResult(ticker: string): MultiFactorAnalysisResult {
    // Return a safe default result structure
    return {
      ticker,
      enhancedConfidence: 0.3,
      signalDirection: 'NEUTRAL',
      signalStrength: 0.3,
      multiFactorConfluence: 0.5,
      convictionScore: 0.3,
      fibonacciAdjustment: 1.0,
      gammaAdjustment: 1.0,
      factorBreakdown: {
        trend: { contribution: 0.25, confidence: 0.3, direction: 'NEUTRAL', strength: 0.3 },
        momentum: { contribution: 0.20, confidence: 0.3, direction: 'NONE', strength: 0.3 },
        volume: { contribution: 0.20, confidence: 0.3, direction: 'NEUTRAL', strength: 0.3 },
        ribbon: { contribution: 0.15, confidence: 0.3, direction: 'NEUTRAL', strength: 0.3 },
        fibonacci: { contribution: 0.10, confidence: 0.3, direction: 'NEUTRAL', strength: 0.3 },
        gamma: { contribution: 0.10, confidence: 0.3, direction: 'NEUTRAL', strength: 0.3 }
      },
      trendMomentumAnalysis: {} as any,
      volumeRibbonAnalysis: {} as any,
      fibonacciAnalysis: {} as any,
      gammaAnalysis: {} as any,
      advancedInsights: {
        primarySignal: 'Insufficient data for analysis',
        fibonacciInsights: [],
        gammaInsights: [],
        confluenceInsights: [],
        riskRewardAnalysis: { riskScore: 0.5, rewardPotential: 0.3, riskRewardRatio: 0.6, recommendation: 'UNFAVORABLE' },
        positionSizingRecommendation: { recommendedSize: 0.1, maxSize: 0.2, reasoning: ['Low confidence'] },
        entryExitStrategy: { entryConditions: [], exitConditions: [], stopLossStrategy: '', profitTargets: [] }
      },
      riskAssessment: {
        overallRiskScore: 0.6,
        riskLevel: 'MODERATE',
        riskFactors: ['Insufficient data'],
        mitigationStrategies: ['Wait for better data quality']
      },
      timestamp: new Date()
    };
  }
}

// Supporting interfaces
export interface MultiFactorAnalysisResult {
  ticker: string;
  enhancedConfidence: number;
  signalDirection: SignalDirection;
  signalStrength: number;
  multiFactorConfluence: number;
  convictionScore: number;
  fibonacciAdjustment: number;
  gammaAdjustment: number;
  factorBreakdown: FactorBreakdown;
  trendMomentumAnalysis: IntegratedAnalysisResult;
  volumeRibbonAnalysis: VolumeRibbonIntegrationResult;
  fibonacciAnalysis: any;
  gammaAnalysis: any;
  advancedInsights: AdvancedTradingInsights;
  riskAssessment: ComprehensiveRiskAssessment;
  timestamp: Date;
}

export interface FactorBreakdown {
  trend: FactorContribution;
  momentum: FactorContribution;
  volume: FactorContribution;
  ribbon: FactorContribution;
  fibonacci: FactorContribution;
  gamma: FactorContribution;
}

export interface FactorContribution {
  contribution: number;
  confidence: number;
  direction: string;
  strength: number;
}

export interface AdvancedTradingInsights {
  primarySignal: string;
  fibonacciInsights: string[];
  gammaInsights: string[];
  confluenceInsights: string[];
  riskRewardAnalysis: RiskRewardAnalysis;
  positionSizingRecommendation: PositionSizingRecommendation;
  entryExitStrategy: EntryExitStrategy;
}

export interface RiskRewardAnalysis {
  riskScore: number;
  rewardPotential: number;
  riskRewardRatio: number;
  recommendation: 'FAVORABLE' | 'ACCEPTABLE' | 'UNFAVORABLE';
}

export interface PositionSizingRecommendation {
  recommendedSize: number;
  maxSize: number;
  reasoning: string[];
}

export interface EntryExitStrategy {
  entryConditions: string[];
  exitConditions: string[];
  stopLossStrategy: string;
  profitTargets: number[];
}

export interface ComprehensiveRiskAssessment {
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  riskFactors: string[];
  mitigationStrategies: string[];
}

export type SignalDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';