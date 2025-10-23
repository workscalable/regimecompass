import { EventEmitter } from 'events';
import { PerformanceMonitor, PerformanceMetrics } from '../monitoring/PerformanceMonitor';
import { PerformanceAlerting, PerformanceAlert } from './PerformanceAlerting';
import { AutoScaler, ScalingEvent } from './AutoScaler';

export interface DashboardConfig {
  enabled: boolean;
  updateInterval: number;
  dataRetention: number;
  realTimeUpdates: boolean;
  widgets: DashboardWidget[];
  thresholds: DashboardThreshold[];
}

export interface DashboardWidget {
  id: string;
  type: 'METRIC' | 'CHART' | 'ALERT' | 'SCALING' | 'STATUS';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: any;
  enabled: boolean;
}

export interface DashboardThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

export interface DashboardData {
  timestamp: Date;
  metrics: PerformanceMetrics;
  alerts: {
    active: PerformanceAlert[];
    recent: PerformanceAlert[];
    summary: {
      total: number;
      bySeverity: Record<string, number>;
    };
  };
  scaling: {
    currentState: any;
    recentEvents: ScalingEvent[];
    stats: any;
  };
  health: {
    overall: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
    score: number;
    components: ComponentHealth[];
  };
  trends: {
    processingTime: TrendData;
    memoryUsage: TrendData;
    throughput: TrendData;
    errorRate: TrendData;
  };
}

export interface ComponentHealth {
  name: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
  score: number;
  metrics: Record<string, number>;
  issues: string[];
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  color: string;
  type: 'line' | 'bar' | 'area';
}

export class PerformanceDashboard extends EventEmitter {
  private config: DashboardConfig;
  private performanceMonitor: PerformanceMonitor;
  private performanceAlerting: PerformanceAlerting;
  private autoScaler: AutoScaler;
  private metricsHistory: PerformanceMetrics[] = [];
  private updateTimer?: NodeJS.Timeout;
  private lastUpdate: Date = new Date();

  constructor(
    config: DashboardConfig,
    performanceMonitor: PerformanceMonitor,
    performanceAlerting: PerformanceAlerting,
    autoScaler: AutoScaler
  ) {
    super();
    this.config = config;
    this.performanceMonitor = performanceMonitor;
    this.performanceAlerting = performanceAlerting;
    this.autoScaler = autoScaler;
  }

  public async initialize(): Promise<void> {
    console.log('📊 Initializing Performance Dashboard...');
    
    try {
      if (this.config.enabled) {
        // Start real-time updates
        if (this.config.realTimeUpdates) {
          this.startRealTimeUpdates();
        }
        
        // Setup event listeners
        this.setupEventListeners();
      }
      
      console.log('✅ Performance Dashboard initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Performance Dashboard:', error);
      throw error;
    }
  }

  public getDashboardData(): DashboardData {
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    const activeAlerts = this.performanceAlerting.getActiveAlerts();
    const recentAlerts = this.performanceAlerting.getAlertHistory(20);
    const scalingState = this.autoScaler.getCurrentState();
    const recentScalingEvents = this.autoScaler.getScalingHistory(10);
    const scalingStats = this.autoScaler.getScalingStats();
    
    // Store metrics history
    this.metricsHistory.push(currentMetrics);
    if (this.metricsHistory.length > this.config.dataRetention) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.dataRetention);
    }
    
    return {
      timestamp: new Date(),
      metrics: currentMetrics,
      alerts: {
        active: activeAlerts,
        recent: recentAlerts,
        summary: this.calculateAlertSummary(activeAlerts, recentAlerts)
      },
      scaling: {
        currentState: scalingState,
        recentEvents: recentScalingEvents,
        stats: scalingStats
      },
      health: this.calculateSystemHealth(currentMetrics, activeAlerts),
      trends: this.calculateTrends(currentMetrics)
    };
  }

  public getProcessingTimeChart(timeRange: number = 3600000): ChartData {
    const cutoff = new Date(Date.now() - timeRange);
    const relevantMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoff);
    
    return {
      labels: relevantMetrics.map(m => m.timestamp.toLocaleTimeString()),
      datasets: [
        {
          label: 'Average Processing Time',
          data: relevantMetrics.map(m => m.processing.tickToDecision.average),
          color: '#3B82F6',
          type: 'line'
        },
        {
          label: 'P95 Processing Time',
          data: relevantMetrics.map(m => m.processing.tickToDecision.p95),
          color: '#EF4444',
          type: 'line'
        },
        {
          label: 'Target (200ms)',
          data: relevantMetrics.map(() => 200),
          color: '#10B981',
          type: 'line'
        }
      ]
    };
  }

  public getMemoryUsageChart(timeRange: number = 3600000): ChartData {
    const cutoff = new Date(Date.now() - timeRange);
    const relevantMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoff);
    
    return {
      labels: relevantMetrics.map(m => m.timestamp.toLocaleTimeString()),
      datasets: [
        {
          label: 'Heap Used (MB)',
          data: relevantMetrics.map(m => m.memory.heapUsed),
          color: '#8B5CF6',
          type: 'area'
        },
        {
          label: 'RSS (MB)',
          data: relevantMetrics.map(m => m.memory.rss),
          color: '#F59E0B',
          type: 'line'
        }
      ]
    };
  }

  public getThroughputChart(timeRange: number = 3600000): ChartData {
    const cutoff = new Date(Date.now() - timeRange);
    const relevantMetrics = this.metricsHistory.filter(m => m.timestamp >= cutoff);
    
    return {
      labels: relevantMetrics.map(m => m.timestamp.toLocaleTimeString()),
      datasets: [
        {
          label: 'Signals/sec',
          data: relevantMetrics.map(m => m.processing.throughput.signalsPerSecond),
          color: '#06B6D4',
          type: 'bar'
        },
        {
          label: 'Trades/sec',
          data: relevantMetrics.map(m => m.processing.throughput.tradesPerSecond),
          color: '#F97316',
          type: 'bar'
        }
      ]
    };
  }

  public getScalingChart(timeRange: number = 3600000): ChartData {
    const cutoff = new Date(Date.now() - timeRange);
    const scalingEvents = this.autoScaler.getScalingHistory(100)
      .filter(e => e.timestamp >= cutoff);
    
    const timePoints = this.generateTimePoints(cutoff, new Date(), 300000); // 5-minute intervals
    const instanceCounts = timePoints.map(time => {
      // Find the most recent scaling event before this time
      const relevantEvents = scalingEvents.filter(e => e.timestamp <= time);
      if (relevantEvents.length === 0) return 1; // Default
      
      const lastEvent = relevantEvents[relevantEvents.length - 1];
      return lastEvent.afterState.instances;
    });
    
    return {
      labels: timePoints.map(t => t.toLocaleTimeString()),
      datasets: [
        {
          label: 'Active Instances',
          data: instanceCounts,
          color: '#EC4899',
          type: 'line'
        }
      ]
    };
  }

  public getAlertTimeline(timeRange: number = 3600000): {
    timeline: Array<{
      timestamp: Date;
      alert: PerformanceAlert;
      type: 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED';
    }>;
  } {
    const cutoff = new Date(Date.now() - timeRange);
    const alerts = this.performanceAlerting.getAlertHistory(100);
    const timeline: any[] = [];
    
    for (const alert of alerts) {
      if (alert.timestamp >= cutoff) {
        timeline.push({
          timestamp: alert.timestamp,
          alert,
          type: 'TRIGGERED'
        });
        
        if (alert.acknowledgedAt && alert.acknowledgedAt >= cutoff) {
          timeline.push({
            timestamp: alert.acknowledgedAt,
            alert,
            type: 'ACKNOWLEDGED'
          });
        }
        
        if (alert.resolvedAt && alert.resolvedAt >= cutoff) {
          timeline.push({
            timestamp: alert.resolvedAt,
            alert,
            type: 'RESOLVED'
          });
        }
      }
    }
    
    return {
      timeline: timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    };
  }

  public getSystemOverview(): {
    uptime: number;
    version: string;
    environment: string;
    performance: {
      avgProcessingTime: number;
      memoryUsage: number;
      cpuUsage: number;
      throughput: number;
    };
    scaling: {
      currentInstances: number;
      autoScalingEnabled: boolean;
      lastScalingEvent?: Date;
    };
    alerts: {
      active: number;
      critical: number;
      unacknowledged: number;
    };
  } {
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    const activeAlerts = this.performanceAlerting.getActiveAlerts();
    const scalingState = this.autoScaler.getCurrentState();
    const recentScaling = this.autoScaler.getScalingHistory(1);
    
    return {
      uptime: currentMetrics.system.uptime,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      performance: {
        avgProcessingTime: currentMetrics.processing.tickToDecision.average,
        memoryUsage: (currentMetrics.memory.heapUsed / currentMetrics.system.totalMemory) * 100,
        cpuUsage: currentMetrics.cpu.usage,
        throughput: currentMetrics.processing.throughput.signalsPerSecond
      },
      scaling: {
        currentInstances: scalingState.instances,
        autoScalingEnabled: true, // Would check actual config
        lastScalingEvent: recentScaling.length > 0 ? recentScaling[0].timestamp : undefined
      },
      alerts: {
        active: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
        unacknowledged: activeAlerts.filter(a => a.status === 'ACTIVE').length
      }
    };
  }

  public getPerformanceInsights(): {
    insights: Array<{
      type: 'OPTIMIZATION' | 'WARNING' | 'INFO' | 'SUCCESS';
      title: string;
      description: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      recommendations: string[];
      data?: any;
    }>;
  } {
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    const trends = this.calculateTrends(currentMetrics);
    const insights: any[] = [];
    
    // Processing time insights
    if (trends.processingTime.trend === 'UP' && trends.processingTime.changePercent > 20) {
      insights.push({
        type: 'WARNING',
        title: 'Processing Time Increasing',
        description: `Processing time has increased by ${trends.processingTime.changePercent.toFixed(1)}% recently`,
        impact: 'HIGH',
        recommendations: [
          'Review recent code changes for performance regressions',
          'Check database query performance',
          'Consider scaling up resources'
        ],
        data: trends.processingTime
      });
    }
    
    // Memory insights
    if (trends.memoryUsage.trend === 'UP' && currentMetrics.memory.heapUsed > 400) {
      insights.push({
        type: 'WARNING',
        title: 'High Memory Usage',
        description: `Memory usage is ${currentMetrics.memory.heapUsed.toFixed(1)}MB and trending upward`,
        impact: 'MEDIUM',
        recommendations: [
          'Check for memory leaks',
          'Review object lifecycle management',
          'Consider garbage collection optimization'
        ],
        data: trends.memoryUsage
      });
    }
    
    // Throughput insights
    if (trends.throughput.trend === 'DOWN' && trends.throughput.changePercent < -15) {
      insights.push({
        type: 'WARNING',
        title: 'Decreasing Throughput',
        description: `System throughput has decreased by ${Math.abs(trends.throughput.changePercent).toFixed(1)}%`,
        impact: 'HIGH',
        recommendations: [
          'Investigate bottlenecks in processing pipeline',
          'Check external service dependencies',
          'Review resource utilization'
        ],
        data: trends.throughput
      });
    }
    
    // Positive insights
    if (currentMetrics.processing.tickToDecision.average < 150) {
      insights.push({
        type: 'SUCCESS',
        title: 'Excellent Processing Performance',
        description: `Processing time (${currentMetrics.processing.tickToDecision.average.toFixed(1)}ms) is well below target`,
        impact: 'LOW',
        recommendations: ['Maintain current optimization strategies']
      });
    }
    
    return { insights };
  }

  public exportDashboardData(format: 'JSON' | 'CSV' = 'JSON'): string {
    const data = this.getDashboardData();
    
    if (format === 'CSV') {
      return this.convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }

  private startRealTimeUpdates(): void {
    this.updateTimer = setInterval(() => {
      const dashboardData = this.getDashboardData();
      this.lastUpdate = new Date();
      
      this.emit('dashboardUpdate', dashboardData);
    }, this.config.updateInterval);
  }

  private setupEventListeners(): void {
    // Listen for performance alerts
    this.performanceAlerting.on('alertTriggered', (alert: PerformanceAlert) => {
      this.emit('alertTriggered', alert);
    });
    
    this.performanceAlerting.on('alertResolved', (alert: PerformanceAlert) => {
      this.emit('alertResolved', alert);
    });
    
    // Listen for scaling events
    this.autoScaler.on('scalingCompleted', (event: ScalingEvent) => {
      this.emit('scalingEvent', event);
    });
    
    // Listen for performance monitor events
    this.performanceMonitor.on('performanceAlert', (alert: any) => {
      this.emit('performanceAlert', alert);
    });
  }

  private calculateAlertSummary(activeAlerts: PerformanceAlert[], recentAlerts: PerformanceAlert[]): {
    total: number;
    bySeverity: Record<string, number>;
  } {
    const bySeverity: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };
    
    for (const alert of activeAlerts) {
      bySeverity[alert.severity]++;
    }
    
    return {
      total: activeAlerts.length,
      bySeverity
    };
  }

  private calculateSystemHealth(metrics: PerformanceMetrics, alerts: PerformanceAlert[]): {
    overall: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';
    score: number;
    components: ComponentHealth[];
  } {
    const components: ComponentHealth[] = [
      {
        name: 'Processing',
        status: this.getComponentStatus(metrics.processing.tickToDecision.average, 200, 500),
        score: this.calculateComponentScore(metrics.processing.tickToDecision.average, 200, 500),
        metrics: {
          averageTime: metrics.processing.tickToDecision.average,
          p95Time: metrics.processing.tickToDecision.p95,
          throughput: metrics.processing.throughput.signalsPerSecond
        },
        issues: metrics.processing.tickToDecision.average > 200 ? ['Processing time above target'] : []
      },
      {
        name: 'Memory',
        status: this.getComponentStatus(metrics.memory.heapUsed, 256, 512),
        score: this.calculateComponentScore(metrics.memory.heapUsed, 256, 512),
        metrics: {
          heapUsed: metrics.memory.heapUsed,
          rss: metrics.memory.rss,
          utilization: (metrics.memory.heapUsed / metrics.system.totalMemory) * 100
        },
        issues: metrics.memory.heapUsed > 400 ? ['High memory usage'] : []
      },
      {
        name: 'CPU',
        status: this.getComponentStatus(metrics.cpu.usage, 50, 80),
        score: this.calculateComponentScore(metrics.cpu.usage, 50, 80),
        metrics: {
          usage: metrics.cpu.usage,
          loadAverage: metrics.cpu.loadAverage[0]
        },
        issues: metrics.cpu.usage > 70 ? ['High CPU usage'] : []
      },
      {
        name: 'Concurrency',
        status: this.getComponentStatus(metrics.concurrency.queuedOperations, 5, 15),
        score: this.calculateComponentScore(metrics.concurrency.queuedOperations, 5, 15),
        metrics: {
          queuedOperations: metrics.concurrency.queuedOperations,
          activeTickers: metrics.concurrency.activeTickers,
          averageWaitTime: metrics.concurrency.averageWaitTime
        },
        issues: metrics.concurrency.queuedOperations > 10 ? ['High queue length'] : []
      }
    ];
    
    // Calculate overall health
    const averageScore = components.reduce((sum, c) => sum + c.score, 0) / components.length;
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
    
    let overall: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' = 'HEALTHY';
    
    if (criticalAlerts > 0 || averageScore < 60) {
      overall = 'CRITICAL';
    } else if (alerts.length > 0 || averageScore < 80) {
      overall = 'WARNING';
    }
    
    return {
      overall,
      score: Math.round(averageScore),
      components
    };
  }

  private calculateTrends(currentMetrics: PerformanceMetrics): {
    processingTime: TrendData;
    memoryUsage: TrendData;
    throughput: TrendData;
    errorRate: TrendData;
  } {
    const previousMetrics = this.metricsHistory.length > 1 ? 
      this.metricsHistory[this.metricsHistory.length - 2] : currentMetrics;
    
    return {
      processingTime: this.calculateTrendData(
        currentMetrics.processing.tickToDecision.average,
        previousMetrics.processing.tickToDecision.average
      ),
      memoryUsage: this.calculateTrendData(
        currentMetrics.memory.heapUsed,
        previousMetrics.memory.heapUsed
      ),
      throughput: this.calculateTrendData(
        currentMetrics.processing.throughput.signalsPerSecond,
        previousMetrics.processing.throughput.signalsPerSecond
      ),
      errorRate: this.calculateTrendData(
        currentMetrics.concurrency.failedOperations,
        previousMetrics.concurrency.failedOperations
      )
    };
  }

  private calculateTrendData(current: number, previous: number): TrendData {
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    
    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (Math.abs(changePercent) > 5) {
      trend = changePercent > 0 ? 'UP' : 'DOWN';
    }
    
    return {
      current,
      previous,
      change,
      changePercent,
      trend
    };
  }

  private getComponentStatus(value: number, warning: number, critical: number): ComponentHealth['status'] {
    if (value >= critical) return 'CRITICAL';
    if (value >= warning) return 'WARNING';
    return 'HEALTHY';
  }

  private calculateComponentScore(value: number, warning: number, critical: number): number {
    if (value >= critical) return 0;
    if (value >= warning) return 50;
    return Math.max(0, 100 - (value / warning) * 50);
  }

  private generateTimePoints(start: Date, end: Date, interval: number): Date[] {
    const points: Date[] = [];
    let current = new Date(start);
    
    while (current <= end) {
      points.push(new Date(current));
      current = new Date(current.getTime() + interval);
    }
    
    return points;
  }

  private convertToCSV(data: DashboardData): string {
    const headers = [
      'Timestamp',
      'Processing Time (ms)',
      'Memory Usage (MB)',
      'CPU Usage (%)',
      'Queue Length',
      'Active Alerts',
      'System Health'
    ];
    
    const row = [
      data.timestamp.toISOString(),
      data.metrics.processing.tickToDecision.average.toFixed(2),
      data.metrics.memory.heapUsed.toFixed(2),
      data.metrics.cpu.usage.toFixed(2),
      data.metrics.concurrency.queuedOperations.toString(),
      data.alerts.active.length.toString(),
      data.health.overall
    ];
    
    return [headers, row]
      .map(r => r.join(','))
      .join('\n');
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Performance Dashboard...');
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    console.log('✅ Performance Dashboard shutdown complete');
    this.emit('shutdown');
  }
}

// Default dashboard configuration
export const defaultDashboardConfig: DashboardConfig = {
  enabled: true,
  updateInterval: 5000, // 5 seconds
  dataRetention: 720, // 12 hours at 1-minute intervals
  realTimeUpdates: true,
  widgets: [
    {
      id: 'processing-time',
      type: 'CHART',
      title: 'Processing Time',
      position: { x: 0, y: 0, width: 6, height: 4 },
      config: { chartType: 'line', timeRange: 3600000 },
      enabled: true
    },
    {
      id: 'memory-usage',
      type: 'CHART',
      title: 'Memory Usage',
      position: { x: 6, y: 0, width: 6, height: 4 },
      config: { chartType: 'area', timeRange: 3600000 },
      enabled: true
    },
    {
      id: 'active-alerts',
      type: 'ALERT',
      title: 'Active Alerts',
      position: { x: 0, y: 4, width: 4, height: 3 },
      config: { maxAlerts: 10 },
      enabled: true
    },
    {
      id: 'scaling-status',
      type: 'SCALING',
      title: 'Auto Scaling',
      position: { x: 4, y: 4, width: 4, height: 3 },
      config: { showHistory: true },
      enabled: true
    },
    {
      id: 'system-health',
      type: 'STATUS',
      title: 'System Health',
      position: { x: 8, y: 4, width: 4, height: 3 },
      config: { showComponents: true },
      enabled: true
    }
  ],
  thresholds: [
    {
      metric: 'processing.tickToDecision.average',
      warning: 200,
      critical: 500,
      unit: 'ms'
    },
    {
      metric: 'memory.heapUsed',
      warning: 256,
      critical: 512,
      unit: 'MB'
    },
    {
      metric: 'cpu.usage',
      warning: 70,
      critical: 90,
      unit: '%'
    }
  ]
};