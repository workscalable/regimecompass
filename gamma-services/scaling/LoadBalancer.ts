import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { performance } from 'perf_hooks';

export interface WorkerNode {
  id: string;
  worker: Worker;
  status: 'IDLE' | 'BUSY' | 'OVERLOADED' | 'FAILED';
  currentLoad: number;
  tickersAssigned: string[];
  lastHealthCheck: Date;
  metrics: WorkerMetrics;
}

export interface WorkerMetrics {
  processedSignals: number;
  averageProcessingTime: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface LoadBalancingConfig {
  maxWorkersPerNode: number;
  maxTickersPerWorker: number;
  healthCheckInterval: number;
  loadThreshold: number;
  failoverTimeout: number;
  scalingPolicy: 'CONSERVATIVE' | 'AGGRESSIVE' | 'ADAPTIVE';
}

export class LoadBalancer extends EventEmitter {
  private workers: Map<string, WorkerNode> = new Map();
  private tickerAssignments: Map<string, string> = new Map();
  private config: LoadBalancingConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private scalingTimer?: NodeJS.Timeout;

  constructor(config: LoadBalancingConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    console.log('Initializing Load Balancer...');
    
    // Start with minimum worker pool
    await this.createInitialWorkerPool();
    
    // Start health monitoring
    this.startHealthChecking();
    
    // Start auto-scaling monitoring
    this.startAutoScaling();
    
    this.emit('initialized');
  }

  public async assignTicker(ticker: string): Promise<string> {
    const optimalWorker = this.findOptimalWorker();
    
    if (!optimalWorker) {
      // Need to scale up
      const newWorker = await this.createWorker();
      return this.assignTickerToWorker(ticker, newWorker.id);
    }
    
    return this.assignTickerToWorker(ticker, optimalWorker.id);
  }

  public async removeTicker(ticker: string): Promise<void> {
    const workerId = this.tickerAssignments.get(ticker);
    if (!workerId) return;
    
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.tickersAssigned = worker.tickersAssigned.filter(t => t !== ticker);
      worker.currentLoad = this.calculateWorkerLoad(worker);
      
      // Send message to worker to stop processing this ticker
      worker.worker.postMessage({
        type: 'REMOVE_TICKER',
        ticker
      });
    }
    
    this.tickerAssignments.delete(ticker);
    
    // Check if we can scale down
    await this.checkScaleDown();
  }

  public getWorkerStats(): WorkerNode[] {
    return Array.from(this.workers.values());
  }

  public getLoadDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const [workerId, worker] of this.workers) {
      distribution[workerId] = worker.currentLoad;
    }
    
    return distribution;
  }

  public async rebalanceLoad(): Promise<void> {
    console.log('Rebalancing load across workers...');
    
    const workers = Array.from(this.workers.values());
    const overloadedWorkers = workers.filter(w => w.currentLoad > this.config.loadThreshold);
    const underutilizedWorkers = workers.filter(w => w.currentLoad < 0.3);
    
    for (const overloaded of overloadedWorkers) {
      const tickersToMove = Math.ceil(overloaded.tickersAssigned.length * 0.3);
      const tickersToReassign = overloaded.tickersAssigned.slice(0, tickersToMove);
      
      for (const ticker of tickersToReassign) {
        const targetWorker = underutilizedWorkers.find(w => 
          w.tickersAssigned.length < this.config.maxTickersPerWorker
        );
        
        if (targetWorker) {
          await this.reassignTicker(ticker, overloaded.id, targetWorker.id);
        }
      }
    }
    
    this.emit('loadRebalanced');
  }

  private async createInitialWorkerPool(): Promise<void> {
    const initialWorkerCount = 2;
    
    for (let i = 0; i < initialWorkerCount; i++) {
      await this.createWorker();
    }
  }

  private async createWorker(): Promise<WorkerNode> {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const worker = new Worker('./gamma-services/workers/TickerProcessingWorker.js');
    
    const workerNode: WorkerNode = {
      id: workerId,
      worker,
      status: 'IDLE',
      currentLoad: 0,
      tickersAssigned: [],
      lastHealthCheck: new Date(),
      metrics: {
        processedSignals: 0,
        averageProcessingTime: 0,
        errorRate: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    };
    
    // Set up worker message handling
    worker.on('message', (message) => {
      this.handleWorkerMessage(workerId, message);
    });
    
    worker.on('error', (error) => {
      this.handleWorkerError(workerId, error);
    });
    
    worker.on('exit', (code) => {
      this.handleWorkerExit(workerId, code);
    });
    
    this.workers.set(workerId, workerNode);
    
    console.log(`Created worker: ${workerId}`);
    this.emit('workerCreated', workerNode);
    
    return workerNode;
  }

  private findOptimalWorker(): WorkerNode | null {
    const availableWorkers = Array.from(this.workers.values())
      .filter(w => w.status === 'IDLE' || w.status === 'BUSY')
      .filter(w => w.tickersAssigned.length < this.config.maxTickersPerWorker)
      .filter(w => w.currentLoad < this.config.loadThreshold);
    
    if (availableWorkers.length === 0) return null;
    
    // Find worker with lowest load
    return availableWorkers.reduce((optimal, current) => 
      current.currentLoad < optimal.currentLoad ? current : optimal
    );
  }

  private assignTickerToWorker(ticker: string, workerId: string): string {
    const worker = this.workers.get(workerId);
    if (!worker) throw new Error(`Worker ${workerId} not found`);
    
    worker.tickersAssigned.push(ticker);
    worker.currentLoad = this.calculateWorkerLoad(worker);
    worker.status = worker.currentLoad > this.config.loadThreshold ? 'OVERLOADED' : 'BUSY';
    
    this.tickerAssignments.set(ticker, workerId);
    
    // Send message to worker to start processing this ticker
    worker.worker.postMessage({
      type: 'ADD_TICKER',
      ticker
    });
    
    console.log(`Assigned ticker ${ticker} to worker ${workerId}`);
    this.emit('tickerAssigned', { ticker, workerId });
    
    return workerId;
  }

  private async reassignTicker(ticker: string, fromWorkerId: string, toWorkerId: string): Promise<void> {
    const fromWorker = this.workers.get(fromWorkerId);
    const toWorker = this.workers.get(toWorkerId);
    
    if (!fromWorker || !toWorker) return;
    
    // Remove from source worker
    fromWorker.tickersAssigned = fromWorker.tickersAssigned.filter(t => t !== ticker);
    fromWorker.currentLoad = this.calculateWorkerLoad(fromWorker);
    fromWorker.worker.postMessage({ type: 'REMOVE_TICKER', ticker });
    
    // Add to target worker
    toWorker.tickersAssigned.push(ticker);
    toWorker.currentLoad = this.calculateWorkerLoad(toWorker);
    toWorker.worker.postMessage({ type: 'ADD_TICKER', ticker });
    
    this.tickerAssignments.set(ticker, toWorkerId);
    
    console.log(`Reassigned ticker ${ticker} from ${fromWorkerId} to ${toWorkerId}`);
    this.emit('tickerReassigned', { ticker, fromWorkerId, toWorkerId });
  }

  private calculateWorkerLoad(worker: WorkerNode): number {
    const tickerLoad = worker.tickersAssigned.length / this.config.maxTickersPerWorker;
    const processingLoad = worker.metrics.averageProcessingTime / 1000; // Convert to seconds
    const errorLoad = worker.metrics.errorRate;
    
    return Math.min(1.0, tickerLoad * 0.6 + processingLoad * 0.3 + errorLoad * 0.1);
  }

  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = Array.from(this.workers.entries()).map(
      ([workerId, worker]) => this.checkWorkerHealth(workerId, worker)
    );
    
    await Promise.allSettled(healthCheckPromises);
  }

  private async checkWorkerHealth(workerId: string, worker: WorkerNode): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Send health check message
      worker.worker.postMessage({ type: 'HEALTH_CHECK' });
      
      // Wait for response with timeout
      const response = await this.waitForWorkerResponse(worker.worker, 'HEALTH_RESPONSE', 5000);
      
      const responseTime = performance.now() - startTime;
      
      // Update worker metrics
      worker.metrics = {
        ...worker.metrics,
        ...response.metrics,
        averageProcessingTime: responseTime
      };
      
      worker.lastHealthCheck = new Date();
      worker.status = this.determineWorkerStatus(worker);
      
    } catch (error) {
      console.error(`Health check failed for worker ${workerId}:`, error);
      worker.status = 'FAILED';
      await this.handleFailedWorker(workerId);
    }
  }

  private determineWorkerStatus(worker: WorkerNode): WorkerNode['status'] {
    if (worker.metrics.errorRate > 0.1) return 'FAILED';
    if (worker.currentLoad > this.config.loadThreshold) return 'OVERLOADED';
    if (worker.tickersAssigned.length === 0) return 'IDLE';
    return 'BUSY';
  }

  private async handleFailedWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;
    
    console.log(`Handling failed worker: ${workerId}`);
    
    // Reassign tickers to other workers
    for (const ticker of worker.tickersAssigned) {
      const newWorker = this.findOptimalWorker() || await this.createWorker();
      await this.assignTickerToWorker(ticker, newWorker.id);
    }
    
    // Terminate failed worker
    worker.worker.terminate();
    this.workers.delete(workerId);
    
    this.emit('workerFailed', { workerId, tickersReassigned: worker.tickersAssigned });
  }

  private startAutoScaling(): void {
    this.scalingTimer = setInterval(async () => {
      await this.evaluateScaling();
    }, 30000); // Check every 30 seconds
  }

  private async evaluateScaling(): Promise<void> {
    const workers = Array.from(this.workers.values());
    const activeWorkers = workers.filter(w => w.status !== 'FAILED');
    
    const averageLoad = activeWorkers.reduce((sum, w) => sum + w.currentLoad, 0) / activeWorkers.length;
    const overloadedWorkers = activeWorkers.filter(w => w.currentLoad > this.config.loadThreshold);
    
    // Scale up conditions
    if (overloadedWorkers.length > activeWorkers.length * 0.5 || averageLoad > 0.8) {
      await this.scaleUp();
    }
    
    // Scale down conditions
    else if (averageLoad < 0.3 && activeWorkers.length > 2) {
      await this.scaleDown();
    }
  }

  private async scaleUp(): Promise<void> {
    const currentWorkerCount = this.workers.size;
    const maxWorkers = this.config.maxWorkersPerNode;
    
    if (currentWorkerCount >= maxWorkers) {
      console.log('Cannot scale up: Maximum worker limit reached');
      return;
    }
    
    console.log('Scaling up: Creating additional worker');
    await this.createWorker();
    
    // Trigger load rebalancing
    setTimeout(() => this.rebalanceLoad(), 5000);
    
    this.emit('scaledUp', { newWorkerCount: this.workers.size });
  }

  private async scaleDown(): Promise<void> {
    const workers = Array.from(this.workers.values());
    const idleWorkers = workers.filter(w => w.status === 'IDLE');
    
    if (idleWorkers.length === 0) return;
    
    const workerToRemove = idleWorkers[0];
    
    console.log(`Scaling down: Removing worker ${workerToRemove.id}`);
    
    workerToRemove.worker.terminate();
    this.workers.delete(workerToRemove.id);
    
    this.emit('scaledDown', { removedWorkerId: workerToRemove.id, newWorkerCount: this.workers.size });
  }

  private async checkScaleDown(): Promise<void> {
    const workers = Array.from(this.workers.values());
    const idleWorkers = workers.filter(w => w.tickersAssigned.length === 0);
    
    if (idleWorkers.length > 1 && workers.length > 2) {
      const workerToRemove = idleWorkers[0];
      workerToRemove.worker.terminate();
      this.workers.delete(workerToRemove.id);
      
      console.log(`Removed idle worker: ${workerToRemove.id}`);
      this.emit('workerRemoved', workerToRemove.id);
    }
  }

  private async waitForWorkerResponse(worker: Worker, messageType: string, timeout: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Worker response timeout for ${messageType}`));
      }, timeout);
      
      const messageHandler = (message: any) => {
        if (message.type === messageType) {
          clearTimeout(timer);
          worker.off('message', messageHandler);
          resolve(message);
        }
      };
      
      worker.on('message', messageHandler);
    });
  }

  private handleWorkerMessage(workerId: string, message: any): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;
    
    switch (message.type) {
      case 'METRICS_UPDATE':
        worker.metrics = { ...worker.metrics, ...message.metrics };
        break;
      case 'STATUS_UPDATE':
        worker.status = message.status;
        break;
      case 'ERROR':
        console.error(`Worker ${workerId} error:`, message.error);
        this.emit('workerError', { workerId, error: message.error });
        break;
    }
  }

  private handleWorkerError(workerId: string, error: Error): void {
    console.error(`Worker ${workerId} encountered error:`, error);
    this.handleFailedWorker(workerId);
  }

  private handleWorkerExit(workerId: string, code: number): void {
    console.log(`Worker ${workerId} exited with code ${code}`);
    if (code !== 0) {
      this.handleFailedWorker(workerId);
    }
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Load Balancer...');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    if (this.scalingTimer) {
      clearInterval(this.scalingTimer);
    }
    
    // Gracefully terminate all workers
    const terminationPromises = Array.from(this.workers.values()).map(worker => {
      return new Promise<void>((resolve) => {
        worker.worker.once('exit', () => resolve());
        worker.worker.postMessage({ type: 'SHUTDOWN' });
        
        // Force terminate after 10 seconds
        setTimeout(() => {
          worker.worker.terminate();
          resolve();
        }, 10000);
      });
    });
    
    await Promise.all(terminationPromises);
    this.workers.clear();
    this.tickerAssignments.clear();
    
    this.emit('shutdown');
  }
}