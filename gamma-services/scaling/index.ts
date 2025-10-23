// Performance Alerting and Scaling Components
export { PerformanceAlerting, defaultAlertingConfig } from './PerformanceAlerting';
export { AutoScaler, defaultScalingConfig } from './AutoScaler';
export { PerformanceDashboard, defaultDashboardConfig } from './PerformanceDashboard';

// Types and Interfaces
export type {
  AlertingConfig,
  AlertThreshold,
  AlertCondition,
  EscalationRule,
  NotificationChannel,
  PerformanceAlert,
  AlertEscalation,
  AlertActionResult,
  AlertAction,
  DegradationEvent
} from './PerformanceAlerting';

export type {
  ScalingConfig,
  ScalingRule,
  ScalingCondition,
  ScalingAction,
  ScalingEvent,
  ScalingState,
  PredictiveScalingData
} from './AutoScaler';

export type {
  DashboardConfig,
  DashboardWidget,
  DashboardThreshold,
  DashboardData,
  ComponentHealth,
  TrendData,
  ChartData,
  ChartDataset
} from './PerformanceDashboard';

// Utility functions for performance management
export const PerformanceUtils = {
  /**
   * Calculate performance score based on metrics
   */
  calculatePerformanceScore: (
    processingTime: number,
    memoryUsage: number,
    cpuUsage: number,
    queueLength: number
  ): number => {
    let score = 100;
    
    // Processing time impact (0-40 points)
    if (processingTime > 500) score -= 40;
    else if (processingTime > 300) score -= 25;
    else if (processingTime > 200) score -= 15;
    
    // Memory usage impact (0-25 points)
    if (memoryUsage > 512) score -= 25;
    else if (memoryUsage > 256) score -= 15;
    else if (memoryUsage > 128) score -= 5;
    
    // CPU usage impact (0-20 points)
    if (cpuUsage > 90) score -= 20;
    else if (cpuUsage > 70) score -= 10;
    else if (cpuUsage > 50) score -= 5;
    
    // Queue length impact (0-15 points)
    if (queueLength > 20) score -= 15;
    else if (queueLength > 10) score -= 8;
    else if (queueLength > 5) score -= 3;
    
    return Math.max(0, score);
  },

  /**
   * Determine alert severity based on metric values
   */
  determineAlertSeverity: (
    metric: string,
    value: number,
    thresholds: { warning: number; critical: number }
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    if (value >= thresholds.critical) return 'CRITICAL';
    if (value >= thresholds.warning) return 'HIGH';
    if (value >= thresholds.warning * 0.8) return 'MEDIUM';
    return 'LOW';
  },

  /**
   * Calculate optimal scaling amount based on current load
   */
  calculateOptimalScaling: (
    currentLoad: number,
    targetLoad: number,
    currentInstances: number
  ): { amount: number; confidence: number } => {
    const loadRatio = currentLoad / targetLoad;
    const optimalInstances = Math.ceil(currentInstances * loadRatio);
    const amount = Math.max(1, optimalInstances - currentInstances);
    
    // Confidence based on how far we are from target
    const confidence = Math.min(1, Math.abs(loadRatio - 1) * 2);
    
    return { amount, confidence };
  },

  /**
   * Generate performance recommendations
   */
  generateRecommendations: (
    processingTime: number,
    memoryUsage: number,
    cpuUsage: number,
    queueLength: number,
    trends: any
  ): string[] => {
    const recommendations: string[] = [];
    
    // Processing time recommendations
    if (processingTime > 300) {
      recommendations.push('Optimize signal processing algorithms');
      recommendations.push('Consider implementing caching for frequently accessed data');
    }
    
    // Memory recommendations
    if (memoryUsage > 400) {
      recommendations.push('Review memory usage patterns and implement object pooling');
      recommendations.push('Check for memory leaks and optimize garbage collection');
    }
    
    // CPU recommendations
    if (cpuUsage > 80) {
      recommendations.push('Optimize CPU-intensive operations');
      recommendations.push('Consider horizontal scaling to distribute load');
    }
    
    // Queue recommendations
    if (queueLength > 15) {
      recommendations.push('Increase processing capacity or implement queue prioritization');
      recommendations.push('Consider batch processing for better throughput');
    }
    
    // Trend-based recommendations
    if (trends?.processingTime?.trend === 'UP') {
      recommendations.push('Monitor for performance regressions in recent changes');
    }
    
    if (trends?.memoryUsage?.trend === 'UP') {
      recommendations.push('Investigate potential memory leaks');
    }
    
    return recommendations;
  },

  /**
   * Format metric values for display
   */
  formatMetricValue: (value: number, unit: string): string => {
    switch (unit) {
      case 'ms':
        return `${value.toFixed(1)}ms`;
      case 'MB':
        return `${value.toFixed(1)}MB`;
      case 'GB':
        return `${(value / 1024).toFixed(2)}GB`;
      case '%':
        return `${value.toFixed(1)}%`;
      case '/sec':
        return `${value.toFixed(1)}/sec`;
      default:
        return value.toString();
    }
  },

  /**
   * Calculate trend direction and strength
   */
  calculateTrend: (values: number[]): {
    direction: 'UP' | 'DOWN' | 'STABLE';
    strength: number;
    confidence: number;
  } => {
    if (values.length < 2) {
      return { direction: 'STABLE', strength: 0, confidence: 0 };
    }
    
    // Simple linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const strength = Math.abs(slope);
    
    let direction: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (Math.abs(slope) > 0.1) {
      direction = slope > 0 ? 'UP' : 'DOWN';
    }
    
    // Confidence based on R-squared
    const meanY = sumY / n;
    const ssTotal = values.reduce((sum, v) => sum + Math.pow(v - meanY, 2), 0);
    const ssRes = values.reduce((sum, v, i) => {
      const predicted = meanY + slope * (i - (n - 1) / 2);
      return sum + Math.pow(v - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (ssRes / ssTotal);
    const confidence = Math.max(0, Math.min(1, rSquared));
    
    return { direction, strength, confidence };
  }
};

// Alert management utilities
export const AlertUtils = {
  /**
   * Create alert threshold from metric configuration
   */
  createThreshold: (
    id: string,
    name: string,
    metric: string,
    warningValue: number,
    criticalValue: number
  ): AlertThreshold => ({
    id,
    name,
    metric,
    operator: 'GREATER_THAN',
    value: criticalValue,
    severity: 'HIGH',
    enabled: true,
    conditions: [
      {
        metric,
        operator: 'GREATER_THAN',
        value: warningValue,
        duration: 60000 // 1 minute
      }
    ],
    actions: ['NOTIFY', 'LOG']
  }),

  /**
   * Format alert message for different channels
   */
  formatAlertMessage: (
    alert: PerformanceAlert,
    channel: 'EMAIL' | 'SMS' | 'SLACK' | 'WEBHOOK'
  ): string => {
    const baseMessage = `🚨 ${alert.severity} Alert: ${alert.threshold.name}`;
    const details = `Current value: ${alert.currentValue}, Threshold: ${alert.threshold.value}`;
    
    switch (channel) {
      case 'EMAIL':
        return `${baseMessage}\n\n${details}\n\nTime: ${alert.timestamp.toISOString()}\nAlert ID: ${alert.id}`;
      case 'SMS':
        return `${baseMessage} - ${details}`;
      case 'SLACK':
        return `${baseMessage}\n*Details:* ${details}\n*Time:* ${alert.timestamp.toISOString()}`;
      case 'WEBHOOK':
        return JSON.stringify({
          severity: alert.severity,
          message: alert.threshold.name,
          value: alert.currentValue,
          threshold: alert.threshold.value,
          timestamp: alert.timestamp.toISOString(),
          id: alert.id
        });
      default:
        return `${baseMessage} - ${details}`;
    }
  },

  /**
   * Calculate alert priority score
   */
  calculateAlertPriority: (alert: PerformanceAlert): number => {
    let priority = 0;
    
    // Severity weight
    switch (alert.severity) {
      case 'CRITICAL': priority += 100; break;
      case 'HIGH': priority += 75; break;
      case 'MEDIUM': priority += 50; break;
      case 'LOW': priority += 25; break;
    }
    
    // How far over threshold
    const overThreshold = (alert.currentValue - alert.threshold.value) / alert.threshold.value;
    priority += Math.min(50, overThreshold * 25);
    
    // Time since triggered (newer = higher priority)
    const ageMinutes = (Date.now() - alert.timestamp.getTime()) / (1000 * 60);
    priority += Math.max(0, 25 - ageMinutes);
    
    return Math.round(priority);
  }
};

// Scaling utilities
export const ScalingUtils = {
  /**
   * Determine if scaling is needed based on metrics
   */
  shouldScale: (
    currentMetrics: any,
    targetMetrics: any,
    currentInstances: number,
    limits: { min: number; max: number }
  ): { scale: boolean; direction: 'UP' | 'DOWN'; amount: number; reason: string } => {
    const reasons: string[] = [];
    let scaleUp = false;
    let scaleDown = false;
    
    // Check processing time
    if (currentMetrics.processingTime > targetMetrics.processingTime * 1.5) {
      scaleUp = true;
      reasons.push('High processing time');
    }
    
    // Check queue length
    if (currentMetrics.queueLength > targetMetrics.queueLength * 2) {
      scaleUp = true;
      reasons.push('High queue length');
    }
    
    // Check for scale down opportunities
    if (currentMetrics.processingTime < targetMetrics.processingTime * 0.5 &&
        currentMetrics.queueLength < targetMetrics.queueLength * 0.3 &&
        currentInstances > limits.min) {
      scaleDown = true;
      reasons.push('Low resource utilization');
    }
    
    if (scaleUp && currentInstances < limits.max) {
      return {
        scale: true,
        direction: 'UP',
        amount: 1,
        reason: reasons.join(', ')
      };
    }
    
    if (scaleDown && currentInstances > limits.min) {
      return {
        scale: true,
        direction: 'DOWN',
        amount: 1,
        reason: reasons.join(', ')
      };
    }
    
    return {
      scale: false,
      direction: 'UP',
      amount: 0,
      reason: 'No scaling needed'
    };
  },

  /**
   * Calculate scaling cooldown based on previous events
   */
  calculateCooldown: (
    recentEvents: ScalingEvent[],
    baseCooldown: number
  ): number => {
    if (recentEvents.length === 0) return baseCooldown;
    
    // Increase cooldown if there have been many recent scaling events
    const recentCount = recentEvents.filter(e => 
      Date.now() - e.timestamp.getTime() < 30 * 60 * 1000 // Last 30 minutes
    ).length;
    
    if (recentCount > 3) {
      return baseCooldown * 2; // Double cooldown
    }
    
    return baseCooldown;
  },

  /**
   * Validate scaling action against limits
   */
  validateScalingAction: (
    action: ScalingAction,
    currentState: ScalingState,
    limits: any
  ): { valid: boolean; reason?: string; adjustedAction?: ScalingAction } => {
    const currentValue = currentState.instances;
    let newValue = currentValue;
    
    if (action.unit === 'PERCENTAGE') {
      const change = Math.ceil(currentValue * (action.amount / 100));
      newValue = action.type === 'SCALE_UP' ? 
        currentValue + change : 
        currentValue - change;
    } else {
      newValue = action.type === 'SCALE_UP' ? 
        currentValue + action.amount : 
        currentValue - action.amount;
    }
    
    // Check limits
    if (newValue > limits.maxInstances) {
      return {
        valid: false,
        reason: `Would exceed maximum instances (${limits.maxInstances})`,
        adjustedAction: {
          ...action,
          amount: limits.maxInstances - currentValue
        }
      };
    }
    
    if (newValue < limits.minInstances) {
      return {
        valid: false,
        reason: `Would go below minimum instances (${limits.minInstances})`,
        adjustedAction: {
          ...action,
          amount: currentValue - limits.minInstances
        }
      };
    }
    
    return { valid: true };
  }
};

// Factory functions for creating performance management instances
export const PerformanceFactory = {
  /**
   * Create complete performance management system
   */
  createPerformanceSystem: async (
    performanceMonitor: any,
    config?: {
      alerting?: Partial<AlertingConfig>;
      scaling?: Partial<ScalingConfig>;
      dashboard?: Partial<DashboardConfig>;
    }
  ) => {
    // Create performance alerting
    const alerting = new PerformanceAlerting(
      { ...defaultAlertingConfig, ...config?.alerting },
      performanceMonitor
    );
    await alerting.initialize();
    
    // Create auto scaler
    const autoScaler = new AutoScaler(
      { ...defaultScalingConfig, ...config?.scaling },
      performanceMonitor,
      alerting
    );
    await autoScaler.initialize();
    
    // Create dashboard
    const dashboard = new PerformanceDashboard(
      { ...defaultDashboardConfig, ...config?.dashboard },
      performanceMonitor,
      alerting,
      autoScaler
    );
    await dashboard.initialize();
    
    return {
      alerting,
      autoScaler,
      dashboard
    };
  },

  /**
   * Create high-availability performance system
   */
  createHighAvailabilitySystem: async (performanceMonitor: any) => {
    const haConfig = {
      alerting: {
        escalationRules: [
          {
            severity: 'CRITICAL' as const,
            escalateAfter: 60000, // 1 minute
            escalateTo: ['ops-team@company.com', 'on-call@company.com'],
            maxEscalations: 5
          }
        ],
        thresholds: [
          {
            id: 'critical-processing-time',
            name: 'Critical Processing Time',
            metric: 'processing.tickToDecision.average',
            operator: 'GREATER_THAN' as const,
            value: 1000,
            severity: 'CRITICAL' as const,
            enabled: true,
            actions: ['NOTIFY', 'LOG', 'SCALE_UP', 'TRIGGER_RECOVERY'] as AlertAction[]
          }
        ]
      },
      scaling: {
        mode: 'AUTOMATIC' as const,
        cooldownPeriod: 120000, // 2 minutes
        limits: {
          minInstances: 2,
          maxInstances: 20,
          maxScaleUpStep: 5,
          maxScaleDownStep: 2
        },
        predictiveScaling: {
          enabled: true,
          lookAheadMinutes: 10,
          confidenceThreshold: 0.8
        }
      }
    };
    
    return PerformanceFactory.createPerformanceSystem(performanceMonitor, haConfig);
  }
};

// Export default configuration
export default {
  PerformanceUtils,
  AlertUtils,
  ScalingUtils,
  PerformanceFactory
};