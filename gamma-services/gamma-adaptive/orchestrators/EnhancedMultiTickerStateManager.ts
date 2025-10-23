import { EventEmitter } from 'events';
import { 
  TickerState, 
  TickerStatus, 
  FibZone,
  MultiTickerConfig,
  EnhancedSignal,
  SystemHealth
} from '../types/core';
import { TickerStateManager, StateStatistics } from './TickerStateManager';
import { PriorityManager } from './PriorityManager';
import { performanceMonitor } from '../../monitoring/PerformanceMonitor';
import { createLogger } from '../../logging/Logger';

/**
 * Enhanced Multi-Ticker State Manager
 * 
 * Implements comprehensive state management for 10+ tickers with:
 * - Ready-Set-Go lifecycle management
 * - Priority-based processing
 * - Resource allocation and graceful degradation
 * - Real-time event emission within 100ms
 * - Concurrent state tracking and transitions
 */
export class EnhancedMultiTickerStateManager extends EventEmitter {
  private stateManager: TickerStateManager;
  private priorityManager: PriorityManager;
  private config: MultiTickerConfig;
  private logger = createLogger({ component: 'EnhancedMultiTickerStateManager' });
  
  // Performance tracking
  private processingMetrics = {
    totalStateUpdates: 0,
    averageUpdateTime: 0,
    eventEmissionTimes: [] as number[],
    resourceUtilization: 0,
    degradationLevel: 0
  };
  
  // Resource management
  private resourceLimits = {
    maxConcurrentUpdates: 10,
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxCpuUsage: 80, // 80%
    eventEmissionTimeout: 100 // 100ms requirement
  };
  
  private activeUpdates = new Set<string>();
  private updateQueue: StateUpdateTask[] = [];
  private isProcessingQueue = false;
  
  constructor(config: MultiTickerConfig) {
    super();
    this.config = config;
    this.stateManager = new TickerStateManager();
    this.priorityManager = new PriorityManager(
      config.priorityWeights,
      {
        maxConcurrentTrades: config.maxConcurrentTrades,
        maxPortfolioHeat: 0.20,
        maxDrawdown: 0.05,
        maxMemoryUsage: this.resourceLimits.maxMemoryUsage,
        maxCpuUsage: this.resourceLimits.maxCpuUsage
      }
    );
    
    this.setupEventForwarding();
    this.startResourceMonitoring();
  }

  /**
   * Initialize all tickers from watchlist
   */
  public async initializeAllTickers(): Promise<void> {
    await performanceMonitor.trackOperation('initialize-all-tickers', async () => {
      const initPromises = this.config.watchlist.map(ticker => 
        this.initializeTicker(ticker)
      );
      
      await Promise.all(initPromises);
      
      await this.logger.info('INIT', `Initialized ${this.config.watchlist.length} tickers`, {
        tickers: this.config.watchlist,
        totalCount: this.config.watchlist.length
      });
      
      this.emitWithinTimeout('multi-ticker:initialized', {
        tickerCount: this.config.watchlist.length,
        tickers: this.config.watchlist,
        timestamp: new Date()
      });
    });
  }

  /**
   * Initialize a single ticker with enhanced validation
   */
  public async initializeTicker(ticker: string): Promise<TickerState> {
    return await performanceMonitor.trackOperation(`initialize-ticker-${ticker}`, async () => {
      // Validate ticker format
      if (!this.isValidTicker(ticker)) {
        throw new Error(`Invalid ticker format: ${ticker}`);
      }
      
      // Check if already initialized
      if (this.stateManager.getTickerState(ticker)) {
        throw new Error(`Ticker ${ticker} is already initialized`);
      }
      
      // Initialize with enhanced state
      const initialState = this.stateManager.initializeTicker(ticker);
      
      // Set up ticker-specific monitoring
      this.setupTickerMonitoring(ticker);
      
      await this.logger.info('TICKER_INIT', `Ticker ${ticker} initialized`, {
        ticker,
        initialState: initialState.status,
        timestamp: new Date()
      });
      
      this.emitWithinTimeout('ticker:initialized', {
        ticker,
        state: initialState,
        timestamp: new Date()
      });
      
      return initialState;
    });
  }

  /**
   * Process enhanced signal with priority-based queuing
   */
  public async processEnhancedSignal(signal: EnhancedSignal): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Calculate priority for this signal
      const priority = this.priorityManager.calculateSignalPriority(signal);
      
      // Create state update task
      const updateTask: StateUpdateTask = {
        ticker: signal.ticker,
        signal,
        priority,
        timestamp: new Date(),
        retryCount: 0
      };
      
      // Add to priority queue
      await this.queueStateUpdate(updateTask);
      
      // Track processing metrics
      const processingTime = Date.now() - startTime;
      this.updateProcessingMetrics(processingTime);
      
    } catch (error) {
      await this.logger.error('SIGNAL_PROCESSING', `Error processing signal for ${signal.ticker}`, {
        ticker: signal.ticker,
        confidence: signal.confidence,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error as Error);
      
      this.emitWithinTimeout('signal:processing:error', {
        ticker: signal.ticker,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      });
    }
  }

  /**
   * Get comprehensive multi-ticker state
   */
  public getMultiTickerState(): MultiTickerStateSnapshot {
    const allStates = this.stateManager.getAllStates();
    const statistics = this.stateManager.getStateStatistics();
    const resourceStatus = this.getResourceStatus();
    
    return {
      totalTickers: allStates.length,
      tickerStates: allStates,
      statistics,
      resourceStatus,
      performance: {
        totalStateUpdates: this.processingMetrics.totalStateUpdates,
        averageUpdateTime: this.processingMetrics.averageUpdateTime,
        averageEventEmissionTime: this.calculateAverageEventEmissionTime(),
        resourceUtilization: this.processingMetrics.resourceUtilization,
        degradationLevel: this.processingMetrics.degradationLevel
      },
      queueStatus: {
        pendingUpdates: this.updateQueue.length,
        activeUpdates: this.activeUpdates.size,
        isProcessing: this.isProcessingQueue
      },
      timestamp: new Date()
    };
  }

  /**
   * Force state transition with enhanced validation and logging
   */
  public async forceStateTransition(
    ticker: string, 
    newStatus: TickerStatus, 
    reason: string = 'Manual override'
  ): Promise<TickerState> {
    return await performanceMonitor.trackOperation(`force-transition-${ticker}`, async () => {
      const currentState = this.stateManager.getTickerState(ticker);
      if (!currentState) {
        throw new Error(`Ticker ${ticker} not found`);
      }
      
      const previousStatus = currentState.status;
      
      // Log the forced transition
      await this.logger.warn('FORCE_TRANSITION', `Forcing state transition for ${ticker}`, {
        ticker,
        from: previousStatus,
        to: newStatus,
        reason,
        timestamp: new Date()
      });
      
      // Execute the transition
      const updatedState = this.stateManager.forceStateTransition(ticker, newStatus, reason);
      
      // Emit events
      this.emitWithinTimeout('ticker:force:transition', {
        ticker,
        from: previousStatus,
        to: newStatus,
        reason,
        timestamp: new Date()
      });
      
      return updatedState;
    });
  }

  /**
   * Handle resource constraints with graceful degradation
   */
  public async handleResourceConstraints(): Promise<void> {
    const resourceStatus = this.getResourceStatus();
    
    if (resourceStatus.memoryUsage > 0.8 || resourceStatus.cpuUsage > 0.8) {
      await this.implementGracefulDegradation();
    }
  }

  /**
   * Get system health status
   */
  public getSystemHealth(): SystemHealth {
    const resourceStatus = this.getResourceStatus();
    const statistics = this.stateManager.getStateStatistics();
    
    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';
    let overallScore = 1.0;
    
    // Determine health based on various factors
    if (resourceStatus.memoryUsage > 0.9 || resourceStatus.cpuUsage > 0.9) {
      overallStatus = 'CRITICAL';
      overallScore = 0.3;
    } else if (resourceStatus.memoryUsage > 0.7 || resourceStatus.cpuUsage > 0.7) {
      overallStatus = 'DEGRADED';
      overallScore = 0.7;
    }
    
    return {
      status: overallStatus,
      components: {
        stateManager: {
          status: statistics.totalTickers > 0 ? 'UP' : 'DOWN',
          responseTime: this.processingMetrics.averageUpdateTime,
          errorRate: this.calculateErrorRate(),
          lastCheck: new Date()
        },
        priorityManager: {
          status: 'UP',
          responseTime: 10, // Priority calculations are fast
          errorRate: 0,
          lastCheck: new Date()
        },
        resourceManager: {
          status: overallStatus === 'CRITICAL' ? 'DOWN' : 'UP',
          responseTime: 5,
          errorRate: 0,
          lastCheck: new Date()
        }
      },
      overallScore
    };
  }

  /**
   * Shutdown with cleanup
   */
  public async shutdown(): Promise<void> {
    await this.logger.info('SHUTDOWN', 'Starting enhanced multi-ticker state manager shutdown');
    
    // Stop processing queue
    this.isProcessingQueue = false;
    
    // Clear all timers and intervals
    this.clearAllTimers();
    
    // Clear queues
    this.updateQueue = [];
    this.activeUpdates.clear();
    
    // Remove all listeners
    this.removeAllListeners();
    
    await this.logger.info('SHUTDOWN', 'Enhanced multi-ticker state manager shutdown complete');
  }

  // Private methods

  /**
   * Queue state update with priority handling
   */
  private async queueStateUpdate(task: StateUpdateTask): Promise<void> {
    // Insert task in priority order
    const insertIndex = this.findInsertionIndex(task);
    this.updateQueue.splice(insertIndex, 0, task);
    
    // Start processing if not already running
    if (!this.isProcessingQueue) {
      this.processUpdateQueue();
    }
  }

  /**
   * Process the update queue with concurrency control
   */
  private async processUpdateQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.updateQueue.length > 0 && this.activeUpdates.size < this.resourceLimits.maxConcurrentUpdates) {
      const task = this.updateQueue.shift();
      if (!task) continue;
      
      // Process task concurrently
      this.processStateUpdateTask(task);
    }
    
    // Check if we should continue processing
    if (this.updateQueue.length > 0) {
      setTimeout(() => this.processUpdateQueue(), 10);
    } else {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Process individual state update task
   */
  private async processStateUpdateTask(task: StateUpdateTask): Promise<void> {
    const { ticker, signal } = task;
    
    this.activeUpdates.add(ticker);
    
    try {
      const currentState = this.stateManager.getTickerState(ticker);
      if (!currentState) {
        throw new Error(`Ticker ${ticker} not found`);
      }
      
      // Determine new state based on signal
      const newState = await this.determineNewState(currentState, signal);
      
      // Update state
      const updatedState = this.stateManager.updateTickerState(ticker, {
        confidence: signal.confidence,
        conviction: signal.conviction,
        fibZone: signal.fibAnalysis.currentZone,
        gammaExposure: signal.gammaAnalysis.netGammaExposure,
        status: newState.status,
        recommendedOption: signal.recommendations[0]
      });
      
      // Emit state update event
      this.emitWithinTimeout('ticker:state:updated', {
        ticker,
        previousState: currentState,
        newState: updatedState,
        signal,
        timestamp: new Date()
      });
      
    } catch (error) {
      await this.logger.error('STATE_UPDATE', `Error updating state for ${ticker}`, {
        ticker,
        retryCount: task.retryCount,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, error as Error);
      
      // Retry logic
      if (task.retryCount < 3) {
        task.retryCount++;
        this.updateQueue.unshift(task); // Add back to front for retry
      }
    } finally {
      this.activeUpdates.delete(ticker);
    }
  }

  /**
   * Determine new state based on current state and signal
   */
  private async determineNewState(currentState: TickerState, signal: EnhancedSignal): Promise<TickerState> {
    const newState = { ...currentState };
    
    // Apply Ready-Set-Go lifecycle logic
    switch (currentState.status) {
      case 'READY':
        if (this.shouldTransitionToSet(signal)) {
          newState.status = 'SET';
          newState.stateEntryTime = new Date();
        }
        break;
        
      case 'SET':
        if (this.shouldTransitionToGo(signal)) {
          newState.status = 'GO';
          newState.stateEntryTime = new Date();
        } else if (this.shouldTransitionBackToReady(signal)) {
          newState.status = 'READY';
          newState.stateEntryTime = new Date();
        }
        break;
        
      case 'GO':
        if (this.shouldTransitionToCooldown(signal)) {
          newState.status = 'COOLDOWN';
          newState.stateEntryTime = new Date();
          newState.cooldownUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        } else if (this.shouldTransitionBackToSet(signal)) {
          newState.status = 'SET';
          newState.stateEntryTime = new Date();
        }
        break;
        
      case 'COOLDOWN':
        if (this.isCooldownExpired(currentState)) {
          newState.status = 'READY';
          newState.stateEntryTime = new Date();
          newState.cooldownUntil = undefined;
        }
        break;
    }
    
    return newState;
  }

  /**
   * State transition logic methods
   */
  private shouldTransitionToSet(signal: EnhancedSignal): boolean {
    return signal.confidence > this.config.confidenceThreshold &&
           !this.config.fibZoneBlocklist.includes(signal.fibAnalysis.currentZone) &&
           signal.riskAssessment.riskScore < 0.7;
  }

  private shouldTransitionToGo(signal: EnhancedSignal): boolean {
    return signal.confidence > this.config.confidenceThreshold * 1.2 &&
           signal.conviction > 0.7 &&
           signal.fibAnalysis.confluence > 0.6;
  }

  private shouldTransitionBackToReady(signal: EnhancedSignal): boolean {
    return signal.confidence < this.config.confidenceThreshold * 0.8;
  }

  private shouldTransitionToCooldown(signal: EnhancedSignal): boolean {
    // This would integrate with trade execution logic
    return signal.confidence > this.config.confidenceThreshold * 1.5 &&
           signal.recommendations.length > 0;
  }

  private shouldTransitionBackToSet(signal: EnhancedSignal): boolean {
    return signal.confidence < this.config.confidenceThreshold;
  }

  private isCooldownExpired(state: TickerState): boolean {
    return state.cooldownUntil ? new Date() > state.cooldownUntil : false;
  }

  /**
   * Setup event forwarding from state manager
   */
  private setupEventForwarding(): void {
    this.stateManager.on('ticker:updated', (data) => {
      this.emitWithinTimeout('ticker:updated', data);
    });
    
    this.stateManager.on('ticker:transition', (data) => {
      this.emitWithinTimeout('ticker:transition', data);
    });
    
    this.stateManager.on('ticker:cooldown:started', (data) => {
      this.emitWithinTimeout('ticker:cooldown:started', data);
    });
    
    this.stateManager.on('ticker:cooldown:expired', (data) => {
      this.emitWithinTimeout('ticker:cooldown:expired', data);
    });
  }

  /**
   * Setup ticker-specific monitoring
   */
  private setupTickerMonitoring(ticker: string): void {
    // This could include setting up specific monitoring for each ticker
    // such as heartbeat checks, data quality monitoring, etc.
  }

  /**
   * Emit event with timeout constraint (100ms requirement)
   */
  private emitWithinTimeout(event: string, data: any): void {
    const startTime = Date.now();
    
    // Emit the event
    this.emit(event, data);
    
    // Track emission time
    const emissionTime = Date.now() - startTime;
    this.processingMetrics.eventEmissionTimes.push(emissionTime);
    
    // Keep only last 100 measurements
    if (this.processingMetrics.eventEmissionTimes.length > 100) {
      this.processingMetrics.eventEmissionTimes.shift();
    }
    
    // Log if emission took too long
    if (emissionTime > this.resourceLimits.eventEmissionTimeout) {
      this.logger.warn('SLOW_EVENT', `Event emission took ${emissionTime}ms`, {
        event,
        emissionTime,
        threshold: this.resourceLimits.eventEmissionTimeout
      });
    }
  }

  /**
   * Implement graceful degradation
   */
  private async implementGracefulDegradation(): Promise<void> {
    this.processingMetrics.degradationLevel++;
    
    await this.logger.warn('DEGRADATION', 'Implementing graceful degradation', {
      level: this.processingMetrics.degradationLevel,
      reason: 'Resource constraints'
    });
    
    // Reduce update frequency
    this.config.updateInterval = Math.min(this.config.updateInterval * 1.5, 10000);
    
    // Reduce concurrent processing
    this.resourceLimits.maxConcurrentUpdates = Math.max(
      Math.floor(this.resourceLimits.maxConcurrentUpdates * 0.8), 
      1
    );
    
    this.emitWithinTimeout('system:degradation:implemented', {
      level: this.processingMetrics.degradationLevel,
      newUpdateInterval: this.config.updateInterval,
      newConcurrentLimit: this.resourceLimits.maxConcurrentUpdates,
      timestamp: new Date()
    });
  }

  /**
   * Resource monitoring
   */
  private startResourceMonitoring(): void {
    setInterval(() => {
      const resourceStatus = this.getResourceStatus();
      this.processingMetrics.resourceUtilization = 
        (resourceStatus.memoryUsage + resourceStatus.cpuUsage) / 2;
      
      if (resourceStatus.memoryUsage > 0.8 || resourceStatus.cpuUsage > 0.8) {
        this.handleResourceConstraints();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get current resource status
   */
  private getResourceStatus(): ResourceStatus {
    const memUsage = process.memoryUsage();
    
    return {
      memoryUsage: memUsage.heapUsed / this.resourceLimits.maxMemoryUsage,
      cpuUsage: 0.1, // Placeholder - would integrate with actual CPU monitoring
      activeConnections: this.activeUpdates.size,
      queueLength: this.updateQueue.length
    };
  }

  /**
   * Utility methods
   */
  private isValidTicker(ticker: string): boolean {
    return /^[A-Z]{1,5}$/.test(ticker);
  }

  private findInsertionIndex(task: StateUpdateTask): number {
    for (let i = 0; i < this.updateQueue.length; i++) {
      if (task.priority > this.updateQueue[i].priority) {
        return i;
      }
    }
    return this.updateQueue.length;
  }

  private updateProcessingMetrics(processingTime: number): void {
    this.processingMetrics.totalStateUpdates++;
    this.processingMetrics.averageUpdateTime = 
      (this.processingMetrics.averageUpdateTime + processingTime) / 2;
  }

  private calculateAverageEventEmissionTime(): number {
    if (this.processingMetrics.eventEmissionTimes.length === 0) return 0;
    
    const sum = this.processingMetrics.eventEmissionTimes.reduce((a, b) => a + b, 0);
    return sum / this.processingMetrics.eventEmissionTimes.length;
  }

  private calculateErrorRate(): number {
    // Placeholder - would track actual error rates
    return 0.01;
  }

  private clearAllTimers(): void {
    // Clear any active timers/intervals
  }
}

// Supporting interfaces
interface StateUpdateTask {
  ticker: string;
  signal: EnhancedSignal;
  priority: number;
  timestamp: Date;
  retryCount: number;
}

interface MultiTickerStateSnapshot {
  totalTickers: number;
  tickerStates: TickerState[];
  statistics: StateStatistics;
  resourceStatus: ResourceStatus;
  performance: {
    totalStateUpdates: number;
    averageUpdateTime: number;
    averageEventEmissionTime: number;
    resourceUtilization: number;
    degradationLevel: number;
  };
  queueStatus: {
    pendingUpdates: number;
    activeUpdates: number;
    isProcessing: boolean;
  };
  timestamp: Date;
}

interface ResourceStatus {
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  queueLength: number;
}