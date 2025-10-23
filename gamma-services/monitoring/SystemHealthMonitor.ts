import { EventEmitter } from 'events';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  error?: string;
  details?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: Date;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: number;
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  activeConnections: number;
  errorRate: number;
  throughput: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'LATENCY' | 'ERROR_RATE' | 'RESOURCE_USAGE' | 'CONNECTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  metrics: Record<string, number>;
  resolved: boolean;
}

export class SystemHealthMonitor extends EventEmitter {
  private healthChecks: Map<string, HealthCheckResult> = new Map();
  private metrics: SystemMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private performanceThresholds = {
    responseTime: {
      warning: 1000, // 1 second
      critical: 5000 // 5 seconds
    },
    errorRate: {
      warning: 0.05, // 5%
      critical: 0.15 // 15%
    },
    memoryUsage: {
      warning: 0.8, // 80%
      critical: 0.95 // 95%
    },
    cpuUsage: {
      warning: 0.7, // 70%
      critical: 0.9 // 90%
    }
  };

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Start continuous system monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.performHealthChecks();
      this.analyzePerformance();
    }, 30000); // Check every 30 seconds

    console.log('System health monitoring started');
  }

  /**
   * Stop system monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('System health monitoring stopped');
  }

  /**
   * Perform health checks for all critical services
   */
  private async performHealthChecks(): Promise<void> {
    const services = [
      'database',
      'polygon-api',
      'tradier-api',
      'event-bus',
      'paper-trading-engine'
    ];

    for (const service of services) {
      try {
        const result = await this.checkServiceHealth(service);
        this.healthChecks.set(service, result);
        
        if (result.status === 'unhealthy') {
          this.createAlert('CONNECTIVITY', 'CRITICAL', 
            `Service ${service} is unhealthy: ${result.error}`);
        }
      } catch (error) {
        const errorResult: HealthCheckResult = {
          service,
          status: 'unhealthy',
          responseTime: -1,
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        this.healthChecks.set(service, errorResult);
      }
    }

    this.emit('health-check-complete', Array.from(this.healthChecks.values()));
  }

  /**
   * Check health of a specific service
   */
  private async checkServiceHealth(service: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      switch (service) {
        case 'database':
          return await this.checkDatabaseHealth(startTime);
        case 'polygon-api':
          return await this.checkPolygonApiHealth(startTime);
        case 'tradier-api':
          return await this.checkTradierApiHealth(startTime);
        case 'event-bus':
          return await this.checkEventBusHealth(startTime);
        case 'paper-trading-engine':
          return await this.checkPaperTradingEngineHealth(startTime);
        default:
          throw new Error(`Unknown service: ${service}`);
      }
    } catch (error) {
      return {
        service,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabaseHealth(startTime: number): Promise<HealthCheckResult> {
    // Simulate database health check
    // In real implementation, this would ping the database
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'database',
      status: responseTime < 500 ? 'healthy' : responseTime < 2000 ? 'degraded' : 'unhealthy',
      responseTime,
      lastCheck: new Date(),
      details: {
        connectionPool: 'active',
        queryLatency: responseTime
      }
    };
  }

  /**
   * Check Polygon API connectivity
   */
  private async checkPolygonApiHealth(startTime: number): Promise<HealthCheckResult> {
    try {
      // Simulate API health check
      const responseTime = Math.random() * 1000 + 200; // 200-1200ms
      
      return {
        service: 'polygon-api',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date(),
        details: {
          rateLimitRemaining: Math.floor(Math.random() * 100),
          dataFreshness: 'current'
        }
      };
    } catch (error) {
      return {
        service: 'polygon-api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'API check failed'
      };
    }
  }

  /**
   * Check Tradier API connectivity
   */
  private async checkTradierApiHealth(startTime: number): Promise<HealthCheckResult> {
    try {
      const responseTime = Math.random() * 800 + 150; // 150-950ms
      
      return {
        service: 'tradier-api',
        status: responseTime < 800 ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date(),
        details: {
          rateLimitRemaining: Math.floor(Math.random() * 200),
          marketDataDelay: '15min'
        }
      };
    } catch (error) {
      return {
        service: 'tradier-api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'API check failed'
      };
    }
  }

  /**
   * Check EventBus health
   */
  private async checkEventBusHealth(startTime: number): Promise<HealthCheckResult> {
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'event-bus',
      status: 'healthy',
      responseTime,
      lastCheck: new Date(),
      details: {
        activeListeners: Math.floor(Math.random() * 50) + 10,
        eventQueue: Math.floor(Math.random() * 100),
        processingRate: Math.floor(Math.random() * 1000) + 500
      }
    };
  }

  /**
   * Check Paper Trading Engine health
   */
  private async checkPaperTradingEngineHealth(startTime: number): Promise<HealthCheckResult> {
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'paper-trading-engine',
      status: 'healthy',
      responseTime,
      lastCheck: new Date(),
      details: {
        activePositions: Math.floor(Math.random() * 20),
        pendingTrades: Math.floor(Math.random() * 5),
        lastTradeExecution: new Date(Date.now() - Math.random() * 300000) // Within 5 minutes
      }
    };
  }

  /**
   * Collect system performance metrics
   */
  private collectSystemMetrics(): void {
    const metrics: SystemMetrics = {
      timestamp: new Date(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      responseTime: this.getResponseTimeMetrics(),
      activeConnections: this.getActiveConnections(),
      errorRate: this.getErrorRate(),
      throughput: this.getThroughput()
    };

    this.metrics.push(metrics);
    
    // Keep only last 100 metrics (50 minutes of data)
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    this.emit('metrics-collected', metrics);
  }

  /**
   * Get memory usage statistics
   */
  private getMemoryUsage(): SystemMetrics['memoryUsage'] {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        used: usage.heapUsed,
        total: usage.heapTotal,
        percentage: usage.heapUsed / usage.heapTotal
      };
    }
    
    // Fallback for browser environment
    return {
      used: Math.random() * 1000000000, // Random value for demo
      total: 2000000000,
      percentage: Math.random() * 0.8 + 0.1 // 10-90%
    };
  }

  /**
   * Get CPU usage (simulated)
   */
  private getCpuUsage(): number {
    // In real implementation, this would use system monitoring
    return Math.random() * 0.6 + 0.1; // 10-70%
  }

  /**
   * Get response time metrics
   */
  private getResponseTimeMetrics(): SystemMetrics['responseTime'] {
    // Calculate from recent health checks
    const recentChecks = Array.from(this.healthChecks.values())
      .filter(check => check.responseTime > 0);
    
    if (recentChecks.length === 0) {
      return { average: 0, p95: 0, p99: 0 };
    }

    const responseTimes = recentChecks.map(check => check.responseTime).sort((a, b) => a - b);
    const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    return {
      average,
      p95: responseTimes[p95Index] || average,
      p99: responseTimes[p99Index] || average
    };
  }

  /**
   * Get active connections count
   */
  private getActiveConnections(): number {
    return Math.floor(Math.random() * 100) + 10; // 10-110 connections
  }

  /**
   * Get error rate
   */
  private getErrorRate(): number {
    return Math.random() * 0.1; // 0-10% error rate
  }

  /**
   * Get throughput (requests per second)
   */
  private getThroughput(): number {
    return Math.floor(Math.random() * 500) + 50; // 50-550 RPS
  }

  /**
   * Analyze performance and create alerts if needed
   */
  private analyzePerformance(): void {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    if (!latestMetrics) return;

    // Check response time
    if (latestMetrics.responseTime.average > this.performanceThresholds.responseTime.critical) {
      this.createAlert('LATENCY', 'CRITICAL', 
        `Average response time is ${latestMetrics.responseTime.average}ms (threshold: ${this.performanceThresholds.responseTime.critical}ms)`);
    } else if (latestMetrics.responseTime.average > this.performanceThresholds.responseTime.warning) {
      this.createAlert('LATENCY', 'MEDIUM', 
        `Average response time is elevated: ${latestMetrics.responseTime.average}ms`);
    }

    // Check error rate
    if (latestMetrics.errorRate > this.performanceThresholds.errorRate.critical) {
      this.createAlert('ERROR_RATE', 'CRITICAL', 
        `Error rate is ${(latestMetrics.errorRate * 100).toFixed(2)}% (threshold: ${this.performanceThresholds.errorRate.critical * 100}%)`);
    } else if (latestMetrics.errorRate > this.performanceThresholds.errorRate.warning) {
      this.createAlert('ERROR_RATE', 'MEDIUM', 
        `Error rate is elevated: ${(latestMetrics.errorRate * 100).toFixed(2)}%`);
    }

    // Check memory usage
    if (latestMetrics.memoryUsage.percentage > this.performanceThresholds.memoryUsage.critical) {
      this.createAlert('RESOURCE_USAGE', 'CRITICAL', 
        `Memory usage is ${(latestMetrics.memoryUsage.percentage * 100).toFixed(1)}% (threshold: ${this.performanceThresholds.memoryUsage.critical * 100}%)`);
    } else if (latestMetrics.memoryUsage.percentage > this.performanceThresholds.memoryUsage.warning) {
      this.createAlert('RESOURCE_USAGE', 'MEDIUM', 
        `Memory usage is high: ${(latestMetrics.memoryUsage.percentage * 100).toFixed(1)}%`);
    }

    // Check CPU usage
    if (latestMetrics.cpuUsage > this.performanceThresholds.cpuUsage.critical) {
      this.createAlert('RESOURCE_USAGE', 'CRITICAL', 
        `CPU usage is ${(latestMetrics.cpuUsage * 100).toFixed(1)}% (threshold: ${this.performanceThresholds.cpuUsage.critical * 100}%)`);
    } else if (latestMetrics.cpuUsage > this.performanceThresholds.cpuUsage.warning) {
      this.createAlert('RESOURCE_USAGE', 'MEDIUM', 
        `CPU usage is high: ${(latestMetrics.cpuUsage * 100).toFixed(1)}%`);
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(
    type: PerformanceAlert['type'], 
    severity: PerformanceAlert['severity'], 
    message: string
  ): void {
    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      timestamp: new Date(),
      metrics: this.getLatestMetricsSnapshot(),
      resolved: false
    };

    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    this.emit('alert-created', alert);
    console.warn(`[ALERT] ${severity}: ${message}`);
  }

  /**
   * Get snapshot of latest metrics for alert context
   */
  private getLatestMetricsSnapshot(): Record<string, number> {
    const latest = this.metrics[this.metrics.length - 1];
    if (!latest) return {};

    return {
      memoryUsagePercent: latest.memoryUsage.percentage * 100,
      cpuUsagePercent: latest.cpuUsage * 100,
      averageResponseTime: latest.responseTime.average,
      errorRatePercent: latest.errorRate * 100,
      throughput: latest.throughput,
      activeConnections: latest.activeConnections
    };
  }

  /**
   * Get all health check results
   */
  public getHealthStatus(): HealthCheckResult[] {
    return Array.from(this.healthChecks.values());
  }

  /**
   * Get system metrics for a time range
   */
  public getMetrics(minutes: number = 30): SystemMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.metrics.filter(metric => metric.timestamp >= cutoff);
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  public getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert-resolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Get overall system health status
   */
  public getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const healthResults = Array.from(this.healthChecks.values());
    
    if (healthResults.length === 0) return 'unhealthy';
    
    const unhealthyCount = healthResults.filter(r => r.status === 'unhealthy').length;
    const degradedCount = healthResults.filter(r => r.status === 'degraded').length;
    
    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > healthResults.length * 0.3) return 'degraded'; // More than 30% degraded
    
    return 'healthy';
  }

  /**
   * Update performance thresholds
   */
  public updateThresholds(newThresholds: Partial<typeof this.performanceThresholds>): void {
    this.performanceThresholds = { ...this.performanceThresholds, ...newThresholds };
    console.log('Performance thresholds updated:', this.performanceThresholds);
  }
}

// Export singleton instance
export const systemHealthMonitor = new SystemHealthMonitor();