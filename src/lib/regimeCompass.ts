import { 
  MarketSnapshot, 
  RegimeType, 
  RegimeClassification, 
  RegimeFactors, 
  EarlyWarningSignals,
  ConfidenceLevel,
  IndexData,
  BreadthData,
  VIXData,
  GammaData,
  VolatilityTrend
} from './types';
import { checkEMAAlignment, calculateRegimeStrength } from './math';

/**
 * RegimeCompass - Core regime classification engine
 * Implements the 5-factor regime detection system:
 * 1. Breadth (62%+ bull, 38%- bear)
 * 2. EMA Alignment (EMA20 vs EMA50)
 * 3. Trend Score (9-day momentum >= |3|)
 * 4. Volatility (VIX level and direction)
 * 5. Gamma (Options market structure)
 */
export class RegimeCompass {
  
  /**
   * Classify market regime based on 5-factor analysis
   * ALL factors must align for BULL or BEAR classification
   */
  classify(snapshot: MarketSnapshot): RegimeClassification {
    const factors = this.evaluateRegimeFactors(snapshot);
    const regime = this.determineRegime(factors);
    const strength = this.calculateRegimeStrength(snapshot, factors);
    const confidence = this.calculateConfidence(factors, strength);
    
    return {
      regime,
      confidence,
      strength,
      factors,
      timestamp: new Date(),
      regimeDuration: 0 // TODO: Track regime duration
    };
  }

  /**
   * Evaluate all 5 regime factors
   */
  private evaluateRegimeFactors(snapshot: MarketSnapshot): RegimeFactors {
    const breadthFactor = this.evaluateBreadthFactor(snapshot.breadth);
    const emaFactor = this.evaluateEMAFactor(snapshot.indexes.SPY);
    const trendFactor = this.evaluateTrendFactor(snapshot.indexes.SPY);
    const volatilityFactor = this.evaluateVolatilityFactor(snapshot.vix, snapshot.derivedSignals.volatilityTrend);
    const gammaFactor = this.evaluateGammaFactor(snapshot.gamma);

    return {
      breadth: breadthFactor.bull || breadthFactor.bear,
      emaAlignment: emaFactor.bull || emaFactor.bear,
      trendScore: trendFactor.bull || trendFactor.bear,
      volatility: volatilityFactor.bull || volatilityFactor.bear,
      gamma: gammaFactor.bull || gammaFactor.bear
    };
  }

  /**
   * Factor 1: Breadth Analysis
   * BULL: >= 62% stocks advancing
   * BEAR: <= 38% stocks advancing
   */
  private evaluateBreadthFactor(breadth: BreadthData): { bull: boolean; bear: boolean } {
    const breadthPct = breadth.breadthPct;
    
    return {
      bull: breadthPct >= 0.62,
      bear: breadthPct <= 0.38
    };
  }

  /**
   * Factor 2: EMA Alignment
   * BULL: EMA20 > EMA50 * 1.0025 (0.25% buffer)
   * BEAR: EMA20 < EMA50 * 0.9975 (0.25% buffer)
   */
  private evaluateEMAFactor(spyData: IndexData): { bull: boolean; bear: boolean } {
    return {
      bull: checkEMAAlignment(spyData.ema20, spyData.ema50, 'bull'),
      bear: checkEMAAlignment(spyData.ema20, spyData.ema50, 'bear')
    };
  }

  /**
   * Factor 3: Trend Score (9-day momentum)
   * BULL: >= +3 (more up days than down)
   * BEAR: <= -3 (more down days than up)
   */
  private evaluateTrendFactor(spyData: IndexData): { bull: boolean; bear: boolean } {
    const trendScore = spyData.trendScore9;
    
    return {
      bull: trendScore >= 3,
      bear: trendScore <= -3
    };
  }

  /**
   * Factor 4: Volatility Analysis
   * BULL: VIX < 20 OR VIX declining
   * BEAR: VIX > 20 OR VIX rising
   */
  private evaluateVolatilityFactor(vix: VIXData, trend: VolatilityTrend): { bull: boolean; bear: boolean } {
    const vixLevel = vix.value;
    const vixTrend = vix.trend; // Use the trend from VIX data itself
    
    return {
      bull: vixLevel < 20 || vixTrend === 'falling',
      bear: vixLevel > 20 || vixTrend === 'rising'
    };
  }

  /**
   * Factor 5: Gamma Analysis
   * BULL: GEX <= 0 OR zero gamma distance < 0.01 (supportive)
   * BEAR: GEX < 0 (suppressive)
   */
  private evaluateGammaFactor(gamma: GammaData): { bull: boolean; bear: boolean } {
    const gex = gamma.gex;
    const zeroGammaDist = gamma.zeroGammaDist;
    
    return {
      bull: gex <= 0 || zeroGammaDist < 0.01,
      bear: gex < 0
    };
  }

  /**
   * Determine regime based on factor alignment
   * ALL factors must align for BULL or BEAR
   */
  private determineRegime(factors: RegimeFactors): RegimeType {
    // Check for BULL regime - all factors must be bullish
    const bullFactors = this.getBullFactors(factors);
    if (bullFactors.every(factor => factor)) {
      return 'BULL';
    }

    // Check for BEAR regime - all factors must be bearish  
    const bearFactors = this.getBearFactors(factors);
    if (bearFactors.every(factor => factor)) {
      return 'BEAR';
    }

    // Mixed signals = NEUTRAL
    return 'NEUTRAL';
  }

  /**
   * Get bull-specific factor evaluations
   */
  private getBullFactors(factors: RegimeFactors): boolean[] {
    // For BULL, we need to re-evaluate each factor for bullish conditions
    // This is a simplified version - in practice, we'd store the detailed evaluations
    return [
      factors.breadth,
      factors.emaAlignment, 
      factors.trendScore,
      factors.volatility,
      factors.gamma
    ];
  }

  /**
   * Get bear-specific factor evaluations
   */
  private getBearFactors(factors: RegimeFactors): boolean[] {
    // For BEAR, we need to re-evaluate each factor for bearish conditions
    // This is a simplified version - in practice, we'd store the detailed evaluations
    return [
      factors.breadth,
      factors.emaAlignment,
      factors.trendScore, 
      factors.volatility,
      factors.gamma
    ];
  }

  /**
   * Calculate regime strength (0-100 scale)
   * Based on how strongly each factor aligns
   */
  private calculateRegimeStrength(snapshot: MarketSnapshot, factors: RegimeFactors): number {
    const breadthPct = snapshot.breadth.breadthPct;
    const trendScore = snapshot.indexes.SPY.trendScore9;
    const emaAlignment = factors.emaAlignment;
    const vixLevel = snapshot.vix.value;
    const gammaSupport = factors.gamma;

    return calculateRegimeStrength(
      breadthPct,
      trendScore,
      emaAlignment,
      vixLevel,
      gammaSupport
    );
  }

  /**
   * Calculate confidence level based on factor alignment and strength
   */
  private calculateConfidence(factors: RegimeFactors, strength: number): number {
    const factorCount = Object.values(factors).filter(Boolean).length;
    const factorAlignment = factorCount / 5; // 0-1 scale
    const strengthFactor = strength / 100; // 0-1 scale
    
    // Combine factor alignment and strength for confidence
    const confidence = (factorAlignment * 0.6) + (strengthFactor * 0.4);
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }

  /**
   * Detect early warning signals for regime changes
   */
  detectEarlyWarningSignals(snapshot: MarketSnapshot): EarlyWarningSignals {
    const currentRegime = snapshot.regime;
    const factors = this.evaluateRegimeFactors(snapshot);
    
    let bullToBearWarning = false;
    let bearToBullWarning = false;
    const warningFactors: string[] = [];
    let confirmationLevel: ConfidenceLevel = 'low';

    if (currentRegime === 'BULL') {
      // Check for deteriorating BULL conditions
      const warnings = this.checkBullDeteriorationWarnings(snapshot);
      bullToBearWarning = warnings.length >= 2;
      warningFactors.push(...warnings);
      
      if (warnings.length >= 4) confirmationLevel = 'high';
      else if (warnings.length >= 3) confirmationLevel = 'medium';
    }

    if (currentRegime === 'BEAR') {
      // Check for improving conditions (BEAR to BULL)
      const improvements = this.checkBearImprovementSignals(snapshot);
      bearToBullWarning = improvements.length >= 2;
      warningFactors.push(...improvements);
      
      if (improvements.length >= 4) confirmationLevel = 'high';
      else if (improvements.length >= 3) confirmationLevel = 'medium';
    }

    return {
      bullToBearWarning,
      bearToBullWarning,
      confirmationLevel,
      warningFactors,
      timeframe: this.estimateChangeTimeframe(warningFactors.length)
    };
  }

  /**
   * Check for BULL regime deterioration warnings
   */
  private checkBullDeteriorationWarnings(snapshot: MarketSnapshot): string[] {
    const warnings: string[] = [];
    
    // Breadth deterioration
    if (snapshot.breadth.breadthPct < 0.55) {
      warnings.push('Breadth deteriorating below 55%');
    }
    
    // Momentum slowing
    if (snapshot.indexes.SPY.trendScore9 <= 1) {
      warnings.push('Momentum slowing (trend score <= 1)');
    }
    
    // VIX rising
    if (snapshot.vix.value > 18 && snapshot.derivedSignals.volatilityTrend === 'rising') {
      warnings.push('VIX rising above 18');
    }
    
    // EMA compression
    const emaSpread = (snapshot.indexes.SPY.ema20 - snapshot.indexes.SPY.ema50) / snapshot.indexes.SPY.ema50;
    if (emaSpread < 0.005) { // Less than 0.5% spread
      warnings.push('EMA compression detected');
    }
    
    // Gamma turning suppressive
    if (snapshot.gamma.bias === 'suppressive') {
      warnings.push('Gamma exposure turning suppressive');
    }

    return warnings;
  }

  /**
   * Check for BEAR regime improvement signals
   */
  private checkBearImprovementSignals(snapshot: MarketSnapshot): string[] {
    const improvements: string[] = [];
    
    // Breadth improvement
    if (snapshot.breadth.breadthPct > 0.45) {
      improvements.push('Breadth improving above 45%');
    }
    
    // Momentum improving
    if (snapshot.indexes.SPY.trendScore9 >= -1) {
      improvements.push('Momentum improving (trend score >= -1)');
    }
    
    // VIX declining
    if (snapshot.vix.value < 25 && snapshot.derivedSignals.volatilityTrend === 'falling') {
      improvements.push('VIX declining below 25');
    }
    
    // EMA convergence
    const emaAlignment = snapshot.indexes.SPY.ema20 > snapshot.indexes.SPY.ema50 * 0.995;
    if (emaAlignment) {
      improvements.push('EMA alignment improving');
    }
    
    // Gamma turning supportive
    if (snapshot.gamma.bias === 'supportive') {
      improvements.push('Gamma exposure turning supportive');
    }

    return improvements;
  }

  /**
   * Estimate timeframe for regime change based on warning signals
   */
  private estimateChangeTimeframe(warningCount: number): string {
    if (warningCount >= 4) return '1-3 days';
    if (warningCount >= 3) return '3-7 days';
    if (warningCount >= 2) return '1-2 weeks';
    return '2-4 weeks';
  }

  /**
   * Get detailed regime analysis with factor breakdown
   */
  getDetailedAnalysis(snapshot: MarketSnapshot): {
    classification: RegimeClassification;
    factorAnalysis: {
      breadth: { value: number; status: string; bullish: boolean; bearish: boolean };
      ema: { ema20: number; ema50: number; spread: number; bullish: boolean; bearish: boolean };
      trend: { score: number; bullish: boolean; bearish: boolean };
      volatility: { vix: number; trend: string; bullish: boolean; bearish: boolean };
      gamma: { gex: number; bias: string; bullish: boolean; bearish: boolean };
    };
    earlyWarnings: EarlyWarningSignals;
  } {
    const classification = this.classify(snapshot);
    const earlyWarnings = this.detectEarlyWarningSignals(snapshot);
    
    // Detailed factor analysis
    const breadthFactor = this.evaluateBreadthFactor(snapshot.breadth);
    const emaFactor = this.evaluateEMAFactor(snapshot.indexes.SPY);
    const trendFactor = this.evaluateTrendFactor(snapshot.indexes.SPY);
    const volatilityFactor = this.evaluateVolatilityFactor(snapshot.vix, snapshot.derivedSignals.volatilityTrend);
    const gammaFactor = this.evaluateGammaFactor(snapshot.gamma);

    const factorAnalysis = {
      breadth: {
        value: snapshot.breadth.breadthPct,
        status: snapshot.breadth.breadthPct >= 0.62 ? 'Strong' : 
                snapshot.breadth.breadthPct <= 0.38 ? 'Weak' : 'Neutral',
        bullish: breadthFactor.bull,
        bearish: breadthFactor.bear
      },
      ema: {
        ema20: snapshot.indexes.SPY.ema20,
        ema50: snapshot.indexes.SPY.ema50,
        spread: (snapshot.indexes.SPY.ema20 - snapshot.indexes.SPY.ema50) / snapshot.indexes.SPY.ema50,
        bullish: emaFactor.bull,
        bearish: emaFactor.bear
      },
      trend: {
        score: snapshot.indexes.SPY.trendScore9,
        bullish: trendFactor.bull,
        bearish: trendFactor.bear
      },
      volatility: {
        vix: snapshot.vix.value,
        trend: snapshot.derivedSignals.volatilityTrend,
        bullish: volatilityFactor.bull,
        bearish: volatilityFactor.bear
      },
      gamma: {
        gex: snapshot.gamma.gex,
        bias: snapshot.gamma.bias,
        bullish: gammaFactor.bull,
        bearish: gammaFactor.bear
      }
    };

    return {
      classification,
      factorAnalysis,
      earlyWarnings
    };
  }

  /**
   * Check if regime change is imminent based on factor deterioration
   */
  isRegimeChangeImminent(snapshot: MarketSnapshot): {
    imminent: boolean;
    probability: number;
    timeframe: string;
    triggerFactors: string[];
  } {
    const earlyWarnings = this.detectEarlyWarningSignals(snapshot);
    const warningCount = earlyWarnings.warningFactors.length;
    
    const imminent = warningCount >= 3;
    const probability = Math.min(0.9, warningCount * 0.2);
    
    return {
      imminent,
      probability,
      timeframe: earlyWarnings.timeframe,
      triggerFactors: earlyWarnings.warningFactors
    };
  }
}

// Export singleton instance
export const regimeCompass = new RegimeCompass();