// File: /gamma-services/mtf/orchestrator/TemporalSequencer.ts

import { MTFSignalBundle, TradeState } from '../core/TradeDecisionEngine';

export interface TemporalContext {
  sequenceAge: number;        // How long in current sequence
  timeSinceExit: number;      // Time since last EXIT/ABORT
  transitionCount: number;    // Number of state transitions
  lastTransition: number;     // Timestamp of last transition
}

export interface StateTransition {
  from: TradeState;
  to: TradeState;
  timestamp: number;
  reason: string;
  confidence: number;
}

export interface SequenceData {
  ticker: string;
  currentState: TradeState;
  stateEntryTime: number;
  sequenceStartTime: number;
  lastTransitionTime: number;
  transitionHistory: StateTransition[];
  cyclingPrevention: {
    transitionCount: number;
    windowStart: number;
    blocked: boolean;
  };
}

export class TemporalSequencer {
  private sequences: Map<string, TemporalContext> = new Map();
  private sequenceData: Map<string, SequenceData> = new Map();

  public getTemporalContext(signal: MTFSignalBundle): TemporalContext {
    const key = signal.ticker;
    
    if (!this.sequences.has(key)) {
      this.sequences.set(key, {
        sequenceAge: 0,
        timeSinceExit: 0,
        transitionCount: 0,
        lastTransition: Date.now()
      });
    }

    const context = this.sequences.get(key)!;
    const now = Date.now();

    // Update temporal metrics
    context.sequenceAge = now - (signal.sequenceStartTime || now);

    // Reset timeSinceExit if we're in a non-exit state
    if (signal.prevState && !['EXIT', 'ABORT'].includes(signal.prevState)) {
      context.timeSinceExit = 0;
    } else {
      context.timeSinceExit = now - context.lastTransition;
    }

    return context;
  }

  public recordTransition(
    ticker: string, 
    from: TradeState, 
    to: TradeState, 
    confidence: number = 0,
    reason: string = 'State transition'
  ): void {
    const context = this.sequences.get(ticker) || {
      sequenceAge: 0,
      timeSinceExit: 0,
      transitionCount: 0,
      lastTransition: Date.now()
    };

    const now = Date.now();
    
    // Update transition count and timing
    context.transitionCount++;
    context.lastTransition = now;

    // Reset sequence age on major transitions
    if (['READY', 'EXIT', 'ABORT'].includes(to)) {
      context.sequenceAge = 0;
    }

    this.sequences.set(ticker, context);

    // Update detailed sequence data
    this.updateSequenceData(ticker, from, to, confidence, reason);
  }

  public shouldAllowTransition(
    currentState: TradeState,
    targetState: TradeState,
    context: TemporalContext
  ): boolean {
    // Prevent rapid cycling between states
    if (context.transitionCount > 3 && context.sequenceAge < 300000) { // 5 minutes
      return false;
    }

    // Enforce minimum time in state
    const minStateTimes = {
      'READY': 60000,    // 1 minute
      'SET': 120000,     // 2 minutes  
      'GO': 60000,       // 1 minute
      'TRADE': 30000,    // 30 seconds
      'EXIT': 30000,     // 30 seconds
      'ABORT': 10000     // 10 seconds
    };

    const timeInState = Date.now() - context.lastTransition;
    if (timeInState < minStateTimes[currentState]) {
      return false;
    }

    return true;
  }

  public getSequenceData(ticker: string): SequenceData | null {
    return this.sequenceData.get(ticker) || null;
  }

  public getAllSequences(): Map<string, SequenceData> {
    return new Map(this.sequenceData);
  }

  public resetSequence(ticker: string): void {
    this.sequences.delete(ticker);
    this.sequenceData.delete(ticker);
  }

  public getTransitionHistory(ticker: string, limit: number = 10): StateTransition[] {
    const data = this.sequenceData.get(ticker);
    if (!data) return [];
    
    return data.transitionHistory.slice(-limit);
  }

  public isSequenceBlocked(ticker: string): boolean {
    const data = this.sequenceData.get(ticker);
    if (!data) return false;
    
    return data.cyclingPrevention.blocked;
  }

  public unblockSequence(ticker: string): void {
    const data = this.sequenceData.get(ticker);
    if (data) {
      data.cyclingPrevention.blocked = false;
      data.cyclingPrevention.transitionCount = 0;
      data.cyclingPrevention.windowStart = Date.now();
    }
  }

  private updateSequenceData(
    ticker: string,
    from: TradeState,
    to: TradeState,
    confidence: number,
    reason: string
  ): void {
    const now = Date.now();
    
    let data = this.sequenceData.get(ticker);
    
    if (!data) {
      data = {
        ticker,
        currentState: to,
        stateEntryTime: now,
        sequenceStartTime: now,
        lastTransitionTime: now,
        transitionHistory: [],
        cyclingPrevention: {
          transitionCount: 0,
          windowStart: now,
          blocked: false
        }
      };
    }

    // Update current state
    data.currentState = to;
    data.stateEntryTime = now;
    data.lastTransitionTime = now;

    // Add to transition history
    const transition: StateTransition = {
      from,
      to,
      timestamp: now,
      reason,
      confidence
    };
    
    data.transitionHistory.push(transition);
    
    // Keep only last 50 transitions
    if (data.transitionHistory.length > 50) {
      data.transitionHistory = data.transitionHistory.slice(-50);
    }

    // Update cycling prevention
    this.updateCyclingPrevention(data);

    // Reset sequence start time on major transitions
    if (['READY', 'EXIT', 'ABORT'].includes(to)) {
      data.sequenceStartTime = now;
    }

    this.sequenceData.set(ticker, data);
  }

  private updateCyclingPrevention(data: SequenceData): void {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    // Reset window if more than 5 minutes have passed
    if (now - data.cyclingPrevention.windowStart > fiveMinutes) {
      data.cyclingPrevention.transitionCount = 1;
      data.cyclingPrevention.windowStart = now;
      data.cyclingPrevention.blocked = false;
    } else {
      data.cyclingPrevention.transitionCount++;
      
      // Block if too many transitions in window
      if (data.cyclingPrevention.transitionCount > 5) {
        data.cyclingPrevention.blocked = true;
      }
    }
  }

  // Analysis methods
  public getSequenceStats(): {
    totalSequences: number;
    activeSequences: number;
    blockedSequences: number;
    averageSequenceAge: number;
    stateDistribution: Record<TradeState, number>;
  } {
    const sequences = Array.from(this.sequenceData.values());
    const now = Date.now();
    
    let totalAge = 0;
    let activeCount = 0;
    let blockedCount = 0;
    
    const stateDistribution: Record<TradeState, number> = {
      'READY': 0,
      'SET': 0,
      'GO': 0,
      'TRADE': 0,
      'EXIT': 0,
      'ABORT': 0
    };

    sequences.forEach(seq => {
      const age = now - seq.sequenceStartTime;
      totalAge += age;
      
      if (!['READY', 'EXIT', 'ABORT'].includes(seq.currentState)) {
        activeCount++;
      }
      
      if (seq.cyclingPrevention.blocked) {
        blockedCount++;
      }
      
      stateDistribution[seq.currentState]++;
    });

    return {
      totalSequences: sequences.length,
      activeSequences: activeCount,
      blockedSequences: blockedCount,
      averageSequenceAge: sequences.length > 0 ? totalAge / sequences.length : 0,
      stateDistribution
    };
  }

  public cleanupOldSequences(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const cutoff = now - maxAge;
    
    for (const [ticker, data] of this.sequenceData.entries()) {
      if (data.lastTransitionTime < cutoff) {
        this.sequences.delete(ticker);
        this.sequenceData.delete(ticker);
      }
    }
  }
}