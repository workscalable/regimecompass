import { EventEmitter } from 'events';
import { 
  TradeSignal, 
  SignalPayload, 
  ConfidenceBreakdown,
  SignalStage 
} from '@/lib/trading';
import { triangleDetector } from '../patterns/TrianglePlayDetector_v2';
import { multiTFOrchestrator } from '../confirmations/MultiTFOrchestrator';
import { orderFlowAnalyzer } from '../data/OrderFlowAnalyzer';
import { optionsFlowModule } from '../data/OptionsFlowModule';
import { strikeSelector } from '../strategy/StrikeSelector';

/**
 * TradeDecisionEngine - Trade Recommendation Orchestrator
 * 
 * Integrates all modules → computes composite confidence:
 * confidenceScore = (0.25*HTF_breakout) + (0.25*LTF_alignment) + (0.20*orderFlowBias) + (0.15*deltaStrength) + (0.15*volumeExpansion)
 * 
 * Triggers trade when ≥ 0.75
 * Publishes to execution or paper-trading layer
 */

export class TradeDecisionEngine extends EventEmitter {
  private signals: Map<string, TradeSignal> = new Map();
  private readonly confidenceThreshold = 0.75;
  private readonly maxSignals = 10; // Maximum concurrent signals

  // Confidence weights
  private readonly weights = {
    htfBreakout: 0.25,
    ltfAlignment: 0.25,
    orderFlowBias: 0.20,
    deltaStrength: 0.15,
    volumeExpansion: 0.15
  };

  constructor() {
    super();
    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for trade decision events
   */
  private setupEventHandlers(): void {
    this.on('signalGenerated', (signal: TradeSignal) => {
      console.log(`Trade signal generated for ${signal.symbol}:`, {
        direction: signal.direction,
        confidence: signal.confidenceScore,
        pattern: signal.pattern
      });
    });

    this.on('signalUpdated', (signal: TradeSignal) => {
      console.log(`Trade signal updated for ${signal.symbol}:`, {
        confidence: signal.confidenceScore,
        stage: signal.signalEvolution[signal.signalEvolution.length - 1]?.stage
      });
    });

    this.on('signalClosed', (signal: TradeSignal) => {
      console.log(`Trade signal closed for ${signal.symbol}:`, {
        finalStage: signal.signalEvolution[signal.signalEvolution.length - 1]?.stage
      });
    });
  }

  /**
   * Process comprehensive trade decision for a symbol
   */
  async processTradeDecision(
    symbol: string,
    marketData: any,
    htfData: any,
    ltfData: any
  ): Promise<TradeSignal | null> {
    try {
      // 1. Pattern Detection
      const pattern = await this.detectPattern(symbol, marketData);
      if (!pattern) {
        console.log(`No pattern detected for ${symbol}`);
        return null;
      }

      // 2. Multi-Timeframe Confirmation
      const mtfConfirmation = await this.processMultiTimeframeConfirmation(
        symbol, 
        htfData, 
        ltfData
      );
      if (!mtfConfirmation.overallConfirmation) {
        console.log(`Multi-timeframe confirmation failed for ${symbol}`);
        return null;
      }

      // 3. Order Flow Analysis
      const orderFlowMetrics = await this.processOrderFlowAnalysis(symbol, marketData);
      
      // 4. Options Flow Analysis
      const optionsFlowData = await this.processOptionsFlowAnalysis(symbol);
      
      // 5. Calculate composite confidence
      const confidenceBreakdown = this.calculateConfidenceBreakdown(
        mtfConfirmation,
        orderFlowMetrics,
        optionsFlowData
      );

      // 6. Check if confidence meets threshold
      if (confidenceBreakdown.total < this.confidenceThreshold) {
        console.log(`Confidence too low for ${symbol}: ${confidenceBreakdown.total}`);
        return null;
      }

      // 7. Strike Selection
      const strikeSelection = await this.processStrikeSelection(
        symbol,
        pattern,
        marketData
      );

      // 8. Generate trade signal
      const tradeSignal = await this.generateTradeSignal(
        symbol,
        pattern,
        mtfConfirmation,
        orderFlowMetrics,
        optionsFlowData,
        strikeSelection,
        confidenceBreakdown
      );

      // 9. Store and emit signal
      this.signals.set(symbol, tradeSignal);
      this.emit('signalGenerated', tradeSignal);

      return tradeSignal;

    } catch (error) {
      console.error(`Error processing trade decision for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Detect pattern using TrianglePlayDetector
   */
  private async detectPattern(symbol: string, marketData: any): Promise<any> {
    try {
      const pattern = await triangleDetector.detectPatterns(symbol, marketData);
      return pattern;
    } catch (error) {
      console.error(`Error detecting pattern for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Process multi-timeframe confirmation
   */
  private async processMultiTimeframeConfirmation(
    symbol: string,
    htfData: any,
    ltfData: any
  ): Promise<any> {
    try {
      const confirmation = await multiTFOrchestrator.processConfirmation(
        symbol,
        htfData,
        ltfData
      );
      return confirmation;
    } catch (error) {
      console.error(`Error processing multi-timeframe confirmation for ${symbol}:`, error);
      return { overallConfirmation: false, confidence: 0 };
    }
  }

  /**
   * Process order flow analysis
   */
  private async processOrderFlowAnalysis(symbol: string, marketData: any): Promise<any> {
    try {
      const metrics = await orderFlowAnalyzer.processMarketData(symbol, marketData);
      return metrics;
    } catch (error) {
      console.error(`Error processing order flow analysis for ${symbol}:`, error);
      return { deltaStrength: 0, volumeExpansion: 1, orderBookPressure: 1 };
    }
  }

  /**
   * Process options flow analysis
   */
  private async processOptionsFlowAnalysis(symbol: string): Promise<any> {
    try {
      const flowData = await optionsFlowModule.analyzeOptionsFlow(symbol);
      return flowData;
    } catch (error) {
      console.error(`Error processing options flow analysis for ${symbol}:`, error);
      return { flowBias: 'NEUTRAL', flowConfidence: 0.5 };
    }
  }

  /**
   * Process strike selection
   */
  private async processStrikeSelection(
    symbol: string,
    pattern: any,
    marketData: any
  ): Promise<any> {
    try {
      const currentPrice = marketData[0]?.price || 0;
      const direction = pattern.range[1] > pattern.range[0] ? 'LONG' : 'SHORT';
      
      const selection = await strikeSelector.selectStrikes(
        symbol,
        direction,
        currentPrice
      );
      return selection;
    } catch (error) {
      console.error(`Error processing strike selection for ${symbol}:`, error);
      return { recommendedStrikes: [], confidence: 0 };
    }
  }

  /**
   * Calculate confidence breakdown
   */
  private calculateConfidenceBreakdown(
    mtfConfirmation: any,
    orderFlowMetrics: any,
    optionsFlowData: any
  ): ConfidenceBreakdown {
    // HTF breakout score
    const htfBreakout = mtfConfirmation.htfConfirmations
      .filter((c: any) => c.confirmation)
      .reduce((sum: number, c: any) => sum + c.strength, 0) / 
      Math.max(1, mtfConfirmation.htfConfirmations.length);

    // LTF alignment score
    const ltfAlignment = mtfConfirmation.ltfConfirmations
      .filter((c: any) => c.confirmation)
      .reduce((sum: number, c: any) => sum + c.strength, 0) / 
      Math.max(1, mtfConfirmation.ltfConfirmations.length);

    // Order flow bias score
    const orderFlowBias = this.calculateOrderFlowBiasScore(orderFlowMetrics);

    // Delta strength score
    const deltaStrength = Math.min(1, orderFlowMetrics.deltaStrength || 0);

    // Volume expansion score
    const volumeExpansion = Math.min(1, (orderFlowMetrics.volumeExpansion || 1) - 1);

    // Calculate weighted total
    const total = (
      htfBreakout * this.weights.htfBreakout +
      ltfAlignment * this.weights.ltfAlignment +
      orderFlowBias * this.weights.orderFlowBias +
      deltaStrength * this.weights.deltaStrength +
      volumeExpansion * this.weights.volumeExpansion
    );

    return {
      htfBreakout,
      ltfAlignment,
      orderFlowBias,
      deltaStrength,
      volumeExpansion,
      total
    };
  }

  /**
   * Calculate order flow bias score
   */
  private calculateOrderFlowBiasScore(orderFlowMetrics: any): number {
    const deltaStrength = orderFlowMetrics.deltaStrength || 0;
    const volumeExpansion = orderFlowMetrics.volumeExpansion || 1;
    const orderBookPressure = orderFlowMetrics.orderBookPressure || 1;
    
    // Combine factors for order flow bias
    const biasScore = (deltaStrength * 0.4) + 
                     (Math.min(1, volumeExpansion - 1) * 0.3) + 
                     (Math.min(1, orderBookPressure - 1) * 0.3);
    
    return Math.min(1, biasScore);
  }

  /**
   * Generate comprehensive trade signal
   */
  private async generateTradeSignal(
    symbol: string,
    pattern: any,
    mtfConfirmation: any,
    orderFlowMetrics: any,
    optionsFlowData: any,
    strikeSelection: any,
    confidenceBreakdown: ConfidenceBreakdown
  ): Promise<TradeSignal> {
    // Determine direction
    const direction = pattern.range[1] > pattern.range[0] ? 'LONG' : 'SHORT';
    
    // Calculate entry, targets, and stop loss
    const entry = this.calculateEntryPrice(pattern, orderFlowMetrics);
    const targets = this.calculateTargets(pattern, entry, direction);
    const stopLoss = this.calculateStopLoss(pattern, entry, direction);
    
    // Generate confirmations list
    const confirmations = this.generateConfirmationsList(mtfConfirmation);
    
    // Generate signal evolution
    const signalEvolution = this.generateSignalEvolution(confidenceBreakdown.total);
    
    const tradeSignal: TradeSignal = {
      symbol,
      pattern: pattern.pattern,
      direction,
      entry,
      targets,
      stopLoss,
      confidenceScore: confidenceBreakdown.total,
      recommendedStrikes: strikeSelection.recommendedStrikes || [],
      confirmations,
      signalEvolution,
      timestamp: new Date()
    };

    return tradeSignal;
  }

  /**
   * Calculate entry price
   */
  private calculateEntryPrice(pattern: any, orderFlowMetrics: any): number {
    const currentPrice = orderFlowMetrics.volumeProfile?.vwap || pattern.range[1];
    return currentPrice;
  }

  /**
   * Calculate target prices
   */
  private calculateTargets(pattern: any, entry: number, direction: 'LONG' | 'SHORT'): number[] {
    const range = pattern.range[1] - pattern.range[0];
    const atr = range * 0.5; // Simplified ATR calculation
    
    if (direction === 'LONG') {
      return [
        entry + (atr * 1.0), // Target 1
        entry + (atr * 2.0), // Target 2
        entry + (atr * 3.0)  // Target 3
      ];
    } else {
      return [
        entry - (atr * 1.0), // Target 1
        entry - (atr * 2.0), // Target 2
        entry - (atr * 3.0)  // Target 3
      ];
    }
  }

  /**
   * Calculate stop loss
   */
  private calculateStopLoss(pattern: any, entry: number, direction: 'LONG' | 'SHORT'): number {
    const range = pattern.range[1] - pattern.range[0];
    const atr = range * 0.5;
    
    if (direction === 'LONG') {
      return entry - (atr * 1.5);
    } else {
      return entry + (atr * 1.5);
    }
  }

  /**
   * Generate confirmations list
   */
  private generateConfirmationsList(mtfConfirmation: any): { LTF: string[]; HTF: string[] } {
    const ltfConfirmations = mtfConfirmation.ltfConfirmations
      .filter((c: any) => c.confirmation)
      .map((c: any) => `${c.timeframe}_DeltaShift`);
    
    const htfConfirmations = mtfConfirmation.htfConfirmations
      .filter((c: any) => c.confirmation)
      .map((c: any) => `${c.timeframe}_Breakout`);
    
    return {
      LTF: ltfConfirmations,
      HTF: htfConfirmations
    };
  }

  /**
   * Generate signal evolution
   */
  private generateSignalEvolution(confidence: number): any[] {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    
    return [
      {
        stage: 'READY' as SignalStage,
        time: timeStr,
        confidence: confidence * 0.8,
        metrics: {
          price: 0,
          volume: 0,
          delta: 0,
          volatility: 0
        }
      },
      {
        stage: 'GO' as SignalStage,
        time: timeStr,
        confidence: confidence,
        metrics: {
          price: 0,
          volume: 0,
          delta: 0,
          volatility: 0
        }
      }
    ];
  }

  /**
   * Update existing signal
   */
  async updateSignal(symbol: string, newData: any): Promise<TradeSignal | null> {
    const existingSignal = this.signals.get(symbol);
    if (!existingSignal) return null;

    try {
      // Update signal with new data
      const updatedSignal = { ...existingSignal };
      updatedSignal.timestamp = new Date();
      
      // Add new evolution stage
      const newStage = {
        stage: 'ACTIVE' as SignalStage,
        time: new Date().toTimeString().split(' ')[0],
        confidence: existingSignal.confidenceScore,
        metrics: {
          price: newData.price || 0,
          volume: newData.volume || 0,
          delta: newData.delta || 0,
          volatility: newData.volatility || 0
        }
      };
      
      updatedSignal.signalEvolution.push(newStage);
      
      // Store updated signal
      this.signals.set(symbol, updatedSignal);
      
      // Emit update event
      this.emit('signalUpdated', updatedSignal);
      
      return updatedSignal;
    } catch (error) {
      console.error(`Error updating signal for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Close signal
   */
  async closeSignal(symbol: string, reason: string): Promise<boolean> {
    const signal = this.signals.get(symbol);
    if (!signal) return false;

    try {
      const closeStage = {
        stage: 'CLOSED' as SignalStage,
        time: new Date().toTimeString().split(' ')[0],
        confidence: signal.confidenceScore,
        notes: reason
      };
      
      signal.signalEvolution.push(closeStage);
      
      // Emit close event
      this.emit('signalClosed', signal);
      
      // Remove from active signals
      this.signals.delete(symbol);
      
      return true;
    } catch (error) {
      console.error(`Error closing signal for ${symbol}:`, error);
      return false;
    }
  }

  /**
   * Get signal for symbol
   */
  getSignal(symbol: string): TradeSignal | undefined {
    return this.signals.get(symbol);
  }

  /**
   * Get all active signals
   */
  getActiveSignals(): TradeSignal[] {
    return Array.from(this.signals.values());
  }

  /**
   * Get signals by confidence threshold
   */
  getSignalsByConfidence(minConfidence: number = 0.75): TradeSignal[] {
    return Array.from(this.signals.values())
      .filter(signal => signal.confidenceScore >= minConfidence);
  }

  /**
   * Clear signal for symbol
   */
  clearSignal(symbol: string): boolean {
    return this.signals.delete(symbol);
  }

  /**
   * Clear all signals
   */
  clearAllSignals(): void {
    this.signals.clear();
  }

  /**
   * Get signal statistics
   */
  getSignalStats(): {
    totalSignals: number;
    avgConfidence: number;
    byDirection: Record<'LONG' | 'SHORT', number>;
    byPattern: Record<string, number>;
    highConfidenceSignals: number;
  } {
    const allSignals = Array.from(this.signals.values());
    
    const avgConfidence = allSignals.length > 0
      ? allSignals.reduce((sum, s) => sum + s.confidenceScore, 0) / allSignals.length
      : 0;

    const byDirection = allSignals.reduce((acc, signal) => {
      acc[signal.direction] = (acc[signal.direction] || 0) + 1;
      return acc;
    }, {} as Record<'LONG' | 'SHORT', number>);

    const byPattern = allSignals.reduce((acc, signal) => {
      acc[signal.pattern] = (acc[signal.pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const highConfidenceSignals = allSignals.filter(s => s.confidenceScore >= 0.8).length;

    return {
      totalSignals: allSignals.length,
      avgConfidence,
      byDirection,
      byPattern,
      highConfidenceSignals
    };
  }
}

// Export singleton instance
export const tradeDecisionEngine = new TradeDecisionEngine();


