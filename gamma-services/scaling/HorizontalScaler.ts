import { EventEmitter } from 'events';
import { MetricsCollector } from '../monitoring/MetricsCollector';

/**
 * Horizontal Scaling System for Gamma Adaptive System
 * 
 * Provides horizontal scaling capabilities with:
 * - Load balancing for ticker processing
 * - Dynamic worker pool management
 * - Auto-scaling based on metrics
 * - Health monitoring and failover
 * - Resource optimization
 */

export interface WorkerNode {
  id: string;
  status: 'active' | 'inactive' | 'failed' | 'scaling';
  assignedTickers: string[];
  currentLoad: number;
  maxCapacity: number;
  lastHeartbeat: Date;
  metrics: {
    processedSignals: number;
    averageLatency: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  endpoint?: string; // For distributed workers
  pid?: number;      // For local workers
}

export interface ScalingConfig {
  minWorkers: number;
  maxWorkers: number;
  targetCpuUsage: number;
  targetLatency: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
  healthCheckInterval: number;
  maxTickersPerWorker: number;
  loadBalancingStrategy: 'round-robin' | 'least-loaded' | 'weighted';
}

export interface LoadBalancingResult {
  workerId: string;
  ticker: string;
  reason: string;
  currentLoad: number;
  estimatedLatency: number;
}

export class HorizontalScaler extends EventEmitter {
  private workers: Map<string, WorkerNode> = new Map();
  private tickerAssignments: Map<string, string> = new Map(); // ticker -> workerId
  private metricsCollector: MetricsCollector;
  private config: ScalingConfig;
  
  private scalingTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastScalingAction: Date = new Date(0);
  
  constructor(metricsCollector: MetricsCollector, config: ScalingConfig) {
    super();
    this.metricsCollector = metricsCollector;
    this.config = config;
  }

  /**
   * Start the horizontal scaling system
   */
  public start(): void {
    // Initialize with minimum workers
    this.initializeWorkers();
    
    // Start scaling monitor
    this.scalingTimer = setInterval(() => {
      this.evaluateScaling();
    }, 30000); // Check every 30 seconds
    
    // Start health check monitor
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
    
    this.emit('started', {
      workerCount: this.workers.size,
      timestamp: new Date()
    });
  }

  /**
   * Stop the horizontal scaling system
   */
  public stop(): void {
    if (this.scalingTimer) {
      clearInterval(this.scalingTimer);
      this.scalingTimer = null;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    this.emit('stopped', { timestamp: new Date() });
  }

  /**
   * Assign ticker to optimal worker using load balancing
   */
  public assignTicker(ticker: string): LoadBalancingResult {
    const availableWorkers = Array.from(this.workers.values())
      .filter(worker => worker.status === 'active' && worker.assignedTickers.length < this.config.maxTickersPerWorker);
    
    if (availableWorkers.length === 0) {
      // Try to scale up if possible
      if (this.workers.size < this.config.maxWorkers) {
        this.scaleUp(1, 'No available workers for ticker assignment');
        // For now, assign to least loaded worker even if over capacity
        const leastLoaded = this.findLeastLoadedWorker();
        return this.assignTickerToWorker(ticker, leastLoaded.id, 'Emergency assignment - scaling up');
      } else {
        // Assign to least loaded worker even if over capacity
        const leastLoaded = this.findLeastLoadedWorker();
        return this.assignTickerToWorker(ticker, leastLoaded.id, 'No capacity - assigned to least loaded');
      }
    }
    
    let selectedWorker: WorkerNode;
    let reason: string;
    
    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        selectedWorker = this.selectRoundRobin(availableWorkers);
        reason = 'Round-robin selection';
        break;
      case 'least-loaded':
        selectedWorker = this.selectLeastLoaded(availableWorkers);
        reason = 'Least loaded selection';
        break;
      case 'weighted':
        selectedWorker = this.selectWeighted(availableWorkers);
        reason = 'Weighted selection based on performance';
        break;
      default:
        selectedWorker = availableWorkers[0];
        reason = 'Default selection';
    }
    
    return this.assignTickerToWorker(ticker, selectedWorker.id, reason);
  }

  /**
   * Remove ticker assignment
   */
  public unassignTicker(ticker: string): boolean {
    const workerId = this.tickerAssignments.get(ticker);
    if (!workerId) {
      return false;
    }
    
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.assignedTickers = worker.assignedTickers.filter(t => t !== ticker);
      worker.currentLoad = this.calculateWorkerLoad(worker);
    }
    
    this.tickerAssignments.delete(ticker);
    
    this.emit('tickerUnassigned', {
      ticker,
      workerId,
      timestamp: new Date()
    });
    
    return true;
  }

  /**
   * Get current scaling status
   */
  public getScalingStatus(): {
    totalWorkers: number;
    activeWorkers: number;
    failedWorkers: number;
    totalTickers: number;
    averageLoad: number;
    canScaleUp: boolean;
    canScaleDown: boolean;
    lastScalingAction: Date;
  } {
    const activeWorkers = Array.from(this.workers.values()).filter(w => w.status === 'active');
    const failedWorkers = Array.from(this.workers.values()).filter(w => w.status === 'failed');
    const totalLoad = activeWorkers.reduce((sum, w) => sum + w.currentLoad, 0);
    
    return {
      totalWorkers: this.workers.size,
      activeWorkers: activeWorkers.length,
      failedWorkers: failedWorkers.length,
      totalTickers: this.tickerAssignments.size,
      averageLoad: activeWorkers.length > 0 ? totalLoad / activeWorkers.length : 0,
      canScaleUp: this.workers.size < this.config.maxWorkers,
      canScaleDown: this.workers.size > this.config.minWorkers,
      lastScalingAction: this.lastScalingAction
    };
  }

  /**
   * Get worker details
   */
  public getWorkerDetails(): WorkerNode[] {
    return Array.from(this.workers.values());
  }

  /**
   * Get ticker assignments
   */
  public getTickerAssignments(): Record<string, string> {
    const assignments: Record<string, string> = {};
    for (const [ticker, workerId] of this.tickerAssignments.entries()) {
      assignments[ticker] = workerId;
    }
    return assignments;
  }

  /**
   * Force scaling action
   */
  public forceScale(action: 'up' | 'down', count: number, reason: string): boolean {
    if (action === 'up') {
      return this.scaleUp(count, reason);
    } else {
      return this.scaleDown(count, reason);
    }
  }  // Pri
vate methods

  private initializeWorkers(): void {
    for (let i = 0; i < this.config.minWorkers; i++) {
      const worker = this.createWorker(`worker-${i}`);
      this.workers.set(worker.id, worker);
    }
    
    this.emit('workersInitialized', {
      count: this.config.minWorkers,
      timestamp: new Date()
    });
  }

  private createWorker(id: string): WorkerNode {
    return {
      id,
      status: 'active',
      assignedTickers: [],
      currentLoad: 0,
      maxCapacity: this.config.maxTickersPerWorker,
      lastHeartbeat: new Date(),
      metrics: {
        processedSignals: 0,
        averageLatency: 0,
        errorRate: 0,
        cpuUsage: 0,
        memoryUsage: 0
      }
    };
  }

  private evaluateScaling(): void {
    const now = new Date();
    const timeSinceLastAction = now.getTime() - this.lastScalingAction.getTime();
    
    // Respect cooldown period
    if (timeSinceLastAction < this.config.cooldownPeriod) {
      return;
    }
    
    const metrics = this.metricsCollector.getCurrentMetrics();
    const activeWorkers = Array.from(this.workers.values()).filter(w => w.status === 'active');
    
    if (activeWorkers.length === 0) {
      return; // No active workers to evaluate
    }
    
    // Calculate average metrics
    const avgCpuUsage = activeWorkers.reduce((sum, w) => sum + w.metrics.cpuUsage, 0) / activeWorkers.length;
    const avgLatency = metrics.latency.averages.tickToDecision;
    const avgLoad = activeWorkers.reduce((sum, w) => sum + w.currentLoad, 0) / activeWorkers.length;
    
    // Evaluate scale up conditions
    const shouldScaleUp = (
      avgCpuUsage > this.config.scaleUpThreshold ||
      avgLatency > this.config.targetLatency ||
      avgLoad > 0.8
    ) && this.workers.size < this.config.maxWorkers;
    
    // Evaluate scale down conditions
    const shouldScaleDown = (
      avgCpuUsage < this.config.scaleDownThreshold &&
      avgLatency < this.config.targetLatency * 0.5 &&
      avgLoad < 0.3
    ) && this.workers.size > this.config.minWorkers;
    
    if (shouldScaleUp) {
      const scaleCount = Math.min(2, this.config.maxWorkers - this.workers.size);
      this.scaleUp(scaleCount, `High resource usage: CPU ${avgCpuUsage.toFixed(1)}%, Latency ${avgLatency.toFixed(1)}ms`);
    } else if (shouldScaleDown) {
      const scaleCount = Math.min(1, this.workers.size - this.config.minWorkers);
      this.scaleDown(scaleCount, `Low resource usage: CPU ${avgCpuUsage.toFixed(1)}%, Latency ${avgLatency.toFixed(1)}ms`);
    }
  }

  private scaleUp(count: number, reason: string): boolean {
    if (this.workers.size >= this.config.maxWorkers) {
      return false;
    }
    
    const actualCount = Math.min(count, this.config.maxWorkers - this.workers.size);
    
    for (let i = 0; i < actualCount; i++) {
      const workerId = `worker-${Date.now()}-${i}`;
      const worker = this.createWorker(workerId);
      this.workers.set(workerId, worker);
    }
    
    this.lastScalingAction = new Date();
    
    this.emit('scaledUp', {
      count: actualCount,
      reason,
      totalWorkers: this.workers.size,
      timestamp: new Date()
    });
    
    return true;
  }

  private scaleDown(count: number, reason: string): boolean {
    if (this.workers.size <= this.config.minWorkers) {
      return false;
    }
    
    const actualCount = Math.min(count, this.workers.size - this.config.minWorkers);
    
    // Select workers to remove (least loaded first)
    const activeWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'active')
      .sort((a, b) => a.currentLoad - b.currentLoad);
    
    const workersToRemove = activeWorkers.slice(0, actualCount);
    
    for (const worker of workersToRemove) {
      // Reassign tickers from this worker
      for (const ticker of worker.assignedTickers) {
        this.unassignTicker(ticker);
        // Reassign to another worker
        this.assignTicker(ticker);
      }
      
      // Remove worker
      this.workers.delete(worker.id);
    }
    
    this.lastScalingAction = new Date();
    
    this.emit('scaledDown', {
      count: actualCount,
      reason,
      totalWorkers: this.workers.size,
      removedWorkers: workersToRemove.map(w => w.id),
      timestamp: new Date()
    });
    
    return true;
  }

  private performHealthChecks(): void {
    for (const worker of this.workers.values()) {
      const timeSinceHeartbeat = Date.now() - worker.lastHeartbeat.getTime();
      
      // Mark worker as failed if no heartbeat for 2 minutes
      if (timeSinceHeartbeat > 120000 && worker.status === 'active') {
        worker.status = 'failed';
        
        this.emit('workerFailed', {
          workerId: worker.id,
          reason: 'Heartbeat timeout',
          assignedTickers: worker.assignedTickers,
          timestamp: new Date()
        });
        
        // Reassign tickers from failed worker
        for (const ticker of worker.assignedTickers) {
          this.unassignTicker(ticker);
          this.assignTicker(ticker);
        }
      }
    }
  }

  private assignTickerToWorker(ticker: string, workerId: string, reason: string): LoadBalancingResult {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker not found: ${workerId}`);
    }
    
    // Remove from previous assignment if exists
    this.unassignTicker(ticker);
    
    // Assign to new worker
    worker.assignedTickers.push(ticker);
    worker.currentLoad = this.calculateWorkerLoad(worker);
    this.tickerAssignments.set(ticker, workerId);
    
    const result: LoadBalancingResult = {
      workerId,
      ticker,
      reason,
      currentLoad: worker.currentLoad,
      estimatedLatency: this.estimateLatency(worker)
    };
    
    this.emit('tickerAssigned', {
      ...result,
      timestamp: new Date()
    });
    
    return result;
  }

  private findLeastLoadedWorker(): WorkerNode {
    const activeWorkers = Array.from(this.workers.values()).filter(w => w.status === 'active');
    return activeWorkers.reduce((least, current) => 
      current.currentLoad < least.currentLoad ? current : least
    );
  }

  private selectRoundRobin(workers: WorkerNode[]): WorkerNode {
    // Simple round-robin based on assignment count
    return workers.reduce((selected, current) => 
      current.assignedTickers.length < selected.assignedTickers.length ? current : selected
    );
  }

  private selectLeastLoaded(workers: WorkerNode[]): WorkerNode {
    return workers.reduce((least, current) => 
      current.currentLoad < least.currentLoad ? current : least
    );
  }

  private selectWeighted(workers: WorkerNode[]): WorkerNode {
    // Weight based on performance metrics
    const scoredWorkers = workers.map(worker => ({
      worker,
      score: this.calculateWorkerScore(worker)
    }));
    
    // Select worker with highest score (best performance)
    return scoredWorkers.reduce((best, current) => 
      current.score > best.score ? current : best
    ).worker;
  }

  private calculateWorkerLoad(worker: WorkerNode): number {
    return worker.assignedTickers.length / worker.maxCapacity;
  }

  private calculateWorkerScore(worker: WorkerNode): number {
    // Higher score = better worker
    let score = 100;
    
    // Penalize high latency
    score -= Math.min(worker.metrics.averageLatency / 10, 50);
    
    // Penalize high error rate
    score -= worker.metrics.errorRate * 100;
    
    // Penalize high resource usage
    score -= (worker.metrics.cpuUsage + worker.metrics.memoryUsage) / 2;
    
    // Penalize high load
    score -= worker.currentLoad * 20;
    
    return Math.max(score, 0);
  }

  private estimateLatency(worker: WorkerNode): number {
    // Estimate latency based on current load and historical performance
    const baseLatency = worker.metrics.averageLatency || 100;
    const loadMultiplier = 1 + (worker.currentLoad * 0.5); // 50% increase at full load
    
    return baseLatency * loadMultiplier;
  }

  /**
   * Update worker metrics (called by workers)
   */
  public updateWorkerMetrics(workerId: string, metrics: Partial<WorkerNode['metrics']>): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }
    
    worker.metrics = { ...worker.metrics, ...metrics };
    worker.lastHeartbeat = new Date();
    
    // Update status if worker was failed
    if (worker.status === 'failed') {
      worker.status = 'active';
      this.emit('workerRecovered', {
        workerId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get load balancing statistics
   */
  public getLoadBalancingStats(): {
    totalAssignments: number;
    averageLoad: number;
    loadDistribution: Record<string, number>;
    unbalancedWorkers: string[];
    recommendations: string[];
  } {
    const activeWorkers = Array.from(this.workers.values()).filter(w => w.status === 'active');
    const totalLoad = activeWorkers.reduce((sum, w) => sum + w.currentLoad, 0);
    const averageLoad = activeWorkers.length > 0 ? totalLoad / activeWorkers.length : 0;
    
    const loadDistribution: Record<string, number> = {};
    const unbalancedWorkers: string[] = [];
    
    for (const worker of activeWorkers) {
      loadDistribution[worker.id] = worker.currentLoad;
      
      // Consider worker unbalanced if load differs significantly from average
      if (Math.abs(worker.currentLoad - averageLoad) > 0.3) {
        unbalancedWorkers.push(worker.id);
      }
    }
    
    const recommendations: string[] = [];
    if (unbalancedWorkers.length > 0) {
      recommendations.push('Consider rebalancing ticker assignments');
    }
    if (averageLoad > 0.8) {
      recommendations.push('Consider scaling up - high average load');
    }
    if (averageLoad < 0.2 && activeWorkers.length > this.config.minWorkers) {
      recommendations.push('Consider scaling down - low average load');
    }
    
    return {
      totalAssignments: this.tickerAssignments.size,
      averageLoad,
      loadDistribution,
      unbalancedWorkers,
      recommendations
    };
  }

  /**
   * Rebalance ticker assignments
   */
  public rebalanceAssignments(): void {
    const tickers = Array.from(this.tickerAssignments.keys());
    
    // Clear all assignments
    for (const ticker of tickers) {
      this.unassignTicker(ticker);
    }
    
    // Reassign all tickers using current load balancing strategy
    for (const ticker of tickers) {
      this.assignTicker(ticker);
    }
    
    this.emit('assignmentsRebalanced', {
      tickerCount: tickers.length,
      timestamp: new Date()
    });
  }

  /**
   * Update scaling configuration
   */
  public updateConfig(newConfig: Partial<ScalingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Get scaling configuration
   */
  public getConfig(): ScalingConfig {
    return { ...this.config };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stop();
    this.workers.clear();
    this.tickerAssignments.clear();
    this.removeAllListeners();
  }
}