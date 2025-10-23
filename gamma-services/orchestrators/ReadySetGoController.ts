import { EventBus } from '../core/EventBus';
import { PaperTradingEngine } from '../paper/PaperTradingEngine';
import { FeedbackEngine } from '../learning/FeedbackEngine';
import { TradeSignal, MarketRegime, SignalSource } from '../models/PaperTradingTypes';

export interface TickerState {
  ticker: string;
  status: 'READY' | 'SET' | 'GO' | 'COOLDOWN' | 'INACTIVE';
  confidence: number;
  confidenceDelta: number;
  rrRatio: number;
  side: 'LONG' | 'SHORT' | 'NEUTRAL';
  trendComposite: number;
  phaseComposite: number;
  vwapDeviation: number;
  regime: MarketRegime;
  lastUpdate: Date;
  openPosition: boolean;
  positionId?: string;
  cooldownUntil?: Date;
}

export interface ReadySetGoConfig {
  minConfidenceThreshold: number;
  minRRThreshold: number;
  confidenceDeltaThreshold: number;
  cooldownPeriod: number; // milliseconds
  maxConcurrentTrades: number;
  enablePaperTrading: boolean;
  enableLiveTrding: boolean;
}

export interface TradeDecision {
  ticker: string;
  action: 'ENTER' | 'EXIT' | 'HOLD';
  side: 'LONG' | 'SHORT';
  confidence: number;
  conviction: number;
  expectedMove: number;
  reasoning: string[];
  signalId: string;
}

export class ReadySetGoController {
  private eventBus: EventBus;
  private paperEngine?: PaperTradingEngine;
  private feedbackEngine?: FeedbackEngine;
  private config: ReadySetGoConfig;
  private stateMap: Map<string, TickerState> = new Map();
  private activeSignals: Map<string, TradeSignal> = new Map();

  constructor(
    eventBus: EventBus,
    config: ReadySetGoConfig,
    paperEngine?: PaperTradingEngine,
    feedbackEngine?: FeedbackEngine
  ) {
    this.eventBus = eventBus;
    this.config = config;
    this.paperEngine = paperEngine;
    this.feedbackEngine = feedbackEngine;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for module updates from various sources
    this.eventBus.on('module:update', (data) => {
      this.handleModuleUpdate(data.ticker, data.module, data.data);
    });

    // Listen for confidence updates from SignalWeightingEngine
    this.eventBus.on('engine:confidence', (data) => {
      this.handleConfidenceUpdate(data.ticker, data.confidence, data.delta);
    });

    // Listen for regime updates from RegimeCompass
    this.eventBus.on('regime:update', (data) => {
      this.handleRegimeUpdate(data.ticker, data.regime);
    });

    // Listen for position closures to update state
    this.eventBus.on('paper:position:closed', (data) => {
      this.handlePositionClosed(data.position.ticker, data.position.id);
    });
  }

  public initializeTicker(ticker: string, regime: MarketRegime = 'NEUTRAL'): void {
    const state: TickerState = {
      ticker,
      status: 'INACTIVE',
      confidence: 0,
      confidenceDelta: 0,
      rrRatio: 0,
      side: 'NEUTRAL',
      trendComposite: 0,
      phaseComposite: 0,
      vwapDeviation: 0,
      regime,
      lastUpdate: new Date(),
      openPosition: false
    };

    this.stateMap.set(ticker, state);
    console.log(`🎯 Initialized ReadySetGo state for ${ticker}`);
  }

  private handleModuleUpdate(ticker: string, module: string, data: any): void {
    let state = this.stateMap.get(ticker);
    if (!state) {
      this.initializeTicker(ticker);
      state = this.stateMap.get(ticker)!;
    }

    // Update state based on module
    switch (module) {
      case 'TrendComposite':
        state.trendComposite = data.trendComposite || 0;
        state.phaseComposite = data.phaseComposite || 0;
        break;
      case 'VWAPDeviation':
        state.vwapDeviation = data.deviation || 0;
        break;
      case 'RiskReward':
        state.rrRatio = data.ratio || 0;
        break;
    }

    state.lastUpdate = new Date();
    this.evaluateStateTransition(ticker);
  }

  private handleConfidenceUpdate(ticker: string, confidence: number, delta: number): void {
    let state = this.stateMap.get(ticker);
    if (!state) {
      this.initializeTicker(ticker);
      state = this.stateMap.get(ticker)!;
    }

    // Apply feedback engine adjustments if available
    const adjustedConfidence = this.feedbackEngine 
      ? this.feedbackEngine.getAdjustedConfidence(`${ticker}_SIGNAL`, confidence)
      : confidence;

    state.confidence = adjustedConfidence;
    state.confidenceDelta = delta;
    state.lastUpdate = new Date();

    this.evaluateStateTransition(ticker);
  }

  private handleRegimeUpdate(ticker: string, regime: MarketRegime): void {
    let state = this.stateMap.get(ticker);
    if (!state) {
      this.initializeTicker(ticker, regime);
      state = this.stateMap.get(ticker)!;
    }

    state.regime = regime;
    state.lastUpdate = new Date();

    // Regime changes might affect position sizing and strategy
    this.evaluateStateTransition(ticker);
  }

  private evaluateStateTransition(ticker: string): void {
    const state = this.stateMap.get(ticker);
    if (!state) return;

    const previousStatus = state.status;

    // Check cooldown
    if (state.cooldownUntil && new Date() < state.cooldownUntil) {
      state.status = 'COOLDOWN';
      return;
    }

    // Determine side based on trend and phase
    if (state.trendComposite > 0.6 && state.phaseComposite > 0.6) {
      state.side = 'LONG';
    } else if (state.trendComposite < -0.6 && state.phaseComposite < -0.6) {
      state.side = 'SHORT';
    } else {
      state.side = 'NEUTRAL';
    }

    // State transition logic
    if (state.side === 'NEUTRAL' || state.openPosition) {
      state.status = 'INACTIVE';
    } else if (state.confidence >= this.config.minConfidenceThreshold) {
      if (state.rrRatio >= this.config.minRRThreshold) {
        if (state.confidenceDelta >= this.config.confidenceDeltaThreshold) {
          state.status = 'GO';
        } else {
          state.status = 'SET';
        }
      } else {
        state.status = 'READY';
      }
    } else {
      state.status = 'INACTIVE';
    }

    // Emit state transition event if status changed
    if (previousStatus !== state.status) {
      this.eventBus.emitStateTransition(ticker, previousStatus, state.status);
      
      // Execute trade if transitioning to GO
      if (state.status === 'GO' && !state.openPosition) {
        this.executeTradeSignal(ticker);
      }
    }
  }

  private async executeTradeSignal(ticker: string): Promise<void> {
    const state = this.stateMap.get(ticker);
    if (!state || state.status !== 'GO' || state.openPosition) return;

    // Check concurrent trade limit
    const activeTrades = Array.from(this.stateMap.values()).filter(s => s.openPosition).length;
    if (activeTrades >= this.config.maxConcurrentTrades) {
      console.log(`🎯 Trade limit reached (${activeTrades}/${this.config.maxConcurrentTrades}) - skipping ${ticker}`);
      return;
    }

    try {
      // Calculate expected move based on regime and volatility
      const expectedMove = this.calculateExpectedMove(state);
      
      // Calculate conviction based on multiple factors
      const conviction = this.calculateConviction(state);

      // Create trade signal
      const signal: TradeSignal = {
        signalId: `RSG_${ticker}_${Date.now()}`,
        ticker,
        side: state.side,
        confidence: state.confidence,
        conviction,
        expectedMove,
        timeframe: this.getTimeframeFromRegime(state.regime),
        regime: state.regime,
        source: 'READYSETGO'
      };

      // Store active signal
      this.activeSignals.set(ticker, signal);

      // Execute paper trade if enabled
      if (this.config.enablePaperTrading && this.paperEngine) {
        const positionId = await this.paperEngine.executePaperTrade(signal);
        state.openPosition = true;
        state.positionId = positionId;
        
        console.log(`🎯 Paper trade executed for ${ticker}: ${state.side} (confidence: ${state.confidence.toFixed(3)})`);
      }

      // Execute live trade if enabled (placeholder)
      if (this.config.enableLiveTrding) {
        // Would integrate with live trading system
        console.log(`🎯 Live trade signal generated for ${ticker}: ${state.side}`);
      }

      // Emit trade signal event
      this.eventBus.emit('trade:signal', signal);

      // Set cooldown
      state.cooldownUntil = new Date(Date.now() + this.config.cooldownPeriod);

    } catch (error) {
      console.error(`Failed to execute trade signal for ${ticker}:`, error);
      this.eventBus.emitSystemError(
        error as Error,
        `ReadySetGo trade execution for ${ticker}`,
        'HIGH'
      );
    }
  }

  private calculateExpectedMove(state: TickerState): number {
    // Calculate expected move based on regime and market conditions
    let baseMove = 0.02; // 2% base move
    
    // Adjust for regime
    switch (state.regime) {
      case 'BULL':
        baseMove *= 1.2;
        break;
      case 'BEAR':
        baseMove *= 1.5;
        break;
      case 'NEUTRAL':
        baseMove *= 0.8;
        break;
    }

    // Adjust for confidence and trend strength
    const trendStrength = Math.abs(state.trendComposite);
    baseMove *= (1 + trendStrength);

    // Adjust for VWAP deviation (higher deviation = higher expected move)
    baseMove *= (1 + Math.abs(state.vwapDeviation));

    return Math.min(baseMove, 0.1); // Cap at 10%
  }

  private calculateConviction(state: TickerState): number {
    // Calculate conviction based on multiple alignment factors
    let conviction = 0.5; // Base conviction

    // Trend alignment
    const trendAlignment = Math.abs(state.trendComposite * state.phaseComposite);
    conviction += trendAlignment * 0.3;

    // Confidence boost
    conviction += (state.confidence - 0.5) * 0.4;

    // Risk/Reward boost
    if (state.rrRatio > 2.0) {
      conviction += 0.2;
    }

    // Regime alignment
    if ((state.regime === 'BULL' && state.side === 'LONG') ||
        (state.regime === 'BEAR' && state.side === 'SHORT')) {
      conviction += 0.1;
    }

    return Math.max(0.1, Math.min(1.0, conviction));
  }

  private getTimeframeFromRegime(regime: MarketRegime): 'SHORT' | 'MEDIUM' | 'LONG' {
    switch (regime) {
      case 'BULL':
        return 'MEDIUM';
      case 'BEAR':
        return 'SHORT';
      case 'NEUTRAL':
        return 'SHORT';
      default:
        return 'MEDIUM';
    }
  }

  private handlePositionClosed(ticker: string, positionId: string): void {
    const state = this.stateMap.get(ticker);
    if (state && state.positionId === positionId) {
      state.openPosition = false;
      state.positionId = undefined;
      
      // Remove from active signals
      this.activeSignals.delete(ticker);
      
      console.log(`🎯 Position closed for ${ticker}, state reset`);
    }
  }

  public getStateSnapshot(): TickerState[] {
    return Array.from(this.stateMap.values());
  }

  public getTickerState(ticker: string): TickerState | undefined {
    return this.stateMap.get(ticker);
  }

  public getActiveSignals(): TradeSignal[] {
    return Array.from(this.activeSignals.values());
  }

  public forceStateTransition(ticker: string, newStatus: TickerState['status']): void {
    const state = this.stateMap.get(ticker);
    if (state) {
      const previousStatus = state.status;
      state.status = newStatus;
      this.eventBus.emitStateTransition(ticker, previousStatus, newStatus);
      console.log(`🎯 Forced state transition for ${ticker}: ${previousStatus} → ${newStatus}`);
    }
  }

  public updateConfig(newConfig: Partial<ReadySetGoConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🎯 ReadySetGo configuration updated');
  }

  public getConfig(): ReadySetGoConfig {
    return { ...this.config };
  }

  public getStats(): {
    totalTickers: number;
    activeStates: Record<string, number>;
    openPositions: number;
    activeSignals: number;
    avgConfidence: number;
  } {
    const states = Array.from(this.stateMap.values());
    const activeStates: Record<string, number> = {};
    
    // Count states
    for (const state of states) {
      activeStates[state.status] = (activeStates[state.status] || 0) + 1;
    }

    const openPositions = states.filter(s => s.openPosition).length;
    const avgConfidence = states.length > 0 
      ? states.reduce((sum, s) => sum + s.confidence, 0) / states.length 
      : 0;

    return {
      totalTickers: states.length,
      activeStates,
      openPositions,
      activeSignals: this.activeSignals.size,
      avgConfidence
    };
  }

  public reset(): void {
    this.stateMap.clear();
    this.activeSignals.clear();
    console.log('🎯 ReadySetGo controller reset');
  }

  public shutdown(): void {
    this.reset();
    // Clean up any resources
    console.log('🎯 ReadySetGo controller shutdown');
  }
}