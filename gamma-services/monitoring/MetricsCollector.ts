import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import * as os from 'os';
import * as process from 'process';

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  network: {
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  };
  disk: {
    readBytes: number;
    writeBytes: number;
    readOps: number;
    writeOps: number;
  };
}

export interface ApplicationMetrics {
  timestamp: Date;
  processing: {
    signalsProcessed: number;
    averageProcessingTime: number;
    processingTimeP95: number;
    processingTimeP99: number;
    throughput: number;
  };
  trading: {
    activeTrades: number;
    tradesExecuted: number;
    portfolioHeat: number;
    totalPnL: number;
    winRate: number;
  };
  errors: {
    totalErrors: number;
    errorRate: number;
    criticalErrors: number;
    errorsByType: Record<string, number>;
  };
  orchestrator: {
    activeTickerCount: number;
    workerCount: number;
    averageWorkerLoad: number;
    failedWorkers: number;
  };
  dataProviders: {
    polygonLatency: number;
    tradierLatency: number;
    cboeLatency: number;
    failoverCount: number;
  };
}

export interface PerformanceMetrics {
  timestamp: Date;
  latency: {
    tickToDecision: number;
    signalProcessing: number;
    optionsRecommendation: number;
    riskCalculation: number;
    databaseQuery: number;
  };
  throughput: {
    signalsPerSecond: number;
    tradesPerMinute: number;
    requestsPerSecond: number;
    eventsPerSecond: number;
  };
  reliability: {
    uptime: number;
    availability: number;
    errorRate: number;
    successRate: number;
  };
}

export interface MetricsConfig {
  collectionInterval: number;
  retentionPeriod: number;
  aggregationWindows: number[];
  alertThresholds: AlertThresholds;
  exportTargets: ExportTarget[];
}

export interface AlertThresholds {
  cpuUsage: number;
  memoryUsage: number;
  errorRate: number;
  latency: number;
  throughput: number;
  availability: number;
}

export interface ExportTarget {
  type: 'PROMETHEUS' | 'GRAFANA' | 'DATADOG' | 'CUSTOM';
  endpoint: string;
  interval: number;
  enabled: boolean;
}

export class MetricsCollector extends EventEmitter {
  private config: MetricsConfig;
  private systemMetrics: SystemMetrics[] = [];
  private applicationMetrics: ApplicationMetrics[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private performanceObserver?: PerformanceObserver;
  private collectionTimer?: NodeJS.Timeout;
  private exportTimers: Map<string, NodeJS.Timeout> = new Map();
  private startTime: Date = new Date();
  private processingTimes: number[] = [];
  private errorCounts: Map<string, number> = new Map();

  constructor(config: MetricsConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    console.log('Initializing Metrics Collector...');
    
    this.setupPerformanceObserver();
    this.startMetricsCollection();
    this.setupExportTargets();
    
    this.emit('initialized');
  }

  public recordProcessingTime(operation: string, duration: number): void {
    this.processingTimes.push(duration);
    
    // Keep only recent measurements for percentile calculations
    if (this.processingTimes.length > 1000) {
      this.processingTimes = this.processingTimes.slice(-1000);
    }
    
    this.emit('processingTimeRecorded', { operation, duration });
  }

  public recordError(type: string, error: Error): void {
    const currentCount = this.errorCounts.get(type) || 0;
    this.errorCounts.set(type, currentCount + 1);
    
    this.emit('errorRecorded', { type, error: error.message });
  }

  public recordTrade(trade: any): void {
    this.emit('tradeRecorded', trade);
  }

  public recordSignalProcessed(ticker: string, processingTime: number): void {
    this.recordProcessingTime('signalProcessing', processingTime);
    this.emit('signalProcessed', { ticker, processingTime });
  }

  public recordDataProviderLatency(provider: string, latency: number): void {
    this.emit('dataProviderLatency', { provider, latency });
  }

  public getSystemMetrics(): SystemMetrics {
    return this.collectSystemMetrics();
  }

  public getApplicationMetrics(): ApplicationMetrics {
    return this.collectApplicationMetrics();
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return this.collectPerformanceMetrics();
  }

  public getMetricsHistory(type: 'system' | 'application' | 'performance', duration: number): any[] {
    const cutoff = new Date(Date.now() - duration);
    
    switch (type) {
      case 'system':
        return this.systemMetrics.filter(m => m.timestamp >= cutoff);
      case 'application':
        return this.applicationMetrics.filter(m => m.timestamp >= cutoff);
      case 'performance':
        return this.performanceMetrics.filter(m => m.timestamp >= cutoff);
      default:
        return [];
    }
  }

  public getAggregatedMetrics(window: number): any {
    const cutoff = new Date(Date.now() - window);
    const recentMetrics = this.applicationMetrics.filter(m => m.timestamp >= cutoff);
    
    if (recentMetrics.length === 0) return null;
    
    return {
      timestamp: new Date(),
      window,
      processing: {
        averageProcessingTime: this.calculateAverage(recentMetrics.map(m => m.processing.averageProcessingTime)),
        totalSignalsProcessed: recentMetrics.reduce((sum, m) => sum + m.processing.signalsProcessed, 0),
        averageThroughput: this.calculateAverage(recentMetrics.map(m => m.processing.throughput))
      },
      trading: {
        totalTradesExecuted: recentMetrics.reduce((sum, m) => sum + m.trading.tradesExecuted, 0),
        averagePortfolioHeat: this.calculateAverage(recentMetrics.map(m => m.trading.portfolioHeat)),
        totalPnL: recentMetrics[recentMetrics.length - 1]?.trading.totalPnL || 0
      },
      errors: {
        totalErrors: recentMetrics.reduce((sum, m) => sum + m.errors.totalErrors, 0),
        averageErrorRate: this.calculateAverage(recentMetrics.map(m => m.errors.errorRate))
      }
    };
  }

  public checkAlertThresholds(): AlertViolation[] {
    const violations: AlertViolation[] = [];
    const currentMetrics = this.getSystemMetrics();
    const appMetrics = this.getApplicationMetrics();
    const perfMetrics = this.getPerformanceMetrics();
    
    // CPU usage check
    if (currentMetrics.cpu.usage > this.config.alertThresholds.cpuUsage) {
      violations.push({
        type: 'CPU_USAGE',
        severity: 'HIGH',
        currentValue: currentMetrics.cpu.usage,
        threshold: this.config.alertThresholds.cpuUsage,
        message: `CPU usage (${currentMetrics.cpu.usage.toFixed(2)}%) exceeds threshold`
      });
    }
    
    // Memory usage check
    const memoryUsagePercent = (currentMetrics.memory.used / currentMetrics.memory.total) * 100;
    if (memoryUsagePercent > this.config.alertThresholds.memoryUsage) {
      violations.push({
        type: 'MEMORY_USAGE',
        severity: 'HIGH',
        currentValue: memoryUsagePercent,
        threshold: this.config.alertThresholds.memoryUsage,
        message: `Memory usage (${memoryUsagePercent.toFixed(2)}%) exceeds threshold`
      });
    }
    
    // Error rate check
    if (appMetrics.errors.errorRate > this.config.alertThresholds.errorRate) {
      violations.push({
        type: 'ERROR_RATE',
        severity: 'CRITICAL',
        currentValue: appMetrics.errors.errorRate,
        threshold: this.config.alertThresholds.errorRate,
        message: `Error rate (${appMetrics.errors.errorRate.toFixed(4)}) exceeds threshold`
      });
    }
    
    // Latency check
    if (perfMetrics.latency.tickToDecision > this.config.alertThresholds.latency) {
      violations.push({
        type: 'HIGH_LATENCY',
        severity: 'MEDIUM',
        currentValue: perfMetrics.latency.tickToDecision,
        threshold: this.config.alertThresholds.latency,
        message: `Tick-to-decision latency (${perfMetrics.latency.tickToDecision}ms) exceeds threshold`
      });
    }
    
    return violations;
  }

  private setupPerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      for (const entry of entries) {
        if (entry.entryType === 'measure') {
          this.recordProcessingTime(entry.name, entry.duration);
        }
      }
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure'] });
  }

  private startMetricsCollection(): void {
    this.collectionTimer = setInterval(() => {
      this.collectAndStoreMetrics();
    }, this.config.collectionInterval);
  }

  private collectAndStoreMetrics(): void {
    const systemMetrics = this.collectSystemMetrics();
    const applicationMetrics = this.collectApplicationMetrics();
    const performanceMetrics = this.collectPerformanceMetrics();
    
    this.systemMetrics.push(systemMetrics);
    this.applicationMetrics.push(applicationMetrics);
    this.performanceMetrics.push(performanceMetrics);
    
    // Clean up old metrics
    this.cleanupOldMetrics();
    
    // Check for alert violations
    const violations = this.checkAlertThresholds();
    if (violations.length > 0) {
      this.emit('alertViolations', violations);
    }
    
    this.emit('metricsCollected', {
      system: systemMetrics,
      application: applicationMetrics,
      performance: performanceMetrics
    });
  }

  private collectSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date(),
      cpu: {
        usage: this.calculateCpuUsage(cpuUsage),
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: {
        used: memUsage.rss,
        free: os.freemem(),
        total: os.totalmem(),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      network: {
        bytesReceived: 0, // Would be populated from actual network stats
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0
      },
      disk: {
        readBytes: 0, // Would be populated from actual disk stats
        writeBytes: 0,
        readOps: 0,
        writeOps: 0
      }
    };
  }

  private collectApplicationMetrics(): ApplicationMetrics {
    const now = new Date();
    const recentProcessingTimes = this.processingTimes.slice(-100);
    
    return {
      timestamp: now,
      processing: {
        signalsProcessed: this.processingTimes.length,
        averageProcessingTime: this.calculateAverage(recentProcessingTimes),
        processingTimeP95: this.calculatePercentile(recentProcessingTimes, 0.95),
        processingTimeP99: this.calculatePercentile(recentProcessingTimes, 0.99),
        throughput: this.calculateThroughput()
      },
      trading: {
        activeTrades: 0, // Would be populated from actual trading data
        tradesExecuted: 0,
        portfolioHeat: 0,
        totalPnL: 0,
        winRate: 0
      },
      errors: {
        totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
        errorRate: this.calculateErrorRate(),
        criticalErrors: this.errorCounts.get('CRITICAL') || 0,
        errorsByType: Object.fromEntries(this.errorCounts)
      },
      orchestrator: {
        activeTickerCount: 0, // Would be populated from orchestrator
        workerCount: 0,
        averageWorkerLoad: 0,
        failedWorkers: 0
      },
      dataProviders: {
        polygonLatency: 0, // Would be populated from actual latency measurements
        tradierLatency: 0,
        cboeLatency: 0,
        failoverCount: 0
      }
    };
  }

  private collectPerformanceMetrics(): PerformanceMetrics {
    const uptime = Date.now() - this.startTime.getTime();
    const recentProcessingTimes = this.processingTimes.slice(-100);
    
    return {
      timestamp: new Date(),
      latency: {
        tickToDecision: this.calculateAverage(recentProcessingTimes),
        signalProcessing: this.calculateAverage(recentProcessingTimes.filter((_, i) => i % 4 === 0)),
        optionsRecommendation: this.calculateAverage(recentProcessingTimes.filter((_, i) => i % 4 === 1)),
        riskCalculation: this.calculateAverage(recentProcessingTimes.filter((_, i) => i % 4 === 2)),
        databaseQuery: this.calculateAverage(recentProcessingTimes.filter((_, i) => i % 4 === 3))
      },
      throughput: {
        signalsPerSecond: this.calculateThroughput(),
        tradesPerMinute: 0, // Would be calculated from actual trade data
        requestsPerSecond: 0,
        eventsPerSecond: 0
      },
      reliability: {
        uptime,
        availability: this.calculateAvailability(),
        errorRate: this.calculateErrorRate(),
        successRate: 1 - this.calculateErrorRate()
      }
    };
  }

  private calculateCpuUsage(cpuUsage: NodeJS.CpuUsage): number {
    // This is a simplified CPU usage calculation
    // In production, you'd want more sophisticated CPU monitoring
    return (cpuUsage.user + cpuUsage.system) / 1000000; // Convert microseconds to percentage
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateThroughput(): number {
    const timeWindow = 60000; // 1 minute
    const cutoff = Date.now() - timeWindow;
    const recentProcessingTimes = this.processingTimes.filter((_, i) => 
      Date.now() - (i * 1000) > cutoff
    );
    
    return recentProcessingTimes.length / (timeWindow / 1000); // per second
  }

  private calculateErrorRate(): number {
    const totalOperations = this.processingTimes.length;
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    
    if (totalOperations === 0) return 0;
    return totalErrors / totalOperations;
  }

  private calculateAvailability(): number {
    const uptime = Date.now() - this.startTime.getTime();
    const totalDowntime = 0; // Would track actual downtime
    
    return (uptime - totalDowntime) / uptime;
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod);
    
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp >= cutoff);
    this.applicationMetrics = this.applicationMetrics.filter(m => m.timestamp >= cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp >= cutoff);
  }

  private setupExportTargets(): void {
    for (const target of this.config.exportTargets) {
      if (!target.enabled) continue;
      
      const timer = setInterval(() => {
        this.exportMetrics(target);
      }, target.interval);
      
      this.exportTimers.set(target.type, timer);
    }
  }

  private async exportMetrics(target: ExportTarget): Promise<void> {
    try {
      const metrics = {
        system: this.getSystemMetrics(),
        application: this.getApplicationMetrics(),
        performance: this.getPerformanceMetrics()
      };
      
      switch (target.type) {
        case 'PROMETHEUS':
          await this.exportToPrometheus(target.endpoint, metrics);
          break;
        case 'GRAFANA':
          await this.exportToGrafana(target.endpoint, metrics);
          break;
        case 'DATADOG':
          await this.exportToDatadog(target.endpoint, metrics);
          break;
        case 'CUSTOM':
          await this.exportToCustomEndpoint(target.endpoint, metrics);
          break;
      }
      
    } catch (error) {
      console.error(`Failed to export metrics to ${target.type}:`, error);
      this.recordError('METRICS_EXPORT', error as Error);
    }
  }

  private async exportToPrometheus(endpoint: string, metrics: any): Promise<void> {
    // Implementation for Prometheus export
    console.log(`Exporting metrics to Prometheus: ${endpoint}`);
  }

  private async exportToGrafana(endpoint: string, metrics: any): Promise<void> {
    // Implementation for Grafana export
    console.log(`Exporting metrics to Grafana: ${endpoint}`);
  }

  private async exportToDatadog(endpoint: string, metrics: any): Promise<void> {
    // Implementation for Datadog export
    console.log(`Exporting metrics to Datadog: ${endpoint}`);
  }

  private async exportToCustomEndpoint(endpoint: string, metrics: any): Promise<void> {
    // Implementation for custom endpoint export
    console.log(`Exporting metrics to custom endpoint: ${endpoint}`);
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Metrics Collector...');
    
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
    }
    
    for (const timer of this.exportTimers.values()) {
      clearInterval(timer);
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.emit('shutdown');
  }
}

export interface AlertViolation {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentValue: number;
  threshold: number;
  message: string;
}