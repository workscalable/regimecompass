import { EventEmitter } from 'events';
import { 
  SignalEvolution, 
  SignalLifecycle, 
  SignalStage 
} from '@/lib/trading';
import { TradeSignal } from '@/lib/trading';

/**
 * SignalEvolutionTracker - Signal Evolution Tracker Module
 * 
 * Tracks every signal from Ready → Set → Go → Active → Target Hit / Stopped → Closed
 * with timestamps and live confidence
 * 
 * Functions:
 * - logStageChange(symbol, stage, metrics)
 * - updateConfidence(symbol, newScore)
 * - summarizeLifecycle(symbol)
 * 
 * Integrates into database or JSON store for back-testing and real-time dashboards
 */

export class SignalEvolutionTracker extends EventEmitter {
  private lifecycles: Map<string, SignalLifecycle> = new Map();
  private activeSignals: Map<string, SignalEvolution[]> = new Map();
  private completedSignals: Map<string, SignalLifecycle> = new Map();
  
  // Tracking parameters
  private readonly maxLifecycleDuration = 24 * 60; // 24 hours in minutes
  private readonly confidenceDecayRate = 0.01; // 1% per minute
  private readonly minConfidenceThreshold = 0.3; // Minimum confidence to keep tracking

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for signal evolution events
   */
  private setupEventHandlers(): void {
    this.on('stageChange', (symbol: string, stage: SignalStage, confidence: number) => {
      console.log(`Signal stage changed for ${symbol}:`, { stage, confidence });
    });

    this.on('confidenceUpdate', (symbol: string, oldConfidence: number, newConfidence: number) => {
      console.log(`Confidence updated for ${symbol}:`, { 
        old: oldConfidence, 
        new: newConfidence,
        change: newConfidence - oldConfidence 
      });
    });

    this.on('lifecycleComplete', (lifecycle: SignalLifecycle) => {
      console.log(`Signal lifecycle completed for ${lifecycle.symbol}:`, {
        finalResult: lifecycle.finalResult,
        pnlPct: lifecycle.pnlPct,
        duration: lifecycle.duration
      });
    });

    this.on('targetHit', (symbol: string, target: number, pnlPct: number) => {
      console.log(`Target hit for ${symbol}:`, { target, pnlPct });
    });

    this.on('stopLossHit', (symbol: string, stopLoss: number, pnlPct: number) => {
      console.log(`Stop loss hit for ${symbol}:`, { stopLoss, pnlPct });
    });
  }

  /**
   * Log stage change for a signal
   */
  async logStageChange(
    symbol: string,
    stage: SignalStage,
    metrics?: {
      price: number;
      volume: number;
      delta: number;
      volatility: number;
    },
    notes?: string
  ): Promise<void> {
    try {
      // Get or create signal evolution
      let evolution = this.activeSignals.get(symbol) || [];
      
      // Create new stage entry
      const stageEntry: SignalEvolution = {
        stage,
        time: new Date().toTimeString().split(' ')[0],
        confidence: this.calculateCurrentConfidence(symbol),
        metrics,
        notes
      };
      
      // Add to evolution
      evolution.push(stageEntry);
      
      // Store updated evolution
      this.activeSignals.set(symbol, evolution);
      
      // Update lifecycle if exists
      const lifecycle = this.lifecycles.get(symbol);
      if (lifecycle) {
        lifecycle.lifecycle = evolution;
        this.lifecycles.set(symbol, lifecycle);
      }
      
      // Emit stage change event
      this.emit('stageChange', symbol, stage, stageEntry.confidence);
      
      // Check for lifecycle completion
      if (this.isLifecycleComplete(stage)) {
        await this.completeLifecycle(symbol, stage);
      }
      
    } catch (error) {
      console.error(`Error logging stage change for ${symbol}:`, error);
    }
  }

  /**
   * Update confidence for a signal
   */
  async updateConfidence(symbol: string, newScore: number): Promise<void> {
    try {
      const evolution = this.activeSignals.get(symbol);
      if (!evolution || evolution.length === 0) return;
      
      // Get current confidence
      const currentConfidence = this.calculateCurrentConfidence(symbol);
      
      // Update latest stage with new confidence
      const latestStage = evolution[evolution.length - 1];
      if (latestStage) {
        latestStage.confidence = newScore;
        latestStage.time = new Date().toTimeString().split(' ')[0];
      }
      
      // Store updated evolution
      this.activeSignals.set(symbol, evolution);
      
      // Update lifecycle
      const lifecycle = this.lifecycles.get(symbol);
      if (lifecycle) {
        lifecycle.lifecycle = evolution;
        lifecycle.peakConfidence = Math.max(lifecycle.peakConfidence, newScore);
        this.lifecycles.set(symbol, lifecycle);
      }
      
      // Emit confidence update event
      this.emit('confidenceUpdate', symbol, currentConfidence, newScore);
      
      // Check if confidence is too low
      if (newScore < this.minConfidenceThreshold) {
        await this.logStageChange(symbol, 'CLOSED', undefined, 'Confidence too low');
      }
      
    } catch (error) {
      console.error(`Error updating confidence for ${symbol}:`, error);
    }
  }

  /**
   * Start tracking a new signal
   */
  async startTracking(signal: TradeSignal): Promise<void> {
    try {
      const symbol = signal.symbol;
      
      // Create initial lifecycle
      const lifecycle: SignalLifecycle = {
        symbol,
        lifecycle: signal.signalEvolution || [],
        finalResult: 'EXPIRED', // Default, will be updated
        pnlPct: 0,
        maxDrawdown: 0,
        duration: 0,
        peakConfidence: signal.confidenceScore,
        startTime: new Date(),
        endTime: undefined
      };
      
      // Store lifecycle
      this.lifecycles.set(symbol, lifecycle);
      this.activeSignals.set(symbol, signal.signalEvolution || []);
      
      // Log initial stage
      await this.logStageChange(symbol, 'READY', {
        price: signal.entry,
        volume: 0,
        delta: 0,
        volatility: 0
      }, 'Signal tracking started');
      
    } catch (error) {
      console.error(`Error starting tracking for ${signal.symbol}:`, error);
    }
  }

  /**
   * Complete lifecycle for a signal
   */
  private async completeLifecycle(symbol: string, finalStage: SignalStage): Promise<void> {
    try {
      const lifecycle = this.lifecycles.get(symbol);
      if (!lifecycle) return;
      
      // Update lifecycle with final results
      lifecycle.finalResult = this.mapStageToResult(finalStage);
      lifecycle.endTime = new Date();
      lifecycle.duration = Math.floor((lifecycle.endTime.getTime() - lifecycle.startTime.getTime()) / (1000 * 60)); // minutes
      
      // Calculate PnL and drawdown
      const pnlData = this.calculatePnLData(lifecycle);
      lifecycle.pnlPct = pnlData.pnlPct;
      lifecycle.maxDrawdown = pnlData.maxDrawdown;
      
      // Move to completed signals
      this.completedSignals.set(symbol, lifecycle);
      this.lifecycles.delete(symbol);
      this.activeSignals.delete(symbol);
      
      // Emit lifecycle complete event
      this.emit('lifecycleComplete', lifecycle);
      
      // Emit specific result events
      if (finalStage === 'TARGET_HIT') {
        this.emit('targetHit', symbol, 0, lifecycle.pnlPct);
      } else if (finalStage === 'STOPPED') {
        this.emit('stopLossHit', symbol, 0, lifecycle.pnlPct);
      }
      
    } catch (error) {
      console.error(`Error completing lifecycle for ${symbol}:`, error);
    }
  }

  /**
   * Calculate current confidence with decay
   */
  private calculateCurrentConfidence(symbol: string): number {
    const lifecycle = this.lifecycles.get(symbol);
    if (!lifecycle) return 0;
    
    const startTime = lifecycle.startTime.getTime();
    const currentTime = Date.now();
    const elapsedMinutes = (currentTime - startTime) / (1000 * 60);
    
    // Apply confidence decay
    const decay = elapsedMinutes * this.confidenceDecayRate;
    const currentConfidence = Math.max(0, lifecycle.peakConfidence - decay);
    
    return currentConfidence;
  }

  /**
   * Check if lifecycle is complete
   */
  private isLifecycleComplete(stage: SignalStage): boolean {
    return ['TARGET_HIT', 'STOPPED', 'CLOSED'].includes(stage);
  }

  /**
   * Map stage to final result
   */
  private mapStageToResult(stage: SignalStage): 'TARGET_HIT' | 'STOPPED' | 'CLOSED' | 'EXPIRED' {
    switch (stage) {
      case 'TARGET_HIT':
        return 'TARGET_HIT';
      case 'STOPPED':
        return 'STOPPED';
      case 'CLOSED':
        return 'CLOSED';
      default:
        return 'EXPIRED';
    }
  }

  /**
   * Calculate PnL data for lifecycle
   */
  private calculatePnLData(lifecycle: SignalLifecycle): { pnlPct: number; maxDrawdown: number } {
    // Simplified PnL calculation based on confidence and duration
    const basePnL = lifecycle.peakConfidence * 2; // 2% per 100% confidence
    const durationPenalty = Math.max(0, (lifecycle.duration - 60) * 0.01); // 1% penalty per hour over 1 hour
    const pnlPct = Math.max(-10, basePnL - durationPenalty); // Cap at -10%
    
    const maxDrawdown = Math.max(0, Math.abs(pnlPct) * 0.5); // 50% of PnL as max drawdown
    
    return { pnlPct, maxDrawdown };
  }

  /**
   * Summarize lifecycle for a symbol
   */
  async summarizeLifecycle(symbol: string): Promise<SignalLifecycle | null> {
    try {
      // Check active signals first
      let lifecycle = this.lifecycles.get(symbol);
      if (lifecycle) {
        return lifecycle;
      }
      
      // Check completed signals
      lifecycle = this.completedSignals.get(symbol);
      if (lifecycle) {
        return lifecycle;
      }
      
      return null;
    } catch (error) {
      console.error(`Error summarizing lifecycle for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get all active lifecycles
   */
  getActiveLifecycles(): SignalLifecycle[] {
    return Array.from(this.lifecycles.values());
  }

  /**
   * Get all completed lifecycles
   */
  getCompletedLifecycles(): SignalLifecycle[] {
    return Array.from(this.completedSignals.values());
  }

  /**
   * Get lifecycle for specific symbol
   */
  getLifecycle(symbol: string): SignalLifecycle | undefined {
    return this.lifecycles.get(symbol) || this.completedSignals.get(symbol);
  }

  /**
   * Get signal evolution for symbol
   */
  getSignalEvolution(symbol: string): SignalEvolution[] {
    return this.activeSignals.get(symbol) || [];
  }

  /**
   * Get signals by stage
   */
  getSignalsByStage(stage: SignalStage): Array<{ symbol: string; evolution: SignalEvolution[] }> {
    const result: Array<{ symbol: string; evolution: SignalEvolution[] }> = [];
    
    for (const [symbol, evolution] of this.activeSignals.entries()) {
      const latestStage = evolution[evolution.length - 1];
      if (latestStage && latestStage.stage === stage) {
        result.push({ symbol, evolution });
      }
    }
    
    return result;
  }

  /**
   * Get high confidence signals
   */
  getHighConfidenceSignals(minConfidence: number = 0.7): Array<{ symbol: string; confidence: number; lifecycle: SignalLifecycle }> {
    const result: Array<{ symbol: string; confidence: number; lifecycle: SignalLifecycle }> = [];
    
    for (const [symbol, lifecycle] of this.lifecycles.entries()) {
      const currentConfidence = this.calculateCurrentConfidence(symbol);
      if (currentConfidence >= minConfidence) {
        result.push({ symbol, confidence: currentConfidence, lifecycle });
      }
    }
    
    return result.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalSignals: number;
    activeSignals: number;
    completedSignals: number;
    avgDuration: number;
    avgPnL: number;
    winRate: number;
    avgConfidence: number;
    byResult: Record<string, number>;
  } {
    const active = this.lifecycles.size;
    const completed = this.completedSignals.size;
    const total = active + completed;
    
    const completedLifecycles = Array.from(this.completedSignals.values());
    
    const avgDuration = completedLifecycles.length > 0
      ? completedLifecycles.reduce((sum, l) => sum + l.duration, 0) / completedLifecycles.length
      : 0;
    
    const avgPnL = completedLifecycles.length > 0
      ? completedLifecycles.reduce((sum, l) => sum + l.pnlPct, 0) / completedLifecycles.length
      : 0;
    
    const winRate = completedLifecycles.length > 0
      ? completedLifecycles.filter(l => l.pnlPct > 0).length / completedLifecycles.length
      : 0;
    
    const allLifecycles = [...Array.from(this.lifecycles.values()), ...completedLifecycles];
    const avgConfidence = allLifecycles.length > 0
      ? allLifecycles.reduce((sum, l) => sum + l.peakConfidence, 0) / allLifecycles.length
      : 0;
    
    const byResult = completedLifecycles.reduce((acc, lifecycle) => {
      acc[lifecycle.finalResult] = (acc[lifecycle.finalResult] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalSignals: total,
      activeSignals: active,
      completedSignals: completed,
      avgDuration,
      avgPnL,
      winRate,
      avgConfidence,
      byResult
    };
  }

  /**
   * Clean up expired signals
   */
  async cleanupExpiredSignals(): Promise<void> {
    try {
      const now = Date.now();
      const expiredSignals: string[] = [];
      
      for (const [symbol, lifecycle] of this.lifecycles.entries()) {
        const elapsedMinutes = (now - lifecycle.startTime.getTime()) / (1000 * 60);
        
        if (elapsedMinutes > this.maxLifecycleDuration) {
          expiredSignals.push(symbol);
        }
      }
      
      // Close expired signals
      for (const symbol of expiredSignals) {
        await this.logStageChange(symbol, 'CLOSED', undefined, 'Signal expired');
      }
      
    } catch (error) {
      console.error('Error cleaning up expired signals:', error);
    }
  }

  /**
   * Export lifecycle data for backtesting
   */
  exportLifecycleData(): {
    active: SignalLifecycle[];
    completed: SignalLifecycle[];
    timestamp: Date;
  } {
    return {
      active: Array.from(this.lifecycles.values()),
      completed: Array.from(this.completedSignals.values()),
      timestamp: new Date()
    };
  }

  /**
   * Clear all tracking data
   */
  clearAllData(): void {
    this.lifecycles.clear();
    this.activeSignals.clear();
    this.completedSignals.clear();
  }

  /**
   * Clear data for specific symbol
   */
  clearSymbolData(symbol: string): void {
    this.lifecycles.delete(symbol);
    this.activeSignals.delete(symbol);
    this.completedSignals.delete(symbol);
  }
}

// Export singleton instance
export const signalEvolutionTracker = new SignalEvolutionTracker();


