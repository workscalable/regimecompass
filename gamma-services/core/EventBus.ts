import { EventEmitter } from 'events';
import { TradeSignal, PaperPosition, TradeAnalysis, RiskAction } from '../models/PaperTradingTypes';

// Enhanced interfaces for multi-ticker support
export interface EventAggregator {
  eventType: string;
  aggregationWindow: number; // milliseconds
  maxBatchSize: number;
  pendingEvents: any[];
  lastFlush: number;
  flushCallback: (events: any[]) => void;
}

export interface PerformanceMetrics {
  eventCount: number;
  totalLatency: number;
  lastMetricsUpdate: number;
}

export interface TickerEventFilter {
  ticker: string;
  eventTypes: string[];
  condition?: (data: any) => boolean;
}

export interface EventRoutingRule {
  sourceEvent: string;
  targetEvent: string;
  condition?: (data: any) => boolean;
  transform?: (data: any) => any;
}

export interface EventBusEvents {
  // Signal events
  'signal:generated': TradeSignal;

  // Learning events
  'learning:calibration:updated': {
    calibrations: any[];
    timestamp: Date;
  };
  'learning:insights:generated': {
    insights: any[];
    timestamp: Date;
  };
  'insights:recommendations:generated': {
    recommendations: any[];
    timestamp: Date;
  };
  'insights:fibonacci:optimization': {
    optimization: any;
    zone: string;
    adjustment: number;
    timestamp: Date;
  };
  'insights:regime:adaptation': {
    regime: string;
    oldRegime: string;
    newRegime: string;
    confidence: number;
    timestamp: Date;
  };
  'analytics:metrics:updated': {
    metrics: any;
    timestamp: Date;
  };
  'analytics:performance:alert': {
    alerts: string[];
    severity: string;
    timestamp: Date;
  };
  
  // Trade execution events
  'trade:signal': TradeSignal;
  'trade:executed': { signalId: string; positionId: string };
  'paper:trade:executed': {
    order: any;
    position: PaperPosition;
    accountBalance: number;
  };

  // Position events
  'paper:position:update': {
    positionId: string;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
    timestamp: number;
  };
  'paper:position:closed': {
    position: PaperPosition;
    reason: string;
    finalPnL: number;
  };
  'paper:position:expired': {
    position: PaperPosition;
    intrinsicValue: number;
    finalPnL: number;
  };
  'paper:service:degraded': {
    service: string;
    level: string;
    description: string;
  };
  'paper:service:recovered': {
    service: string;
    level: string;
    description: string;
  };
  'paper:error': {
    errorCode: string;
    severity: string;
    category: string;
    correlationId: string;
  };
  'paper:circuit-breaker:opened': {
    service: string;
    failureCount: number;
    threshold: number;
  };
  'paper:alert:triggered': {
    alertId: string;
    type: string;
    severity: string;
  };

  // Account events
  'paper:account:update': {
    balance: number;
    totalPnL: number;
    timestamp: number;
  };

  // Analysis events
  'paper:trade:analyzed': TradeAnalysis;
  'algorithm:learning': {
    signalId: string;
    confidenceEffectiveness: number;
    adjustments: Record<string, number>;
    recommendations: any[];
  };

  // Market data events
  'market:data': {
    ticker: string;
    price: number;
    options: Record<string, number>;
    timestamp: number;
  };

  // Risk management events
  'risk:violation': RiskAction;
  'risk:alert': {
    severity: string;
    message: string;
    positionId?: string;
  };

  // Alert events
  'alert:created': {
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    data: any;
    timestamp: Date;
  };
  'alert:acknowledged': {
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    data: any;
    timestamp: Date;
    acknowledged: boolean;
  };

  // Performance events
  'performance:milestone': {
    milestone: string;
    value: number;
    previousValue?: number;
    timestamp: number;
  };

  // Regime events
  'regime:change': {
    oldRegime: string;
    newRegime: string;
    confidence: number;
    timestamp: number;
  };

  // Position events
  'position:update': {
    positionId: string;
    ticker: string;
    currentPrice: number;
    pnl: number;
    timestamp: number;
  };

  // System events
  'system:error': {
    error: Error;
    context: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  'system:health': {
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, boolean>;
    timestamp: number;
  };

  // Multi-ticker orchestrator events
  'module:update': {
    ticker: string;
    module: string;
    timestamp: number;
    data: any;
  };
  'ticker:transition': {
    ticker: string;
    from: string;
    to: string;
    timestamp: number;
  };
  'engine:confidence': {
    ticker: string;
    confidence: number;
    delta: number;
    timestamp: number;
  };

  // Exit signals
  'exit:signal': {
    positionId: string;
    reason: string;
  };

  // Enhanced multi-ticker events
  'multi-ticker:confidence:aggregate': {
    aggregateConfidence: number;
    topTickers: string[];
    marketConsensus: number;
    recommendedFocus: string;
    tickerCount: number;
    timestamp: number;
  };
  'multi-ticker:state:snapshot': {
    tickers: Array<{
      ticker: string;
      status: string;
      confidence: number;
      openPosition: boolean;
    }>;
    timestamp: number;
  };
  'multi-ticker:priority:update': {
    ticker: string;
    priority: number;
    reason: string;
    timestamp: number;
  };
  'multi-ticker:regime:change': {
    ticker: string;
    previousRegime: string;
    newRegime: string;
    confidence: number;
    timestamp: number;
  };

  // Ticker-specific events (dynamic)
  'ticker:signal': {
    ticker: string;
    signal: TradeSignal;
    timestamp: number;
  };
  'ticker:position:update': {
    ticker: string;
    positionId: string;
    currentPrice: number;
    pnl: number;
    timestamp: number;
  };
  'ticker:analysis:complete': {
    ticker: string;
    analysis: any;
    timestamp: number;
  };

  // Event aggregation
  'aggregate:confidence:batch': {
    updates: Array<{
      ticker: string;
      confidence: number;
      delta: number;
    }>;
    batchId: string;
    timestamp: number;
  };
  'aggregate:positions:summary': {
    totalPositions: number;
    openPositions: number;
    totalPnL: number;
    tickerBreakdown: Record<string, {
      positions: number;
      pnl: number;
    }>;
    timestamp: number;
  };

  // System-wide monitoring
  'system:performance:metrics': {
    eventThroughput: number;
    averageLatency: number;
    activeListeners: number;
    memoryUsage: number;
    timestamp: number;
  };
  'system:ticker:added': {
    ticker: string;
    timestamp: number;
  };
  'system:ticker:removed': {
    ticker: string;
    timestamp: number;
  };
}

export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private eventHistory: Array<{ event: string; data: any; timestamp: Date }> = [];
  private maxHistorySize = 1000;
  
  // Enhanced multi-ticker support
  private tickerEventRoutes: Map<string, Set<string>> = new Map(); // ticker -> event types
  private eventAggregators: Map<string, EventAggregator> = new Map();
  private performanceMetrics: PerformanceMetrics = {
    eventCount: 0,
    totalLatency: 0,
    lastMetricsUpdate: Date.now()
  };
  private tickerSubscriptions: Map<string, Set<Function>> = new Map();
  private eventBatching: {
    enabled: boolean;
    batchSize: number;
    batchTimeout: number;
    pendingEvents: Array<{ event: string; data: any; timestamp: number }>;
    batchTimer?: NodeJS.Timeout;
  } = {
    enabled: false,
    batchSize: 10,
    batchTimeout: 100,
    pendingEvents: []
  };

  private constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for multi-ticker support
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  // Type-safe event emission
  public emit<K extends keyof EventBusEvents>(event: K, data: EventBusEvents[K]): boolean {
    // Store event in history
    this.eventHistory.push({
      event: event as string,
      data,
      timestamp: new Date()
    });

    // Trim history if it gets too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }

    return super.emit(event as string, data);
  }

  // Type-safe event listening
  public on<K extends keyof EventBusEvents>(
    event: K,
    listener: (data: EventBusEvents[K]) => void
  ): this {
    return super.on(event as string, listener);
  }

  // Type-safe one-time event listening
  public once<K extends keyof EventBusEvents>(
    event: K,
    listener: (data: EventBusEvents[K]) => void
  ): this {
    return super.once(event as string, listener);
  }

  // Type-safe event removal
  public off<K extends keyof EventBusEvents>(
    event: K,
    listener: (data: EventBusEvents[K]) => void
  ): this {
    return super.off(event as string, listener);
  }

  // Multi-ticker specific event emitters
  public emitTickerUpdate(ticker: string, module: string, data: any): void {
    this.emit('module:update', {
      ticker,
      module,
      timestamp: Date.now(),
      data
    });
  }

  public emitTradeSignal(ticker: string, signal: TradeSignal): void {
    this.emit('trade:signal', signal);
  }

  public emitStateTransition(ticker: string, from: string, to: string): void {
    this.emit('ticker:transition', {
      ticker,
      from,
      to,
      timestamp: Date.now()
    });
  }

  public emitConfidenceUpdate(ticker: string, confidence: number, delta: number): void {
    this.emit('engine:confidence', {
      ticker,
      confidence,
      delta,
      timestamp: Date.now()
    });
  }

  // System health and monitoring
  public emitSystemError(error: Error, context: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'): void {
    this.emit('system:error', {
      error,
      context,
      severity
    });
  }

  public emitSystemHealth(status: 'healthy' | 'degraded' | 'unhealthy', components: Record<string, boolean>): void {
    this.emit('system:health', {
      status,
      components,
      timestamp: Date.now()
    });
  }

  public emitRiskAlert(severity: string, message: string, positionId?: string): void {
    this.emit('risk:alert', {
      severity,
      message,
      positionId
    });
  }

  // Event history and debugging
  public getEventHistory(eventType?: string, limit: number = 100): Array<{ event: string; data: any; timestamp: Date }> {
    let history = this.eventHistory;
    
    if (eventType) {
      history = history.filter(h => h.event === eventType);
    }

    return history.slice(-limit);
  }

  public getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const historyItem of this.eventHistory) {
      stats[historyItem.event] = (stats[historyItem.event] || 0) + 1;
    }

    return stats;
  }

  public clearEventHistory(): void {
    this.eventHistory = [];
  }

  // Listener management
  public getListenerCount(event?: string): number {
    if (event) {
      return this.listenerCount(event);
    }
    
    return this.eventNames().reduce((total, eventName) => {
      return total + this.listenerCount(eventName as string);
    }, 0);
  }

  public getActiveEvents(): string[] {
    return this.eventNames().map(name => name.toString());
  }

  // Batch event processing
  public emitBatch<K extends keyof EventBusEvents>(events: Array<{ event: K; data: EventBusEvents[K] }>): void {
    for (const { event, data } of events) {
      this.emit(event, data);
    }
  }

  // Event filtering and middleware
  private eventFilters: Array<(event: string, data: any) => boolean> = [];

  public addEventFilter(filter: (event: string, data: any) => boolean): void {
    this.eventFilters.push(filter);
  }

  public removeEventFilter(filter: (event: string, data: any) => boolean): void {
    const index = this.eventFilters.indexOf(filter);
    if (index > -1) {
      this.eventFilters.splice(index, 1);
    }
  }

  // Override emit to apply filters
  public emitWithFilters<K extends keyof EventBusEvents>(event: K, data: EventBusEvents[K]): boolean {
    // Apply filters
    for (const filter of this.eventFilters) {
      if (!filter(event as string, data)) {
        return false; // Event filtered out
      }
    }

    return super.emit(event as string, data);
  }

  // Async event handling
  public async emitAsync<K extends keyof EventBusEvents>(event: K, data: EventBusEvents[K]): Promise<void> {
    const listeners = this.listeners(event as string);
    
    await Promise.all(
      listeners.map(async (listener) => {
        try {
          await (listener as Function)(data);
        } catch (error) {
          this.emitSystemError(
            error as Error,
            `Async event handler for ${event as string}`,
            'MEDIUM'
          );
        }
      })
    );
  }

  // Event namespacing for multi-ticker
  public emitNamespaced<K extends keyof EventBusEvents>(
    namespace: string,
    event: K,
    data: EventBusEvents[K]
  ): boolean {
    const namespacedEvent = `${namespace}:${event as string}` as K;
    return this.emit(namespacedEvent, data);
  }

  public onNamespaced<K extends keyof EventBusEvents>(
    namespace: string,
    event: K,
    listener: (data: EventBusEvents[K]) => void
  ): this {
    const namespacedEvent = `${namespace}:${event as string}` as K;
    return this.on(namespacedEvent, listener);
  }

  // Cleanup and shutdown
  public shutdown(): void {
    this.removeAllListeners();
    this.clearEventHistory();
    this.eventFilters = [];
  }

  // Health check
  public healthCheck(): { healthy: boolean; stats: any } {
    const stats = {
      totalListeners: this.getListenerCount(),
      activeEvents: this.getActiveEvents().length,
      eventHistory: this.eventHistory.length,
      memoryUsage: process.memoryUsage()
    };

    const healthy = stats.totalListeners < 1000 && stats.eventHistory < this.maxHistorySize;

    return { healthy, stats };
  }

  // ============ ENHANCED MULTI-TICKER METHODS ============

  // Ticker-specific event routing
  public registerTickerEvents(ticker: string, eventTypes: string[]): void {
    if (!this.tickerEventRoutes.has(ticker)) {
      this.tickerEventRoutes.set(ticker, new Set());
    }
    
    const tickerEvents = this.tickerEventRoutes.get(ticker)!;
    eventTypes.forEach(eventType => tickerEvents.add(eventType));
    
    console.log(`📡 Registered ${eventTypes.length} event types for ticker ${ticker}`);
  }

  public unregisterTickerEvents(ticker: string, eventTypes?: string[]): void {
    const tickerEvents = this.tickerEventRoutes.get(ticker);
    if (!tickerEvents) return;

    if (eventTypes) {
      eventTypes.forEach(eventType => tickerEvents.delete(eventType));
    } else {
      this.tickerEventRoutes.delete(ticker);
    }
    
    console.log(`📡 Unregistered events for ticker ${ticker}`);
  }

  // Enhanced multi-ticker event emitters
  public emitTickerSignal(ticker: string, signal: TradeSignal): void {
    // Emit both generic and ticker-specific events
    this.emit('trade:signal', signal);
    this.emit('ticker:signal', { ticker, signal, timestamp: Date.now() });
    
    // Emit ticker-namespaced event
    this.emitNamespaced(ticker, 'trade:signal' as any, signal);
  }

  public emitMultiTickerConfidenceAggregate(data: {
    aggregateConfidence: number;
    topTickers: string[];
    marketConsensus: number;
    recommendedFocus: string;
    tickerCount: number;
  }): void {
    this.emit('multi-ticker:confidence:aggregate', {
      ...data,
      timestamp: Date.now()
    });
  }

  public emitMultiTickerStateSnapshot(tickers: Array<{
    ticker: string;
    status: string;
    confidence: number;
    openPosition: boolean;
  }>): void {
    this.emit('multi-ticker:state:snapshot', {
      tickers,
      timestamp: Date.now()
    });
  }

  public emitTickerPriorityUpdate(ticker: string, priority: number, reason: string): void {
    this.emit('multi-ticker:priority:update', {
      ticker,
      priority,
      reason,
      timestamp: Date.now()
    });
  }

  public emitTickerRegimeChange(ticker: string, previousRegime: string, newRegime: string, confidence: number): void {
    this.emit('multi-ticker:regime:change', {
      ticker,
      previousRegime,
      newRegime,
      confidence,
      timestamp: Date.now()
    });
  }

  // Ticker-specific subscription management
  public subscribeToTicker(ticker: string, callback: (event: string, data: any) => void): () => void {
    if (!this.tickerSubscriptions.has(ticker)) {
      this.tickerSubscriptions.set(ticker, new Set());
    }
    
    const subscriptions = this.tickerSubscriptions.get(ticker)!;
    subscriptions.add(callback);
    
    // Set up listener for ticker-namespaced events
    const listener = (data: any) => callback(`${ticker}:event`, data);
    this.onNamespaced(ticker, 'trade:signal' as any, listener);
    this.onNamespaced(ticker, 'position:update' as any, listener);
    
    // Return unsubscribe function
    return () => {
      subscriptions.delete(callback);
      if (subscriptions.size === 0) {
        this.tickerSubscriptions.delete(ticker);
      }
    };
  }

  // Event aggregation system
  public createEventAggregator(
    eventType: string,
    aggregationWindow: number,
    maxBatchSize: number,
    flushCallback: (events: any[]) => void
  ): void {
    const aggregator: EventAggregator = {
      eventType,
      aggregationWindow,
      maxBatchSize,
      pendingEvents: [],
      lastFlush: Date.now(),
      flushCallback
    };
    
    this.eventAggregators.set(eventType, aggregator);
    
    // Set up listener for the event type
    this.on(eventType as any, (data: any) => {
      this.addToAggregator(eventType, data);
    });
    
    console.log(`📡 Created event aggregator for ${eventType}`);
  }

  private addToAggregator(eventType: string, data: any): void {
    const aggregator = this.eventAggregators.get(eventType);
    if (!aggregator) return;
    
    aggregator.pendingEvents.push({
      ...data,
      aggregatedAt: Date.now()
    });
    
    // Check if we should flush
    const shouldFlushBySize = aggregator.pendingEvents.length >= aggregator.maxBatchSize;
    const shouldFlushByTime = Date.now() - aggregator.lastFlush >= aggregator.aggregationWindow;
    
    if (shouldFlushBySize || shouldFlushByTime) {
      this.flushAggregator(eventType);
    }
  }

  private flushAggregator(eventType: string): void {
    const aggregator = this.eventAggregators.get(eventType);
    if (!aggregator || aggregator.pendingEvents.length === 0) return;
    
    const events = [...aggregator.pendingEvents];
    aggregator.pendingEvents = [];
    aggregator.lastFlush = Date.now();
    
    try {
      aggregator.flushCallback(events);
    } catch (error) {
      this.emitSystemError(
        error as Error,
        `Event aggregator flush for ${eventType}`,
        'MEDIUM'
      );
    }
  }

  // Batch confidence updates for performance
  public emitConfidenceBatch(updates: Array<{
    ticker: string;
    confidence: number;
    delta: number;
  }>): void {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    this.emit('aggregate:confidence:batch', {
      updates,
      batchId,
      timestamp: Date.now()
    });
    
    // Also emit individual confidence updates for backward compatibility
    updates.forEach(update => {
      this.emitConfidenceUpdate(update.ticker, update.confidence, update.delta);
    });
  }

  // Position summary aggregation
  public emitPositionsSummary(summary: {
    totalPositions: number;
    openPositions: number;
    totalPnL: number;
    tickerBreakdown: Record<string, { positions: number; pnl: number }>;
  }): void {
    this.emit('aggregate:positions:summary', {
      ...summary,
      timestamp: Date.now()
    });
  }

  // Performance monitoring
  public emitPerformanceMetrics(): void {
    const now = Date.now();
    const timeDelta = now - this.performanceMetrics.lastMetricsUpdate;
    const eventThroughput = this.performanceMetrics.eventCount / (timeDelta / 1000);
    const averageLatency = this.performanceMetrics.eventCount > 0 ? 
      this.performanceMetrics.totalLatency / this.performanceMetrics.eventCount : 0;
    
    this.emit('system:performance:metrics', {
      eventThroughput,
      averageLatency,
      activeListeners: this.getListenerCount(),
      memoryUsage: process.memoryUsage().heapUsed,
      timestamp: now
    });
    
    // Reset metrics
    this.performanceMetrics = {
      eventCount: 0,
      totalLatency: 0,
      lastMetricsUpdate: now
    };
  }

  // Ticker lifecycle events
  public emitTickerAdded(ticker: string): void {
    this.emit('system:ticker:added', {
      ticker,
      timestamp: Date.now()
    });
  }

  public emitTickerRemoved(ticker: string): void {
    this.emit('system:ticker:removed', {
      ticker,
      timestamp: Date.now()
    });
    
    // Clean up ticker-specific data
    this.unregisterTickerEvents(ticker);
    this.tickerSubscriptions.delete(ticker);
  }

  // Event batching for high-frequency events
  public enableEventBatching(batchSize: number = 10, batchTimeout: number = 100): void {
    this.eventBatching.enabled = true;
    this.eventBatching.batchSize = batchSize;
    this.eventBatching.batchTimeout = batchTimeout;
    
    console.log(`📡 Event batching enabled: ${batchSize} events or ${batchTimeout}ms`);
  }

  public disableEventBatching(): void {
    this.eventBatching.enabled = false;
    this.flushEventBatch();
    
    if (this.eventBatching.batchTimer) {
      clearTimeout(this.eventBatching.batchTimer);
      this.eventBatching.batchTimer = undefined;
    }
    
    console.log('📡 Event batching disabled');
  }

  private addToBatch(event: string, data: any): boolean {
    if (!this.eventBatching.enabled) return false;
    
    this.eventBatching.pendingEvents.push({
      event,
      data,
      timestamp: Date.now()
    });
    
    // Check if we should flush
    if (this.eventBatching.pendingEvents.length >= this.eventBatching.batchSize) {
      this.flushEventBatch();
      return true;
    }
    
    // Set up timer if not already set
    if (!this.eventBatching.batchTimer) {
      this.eventBatching.batchTimer = setTimeout(() => {
        this.flushEventBatch();
      }, this.eventBatching.batchTimeout);
    }
    
    return true;
  }

  private flushEventBatch(): void {
    if (this.eventBatching.pendingEvents.length === 0) return;
    
    const events = [...this.eventBatching.pendingEvents];
    this.eventBatching.pendingEvents = [];
    
    if (this.eventBatching.batchTimer) {
      clearTimeout(this.eventBatching.batchTimer);
      this.eventBatching.batchTimer = undefined;
    }
    
    // Emit batched events
    for (const { event, data } of events) {
      super.emit(event, data);
    }
  }

  // Enhanced event filtering for multi-ticker
  public addTickerEventFilter(filter: TickerEventFilter): void {
    const filterFunction = (event: string, data: any) => {
      // Check if this event is for the specified ticker
      if (data.ticker && data.ticker === filter.ticker) {
        // Check if event type is in the filter
        if (filter.eventTypes.includes(event)) {
          // Apply custom condition if provided
          return filter.condition ? filter.condition(data) : true;
        }
      }
      return true; // Don't filter out non-ticker events
    };
    
    this.addEventFilter(filterFunction);
  }

  // Event routing rules
  private eventRoutingRules: EventRoutingRule[] = [];

  public addEventRoutingRule(rule: EventRoutingRule): void {
    this.eventRoutingRules.push(rule);
    
    // Set up listener for source event
    this.on(rule.sourceEvent as any, (data: any) => {
      if (!rule.condition || rule.condition(data)) {
        const transformedData = rule.transform ? rule.transform(data) : data;
        this.emit(rule.targetEvent as any, transformedData);
      }
    });
  }

  // Multi-ticker event statistics
  public getMultiTickerStats(): {
    registeredTickers: number;
    tickerEventRoutes: Record<string, string[]>;
    activeAggregators: number;
    eventBatchingEnabled: boolean;
    performanceMetrics: PerformanceMetrics & { eventThroughput: number };
  } {
    const now = Date.now();
    const timeDelta = now - this.performanceMetrics.lastMetricsUpdate;
    const eventThroughput = this.performanceMetrics.eventCount / Math.max(timeDelta / 1000, 1);
    
    return {
      registeredTickers: this.tickerEventRoutes.size,
      tickerEventRoutes: Object.fromEntries(
        Array.from(this.tickerEventRoutes.entries()).map(([ticker, events]) => [
          ticker,
          Array.from(events)
        ])
      ),
      activeAggregators: this.eventAggregators.size,
      eventBatchingEnabled: this.eventBatching.enabled,
      performanceMetrics: {
        ...this.performanceMetrics,
        eventThroughput
      }
    };
  }

  // Override emit to add performance tracking and batching
  public emitWithBatching<K extends keyof EventBusEvents>(event: K, data: EventBusEvents[K]): boolean {
    const startTime = performance.now();
    
    // Update performance metrics
    this.performanceMetrics.eventCount++;
    
    // Try batching first
    if (this.addToBatch(event as string, data)) {
      const endTime = performance.now();
      this.performanceMetrics.totalLatency += endTime - startTime;
      return true;
    }
    
    // Apply filters
    for (const filter of this.eventFilters) {
      if (!filter(event as string, data)) {
        return false;
      }
    }
    
    // Store event in history
    this.eventHistory.push({
      event: event as string,
      data,
      timestamp: new Date()
    });

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
    
    const result = super.emit(event as string, data);
    
    const endTime = performance.now();
    this.performanceMetrics.totalLatency += endTime - startTime;
    
    return result;
  }

  // Enhanced shutdown with multi-ticker cleanup
  public shutdownWithCleanup(): void {
    // Flush any pending batches
    this.flushEventBatch();
    
    // Flush all aggregators
    for (const eventType of Array.from(this.eventAggregators.keys())) {
      this.flushAggregator(eventType);
    }
    
    // Clear multi-ticker data
    this.tickerEventRoutes.clear();
    this.eventAggregators.clear();
    this.tickerSubscriptions.clear();
    this.eventRoutingRules = [];
    
    // Disable batching
    this.disableEventBatching();
    
    // Call parent shutdown
    this.removeAllListeners();
    this.clearEventHistory();
    this.eventFilters = [];
    
    console.log('📡 EventBus shutdown completed with multi-ticker cleanup');
  }
}