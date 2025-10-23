import { EventBus } from './EventBus';
import { TradeSignal } from '../models/PaperTradingTypes';

export interface TickerEventSubscription {
  ticker: string;
  eventTypes: string[];
  callback: (event: string, data: any) => void;
  unsubscribe: () => void;
}

export interface EventAggregationConfig {
  eventType: string;
  windowMs: number;
  maxBatchSize: number;
  aggregationStrategy: 'BATCH' | 'MERGE' | 'SUMMARIZE';
}

export interface MultiTickerEventStats {
  totalEvents: number;
  eventsPerTicker: Record<string, number>;
  eventTypeCounts: Record<string, number>;
  averageLatency: number;
  peakThroughput: number;
  lastUpdate: Date;
}

export class MultiTickerEventManager {
  private eventBus: EventBus;
  private activeSubscriptions: Map<string, TickerEventSubscription> = new Map();
  private tickerStats: Map<string, { eventCount: number; lastSeen: Date }> = new Map();
  private eventTypeStats: Map<string, number> = new Map();
  private performanceHistory: Array<{ timestamp: Date; throughput: number; latency: number }> = [];
  private maxHistorySize = 1000;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupSystemEventListeners();
  }

  private setupSystemEventListeners(): void {
    // Listen for ticker lifecycle events
    this.eventBus.on('system:ticker:added', (data) => {
      this.handleTickerAdded(data.ticker);
    });

    this.eventBus.on('system:ticker:removed', (data) => {
      this.handleTickerRemoved(data.ticker);
    });

    // Listen for performance metrics
    this.eventBus.on('system:performance:metrics', (data) => {
      this.updatePerformanceHistory(data);
    });

    // Set up event counting for all events
    this.setupEventCounting();
  }

  private setupEventCounting(): void {
    const originalEmit = this.eventBus.emit.bind(this.eventBus);
    
    // Intercept all events for statistics
    (this.eventBus as any).emit = (event: string, data: any) => {
      this.updateEventStats(event, data);
      return originalEmit(event, data);
    };
  }

  private updateEventStats(event: string, data: any): void {
    // Update event type stats
    this.eventTypeStats.set(event, (this.eventTypeStats.get(event) || 0) + 1);

    // Update ticker stats if event has ticker data
    if (data && data.ticker) {
      const tickerStat = this.tickerStats.get(data.ticker) || { eventCount: 0, lastSeen: new Date() };
      tickerStat.eventCount++;
      tickerStat.lastSeen = new Date();
      this.tickerStats.set(data.ticker, tickerStat);
    }
  }

  private updatePerformanceHistory(metrics: any): void {
    this.performanceHistory.push({
      timestamp: new Date(),
      throughput: metrics.eventThroughput,
      latency: metrics.averageLatency
    });

    // Trim history
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }
  }

  // Ticker management
  public registerTicker(ticker: string, eventTypes: string[] = []): void {
    // Register with EventBus
    this.eventBus.registerTickerEvents(ticker, eventTypes);
    
    // Initialize stats
    if (!this.tickerStats.has(ticker)) {
      this.tickerStats.set(ticker, { eventCount: 0, lastSeen: new Date() });
    }

    // Emit ticker added event
    this.eventBus.emitTickerAdded(ticker);

    console.log(`📡 Registered ticker ${ticker} with ${eventTypes.length} event types`);
  }

  public unregisterTicker(ticker: string): void {
    // Unregister from EventBus
    this.eventBus.unregisterTickerEvents(ticker);
    
    // Clean up subscriptions
    const subscriptionsToRemove = Array.from(this.activeSubscriptions.values())
      .filter(sub => sub.ticker === ticker);
    
    subscriptionsToRemove.forEach(sub => {
      sub.unsubscribe();
      this.activeSubscriptions.delete(sub.ticker);
    });

    // Clean up stats
    this.tickerStats.delete(ticker);

    // Emit ticker removed event
    this.eventBus.emitTickerRemoved(ticker);

    console.log(`📡 Unregistered ticker ${ticker}`);
  }

  private handleTickerAdded(ticker: string): void {
    console.log(`📡 Ticker ${ticker} added to system`);
  }

  private handleTickerRemoved(ticker: string): void {
    console.log(`📡 Ticker ${ticker} removed from system`);
  }

  // Subscription management
  public subscribeToTicker(
    ticker: string, 
    eventTypes: string[], 
    callback: (event: string, data: any) => void
  ): string {
    const subscriptionId = `${ticker}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Create EventBus subscription
    const unsubscribe = this.eventBus.subscribeToTicker(ticker, callback);
    
    const subscription: TickerEventSubscription = {
      ticker,
      eventTypes,
      callback,
      unsubscribe
    };
    
    this.activeSubscriptions.set(subscriptionId, subscription);
    
    console.log(`📡 Created subscription ${subscriptionId} for ticker ${ticker}`);
    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): void {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribe();
      this.activeSubscriptions.delete(subscriptionId);
      console.log(`📡 Removed subscription ${subscriptionId}`);
    }
  }

  // Multi-ticker event emission helpers
  public emitMultiTickerSignals(signals: Array<{ ticker: string; signal: TradeSignal }>): void {
    signals.forEach(({ ticker, signal }) => {
      this.eventBus.emitTickerSignal(ticker, signal);
    });
  }

  public emitBatchConfidenceUpdates(updates: Array<{
    ticker: string;
    confidence: number;
    delta: number;
  }>): void {
    this.eventBus.emitConfidenceBatch(updates);
  }

  public emitTickerStateSnapshot(tickers: string[]): void {
    // This would typically get state from ReadySetGo Controller
    const tickerStates = tickers.map(ticker => ({
      ticker,
      status: 'READY', // Placeholder
      confidence: 0.5,  // Placeholder
      openPosition: false // Placeholder
    }));

    this.eventBus.emitMultiTickerStateSnapshot(tickerStates);
  }

  // Event aggregation setup
  public setupConfidenceAggregation(windowMs: number = 1000, maxBatchSize: number = 10): void {
    this.eventBus.createEventAggregator(
      'engine:confidence',
      windowMs,
      maxBatchSize,
      (events) => {
        // Aggregate confidence events
        const aggregatedUpdates = events.map(event => ({
          ticker: event.ticker,
          confidence: event.confidence,
          delta: event.delta
        }));

        this.eventBus.emitConfidenceBatch(aggregatedUpdates);
      }
    );

    console.log(`📡 Set up confidence aggregation: ${windowMs}ms window, ${maxBatchSize} max batch`);
  }

  public setupPositionAggregation(windowMs: number = 5000, maxBatchSize: number = 20): void {
    this.eventBus.createEventAggregator(
      'paper:position:update',
      windowMs,
      maxBatchSize,
      (events) => {
        // Aggregate position updates by ticker
        const tickerBreakdown: Record<string, { positions: number; pnl: number }> = {};
        let totalPnL = 0;
        let totalPositions = 0;
        let openPositions = 0;

        events.forEach(event => {
          const ticker = event.ticker || 'UNKNOWN';
          if (!tickerBreakdown[ticker]) {
            tickerBreakdown[ticker] = { positions: 0, pnl: 0 };
          }
          
          tickerBreakdown[ticker].positions++;
          tickerBreakdown[ticker].pnl += event.pnl || 0;
          totalPnL += event.pnl || 0;
          totalPositions++;
          
          // Assume position is open if PnL is being tracked
          openPositions++;
        });

        this.eventBus.emitPositionsSummary({
          totalPositions,
          openPositions,
          totalPnL,
          tickerBreakdown
        });
      }
    );

    console.log(`📡 Set up position aggregation: ${windowMs}ms window, ${maxBatchSize} max batch`);
  }

  // Event routing setup
  public setupTickerEventRouting(): void {
    // Route ticker-specific confidence updates to multi-ticker aggregate
    this.eventBus.addEventRoutingRule({
      sourceEvent: 'engine:confidence',
      targetEvent: 'ticker:confidence:update',
      condition: (data) => !!data.ticker,
      transform: (data) => ({
        ticker: data.ticker,
        confidence: data.confidence,
        delta: data.delta,
        timestamp: Date.now()
      })
    });

    // Route position updates to ticker-specific events
    this.eventBus.addEventRoutingRule({
      sourceEvent: 'paper:position:update',
      targetEvent: 'ticker:position:update',
      condition: (data) => !!data.ticker,
      transform: (data) => ({
        ticker: data.ticker,
        positionId: data.positionId,
        currentPrice: data.currentPrice,
        pnl: data.pnl,
        timestamp: Date.now()
      })
    });

    console.log('📡 Set up ticker event routing rules');
  }

  // Performance monitoring
  public enablePerformanceMonitoring(intervalMs: number = 10000): void {
    setInterval(() => {
      this.eventBus.emitPerformanceMetrics();
    }, intervalMs);

    console.log(`📡 Performance monitoring enabled: ${intervalMs}ms interval`);
  }

  // Statistics and monitoring
  public getMultiTickerStats(): MultiTickerEventStats {
    const totalEvents = Array.from(this.eventTypeStats.values()).reduce((sum, count) => sum + count, 0);
    const eventsPerTicker: Record<string, number> = {};
    
    for (const [ticker, stats] of this.tickerStats) {
      eventsPerTicker[ticker] = stats.eventCount;
    }

    const eventTypeCounts = Object.fromEntries(this.eventTypeStats);
    
    // Calculate average latency from recent performance history
    const recentHistory = this.performanceHistory.slice(-10);
    const averageLatency = recentHistory.length > 0 ? 
      recentHistory.reduce((sum, h) => sum + h.latency, 0) / recentHistory.length : 0;

    // Calculate peak throughput
    const peakThroughput = this.performanceHistory.length > 0 ? 
      Math.max(...this.performanceHistory.map(h => h.throughput)) : 0;

    return {
      totalEvents,
      eventsPerTicker,
      eventTypeCounts,
      averageLatency,
      peakThroughput,
      lastUpdate: new Date()
    };
  }

  public getTickerActivity(ticker: string): {
    eventCount: number;
    lastSeen: Date;
    isActive: boolean;
  } | null {
    const stats = this.tickerStats.get(ticker);
    if (!stats) return null;

    const isActive = Date.now() - stats.lastSeen.getTime() < 60000; // Active if seen in last minute

    return {
      eventCount: stats.eventCount,
      lastSeen: stats.lastSeen,
      isActive
    };
  }

  public getActiveSubscriptions(): Array<{
    id: string;
    ticker: string;
    eventTypes: string[];
  }> {
    return Array.from(this.activeSubscriptions.entries()).map(([id, sub]) => ({
      id,
      ticker: sub.ticker,
      eventTypes: sub.eventTypes
    }));
  }

  // Batch operations
  public enableBatchProcessing(batchSize: number = 10, timeoutMs: number = 100): void {
    this.eventBus.enableEventBatching(batchSize, timeoutMs);
    console.log(`📡 Batch processing enabled: ${batchSize} events or ${timeoutMs}ms`);
  }

  public disableBatchProcessing(): void {
    this.eventBus.disableEventBatching();
    console.log('📡 Batch processing disabled');
  }

  // Ticker filtering
  public addTickerFilter(ticker: string, eventTypes: string[], condition?: (data: any) => boolean): void {
    this.eventBus.addTickerEventFilter({
      ticker,
      eventTypes,
      condition
    });

    console.log(`📡 Added event filter for ticker ${ticker}`);
  }

  // Cleanup and shutdown
  public shutdown(): void {
    // Unsubscribe all active subscriptions
    for (const subscription of this.activeSubscriptions.values()) {
      subscription.unsubscribe();
    }
    this.activeSubscriptions.clear();

    // Clear stats
    this.tickerStats.clear();
    this.eventTypeStats.clear();
    this.performanceHistory = [];

    console.log('📡 MultiTickerEventManager shutdown completed');
  }

  // Utility methods
  public getRegisteredTickers(): string[] {
    return Array.from(this.tickerStats.keys());
  }

  public isTickerRegistered(ticker: string): boolean {
    return this.tickerStats.has(ticker);
  }

  public getEventTypeStats(): Record<string, number> {
    return Object.fromEntries(this.eventTypeStats);
  }

  public resetStats(): void {
    this.tickerStats.clear();
    this.eventTypeStats.clear();
    this.performanceHistory = [];
    console.log('📡 Event statistics reset');
  }
}