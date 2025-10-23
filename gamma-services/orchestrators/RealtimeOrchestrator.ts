import { MultiTickerOrchestrator } from './MultiTickerOrchestrator';
import { PaperTradingEngine } from '../paper/PaperTradingEngine';
import { FeedbackEngine } from '../learning/FeedbackEngine';
import { EventBus } from '../core/EventBus';
import { DatabaseManager } from '../database/DatabaseManager';

export interface RealtimeOrchestratorConfig {
  multiTickerEnabled: boolean;
  singleTickerMode: boolean;
  currentTicker: string;
  paperTradingEnabled: boolean;
  liveTradingEnabled: boolean;
  watchlist: string[];
  maxConcurrentTrades: number;
  confidenceThreshold: number;
  // Enhanced multi-ticker settings
  multiTickerMode: 'PRIORITY' | 'ROUND_ROBIN' | 'EQUAL_WEIGHT';
  minRRThreshold: number;
  confidenceDeltaThreshold: number;
  cooldownPeriod: number;
  enableRegimeFiltering: boolean;
  enableLearning: boolean;
  healthCheckInterval: number;
  autoSwitchThreshold: number; // Confidence threshold for auto-switching modes
  // Performance monitoring
  performanceTrackingEnabled: boolean;
  performanceReviewInterval: number; // minutes
  // Risk management
  emergencyShutdownEnabled: boolean;
  maxDrawdownThreshold: number;
  maxConsecutiveLosses: number;
}

export class RealtimeOrchestrator {
  private eventBus: EventBus;
  private multiTickerOrchestrator?: MultiTickerOrchestrator;
  private paperEngine: PaperTradingEngine;
  private feedbackEngine: FeedbackEngine;
  private databaseManager: DatabaseManager;
  private config: RealtimeOrchestratorConfig;
  private singleTickerMode: boolean = false;
  private currentTicker: string = 'SPX';
  
  // Enhanced state management
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  private transitionInProgress: boolean = false;
  private performanceMonitorInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  
  // Performance tracking
  private performanceMetrics: {
    totalTrades: number;
    winningTrades: number;
    totalPnL: number;
    consecutiveLosses: number;
    lastPerformanceReview: Date;
    modePerformance: {
      singleTicker: { trades: number; pnl: number; winRate: number };
      multiTicker: { trades: number; pnl: number; winRate: number };
    };
  } = {
    totalTrades: 0,
    winningTrades: 0,
    totalPnL: 0,
    consecutiveLosses: 0,
    lastPerformanceReview: new Date(),
    modePerformance: {
      singleTicker: { trades: 0, pnl: 0, winRate: 0 },
      multiTicker: { trades: 0, pnl: 0, winRate: 0 }
    }
  };

  constructor(
    eventBus: EventBus,
    databaseManager: DatabaseManager,
    config: RealtimeOrchestratorConfig
  ) {
    this.eventBus = eventBus;
    this.databaseManager = databaseManager;
    this.config = this.validateAndEnhanceConfig(config);
    this.currentTicker = this.config.currentTicker;
    this.singleTickerMode = this.config.singleTickerMode;

    // Initialize core components
    this.paperEngine = new PaperTradingEngine(
      eventBus,
      // OptionsChainService would be injected here
      {} as any, // Placeholder
      {} as any, // PositionManager placeholder
      {} as any, // RiskManager placeholder
      databaseManager
    );

    this.feedbackEngine = new FeedbackEngine(eventBus, databaseManager);

    this.setupEventListeners();
  }

  private validateAndEnhanceConfig(config: RealtimeOrchestratorConfig): RealtimeOrchestratorConfig {
    // Set defaults for new properties
    const enhancedConfig = {
      ...config,
      multiTickerMode: config.multiTickerMode || 'PRIORITY',
      minRRThreshold: config.minRRThreshold || 2.0,
      confidenceDeltaThreshold: config.confidenceDeltaThreshold || 0.04,
      cooldownPeriod: config.cooldownPeriod || 30000,
      enableRegimeFiltering: config.enableRegimeFiltering !== false,
      enableLearning: config.enableLearning !== false,
      healthCheckInterval: config.healthCheckInterval || 60000,
      autoSwitchThreshold: config.autoSwitchThreshold || 0.75,
      performanceTrackingEnabled: config.performanceTrackingEnabled !== false,
      performanceReviewInterval: config.performanceReviewInterval || 60,
      emergencyShutdownEnabled: config.emergencyShutdownEnabled !== false,
      maxDrawdownThreshold: config.maxDrawdownThreshold || 0.15,
      maxConsecutiveLosses: config.maxConsecutiveLosses || 5
    };

    // Validate watchlist
    if (!enhancedConfig.watchlist || enhancedConfig.watchlist.length === 0) {
      enhancedConfig.watchlist = ['SPY', 'QQQ', 'IWM'];
      console.warn('🎛️ Empty watchlist detected, using default: SPY, QQQ, IWM');
    }

    return enhancedConfig;
  }

  private setupEventListeners(): void {
    // Listen for configuration changes
    this.eventBus.on('orchestrator:config:update', (newConfig) => {
      this.updateConfiguration(newConfig);
    });

    // Listen for mode switching requests
    this.eventBus.on('orchestrator:switch:mode', (data) => {
      if (data.mode === 'multi-ticker') {
        this.switchToMultiTicker();
      } else if (data.mode === 'single-ticker') {
        this.switchToSingleTicker(data.ticker || this.currentTicker);
      }
    });

    // Listen for system health requests
    this.eventBus.on('orchestrator:health:request', () => {
      this.emitHealthStatus();
    });

    // Enhanced event listeners for performance tracking
    this.eventBus.on('paper:position:closed', (data) => {
      this.trackTradePerformance(data.position);
    });

    // Listen for emergency situations
    this.eventBus.on('risk:emergency', (data) => {
      if (this.config.emergencyShutdownEnabled) {
        this.handleEmergencyShutdown(data);
      }
    });

    // Listen for performance milestones
    this.eventBus.on('performance:milestone', (data) => {
      this.handlePerformanceMilestone(data);
    });

    // Listen for confidence updates for auto-switching
    this.eventBus.on('confidence:aggregate', (data) => {
      this.evaluateAutoSwitch(data);
    });

    // Listen for system errors
    this.eventBus.on('system:error', (data) => {
      this.handleSystemError(data);
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🎛️ Initializing Realtime Orchestrator...');

    try {
      // Initialize core components
      await this.paperEngine.initialize();
      await this.feedbackEngine.initialize();

      // Initialize integrations
      this.initializeIntegrations();

      this.isInitialized = true;
      console.log('🎛️ Realtime Orchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Realtime Orchestrator:', error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isRunning) {
      console.log('🎛️ Realtime Orchestrator already running');
      return;
    }

    console.log('🎛️ Starting Realtime Orchestrator...');

    try {
      if (this.config.multiTickerEnabled && !this.singleTickerMode) {
        await this.startMultiTicker();
      } else {
        await this.startSingleTicker(this.currentTicker);
      }

      // Start monitoring
      this.startPerformanceMonitoring();
      this.startHealthMonitoring();

      this.isRunning = true;

      // Emit startup event
      this.eventBus.emit('orchestrator:started', {
        mode: this.singleTickerMode ? 'single-ticker' : 'multi-ticker',
        ticker: this.singleTickerMode ? this.currentTicker : undefined,
        watchlist: this.singleTickerMode ? undefined : this.config.watchlist,
        timestamp: new Date()
      });

      console.log(`🎛️ Realtime Orchestrator started in ${this.singleTickerMode ? 'single-ticker' : 'multi-ticker'} mode`);
    } catch (error) {
      console.error('Failed to start Realtime Orchestrator:', error);
      this.isRunning = false;
      throw error;
    }
  }

  private async startMultiTicker(): Promise<void> {
    if (this.transitionInProgress) {
      console.log('🎛️ Transition already in progress, waiting...');
      return;
    }

    this.transitionInProgress = true;

    try {
      if (this.multiTickerOrchestrator) {
        await this.multiTickerOrchestrator.shutdown();
      }

      const multiTickerConfig = {
        watchlist: this.config.watchlist,
        maxConcurrentTrades: this.config.maxConcurrentTrades,
        mode: this.config.multiTickerMode,
        minConfidenceThreshold: this.config.confidenceThreshold,
        minRRThreshold: this.config.minRRThreshold,
        confidenceDeltaThreshold: this.config.confidenceDeltaThreshold,
        cooldownPeriod: this.config.cooldownPeriod,
        enablePaperTrading: this.config.paperTradingEnabled,
        enableLiveTrading: this.config.liveTradingEnabled,
        healthCheckInterval: this.config.healthCheckInterval
      };

      this.multiTickerOrchestrator = new MultiTickerOrchestrator(
        this.eventBus,
        multiTickerConfig,
        this.paperEngine,
        this.feedbackEngine
      );

      await this.multiTickerOrchestrator.start();
      this.singleTickerMode = false;

      console.log(`🎛️ Multi-ticker orchestrator started with ${this.config.watchlist.length} tickers`);
    } finally {
      this.transitionInProgress = false;
    }
  }

  private async startSingleTicker(ticker: string): Promise<void> {
    if (this.transitionInProgress) {
      console.log('🎛️ Transition already in progress, waiting...');
      return;
    }

    this.transitionInProgress = true;

    try {
      if (this.multiTickerOrchestrator) {
        await this.multiTickerOrchestrator.shutdown();
        this.multiTickerOrchestrator = undefined;
      }

      this.currentTicker = ticker;
      this.singleTickerMode = true;

      // Initialize single-ticker ReadySetGo controller
      const singleTickerConfig = {
        paperTradingEnabled: this.config.paperTradingEnabled,
        confidenceThreshold: this.config.confidenceThreshold,
        maxConcurrentTrades: 1, // Single ticker = single position
        cooldownPeriod: this.config.cooldownPeriod,
        enableLearning: this.config.enableLearning
      };

      // Create a simplified single-ticker controller
      // This would integrate with existing single-ticker logic
      console.log(`🎛️ Single-ticker mode started for ${ticker}`);

      // Emit single ticker events
      this.eventBus.emit('single-ticker:started', {
        ticker,
        config: singleTickerConfig,
        timestamp: new Date()
      });

      // Set up single-ticker event handling
      this.setupSingleTickerHandling(ticker);
    } finally {
      this.transitionInProgress = false;
    }
  }

  private setupSingleTickerHandling(ticker: string): void {
    // Listen for confidence updates for the specific ticker
    this.eventBus.on('engine:confidence', (data) => {
      if (data.ticker === ticker) {
        this.handleSingleTickerConfidence(data);
      }
    });

    // Listen for regime changes for the specific ticker
    this.eventBus.on('regime:change', (data) => {
      if (data.ticker === ticker) {
        this.handleSingleTickerRegimeChange(data);
      }
    });
  }

  private handleSingleTickerConfidence(data: any): void {
    // Process confidence update for single ticker
    if (data.confidence > this.config.confidenceThreshold) {
      // Generate trade signal for single ticker
      const signal = {
        signalId: `single_${this.currentTicker}_${Date.now()}`,
        ticker: this.currentTicker,
        side: data.side || 'LONG',
        confidence: data.confidence,
        conviction: data.conviction || 0.8,
        expectedMove: data.expectedMove || 2.5,
        timeframe: 'MEDIUM' as any,
        regime: data.regime || 'NEUTRAL',
        source: 'SINGLE_TICKER' as any,
        timestamp: new Date()
      };

      this.eventBus.emit('trade:signal', signal);
    }
  }

  private handleSingleTickerRegimeChange(data: any): void {
    console.log(`🎛️ Regime change for ${this.currentTicker}: ${data.regime}`);
    // Adjust single ticker strategy based on regime
  }

  public async switchToMultiTicker(): Promise<void> {
    console.log('🎛️ Switching to multi-ticker mode...');
    
    if (!this.singleTickerMode) {
      console.log('🎛️ Already in multi-ticker mode');
      return;
    }

    await this.startMultiTicker();

    this.eventBus.emit('orchestrator:mode:changed', {
      from: 'single-ticker',
      to: 'multi-ticker',
      timestamp: new Date()
    });
  }

  public async switchToSingleTicker(ticker: string): Promise<void> {
    console.log(`🎛️ Switching to single-ticker mode: ${ticker}`);
    
    if (this.singleTickerMode && this.currentTicker === ticker) {
      console.log(`🎛️ Already in single-ticker mode for ${ticker}`);
      return;
    }

    const previousMode = this.singleTickerMode ? 'single-ticker' : 'multi-ticker';
    await this.startSingleTicker(ticker);

    this.eventBus.emit('orchestrator:mode:changed', {
      from: previousMode,
      to: 'single-ticker',
      ticker,
      timestamp: new Date()
    });
  }

  public getSystemStatus(): {
    mode: 'single-ticker' | 'multi-ticker';
    isRunning: boolean;
    currentTicker?: string;
    activeTickers?: number;
    activePositions: number;
    multiTickerStatus?: any;
    paperTradingEnabled: boolean;
    liveTradingEnabled: boolean;
  } {
    let activePositions = 0;
    let multiTickerStatus = undefined;

    if (this.multiTickerOrchestrator && !this.singleTickerMode) {
      const status = this.multiTickerOrchestrator.getStatus();
      activePositions = status.activePositions;
      multiTickerStatus = status;
    } else {
      // Single ticker mode - would get from single ticker system
      activePositions = this.paperEngine.getOpenPositions().length;
    }

    return {
      mode: this.singleTickerMode ? 'single-ticker' : 'multi-ticker',
      isRunning: true,
      currentTicker: this.singleTickerMode ? this.currentTicker : undefined,
      activeTickers: this.singleTickerMode ? 1 : this.config.watchlist.length,
      activePositions,
      multiTickerStatus,
      paperTradingEnabled: this.config.paperTradingEnabled,
      liveTradingEnabled: this.config.liveTradingEnabled
    };
  }

  public updateConfiguration(newConfig: Partial<RealtimeOrchestratorConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Handle configuration changes
    if (newConfig.multiTickerEnabled !== undefined && newConfig.multiTickerEnabled !== oldConfig.multiTickerEnabled) {
      if (newConfig.multiTickerEnabled) {
        this.switchToMultiTicker();
      } else {
        this.switchToSingleTicker(this.currentTicker);
      }
    }

    // Update multi-ticker orchestrator config if running
    if (this.multiTickerOrchestrator && !this.singleTickerMode) {
      this.multiTickerOrchestrator.updateConfig({
        watchlist: this.config.watchlist,
        maxConcurrentTrades: this.config.maxConcurrentTrades,
        minConfidenceThreshold: this.config.confidenceThreshold
      });
    }

    console.log('🎛️ Realtime Orchestrator configuration updated');
  }

  private emitHealthStatus(): void {
    const status = this.getSystemStatus();
    
    this.eventBus.emitSystemHealth(
      status.isRunning ? 'healthy' : 'unhealthy',
      {
        realtimeOrchestrator: status.isRunning,
        multiTickerOrchestrator: this.multiTickerOrchestrator ? true : false,
        paperTradingEngine: true,
        feedbackEngine: true
      }
    );
  }

  public async addTicker(ticker: string): Promise<void> {
    if (!this.config.watchlist.includes(ticker)) {
      this.config.watchlist.push(ticker);
      
      if (this.multiTickerOrchestrator && !this.singleTickerMode) {
        this.multiTickerOrchestrator.addTicker(ticker);
      }
      
      console.log(`🎛️ Added ticker: ${ticker}`);
    }
  }

  public async removeTicker(ticker: string): Promise<void> {
    const index = this.config.watchlist.indexOf(ticker);
    if (index > -1) {
      this.config.watchlist.splice(index, 1);
      
      if (this.multiTickerOrchestrator && !this.singleTickerMode) {
        this.multiTickerOrchestrator.removeTicker(ticker);
      }
      
      console.log(`🎛️ Removed ticker: ${ticker}`);
    }
  }

  public getWatchlist(): string[] {
    return [...this.config.watchlist];
  }

  public getCurrentMode(): 'single-ticker' | 'multi-ticker' {
    return this.singleTickerMode ? 'single-ticker' : 'multi-ticker';
  }

  public getCurrentTicker(): string | undefined {
    return this.singleTickerMode ? this.currentTicker : undefined;
  }

  public getMultiTickerSnapshot(): any {
    if (this.multiTickerOrchestrator && !this.singleTickerMode) {
      return this.multiTickerOrchestrator.getStateSnapshot();
    }
    return null;
  }

  public async pauseTrading(): Promise<void> {
    if (this.multiTickerOrchestrator && !this.singleTickerMode) {
      this.multiTickerOrchestrator.pauseTrading();
    }
    
    this.eventBus.emit('orchestrator:trading:paused', {
      timestamp: new Date()
    });
    
    console.log('🎛️ Trading paused');
  }

  public async resumeTrading(): Promise<void> {
    if (this.multiTickerOrchestrator && !this.singleTickerMode) {
      this.multiTickerOrchestrator.resumeTrading();
    }
    
    this.eventBus.emit('orchestrator:trading:resumed', {
      timestamp: new Date()
    });
    
    console.log('🎛️ Trading resumed');
  }

  public async shutdown(): Promise<void> {
    console.log('🎛️ Shutting down Realtime Orchestrator...');

    try {
      // Stop monitoring
      this.stopMonitoring();

      // Shutdown multi-ticker orchestrator
      if (this.multiTickerOrchestrator) {
        await this.multiTickerOrchestrator.shutdown();
        this.multiTickerOrchestrator = undefined;
      }

      // Reset state
      this.isRunning = false;
      this.transitionInProgress = false;

      this.eventBus.emit('orchestrator:shutdown', {
        timestamp: new Date(),
        finalMetrics: this.performanceMetrics
      });

      console.log('🎛️ Realtime Orchestrator shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  // Integration with existing SignalWeightingEngine
  public integrateWithSignalWeighting(): void {
    // Listen for confidence updates from existing SignalWeightingEngine
    this.eventBus.on('signal:confidence:computed', (data) => {
      // Emit in the format expected by ReadySetGo Controller
      this.eventBus.emitConfidenceUpdate(
        data.ticker,
        data.confidence / 100, // Normalize to 0-1
        data.confidenceDelta / 100
      );
    });

    console.log('🎛️ Integrated with SignalWeightingEngine');
  }

  // Integration with existing TradeDecisionEngine
  public integrateWithTradeDecision(): void {
    // Listen for trade decisions from existing engine
    this.eventBus.on('trade:decision:made', (decision) => {
      // Convert to TradeSignal format
      const signal = {
        signalId: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        ticker: decision.ticker,
        side: decision.side,
        confidence: decision.confidence,
        conviction: decision.conviction || 0.8,
        expectedMove: decision.expectedMove || 2.5,
        timeframe: decision.timeframe || 'MEDIUM',
        regime: decision.regime || 'NEUTRAL',
        source: 'TRADEDECISION' as any,
        timestamp: new Date()
      };

      // Emit as trade signal
      this.eventBus.emit('trade:executed', signal);
    });

    console.log('🎛️ Integrated with TradeDecisionEngine');
  }

  // Method to initialize all integrations
  public initializeIntegrations(): void {
    this.integrateWithSignalWeighting();
    this.integrateWithTradeDecision();
    
    console.log('🎛️ All integrations initialized');
  }
}
  //
 Enhanced monitoring and performance tracking methods
  private startPerformanceMonitoring(): void {
    if (!this.config.performanceTrackingEnabled) return;

    this.performanceMonitorInterval = setInterval(() => {
      this.reviewPerformance();
    }, this.config.performanceReviewInterval * 60 * 1000);

    console.log(`🎛️ Performance monitoring started (review every ${this.config.performanceReviewInterval} minutes)`);
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log(`🎛️ Health monitoring started (check every ${this.config.healthCheckInterval}ms)`);
  }

  private stopMonitoring(): void {
    if (this.performanceMonitorInterval) {
      clearInterval(this.performanceMonitorInterval);
      this.performanceMonitorInterval = undefined;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  private trackTradePerformance(position: any): void {
    if (!this.config.performanceTrackingEnabled) return;

    const currentMode = this.singleTickerMode ? 'singleTicker' : 'multiTicker';
    const isWin = position.pnl > 0;

    // Update overall metrics
    this.performanceMetrics.totalTrades++;
    if (isWin) {
      this.performanceMetrics.winningTrades++;
      this.performanceMetrics.consecutiveLosses = 0;
    } else {
      this.performanceMetrics.consecutiveLosses++;
    }
    this.performanceMetrics.totalPnL += position.pnl;

    // Update mode-specific metrics
    const modeMetrics = this.performanceMetrics.modePerformance[currentMode];
    modeMetrics.trades++;
    modeMetrics.pnl += position.pnl;
    modeMetrics.winRate = modeMetrics.trades > 0 ? 
      (modeMetrics.pnl > 0 ? modeMetrics.pnl / modeMetrics.trades : 0) : 0;

    // Check for emergency conditions
    this.checkEmergencyConditions();

    console.log(`🎛️ Trade tracked: ${position.ticker} ${isWin ? 'WIN' : 'LOSS'} $${position.pnl.toFixed(2)} (${currentMode} mode)`);
  }

  private checkEmergencyConditions(): void {
    if (!this.config.emergencyShutdownEnabled) return;

    // Check consecutive losses
    if (this.performanceMetrics.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      this.eventBus.emit('risk:emergency', {
        type: 'CONSECUTIVE_LOSSES',
        count: this.performanceMetrics.consecutiveLosses,
        threshold: this.config.maxConsecutiveLosses
      });
    }

    // Check drawdown
    const currentDrawdown = Math.abs(this.performanceMetrics.totalPnL) / 10000; // Assuming $10k starting balance
    if (currentDrawdown > this.config.maxDrawdownThreshold) {
      this.eventBus.emit('risk:emergency', {
        type: 'MAX_DRAWDOWN',
        drawdown: currentDrawdown,
        threshold: this.config.maxDrawdownThreshold
      });
    }
  }

  private reviewPerformance(): void {
    const now = new Date();
    const timeSinceLastReview = now.getTime() - this.performanceMetrics.lastPerformanceReview.getTime();
    
    if (timeSinceLastReview < this.config.performanceReviewInterval * 60 * 1000) {
      return; // Too soon for review
    }

    const overallWinRate = this.performanceMetrics.totalTrades > 0 ? 
      this.performanceMetrics.winningTrades / this.performanceMetrics.totalTrades : 0;

    const singleTickerPerf = this.performanceMetrics.modePerformance.singleTicker;
    const multiTickerPerf = this.performanceMetrics.modePerformance.multiTicker;

    console.log('🎛️ Performance Review:', {
      totalTrades: this.performanceMetrics.totalTrades,
      overallWinRate: (overallWinRate * 100).toFixed(1) + '%',
      totalPnL: this.performanceMetrics.totalPnL.toFixed(2),
      consecutiveLosses: this.performanceMetrics.consecutiveLosses,
      singleTickerWinRate: singleTickerPerf.trades > 0 ? (singleTickerPerf.winRate * 100).toFixed(1) + '%' : 'N/A',
      multiTickerWinRate: multiTickerPerf.trades > 0 ? (multiTickerPerf.winRate * 100).toFixed(1) + '%' : 'N/A'
    });

    // Emit performance review event
    this.eventBus.emit('performance:review', {
      timestamp: now,
      metrics: this.performanceMetrics,
      recommendations: this.generatePerformanceRecommendations()
    });

    this.performanceMetrics.lastPerformanceReview = now;
  }

  private generatePerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const singleTickerPerf = this.performanceMetrics.modePerformance.singleTicker;
    const multiTickerPerf = this.performanceMetrics.modePerformance.multiTicker;

    // Compare mode performance
    if (singleTickerPerf.trades > 5 && multiTickerPerf.trades > 5) {
      if (singleTickerPerf.winRate > multiTickerPerf.winRate * 1.2) {
        recommendations.push('Consider switching to single-ticker mode for better performance');
      } else if (multiTickerPerf.winRate > singleTickerPerf.winRate * 1.2) {
        recommendations.push('Multi-ticker mode showing superior performance');
      }
    }

    // Check consecutive losses
    if (this.performanceMetrics.consecutiveLosses >= 3) {
      recommendations.push('Consider reducing position sizes due to consecutive losses');
    }

    // Check overall performance
    const overallWinRate = this.performanceMetrics.totalTrades > 0 ? 
      this.performanceMetrics.winningTrades / this.performanceMetrics.totalTrades : 0;
    
    if (overallWinRate < 0.4 && this.performanceMetrics.totalTrades > 10) {
      recommendations.push('Low win rate detected - review signal quality and thresholds');
    }

    return recommendations;
  }

  private evaluateAutoSwitch(data: any): void {
    if (!this.config.multiTickerEnabled) return;

    const avgConfidence = data.avgConfidence || 0;
    
    // Auto-switch logic based on confidence
    if (this.singleTickerMode && avgConfidence > this.config.autoSwitchThreshold) {
      console.log(`🎛️ High confidence detected (${avgConfidence.toFixed(3)}), considering switch to multi-ticker`);
      // Could implement automatic switching here
    } else if (!this.singleTickerMode && avgConfidence < this.config.autoSwitchThreshold * 0.7) {
      console.log(`🎛️ Low confidence detected (${avgConfidence.toFixed(3)}), considering switch to single-ticker`);
      // Could implement automatic switching here
    }
  }

  private handleEmergencyShutdown(data: any): void {
    console.warn(`🎛️ EMERGENCY SHUTDOWN TRIGGERED: ${data.type}`);
    
    this.eventBus.emit('orchestrator:emergency:shutdown', {
      reason: data.type,
      data,
      timestamp: new Date()
    });

    // Pause trading immediately
    this.pauseTrading();
    
    // Close positions if severe
    if (data.type === 'MAX_DRAWDOWN' || data.type === 'CONSECUTIVE_LOSSES') {
      if (this.multiTickerOrchestrator) {
        this.multiTickerOrchestrator.emergencyShutdown();
      }
    }
  }

  private handlePerformanceMilestone(data: any): void {
    console.log(`🎛️ Performance milestone reached: ${data.milestone}`);
    
    // Could trigger mode optimization or configuration adjustments
    if (data.milestone === 'PROFIT_TARGET_HIT') {
      // Maybe reduce risk or switch to more conservative mode
    }
  }

  private handleSystemError(data: any): void {
    console.error(`🎛️ System error: ${data.error?.message || 'Unknown error'}`);
    
    if (data.severity === 'CRITICAL') {
      // Consider emergency procedures
      this.handleEmergencyShutdown({
        type: 'SYSTEM_ERROR',
        error: data.error,
        component: data.component
      });
    }
  }

  private performHealthCheck(): void {
    const health = {
      orchestrator: this.isRunning,
      multiTicker: this.multiTickerOrchestrator ? true : false,
      paperTrading: true, // Would check actual health
      feedback: true, // Would check actual health
      database: true, // Would check actual health
      eventBus: true // Would check actual health
    };

    const unhealthyComponents = Object.entries(health)
      .filter(([_, healthy]) => !healthy)
      .map(([component]) => component);

    if (unhealthyComponents.length > 0) {
      console.warn(`🎛️ Health check failed for: ${unhealthyComponents.join(', ')}`);
      this.eventBus.emitSystemHealth('DEGRADED', health);
    } else {
      this.eventBus.emitSystemHealth('HEALTHY', health);
    }
  }

  // Enhanced public API methods
  public getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  public getDetailedStatus(): {
    mode: 'single-ticker' | 'multi-ticker';
    isRunning: boolean;
    isInitialized: boolean;
    transitionInProgress: boolean;
    currentTicker?: string;
    watchlist: string[];
    activeTickers?: number;
    activePositions: number;
    multiTickerStatus?: any;
    performanceMetrics: typeof this.performanceMetrics;
    config: RealtimeOrchestratorConfig;
    health: {
      overall: string;
      components: Record<string, boolean>;
    };
  } {
    const baseStatus = this.getSystemStatus();
    
    return {
      ...baseStatus,
      isInitialized: this.isInitialized,
      transitionInProgress: this.transitionInProgress,
      watchlist: this.config.watchlist,
      performanceMetrics: this.performanceMetrics,
      config: this.config,
      health: {
        overall: 'HEALTHY', // Would be calculated from actual health checks
        components: {
          orchestrator: this.isRunning,
          multiTicker: !!this.multiTickerOrchestrator,
          paperTrading: true,
          feedback: true
        }
      }
    };
  }

  public async gracefulModeSwitch(targetMode: 'single-ticker' | 'multi-ticker', ticker?: string): Promise<void> {
    if (this.transitionInProgress) {
      throw new Error('Mode transition already in progress');
    }

    console.log(`🎛️ Initiating graceful switch to ${targetMode}${ticker ? ` (${ticker})` : ''}`);

    // Wait for any open positions to close or force close after timeout
    const openPositions = this.paperEngine.getOpenPositions();
    if (openPositions.length > 0) {
      console.log(`🎛️ Waiting for ${openPositions.length} positions to close before mode switch...`);
      
      // Wait up to 5 minutes for positions to close naturally
      const timeout = 5 * 60 * 1000;
      const startTime = Date.now();
      
      while (this.paperEngine.getOpenPositions().length > 0 && Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10 seconds
      }
      
      // Force close remaining positions if timeout reached
      const remainingPositions = this.paperEngine.getOpenPositions();
      if (remainingPositions.length > 0) {
        console.warn(`🎛️ Force closing ${remainingPositions.length} positions for mode switch`);
        for (const position of remainingPositions) {
          await this.paperEngine.closePosition(position.id, 'MODE_SWITCH');
        }
      }
    }

    // Perform the switch
    if (targetMode === 'multi-ticker') {
      await this.switchToMultiTicker();
    } else {
      await this.switchToSingleTicker(ticker || this.currentTicker);
    }

    console.log(`🎛️ Graceful mode switch to ${targetMode} completed`);
  }

  public optimizeConfiguration(): void {
    const recommendations = this.generatePerformanceRecommendations();
    
    if (recommendations.length > 0) {
      console.log('🎛️ Configuration optimization recommendations:', recommendations);
      
      // Could implement automatic configuration adjustments here
      this.eventBus.emit('orchestrator:optimization:recommendations', {
        recommendations,
        currentConfig: this.config,
        performanceMetrics: this.performanceMetrics,
        timestamp: new Date()
      });
    }
  }

  public async restart(): Promise<void> {
    console.log('🎛️ Restarting Realtime Orchestrator...');
    
    await this.shutdown();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause
    await this.start();
    
    console.log('🎛️ Realtime Orchestrator restart completed');
  }