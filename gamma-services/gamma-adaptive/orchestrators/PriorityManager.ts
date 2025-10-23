import { TickerState, TickerStatus } from '../types/core.js';

/**
 * Priority manager for intelligent resource allocation and ticker prioritization
 * Handles concurrent signal processing and trade execution prioritization
 */
export class PriorityManager {
  private priorityWeights: Map<string, number> = new Map();
  private processingQueue: PriorityQueue<TickerProcessingTask> = new PriorityQueue();
  private resourceLimits: ResourceLimits;
  private currentLoad: ResourceUsage = {
    activeTasks: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    networkRequests: 0
  };

  constructor(
    priorityWeights: Record<string, number> = {},
    resourceLimits: ResourceLimits = DEFAULT_RESOURCE_LIMITS
  ) {
    this.setPriorityWeights(priorityWeights);
    this.resourceLimits = resourceLimits;
  }

  /**
   * Set priority weights for tickers
   */
  public setPriorityWeights(weights: Record<string, number>): void {
    this.priorityWeights.clear();
    for (const [ticker, weight] of Object.entries(weights)) {
      this.priorityWeights.set(ticker, weight);
    }
  }

  /**
   * Calculate priority score for a ticker based on multiple factors
   */
  public calculatePriorityScore(state: TickerState): number {
    let score = 0;

    // Base priority weight (configured)
    const baseWeight = this.priorityWeights.get(state.ticker) || 1.0;
    score += baseWeight * 100;

    // Confidence factor (higher confidence = higher priority)
    score += state.confidence * 50;

    // Conviction factor (higher conviction = higher priority)
    score += state.conviction * 30;

    // Status factor (GO state gets highest priority)
    const statusPriority = {
      'GO': 100,      // Highest - ready to trade
      'SET': 75,      // High - building momentum
      'READY': 50,    // Medium - monitoring
      'COOLDOWN': 10  // Lowest - waiting
    };
    score += statusPriority[state.status];

    // Fibonacci zone factor (avoid exhaustion zones)
    const fibZonePriority = {
      'COMPRESSION': 20,     // High priority - good entry zone
      'MID_EXPANSION': 15,   // Medium-high priority
      'FULL_EXPANSION': 10,  // Medium priority
      'OVER_EXTENSION': 5,   // Low priority - risky
      'EXHAUSTION': -50      // Negative priority - avoid
    };
    score += fibZonePriority[state.fibZone];

    // Gamma exposure factor (negative gamma = trend acceleration)
    if (state.gammaExposure < 0) {
      score += Math.abs(state.gammaExposure) * 20; // Bonus for negative gamma
    } else {
      score -= state.gammaExposure * 10; // Penalty for positive gamma
    }

    // Time in state factor (longer in state = higher priority for progression)
    const timeInState = Date.now() - state.stateEntryTime.getTime();
    const timeBonus = Math.min(50, timeInState / (60 * 1000)); // Up to 50 points for 1+ minutes
    score += timeBonus;

    // Position factor (existing positions get monitoring priority)
    if (state.position && state.position.status === 'OPEN') {
      score += 25;
    }

    return Math.max(0, score);
  }

  /**
   * Prioritize tickers for processing
   */
  public prioritizeTickers(tickers: TickerState[]): TickerState[] {
    const scoredTickers = tickers.map(ticker => ({
      ticker,
      score: this.calculatePriorityScore(ticker)
    }));

    // Sort by priority score (highest first)
    scoredTickers.sort((a, b) => b.score - a.score);

    return scoredTickers.map(item => item.ticker);
  }

  /**
   * Prioritize ticker states for concurrent processing
   */
  public prioritizeTickerStates(states: TickerState[]): TickerState[] {
    const scoredStates = states.map(state => ({
      state,
      score: this.calculatePriorityScore(state)
    }));

    // Sort by priority score (highest first)
    scoredStates.sort((a, b) => b.score - a.score);

    return scoredStates.map(item => item.state);
  }

  /**
   * Calculate signal priority for enhanced signals
   */
  public calculateSignalPriority(signal: any): number {
    let priority = 0;

    // Base confidence priority
    priority += signal.confidence * 100;

    // Conviction bonus
    priority += signal.conviction * 50;

    // Fibonacci zone priority
    const fibZonePriority = {
      'COMPRESSION': 30,
      'MID_EXPANSION': 20,
      'FULL_EXPANSION': 10,
      'OVER_EXTENSION': 5,
      'EXHAUSTION': -20
    };
    priority += fibZonePriority[signal.fibAnalysis?.currentZone] || 0;

    // Risk assessment penalty
    if (signal.riskAssessment?.riskScore) {
      priority -= signal.riskAssessment.riskScore * 25;
    }

    // Recommendation quality bonus
    if (signal.recommendations?.length > 0) {
      priority += signal.recommendations.length * 10;
    }

    return Math.max(0, priority);
  }

  /**
   * Add processing task to priority queue
   */
  public addProcessingTask(task: TickerProcessingTask): void {
    const priority = this.calculateTaskPriority(task);
    this.processingQueue.enqueue(task, priority);
  }

  /**
   * Get next task from priority queue
   */
  public getNextTask(): TickerProcessingTask | null {
    if (this.processingQueue.isEmpty()) {
      return null;
    }

    // Check resource availability
    if (!this.canProcessTask()) {
      return null;
    }

    const task = this.processingQueue.dequeue();
    if (task) {
      this.allocateResources(task);
    }

    return task;
  }

  /**
   * Release resources when task completes
   */
  public releaseTaskResources(task: TickerProcessingTask): void {
    this.currentLoad.activeTasks = Math.max(0, this.currentLoad.activeTasks - 1);
    this.currentLoad.memoryUsage = Math.max(0, this.currentLoad.memoryUsage - task.estimatedMemory);
    this.currentLoad.cpuUsage = Math.max(0, this.currentLoad.cpuUsage - task.estimatedCpu);
    this.currentLoad.networkRequests = Math.max(0, this.currentLoad.networkRequests - task.networkRequests);
  }

  /**
   * Get current resource usage
   */
  public getResourceUsage(): ResourceUsage {
    return { ...this.currentLoad };
  }

  /**
   * Get queue statistics
   */
  public getQueueStatistics(): QueueStatistics {
    return {
      queueLength: this.processingQueue.size(),
      activeTasks: this.currentLoad.activeTasks,
      resourceUtilization: {
        memory: this.currentLoad.memoryUsage / this.resourceLimits.maxMemoryMB,
        cpu: this.currentLoad.cpuUsage / this.resourceLimits.maxCpuPercent,
        network: this.currentLoad.networkRequests / this.resourceLimits.maxNetworkRequests,
        tasks: this.currentLoad.activeTasks / this.resourceLimits.maxConcurrentTasks
      },
      isResourceConstrained: !this.canProcessTask()
    };
  }

  /**
   * Update resource limits
   */
  public updateResourceLimits(limits: Partial<ResourceLimits>): void {
    this.resourceLimits = { ...this.resourceLimits, ...limits };
  }

  /**
   * Calculate task priority based on type and urgency
   */
  private calculateTaskPriority(task: TickerProcessingTask): number {
    let priority = 0;

    // Task type priority
    const typePriority = {
      'SIGNAL_PROCESSING': 100,
      'TRADE_EXECUTION': 200,    // Highest priority
      'POSITION_UPDATE': 150,
      'RISK_CHECK': 175,
      'MARKET_DATA_UPDATE': 75,
      'ANALYTICS_UPDATE': 25     // Lowest priority
    };
    priority += typePriority[task.type] || 50;

    // Urgency factor
    if (task.urgent) {
      priority += 100;
    }

    // Age factor (older tasks get higher priority)
    const age = Date.now() - task.createdAt.getTime();
    const ageBonus = Math.min(50, age / (30 * 1000)); // Up to 50 points for 30+ seconds old
    priority += ageBonus;

    return priority;
  }

  /**
   * Check if system can process another task
   */
  private canProcessTask(): boolean {
    return (
      this.currentLoad.activeTasks < this.resourceLimits.maxConcurrentTasks &&
      this.currentLoad.memoryUsage < this.resourceLimits.maxMemoryMB &&
      this.currentLoad.cpuUsage < this.resourceLimits.maxCpuPercent &&
      this.currentLoad.networkRequests < this.resourceLimits.maxNetworkRequests
    );
  }

  /**
   * Allocate resources for task
   */
  private allocateResources(task: TickerProcessingTask): void {
    this.currentLoad.activeTasks++;
    this.currentLoad.memoryUsage += task.estimatedMemory;
    this.currentLoad.cpuUsage += task.estimatedCpu;
    this.currentLoad.networkRequests += task.networkRequests;
  }
}

/**
 * Priority queue implementation for task management
 */
class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number): void {
    const queueItem = { item, priority };
    
    // Find insertion point (higher priority first)
    let insertIndex = 0;
    while (insertIndex < this.items.length && this.items[insertIndex].priority >= priority) {
      insertIndex++;
    }
    
    this.items.splice(insertIndex, 0, queueItem);
  }

  dequeue(): T | null {
    const item = this.items.shift();
    return item ? item.item : null;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  peek(): T | null {
    return this.items.length > 0 ? this.items[0].item : null;
  }
}

// Supporting interfaces and types
export interface TickerProcessingTask {
  id: string;
  ticker: string;
  type: TaskType;
  urgent: boolean;
  createdAt: Date;
  estimatedMemory: number; // MB
  estimatedCpu: number;    // Percentage
  networkRequests: number;
  payload?: any;
}

export type TaskType = 
  | 'SIGNAL_PROCESSING'
  | 'TRADE_EXECUTION'
  | 'POSITION_UPDATE'
  | 'RISK_CHECK'
  | 'MARKET_DATA_UPDATE'
  | 'ANALYTICS_UPDATE';

export interface ResourceLimits {
  maxConcurrentTasks: number;
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxNetworkRequests: number;
}

export interface ResourceUsage {
  activeTasks: number;
  memoryUsage: number;    // MB
  cpuUsage: number;       // Percentage
  networkRequests: number;
}

export interface QueueStatistics {
  queueLength: number;
  activeTasks: number;
  resourceUtilization: {
    memory: number;    // 0-1
    cpu: number;       // 0-1
    network: number;   // 0-1
    tasks: number;     // 0-1
  };
  isResourceConstrained: boolean;
}

// Default resource limits
export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxConcurrentTasks: 10,
  maxMemoryMB: 512,
  maxCpuPercent: 80,
  maxNetworkRequests: 50
};