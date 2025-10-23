import { EventEmitter } from 'events';
import { 
  TickerState, 
  MultiTickerConfig, 
  MultiTickerState, 
  EnhancedSignal,
  PaperPosition,
  SystemHealth,
  TickerStatus
} from '../types/core.js';
import { TickerStateManager, StateStatistics } from './TickerStateManager.js';
import { PriorityManager, DEFAULT_RESOURCE_LIMITS } from './PriorityManager.js';
import { ConcurrentProcessor, ConcurrentProcessingConfig } from './ConcurrentProcessor.js';

export class MultiTickerOrchestrator extends EventEmitter {
  private stateManager: TickerStateManager;
  private priorityManager: PriorityManager;
  private concurrentProcessor: ConcurrentProcessor;
  private config: MultiTickerConfig;
  private isRunning: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  private orchestratorId: string;

  constructor(config: MultiTickerConfig) {
    super();
    this.config = config;
    this.orchestratorId = `orchestrator-${Date.now()}`;
    
    // Initialize state management components
    this.stateManager = new TickerStateManager();
    this.priorityManager = new PriorityManager(
      config.priorityWeights,
      DEFAULT_RESOURCE_LIMITS
    );
    
    // Initialize concurrent processor
    const processingConfig: ConcurrentProcessingConfig = {
      maxWorkers: 4,
      processingInterval: 1000,
      taskTimeout: 30000,
      priorityWeights: config.priorityWeights,
      resourceLimits: DEFAULT_RESOURCE_LIMITS
    };
    this.concurrentProcessor = new ConcurrentProcessor(processingConfig);
    
    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Start the multi-ticker orchestrator
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Orchestrator is already running');
    }

    console.log(`Starting Multi-Ticker Orchestrator with ${this.config.watchlist.length} tickers`);
    
    // Initialize ticker states
    for (const ticker of this.config.watchlist) {
      this.stateManager.initializeTicker(ticker);
    }

    // Start concurrent processor
    await this.concurrentProcessor.start();

    this.isRunning = true;
    
    // Start processing loop
    this.processingInterval = setInterval(
      () => this.processTickerSignals(),
      this.config.updateInterval
    );

    this.emit('orchestrator:started', {
      orchestratorId: this.orchestratorId,
      tickerCount: this.config.watchlist.length
    });
  }

  /**
   * Stop the multi-ticker orchestrator
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping Multi-Ticker Orchestrator');
    
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    // Stop concurrent processor
    await this.concurrentProcessor.stop();

    this.emit('orchestrator:stopped', {
      orchestratorId: this.orchestratorId
    });
  }

  /**
   * Add a new ticker to monitoring
   */
  public async addTicker(ticker: string): Promise<void> {
    if (this.stateManager.getTickerState(ticker)) {
      throw new Error(`Ticker ${ticker} is already being monitored`);
    }

    this.stateManager.initializeTicker(ticker);
    this.config.watchlist.push(ticker);

    this.emit('ticker:added', { ticker, orchestratorId: this.orchestratorId });
  }

  /**
   * Remove a ticker from monitoring
   */
  public async removeTicker(ticker: string): Promise<void> {
    if (!this.stateManager.removeTicker(ticker)) {
      throw new Error(`Ticker ${ticker} is not being monitored`);
    }

    this.config.watchlist = this.config.watchlist.filter(t => t !== ticker);

    this.emit('ticker:removed', { ticker, orchestratorId: this.orchestratorId });
  }

  /**
   * Get the current state of a specific ticker
   */
  public getTickerState(ticker: string): TickerState | null {
    return this.stateManager.getTickerState(ticker);
  }

  /**
   * Get all ticker states
   */
  public getAllTickerStates(): TickerState[] {
    return this.stateManager.getAllStates();
  }

  /**
   * Get all active positions across all tickers
   */
  public getActivePositions(): PaperPosition[] {
    const positions: PaperPosition[] = [];
    
    for (const state of this.stateManager.getAllStates()) {
      if (state.position && state.position.status === 'OPEN') {
        positions.push(state.position);
      }
    }
    
    return positions;
  }

  /**
   * Get state statistics
   */
  public getStateStatistics(): StateStatistics {
    return this.stateManager.getStateStatistics();
  }

  /**
   * Get processing statistics
   */
  public getProcessingStatistics() {
    return this.concurrentProcessor.getProcessingStatistics();
  }

  /**
   * Force ticker state transition
   */
  public forceStateTransition(ticker: string, newStatus: TickerStatus, reason?: string): TickerState {
    return this.stateManager.forceStateTransition(ticker, newStatus, reason);
  }

  /**
   * Get the current orchestrator state
   */
  public getOrchestratorState(): MultiTickerState {
    const activePositions = this.getActivePositions();
    const portfolioHeat = this.calculatePortfolioHeat(activePositions);
    const allStates = this.stateManager.getAllStates();
    const processingStats = this.concurrentProcessor.getProcessingStatistics();
    
    return {
      orchestratorId: this.orchestratorId,
      activeTickerCount: allStates.length,
      totalSignalsProcessed: processingStats.completedTasks,
      activeTrades: activePositions.length,
      portfolioHeat,
      systemHealth: this.getSystemHealth(),
      tickers: Object.fromEntries(allStates.map(state => [state.ticker, state])),
      performance: {
        processingLatency: processingStats.averageProcessingTime,
        throughput: processingStats.throughput,
        errorRate: processingStats.failedTasks / Math.max(1, processingStats.completedTasks + processingStats.failedTasks),
        uptime: this.getUptime()
      },
      lastUpdate: new Date()
    };
  }

  /**
   * Process an enhanced signal for a specific ticker
   */
  public async processEnhancedSignal(signal: EnhancedSignal): Promise<void> {
    const currentState = this.stateManager.getTickerState(signal.ticker);
    if (!currentState) {
      throw new Error(`Ticker ${signal.ticker} is not being monitored`);
    }

    const previousStatus = currentState.status;
    const newState = await this.determineNewState(currentState, signal);
    
    // Update ticker state using state manager
    this.stateManager.updateTickerState(signal.ticker, {
      confidence: signal.confidence,
      conviction: signal.conviction,
      fibZone: signal.fibAnalysis.currentZone,
      gammaExposure: signal.gammaAnalysis.netGammaExposure,
      status: newState.status,
      recommendedOption: signal.recommendations[0] // Best recommendation
    });

    this.emit('signal:processed', {
      ticker: signal.ticker,
      confidence: signal.confidence,
      previousStatus,
      newStatus: newState.status,
      orchestratorId: this.orchestratorId
    });
  }



  /**
   * Main processing loop for all tickers with enhanced priority-based processing
   */
  private async processTickerSignals(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const startTime = Date.now();

    try {
      // Get all ticker states
      const allStates = this.stateManager.getAllStates();
      
      // Apply priority-based processing
      const prioritizedStates = this.priorityManager.prioritizeTickerStates(allStates);
      
      // Check resource constraints and apply graceful degradation if needed
      const resourceStatus = this.checkResourceConstraints();
      if (resourceStatus.shouldDegrade) {
        await this.applyGracefulDegradation(resourceStatus);
      }
      
      // Process tickers concurrently with priority ordering
      const results = await this.concurrentProcessor.processTickersConcurrently(
        prioritizedStates,
        {
          respectPriority: true,
          maxConcurrent: resourceStatus.maxConcurrentTickers,
          timeoutMs: 5000
        }
      );
      
      // Handle processing results and update states
      await this.handleProcessingResults(results);
      
      // Track performance metrics
      const processingTime = Date.now() - startTime;
      this.trackPerformanceMetrics(processingTime, results.length);
      
      // Emit orchestrator update with performance data
      this.emit('orchestrator:update', {
        ...this.getOrchestratorState(),
        processingTime,
        tickersProcessed: results.length,
        resourceStatus
      });
      
    } catch (error) {
      console.error('Error in ticker processing loop:', error);
      this.emit('orchestrator:error', { 
        error, 
        orchestratorId: this.orchestratorId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Set up event forwarding from state manager and processor
   */
  private setupEventForwarding(): void {
    // Forward state manager events
    this.stateManager.on('ticker:updated', (data) => {
      if (data.statusChanged) {
        this.emit('ticker:state:transition', {
          ticker: data.ticker,
          from: data.previousState.status,
          to: data.newState.status,
          timestamp: new Date(),
          orchestratorId: this.orchestratorId
        });
      }
    });

    this.stateManager.on('ticker:transition', (data) => {
      this.emit('ticker:transition:recorded', {
        ...data,
        orchestratorId: this.orchestratorId
      });
    });

    this.stateManager.on('ticker:cooldown:started', (data) => {
      this.emit('ticker:cooldown:started', {
        ...data,
        orchestratorId: this.orchestratorId
      });
    });

    this.stateManager.on('ticker:cooldown:expired', (data) => {
      this.emit('ticker:cooldown:expired', {
        ...data,
        orchestratorId: this.orchestratorId
      });
    });

    // Forward concurrent processor events
    this.concurrentProcessor.on('task:completed', (data) => {
      this.emit('task:completed', {
        ...data,
        orchestratorId: this.orchestratorId
      });
    });

    this.concurrentProcessor.on('task:failed', (data) => {
      this.emit('task:failed', {
        ...data,
        orchestratorId: this.orchestratorId
      });
    });

    this.concurrentProcessor.on('processor:batch:processed', (data) => {
      this.emit('processor:batch:processed', {
        ...data,
        orchestratorId: this.orchestratorId
      });
    });
  }



  /**
   * Determine new state based on signal and current state
   */
  private async determineNewState(currentState: TickerState, signal: EnhancedSignal): Promise<TickerState> {
    const newState = { ...currentState };
    
    // Update confidence and conviction
    newState.confidence = signal.confidence;
    newState.conviction = signal.conviction;
    newState.fibZone = signal.fibAnalysis.currentZone;
    newState.gammaExposure = signal.gammaAnalysis.netGammaExposure;

    // State transition logic
    switch (currentState.status) {
      case 'READY':
        if (signal.confidence > this.config.confidenceThreshold && 
            !this.config.fibZoneBlocklist.includes(signal.fibAnalysis.currentZone)) {
          newState.status = 'SET';
          newState.stateEntryTime = new Date();
        }
        break;

      case 'SET':
        if (this.shouldTransitionToGo(signal)) {
          newState.status = 'GO';
          newState.stateEntryTime = new Date();
        } else if (signal.confidence < this.config.confidenceThreshold * 0.8) {
          newState.status = 'READY';
          newState.stateEntryTime = new Date();
        }
        break;

      case 'GO':
        if (this.canExecuteTrade() && this.shouldExecuteTrade(signal)) {
          // Execute trade and transition to cooldown
          await this.executeTrade(signal);
          newState.status = 'COOLDOWN';
          newState.stateEntryTime = new Date();
          newState.cooldownUntil = new Date(Date.now() + 300000); // 5 minute cooldown
        } else if (signal.confidence < this.config.confidenceThreshold) {
          newState.status = 'SET';
          newState.stateEntryTime = new Date();
        }
        break;

      case 'COOLDOWN':
        // Handled in processTickerUpdate
        break;
    }

    return newState;
  }

  /**
   * Check if should transition from SET to GO
   */
  private shouldTransitionToGo(signal: EnhancedSignal): boolean {
    return signal.confidence > this.config.confidenceThreshold * 1.2 &&
           signal.conviction > 0.7 &&
           signal.fibAnalysis.confluence > 0.6;
  }

  /**
   * Check if can execute a new trade
   */
  private canExecuteTrade(): boolean {
    const activePositions = this.getActivePositions();
    return activePositions.length < this.config.maxConcurrentTrades;
  }

  /**
   * Check if should execute trade based on signal
   */
  private shouldExecuteTrade(signal: EnhancedSignal): boolean {
    return signal.confidence > this.config.confidenceThreshold * 1.5 &&
           signal.recommendations.length > 0 &&
           signal.riskAssessment.riskScore < 0.8;
  }

  /**
   * Execute a paper trade
   */
  private async executeTrade(signal: EnhancedSignal): Promise<void> {
    // This will integrate with the paper trading engine
    console.log(`Executing trade for ${signal.ticker} with confidence ${signal.confidence}`);
    
    this.emit('trade:executed', {
      ticker: signal.ticker,
      confidence: signal.confidence,
      recommendations: signal.recommendations,
      orchestratorId: this.orchestratorId
    });
  }

  /**
   * Handle state transition
   */
  private async handleStateTransition(ticker: string, fromStatus: TickerStatus, toStatus: TickerStatus): Promise<void> {
    console.log(`${ticker}: ${fromStatus} → ${toStatus}`);
    
    this.emit('ticker:state:transition', {
      ticker,
      from: fromStatus,
      to: toStatus,
      timestamp: new Date(),
      orchestratorId: this.orchestratorId
    });
  }



  /**
   * Calculate portfolio heat from active positions
   */
  private calculatePortfolioHeat(positions: PaperPosition[]): number {
    // Simplified calculation - sum of position risks
    return positions.reduce((heat, position) => {
      const positionRisk = Math.abs(position.pnl) / 100000; // Assuming $100k account
      return heat + positionRisk;
    }, 0);
  }

  /**
   * Get system health status
   */
  private getSystemHealth(): SystemHealth {
    return {
      status: 'HEALTHY',
      components: {
        orchestrator: {
          status: 'UP',
          responseTime: 50,
          errorRate: 0.01,
          lastCheck: new Date()
        }
      },
      overallScore: 0.95
    };
  }

  /**
   * Check resource constraints and determine if graceful degradation is needed
   */
  private checkResourceConstraints(): ResourceConstraintStatus {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    
    const memoryUtilization = heapUsedMB / heapTotalMB;
    const activePositions = this.getActivePositions().length;
    const portfolioHeat = this.calculatePortfolioHeat(this.getActivePositions());
    
    // Determine if degradation is needed
    const shouldDegrade = 
      memoryUtilization > 0.8 || 
      activePositions >= this.config.maxConcurrentTrades ||
      portfolioHeat > 0.15; // 15% portfolio heat threshold
    
    // Calculate max concurrent tickers based on resources
    let maxConcurrentTickers = this.config.watchlist.length;
    if (shouldDegrade) {
      if (memoryUtilization > 0.9) {
        maxConcurrentTickers = Math.max(3, Math.floor(maxConcurrentTickers * 0.3));
      } else if (memoryUtilization > 0.8) {
        maxConcurrentTickers = Math.max(5, Math.floor(maxConcurrentTickers * 0.6));
      }
    }
    
    return {
      shouldDegrade,
      memoryUtilization,
      activePositions,
      portfolioHeat,
      maxConcurrentTickers,
      degradationReason: shouldDegrade ? this.getDegradationReason(memoryUtilization, activePositions, portfolioHeat) : null
    };
  }

  /**
   * Apply graceful degradation by reducing monitoring frequency
   */
  private async applyGracefulDegradation(resourceStatus: ResourceConstraintStatus): Promise<void> {
    console.log(`Applying graceful degradation: ${resourceStatus.degradationReason}`);
    
    // Increase update interval to reduce processing frequency
    const originalInterval = this.config.updateInterval;
    this.config.updateInterval = Math.min(originalInterval * 1.5, 10000); // Max 10 seconds
    
    // Restart processing interval with new timing
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = setInterval(
        () => this.processTickerSignals(),
        this.config.updateInterval
      );
    }
    
    // Emit degradation event
    this.emit('orchestrator:degradation:applied', {
      reason: resourceStatus.degradationReason,
      originalInterval,
      newInterval: this.config.updateInterval,
      maxConcurrentTickers: resourceStatus.maxConcurrentTickers,
      orchestratorId: this.orchestratorId,
      timestamp: new Date()
    });
  }

  /**
   * Handle processing results and update ticker states
   */
  private async handleProcessingResults(results: any[]): Promise<void> {
    for (const result of results) {
      if (result.success) {
        // Update ticker state based on processing result
        const currentState = this.stateManager.getTickerState(result.ticker);
        if (currentState && result.stateUpdate) {
          this.stateManager.updateTickerState(result.ticker, result.stateUpdate);
          
          // Emit state transition event if status changed
          if (result.stateUpdate.status && result.stateUpdate.status !== currentState.status) {
            this.emit('ticker:state:transition', {
              ticker: result.ticker,
              from: currentState.status,
              to: result.stateUpdate.status,
              timestamp: new Date(),
              orchestratorId: this.orchestratorId,
              processingTime: result.processingTime
            });
          }
        }
      } else {
        console.error(`Processing failed for ${result.ticker}:`, result.error);
        
        // Emit processing error event
        this.emit('ticker:processing:error', {
          ticker: result.ticker,
          error: result.error,
          orchestratorId: this.orchestratorId,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Track performance metrics for monitoring
   */
  private trackPerformanceMetrics(processingTime: number, tickersProcessed: number): void {
    // This would integrate with a metrics collection system
    const metrics = {
      processingTime,
      tickersProcessed,
      throughput: tickersProcessed / (processingTime / 1000), // tickers per second
      timestamp: new Date()
    };
    
    // Emit metrics for monitoring systems
    this.emit('orchestrator:metrics', {
      ...metrics,
      orchestratorId: this.orchestratorId
    });
  }

  /**
   * Get degradation reason based on resource constraints
   */
  private getDegradationReason(memoryUtilization: number, activePositions: number, portfolioHeat: number): string {
    const reasons = [];
    
    if (memoryUtilization > 0.8) {
      reasons.push(`High memory usage: ${(memoryUtilization * 100).toFixed(1)}%`);
    }
    
    if (activePositions >= this.config.maxConcurrentTrades) {
      reasons.push(`Max concurrent trades reached: ${activePositions}/${this.config.maxConcurrentTrades}`);
    }
    
    if (portfolioHeat > 0.15) {
      reasons.push(`High portfolio heat: ${(portfolioHeat * 100).toFixed(1)}%`);
    }
    
    return reasons.join(', ');
  }

  // Performance metrics helpers
  private getUptime(): number {
    // TODO: Implement uptime tracking
    return 99.9;
  }
}

// Supporting interfaces for enhanced functionality
interface ResourceConstraintStatus {
  shouldDegrade: boolean;
  memoryUtilization: number;
  activePositions: number;
  portfolioHeat: number;
  maxConcurrentTickers: number;
  degradationReason: string | null;
}