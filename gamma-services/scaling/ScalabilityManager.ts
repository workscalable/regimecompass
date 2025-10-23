import { EventEmitter } from 'events';
import { LoadBalancer, LoadBalancingConfig } from './LoadBalancer';
import { MetricsCollector, MetricsConfig } from '../monitoring/MetricsCollector';
import { HealthCheckService, HealthCheckConfig } from '../monitoring/HealthCheckService';

export interface ScalabilityConfig {
  loadBalancer: LoadBalancingConfig;
  metrics: MetricsConfig;
  healthCheck: HealthCheckConfig;
  scaling: {
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization: number;
    targetMemoryUtilization: number;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    cooldownPeriod: number;
    evaluationPeriod: number;
  };
  monitoring: {
    alertingEnabled: boolean;
    dashboardEnabled: boolean;
    metricsRetention: number;
    logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  };
}

export interface ScalingDecision {
  action: 'SCALE_UP' | 'SCALE_DOWN' | 'NO_ACTION';
  reason: string;
  currentInstances: number;
  targetInstances: number;
  metrics: {
    cpuUtilization: number;
    memoryUtilization: number;
    throughput: number;
    errorRate: number;
    responseTime: number;
  };
  timestamp: Date;
}

export interface SystemCapacity {
  currentCapacity: {
    workers: number;
    tickersPerWorker: number;
    totalTickers: number;
    processingPower: number;
  };
  utilization: {
    cpu: number;
    memory: number;
    network: number;
    workers: number;
  };
  performance: {
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
    availability: number;
  };
  limits: {
    maxWorkers: number;
    maxTickers: number;
    maxMemory: number;
    maxCpu: number;
  };
}

export class ScalabilityManager extends EventEmitter {
  private config: ScalabilityConfig;
  private loadBalancer: LoadBalancer;
  private metricsCollector: MetricsCollector;
  private healthCheckService: HealthCheckService;
  private scalingTimer?: NodeJS.Timeout;
  private lastScalingAction: Date = new Date(0);
  private scalingHistory: ScalingDecision[] = [];

  constructor(config: ScalabilityConfig) {
    super();
    this.config = config;
    
    this.loadBalancer = new LoadBalancer(config.loadBalancer);
    this.metricsCollector = new MetricsCollector(config.metrics);
    this.healthCheckService = new HealthCheckService(config.healthCheck);
    
    this.setupEventHandlers();
  }

  public async initialize(): Promise<void> {
    console.log('Initializing Scalability Manager...');
    
    // Initialize all components
    await Promise.all([
      this.loadBalancer.initialize(),
      this.metricsCollector.initialize(),
      this.healthCheckService.initialize()
    ]);
    
    // Start scaling evaluation
    this.startScalingEvaluation();
    
    this.emit('initialized');
  }

  public async addTicker(ticker: string): Promise<string> {
    console.log(`Adding ticker to scalable system: ${ticker}`);
    
    // Check if we need to scale up before adding the ticker
    const capacity = await this.getSystemCapacity();
    if (this.shouldScaleUp(capacity)) {
      await this.scaleUp('Adding new ticker requires additional capacity');
    }
    
    return this.loadBalancer.assignTicker(ticker);
  }

  public async removeTicker(ticker: string): Promise<void> {
    console.log(`Removing ticker from scalable system: ${ticker}`);
    
    await this.loadBalancer.removeTicker(ticker);
    
    // Check if we can scale down after removing the ticker
    const capacity = await this.getSystemCapacity();
    if (this.shouldScaleDown(capacity)) {
      await this.scaleDown('Ticker removal allows for capacity reduction');
    }
  }

  public async getSystemCapacity(): Promise<SystemCapacity> {
    const workerStats = this.loadBalancer.getWorkerStats();
    const systemMetrics = this.metricsCollector.getSystemMetrics();
    const appMetrics = this.metricsCollector.getApplicationMetrics();
    const perfMetrics = this.metricsCollector.getPerformanceMetrics();
    
    const activeWorkers = workerStats.filter(w => w.status !== 'FAILED');
    const totalTickers = activeWorkers.reduce((sum, w) => sum + w.tickersAssigned.length, 0);
    const averageLoad = activeWorkers.reduce((sum, w) => sum + w.currentLoad, 0) / Math.max(1, activeWorkers.length);
    
    return {
      currentCapacity: {
        workers: activeWorkers.length,
        tickersPerWorker: this.config.loadBalancer.maxTickersPerWorker,
        totalTickers,
        processingPower: activeWorkers.length * this.config.loadBalancer.maxTickersPerWorker
      },
      utilization: {
        cpu: systemMetrics.cpu.usage,
        memory: (systemMetrics.memory.used / systemMetrics.memory.total) * 100,
        network: 0, // Would be calculated from actual network metrics
        workers: averageLoad
      },
      performance: {
        averageResponseTime: perfMetrics.latency.tickToDecision,
        throughput: perfMetrics.throughput.signalsPerSecond,
        errorRate: appMetrics.errors.errorRate,
        availability: perfMetrics.reliability.availability
      },
      limits: {
        maxWorkers: this.config.loadBalancer.maxWorkersPerNode,
        maxTickers: this.config.loadBalancer.maxWorkersPerNode * this.config.loadBalancer.maxTickersPerWorker,
        maxMemory: systemMetrics.memory.total,
        maxCpu: systemMetrics.cpu.cores * 100
      }
    };
  }

  public async evaluateScaling(): Promise<ScalingDecision> {
    const capacity = await this.getSystemCapacity();
    const now = new Date();
    
    // Check cooldown period
    const timeSinceLastScaling = now.getTime() - this.lastScalingAction.getTime();
    if (timeSinceLastScaling < this.config.scaling.cooldownPeriod) {
      return {
        action: 'NO_ACTION',
        reason: 'Cooldown period active',
        currentInstances: capacity.currentCapacity.workers,
        targetInstances: capacity.currentCapacity.workers,
        metrics: {
          cpuUtilization: capacity.utilization.cpu,
          memoryUtilization: capacity.utilization.memory,
          throughput: capacity.performance.throughput,
          errorRate: capacity.performance.errorRate,
          responseTime: capacity.performance.averageResponseTime
        },
        timestamp: now
      };
    }
    
    // Evaluate scaling conditions
    if (this.shouldScaleUp(capacity)) {
      const targetInstances = Math.min(
        capacity.currentCapacity.workers + 1,
        this.config.scaling.maxInstances
      );
      
      return {
        action: 'SCALE_UP',
        reason: this.getScaleUpReason(capacity),
        currentInstances: capacity.currentCapacity.workers,
        targetInstances,
        metrics: {
          cpuUtilization: capacity.utilization.cpu,
          memoryUtilization: capacity.utilization.memory,
          throughput: capacity.performance.throughput,
          errorRate: capacity.performance.errorRate,
          responseTime: capacity.performance.averageResponseTime
        },
        timestamp: now
      };
    }
    
    if (this.shouldScaleDown(capacity)) {
      const targetInstances = Math.max(
        capacity.currentCapacity.workers - 1,
        this.config.scaling.minInstances
      );
      
      return {
        action: 'SCALE_DOWN',
        reason: this.getScaleDownReason(capacity),
        currentInstances: capacity.currentCapacity.workers,
        targetInstances,
        metrics: {
          cpuUtilization: capacity.utilization.cpu,
          memoryUtilization: capacity.utilization.memory,
          throughput: capacity.performance.throughput,
          errorRate: capacity.performance.errorRate,
          responseTime: capacity.performance.averageResponseTime
        },
        timestamp: now
      };
    }
    
    return {
      action: 'NO_ACTION',
      reason: 'System operating within normal parameters',
      currentInstances: capacity.currentCapacity.workers,
      targetInstances: capacity.currentCapacity.workers,
      metrics: {
        cpuUtilization: capacity.utilization.cpu,
        memoryUtilization: capacity.utilization.memory,
        throughput: capacity.performance.throughput,
        errorRate: capacity.performance.errorRate,
        responseTime: capacity.performance.averageResponseTime
      },
      timestamp: now
    };
  }

  public async executeScalingDecision(decision: ScalingDecision): Promise<void> {
    if (decision.action === 'NO_ACTION') return;
    
    console.log(`Executing scaling decision: ${decision.action} - ${decision.reason}`);
    
    try {
      if (decision.action === 'SCALE_UP') {
        await this.scaleUp(decision.reason);
      } else if (decision.action === 'SCALE_DOWN') {
        await this.scaleDown(decision.reason);
      }
      
      this.lastScalingAction = new Date();
      this.scalingHistory.push(decision);
      
      // Keep only recent scaling history
      if (this.scalingHistory.length > 100) {
        this.scalingHistory = this.scalingHistory.slice(-100);
      }
      
      this.emit('scalingExecuted', decision);
      
    } catch (error) {
      console.error('Failed to execute scaling decision:', error);
      this.emit('scalingError', { decision, error });
    }
  }

  public getScalingHistory(limit: number = 50): ScalingDecision[] {
    return this.scalingHistory.slice(-limit);
  }

  public async getSystemHealth(): Promise<any> {
    return this.healthCheckService.getHealthStatus();
  }

  public async getMetrics(): Promise<any> {
    return {
      system: this.metricsCollector.getSystemMetrics(),
      application: this.metricsCollector.getApplicationMetrics(),
      performance: this.metricsCollector.getPerformanceMetrics()
    };
  }

  private shouldScaleUp(capacity: SystemCapacity): boolean {
    const conditions = [
      // CPU utilization too high
      capacity.utilization.cpu > this.config.scaling.targetCpuUtilization,
      
      // Memory utilization too high
      capacity.utilization.memory > this.config.scaling.targetMemoryUtilization,
      
      // Worker utilization too high
      capacity.utilization.workers > this.config.scaling.scaleUpThreshold,
      
      // Response time too high
      capacity.performance.averageResponseTime > this.config.metrics.alertThresholds.latency,
      
      // Error rate too high
      capacity.performance.errorRate > this.config.metrics.alertThresholds.errorRate,
      
      // At capacity limits
      capacity.currentCapacity.workers >= capacity.limits.maxWorkers * 0.9
    ];
    
    // Scale up if any critical condition is met and we haven't reached max instances
    return conditions.some(condition => condition) && 
           capacity.currentCapacity.workers < this.config.scaling.maxInstances;
  }

  private shouldScaleDown(capacity: SystemCapacity): boolean {
    const conditions = [
      // CPU utilization low
      capacity.utilization.cpu < this.config.scaling.scaleDownThreshold,
      
      // Memory utilization low
      capacity.utilization.memory < this.config.scaling.scaleDownThreshold,
      
      // Worker utilization low
      capacity.utilization.workers < this.config.scaling.scaleDownThreshold,
      
      // Good performance metrics
      capacity.performance.averageResponseTime < this.config.metrics.alertThresholds.latency * 0.5,
      capacity.performance.errorRate < this.config.metrics.alertThresholds.errorRate * 0.1
    ];
    
    // Scale down only if all conditions are met and we're above minimum instances
    return conditions.every(condition => condition) && 
           capacity.currentCapacity.workers > this.config.scaling.minInstances;
  }

  private getScaleUpReason(capacity: SystemCapacity): string {
    const reasons = [];
    
    if (capacity.utilization.cpu > this.config.scaling.targetCpuUtilization) {
      reasons.push(`High CPU utilization (${capacity.utilization.cpu.toFixed(1)}%)`);
    }
    
    if (capacity.utilization.memory > this.config.scaling.targetMemoryUtilization) {
      reasons.push(`High memory utilization (${capacity.utilization.memory.toFixed(1)}%)`);
    }
    
    if (capacity.utilization.workers > this.config.scaling.scaleUpThreshold) {
      reasons.push(`High worker utilization (${(capacity.utilization.workers * 100).toFixed(1)}%)`);
    }
    
    if (capacity.performance.averageResponseTime > this.config.metrics.alertThresholds.latency) {
      reasons.push(`High response time (${capacity.performance.averageResponseTime.toFixed(1)}ms)`);
    }
    
    return reasons.join(', ') || 'System performance degradation detected';
  }

  private getScaleDownReason(capacity: SystemCapacity): string {
    return `Low resource utilization - CPU: ${capacity.utilization.cpu.toFixed(1)}%, ` +
           `Memory: ${capacity.utilization.memory.toFixed(1)}%, ` +
           `Workers: ${(capacity.utilization.workers * 100).toFixed(1)}%`;
  }

  private async scaleUp(reason: string): Promise<void> {
    console.log(`Scaling up: ${reason}`);
    
    // The LoadBalancer will handle creating new workers
    // We just need to trigger the scaling process
    this.emit('scaleUpRequested', { reason });
    
    // Wait a bit for the scaling to take effect
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Trigger load rebalancing
    await this.loadBalancer.rebalanceLoad();
  }

  private async scaleDown(reason: string): Promise<void> {
    console.log(`Scaling down: ${reason}`);
    
    // The LoadBalancer will handle removing idle workers
    // We just need to trigger the scaling process
    this.emit('scaleDownRequested', { reason });
    
    // Wait a bit for the scaling to take effect
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private startScalingEvaluation(): void {
    this.scalingTimer = setInterval(async () => {
      try {
        const decision = await this.evaluateScaling();
        await this.executeScalingDecision(decision);
      } catch (error) {
        console.error('Error during scaling evaluation:', error);
        this.metricsCollector.recordError('SCALING_EVALUATION', error as Error);
      }
    }, this.config.scaling.evaluationPeriod);
  }

  private setupEventHandlers(): void {
    // Load balancer events
    this.loadBalancer.on('workerCreated', (worker) => {
      console.log(`New worker created: ${worker.id}`);
      this.emit('workerAdded', worker);
    });
    
    this.loadBalancer.on('workerFailed', (event) => {
      console.log(`Worker failed: ${event.workerId}`);
      this.emit('workerFailed', event);
    });
    
    this.loadBalancer.on('loadRebalanced', () => {
      console.log('Load rebalanced across workers');
      this.emit('loadRebalanced');
    });
    
    // Metrics collector events
    this.metricsCollector.on('alertViolations', (violations) => {
      console.log('Alert violations detected:', violations);
      this.emit('alertViolations', violations);
    });
    
    // Health check service events
    this.healthCheckService.on('healthCheckCompleted', (result) => {
      if (result.status === 'FAIL') {
        console.log(`Health check failed: ${result.name}`);
        this.emit('healthCheckFailed', result);
      }
    });
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Scalability Manager...');
    
    if (this.scalingTimer) {
      clearInterval(this.scalingTimer);
    }
    
    // Shutdown all components
    await Promise.all([
      this.loadBalancer.shutdown(),
      this.metricsCollector.shutdown(),
      this.healthCheckService.shutdown()
    ]);
    
    this.emit('shutdown');
  }
}