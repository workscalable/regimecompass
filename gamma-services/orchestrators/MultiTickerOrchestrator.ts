import { EventBus } from '../core/EventBus';
import { ReadySetGoController, ReadySetGoConfig } from './ReadySetGoController';
import { RegimeCompassAdapter } from '../integrations/RegimeCompassAdapter';
import { PaperTradingEngine } from '../paper/PaperTradingEngine';
import { FeedbackEngine } from '../learning/FeedbackEngine';
import { MarketDataManager } from '../data/MarketDataManager';

export interface MultiTickerConfig {
  watchlist: string[];
  maxConcurrentTrades: number;
  mode: 'PRIORITY' | 'ROUND_ROBIN' | 'EQUAL_WEIGHT';
  minConfidenceThreshold: number;
  minRRThreshold: number;
  confidenceDeltaThreshold: number;
  cooldownPeriod: number;
  enablePaperTrading: boolean;
  enableLiveTrading: boolean;
  healthCheckInterval: number;
}

export interface TickerPriority {
  ticker: string;
  priority: number;
  reason: string;
  lastUpdate: Date;
}

export interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  components: {
    eventBus: boolean;
    readySetGo: boolean;
    regimeCompass: boolean;
    paperTrading: boolean;
    marketData: boolean;
    feedback: boolean;
  };
  activeTickers: number;
  openPositions: number;
  lastHealthCheck: Date;
}

export class MultiTickerOrchestrator {
  private eventBus: EventBus;
  private readySetGoController: ReadySetGoController;
  private regimeCompassAdapter: RegimeCompassAdapter;
  private paperTradingEngine?: PaperTradingEngine;
  private feedbackEngine?: FeedbackEngine;
  private marketDataManager?: MarketDataManager;
  
  private config: MultiTickerConfig;
  private tickerPriorities: Map<string, TickerPriority> = new Map();
  private isRunning: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private lastHealthCheck: SystemHealth;

  constructor(
    eventBus: EventBus,
    config: MultiTickerConfig,
    paperTradingEngine?: PaperTradingEngine,
    feedbackEngine?: FeedbackEngine,
    marketDataManager?: MarketDataManager
  ) {
    this.eventBus = eventBus;
    this.config = config;
    this.paperTradingEngine = paperTradingEngine;
    this.feedbackEngine = feedbackEngine;
    this.marketDataManager = marketDataManager;

    // Initialize ReadySetGo controller
    const readySetGoConfig: ReadySetGoConfig = {
      minConfidenceThreshold: config.minConfidenceThreshold,
      minRRThreshold: config.minRRThreshold,
      confidenceDeltaThreshold: config.confidenceDeltaThreshold,
      cooldownPeriod: config.cooldownPeriod,
      maxConcurrentTrades: config.maxConcurrentTrades,
      enablePaperTrading: config.enablePaperTrading,
      enableLiveTrding: config.enableLiveTrading
    };

    this.readySetGoController = new ReadySetGoController(
      eventBus,
      readySetGoConfig,
      paperTradingEngine,
      feedbackEngine
    );

    // Initialize RegimeCompass adapter
    this.regimeCompassAdapter = new RegimeCompassAdapter(eventBus, this.readySetGoController);

    // Initialize health status
    this.lastHealthCheck = this.createEmptyHealthStatus();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for system events
    this.eventBus.on('system:error', (data) => {
      this.handleSystemError(data.error, data.context, data.severity);
    });

    // Listen for trade signals to manage priorities
    this.eventBus.on('trade:signal', (signal) => {
      this.updateTickerPriority(signal.ticker, signal.confidence, 'Trade signal generated');
    });

    // Listen for position updates
    this.eventBus.on('paper:position:closed', (data) => {
      this.handlePositionClosed(data.position.ticker);
    });

    // Listen for regime updates to adjust priorities
    this.eventBus.on('regime:update', (data) => {
      this.adjustPrioritiesForRegime(data.regime, data.confidence);
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('🎼 Multi-ticker orchestrator already running');
      return;
    }

    try {
      console.log('🎼 Starting multi-ticker orchestrator...');

      // Initialize tickers
      await this.initializeTickers();

      // Start market data if available
      if (this.marketDataManager) {
        await this.marketDataManager.startRealTimeUpdates();
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.isRunning = true;
      
      console.log(`🎼 Multi-ticker orchestrator started with ${this.config.watchlist.length} tickers`);
      
      // Emit startup event
      this.eventBus.emit('system:startup', {
        component: 'MultiTickerOrchestrator',
        tickers: this.config.watchlist,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Failed to start multi-ticker orchestrator:', error);
      this.eventBus.emitSystemError(
        error as Error,
        'Multi-ticker orchestrator startup',
        'CRITICAL'
      );
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isRunning) {
      console.log('🎼 Multi-ticker orchestrator not running');
      return;
    }

    console.log('🎼 Shutting down multi-ticker orchestrator...');

    try {
      // Stop health monitoring
      this.stopHealthMonitoring();

      // Stop market data
      if (this.marketDataManager) {
        this.marketDataManager.stopRealTimeUpdates();
      }

      // Shutdown ReadySetGo controller
      this.readySetGoController.shutdown();

      // Clear priorities
      this.tickerPriorities.clear();

      this.isRunning = false;
      
      console.log('🎼 Multi-ticker orchestrator shutdown complete');
      
      // Emit shutdown event
      this.eventBus.emit('system:shutdown', {
        component: 'MultiTickerOrchestrator',
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Error during shutdown:', error);
      this.eventBus.emitSystemError(
        error as Error,
        'Multi-ticker orchestrator shutdown',
        'HIGH'
      );
    }
  }

  private async initializeTickers(): Promise<void> {
    const currentRegime = this.regimeCompassAdapter.getCurrentRegime();
    
    for (const ticker of this.config.watchlist) {
      // Initialize ReadySetGo state for each ticker
      this.readySetGoController.initializeTicker(ticker, currentRegime?.regime || 'NEUTRAL');
      
      // Set initial priority
      this.updateTickerPriority(ticker, 0.5, 'Initial setup');
      
      console.log(`🎼 Initialized ticker: ${ticker}`);
    }
  }

  private updateTickerPriority(ticker: string, confidence: number, reason: string): void {
    const priority = this.calculatePriority(ticker, confidence);
    
    this.tickerPriorities.set(ticker, {
      ticker,
      priority,
      reason,
      lastUpdate: new Date()
    });
  }

  private calculatePriority(ticker: string, confidence: number): number {
    let priority = confidence; // Base priority on confidence
    
    // Adjust based on regime
    const regimeStats = this.regimeCompassAdapter.getStats();
    if (regimeStats.currentRegime) {
      switch (regimeStats.currentRegime) {
        case 'BULL':
          // Prioritize growth/tech tickers in bull markets
          if (['QQQ', 'NVDA', 'MSFT', 'AAPL'].includes(ticker)) {
            priority += 0.1;
          }
          break;
        case 'BEAR':
          // Prioritize defensive/hedge tickers in bear markets
          if (['SPY', 'VIX', 'TLT'].includes(ticker)) {
            priority += 0.1;
          }
          break;
      }
    }

    // Adjust based on current positions
    const tickerState = this.readySetGoController.getTickerState(ticker);
    if (tickerState?.openPosition) {
      priority -= 0.2; // Lower priority for tickers with open positions
    }

    return Math.max(0, Math.min(1, priority));
  }

  private adjustPrioritiesForRegime(regime: string, confidence: number): void {
    for (const ticker of this.config.watchlist) {
      this.updateTickerPriority(ticker, confidence, `Regime change to ${regime}`);
    }
  }

  private handlePositionClosed(ticker: string): void {
    // Increase priority for ticker after position closes
    this.updateTickerPriority(ticker, 0.6, 'Position closed - available for new trades');
  }

  private handleSystemError(error: Error, context: string, severity: string): void {
    console.error(`🎼 System error [${severity}] in ${context}:`, error.message);
    
    if (severity === 'CRITICAL') {
      // Consider emergency shutdown for critical errors
      console.warn('🎼 Critical error detected - consider emergency procedures');
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Perform initial health check
    this.performHealthCheck();
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const health: SystemHealth = {
        overall: 'HEALTHY',
        components: {
          eventBus: this.checkEventBusHealth(),
          readySetGo: this.checkReadySetGoHealth(),
          regimeCompass: this.checkRegimeCompassHealth(),
          paperTrading: await this.checkPaperTradingHealth(),
          marketData: await this.checkMarketDataHealth(),
          feedback: this.checkFeedbackHealth()
        },
        activeTickers: this.config.watchlist.length,
        openPositions: this.getOpenPositionsCount(),
        lastHealthCheck: new Date()
      };

      // Determine overall health
      const unhealthyComponents = Object.values(health.components).filter(h => !h).length;
      if (unhealthyComponents > 2) {
        health.overall = 'UNHEALTHY';
      } else if (unhealthyComponents > 0) {
        health.overall = 'DEGRADED';
      }

      this.lastHealthCheck = health;

      // Emit health status
      this.eventBus.emitSystemHealth(health.overall, health.components);

      // Log health issues
      if (health.overall !== 'HEALTHY') {
        const issues = Object.entries(health.components)
          .filter(([_, healthy]) => !healthy)
          .map(([component]) => component);
        
        console.warn(`🎼 System health: ${health.overall} (issues: ${issues.join(', ')})`);
      }

    } catch (error) {
      console.error('Health check failed:', error);
      this.eventBus.emitSystemError(
        error as Error,
        'Health check execution',
        'MEDIUM'
      );
    }
  }

  private checkEventBusHealth(): boolean {
    try {
      const busHealth = this.eventBus.healthCheck();
      return busHealth.healthy;
    } catch {
      return false;
    }
  }

  private checkReadySetGoHealth(): boolean {
    try {
      const stats = this.readySetGoController.getStats();
      return stats.totalTickers > 0;
    } catch {
      return false;
    }
  }

  private checkRegimeCompassHealth(): boolean {
    try {
      const stats = this.regimeCompassAdapter.getStats();
      return !stats.isStale;
    } catch {
      return false;
    }
  }

  private async checkPaperTradingHealth(): Promise<boolean> {
    if (!this.paperTradingEngine) return true; // Not required
    
    try {
      const health = await this.paperTradingEngine.healthCheck();
      return health.healthy;
    } catch {
      return false;
    }
  }

  private async checkMarketDataHealth(): Promise<boolean> {
    if (!this.marketDataManager) return true; // Not required
    
    try {
      const health = await this.marketDataManager.healthCheck();
      return health.healthy;
    } catch {
      return false;
    }
  }

  private checkFeedbackHealth(): boolean {
    if (!this.feedbackEngine) return true; // Not required
    
    try {
      // Simple check - feedback engine should have some learning data
      return true; // Placeholder
    } catch {
      return false;
    }
  }

  private getOpenPositionsCount(): number {
    const states = this.readySetGoController.getStateSnapshot();
    return states.filter(s => s.openPosition).length;
  }

  private createEmptyHealthStatus(): SystemHealth {
    return {
      overall: 'UNHEALTHY',
      components: {
        eventBus: false,
        readySetGo: false,
        regimeCompass: false,
        paperTrading: false,
        marketData: false,
        feedback: false
      },
      activeTickers: 0,
      openPositions: 0,
      lastHealthCheck: new Date()
    };
  }

  public getStatus(): {
    isRunning: boolean;
    config: MultiTickerConfig;
    health: SystemHealth;
    tickers: Array<{
      ticker: string;
      status: string;
      confidence: number;
      priority: number;
      openPosition: boolean;
    }>;
    stats: {
      totalSignals: number;
      activePositions: number;
      avgConfidence: number;
    };
  } {
    const states = this.readySetGoController.getStateSnapshot();
    const readySetGoStats = this.readySetGoController.getStats();
    
    const tickers = states.map(state => {
      const priority = this.tickerPriorities.get(state.ticker);
      return {
        ticker: state.ticker,
        status: state.status,
        confidence: state.confidence,
        priority: priority?.priority || 0,
        openPosition: state.openPosition
      };
    });

    return {
      isRunning: this.isRunning,
      config: this.config,
      health: this.lastHealthCheck,
      tickers,
      stats: {
        totalSignals: readySetGoStats.activeSignals,
        activePositions: readySetGoStats.openPositions,
        avgConfidence: readySetGoStats.avgConfidence
      }
    };
  }

  public updateConfig(newConfig: Partial<MultiTickerConfig>): void {
    const oldWatchlist = [...this.config.watchlist];
    this.config = { ...this.config, ...newConfig };

    // Handle watchlist changes
    if (newConfig.watchlist && JSON.stringify(oldWatchlist) !== JSON.stringify(newConfig.watchlist)) {
      this.handleWatchlistChange(oldWatchlist, newConfig.watchlist);
    }

    // Update ReadySetGo config
    if (newConfig.minConfidenceThreshold || newConfig.minRRThreshold || 
        newConfig.confidenceDeltaThreshold || newConfig.cooldownPeriod ||
        newConfig.maxConcurrentTrades) {
      
      const readySetGoConfig: Partial<ReadySetGoConfig> = {
        minConfidenceThreshold: newConfig.minConfidenceThreshold,
        minRRThreshold: newConfig.minRRThreshold,
        confidenceDeltaThreshold: newConfig.confidenceDeltaThreshold,
        cooldownPeriod: newConfig.cooldownPeriod,
        maxConcurrentTrades: newConfig.maxConcurrentTrades
      };

      this.readySetGoController.updateConfig(readySetGoConfig);
    }

    console.log('🎼 Multi-ticker orchestrator configuration updated');
  }

  private handleWatchlistChange(oldWatchlist: string[], newWatchlist: string[]): void {
    // Remove tickers no longer in watchlist
    const removedTickers = oldWatchlist.filter(ticker => !newWatchlist.includes(ticker));
    for (const ticker of removedTickers) {
      this.tickerPriorities.delete(ticker);
      console.log(`🎼 Removed ticker from watchlist: ${ticker}`);
    }

    // Add new tickers
    const addedTickers = newWatchlist.filter(ticker => !oldWatchlist.includes(ticker));
    for (const ticker of addedTickers) {
      const currentRegime = this.regimeCompassAdapter.getCurrentRegime();
      this.readySetGoController.initializeTicker(ticker, currentRegime?.regime || 'NEUTRAL');
      this.updateTickerPriority(ticker, 0.5, 'Added to watchlist');
      console.log(`🎼 Added ticker to watchlist: ${ticker}`);
    }
  }

  public getPrioritizedTickers(): TickerPriority[] {
    return Array.from(this.tickerPriorities.values())
      .sort((a, b) => b.priority - a.priority);
  }

  public forceTickerPriority(ticker: string, priority: number, reason: string): void {
    if (this.config.watchlist.includes(ticker)) {
      this.tickerPriorities.set(ticker, {
        ticker,
        priority: Math.max(0, Math.min(1, priority)),
        reason,
        lastUpdate: new Date()
      });
      console.log(`🎼 Forced priority for ${ticker}: ${priority} (${reason})`);
    }
  }

  public emergencyShutdown(): void {
    console.warn('🎼 EMERGENCY SHUTDOWN INITIATED');
    
    try {
      // Stop all trading immediately
      this.readySetGoController.shutdown();
      
      // Stop market data
      if (this.marketDataManager) {
        this.marketDataManager.stopRealTimeUpdates();
      }
      
      // Close all positions if paper trading
      if (this.paperTradingEngine) {
        this.paperTradingEngine.forceCloseAllPositions('RISK_MANAGEMENT');
      }
      
      this.isRunning = false;
      
      this.eventBus.emit('system:emergency:shutdown', {
        component: 'MultiTickerOrchestrator',
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Error during emergency shutdown:', error);
    }
  }
}