import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import { 
  TickerState, 
  EnhancedSignal, 
  SignalFactors 
} from '../types/core.js';
import { 
  PriorityManager, 
  TickerProcessingTask, 
  TaskType 
} from './PriorityManager.js';

/**
 * Concurrent processing engine for multi-ticker signal processing
 * Handles parallel processing with resource management and load balancing
 */
export class ConcurrentProcessor extends EventEmitter {
  private priorityManager: PriorityManager;
  private workerPool: WorkerPool;
  private processingTasks: Map<string, ProcessingContext> = new Map();
  private isRunning: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  private config: ConcurrentProcessingConfig;

  constructor(config: ConcurrentProcessingConfig) {
    super();
    this.config = config;
    this.priorityManager = new PriorityManager(
      config.priorityWeights,
      config.resourceLimits
    );
    this.workerPool = new WorkerPool(config.maxWorkers);
  }

  /**
   * Start concurrent processing
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Concurrent processor is already running');
    }

    console.log('Starting concurrent processing engine...');
    
    // Initialize worker pool
    await this.workerPool.initialize();
    
    this.isRunning = true;
    
    // Start processing loop
    this.processingInterval = setInterval(
      () => this.processTaskQueue(),
      this.config.processingInterval
    );

    this.emit('processor:started', {
      maxWorkers: this.config.maxWorkers,
      processingInterval: this.config.processingInterval
    });
  }

  /**
   * Stop concurrent processing
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping concurrent processing engine...');
    
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    // Wait for active tasks to complete
    await this.waitForActiveTasks();
    
    // Shutdown worker pool
    await this.workerPool.shutdown();

    this.emit('processor:stopped');
  }

  /**
   * Process multiple tickers concurrently with enhanced options
   */
  public async processTickersConcurrently(
    tickers: TickerState[], 
    options: ConcurrentProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    if (!this.isRunning) {
      throw new Error('Processor is not running');
    }

    // Apply processing options
    const maxConcurrent = options.maxConcurrent || tickers.length;
    const respectPriority = options.respectPriority !== false;
    const timeoutMs = options.timeoutMs || this.config.taskTimeout;

    // Prioritize tickers if requested
    const processedTickers = respectPriority 
      ? this.priorityManager.prioritizeTickers(tickers)
      : tickers;
    
    // Limit concurrent processing
    const tickersToProcess = processedTickers.slice(0, maxConcurrent);
    
    // Create processing tasks
    const tasks = tickersToProcess.map(ticker => this.createProcessingTask(ticker));
    
    // Process tasks with controlled concurrency
    const results: ProcessingResult[] = [];
    const processingPromises: Promise<ProcessingResult>[] = [];
    
    // Process in batches to respect concurrency limits
    const batchSize = Math.min(this.config.maxWorkers, maxConcurrent);
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(task => 
        this.processTaskWithTimeout(task, timeoutMs)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const task = batch[j];
        
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Batch processing failed for ${task.ticker}:`, result.reason);
          results.push({
            ticker: task.ticker,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Batch processing failed',
            processingTime: 0,
            timestamp: new Date()
          });
        }
      }
    }

    return results;
  }

  /**
   * Process task with custom timeout
   */
  private async processTaskWithTimeout(task: TickerProcessingTask, timeoutMs: number): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task timeout after ${timeoutMs}ms for ${task.ticker}`));
      }, timeoutMs);

      this.processTask(task)
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Process enhanced signal for a ticker
   */
  public async processEnhancedSignal(
    ticker: string, 
    signalFactors: SignalFactors
  ): Promise<EnhancedSignal> {
    const task: TickerProcessingTask = {
      id: `signal_${ticker}_${Date.now()}`,
      ticker,
      type: 'SIGNAL_PROCESSING',
      urgent: false,
      createdAt: new Date(),
      estimatedMemory: 50, // MB
      estimatedCpu: 20,    // %
      networkRequests: 3,
      payload: { signalFactors }
    };

    const result = await this.processTask(task);
    
    if (!result.success || !result.data) {
      throw new Error(`Failed to process signal for ${ticker}: ${result.error}`);
    }

    return result.data as EnhancedSignal;
  }

  /**
   * Get processing statistics
   */
  public getProcessingStatistics(): ProcessingStatistics {
    const queueStats = this.priorityManager.getQueueStatistics();
    const workerStats = this.workerPool.getStatistics();
    
    return {
      isRunning: this.isRunning,
      queueLength: queueStats.queueLength,
      activeTasks: queueStats.activeTasks,
      completedTasks: this.getCompletedTaskCount(),
      failedTasks: this.getFailedTaskCount(),
      averageProcessingTime: this.getAverageProcessingTime(),
      resourceUtilization: queueStats.resourceUtilization,
      workerStatistics: workerStats,
      throughput: this.calculateThroughput()
    };
  }

  /**
   * Update processing configuration
   */
  public updateConfiguration(config: Partial<ConcurrentProcessingConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.priorityWeights) {
      this.priorityManager.setPriorityWeights(config.priorityWeights);
    }
    
    if (config.resourceLimits) {
      this.priorityManager.updateResourceLimits(config.resourceLimits);
    }
  }

  /**
   * Main task processing loop
   */
  private async processTaskQueue(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Process available tasks
      let processedCount = 0;
      const maxBatchSize = 5;

      while (processedCount < maxBatchSize) {
        const task = this.priorityManager.getNextTask();
        if (!task) {
          break; // No more tasks or resource constraints
        }

        // Process task asynchronously
        this.processTaskAsync(task);
        processedCount++;
      }

      // Emit processing update
      if (processedCount > 0) {
        this.emit('processor:batch:processed', {
          tasksProcessed: processedCount,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error in task processing loop:', error);
      this.emit('processor:error', { error });
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: TickerProcessingTask): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Create processing context
      const context: ProcessingContext = {
        task,
        startTime,
        workerId: null
      };
      
      this.processingTasks.set(task.id, context);

      // Get available worker
      const worker = await this.workerPool.getWorker();
      context.workerId = worker.id;

      // Process task in worker
      const result = await this.executeTaskInWorker(worker, task);
      
      // Release worker
      this.workerPool.releaseWorker(worker);
      
      // Release resources
      this.priorityManager.releaseTaskResources(task);
      
      const processingTime = Date.now() - startTime;
      
      const processingResult: ProcessingResult = {
        ticker: task.ticker,
        success: true,
        data: result,
        processingTime,
        timestamp: new Date()
      };

      this.emit('task:completed', {
        taskId: task.id,
        ticker: task.ticker,
        processingTime,
        workerId: worker.id
      });

      return processingResult;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`Task processing failed for ${task.ticker}:`, error);
      
      this.emit('task:failed', {
        taskId: task.id,
        ticker: task.ticker,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      });

      return {
        ticker: task.ticker,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        timestamp: new Date()
      };
    } finally {
      this.processingTasks.delete(task.id);
    }
  }

  /**
   * Process task asynchronously (fire and forget)
   */
  private processTaskAsync(task: TickerProcessingTask): void {
    this.processTask(task).catch(error => {
      console.error(`Async task processing failed for ${task.ticker}:`, error);
    });
  }

  /**
   * Execute task in worker thread
   */
  private async executeTaskInWorker(worker: WorkerThread, task: TickerProcessingTask): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Task timeout for ${task.ticker}`));
      }, this.config.taskTimeout);

      worker.worker.postMessage({
        taskId: task.id,
        type: task.type,
        ticker: task.ticker,
        payload: task.payload
      });

      const messageHandler = (result: any) => {
        clearTimeout(timeout);
        worker.worker.off('message', messageHandler);
        worker.worker.off('error', errorHandler);
        
        if (result.success) {
          resolve(result.data);
        } else {
          reject(new Error(result.error));
        }
      };

      const errorHandler = (error: Error) => {
        clearTimeout(timeout);
        worker.worker.off('message', messageHandler);
        worker.worker.off('error', errorHandler);
        reject(error);
      };

      worker.worker.on('message', messageHandler);
      worker.worker.on('error', errorHandler);
    });
  }

  /**
   * Create processing task from ticker state
   */
  private createProcessingTask(ticker: TickerState): TickerProcessingTask {
    return {
      id: `ticker_${ticker.ticker}_${Date.now()}`,
      ticker: ticker.ticker,
      type: 'SIGNAL_PROCESSING',
      urgent: ticker.status === 'GO', // GO state is urgent
      createdAt: new Date(),
      estimatedMemory: 30,
      estimatedCpu: 15,
      networkRequests: 2,
      payload: { tickerState: ticker }
    };
  }

  /**
   * Wait for all active tasks to complete
   */
  private async waitForActiveTasks(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.processingTasks.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.processingTasks.size > 0) {
      console.warn(`${this.processingTasks.size} tasks still active after shutdown timeout`);
    }
  }

  // Statistics helpers
  private getCompletedTaskCount(): number {
    // TODO: Implement task counter
    return 0;
  }

  private getFailedTaskCount(): number {
    // TODO: Implement failed task counter
    return 0;
  }

  private getAverageProcessingTime(): number {
    // TODO: Implement average processing time calculation
    return 150; // ms
  }

  private calculateThroughput(): number {
    // TODO: Implement throughput calculation (tasks per second)
    return 5.2;
  }
}

/**
 * Worker pool for managing worker threads
 */
class WorkerPool {
  private workers: WorkerThread[] = [];
  private availableWorkers: WorkerThread[] = [];
  private maxWorkers: number;

  constructor(maxWorkers: number) {
    this.maxWorkers = maxWorkers;
  }

  async initialize(): Promise<void> {
    console.log(`Initializing worker pool with ${this.maxWorkers} workers...`);
    
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = await this.createWorker(i);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async getWorker(): Promise<WorkerThread> {
    // Wait for available worker
    while (this.availableWorkers.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return this.availableWorkers.shift()!;
  }

  releaseWorker(worker: WorkerThread): void {
    this.availableWorkers.push(worker);
  }

  getStatistics(): WorkerPoolStatistics {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.workers.length - this.availableWorkers.length,
      utilization: (this.workers.length - this.availableWorkers.length) / this.workers.length
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down worker pool...');
    
    for (const worker of this.workers) {
      await worker.worker.terminate();
    }
    
    this.workers.length = 0;
    this.availableWorkers.length = 0;
  }

  private async createWorker(id: number): Promise<WorkerThread> {
    // TODO: Create actual worker thread with signal processing logic
    // For now, create a mock worker
    const worker = {
      id,
      worker: {
        postMessage: (data: any) => {
          // Mock processing
          setTimeout(() => {
            this.workers[id]?.worker.emit('message', {
              success: true,
              data: { processed: true, ticker: data.ticker }
            });
          }, 50 + Math.random() * 100);
        },
        on: (event: string, handler: Function) => {
          // Mock event handling
        },
        off: (event: string, handler: Function) => {
          // Mock event handling
        },
        emit: (event: string, data: any) => {
          // Mock event emission
        },
        terminate: async () => {
          // Mock termination
        }
      } as any
    };
    
    return worker;
  }
}

// Supporting interfaces
export interface ConcurrentProcessingConfig {
  maxWorkers: number;
  processingInterval: number;
  taskTimeout: number;
  priorityWeights: Record<string, number>;
  resourceLimits: {
    maxConcurrentTasks: number;
    maxMemoryMB: number;
    maxCpuPercent: number;
    maxNetworkRequests: number;
  };
}

export interface ProcessingContext {
  task: TickerProcessingTask;
  startTime: number;
  workerId: number | null;
}

export interface ProcessingResult {
  ticker: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  timestamp: Date;
}

export interface ProcessingStatistics {
  isRunning: boolean;
  queueLength: number;
  activeTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  resourceUtilization: {
    memory: number;
    cpu: number;
    network: number;
    tasks: number;
  };
  workerStatistics: WorkerPoolStatistics;
  throughput: number;
}

export interface WorkerThread {
  id: number;
  worker: Worker;
}

export interface WorkerPoolStatistics {
  totalWorkers: number;
  availableWorkers: number;
  busyWorkers: number;
  utilization: number;
}

export interface ConcurrentProcessingOptions {
  respectPriority?: boolean;
  maxConcurrent?: number;
  timeoutMs?: number;
}