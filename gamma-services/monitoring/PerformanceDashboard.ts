import { EventEmitter } from 'events';
import { PerformanceMonitor, PerformanceMetrics, OperationMetrics, PerformanceAlert } from './PerformanceMonitor';

export interface DashboardConfig {
  updateInterval: number;
  chartDataPoints: number;
  alertRetention: number;
  realTimeUpdates: boolean;
}

export interface DashboardData {
  currentMetrics: PerformanceMetrics;
  charts: {
    processingTime: ChartData;
    memoryUsage: ChartData;
    throughput: ChartData;
    concurrency: ChartData;
  };
  alerts: PerformanceAlert[];
  operations: {
    active: OperationMetrics[];
    recent: OperationMetrics[];
  };
  summary: {
    health: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    score: number;
    issues: string[];
    recommendations: string[];
  };
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  color: string;
  unit: string;
}

export class PerformanceDashboard extends EventEmitter {
  private performanceMonitor: PerformanceMonitor;
  private config: DashboardConfig;
  private updateTimer?: NodeJS.Timeout;
  private chartData: Map<string, number[]> = new Map();
  private chartLabels: string[] = [];

  constructor(performanceMonitor: PerformanceMonitor, config: DashboardConfig) {
    super();
    this.performanceMonitor = performanceMonitor;
    this.config = config;
    
    this.setupEventListeners();
  }

  public start(): void {
    console.log('📊 Starting Performance Dashboard...');
    
    if (this.config.realTimeUpdates) {
      this.updateTimer = setInterval(() => {
        this.updateDashboard();
      }, this.config.updateInterval);
    }
    
    // Initial update
    this.updateDashboard();
    
    console.log('✅ Performance Dashboard started');
    this.emit('started');
  }

  public getDashboardData(): DashboardData {
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    const alerts = this.performanceMonitor.getPerformanceAlerts()
      .slice(0, this.config.alertRetention);
    const activeOperations = this.performanceMonitor.getActiveOperations();
    const recentOperations = Array.from(this.performanceMonitor['operations'].values())
      .filter(op => op.status === 'COMPLETED' || op.status === 'FAILED')
      .sort((a, b) => (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0))
      .slice(0, 20);

    return {
      currentMetrics,
      charts: this.generateChartData(),
      alerts,
      operations: {
        active: activeOperations,
        recent: recentOperations
      },
      summary: this.generateSummary(currentMetrics, alerts, activeOperations)
    };
  }

  public getProcessingTimeChart(): ChartData {
    const metrics = this.performanceMonitor.getMetricsHistory(3600000); // Last hour
    
    return {
      labels: metrics.map(m => m.timestamp.toLocaleTimeString()),
      datasets: [
        {
          label: 'Average Processing Time',
          data: metrics.map(m => m.processing.tickToDecision.average),
          color: '#3B82F6',
          unit: 'ms'
        },
        {
          label: 'P95 Processing Time',
          data: metrics.map(m => m.processing.tickToDecision.p95),
          color: '#EF4444',
          unit: 'ms'
        },
        {
          label: 'Target (200ms)',
          data: metrics.map(() => 200),
          color: '#10B981',
          unit: 'ms'
        }
      ]
    };
  }

  public getMemoryUsageChart(): ChartData {
    const metrics = this.performanceMonitor.getMetricsHistory(3600000); // Last hour
    
    return {
      labels: metrics.map(m => m.timestamp.toLocaleTimeString()),
      datasets: [
        {
          label: 'Heap Used',
          data: metrics.map(m => m.memory.heapUsed),
          color: '#8B5CF6',
          unit: 'MB'
        },
        {
          label: 'RSS',
          data: metrics.map(m => m.memory.rss),
          color: '#F59E0B',
          unit: 'MB'
        },
        {
          label: 'Heap Total',
          data: metrics.map(m => m.memory.heapTotal),
          color: '#6B7280',
          unit: 'MB'
        }
      ]
    };
  }

  public getThroughputChart(): ChartData {
    const metrics = this.performanceMonitor.getMetricsHistory(3600000); // Last hour
    
    return {
      labels: metrics.map(m => m.timestamp.toLocaleTimeString()),
      datasets: [
        {
          label: 'Signals/sec',
          data: metrics.map(m => m.processing.throughput.signalsPerSecond),
          color: '#06B6D4',
          unit: '/sec'
        },
        {
          label: 'Tickers/sec',
          data: metrics.map(m => m.processing.throughput.tickersPerSecond),
          color: '#84CC16',
          unit: '/sec'
        },
        {
          label: 'Trades/sec',
          data: metrics.map(m => m.processing.throughput.tradesPerSecond),
          color: '#F97316',
          unit: '/sec'
        }
      ]
    };
  }

  public getConcurrencyChart(): ChartData {
    const metrics = this.performanceMonitor.getMetricsHistory(3600000); // Last hour
    
    return {
      labels: metrics.map(m => m.timestamp.toLocaleTimeString()),
      datasets: [
        {
          label: 'Active Tickers',
          data: metrics.map(m => m.concurrency.activeTickers),
          color: '#EC4899',
          unit: 'count'
        },
        {
          label: 'Queued Operations',
          data: metrics.map(m => m.concurrency.queuedOperations),
          color: '#EF4444',
          unit: 'count'
        },
        {
          label: 'Average Wait Time',
          data: metrics.map(m => m.concurrency.averageWaitTime),
          color: '#F59E0B',
          unit: 'ms'
        }
      ]
    };
  }

  public getSystemHealthScore(): {
    score: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    factors: Array<{
      name: string;
      score: number;
      weight: number;
      status: 'GOOD' | 'WARNING' | 'CRITICAL';
    }>;
  } {
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    const processingStats = this.performanceMonitor.getProcessingTimeStats();
    
    const factors = [
      {
        name: 'Processing Time',
        score: Math.max(0, 100 - (processingStats.average / 200) * 100),
        weight: 0.3,
        status: processingStats.average <= 200 ? 'GOOD' : 
                processingStats.average <= 400 ? 'WARNING' : 'CRITICAL' as const
      },
      {
        name: 'Memory Usage',
        score: Math.max(0, 100 - (currentMetrics.memory.heapUsed / 512) * 100),
        weight: 0.25,
        status: currentMetrics.memory.heapUsed <= 256 ? 'GOOD' :
                currentMetrics.memory.heapUsed <= 512 ? 'WARNING' : 'CRITICAL' as const
      },
      {
        name: 'CPU Usage',
        score: Math.max(0, 100 - currentMetrics.cpu.usage),
        weight: 0.2,
        status: currentMetrics.cpu.usage <= 50 ? 'GOOD' :
                currentMetrics.cpu.usage <= 80 ? 'WARNING' : 'CRITICAL' as const
      },
      {
        name: 'Concurrency',
        score: Math.max(0, 100 - (currentMetrics.concurrency.queuedOperations / 10) * 100),
        weight: 0.15,
        status: currentMetrics.concurrency.queuedOperations <= 5 ? 'GOOD' :
                currentMetrics.concurrency.queuedOperations <= 15 ? 'WARNING' : 'CRITICAL' as const
      },
      {
        name: 'Error Rate',
        score: Math.max(0, 100 - (currentMetrics.concurrency.failedOperations / Math.max(1, currentMetrics.concurrency.completedOperations)) * 100),
        weight: 0.1,
        status: (currentMetrics.concurrency.failedOperations / Math.max(1, currentMetrics.concurrency.completedOperations)) <= 0.01 ? 'GOOD' :
                (currentMetrics.concurrency.failedOperations / Math.max(1, currentMetrics.concurrency.completedOperations)) <= 0.05 ? 'WARNING' : 'CRITICAL' as const
      }
    ];
    
    const totalScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
    
    const status = totalScore >= 90 ? 'EXCELLENT' :
                  totalScore >= 75 ? 'GOOD' :
                  totalScore >= 60 ? 'FAIR' : 'POOR';
    
    return {
      score: Math.round(totalScore),
      status,
      factors
    };
  }

  public getPerformanceInsights(): {
    insights: Array<{
      type: 'OPTIMIZATION' | 'WARNING' | 'INFO';
      title: string;
      description: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      recommendations: string[];
    }>;
  } {
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    const processingStats = this.performanceMonitor.getProcessingTimeStats();
    const memoryLeak = this.performanceMonitor.detectMemoryLeaks();
    const insights: any[] = [];
    
    // Processing time insights
    if (processingStats.average > 200) {
      insights.push({
        type: 'WARNING',
        title: 'Processing Time Above Target',
        description: `Average processing time (${processingStats.average.toFixed(1)}ms) exceeds target (200ms)`,
        impact: processingStats.average > 400 ? 'HIGH' : 'MEDIUM',
        recommendations: [
          'Optimize signal processing algorithms',
          'Consider caching frequently accessed data',
          'Review database query performance'
        ]
      });
    }
    
    // Memory insights
    if (currentMetrics.memory.heapUsed > 400) {
      insights.push({
        type: 'WARNING',
        title: 'High Memory Usage',
        description: `Heap usage (${currentMetrics.memory.heapUsed.toFixed(1)}MB) is approaching limits`,
        impact: 'MEDIUM',
        recommendations: [
          'Review memory usage patterns',
          'Implement object pooling',
          'Consider garbage collection optimization'
        ]
      });
    }
    
    // Memory leak detection
    if (memoryLeak.suspected) {
      insights.push({
        type: 'WARNING',
        title: 'Potential Memory Leak Detected',
        description: `Memory growth detected: ${memoryLeak.growth.toFixed(1)}MB increase`,
        impact: 'HIGH',
        recommendations: memoryLeak.recommendations
      });
    }
    
    // Concurrency insights
    if (currentMetrics.concurrency.queuedOperations > 10) {
      insights.push({
        type: 'WARNING',
        title: 'High Operation Queue',
        description: `${currentMetrics.concurrency.queuedOperations} operations queued`,
        impact: 'MEDIUM',
        recommendations: [
          'Increase processing capacity',
          'Implement operation prioritization',
          'Consider horizontal scaling'
        ]
      });
    }
    
    // Positive insights
    if (processingStats.average <= 150) {
      insights.push({
        type: 'INFO',
        title: 'Excellent Processing Performance',
        description: `Processing time (${processingStats.average.toFixed(1)}ms) is well below target`,
        impact: 'LOW',
        recommendations: ['Maintain current optimization strategies']
      });
    }
    
    return { insights };
  }

  public exportMetrics(format: 'JSON' | 'CSV' = 'JSON'): string {
    const metrics = this.performanceMonitor.getMetricsHistory();
    
    if (format === 'CSV') {
      const headers = [
        'Timestamp',
        'Avg Processing Time (ms)',
        'P95 Processing Time (ms)',
        'Memory Heap Used (MB)',
        'Memory RSS (MB)',
        'CPU Usage (%)',
        'Active Tickers',
        'Queued Operations'
      ];
      
      const rows = metrics.map(m => [
        m.timestamp.toISOString(),
        m.processing.tickToDecision.average.toFixed(2),
        m.processing.tickToDecision.p95.toFixed(2),
        m.memory.heapUsed.toFixed(2),
        m.memory.rss.toFixed(2),
        m.cpu.usage.toFixed(2),
        m.concurrency.activeTickers.toString(),
        m.concurrency.queuedOperations.toString()
      ]);
      
      return [headers, ...rows]
        .map(row => row.join(','))
        .join('\n');
    }
    
    return JSON.stringify(metrics, null, 2);
  }

  private setupEventListeners(): void {
    this.performanceMonitor.on('performanceAlert', (alert: PerformanceAlert) => {
      this.emit('alert', alert);
    });
    
    this.performanceMonitor.on('operationCompleted', (operation: OperationMetrics) => {
      this.emit('operationCompleted', operation);
    });
    
    this.performanceMonitor.on('gcCompleted', (gcInfo: any) => {
      this.emit('gcCompleted', gcInfo);
    });
  }

  private updateDashboard(): void {
    const dashboardData = this.getDashboardData();
    this.emit('dashboardUpdate', dashboardData);
  }

  private generateChartData(): DashboardData['charts'] {
    return {
      processingTime: this.getProcessingTimeChart(),
      memoryUsage: this.getMemoryUsageChart(),
      throughput: this.getThroughputChart(),
      concurrency: this.getConcurrencyChart()
    };
  }

  private generateSummary(
    metrics: PerformanceMetrics,
    alerts: PerformanceAlert[],
    activeOperations: OperationMetrics[]
  ): DashboardData['summary'] {
    const healthScore = this.getSystemHealthScore();
    const insights = this.getPerformanceInsights();
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Collect issues from alerts
    alerts.filter(a => !a.acknowledged && a.severity !== 'LOW').forEach(alert => {
      issues.push(alert.message);
      recommendations.push(...alert.recommendations);
    });
    
    // Collect recommendations from insights
    insights.insights.forEach(insight => {
      if (insight.type === 'WARNING') {
        issues.push(insight.title);
      }
      recommendations.push(...insight.recommendations);
    });
    
    // Remove duplicates
    const uniqueRecommendations = [...new Set(recommendations)];
    
    return {
      health: healthScore.status,
      score: healthScore.score,
      issues,
      recommendations: uniqueRecommendations.slice(0, 5) // Top 5 recommendations
    };
  }

  public stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    console.log('📊 Performance Dashboard stopped');
    this.emit('stopped');
  }
}

// Default dashboard configuration
export const defaultDashboardConfig: DashboardConfig = {
  updateInterval: 5000, // 5 seconds
  chartDataPoints: 60, // 1 hour of data at 1-minute intervals
  alertRetention: 50, // Keep last 50 alerts
  realTimeUpdates: true
};