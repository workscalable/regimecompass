// File: /gamma-services/mtf/core/TradeDecisionEngine.ts

import { EventBus } from '../../orchestrators/EventBus';
import { TemporalSequencer } from '../orchestrator/TemporalSequencer';
import { AlertManager } from '../alerts/AlertManager';
import { TradeStateManager } from './TradeStateManager';

export interface TimeframeSignal {
  confidence: number;
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  powerCandle: boolean;
  volumeSurge: boolean;
  ribbonAlignment: number;
  momentumDivergence: number;
  timestamp: number;
}

export interface MTFSignalBundle {
  ticker: string;
  daily: TimeframeSignal;
  hourly: TimeframeSignal;
  thirty: TimeframeSignal;
  regimeBias: number; // -1 to +1 scale
  fibZone: number;
  gammaExposure: number;
  vwapDeviation: number;
  prevState?: TradeState;
  sequenceStartTime?: number;
}

export type TradeState = 'READY' | 'SET' | 'GO' | 'TRADE' | 'EXIT' | 'ABORT';

export interface TradeDecision {
  ticker: string;
  state: TradeState;
  confidence: number;
  mtfConfluence: number;
  size: number;
  direction: 'LONG' | 'SHORT';
  timestamp: string;
  timeframeAlignment: {
    daily: boolean;
    hourly: boolean;
    thirty: boolean;
  };
  notes: string[];
  riskMetrics: {
    stopDistance: number;
    profitTarget: number;
    timeDecayBuffer: number;
  };
}

export class MTFTradeDecisionEngine {
  private temporalSequencer: TemporalSequencer;
  private alertManager: AlertManager;

  constructor(private eventBus: EventBus) {
    this.temporalSequencer = new TemporalSequencer();
    this.alertManager = new AlertManager();
  }

  public async processMTFSignal(signal: MTFSignalBundle): Promise<TradeDecision> {
    try {
      // 1. Compute MTF confluence score
      const mtfConfluence = this.computeMTFConfluence(signal);

      // 2. Determine current trade state with temporal sequencing
      const state = this.determineTradeState(signal, mtfConfluence);

      // 3. Calculate dynamic position sizing
      const size = this.computePositionSize(mtfConfluence, signal.regimeBias, state);

      // 4. Generate risk metrics
      const riskMetrics = this.computeRiskMetrics(signal, state, mtfConfluence);

      // 5. Create decision with comprehensive context
      const decision = this.buildTradeDecision(signal, state, mtfConfluence, size, riskMetrics);

      // 6. Handle state transitions and alerts
      await this.handleStateTransition(signal, decision);

      // 7. Persist for audit and analysis
      await TradeStateManager.persist(decision);

      return decision;
    } catch (error) {
      console.error(`MTF signal processing failed for ${signal.ticker}:`, error);
      throw error;
    }
  }

  private computeMTFConfluence(signal: MTFSignalBundle): number {
    const weights = {
      daily: 0.40,    // Highest weight for trend context
      hourly: 0.35,   // Medium weight for momentum
      thirty: 0.25    // Lower weight for entry timing
    };

    let baseConfluence = 0;

    // Base weighted confluence
    baseConfluence += signal.daily.confidence * weights.daily;
    baseConfluence += signal.hourly.confidence * weights.hourly;
    baseConfluence += signal.thirty.confidence * weights.thirty;

    // Confluence bonuses
    let bonus = 0;

    // Power candle bonus (momentum surge)
    if (signal.thirty.powerCandle) {
      bonus += 0.04;
    }

    // Volume surge bonus
    if (signal.thirty.volumeSurge) {
      bonus += 0.03;
    }

    // Ribbon alignment bonus (all timeframes aligned)
    const ribbonAlignment = this.calculateRibbonAlignment(signal);
    if (ribbonAlignment > 0.8) {
      bonus += 0.05;
    }

    // Gamma exposure adjustment
    const gammaAdjustment = this.calculateGammaAdjustment(signal.gammaExposure);
    baseConfluence += gammaAdjustment;

    // Fibonacci zone adjustment
    const fibAdjustment = this.calculateFibAdjustment(signal.fibZone);
    baseConfluence += fibAdjustment;

    const totalConfluence = Math.min(1, Math.max(0, baseConfluence + bonus));
    return Number(totalConfluence.toFixed(3));
  }

  private determineTradeState(signal: MTFSignalBundle, mtfConfluence: number): TradeState {
    const currentState = signal.prevState || 'READY';
    const temporalContext = this.temporalSequencer.getTemporalContext(signal);

    // State transition logic with MTF requirements
    switch (currentState) {
      case 'READY':
        // READY → SET: 30m shows strength with basic hourly alignment
        if (signal.thirty.confidence > 0.55 && signal.hourly.confidence > 0.50 &&
            temporalContext.sequenceAge < 3600000) { // Within 1 hour
          return 'SET';
        }
        break;

      case 'SET':
        // SET → GO: Strong hourly + daily bias alignment
        if (signal.hourly.confidence > 0.60 && signal.daily.bias === 'LONG' &&
            mtfConfluence > 0.65 &&
            this.isBiasAligned(signal)) {
          return 'GO';
        }
        // SET → READY: Sequence timeout or divergence
        if (temporalContext.sequenceAge > 7200000 || // 2 hours
            this.hasBiasDivergence(signal)) {
          return 'READY';
        }
        break;

      case 'GO':
        // GO → TRADE: Power candle with Fibonacci confluence
        if (signal.thirty.powerCandle && signal.fibZone <= 1.27 &&
            mtfConfluence > 0.70) {
          return 'TRADE';
        }
        // GO → SET: Momentum fade without power candle
        if (signal.hourly.confidence < 0.55 ||
            mtfConfluence < 0.60) {
          return 'SET';
        }
        break;

      case 'TRADE':
        // TRADE → EXIT: Momentum decay or target reached
        if (signal.hourly.confidence < 0.50 ||
            this.hasExitConditions(signal, mtfConfluence)) {
          return 'EXIT';
        }
        // TRADE → ABORT: Major divergence or adverse move
        if (this.hasAbortConditions(signal)) {
          return 'ABORT';
        }
        break;

      case 'EXIT':
      case 'ABORT':
        // Return to READY after cooldown
        if (temporalContext.timeSinceExit > 300000) { // 5 minute cooldown
          return 'READY';
        }
        break;
    }

    return currentState; // Maintain current state if no transitions
  }

  private computePositionSize(confidence: number, regimeBias: number, state: TradeState): number {
    let baseSize = 1.0;

    // Confidence-based sizing
    const confidenceBoost = confidence > 0.7 ? 1.25 : confidence > 0.6 ? 1.1 : 1.0;

    // Regime-based adjustment
    const regimeAdj = regimeBias > 0.5 ? 1.1 : 0.9;

    // State-based sizing
    const stateMultiplier = {
      'READY': 0.0,
      'SET': 0.0,
      'GO': 0.5,  // Reduced size during GO state
      'TRADE': 1.0, // Full size during TRADE
      'EXIT': 0.0,
      'ABORT': 0.0
    }[state];

    const rawSize = baseSize * confidenceBoost * regimeAdj * stateMultiplier;
    return Number(Math.max(0, rawSize).toFixed(2));
  }

  private computeRiskMetrics(signal: MTFSignalBundle, state: TradeState, confluence: number) {
    const baseStop = 0.02; // 2% base stop
    const baseTarget = 0.06; // 6% base target
    let stopDistance = baseStop;
    let profitTarget = baseTarget;
    let timeDecayBuffer = 1.0;

    // Adjust based on MTF confluence
    if (confluence > 0.7) {
      stopDistance *= 0.8; // Tighter stops for high confluence
      profitTarget *= 1.2; // Higher targets for high confluence
    } else if (confluence < 0.5) {
      stopDistance *= 1.3; // Wider stops for low confluence
      profitTarget *= 0.8; // Lower targets for low confluence
    }

    // Adjust based on Fibonacci zone
    if (signal.fibZone > 1.27) {
      stopDistance *= 0.7; // Tighter stops in extended zones
      timeDecayBuffer *= 0.8; // Less time in extended zones
    }

    // Adjust based on timeframe alignment
    const alignment = this.calculateTimeframeAlignment(signal);
    if (alignment > 0.8) {
      profitTarget *= 1.1;
    }

    return {
      stopDistance: Number(stopDistance.toFixed(4)),
      profitTarget: Number(profitTarget.toFixed(4)),
      timeDecayBuffer: Number(timeDecayBuffer.toFixed(2))
    };
  }

  private buildTradeDecision(
    signal: MTFSignalBundle,
    state: TradeState,
    confluence: number,
    size: number,
    riskMetrics: any
  ): TradeDecision {
    const timeframeAlignment = this.getTimeframeAlignment(signal);
    const notes = this.generateDecisionNotes(signal, state, confluence, timeframeAlignment);

    return {
      ticker: signal.ticker,
      state,
      confidence: confluence,
      mtfConfluence: confluence,
      size,
      direction: signal.daily.bias,
      timestamp: new Date().toISOString(),
      timeframeAlignment,
      notes,
      riskMetrics
    };
  }

  private async handleStateTransition(signal: MTFSignalBundle, decision: TradeDecision): Promise<void> {
    const previousState = signal.prevState;
    const currentState = decision.state;

    // Only alert on state changes
    if (previousState !== currentState) {
      const alertMessage = this.generateStateTransitionAlert(signal, decision, previousState);

      // Send multi-channel alerts
      await this.alertManager.dispatchAlert({
        type: 'STATE_TRANSITION',
        priority: this.getAlertPriority(currentState),
        message: alertMessage,
        channels: ['slack', 'telegram', 'dashboard'],
        data: decision,
        timestamp: Date.now()
      });

      // Emit event for dashboard updates
      this.eventBus.emit('trade:state:transition', {
        ticker: signal.ticker,
        from: previousState,
        to: currentState,
        decision,
        timestamp: Date.now()
      });
    }
  }

  // Helper methods
  private calculateRibbonAlignment(signal: MTFSignalBundle): number {
    const alignments = [
      signal.daily.ribbonAlignment,
      signal.hourly.ribbonAlignment,
      signal.thirty.ribbonAlignment
    ];
    return alignments.reduce((sum, align) => sum + align, 0) / alignments.length;
  }

  private calculateGammaAdjustment(gammaExposure: number): number {
    // Negative GEX (trend acceleration) → positive adjustment
    // Positive GEX (pinning risk) → negative adjustment
    return Math.max(-0.1, Math.min(0.1, -gammaExposure * 0.05));
  }

  private calculateFibAdjustment(fibZone: number): number {
    if (fibZone < 0.5) return 0.03;  // Compression bonus
    if (fibZone > 1.618) return -0.05; // Exhaustion penalty
    return 0;
  }

  private isBiasAligned(signal: MTFSignalBundle): boolean {
    return signal.daily.bias === signal.hourly.bias && 
           signal.hourly.bias === signal.thirty.bias;
  }

  private hasBiasDivergence(signal: MTFSignalBundle): boolean {
    return signal.daily.bias !== signal.hourly.bias ||
           Math.abs(signal.daily.confidence - signal.hourly.confidence) > 0.3;
  }

  private hasExitConditions(signal: MTFSignalBundle, confluence: number): boolean {
    return confluence < 0.5 || 
           signal.hourly.momentumDivergence < -0.2 ||
           signal.vwapDeviation > 0.08; // 8% VWAP deviation
  }

  private hasAbortConditions(signal: MTFSignalBundle): boolean {
    return signal.daily.bias !== signal.thirty.bias ||
           signal.gammaExposure > 0.3; // High positive GEX (pinning risk)
  }

  private getTimeframeAlignment(signal: MTFSignalBundle) {
    return {
      daily: signal.daily.confidence > 0.6,
      hourly: signal.hourly.confidence > 0.55,
      thirty: signal.thirty.confidence > 0.5
    };
  }

  private calculateTimeframeAlignment(signal: MTFSignalBundle): number {
    const alignment = this.getTimeframeAlignment(signal);
    const alignedCount = Object.values(alignment).filter(Boolean).length;
    return alignedCount / 3;
  }

  private generateDecisionNotes(
    signal: MTFSignalBundle, 
    state: TradeState, 
    confluence: number,
    alignment: any
  ): string[] {
    const notes: string[] = [];

    switch (state) {
      case 'TRADE':
        notes.push('All timeframes aligned — executing entry');
        if (signal.thirty.powerCandle) {
          notes.push('Power candle detected — momentum surge');
        }
        break;
      case 'SET':
        if (!alignment.daily) {
          notes.push('Daily timeframe not aligned — waiting for trend confirmation');
        }
        if (this.hasBiasDivergence(signal)) {
          notes.push('Bias divergence detected — holding entry');
        }
        break;
      case 'EXIT':
        if (confluence < 0.5) {
          notes.push('MTF confluence below threshold — exiting position');
        }
        if (signal.hourly.momentumDivergence < -0.2) {
          notes.push('Momentum divergence detected — trail stop activated');
        }
        break;
      case 'ABORT':
        notes.push('Major divergence detected — aborting trade');
        if (signal.daily.bias !== signal.thirty.bias) {
          notes.push('Timeframe bias conflict — unsafe to enter');
        }
        break;
    }

    // Add confluence context
    if (confluence > 0.75) {
      notes.push('High MTF confluence — optimal entry conditions');
    } else if (confluence < 0.45) {
      notes.push('Low MTF confluence — reduced position sizing');
    }

    return notes;
  }

  private generateStateTransitionAlert(
    signal: MTFSignalBundle, 
    decision: TradeDecision, 
    previousState: TradeState | undefined
  ): string {
    const emoji = {
      'READY': '⏹️',
      'SET': '🟡', 
      'GO': '🟢',
      'TRADE': '🚀',
      'EXIT': '📤',
      'ABORT': '🚫'
    }[decision.state];

    return `${emoji} ${signal.ticker} | ${previousState || 'NONE'} → ${decision.state}
Confidence: ${(decision.confidence * 100).toFixed(1)}% | Size: ${decision.size}x
Notes: ${decision.notes.join(', ')}`;
  }

  private getAlertPriority(state: TradeState): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (state) {
      case 'TRADE': return 'HIGH';
      case 'ABORT': return 'HIGH';
      case 'EXIT': return 'MEDIUM';
      case 'GO': return 'MEDIUM';
      case 'SET': return 'LOW';
      default: return 'LOW';
    }
  }
}