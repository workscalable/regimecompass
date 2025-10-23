import { EventEmitter } from 'events';

/**
 * Market-Based Risk Adjustments System
 * 
 * Implements dynamic risk adjustments based on market conditions:
 * - Fibonacci zone risk multipliers (0% for EXHAUSTION zones)
 * - VIX-based position size reduction (50% when VIX > 30)
 * - Regime-aware risk management and volatility adjustments
 * - Market breadth and sector rotation considerations
 * - Real-time market condition monitoring
 */

export type FibZone = 'COMPRESSION' | 'MID_EXPANSION' | 'FULL_EXPANSION' | 'OVER_EXTENSION' | 'EXHAUSTION';
export type MarketRegime = 'BULL_MARKET' | 'BEAR_MARKET' | 'SIDEWAYS' | 'HIGH_VOLATILITY' | 'LOW_VOLATILITY';
export type VolatilityEnvironment = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export interface MarketBasedRiskConfig {
  // Fibonacci zone multipliers
  fibZoneMultipliers: Record<FibZone, number>;
  
  // VIX-based adjustments
  vixThresholds: {
    low: number;        // < 15
    medium: number;     // 15-25
    high: number;       // 25-35
    extreme: number;    // > 35
  };
  vixMultipliers: {
    low: number;        // 1.0 (no adjustment)
    medium: number;     // 0.8
    high: number;       // 0.5
    extreme: number;    // 0.2
  };
  
  // Market regime adjustments
  regimeMultipliers: Record<MarketRegime, number>;
  
  // Market breadth thresholds
  breadthThresholds: {
    strong: number;     // > 0.7
    neutral: number;    // 0.3-0.7
    weak: number;       // < 0.3
  };
  breadthMultipliers: {
    strong: number;     // 1.1
    neutral: number;    // 1.0
    weak: number;       // 0.7
  };
  
  // Sector rotation impact
  sectorRotationMultipliers: {
    favorable: number;  // 1.1
    neutral: number;    // 1.0
    unfavorable: number; // 0.8
  };
  
  // Update intervals
  updateIntervalMinutes: number; // 5 minutes
  
  // Emergency overrides
  emergencyOverrides: {
    enabled: boolean;
    maxReduction: number; // 0.1 (10% minimum)
    triggerConditions: string[];
  };
}

export interface MarketConditions {
  timestamp: Date;
  vix: number;
  regime: MarketRegime;
  volatilityEnvironment: VolatilityEnvironment;
  marketBreadth: number; // 0-1 scale
  sectorRotation: 'FAVORABLE' | 'NEUTRAL' | 'UNFAVORABLE';
  
  // Additional market indicators
  spyPrice: number;
  spyChange: number;
  volumeRatio: number; // Current vs average volume
  putCallRatio: number;
  termStructure: 'NORMAL' | 'FLAT' | 'INVERTED';
}

export interface RiskAdjustments {
  fibZoneMultiplier: number;
  vixMultiplier: number;
  regimeMultiplier: number;
  breadthMultiplier: number;
  sectorMultiplier: number;
  emergencyMultiplier: number;
  
  // Combined multiplier
  totalMultiplier: number;
  
  // Reasoning
  adjustmentReasons: string[];
  riskLevel: 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' | 'EMERGENCY';
}

export class MarketBasedRiskAdjustments extends EventEmitter {
  private config: MarketBasedRiskConfig;
  private currentConditions: MarketConditions | null = null;
  private currentAdjustments: RiskAdjustments;
  private lastUpdate: Date = new Date();
  private updateTimer: NodeJS.Timeout | null = null;

  constructor(config: MarketBasedRiskConfig) {
    super();
    this.config = config;
    this.currentAdjustments = this.initializeAdjustments();
    this.startPeriodicUpdates();
  }

  /**
   * Update market conditions and recalculate risk adjustments
   */
  public updateMarketConditions(conditions: MarketConditions): RiskAdjustments {
    this.currentConditions = conditions;
    this.lastUpdate = new Date();
    
    // Calculate all risk adjustments
    const adjustments = this.calculateRiskAdjustments(conditions);
    
    // Check for significant changes
    if (this.hasSignificantChange(adjustments)) {
      this.currentAdjustments = adjustments;
      this.emit('riskAdjustmentsUpdated', adjustments);
      
      // Emit specific alerts for critical changes
      if (adjustments.riskLevel === 'CRITICAL' || adjustments.riskLevel === 'EMERGENCY') {
        this.emit('criticalRiskAdjustment', {
          conditions,
          adjustments,
          timestamp: new Date()
        });
      }
    }

    return adjustments;
  }

  /**
   * Get risk multiplier for a specific Fibonacci zone
   */
  public getFibZoneMultiplier(zone: FibZone): number {
    return this.config.fibZoneMultipliers[zone] || 1.0;
  }

  /**
   * Get VIX-based risk multiplier
   */
  public getVixMultiplier(vix: number): number {
    if (vix >= this.config.vixThresholds.extreme) {
      return this.config.vixMultipliers.extreme;
    } else if (vix >= this.config.vixThresholds.high) {
      return this.config.vixMultipliers.high;
    } else if (vix >= this.config.vixThresholds.medium) {
      return this.config.vixMultipliers.medium;
    } else {
      return this.config.vixMultipliers.low;
    }
  }

  /**
   * Get regime-based risk multiplier
   */
  public getRegimeMultiplier(regime: MarketRegime): number {
    return this.config.regimeMultipliers[regime] || 1.0;
  }

  /**
   * Get current risk adjustments
   */
  public getCurrentAdjustments(): RiskAdjustments {
    return { ...this.currentAdjustments };
  }

  /**
   * Get current market conditions
   */
  public getCurrentConditions(): MarketConditions | null {
    return this.currentConditions ? { ...this.currentConditions } : null;
  }

  /**
   * Calculate comprehensive risk adjustment for a trade
   */
  public calculateTradeRiskAdjustment(
    fibZone: FibZone,
    confidence: number,
    ticker: string
  ): {
    multiplier: number;
    reasoning: string[];
    approved: boolean;
  } {
    const reasoning: string[] = [];
    let multiplier = 1.0;
    let approved = true;

    // Apply Fibonacci zone multiplier
    const fibMultiplier = this.getFibZoneMultiplier(fibZone);
    multiplier *= fibMultiplier;
    reasoning.push(`Fib zone (${fibZone}): ${fibMultiplier.toFixed(2)}x`);

    // Block trades in EXHAUSTION zones
    if (fibZone === 'EXHAUSTION') {
      approved = false;
      reasoning.push('Trade blocked: EXHAUSTION zone detected');
    }

    // Apply current market adjustments
    if (this.currentConditions) {
      const marketMultiplier = this.currentAdjustments.totalMultiplier;
      multiplier *= marketMultiplier;
      reasoning.push(`Market conditions: ${marketMultiplier.toFixed(2)}x`);
      
      // Add specific market reasoning
      reasoning.push(...this.currentAdjustments.adjustmentReasons);
    }

    // Apply confidence-based adjustment
    const confidenceMultiplier = this.getConfidenceMultiplier(confidence);
    multiplier *= confidenceMultiplier;
    reasoning.push(`Confidence (${(confidence * 100).toFixed(0)}%): ${confidenceMultiplier.toFixed(2)}x`);

    // Emergency override check
    if (this.config.emergencyOverrides.enabled && this.isEmergencyCondition()) {
      multiplier = Math.min(multiplier, this.config.emergencyOverrides.maxReduction);
      reasoning.push('Emergency override applied');
      approved = false;
    }

    return {
      multiplier: Math.max(multiplier, 0),
      reasoning,
      approved
    };
  } 
 // Private helper methods

  private initializeAdjustments(): RiskAdjustments {
    return {
      fibZoneMultiplier: 1.0,
      vixMultiplier: 1.0,
      regimeMultiplier: 1.0,
      breadthMultiplier: 1.0,
      sectorMultiplier: 1.0,
      emergencyMultiplier: 1.0,
      totalMultiplier: 1.0,
      adjustmentReasons: [],
      riskLevel: 'NORMAL'
    };
  }

  private calculateRiskAdjustments(conditions: MarketConditions): RiskAdjustments {
    const adjustments: RiskAdjustments = {
      fibZoneMultiplier: 1.0, // This will be applied per-trade
      vixMultiplier: this.getVixMultiplier(conditions.vix),
      regimeMultiplier: this.getRegimeMultiplier(conditions.regime),
      breadthMultiplier: this.getBreadthMultiplier(conditions.marketBreadth),
      sectorMultiplier: this.getSectorMultiplier(conditions.sectorRotation),
      emergencyMultiplier: this.getEmergencyMultiplier(conditions),
      totalMultiplier: 1.0,
      adjustmentReasons: [],
      riskLevel: 'NORMAL'
    };

    // Calculate total multiplier
    adjustments.totalMultiplier = 
      adjustments.vixMultiplier *
      adjustments.regimeMultiplier *
      adjustments.breadthMultiplier *
      adjustments.sectorMultiplier *
      adjustments.emergencyMultiplier;

    // Generate reasoning
    adjustments.adjustmentReasons = this.generateAdjustmentReasons(conditions, adjustments);

    // Determine risk level
    adjustments.riskLevel = this.determineRiskLevel(conditions, adjustments);

    return adjustments;
  }

  private getBreadthMultiplier(breadth: number): number {
    if (breadth >= this.config.breadthThresholds.strong) {
      return this.config.breadthMultipliers.strong;
    } else if (breadth >= this.config.breadthThresholds.neutral) {
      return this.config.breadthMultipliers.neutral;
    } else {
      return this.config.breadthMultipliers.weak;
    }
  }

  private getSectorMultiplier(rotation: 'FAVORABLE' | 'NEUTRAL' | 'UNFAVORABLE'): number {
    switch (rotation) {
      case 'FAVORABLE': return this.config.sectorRotationMultipliers.favorable;
      case 'NEUTRAL': return this.config.sectorRotationMultipliers.neutral;
      case 'UNFAVORABLE': return this.config.sectorRotationMultipliers.unfavorable;
      default: return 1.0;
    }
  }

  private getEmergencyMultiplier(conditions: MarketConditions): number {
    if (!this.config.emergencyOverrides.enabled) {
      return 1.0;
    }

    // Check for emergency conditions
    const emergencyConditions = [
      conditions.vix > 50, // Extreme volatility
      Math.abs(conditions.spyChange) > 0.05, // 5% daily move
      conditions.putCallRatio > 2.0, // Extreme fear
      conditions.termStructure === 'INVERTED' && conditions.vix > 30
    ];

    const emergencyCount = emergencyConditions.filter(Boolean).length;
    
    if (emergencyCount >= 2) {
      return this.config.emergencyOverrides.maxReduction;
    } else if (emergencyCount >= 1) {
      return 0.5; // 50% reduction for single emergency condition
    }

    return 1.0;
  }

  private getConfidenceMultiplier(confidence: number): number {
    // Confidence-based position sizing
    if (confidence >= 0.8) {
      return 1.2; // Increase size for high confidence
    } else if (confidence >= 0.7) {
      return 1.0; // Normal size
    } else if (confidence >= 0.6) {
      return 0.8; // Reduce size for lower confidence
    } else {
      return 0.5; // Significantly reduce for very low confidence
    }
  }

  private generateAdjustmentReasons(conditions: MarketConditions, adjustments: RiskAdjustments): string[] {
    const reasons: string[] = [];

    if (adjustments.vixMultiplier < 1.0) {
      reasons.push(`VIX ${conditions.vix.toFixed(1)} → ${(adjustments.vixMultiplier * 100).toFixed(0)}% sizing`);
    }

    if (adjustments.regimeMultiplier < 1.0) {
      reasons.push(`${conditions.regime} regime → ${(adjustments.regimeMultiplier * 100).toFixed(0)}% sizing`);
    }

    if (adjustments.breadthMultiplier < 1.0) {
      reasons.push(`Weak breadth ${(conditions.marketBreadth * 100).toFixed(0)}% → ${(adjustments.breadthMultiplier * 100).toFixed(0)}% sizing`);
    }

    if (adjustments.sectorMultiplier < 1.0) {
      reasons.push(`${conditions.sectorRotation} sector rotation → ${(adjustments.sectorMultiplier * 100).toFixed(0)}% sizing`);
    }

    if (adjustments.emergencyMultiplier < 1.0) {
      reasons.push(`Emergency conditions → ${(adjustments.emergencyMultiplier * 100).toFixed(0)}% sizing`);
    }

    if (reasons.length === 0) {
      reasons.push('Normal market conditions');
    }

    return reasons;
  }

  private determineRiskLevel(conditions: MarketConditions, adjustments: RiskAdjustments): 'NORMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' | 'EMERGENCY' {
    if (adjustments.emergencyMultiplier < 0.5) {
      return 'EMERGENCY';
    } else if (adjustments.totalMultiplier < 0.3) {
      return 'CRITICAL';
    } else if (adjustments.totalMultiplier < 0.5) {
      return 'HIGH';
    } else if (adjustments.totalMultiplier < 0.8) {
      return 'ELEVATED';
    } else {
      return 'NORMAL';
    }
  }

  private hasSignificantChange(newAdjustments: RiskAdjustments): boolean {
    const threshold = 0.1; // 10% change threshold
    return Math.abs(newAdjustments.totalMultiplier - this.currentAdjustments.totalMultiplier) > threshold ||
           newAdjustments.riskLevel !== this.currentAdjustments.riskLevel;
  }

  private isEmergencyCondition(): boolean {
    if (!this.currentConditions) return false;
    
    return this.currentConditions.vix > 50 ||
           Math.abs(this.currentConditions.spyChange) > 0.05 ||
           this.currentConditions.putCallRatio > 2.0;
  }

  private startPeriodicUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.emit('updateRequested', { timestamp: new Date() });
    }, this.config.updateIntervalMinutes * 60 * 1000);
  }

  /**
   * Force immediate update of market conditions
   */
  public forceUpdate(): void {
    this.emit('updateRequested', { timestamp: new Date(), forced: true });
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<MarketBasedRiskConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart periodic updates if interval changed
    if (newConfig.updateIntervalMinutes) {
      this.startPeriodicUpdates();
    }
    
    this.emit('configUpdated', this.config);
  }

  /**
   * Get configuration
   */
  public getConfig(): MarketBasedRiskConfig {
    return { ...this.config };
  }

  /**
   * Get market risk assessment
   */
  public getMarketRiskAssessment(): {
    riskLevel: string;
    totalMultiplier: number;
    keyFactors: string[];
    recommendations: string[];
    lastUpdate: Date;
  } {
    const keyFactors: string[] = [];
    const recommendations: string[] = [];

    if (this.currentConditions) {
      if (this.currentConditions.vix > 30) {
        keyFactors.push(`High VIX: ${this.currentConditions.vix.toFixed(1)}`);
        recommendations.push('Reduce position sizes due to elevated volatility');
      }

      if (this.currentConditions.regime === 'BEAR_MARKET') {
        keyFactors.push('Bear market regime');
        recommendations.push('Use defensive positioning and tighter stops');
      }

      if (this.currentConditions.marketBreadth < 0.3) {
        keyFactors.push(`Weak market breadth: ${(this.currentConditions.marketBreadth * 100).toFixed(0)}%`);
        recommendations.push('Focus on high-quality setups only');
      }

      if (this.currentConditions.putCallRatio > 1.5) {
        keyFactors.push(`High put/call ratio: ${this.currentConditions.putCallRatio.toFixed(2)}`);
        recommendations.push('Consider contrarian opportunities');
      }
    }

    if (keyFactors.length === 0) {
      keyFactors.push('Normal market conditions');
      recommendations.push('Standard risk management applies');
    }

    return {
      riskLevel: this.currentAdjustments.riskLevel,
      totalMultiplier: this.currentAdjustments.totalMultiplier,
      keyFactors,
      recommendations,
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.removeAllListeners();
  }
}