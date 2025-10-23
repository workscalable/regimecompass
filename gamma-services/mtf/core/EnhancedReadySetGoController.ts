// File: /gamma-services/mtf/core/EnhancedReadySetGoController.ts

import { EventBus } from '../../orchestrators/EventBus';
import { MTFTradeDecisionEngine, MTFSignalBundle, TradeDecision } from './TradeDecisionEngine';
import { MTFConfigManager } from './MTFConfig';

export interface EnhancedTradeExecution {
  decision: TradeDecision;
  executionTime: number;
  slippage: number;
  fillPrice: number;
  commission: number;
  success: boolean;
  error?: string;
}

export interface PositionExit {
  positionId: string;
  exitReason: string;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  holdingPeriod: number;
  success: boolean;
}

export class EnhancedReadySetGoController {
  private mtfDecisionEngine: MTFTradeDecisionEngine;
  private configManager: MTFConfigManager;
  private activePositions: Map<string, any> = new Map();
  private tickerStates: Map<string, TradeDecision> = new Map();

  constructor(private eventBus: EventBus) {
    this.mtfDecisionEngine = new MTFTradeDecisionEngine(eventBus);
    this.configManager = MTFConfigManager.getInstance();
    this.setupEventListeners();
  }

  public async processSignalBundle(bundle: MTFSignalBundle): Promise<TradeDecision> {
    try {
      // Get previous state for this ticker
      const prevDecision = this.tickerStates.get(bundle.ticker);
      if (prevDecision) {
        bundle.prevState = prevDecision.state;
        bundle.sequenceStartTime = prevDecision.timestamp ? new Date(prevDecision.timestamp).getTime() : Date.now();
      }

      // Process through MTF decision engine
      const decision = await this.mtfDecisionEngine.processMTFSignal(bundle);

      // Update internal state based on decision
      await this.updateTickerState(bundle.ticker, decision);

      // Execute trades if in TRADE state
      if (decision.state === 'TRADE' && decision.size > 0) {
        await this.executeTrade(decision);
      }

      // Handle exits if in EXIT/ABORT state
      if (['EXIT', 'ABORT'].includes(decision.state)) {
        await this.handleExit(decision);
      }

      return decision;
    } catch (error) {
      console.error(`Failed to process signal bundle for ${bundle.ticker}:`, error);
      throw error;
    }
  }

  public async processMultipleSignals(bundles: MTFSignalBundle[]): Promise<TradeDecision[]> {
    const promises = bundles.map(bundle => this.processSignalBundle(bundle));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to process signal for ${bundles[index].ticker}:`, result.reason);
        // Return a default READY state decision for failed processing
        return {
          ticker: bundles[index].ticker,
          state: 'READY' as const,
          confidence: 0,
          mtfConfluence: 0,
          size: 0,
          direction: 'LONG' as const,
          timestamp: new Date().toISOString(),
          timeframeAlignment: { daily: false, hourly: false, thirty: false },
          notes: ['Processing failed - reset to READY'],
          riskMetrics: { stopDistance: 0, profitTarget: 0, timeDecayBuffer: 0 }
        };
      }
    });
  }

  public getTickerState(ticker: string): TradeDecision | null {
    return this.tickerStates.get(ticker) || null;
  }

  public getAllTickerStates(): Map<string, TradeDecision> {
    return new Map(this.tickerStates);
  }

  public getActivePositions(): any[] {
    return Array.from(this.activePositions.values());
  }

  public getSystemStatus(): {
    totalTickers: number;
    activePositions: number;
    stateDistribution: Record<string, number>;
    lastUpdate: string;
  } {
    const stateDistribution: Record<string, number> = {};
    
    for (const decision of this.tickerStates.values()) {
      stateDistribution[decision.state] = (stateDistribution[decision.state] || 0) + 1;
    }

    return {
      totalTickers: this.tickerStates.size,
      activePositions: this.activePositions.size,
      stateDistribution,
      lastUpdate: new Date().toISOString()
    };
  }

  private async updateTickerState(ticker: string, decision: TradeDecision): Promise<void> {
    const prevDecision = this.tickerStates.get(ticker);
    this.tickerStates.set(ticker, decision);

    // Emit state change event if state actually changed
    if (!prevDecision || prevDecision.state !== decision.state) {
      this.eventBus.emit('mtf:state:change', {
        ticker,
        previousState: prevDecision?.state || null,
        newState: decision.state,
        decision,
        timestamp: Date.now()
      });
    }

    // Emit confidence update event
    this.eventBus.emit('mtf:confidence:update', {
      ticker,
      confidence: decision.confidence,
      mtfConfluence: decision.mtfConfluence,
      timeframeAlignment: decision.timeframeAlignment,
      timestamp: Date.now()
    });
  }

  private async executeTrade(decision: TradeDecision): Promise<EnhancedTradeExecution> {
    const startTime = Date.now();
    
    try {
      // Simulate realistic trade execution
      const execution: EnhancedTradeExecution = {
        decision,
        executionTime: Date.now() - startTime,
        slippage: this.calculateSlippage(decision),
        fillPrice: this.calculateFillPrice(decision),
        commission: this.calculateCommission(decision),
        success: true
      };

      // Create position record
      const position = {
        id: `pos_${decision.ticker}_${Date.now()}`,
        ticker: decision.ticker,
        decision,
        execution,
        entryTime: Date.now(),
        status: 'OPEN'
      };

      this.activePositions.set(position.id, position);

      // Emit trade execution event
      this.eventBus.emit('mtf:trade:executed', {
        ticker: decision.ticker,
        positionId: position.id,
        execution,
        timestamp: Date.now()
      });

      console.log(`✅ Trade executed for ${decision.ticker}: ${decision.direction} ${decision.size}x at confidence ${(decision.confidence * 100).toFixed(1)}%`);

      return execution;
    } catch (error) {
      const execution: EnhancedTradeExecution = {
        decision,
        executionTime: Date.now() - startTime,
        slippage: 0,
        fillPrice: 0,
        commission: 0,
        success: false,
        error: error.message
      };

      console.error(`❌ Trade execution failed for ${decision.ticker}:`, error);
      return execution;
    }
  }

  private async handleExit(decision: TradeDecision): Promise<void> {
    // Find and close positions for this ticker
    const positionsToClose = Array.from(this.activePositions.values())
      .filter(pos => pos.ticker === decision.ticker && pos.status === 'OPEN');

    for (const position of positionsToClose) {
      try {
        const exit = await this.closePosition(position, decision.state);
        
        this.eventBus.emit('mtf:position:closed', {
          ticker: decision.ticker,
          positionId: position.id,
          exit,
          timestamp: Date.now()
        });

        console.log(`📤 Position closed for ${decision.ticker}: ${exit.exitReason} PnL: ${exit.pnl.toFixed(2)} (${exit.pnlPercent.toFixed(1)}%)`);
      } catch (error) {
        console.error(`Failed to close position ${position.id}:`, error);
      }
    }
  }

  private async closePosition(position: any, exitReason: string): Promise<PositionExit> {
    const holdingPeriod = Date.now() - position.entryTime;
    
    // Simulate position exit
    const exitPrice = this.calculateExitPrice(position);
    const pnl = this.calculatePnL(position, exitPrice);
    const pnlPercent = (pnl / (position.execution.fillPrice * position.decision.size)) * 100;

    const exit: PositionExit = {
      positionId: position.id,
      exitReason,
      exitPrice,
      pnl,
      pnlPercent,
      holdingPeriod,
      success: true
    };

    // Update position status
    position.status = 'CLOSED';
    position.exit = exit;
    position.exitTime = Date.now();

    return exit;
  }

  private calculateSlippage(decision: TradeDecision): number {
    // Simulate realistic slippage based on market conditions
    const baseSlippage = 0.001; // 0.1%
    const confidenceAdjustment = (1 - decision.confidence) * 0.002; // Higher slippage for lower confidence
    return baseSlippage + confidenceAdjustment;
  }

  private calculateFillPrice(decision: TradeDecision): number {
    // Simulate fill price with slippage
    const basePrice = 100; // Placeholder - would come from market data
    const slippage = this.calculateSlippage(decision);
    return basePrice * (1 + (decision.direction === 'LONG' ? slippage : -slippage));
  }

  private calculateCommission(decision: TradeDecision): number {
    // Simulate commission costs
    return decision.size * 0.65; // $0.65 per contract
  }

  private calculateExitPrice(position: any): number {
    // Simulate exit price based on time and market movement
    const entryPrice = position.execution.fillPrice;
    const timeDecay = (Date.now() - position.entryTime) / (24 * 60 * 60 * 1000); // Days
    const randomMovement = (Math.random() - 0.5) * 0.1; // ±5% random movement
    
    return entryPrice * (1 + randomMovement - (timeDecay * 0.02)); // 2% time decay per day
  }

  private calculatePnL(position: any, exitPrice: number): number {
    const entryPrice = position.execution.fillPrice;
    const size = position.decision.size;
    const direction = position.decision.direction;
    
    const priceChange = exitPrice - entryPrice;
    const multiplier = direction === 'LONG' ? 1 : -1;
    
    return priceChange * size * multiplier * 100; // $100 per point per contract
  }

  private setupEventListeners(): void {
    // Listen for configuration changes
    this.eventBus.on('mtf:config:updated', (config) => {
      console.log('MTF configuration updated');
    });

    // Listen for system shutdown
    this.eventBus.on('system:shutdown', async () => {
      await this.shutdown();
    });
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Enhanced ReadySetGo Controller...');
    
    // Close all open positions
    const openPositions = Array.from(this.activePositions.values())
      .filter(pos => pos.status === 'OPEN');
    
    for (const position of openPositions) {
      try {
        await this.closePosition(position, 'SYSTEM_SHUTDOWN');
      } catch (error) {
        console.error(`Failed to close position during shutdown:`, error);
      }
    }
    
    console.log('Enhanced ReadySetGo Controller shutdown complete');
  }

  // Utility methods for testing and monitoring
  public simulateSignal(ticker: string, overrides: Partial<MTFSignalBundle> = {}): MTFSignalBundle {
    return {
      ticker,
      daily: {
        confidence: 0.7,
        bias: 'LONG',
        powerCandle: false,
        volumeSurge: false,
        ribbonAlignment: 0.8,
        momentumDivergence: 0.1,
        timestamp: Date.now()
      },
      hourly: {
        confidence: 0.65,
        bias: 'LONG',
        powerCandle: false,
        volumeSurge: true,
        ribbonAlignment: 0.75,
        momentumDivergence: 0.05,
        timestamp: Date.now()
      },
      thirty: {
        confidence: 0.6,
        bias: 'LONG',
        powerCandle: true,
        volumeSurge: true,
        ribbonAlignment: 0.7,
        momentumDivergence: 0.0,
        timestamp: Date.now()
      },
      regimeBias: 0.6,
      fibZone: 1.0,
      gammaExposure: -0.1,
      vwapDeviation: 0.02,
      ...overrides
    };
  }

  public getPerformanceMetrics(): {
    totalSignalsProcessed: number;
    totalTradesExecuted: number;
    totalPositionsClosed: number;
    averageHoldingPeriod: number;
    averageConfidence: number;
  } {
    const closedPositions = Array.from(this.activePositions.values())
      .filter(pos => pos.status === 'CLOSED');
    
    const totalHoldingTime = closedPositions.reduce((sum, pos) => sum + (pos.exit?.holdingPeriod || 0), 0);
    const totalConfidence = Array.from(this.tickerStates.values())
      .reduce((sum, decision) => sum + decision.confidence, 0);

    return {
      totalSignalsProcessed: this.tickerStates.size,
      totalTradesExecuted: this.activePositions.size,
      totalPositionsClosed: closedPositions.length,
      averageHoldingPeriod: closedPositions.length > 0 ? totalHoldingTime / closedPositions.length : 0,
      averageConfidence: this.tickerStates.size > 0 ? totalConfidence / this.tickerStates.size : 0
    };
  }
}