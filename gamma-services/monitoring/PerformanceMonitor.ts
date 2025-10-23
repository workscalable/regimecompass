import { EventEmitter } from 'events';
import * as os from 'os';
import * as process from 'process';
import { auditLogger } from '../logging/AuditLogger';
import { logger } from '../logging/Logger';

export interface PerformanceConfig {
  enabled: boolean;
  tickToDecisionTarget: number; // Target processing time in ms
  memoryMonitoring: {
    enabled: boolean;
    checkInterval: number;
    heapThreshold: number; // MB
    rssThreshold: number; // MB
    gcOptimization: boolean;
    leakDetection: boolean;
  };
  concurrentOperations: {
    enabled: boolean;
    maxConcurrentTickers: number;
    operationTimeout: number;
    queueMonitoring: boolean;
  };
  metrics: {
    retentionPeriod: number;
    aggregationInterval: number;
    alertThresholds: PerformanceThreshold[];
  };
  profiling: {
    enabled: boolean;
    cpuProfiling: boolean;
    memoryProfiling: boolean;
    profilingInterval: number;
  };
}

export interface PerformanceThreshold {
  metric: string;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: 'LOG' | 'ALERT' | 'THROTTLE' | 'RESTART';
}

export interface PerformanceMetrics {
  timestamp: Date;
  processing: {
    tickToDecision: {
      average: number;
      p50: number;
      p95: number;
      p99: number;
      max: number;
      count: number;
    };
    throughput: {
      tickersPerSecond: number;
      signalsPerSecond: number;
      tradesPerSecond: number;
    };
    latency: {
      dataIngestion: number;
      signalProcessing: number;
      decisionMaking: number;
      execution: number;
    };
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    arrayBuffers: number;
    gcStats: GCStats;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
    userTime: number;
    systemTime: number;
  };
  concurrency: {
    activeTickers: number;
    queuedOperations: number;
    completedOperations: number;
    failedOperations: number;
    averageWaitTime: number;
  };
  system: {
    uptime: number;
    freeMemory: number;
    totalMemory: number;
    cpuCount: number;
    platform: string;
  };
}

export interface GCStats {
  collections: number;
  totalTime: number;
  averageTime: number;
  lastCollection: Date;
  heapBefore: number;
  heapAfter: number;
  freedMemory: number;
}

export interface OperationMetrics {
  id: string;
  ticker: string;
  operation: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  error?: string;
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  recommendations: string[];
  acknowledged: boolean;
}

export class PerformanceMonitor extends EventEmitter {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics[] = [];
  private operations: Map<string, OperationMetrics> = new Map();
  private processingTimes: number[] = [];
  private gcStats: GCStats;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private monitoringTimer?: NodeJS.Timeout;
  private gcTimer?: NodeJS.Timeout;
  private startTime: Date;
  private lastCpuUsage?: NodeJS.CpuUsage;

  constructor(config: PerformanceConfig) {
    super();
    this.config = config;
    this.startTime = new Date();
    this.gcStats = {
      collections: 0,
      totalTime: 0,
      averageTime: 0,
      lastCollection: new Date(),
      heapBefore: 0,
      heapAfter: 0,
      freedMemory: 0
    };
    this.lastCpuUsage = process.cpuUsage();
  }

  public async initialize(): Promise<void> {
    console.log('📊 Initializing Performance Monitor...');
    
    try {
      if (this.config.enabled) {
        // Start monitoring
        this.startMonitoring();
        
        // Setup GC monitoring
        if (this.config.memoryMonitoring.enabled) {
          this.setupGCMonitoring();
        }
        
        // Setup profiling
        if (this.config.profiling.enabled) {
          this.setupProfiling();
        }
        
        // Setup process event listeners
        this.setupProcessListeners();
      }
      
      console.log('✅ Performance Monitor initialized');
      this.emit('initialized');
      
      // Log initialization
      await auditLogger.logSystemStart({
        component: 'PerformanceMonitor',
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          config: {
            tickToDecisionTarget: this.config.tickToDecisionTarget,
            memoryMonitoring: this.config.memoryMonitoring.enabled,
            concurrentOperations: this.config.concurrentOperations.enabled
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Performance Monitor:', error);
      throw error;
    }
  }

  public startOperation(ticker: string, operation: string): string {
    const operationId = `${ticker}-${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const operationMetrics: OperationMetrics = {
      id: operationId,
      ticker,
      operation,
      startTime: new Date(),
      status: 'PENDING',
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
    
    this.operations.set(operationId, operationMetrics);
    
    // Check concurrent operations limit
    const activeOperations = Array.from(this.operations.values())
      .filter(op => op.status === 'PENDING' || op.status === 'PROCESSING').length;
    
    if (activeOperations > this.config.concurrentOperations.maxConcurrentTickers) {
      this.createAlert(
        'CONCURRENT_OPERATIONS_EXCEEDED',
        activeOperations,
        this.config.concurrentOperations.maxConcurrentTickers,
        'HIGH',
        `Concurrent operations limit exceeded: ${activeOperations}/${this.config.concurrentOperations.maxConcurrentTickers}`,
        ['Consider increasing processing capacity', 'Review operation queuing strategy']
      );
    }
    
    return operationId;
  }

  public updateOperationStatus(operationId: string, status: OperationMetrics['status']): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    
    operation.status = status;
    
    if (status === 'PROCESSING') {
      // Operation started processing
      this.emit('operationStarted', operation);
    }
  }

  public completeOperation(operationId: string, success: boolean = true, error?: string): number | null {
    const operation = this.operations.get(operationId);
    if (!operation) return null;
    
    const endTime = new Date();
    const duration = endTime.getTime() - operation.startTime.getTime();
    
    operation.endTime = endTime;
    operation.duration = duration;
    operation.status = success ? 'COMPLETED' : 'FAILED';
    operation.error = error;
    
    // Track processing time for tick-to-decision analysis
    if (operation.operation.includes('signal') || operation.operation.includes('decision')) {
      this.processingTimes.push(duration);
      
      // Keep only recent processing times (last 1000)
      if (this.processingTimes.length > 1000) {
        this.processingTimes = this.processingTimes.slice(-1000);
      }
      
      // Check against target
      if (duration > this.config.tickToDecisionTarget) {
        this.createAlert(
          'TICK_TO_DECISION_SLOW',
          duration,
          this.config.tickToDecisionTarget,
          duration > this.config.tickToDecisionTarget * 2 ? 'HIGH' : 'MEDIUM',
          `Tick-to-decision processing time exceeded target: ${duration}ms > ${this.config.tickToDecisionTarget}ms`,
          [
            'Optimize signal processing algorithms',
            'Consider caching frequently accessed data',
            'Review database query performance'
          ]
        );
      }
    }
    
    this.emit('operationCompleted', operation);
    
    // Clean up old operations
    this.cleanupOldOperations();
    
    return duration;
  }

  public getProcessingTimeStats(): {
    average: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
    count: number;
  } {
    if (this.processingTimes.length === 0) {
      return { average: 0, p50: 0, p95: 0, p99: 0, max: 0, count: 0 };
    }
    
    const sorted = [...this.processingTimes].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      average: sorted.reduce((sum, time) => sum + time, 0) / count,
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
      max: sorted[count - 1],
      count
    };
  }

  public getCurrentMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();
    
    const activeOperations = Array.from(this.operations.values());
    const completedOperations = activeOperations.filter(op => op.status === 'COMPLETED');
    const failedOperations = activeOperations.filter(op => op.status === 'FAILED');
    const queuedOperations = activeOperations.filter(op => op.status === 'PENDING');
    
    const averageWaitTime = queuedOperations.length > 0
      ? queuedOperations.reduce((sum, op) => sum + (Date.now() - op.startTime.getTime()), 0) / queuedOperations.length
      : 0;
    
    const processingStats = this.getProcessingTimeStats();
    
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      processing: {
        tickToDecision: processingStats,
        throughput: {
          tickersPerSecond: this.calculateThroughput('ticker'),
          signalsPerSecond: this.calculateThroughput('signal'),
          tradesPerSecond: this.calculateThroughput('trade')
        },
        latency: {
          dataIngestion: this.calculateAverageLatency('data_ingestion'),
          signalProcessing: this.calculateAverageLatency('signal_processing'),
          decisionMaking: this.calculateAverageLatency('decision_making'),
          execution: this.calculateAverageLatency('execution')
        }
      },
      memory: {
        heapUsed: memoryUsage.heapUsed / 1024 / 1024, // MB
        heapTotal: memoryUsage.heapTotal / 1024 / 1024, // MB
        rss: memoryUsage.rss / 1024 / 1024, // MB
        external: memoryUsage.external / 1024 / 1024, // MB
        arrayBuffers: memoryUsage.arrayBuffers / 1024 / 1024, // MB
        gcStats: { ...this.gcStats }
      },
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000, // Convert to ms
        loadAverage: os.loadavg(),
        userTime: cpuUsage.user / 1000,
        systemTime: cpuUsage.system / 1000
      },
      concurrency: {
        activeTickers: new Set(activeOperations.map(op => op.ticker)).size,
        queuedOperations: queuedOperations.length,
        completedOperations: completedOperations.length,
        failedOperations: failedOperations.length,
        averageWaitTime
      },
      system: {
        uptime: Date.now() - this.startTime.getTime(),
        freeMemory: os.freemem() / 1024 / 1024, // MB
        totalMemory: os.totalmem() / 1024 / 1024, // MB
        cpuCount: os.cpus().length,
        platform: os.platform()
      }
    };
    
    // Store metrics
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    const retentionCutoff = new Date(Date.now() - this.config.metrics.retentionPeriod);
    this.metrics = this.metrics.filter(m => m.timestamp >= retentionCutoff);
    
    // Check thresholds
    this.checkPerformanceThresholds(metrics);
    
    return metrics;
  }

  public getMetricsHistory(duration: number = 3600000): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - duration);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  public getActiveOperations(): OperationMetrics[] {
    return Array.from(this.operations.values())
      .filter(op => op.status === 'PENDING' || op.status === 'PROCESSING')
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  public getOperationsByTicker(ticker: string): OperationMetrics[] {
    return Array.from(this.operations.values())
      .filter(op => op.ticker === ticker)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  public getPerformanceAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  public optimizeGarbageCollection(): void {
    if (this.config.memoryMonitoring.gcOptimization) {
      // Force garbage collection if available
      if (global.gc) {
        const beforeGC = process.memoryUsage();
        const startTime = Date.now();
        
        global.gc();
        
        const afterGC = process.memoryUsage();
        const duration = Date.now() - startTime;
        
        this.gcStats.collections++;
        this.gcStats.totalTime += duration;
        this.gcStats.averageTime = this.gcStats.totalTime / this.gcStats.collections;
        this.gcStats.lastCollection = new Date();
        this.gcStats.heapBefore = beforeGC.heapUsed / 1024 / 1024;
        this.gcStats.heapAfter = afterGC.heapUsed / 1024 / 1024;
        this.gcStats.freedMemory = (beforeGC.heapUsed - afterGC.heapUsed) / 1024 / 1024;
        
        console.log(`🗑️ Manual GC completed: freed ${this.gcStats.freedMemory.toFixed(2)}MB in ${duration}ms`);
        
        this.emit('gcCompleted', {
          duration,
          freedMemory: this.gcStats.freedMemory,
          heapBefore: this.gcStats.heapBefore,
          heapAfter: this.gcStats.heapAfter
        });
      }
    }
  }

  public detectMemoryLeaks(): {
    suspected: boolean;
    growth: number;
    recommendations: string[];
  } {
    if (this.metrics.length < 10) {
      return { suspected: false, growth: 0, recommendations: [] };
    }
    
    // Analyze memory growth over time
    const recentMetrics = this.metrics.slice(-10);
    const oldestMemory = recentMetrics[0].memory.heapUsed;
    const newestMemory = recentMetrics[recentMetrics.length - 1].memory.heapUsed;
    const growth = newestMemory - oldestMemory;
    const growthRate = growth / recentMetrics.length; // MB per metric interval
    
    const suspected = growthRate > 5; // More than 5MB growth per interval
    
    const recommendations: string[] = [];
    if (suspected) {
      recommendations.push('Review object lifecycle management');
      recommendations.push('Check for unclosed resources (files, connections)');
      recommendations.push('Analyze event listener cleanup');
      recommendations.push('Consider implementing object pooling');
      recommendations.push('Review caching strategies');
    }
    
    return { suspected, growth, recommendations };
  }

  public generatePerformanceReport(): {
    summary: {
      averageProcessingTime: number;
      throughput: number;
      memoryEfficiency: number;
      systemHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    };
    details: {
      processing: any;
      memory: any;
      concurrency: any;
      alerts: number;
    };
    recommendations: string[];
  } {
    const currentMetrics = this.getCurrentMetrics();
    const processingStats = this.getProcessingTimeStats();
    
    // Calculate system health score
    let healthScore = 100;
    
    if (processingStats.average > this.config.tickToDecisionTarget) {
      healthScore -= 20;
    }
    if (currentMetrics.memory.heapUsed > this.config.memoryMonitoring.heapThreshold) {
      healthScore -= 15;
    }
    if (currentMetrics.concurrency.queuedOperations > 10) {
      healthScore -= 10;
    }
    if (this.alerts.size > 5) {
      healthScore -= 10;
    }
    
    const systemHealth = healthScore >= 90 ? 'EXCELLENT' :
                        healthScore >= 75 ? 'GOOD' :
                        healthScore >= 60 ? 'FAIR' : 'POOR';
    
    const recommendations: string[] = [];
    
    if (processingStats.average > this.config.tickToDecisionTarget) {
      recommendations.push('Optimize signal processing algorithms');
    }
    if (currentMetrics.memory.heapUsed > this.config.memoryMonitoring.heapThreshold * 0.8) {
      recommendations.push('Monitor memory usage and consider optimization');
    }
    if (currentMetrics.concurrency.queuedOperations > 5) {
      recommendations.push('Consider increasing processing capacity');
    }
    
    return {
      summary: {
        averageProcessingTime: processingStats.average,
        throughput: currentMetrics.processing.throughput.signalsPerSecond,
        memoryEfficiency: (currentMetrics.system.totalMemory - currentMetrics.memory.heapUsed) / currentMetrics.system.totalMemory * 100,
        systemHealth
      },
      details: {
        processing: currentMetrics.processing,
        memory: currentMetrics.memory,
        concurrency: currentMetrics.concurrency,
        alerts: this.alerts.size
      },
      recommendations
    };
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.getCurrentMetrics();
    }, this.config.metrics.aggregationInterval);
  }

  private setupGCMonitoring(): void {
    // Monitor GC events if available
    if (process.env.NODE_ENV !== 'production') {
      // Enable GC monitoring in development
      this.gcTimer = setInterval(() => {
        const memoryUsage = process.memoryUsage();
        
        if (memoryUsage.heapUsed > this.config.memoryMonitoring.heapThreshold * 1024 * 1024) {
          this.optimizeGarbageCollection();
        }
      }, this.config.memoryMonitoring.checkInterval);
    }
  }

  private setupProfiling(): void {
    if (this.config.profiling.enabled) {
      // Setup CPU and memory profiling
      console.log('🔍 Performance profiling enabled');
    }
  }

  private setupProcessListeners(): void {
    // Monitor process events
    process.on('warning', (warning) => {
      this.createAlert(
        'PROCESS_WARNING',
        1,
        0,
        'MEDIUM',
        `Process warning: ${warning.message}`,
        ['Review process configuration', 'Check for resource leaks']
      );
    });
    
    // Monitor unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.createAlert(
        'UNHANDLED_REJECTION',
        1,
        0,
        'HIGH',
        `Unhandled promise rejection: ${reason}`,
        ['Add proper error handling', 'Review async operations']
      );
    });
  }

  private calculateThroughput(operationType: string): number {
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentOperations = Array.from(this.operations.values())
      .filter(op => 
        op.operation.includes(operationType) && 
        op.endTime && 
        op.endTime >= oneMinuteAgo &&
        op.status === 'COMPLETED'
      );
    
    return recentOperations.length / 60; // Operations per second
  }

  private calculateAverageLatency(operationType: string): number {
    const recentOperations = Array.from(this.operations.values())
      .filter(op => 
        op.operation.includes(operationType) && 
        op.duration !== undefined &&
        op.status === 'COMPLETED'
      )
      .slice(-100); // Last 100 operations
    
    if (recentOperations.length === 0) return 0;
    
    return recentOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / recentOperations.length;
  }

  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    for (const threshold of this.config.metrics.alertThresholds) {
      const value = this.getMetricValue(threshold.metric, metrics);
      
      if (value > threshold.threshold) {
        this.createAlert(
          threshold.metric,
          value,
          threshold.threshold,
          threshold.severity,
          `Performance threshold exceeded: ${threshold.metric} = ${value} > ${threshold.threshold}`,
          this.getRecommendationsForMetric(threshold.metric)
        );
      }
    }
  }

  private getMetricValue(metric: string, metrics: PerformanceMetrics): number {
    switch (metric) {
      case 'tick_to_decision_average':
        return metrics.processing.tickToDecision.average;
      case 'tick_to_decision_p95':
        return metrics.processing.tickToDecision.p95;
      case 'memory_heap_used':
        return metrics.memory.heapUsed;
      case 'memory_rss':
        return metrics.memory.rss;
      case 'cpu_usage':
        return metrics.cpu.usage;
      case 'concurrent_operations':
        return metrics.concurrency.queuedOperations;
      default:
        return 0;
    }
  }

  private getRecommendationsForMetric(metric: string): string[] {
    switch (metric) {
      case 'tick_to_decision_average':
      case 'tick_to_decision_p95':
        return [
          'Optimize signal processing algorithms',
          'Consider caching frequently accessed data',
          'Review database query performance',
          'Implement parallel processing where possible'
        ];
      case 'memory_heap_used':
      case 'memory_rss':
        return [
          'Review memory usage patterns',
          'Implement object pooling',
          'Check for memory leaks',
          'Optimize data structures'
        ];
      case 'cpu_usage':
        return [
          'Optimize CPU-intensive operations',
          'Consider load balancing',
          'Review algorithm complexity',
          'Implement caching strategies'
        ];
      case 'concurrent_operations':
        return [
          'Increase processing capacity',
          'Implement operation queuing',
          'Optimize operation scheduling',
          'Consider horizontal scaling'
        ];
      default:
        return ['Review system performance and configuration'];
    }
  }

  private createAlert(
    metric: string,
    value: number,
    threshold: number,
    severity: PerformanceAlert['severity'],
    message: string,
    recommendations: string[]
  ): void {
    const alertId = `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      timestamp: new Date(),
      metric,
      value,
      threshold,
      severity,
      message,
      recommendations,
      acknowledged: false
    };
    
    this.alerts.set(alertId, alert);
    
    // Log alert
    auditLogger.logAlertTriggered(alertId, 'PERFORMANCE_ALERT', severity, {
      component: 'PerformanceMonitor',
      operation: 'performance_alert',
      metadata: { metric, value, threshold }
    });
    
    this.emit('performanceAlert', alert);
  }

  private cleanupOldOperations(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    
    for (const [id, operation] of Array.from(this.operations.entries())) {
      if (operation.endTime && operation.endTime < cutoff) {
        this.operations.delete(id);
      }
    }
  }

  public async trackOperation<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    const operationId = this.startOperation('system', operationName);
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      this.completeOperation(operationId, true);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.completeOperation(operationId, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  public trackSyncOperation<T>(operationName: string, operation: () => T): T {
    const operationId = this.startOperation('system', operationName);
    const startTime = performance.now();
    
    try {
      const result = operation();
      const duration = performance.now() - startTime;
      this.completeOperation(operationId, true);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.completeOperation(operationId, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  public getOperationStats(operationName: string, timeWindowMinutes: number = 30): any {
    const cutoffTime = Date.now() - (timeWindowMinutes * 60 * 1000);
    const operationMetrics = this.operations.get(operationName);
    
    if (!operationMetrics) {
      return {
        totalOperations: 0,
        successfulOperations: 0,
        failedOperations: 0,
        averageDuration: 0,
        errorRate: 0,
        lastOperation: null
      };
    }

    // Since operations is a Map<string, OperationMetrics>, we need to get all operations for this name
    const allOperations = Array.from(this.operations.values()).filter(op => op.operation === operationName);
    const recentOperations = allOperations.filter(op => op.startTime.getTime() >= cutoffTime);
    const totalOperations = recentOperations.length;
    const successfulOperations = recentOperations.filter(op => op.status === 'COMPLETED').length;
    const failedOperations = totalOperations - successfulOperations;
    const averageDuration = totalOperations > 0 
      ? recentOperations.reduce((sum, op) => sum + (op.duration || 0), 0) / totalOperations 
      : 0;
    const errorRate = totalOperations > 0 ? failedOperations / totalOperations : 0;

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageDuration,
      errorRate,
      lastOperation: recentOperations[recentOperations.length - 1] || null
    };
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Performance Monitor...');
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
    
    // Log final metrics
    const finalMetrics = this.getCurrentMetrics();
    
    await auditLogger.logSystemStop({
      component: 'PerformanceMonitor',
      metadata: {
        uptime: finalMetrics.system.uptime,
        reason: 'shutdown',
        finalMetrics: {
          averageProcessingTime: finalMetrics.processing.tickToDecision.average,
          memoryUsed: finalMetrics.memory.heapUsed,
          totalOperations: this.operations.size
        }
      }
    });
    
    console.log('✅ Performance Monitor shutdown complete');
    this.emit('shutdown');
  }
}

// Default performance configuration
export const defaultPerformanceConfig: PerformanceConfig = {
  enabled: true,
  tickToDecisionTarget: 200, // 200ms target
  memoryMonitoring: {
    enabled: true,
    checkInterval: 30000, // 30 seconds
    heapThreshold: 512, // 512MB
    rssThreshold: 1024, // 1GB
    gcOptimization: true,
    leakDetection: true
  },
  concurrentOperations: {
    enabled: true,
    maxConcurrentTickers: 15, // Support 10+ tickers with buffer
    operationTimeout: 5000, // 5 seconds
    queueMonitoring: true
  },
  metrics: {
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    aggregationInterval: 10000, // 10 seconds
    alertThresholds: [
      {
        metric: 'tick_to_decision_average',
        threshold: 200,
        severity: 'MEDIUM',
        action: 'ALERT'
      },
      {
        metric: 'tick_to_decision_p95',
        threshold: 500,
        severity: 'HIGH',
        action: 'ALERT'
      },
      {
        metric: 'memory_heap_used',
        threshold: 512,
        severity: 'MEDIUM',
        action: 'ALERT'
      },
      {
        metric: 'memory_rss',
        threshold: 1024,
        severity: 'HIGH',
        action: 'ALERT'
      },
      {
        metric: 'concurrent_operations',
        threshold: 20,
        severity: 'HIGH',
        action: 'THROTTLE'
      }
    ]
  },
  profiling: {
    enabled: false,
    cpuProfiling: false,
    memoryProfiling: false,
    profilingInterval: 60000 // 1 minute
  }
};

// Export a default instance
export const performanceMonitor = new PerformanceMonitor(defaultPerformanceConfig);