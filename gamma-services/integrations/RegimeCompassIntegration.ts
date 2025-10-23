import { EventBus } from '../core/EventBus';
import { PaperTradingEngine } from '../paper/PaperTradingEngine';
import { TradeSignal, MarketRegime } from '../models/PaperTradingTypes';

// Import existing RegimeCompass types
interface RegimeClassification {
  regime: 'BULL' | 'BEAR' | 'NEUTRAL';
  confidence: number;
  strength: number;
  factors: {
    breadth: boolean;
    emaAlignment: boolean;
    trendScore: boolean;
    volatility: boolean;
    gamma: boolean;
  };
  timestamp: Date;
}

interface MarketSnapshot {
  timestamp: Date;
  regime: 'BULL' | 'BEAR' | 'NEUTRAL';
  breadth: {
    breadthPct: number;
    advancingStocks: number;
    decliningStocks: number;
  };
  indexes: {
    SPY: any;
    QQQ: any;
    IWM: any;
  };
  sectors: Record<string, any>;
  derivedSignals: any;
  predictiveSignals: any;
  riskMetrics: any;
}

export interface RegimeBasedSignal {
  signalId: string;
  ticker: string;
  regime: MarketRegime;
  regimeStrength: number;
  regimeConfidence: number;
  recommendedAction: 'LONG' | 'SHORT' | 'HEDGE' | 'CASH';
  positionSizing: number; // 0-1 multiplier
  reasoning: string[];
  sectorRecommendations: {
    overweight: string[];
    underweight: string[];
    avoid: string[];
  };
}

export interface RegimeConfig {
  enableRegimeSignals: boolean;
  regimeConfidenceThreshold: number;
  regimeStrengthThreshold: number;
  sectorRotationEnabled: boolean;
  adaptivePositionSizing: boolean;
}

export class RegimeCompassIntegration {
  private eventBus: EventBus;
  private paperEngine?: PaperTradingEngine;
  private config: RegimeConfig;
  private currentRegime: RegimeClassification | null = null;
  private lastRegimeUpdate: number = 0;
  private regimeHistory: RegimeClassification[] = [];

  constructor(
    eventBus: EventBus,
    config: RegimeConfig,
    paperEngine?: PaperTradingEngine
  ) {
    this.eventBus = eventBus;
    this.config = config;
    this.paperEngine = paperEngine;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for regime updates from existing RegimeCompass
    this.eventBus.on('regime:classified', (classification: RegimeClassification) => {
      this.handleRegimeUpdate(classification);
    });

    // Listen for market snapshots
    this.eventBus.on('market:snapshot', (snapshot: MarketSnapshot) => {
      this.handleMarketSnapshot(snapshot);
    });

    // Listen for sector analysis updates
    this.eventBus.on('sector:analysis', (data: any) => {
      this.handleSectorAnalysis(data);
    });

    // Listen for trade signals to apply regime-based adjustments
    this.eventBus.on('trade:signal:raw', (signal: TradeSignal) => {
      this.adjustSignalForRegime(signal);
    });
  }

  private handleRegimeUpdate(classification: RegimeClassification): void {
    const previousRegime = this.currentRegime?.regime;
    this.currentRegime = classification;
    this.lastRegimeUpdate = Date.now();
    
    // Add to history
    this.regimeHistory.push(classification);
    if (this.regimeHistory.length > 100) {
      this.regimeHistory = this.regimeHistory.slice(-100);
    }

    // Emit regime update for other systems
    this.eventBus.emit('regime:update', {
      ticker: 'MARKET', // Market-wide regime
      regime: classification.regime as MarketRegime,
      confidence: classification.confidence,
      strength: classification.strength,
      timestamp: classification.timestamp
    });

    // Check for regime change
    if (previousRegime && previousRegime !== classification.regime) {
      this.handleRegimeChange(previousRegime, classification.regime, classification);
    }

    // Generate regime-based signals if enabled
    if (this.config.enableRegimeSignals) {
      this.generateRegimeBasedSignals(classification);
    }

    console.log(`🧭 Regime updated: ${classification.regime} (confidence: ${classification.confidence.toFixed(2)}, strength: ${classification.strength.toFixed(2)})`);
  }

  private handleRegimeChange(
    previousRegime: string,
    newRegime: string,
    classification: RegimeClassification
  ): void {
    console.log(`🧭 Regime change detected: ${previousRegime} → ${newRegime}`);

    // Emit regime change event
    this.eventBus.emit('regime:changed', {
      from: previousRegime,
      to: newRegime,
      classification,
      timestamp: new Date()
    });

    // Adjust existing positions based on new regime
    this.adjustPositionsForRegimeChange(newRegime, classification);

    // Generate regime transition signals
    this.generateRegimeTransitionSignals(previousRegime, newRegime, classification);
  }

  private handleMarketSnapshot(snapshot: MarketSnapshot): void {
    // Use snapshot data to enhance regime analysis
    if (this.currentRegime) {
      // Calculate regime-adjusted position sizing
      const positionSizing = this.calculateRegimePositionSizing(this.currentRegime, snapshot);
      
      // Emit position sizing update
      this.eventBus.emit('regime:position:sizing', {
        regime: this.currentRegime.regime,
        multiplier: positionSizing,
        reasoning: this.getPositionSizingReasoning(this.currentRegime, snapshot)
      });
    }
  }

  private handleSectorAnalysis(data: any): void {
    if (!this.currentRegime || !this.config.sectorRotationEnabled) return;

    // Generate sector rotation signals based on regime
    const sectorSignals = this.generateSectorRotationSignals(this.currentRegime, data);
    
    for (const signal of sectorSignals) {
      this.eventBus.emit('sector:signal', signal);
    }
  }

  private adjustSignalForRegime(signal: TradeSignal): void {
    if (!this.currentRegime) {
      // No regime data available, pass through unchanged
      this.eventBus.emit('trade:signal:adjusted', signal);
      return;
    }

    const adjustedSignal = { ...signal };

    // Adjust confidence based on regime alignment
    const regimeAlignment = this.calculateRegimeAlignment(signal, this.currentRegime);
    adjustedSignal.confidence *= regimeAlignment;

    // Adjust position sizing based on regime
    if (this.config.adaptivePositionSizing) {
      const positionMultiplier = this.calculateRegimePositionSizing(this.currentRegime);
      // This would be used by the position sizing logic
    }

    // Add regime context to signal
    adjustedSignal.regime = this.currentRegime.regime as MarketRegime;

    // Emit adjusted signal
    this.eventBus.emit('trade:signal:adjusted', adjustedSignal);

    console.log(`🧭 Signal adjusted for regime: ${signal.ticker} confidence ${signal.confidence.toFixed(3)} → ${adjustedSignal.confidence.toFixed(3)}`);
  }

  private calculateRegimeAlignment(signal: TradeSignal, regime: RegimeClassification): number {
    let alignment = 1.0;

    // Boost alignment for regime-consistent trades
    if (regime.regime === 'BULL' && signal.side === 'LONG') {
      alignment = 1.0 + (regime.strength * 0.2); // Up to 20% boost
    } else if (regime.regime === 'BEAR' && signal.side === 'SHORT') {
      alignment = 1.0 + (regime.strength * 0.2);
    } else if (regime.regime === 'NEUTRAL') {
      alignment = 0.9; // Slight reduction in neutral markets
    } else {
      // Counter-regime trades
      alignment = 0.8 - (regime.strength * 0.2); // Reduce confidence for counter-regime trades
    }

    // Factor in regime confidence
    alignment *= (0.5 + regime.confidence * 0.5); // Scale by regime confidence

    return Math.max(0.3, Math.min(1.5, alignment)); // Bound between 30% and 150%
  }

  private calculateRegimePositionSizing(
    regime: RegimeClassification,
    snapshot?: MarketSnapshot
  ): number {
    let multiplier = 1.0;

    // Base multiplier on regime type and strength
    switch (regime.regime) {
      case 'BULL':
        multiplier = 0.8 + (regime.strength * 0.4); // 80% to 120%
        break;
      case 'BEAR':
        multiplier = 0.6 + (regime.strength * 0.3); // 60% to 90%
        break;
      case 'NEUTRAL':
        multiplier = 0.5 + (regime.confidence * 0.3); // 50% to 80%
        break;
    }

    // Adjust for regime confidence
    multiplier *= (0.7 + regime.confidence * 0.3);

    // Additional adjustments based on market snapshot
    if (snapshot) {
      // Reduce sizing if breadth is poor
      if (snapshot.breadth.breadthPct < 0.4) {
        multiplier *= 0.8;
      }
      
      // Increase sizing if breadth is strong
      if (snapshot.breadth.breadthPct > 0.7) {
        multiplier *= 1.1;
      }
    }

    return Math.max(0.2, Math.min(1.5, multiplier));
  }

  private getPositionSizingReasoning(
    regime: RegimeClassification,
    snapshot: MarketSnapshot
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`${regime.regime} regime with ${(regime.strength * 100).toFixed(0)}% strength`);
    reasoning.push(`Regime confidence: ${(regime.confidence * 100).toFixed(0)}%`);

    if (snapshot.breadth.breadthPct > 0.7) {
      reasoning.push('Strong market breadth supports larger positions');
    } else if (snapshot.breadth.breadthPct < 0.4) {
      reasoning.push('Weak market breadth suggests smaller positions');
    }

    return reasoning;
  }

  private generateRegimeBasedSignals(classification: RegimeClassification): void {
    if (classification.confidence < this.config.regimeConfidenceThreshold ||
        classification.strength < this.config.regimeStrengthThreshold) {
      return; // Not confident enough in regime to generate signals
    }

    const signals: RegimeBasedSignal[] = [];

    // Generate market-wide positioning signal
    const marketSignal: RegimeBasedSignal = {
      signalId: `regime_${classification.regime}_${Date.now()}`,
      ticker: 'MARKET',
      regime: classification.regime as MarketRegime,
      regimeStrength: classification.strength,
      regimeConfidence: classification.confidence,
      recommendedAction: this.getRegimeAction(classification),
      positionSizing: this.calculateRegimePositionSizing(classification),
      reasoning: this.getRegimeReasoning(classification),
      sectorRecommendations: this.getSectorRecommendations(classification)
    };

    signals.push(marketSignal);

    // Emit regime-based signals
    for (const signal of signals) {
      this.eventBus.emit('regime:signal', signal);
    }
  }

  private getRegimeAction(classification: RegimeClassification): 'LONG' | 'SHORT' | 'HEDGE' | 'CASH' {
    switch (classification.regime) {
      case 'BULL':
        return classification.strength > 0.7 ? 'LONG' : 'LONG';
      case 'BEAR':
        return classification.strength > 0.7 ? 'SHORT' : 'HEDGE';
      case 'NEUTRAL':
        return classification.confidence > 0.6 ? 'HEDGE' : 'CASH';
      default:
        return 'CASH';
    }
  }

  private getRegimeReasoning(classification: RegimeClassification): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`${classification.regime} regime detected`);
    reasoning.push(`Regime strength: ${(classification.strength * 100).toFixed(0)}%`);
    reasoning.push(`Regime confidence: ${(classification.confidence * 100).toFixed(0)}%`);

    // Add factor-specific reasoning
    if (classification.factors.breadth) {
      reasoning.push('Market breadth supports regime');
    }
    if (classification.factors.emaAlignment) {
      reasoning.push('EMA alignment confirms trend');
    }
    if (classification.factors.trendScore) {
      reasoning.push('Momentum indicators align');
    }
    if (classification.factors.volatility) {
      reasoning.push('Volatility environment supports regime');
    }
    if (classification.factors.gamma) {
      reasoning.push('Options flow confirms regime');
    }

    return reasoning;
  }

  private getSectorRecommendations(classification: RegimeClassification): {
    overweight: string[];
    underweight: string[];
    avoid: string[];
  } {
    // Simplified sector recommendations based on regime
    switch (classification.regime) {
      case 'BULL':
        return {
          overweight: ['XLK', 'XLY', 'XLF'], // Tech, Consumer Discretionary, Financials
          underweight: ['XLU', 'XLRE'], // Utilities, Real Estate
          avoid: ['VIX', 'UVXY'] // Volatility products
        };
      case 'BEAR':
        return {
          overweight: ['XLU', 'XLP', 'VIX'], // Utilities, Consumer Staples, Volatility
          underweight: ['XLK', 'XLY', 'XLF'],
          avoid: ['ARKK', 'QQQ'] // High-beta growth
        };
      case 'NEUTRAL':
        return {
          overweight: ['XLP', 'XLV'], // Defensive sectors
          underweight: ['XLK', 'XLY'],
          avoid: ['UVXY', 'SQQQ'] // Extreme volatility products
        };
      default:
        return { overweight: [], underweight: [], avoid: [] };
    }
  }

  private adjustPositionsForRegimeChange(
    newRegime: string,
    classification: RegimeClassification
  ): void {
    if (!this.paperEngine) return;

    // Get current positions
    const openPositions = this.paperEngine.getOpenPositions();
    
    for (const position of openPositions) {
      // Check if position is aligned with new regime
      const isAligned = this.isPositionAlignedWithRegime(position, newRegime);
      
      if (!isAligned && classification.confidence > 0.8) {
        // Consider closing misaligned positions
        this.eventBus.emit('regime:position:review', {
          positionId: position.id,
          ticker: position.ticker,
          currentSide: position.side,
          newRegime,
          recommendation: 'CONSIDER_CLOSE',
          reasoning: `Position not aligned with new ${newRegime} regime`
        });
      }
    }
  }

  private isPositionAlignedWithRegime(position: any, regime: string): boolean {
    switch (regime) {
      case 'BULL':
        return position.side === 'LONG' && position.contractType === 'CALL';
      case 'BEAR':
        return position.side === 'SHORT' || position.contractType === 'PUT';
      case 'NEUTRAL':
        return true; // All positions can work in neutral
      default:
        return false;
    }
  }

  private generateRegimeTransitionSignals(
    previousRegime: string,
    newRegime: string,
    classification: RegimeClassification
  ): void {
    // Generate specific signals for regime transitions
    const transitionSignal: RegimeBasedSignal = {
      signalId: `transition_${previousRegime}_to_${newRegime}_${Date.now()}`,
      ticker: 'TRANSITION',
      regime: newRegime as MarketRegime,
      regimeStrength: classification.strength,
      regimeConfidence: classification.confidence,
      recommendedAction: this.getTransitionAction(previousRegime, newRegime),
      positionSizing: this.calculateTransitionPositionSizing(classification),
      reasoning: [
        `Regime transition from ${previousRegime} to ${newRegime}`,
        `Transition confidence: ${(classification.confidence * 100).toFixed(0)}%`,
        'Consider rebalancing portfolio for new regime'
      ],
      sectorRecommendations: this.getSectorRecommendations(classification)
    };

    this.eventBus.emit('regime:transition:signal', transitionSignal);
  }

  private getTransitionAction(previousRegime: string, newRegime: string): 'LONG' | 'SHORT' | 'HEDGE' | 'CASH' {
    // Conservative approach during transitions
    if (newRegime === 'NEUTRAL') return 'HEDGE';
    if (previousRegime === 'BULL' && newRegime === 'BEAR') return 'HEDGE';
    if (previousRegime === 'BEAR' && newRegime === 'BULL') return 'LONG';
    return 'CASH';
  }

  private calculateTransitionPositionSizing(classification: RegimeClassification): number {
    // Reduce position sizing during transitions
    return this.calculateRegimePositionSizing(classification) * 0.7;
  }

  private generateSectorRotationSignals(
    regime: RegimeClassification,
    sectorData: any
  ): RegimeBasedSignal[] {
    const signals: RegimeBasedSignal[] = [];
    const recommendations = this.getSectorRecommendations(regime);

    // Generate signals for overweight sectors
    for (const sector of recommendations.overweight) {
      signals.push({
        signalId: `sector_${sector}_${Date.now()}`,
        ticker: sector,
        regime: regime.regime as MarketRegime,
        regimeStrength: regime.strength,
        regimeConfidence: regime.confidence,
        recommendedAction: 'LONG',
        positionSizing: 1.2, // Overweight
        reasoning: [`Overweight ${sector} in ${regime.regime} regime`],
        sectorRecommendations: recommendations
      });
    }

    return signals;
  }

  // Public API methods
  public getCurrentRegime(): RegimeClassification | null {
    return this.currentRegime;
  }

  public getRegimeHistory(): RegimeClassification[] {
    return [...this.regimeHistory];
  }

  public updateConfig(newConfig: Partial<RegimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🧭 RegimeCompass integration configuration updated');
  }

  public getRegimeStats(): {
    currentRegime: string | null;
    regimeAge: number; // milliseconds
    regimeChanges: number;
    averageRegimeDuration: number;
  } {
    const regimeAge = this.currentRegime ? Date.now() - this.lastRegimeUpdate : 0;
    const regimeChanges = this.regimeHistory.length - 1;
    
    // Calculate average regime duration (simplified)
    const averageRegimeDuration = regimeChanges > 0 
      ? (Date.now() - this.regimeHistory[0].timestamp.getTime()) / regimeChanges
      : 0;

    return {
      currentRegime: this.currentRegime?.regime || null,
      regimeAge,
      regimeChanges,
      averageRegimeDuration
    };
  }
}