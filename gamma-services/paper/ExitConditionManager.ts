import { PaperPosition, ExitReason, RiskSettings } from '../models/PaperTradingTypes';
import { EventBus } from '../core/EventBus';

export interface ExitCondition {
  id: string;
  type: 'PROFIT_TARGET' | 'STOP_LOSS' | 'TIME_DECAY' | 'EXPIRATION' | 'TRAILING_STOP' | 'BREAKEVEN_STOP';
  enabled: boolean;
  parameters: Record<string, any>;
  priority: number; // Lower number = higher priority
}

export interface ExitSignal {
  positionId: string;
  reason: ExitReason;
  exitPrice: number;
  confidence: number; // 0-1, how confident we are in this exit signal
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
}

export interface ExitConditionConfig {
  profitTargetPercent: number; // e.g., 50% profit target
  stopLossPercent: number; // e.g., 50% stop loss
  timeDecayThreshold: number; // e.g., 30% time decay
  trailingStopPercent: number; // e.g., 20% trailing stop
  breakevenStopEnabled: boolean;
  expirationDaysWarning: number; // Days before expiration to warn
  enableAutoExit: boolean;
}

export class ExitConditionManager {
  private eventBus: EventBus;
  private config: ExitConditionConfig;
  private positionHighWaterMarks: Map<string, number> = new Map(); // For trailing stops
  private exitConditions: Map<string, ExitCondition[]> = new Map(); // positionId -> conditions
  private monitoringInterval?: NodeJS.Timeout;

  constructor(eventBus: EventBus, config: ExitConditionConfig) {
    this.eventBus = eventBus;
    this.config = config;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for new positions to set up exit conditions
    this.eventBus.on('paper:trade:executed', (data) => {
      this.setupExitConditions(data.position);
    });

    // Listen for position updates to check exit conditions
    this.eventBus.on('paper:position:update', (data) => {
      this.checkExitConditions(data.positionId, data.currentPrice, data.pnl, data.pnlPercent);
    });

    // Listen for market data updates
    this.eventBus.on('market:data', (data) => {
      // Check all positions for this ticker
      this.checkPositionsForTicker(data.ticker, data.timestamp);
    });
  }

  public startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    // Check exit conditions every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performPeriodicChecks();
    }, 30000);

    console.log('🚪 Exit condition monitoring started');
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('🚪 Exit condition monitoring stopped');
    }
  }

  private setupExitConditions(position: PaperPosition): void {
    const conditions: ExitCondition[] = [];

    // Profit Target
    conditions.push({
      id: `profit_target_${position.id}`,
      type: 'PROFIT_TARGET',
      enabled: true,
      parameters: {
        targetPercent: this.config.profitTargetPercent
      },
      priority: 1
    });

    // Stop Loss
    conditions.push({
      id: `stop_loss_${position.id}`,
      type: 'STOP_LOSS',
      enabled: true,
      parameters: {
        stopPercent: this.config.stopLossPercent
      },
      priority: 2
    });

    // Trailing Stop
    conditions.push({
      id: `trailing_stop_${position.id}`,
      type: 'TRAILING_STOP',
      enabled: true,
      parameters: {
        trailingPercent: this.config.trailingStopPercent
      },
      priority: 3
    });

    // Time Decay
    conditions.push({
      id: `time_decay_${position.id}`,
      type: 'TIME_DECAY',
      enabled: true,
      parameters: {
        decayThreshold: this.config.timeDecayThreshold
      },
      priority: 4
    });

    // Expiration Warning
    conditions.push({
      id: `expiration_${position.id}`,
      type: 'EXPIRATION',
      enabled: true,
      parameters: {
        warningDays: this.config.expirationDaysWarning
      },
      priority: 5
    });

    // Breakeven Stop (after profit)
    if (this.config.breakevenStopEnabled) {
      conditions.push({
        id: `breakeven_stop_${position.id}`,
        type: 'BREAKEVEN_STOP',
        enabled: false, // Enabled dynamically when position becomes profitable
        parameters: {},
        priority: 6
      });
    }

    this.exitConditions.set(position.id, conditions);
    this.positionHighWaterMarks.set(position.id, position.entryPrice);

    console.log(`🚪 Set up ${conditions.length} exit conditions for position ${position.id}`);
  }

  private checkExitConditions(
    positionId: string,
    currentPrice: number,
    pnl: number,
    pnlPercent: number
  ): void {
    const conditions = this.exitConditions.get(positionId);
    if (!conditions) return;

    const exitSignals: ExitSignal[] = [];

    for (const condition of conditions) {
      if (!condition.enabled) continue;

      const signal = this.evaluateCondition(condition, positionId, currentPrice, pnl, pnlPercent);
      if (signal) {
        exitSignals.push(signal);
      }
    }

    // Process exit signals by priority
    if (exitSignals.length > 0) {
      exitSignals.sort((a, b) => {
        // Sort by urgency first, then by condition priority
        const urgencyOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
        if (urgencyDiff !== 0) return urgencyDiff;

        // If same urgency, use condition priority
        const aCondition = conditions.find(c => c.id.includes(a.reason.toLowerCase()));
        const bCondition = conditions.find(c => c.id.includes(b.reason.toLowerCase()));
        return (aCondition?.priority || 999) - (bCondition?.priority || 999);
      });

      const primarySignal = exitSignals[0];
      this.processExitSignal(primarySignal);
    }
  }

  private evaluateCondition(
    condition: ExitCondition,
    positionId: string,
    currentPrice: number,
    pnl: number,
    pnlPercent: number
  ): ExitSignal | null {
    switch (condition.type) {
      case 'PROFIT_TARGET':
        return this.checkProfitTarget(condition, positionId, currentPrice, pnlPercent);
      
      case 'STOP_LOSS':
        return this.checkStopLoss(condition, positionId, currentPrice, pnlPercent);
      
      case 'TRAILING_STOP':
        return this.checkTrailingStop(condition, positionId, currentPrice, pnl);
      
      case 'TIME_DECAY':
        return this.checkTimeDecay(condition, positionId, currentPrice);
      
      case 'EXPIRATION':
        return this.checkExpiration(condition, positionId, currentPrice);
      
      case 'BREAKEVEN_STOP':
        return this.checkBreakevenStop(condition, positionId, currentPrice, pnl);
      
      default:
        return null;
    }
  }

  private checkProfitTarget(
    condition: ExitCondition,
    positionId: string,
    currentPrice: number,
    pnlPercent: number
  ): ExitSignal | null {
    const targetPercent = condition.parameters.targetPercent;
    
    if (pnlPercent >= targetPercent) {
      return {
        positionId,
        reason: 'PROFIT_TARGET',
        exitPrice: currentPrice,
        confidence: 0.9,
        urgency: 'HIGH',
        message: `Profit target of ${targetPercent}% reached (current: ${pnlPercent.toFixed(1)}%)`
      };
    }
    
    return null;
  }

  private checkStopLoss(
    condition: ExitCondition,
    positionId: string,
    currentPrice: number,
    pnlPercent: number
  ): ExitSignal | null {
    const stopPercent = -Math.abs(condition.parameters.stopPercent); // Ensure negative
    
    if (pnlPercent <= stopPercent) {
      return {
        positionId,
        reason: 'STOP_LOSS',
        exitPrice: currentPrice,
        confidence: 0.95,
        urgency: 'CRITICAL',
        message: `Stop loss of ${Math.abs(stopPercent)}% hit (current: ${Math.abs(pnlPercent).toFixed(1)}% loss)`
      };
    }
    
    return null;
  }

  private checkTrailingStop(
    condition: ExitCondition,
    positionId: string,
    currentPrice: number,
    pnl: number
  ): ExitSignal | null {
    const trailingPercent = condition.parameters.trailingPercent / 100;
    const highWaterMark = this.positionHighWaterMarks.get(positionId) || currentPrice;
    
    // Update high water mark if current price is higher
    if (currentPrice > highWaterMark) {
      this.positionHighWaterMarks.set(positionId, currentPrice);
      return null; // No exit signal, just updating high water mark
    }
    
    // Check if price has dropped enough from high water mark
    const dropFromHigh = (highWaterMark - currentPrice) / highWaterMark;
    
    if (dropFromHigh >= trailingPercent && pnl > 0) { // Only trigger if position was profitable
      return {
        positionId,
        reason: 'STOP_LOSS', // Trailing stop is a type of stop loss
        exitPrice: currentPrice,
        confidence: 0.8,
        urgency: 'HIGH',
        message: `Trailing stop triggered: ${(dropFromHigh * 100).toFixed(1)}% drop from high of $${highWaterMark.toFixed(2)}`
      };
    }
    
    return null;
  }

  private checkTimeDecay(
    condition: ExitCondition,
    positionId: string,
    currentPrice: number
  ): ExitSignal | null {
    // This would need position data to calculate time decay
    // For now, return null - would be implemented with full position context
    return null;
  }

  private checkExpiration(
    condition: ExitCondition,
    positionId: string,
    currentPrice: number
  ): ExitSignal | null {
    // This would need position data to check expiration
    // For now, return null - would be implemented with full position context
    return null;
  }

  private checkBreakevenStop(
    condition: ExitCondition,
    positionId: string,
    currentPrice: number,
    pnl: number
  ): ExitSignal | null {
    // Enable breakeven stop once position becomes profitable
    if (pnl > 0 && !condition.enabled) {
      condition.enabled = true;
      console.log(`🚪 Breakeven stop enabled for position ${positionId}`);
    }
    
    // Check if position has moved back to breakeven after being profitable
    if (condition.enabled && pnl <= 0) {
      return {
        positionId,
        reason: 'STOP_LOSS',
        exitPrice: currentPrice,
        confidence: 0.7,
        urgency: 'MEDIUM',
        message: 'Breakeven stop triggered - protecting against loss after profit'
      };
    }
    
    return null;
  }

  private processExitSignal(signal: ExitSignal): void {
    console.log(`🚪 Exit signal generated: ${signal.message}`);
    
    // Emit risk alert
    this.eventBus.emitRiskAlert(
      signal.urgency,
      signal.message,
      signal.positionId
    );
    
    // If auto-exit is enabled and confidence is high enough, execute the exit
    if (this.config.enableAutoExit && signal.confidence >= 0.8) {
      this.eventBus.emit('exit:signal', {
        positionId: signal.positionId,
        reason: signal.reason
      });
      
      console.log(`🚪 Auto-exit triggered for position ${signal.positionId}: ${signal.reason}`);
    }
  }

  private checkPositionsForTicker(ticker: string, timestamp: number): void {
    // This would check all positions for a specific ticker
    // Implementation would require access to position data
    console.log(`🚪 Checking exit conditions for ${ticker} positions at ${new Date(timestamp)}`);
  }

  private performPeriodicChecks(): void {
    const now = new Date();
    
    // Check for positions approaching expiration
    for (const [positionId, conditions] of Array.from(this.exitConditions)) {
      const expirationCondition = conditions.find(c => c.type === 'EXPIRATION');
      if (expirationCondition) {
        // Would check expiration with actual position data
        console.log(`🚪 Periodic expiration check for position ${positionId}`);
      }
    }
    
    // Clean up conditions for closed positions
    this.cleanupClosedPositions();
  }

  private cleanupClosedPositions(): void {
    // This would be called when positions are closed to clean up tracking
    // Implementation would require position status checking
  }

  public updateExitCondition(
    positionId: string,
    conditionType: ExitCondition['type'],
    parameters: Record<string, any>
  ): void {
    const conditions = this.exitConditions.get(positionId);
    if (!conditions) return;
    
    const condition = conditions.find(c => c.type === conditionType);
    if (condition) {
      condition.parameters = { ...condition.parameters, ...parameters };
      console.log(`🚪 Updated ${conditionType} condition for position ${positionId}`);
    }
  }

  public enableExitCondition(positionId: string, conditionType: ExitCondition['type']): void {
    const conditions = this.exitConditions.get(positionId);
    if (!conditions) return;
    
    const condition = conditions.find(c => c.type === conditionType);
    if (condition) {
      condition.enabled = true;
      console.log(`🚪 Enabled ${conditionType} condition for position ${positionId}`);
    }
  }

  public disableExitCondition(positionId: string, conditionType: ExitCondition['type']): void {
    const conditions = this.exitConditions.get(positionId);
    if (!conditions) return;
    
    const condition = conditions.find(c => c.type === conditionType);
    if (condition) {
      condition.enabled = false;
      console.log(`🚪 Disabled ${conditionType} condition for position ${positionId}`);
    }
  }

  public getExitConditions(positionId: string): ExitCondition[] {
    return this.exitConditions.get(positionId) || [];
  }

  public updateConfig(newConfig: Partial<ExitConditionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🚪 Exit condition configuration updated');
  }

  public getStats(): {
    totalPositionsMonitored: number;
    activeConditions: number;
    exitSignalsGenerated: number;
    autoExitsExecuted: number;
  } {
    let totalConditions = 0;
    for (const conditions of Array.from(this.exitConditions.values())) {
      totalConditions += conditions.filter(c => c.enabled).length;
    }
    
    return {
      totalPositionsMonitored: this.exitConditions.size,
      activeConditions: totalConditions,
      exitSignalsGenerated: 0, // Would track this in production
      autoExitsExecuted: 0 // Would track this in production
    };
  }

  public shutdown(): void {
    this.stopMonitoring();
    this.exitConditions.clear();
    this.positionHighWaterMarks.clear();
    console.log('🚪 Exit condition manager shutdown complete');
  }
}