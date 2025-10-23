import { EventEmitter } from 'events';
import { 
  TickerState, 
  TickerStatus, 
  FibZone,
  OptionRecommendation,
  PaperPosition 
} from '../types/core.js';

/**
 * Enhanced ticker state manager with Ready-Set-Go lifecycle
 * Handles individual ticker state transitions and validation
 */
export class TickerStateManager extends EventEmitter {
  private states: Map<string, TickerState> = new Map();
  private stateHistory: Map<string, StateTransition[]> = new Map();
  private cooldownTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize a new ticker for monitoring
   */
  public initializeTicker(ticker: string): TickerState {
    const initialState: TickerState = {
      ticker,
      status: 'READY',
      confidence: 0,
      conviction: 0,
      fibZone: 'MID_EXPANSION',
      gammaExposure: 0,
      lastUpdate: new Date(),
      stateEntryTime: new Date()
    };

    this.states.set(ticker, initialState);
    this.stateHistory.set(ticker, []);

    this.emit('ticker:initialized', { ticker, state: initialState });
    return initialState;
  }

  /**
   * Update ticker state with validation and transition logic
   */
  public updateTickerState(
    ticker: string, 
    updates: Partial<TickerState>,
    forceTransition: boolean = false
  ): TickerState {
    const currentState = this.states.get(ticker);
    if (!currentState) {
      throw new Error(`Ticker ${ticker} not found. Initialize first.`);
    }

    const previousStatus = currentState.status;
    const updatedState = { ...currentState, ...updates, lastUpdate: new Date() };

    // Validate state transition if status changed
    if (updates.status && updates.status !== previousStatus) {
      if (!forceTransition && !this.isValidTransition(previousStatus, updates.status)) {
        throw new Error(`Invalid state transition for ${ticker}: ${previousStatus} → ${updates.status}`);
      }

      // Update state entry time for status changes
      updatedState.stateEntryTime = new Date();
      
      // Record transition
      this.recordStateTransition(ticker, previousStatus, updates.status);
      
      // Handle cooldown logic
      if (updates.status === 'COOLDOWN') {
        this.startCooldownTimer(ticker, updatedState);
      }
    }

    this.states.set(ticker, updatedState);

    this.emit('ticker:updated', {
      ticker,
      previousState: currentState,
      newState: updatedState,
      statusChanged: previousStatus !== updatedState.status
    });

    return updatedState;
  }

  /**
   * Get current state for a ticker
   */
  public getTickerState(ticker: string): TickerState | null {
    return this.states.get(ticker) || null;
  }

  /**
   * Get all ticker states
   */
  public getAllStates(): TickerState[] {
    return Array.from(this.states.values());
  }

  /**
   * Get tickers by status
   */
  public getTickersByStatus(status: TickerStatus): TickerState[] {
    return this.getAllStates().filter(state => state.status === status);
  }

  /**
   * Get state transition history for a ticker
   */
  public getStateHistory(ticker: string): StateTransition[] {
    return this.stateHistory.get(ticker) || [];
  }

  /**
   * Force transition to specific state (with validation override)
   */
  public forceStateTransition(ticker: string, newStatus: TickerStatus, reason?: string): TickerState {
    const currentState = this.getTickerState(ticker);
    if (!currentState) {
      throw new Error(`Ticker ${ticker} not found`);
    }

    const updatedState = this.updateTickerState(ticker, { status: newStatus }, true);
    
    this.emit('ticker:force:transition', {
      ticker,
      from: currentState.status,
      to: newStatus,
      reason: reason || 'Manual override',
      timestamp: new Date()
    });

    return updatedState;
  }

  /**
   * Remove ticker from monitoring
   */
  public removeTicker(ticker: string): boolean {
    const state = this.states.get(ticker);
    if (!state) {
      return false;
    }

    // Clear any active cooldown timer
    const timer = this.cooldownTimers.get(ticker);
    if (timer) {
      clearTimeout(timer);
      this.cooldownTimers.delete(ticker);
    }

    this.states.delete(ticker);
    this.stateHistory.delete(ticker);

    this.emit('ticker:removed', { ticker, finalState: state });
    return true;
  }

  /**
   * Get comprehensive state statistics
   */
  public getStateStatistics(): StateStatistics {
    const allStates = this.getAllStates();
    const statusCounts = this.getStatusCounts(allStates);
    
    return {
      totalTickers: allStates.length,
      statusDistribution: statusCounts,
      averageConfidence: this.calculateAverageConfidence(allStates),
      averageConviction: this.calculateAverageConviction(allStates),
      fibZoneDistribution: this.getFibZoneDistribution(allStates),
      activePositions: allStates.filter(s => s.position?.status === 'OPEN').length,
      tickersInCooldown: statusCounts.COOLDOWN || 0,
      readyTickers: statusCounts.READY || 0,
      activeTickers: (statusCounts.SET || 0) + (statusCounts.GO || 0)
    };
  }

  /**
   * Validate state transition according to Ready-Set-Go rules
   */
  private isValidTransition(from: TickerStatus, to: TickerStatus): boolean {
    const validTransitions: Record<TickerStatus, TickerStatus[]> = {
      'READY': ['SET'],
      'SET': ['READY', 'GO'],
      'GO': ['SET', 'COOLDOWN'],
      'COOLDOWN': ['READY']
    };

    return validTransitions[from]?.includes(to) || false;
  }

  /**
   * Record state transition in history
   */
  private recordStateTransition(ticker: string, from: TickerStatus, to: TickerStatus): void {
    const history = this.stateHistory.get(ticker) || [];
    const transition: StateTransition = {
      from,
      to,
      timestamp: new Date(),
      duration: this.calculateStateDuration(ticker, from)
    };

    history.push(transition);
    
    // Keep only last 50 transitions per ticker
    if (history.length > 50) {
      history.shift();
    }

    this.stateHistory.set(ticker, history);

    this.emit('ticker:transition', {
      ticker,
      transition,
      historyLength: history.length
    });
  }

  /**
   * Calculate how long ticker was in previous state
   */
  private calculateStateDuration(ticker: string, fromStatus: TickerStatus): number {
    const currentState = this.states.get(ticker);
    if (!currentState) return 0;

    return Date.now() - currentState.stateEntryTime.getTime();
  }

  /**
   * Start cooldown timer for ticker
   */
  private startCooldownTimer(ticker: string, state: TickerState): void {
    // Clear existing timer if any
    const existingTimer = this.cooldownTimers.get(ticker);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Default cooldown period: 5 minutes
    const cooldownMs = state.cooldownUntil 
      ? state.cooldownUntil.getTime() - Date.now()
      : 5 * 60 * 1000;

    if (cooldownMs > 0) {
      const timer = setTimeout(() => {
        this.handleCooldownExpiry(ticker);
      }, cooldownMs);

      this.cooldownTimers.set(ticker, timer);

      this.emit('ticker:cooldown:started', {
        ticker,
        duration: cooldownMs,
        expiresAt: new Date(Date.now() + cooldownMs)
      });
    }
  }

  /**
   * Handle cooldown expiry
   */
  private handleCooldownExpiry(ticker: string): void {
    const state = this.getTickerState(ticker);
    if (state && state.status === 'COOLDOWN') {
      this.updateTickerState(ticker, { 
        status: 'READY',
        cooldownUntil: undefined 
      });

      this.emit('ticker:cooldown:expired', {
        ticker,
        newStatus: 'READY',
        timestamp: new Date()
      });
    }

    this.cooldownTimers.delete(ticker);
  }

  /**
   * Get status count distribution
   */
  private getStatusCounts(states: TickerState[]): Record<TickerStatus, number> {
    const counts: Record<TickerStatus, number> = {
      'READY': 0,
      'SET': 0,
      'GO': 0,
      'COOLDOWN': 0
    };

    for (const state of states) {
      counts[state.status]++;
    }

    return counts;
  }

  /**
   * Calculate average confidence across all tickers
   */
  private calculateAverageConfidence(states: TickerState[]): number {
    if (states.length === 0) return 0;
    
    const total = states.reduce((sum, state) => sum + state.confidence, 0);
    return Number((total / states.length).toFixed(3));
  }

  /**
   * Calculate average conviction across all tickers
   */
  private calculateAverageConviction(states: TickerState[]): number {
    if (states.length === 0) return 0;
    
    const total = states.reduce((sum, state) => sum + state.conviction, 0);
    return Number((total / states.length).toFixed(3));
  }

  /**
   * Get Fibonacci zone distribution
   */
  private getFibZoneDistribution(states: TickerState[]): Record<FibZone, number> {
    const distribution: Record<FibZone, number> = {
      'COMPRESSION': 0,
      'MID_EXPANSION': 0,
      'FULL_EXPANSION': 0,
      'OVER_EXTENSION': 0,
      'EXHAUSTION': 0
    };

    for (const state of states) {
      distribution[state.fibZone]++;
    }

    return distribution;
  }
}

// Supporting interfaces
export interface StateTransition {
  from: TickerStatus;
  to: TickerStatus;
  timestamp: Date;
  duration: number; // milliseconds in previous state
}

export interface StateStatistics {
  totalTickers: number;
  statusDistribution: Record<TickerStatus, number>;
  averageConfidence: number;
  averageConviction: number;
  fibZoneDistribution: Record<FibZone, number>;
  activePositions: number;
  tickersInCooldown: number;
  readyTickers: number;
  activeTickers: number;
}