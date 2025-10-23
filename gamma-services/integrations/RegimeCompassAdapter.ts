import { EventBus } from '../core/EventBus';
import { MarketRegime, TradeSignal, SignalSource } from '../models/PaperTradingTypes';
import { ReadySetGoController } from '../orchestrators/ReadySetGoController';

export interface RegimeData {
  regime: MarketRegime;
  confidence: number;
  strength: number;
  factors: {
    breadth: boolean;
    emaAlignment: boolean;
    trendScore: boolean;
    volatility: boolean;
    gamma: boolean;
  };
  predictiveSignals: {
    momentumDivergence: {
      type: 'bullish' | 'bearish' | 'none';
      strength: number;
    };
    volumeAnalysis: {
      confirmation: boolean;
      thrust: 'up' | 'down' | 'none';
    };
    optionsFlow: {
      bias: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
    };
  };
  sectors: {
    strong: string[];
    weak: string[];
    recommendations: {
      overweight: string[];
      underweight: string[];
    };
  };
}

export interface RegimeSignal {
  signalId: string;
  regime: MarketRegime;
  confidence: number;
  strength: number;
  recommendation: 'LONG' | 'SHORT' | 'NEUTRAL' | 'HEDGE';
  positionSizing: {
    longAllocation: number; // 0-1
    hedgeAllocation: number; // 0-1
    sizeFactor: number; // multiplier
  };
  sectors: {
    focus: string[];
    avoid: string[];
  };
  timeframe: 'SHORT' | 'MEDIUM' | 'LONG';
  reasoning: string[];
}

export class RegimeCompassAdapter {
  private eventBus: EventBus;
  private readySetGoController?: ReadySetGoController;
  private currentRegime: RegimeData | null = null;
  private lastRegimeUpdate: Date = new Date();

  constructor(eventBus: EventBus, readySetGoController?: ReadySetGoController) {
    this.eventBus = eventBus;
    this.readySetGoController = readySetGoController;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for regime compass updates (would come from existing RegimeCompass component)
    this.eventBus.on('regime:compass:update', (data) => {
      this.handleRegimeUpdate(data);
    });

    // Listen for sector analysis updates
    this.eventBus.on('sector:analysis:update', (data) => {
      this.handleSectorUpdate(data);
    });

    // Listen for predictive signals
    this.eventBus.on('predictive:signals:update', (data) => {
      this.handlePredictiveSignals(data);
    });
  }

  private handleRegimeUpdate(regimeData: any): void {
    try {
      // Transform regime compass data to our format
      const transformedData: RegimeData = {
        regime: this.mapRegime(regimeData.regime),
        confidence: regimeData.confidence || 0.5,
        strength: regimeData.strength || 0.5,
        factors: {
          breadth: regimeData.factors?.breadth || false,
          emaAlignment: regimeData.factors?.emaAlignment || false,
          trendScore: regimeData.factors?.trendScore || false,
          volatility: regimeData.factors?.volatility || false,
          gamma: regimeData.factors?.gamma || false
        },
        predictiveSignals: {
          momentumDivergence: {
            type: regimeData.predictiveSignals?.momentumDivergence?.type || 'none',
            strength: regimeData.predictiveSignals?.momentumDivergence?.strength || 0
          },
          volumeAnalysis: {
            confirmation: regimeData.predictiveSignals?.volumeAnalysis?.confirmation || false,
            thrust: regimeData.predictiveSignals?.volumeAnalysis?.thrust || 'none'
          },
          optionsFlow: {
            bias: regimeData.predictiveSignals?.optionsFlow?.bias || 'neutral',
            confidence: regimeData.predictiveSignals?.optionsFlow?.confidence || 0.5
          }
        },
        sectors: {
          strong: regimeData.sectors?.strong || [],
          weak: regimeData.sectors?.weak || [],
          recommendations: {
            overweight: regimeData.sectors?.recommendations?.overweight || [],
            underweight: regimeData.sectors?.recommendations?.underweight || []
          }
        }
      };

      this.currentRegime = transformedData;
      this.lastRegimeUpdate = new Date();

      // Generate regime-based signals
      const regimeSignal = this.generateRegimeSignal(transformedData);
      
      // Emit regime update for other systems
      this.eventBus.emit('regime:update', {
        ticker: 'SPY', // Primary market ticker
        regime: transformedData.regime,
        confidence: transformedData.confidence,
        strength: transformedData.strength
      });

      // Update ReadySetGo controller if available
      if (this.readySetGoController) {
        this.updateReadySetGoWithRegime(transformedData);
      }

      // Generate sector-specific signals
      this.generateSectorSignals(transformedData);

      console.log(`🧭 Regime update: ${transformedData.regime} (confidence: ${transformedData.confidence.toFixed(3)})`);
    } catch (error) {
      this.eventBus.emitSystemError(
        error as Error,
        'RegimeCompass data processing',
        'MEDIUM'
      );
    }
  }

  private mapRegime(regime: string): MarketRegime {
    switch (regime?.toUpperCase()) {
      case 'BULL':
      case 'BULLISH':
        return 'BULL';
      case 'BEAR':
      case 'BEARISH':
        return 'BEAR';
      case 'NEUTRAL':
      case 'SIDEWAYS':
      default:
        return 'NEUTRAL';
    }
  }

  private generateRegimeSignal(regimeData: RegimeData): RegimeSignal {
    const signal: RegimeSignal = {
      signalId: `REGIME_${Date.now()}`,
      regime: regimeData.regime,
      confidence: regimeData.confidence,
      strength: regimeData.strength,
      recommendation: this.getRegimeRecommendation(regimeData),
      positionSizing: this.calculatePositionSizing(regimeData),
      sectors: {
        focus: regimeData.sectors.strong,
        avoid: regimeData.sectors.weak
      },
      timeframe: this.getRegimeTimeframe(regimeData),
      reasoning: this.generateRegimeReasoning(regimeData)
    };

    // Emit regime signal
    this.eventBus.emit('regime:signal', signal);
    
    return signal;
  }

  private getRegimeRecommendation(regimeData: RegimeData): 'LONG' | 'SHORT' | 'NEUTRAL' | 'HEDGE' {
    const { regime, confidence, strength } = regimeData;
    
    if (confidence < 0.6) {
      return 'NEUTRAL';
    }

    switch (regime) {
      case 'BULL':
        return strength > 0.7 ? 'LONG' : 'NEUTRAL';
      case 'BEAR':
        return strength > 0.7 ? 'SHORT' : 'HEDGE';
      case 'NEUTRAL':
      default:
        return 'HEDGE';
    }
  }

  private calculatePositionSizing(regimeData: RegimeData): {
    longAllocation: number;
    hedgeAllocation: number;
    sizeFactor: number;
  } {
    const { regime, confidence, strength } = regimeData;
    
    let longAllocation = 0.5; // Default 50%
    let hedgeAllocation = 0.1; // Default 10%
    let sizeFactor = 1.0; // Default 1x

    switch (regime) {
      case 'BULL':
        longAllocation = 0.7 + (strength * 0.1); // 70-80%
        hedgeAllocation = 0.05; // 5%
        sizeFactor = 1.0 + (confidence * 0.25); // 1.0-1.25x
        break;
      case 'BEAR':
        longAllocation = 0.2 + (strength * 0.1); // 20-30%
        hedgeAllocation = 0.2 + (strength * 0.1); // 20-30%
        sizeFactor = 0.5 + (confidence * 0.3); // 0.5-0.8x
        break;
      case 'NEUTRAL':
        longAllocation = 0.5;
        hedgeAllocation = 0.15;
        sizeFactor = 0.8;
        break;
    }

    return {
      longAllocation: Math.max(0.1, Math.min(0.9, longAllocation)),
      hedgeAllocation: Math.max(0.05, Math.min(0.3, hedgeAllocation)),
      sizeFactor: Math.max(0.5, Math.min(1.5, sizeFactor))
    };
  }

  private getRegimeTimeframe(regimeData: RegimeData): 'SHORT' | 'MEDIUM' | 'LONG' {
    const { regime, strength } = regimeData;
    
    if (strength > 0.8) {
      return 'LONG'; // Strong regimes last longer
    } else if (strength > 0.6) {
      return 'MEDIUM';
    } else {
      return 'SHORT';
    }
  }

  private generateRegimeReasoning(regimeData: RegimeData): string[] {
    const reasoning: string[] = [];
    const { regime, confidence, strength, factors } = regimeData;

    reasoning.push(`Market regime: ${regime} (confidence: ${(confidence * 100).toFixed(1)}%)`);
    reasoning.push(`Regime strength: ${(strength * 100).toFixed(1)}%`);

    // Factor analysis
    const confirmedFactors = Object.entries(factors).filter(([_, value]) => value);
    if (confirmedFactors.length > 0) {
      reasoning.push(`Confirmed factors: ${confirmedFactors.map(([key]) => key).join(', ')}`);
    }

    // Predictive signals
    if (regimeData.predictiveSignals.momentumDivergence.type !== 'none') {
      reasoning.push(`Momentum divergence: ${regimeData.predictiveSignals.momentumDivergence.type}`);
    }

    if (regimeData.predictiveSignals.volumeAnalysis.confirmation) {
      reasoning.push(`Volume confirmation present`);
    }

    if (regimeData.predictiveSignals.optionsFlow.bias !== 'neutral') {
      reasoning.push(`Options flow bias: ${regimeData.predictiveSignals.optionsFlow.bias}`);
    }

    // Sector analysis
    if (regimeData.sectors.strong.length > 0) {
      reasoning.push(`Strong sectors: ${regimeData.sectors.strong.slice(0, 3).join(', ')}`);
    }

    return reasoning;
  }

  private updateReadySetGoWithRegime(regimeData: RegimeData): void {
    if (!this.readySetGoController) return;

    // Update regime for all tracked tickers
    const states = this.readySetGoController.getStateSnapshot();
    
    for (const state of states) {
      this.eventBus.emit('regime:update', {
        ticker: state.ticker,
        regime: regimeData.regime,
        confidence: regimeData.confidence,
        strength: regimeData.strength
      });
    }

    // Update configuration based on regime
    const currentConfig = this.readySetGoController.getConfig();
    const regimeAdjustedConfig = this.adjustConfigForRegime(currentConfig, regimeData);
    
    if (JSON.stringify(currentConfig) !== JSON.stringify(regimeAdjustedConfig)) {
      this.readySetGoController.updateConfig(regimeAdjustedConfig);
    }
  }

  private adjustConfigForRegime(config: any, regimeData: RegimeData): any {
    const adjustedConfig = { ...config };
    
    switch (regimeData.regime) {
      case 'BULL':
        // More aggressive in bull markets
        adjustedConfig.minConfidenceThreshold = Math.max(0.6, config.minConfidenceThreshold - 0.05);
        adjustedConfig.maxConcurrentTrades = Math.min(5, config.maxConcurrentTrades + 1);
        break;
      case 'BEAR':
        // More conservative in bear markets
        adjustedConfig.minConfidenceThreshold = Math.min(0.8, config.minConfidenceThreshold + 0.1);
        adjustedConfig.maxConcurrentTrades = Math.max(1, config.maxConcurrentTrades - 1);
        break;
      case 'NEUTRAL':
        // Moderate approach
        adjustedConfig.minConfidenceThreshold = 0.7;
        adjustedConfig.maxConcurrentTrades = 2;
        break;
    }

    return adjustedConfig;
  }

  private generateSectorSignals(regimeData: RegimeData): void {
    // Generate signals for strong sectors
    for (const sector of regimeData.sectors.strong.slice(0, 3)) {
      const sectorSignal: TradeSignal = {
        signalId: `SECTOR_${sector}_${Date.now()}`,
        ticker: sector,
        side: 'LONG',
        confidence: regimeData.confidence * 0.8, // Slightly lower confidence for sector plays
        conviction: 0.7,
        expectedMove: 0.03, // 3% expected move for sectors
        timeframe: 'MEDIUM',
        regime: regimeData.regime,
        source: 'REGIMECOMPASS'
      };

      this.eventBus.emit('trade:signal', sectorSignal);
    }

    // Generate hedge signals for weak sectors
    for (const sector of regimeData.sectors.weak.slice(0, 2)) {
      const hedgeSignal: TradeSignal = {
        signalId: `HEDGE_${sector}_${Date.now()}`,
        ticker: sector,
        side: 'SHORT',
        confidence: regimeData.confidence * 0.6,
        conviction: 0.5,
        expectedMove: 0.025,
        timeframe: 'SHORT',
        regime: regimeData.regime,
        source: 'REGIMECOMPASS'
      };

      this.eventBus.emit('trade:signal', hedgeSignal);
    }
  }

  private handleSectorUpdate(sectorData: any): void {
    if (this.currentRegime) {
      this.currentRegime.sectors = {
        strong: sectorData.strong || [],
        weak: sectorData.weak || [],
        recommendations: {
          overweight: sectorData.recommendations?.overweight || [],
          underweight: sectorData.recommendations?.underweight || []
        }
      };

      // Regenerate sector signals
      this.generateSectorSignals(this.currentRegime);
    }
  }

  private handlePredictiveSignals(predictiveData: any): void {
    if (this.currentRegime) {
      this.currentRegime.predictiveSignals = {
        momentumDivergence: {
          type: predictiveData.momentumDivergence?.type || 'none',
          strength: predictiveData.momentumDivergence?.strength || 0
        },
        volumeAnalysis: {
          confirmation: predictiveData.volumeAnalysis?.confirmation || false,
          thrust: predictiveData.volumeAnalysis?.thrust || 'none'
        },
        optionsFlow: {
          bias: predictiveData.optionsFlow?.bias || 'neutral',
          confidence: predictiveData.optionsFlow?.confidence || 0.5
        }
      };

      // Update regime signal with new predictive data
      this.generateRegimeSignal(this.currentRegime);
    }
  }

  public getCurrentRegime(): RegimeData | null {
    return this.currentRegime;
  }

  public getRegimeAge(): number {
    return Date.now() - this.lastRegimeUpdate.getTime();
  }

  public isRegimeStale(maxAgeMs: number = 5 * 60 * 1000): boolean {
    return this.getRegimeAge() > maxAgeMs;
  }

  public forceRegimeUpdate(regime: MarketRegime, confidence: number = 0.5): void {
    const syntheticData: RegimeData = {
      regime,
      confidence,
      strength: confidence,
      factors: {
        breadth: false,
        emaAlignment: false,
        trendScore: false,
        volatility: false,
        gamma: false
      },
      predictiveSignals: {
        momentumDivergence: { type: 'none', strength: 0 },
        volumeAnalysis: { confirmation: false, thrust: 'none' },
        optionsFlow: { bias: 'neutral', confidence: 0.5 }
      },
      sectors: {
        strong: [],
        weak: [],
        recommendations: { overweight: [], underweight: [] }
      }
    };

    this.handleRegimeUpdate(syntheticData);
    console.log(`🧭 Forced regime update: ${regime} (confidence: ${confidence})`);
  }

  public getStats(): {
    currentRegime: MarketRegime | null;
    confidence: number;
    strength: number;
    lastUpdate: Date;
    ageMs: number;
    isStale: boolean;
  } {
    return {
      currentRegime: this.currentRegime?.regime || null,
      confidence: this.currentRegime?.confidence || 0,
      strength: this.currentRegime?.strength || 0,
      lastUpdate: this.lastRegimeUpdate,
      ageMs: this.getRegimeAge(),
      isStale: this.isRegimeStale()
    };
  }
}