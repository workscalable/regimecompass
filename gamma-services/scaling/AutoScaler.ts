import { EventEmitter } from 'events';
import { PerformanceMonitor, PerformanceMetrics } from '../monitoring/PerformanceMonitor';
import { PerformanceAlerting } from './PerformanceAlerting';
import { auditLogger } from '../logging/AuditLogger';
import { logger } from '../logging/Logger';

export interface ScalingConfig {
  enabled: boolean;
  mode: 'MANUAL' | 'AUTOMATIC' | 'HYBRID';
  cooldownPeriod: number; // Minimum time between scaling actions
  scaleUpRules: ScalingRule[];
  scaleDownRules: ScalingRule[];
  limits: {
    minInstances: number;
    maxInstances: number;
    maxScaleUpStep: number;
    maxScaleDownStep: number;
  };
  targetMetrics: {
    cpuUtilization: number;
    memoryUtilization: number;
    processingTime: number;
    queueLength: number;
  };
  predictiveScaling: {
    enabled: boolean;
    lookAheadMinutes: number;
    confidenceThreshold: number;
  };
}

export interface ScalingRule {
  id: string;
  name: string;
  conditions: ScalingCondition[];
  action: ScalingAction;
  priority: number;
  enabled: boolean;
  cooldown?: number; // Override global cooldown
}

export interface ScalingCondition {
  metric: string;
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS';
  value: number;
  duration: number; // How long condition must persist
  aggregation: 'AVERAGE' | 'MAX' | 'MIN' | 'SUM';
}

export interface ScalingAction {
  type: 'SCALE_UP' | 'SCALE_DOWN';
  amount: number; // Number of instances or percentage
  unit: 'INSTANCES' | 'PERCENTAGE';
  target: 'WORKERS' | 'CONNECTIONS' | 'THREADS' | 'PROCESSES';
}

export interface ScalingEvent {
  id: string;
  timestamp: Date;
  type: 'SCALE_UP' | 'SCALE_DOWN' | 'SCALE_PREDICTION';
  trigger: 'RULE' | 'ALERT' | 'MANUAL' | 'PREDICTIVE';
  rule?: ScalingRule;
  metrics: PerformanceMetrics;
  action: ScalingAction;
  beforeState: ScalingState;
  afterState: ScalingState;
  success: boolean;
  error?: string;
  duration: number;
}

export interface ScalingState {
  instances: number;
  workers: number;
  connections: number;
  threads: number;
  processes: number;
  lastScaled: Date;
  status: 'STABLE' | 'SCALING_UP' | 'SCALING_DOWN' | 'ERROR';
}

export interface PredictiveScalingData {
  timestamp: Date;
  predictedMetrics: PerformanceMetrics;
  confidence: number;
  recommendedAction?: ScalingAction;
  reasoning: string[];
}

export class AutoScaler extends EventEmitter {
  private config: ScalingConfig;
  private performanceMonitor: PerformanceMonitor;
  private performanceAlerting: PerformanceAlerting;
  private currentState: ScalingState;
  private scalingHistory: ScalingEvent[] = [];
  private lastScalingTime: Date = new Date(0);
  private conditionHistory: Map<string, Array<{ timestamp: Date; value: number }>> = new Map();
  private monitoringTimer?: NodeJS.Timeout;
  private predictiveData: PredictiveScalingData[] = [];

  constructor(
    config: ScalingConfig,
    performanceMonitor: PerformanceMonitor,
    performanceAlerting: PerformanceAlerting
  ) {
    super();
    this.config = config;
    this.performanceMonitor = performanceMonitor;
    this.performanceAlerting = performanceAlerting;
    
    this.currentState = {
      instances: config.limits.minInstances,
      workers: 1,
      connections: 10,
      threads: 4,
      processes: 1,
      lastScaled: new Date(),
      status: 'STABLE'
    };
  }

  public async initialize(): Promise<void> {
    console.log('⚖️ Initializing Auto Scaler...');
    
    try {
      if (this.config.enabled) {
        // Start monitoring
        this.startMonitoring();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize predictive scaling if enabled
        if (this.config.predictiveScaling.enabled) {
          this.initializePredictiveScaling();
        }
      }
      
      console.log('✅ Auto Scaler initialized');
      this.emit('initialized');
      
      // Log initialization
      await auditLogger.logSystemStart({
        component: 'AutoScaler',
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          config: {
            enabled: this.config.enabled,
            mode: this.config.mode,
            minInstances: this.config.limits.minInstances,
            maxInstances: this.config.limits.maxInstances
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Auto Scaler:', error);
      throw error;
    }
  }

  public async evaluateScaling(metrics: PerformanceMetrics): Promise<ScalingEvent | null> {
    if (!this.config.enabled || this.config.mode === 'MANUAL') {
      return null;
    }
    
    // Check cooldown period
    if (this.isInCooldown()) {
      return null;
    }
    
    // Update condition history
    this.updateConditionHistory(metrics);
    
    // Evaluate scale-up rules first (higher priority)
    for (const rule of this.config.scaleUpRules.sort((a, b) => b.priority - a.priority)) {
      if (!rule.enabled) continue;
      
      if (await this.evaluateRule(rule, metrics)) {
        return await this.executeScaling(rule, metrics, 'RULE');
      }
    }
    
    // Evaluate scale-down rules
    for (const rule of this.config.scaleDownRules.sort((a, b) => b.priority - a.priority)) {
      if (!rule.enabled) continue;
      
      if (await this.evaluateRule(rule, metrics)) {
        return await this.executeScaling(rule, metrics, 'RULE');
      }
    }
    
    return null;
  }

  public async manualScale(
    action: ScalingAction,
    reason: string = 'Manual scaling'
  ): Promise<ScalingEvent> {
    const metrics = this.performanceMonitor.getCurrentMetrics();
    
    const manualRule: ScalingRule = {
      id: 'manual',
      name: reason,
      conditions: [],
      action,
      priority: 1000,
      enabled: true
    };
    
    return await this.executeScaling(manualRule, metrics, 'MANUAL');
  }

  public async predictiveScale(): Promise<PredictiveScalingData | null> {
    if (!this.config.predictiveScaling.enabled) {
      return null;
    }
    
    try {
      const prediction = await this.generatePrediction();
      
      if (prediction.confidence >= this.config.predictiveScaling.confidenceThreshold) {
        // Execute predictive scaling if recommended
        if (prediction.recommendedAction) {
          const metrics = this.performanceMonitor.getCurrentMetrics();
          
          const predictiveRule: ScalingRule = {
            id: 'predictive',
            name: 'Predictive Scaling',
            conditions: [],
            action: prediction.recommendedAction,
            priority: 500,
            enabled: true
          };
          
          await this.executeScaling(predictiveRule, metrics, 'PREDICTIVE');
        }
      }
      
      return prediction;
      
    } catch (error) {
      console.error('Predictive scaling error:', error);
      return null;
    }
  }

  public getCurrentState(): ScalingState {
    return { ...this.currentState };
  }

  public getScalingHistory(limit: number = 50): ScalingEvent[] {
    return this.scalingHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getScalingStats(): {
    totalScalingEvents: number;
    scaleUpEvents: number;
    scaleDownEvents: number;
    averageScalingDuration: number;
    successRate: number;
    currentUtilization: {
      cpu: number;
      memory: number;
      processing: number;
      queue: number;
    };
  } {
    const scaleUpEvents = this.scalingHistory.filter(e => e.type === 'SCALE_UP').length;
    const scaleDownEvents = this.scalingHistory.filter(e => e.type === 'SCALE_DOWN').length;
    const successfulEvents = this.scalingHistory.filter(e => e.success).length;
    
    const averageDuration = this.scalingHistory.length > 0 ? 
      this.scalingHistory.reduce((sum, e) => sum + e.duration, 0) / this.scalingHistory.length : 0;
    
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    
    return {
      totalScalingEvents: this.scalingHistory.length,
      scaleUpEvents,
      scaleDownEvents,
      averageScalingDuration: averageDuration,
      successRate: this.scalingHistory.length > 0 ? successfulEvents / this.scalingHistory.length : 0,
      currentUtilization: {
        cpu: currentMetrics.cpu.usage,
        memory: (currentMetrics.memory.heapUsed / currentMetrics.system.totalMemory) * 100,
        processing: currentMetrics.processing.tickToDecision.average,
        queue: currentMetrics.concurrency.queuedOperations
      }
    };
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        const metrics = this.performanceMonitor.getCurrentMetrics();
        
        // Evaluate scaling
        const scalingEvent = await this.evaluateScaling(metrics);
        
        // Predictive scaling check
        if (this.config.predictiveScaling.enabled) {
          await this.predictiveScale();
        }
        
        this.emit('monitoringCycle', {
          metrics,
          scalingEvent: !!scalingEvent,
          currentState: this.currentState
        });
        
      } catch (error) {
        console.error('Auto scaler monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private setupEventListeners(): void {
    // Listen for performance alerts
    this.performanceAlerting.on('alertTriggered', async (alert: any) => {
      await this.handlePerformanceAlert(alert);
    });
    
    // Listen for scaling requests from other components
    this.on('scaleUp', async (data: any) => {
      await this.handleScaleUpRequest(data);
    });
    
    this.on('scaleDown', async (data: any) => {
      await this.handleScaleDownRequest(data);
    });
  }

  private initializePredictiveScaling(): void {
    // Initialize predictive scaling models and data collection
    console.log('🔮 Predictive scaling initialized');
  }

  private async handlePerformanceAlert(alert: any): Promise<void> {
    if (this.config.mode === 'MANUAL') return;
    
    // Determine scaling action based on alert
    let action: ScalingAction | null = null;
    
    if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
      if (alert.threshold.metric.includes('processing') || 
          alert.threshold.metric.includes('queue')) {
        action = {
          type: 'SCALE_UP',
          amount: 1,
          unit: 'INSTANCES',
          target: 'WORKERS'
        };
      }
    }
    
    if (action) {
      const metrics = this.performanceMonitor.getCurrentMetrics();
      
      const alertRule: ScalingRule = {
        id: `alert-${alert.id}`,
        name: `Alert Response: ${alert.threshold.name}`,
        conditions: [],
        action,
        priority: 800,
        enabled: true
      };
      
      await this.executeScaling(alertRule, metrics, 'ALERT');
    }
  }

  private async handleScaleUpRequest(data: any): Promise<void> {
    const action: ScalingAction = {
      type: 'SCALE_UP',
      amount: data.amount || 1,
      unit: data.unit || 'INSTANCES',
      target: data.target || 'WORKERS'
    };
    
    await this.manualScale(action, data.reason || 'External scale up request');
  }

  private async handleScaleDownRequest(data: any): Promise<void> {
    const action: ScalingAction = {
      type: 'SCALE_DOWN',
      amount: data.amount || 1,
      unit: data.unit || 'INSTANCES',
      target: data.target || 'WORKERS'
    };
    
    await this.manualScale(action, data.reason || 'External scale down request');
  }

  private isInCooldown(): boolean {
    const timeSinceLastScaling = Date.now() - this.lastScalingTime.getTime();
    return timeSinceLastScaling < this.config.cooldownPeriod;
  }

  private updateConditionHistory(metrics: PerformanceMetrics): void {
    const timestamp = new Date();
    
    // Track key metrics for condition evaluation
    const metricsToTrack = [
      'processing.tickToDecision.average',
      'memory.heapUsed',
      'cpu.usage',
      'concurrency.queuedOperations'
    ];
    
    for (const metric of metricsToTrack) {
      const value = this.getMetricValue(metric, metrics);
      
      if (!this.conditionHistory.has(metric)) {
        this.conditionHistory.set(metric, []);
      }
      
      const history = this.conditionHistory.get(metric)!;
      history.push({ timestamp, value });
      
      // Keep only last 100 data points
      if (history.length > 100) {
        history.shift();
      }
    }
  }

  private async evaluateRule(rule: ScalingRule, metrics: PerformanceMetrics): Promise<boolean> {
    if (rule.conditions.length === 0) return false;
    
    // All conditions must be met
    for (const condition of rule.conditions) {
      if (!await this.evaluateCondition(condition, metrics)) {
        return false;
      }
    }
    
    return true;
  }

  private async evaluateCondition(condition: ScalingCondition, metrics: PerformanceMetrics): Promise<boolean> {
    const history = this.conditionHistory.get(condition.metric);
    if (!history || history.length === 0) return false;
    
    // Check if condition has been met for the required duration
    const cutoffTime = new Date(Date.now() - condition.duration);
    const recentHistory = history.filter(h => h.timestamp >= cutoffTime);
    
    if (recentHistory.length === 0) return false;
    
    // Apply aggregation
    let aggregatedValue: number;
    const values = recentHistory.map(h => h.value);
    
    switch (condition.aggregation) {
      case 'AVERAGE':
        aggregatedValue = values.reduce((sum, v) => sum + v, 0) / values.length;
        break;
      case 'MAX':
        aggregatedValue = Math.max(...values);
        break;
      case 'MIN':
        aggregatedValue = Math.min(...values);
        break;
      case 'SUM':
        aggregatedValue = values.reduce((sum, v) => sum + v, 0);
        break;
      default:
        aggregatedValue = values[values.length - 1];
    }
    
    // Evaluate condition
    switch (condition.operator) {
      case 'GREATER_THAN':
        return aggregatedValue > condition.value;
      case 'LESS_THAN':
        return aggregatedValue < condition.value;
      case 'EQUALS':
        return aggregatedValue === condition.value;
      default:
        return false;
    }
  }

  private async executeScaling(
    rule: ScalingRule,
    metrics: PerformanceMetrics,
    trigger: ScalingEvent['trigger']
  ): Promise<ScalingEvent> {
    const startTime = Date.now();
    const beforeState = { ...this.currentState };
    
    this.currentState.status = rule.action.type === 'SCALE_UP' ? 'SCALING_UP' : 'SCALING_DOWN';
    
    const scalingEvent: ScalingEvent = {
      id: `scaling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: rule.action.type,
      trigger,
      rule,
      metrics,
      action: rule.action,
      beforeState,
      afterState: { ...this.currentState },
      success: false,
      duration: 0
    };
    
    try {
      // Execute the scaling action
      await this.performScalingAction(rule.action);
      
      scalingEvent.success = true;
      scalingEvent.afterState = { ...this.currentState };
      this.currentState.status = 'STABLE';
      this.currentState.lastScaled = new Date();
      this.lastScalingTime = new Date();
      
      // Log successful scaling
      await auditLogger.logEvent(
        'CONFIGURATION_CHANGED',
        'scaling',
        rule.action.type.toLowerCase(),
        {
          scalingEventId: scalingEvent.id,
          rule: rule.name,
          trigger,
          beforeState,
          afterState: scalingEvent.afterState
        },
        'SUCCESS',
        { component: 'AutoScaler', operation: 'execute_scaling' }
      );
      
      this.emit('scalingCompleted', scalingEvent);
      
    } catch (error) {
      scalingEvent.success = false;
      scalingEvent.error = error instanceof Error ? error.message : String(error);
      this.currentState.status = 'ERROR';
      
      // Log failed scaling
      await auditLogger.logErrorOccurred(
        'SCALING_ERROR',
        scalingEvent.error,
        {
          component: 'AutoScaler',
          operation: 'execute_scaling',
          metadata: { scalingEventId: scalingEvent.id, rule: rule.name }
        }
      );
      
      this.emit('scalingFailed', scalingEvent);
    }
    
    scalingEvent.duration = Date.now() - startTime;
    this.scalingHistory.push(scalingEvent);
    
    // Keep only recent history
    if (this.scalingHistory.length > 1000) {
      this.scalingHistory = this.scalingHistory.slice(-1000);
    }
    
    return scalingEvent;
  }

  private async performScalingAction(action: ScalingAction): Promise<void> {
    const currentValue = this.getCurrentTargetValue(action.target);
    let newValue: number;
    
    if (action.unit === 'PERCENTAGE') {
      const change = Math.ceil(currentValue * (action.amount / 100));
      newValue = action.type === 'SCALE_UP' ? 
        currentValue + change : 
        Math.max(1, currentValue - change);
    } else {
      newValue = action.type === 'SCALE_UP' ? 
        currentValue + action.amount : 
        Math.max(1, currentValue - action.amount);
    }
    
    // Apply limits
    newValue = this.applyScalingLimits(action, newValue);
    
    // Update the target value
    this.setTargetValue(action.target, newValue);
    
    // Simulate scaling delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`⚖️ Scaled ${action.target} from ${currentValue} to ${newValue} (${action.type})`);
  }

  private getCurrentTargetValue(target: ScalingAction['target']): number {
    switch (target) {
      case 'WORKERS':
        return this.currentState.workers;
      case 'CONNECTIONS':
        return this.currentState.connections;
      case 'THREADS':
        return this.currentState.threads;
      case 'PROCESSES':
        return this.currentState.processes;
      default:
        return this.currentState.instances;
    }
  }

  private setTargetValue(target: ScalingAction['target'], value: number): void {
    switch (target) {
      case 'WORKERS':
        this.currentState.workers = value;
        break;
      case 'CONNECTIONS':
        this.currentState.connections = value;
        break;
      case 'THREADS':
        this.currentState.threads = value;
        break;
      case 'PROCESSES':
        this.currentState.processes = value;
        break;
      default:
        this.currentState.instances = value;
    }
  }

  private applyScalingLimits(action: ScalingAction, newValue: number): number {
    if (action.type === 'SCALE_UP') {
      const maxStep = action.unit === 'PERCENTAGE' ? 
        Math.ceil(newValue * (this.config.limits.maxScaleUpStep / 100)) :
        this.config.limits.maxScaleUpStep;
      
      return Math.min(newValue, this.config.limits.maxInstances, maxStep);
    } else {
      const maxStep = action.unit === 'PERCENTAGE' ? 
        Math.ceil(newValue * (this.config.limits.maxScaleDownStep / 100)) :
        this.config.limits.maxScaleDownStep;
      
      return Math.max(newValue, this.config.limits.minInstances, maxStep);
    }
  }

  private getMetricValue(metric: string, metrics: PerformanceMetrics): number {
    switch (metric) {
      case 'processing.tickToDecision.average':
        return metrics.processing.tickToDecision.average;
      case 'memory.heapUsed':
        return metrics.memory.heapUsed;
      case 'cpu.usage':
        return metrics.cpu.usage;
      case 'concurrency.queuedOperations':
        return metrics.concurrency.queuedOperations;
      default:
        return 0;
    }
  }

  private async generatePrediction(): Promise<PredictiveScalingData> {
    // Simplified predictive model - would use ML in production
    const currentMetrics = this.performanceMonitor.getCurrentMetrics();
    const recentHistory = this.scalingHistory.slice(-10);
    
    // Predict based on trends
    const processingTrend = this.calculateTrend('processing.tickToDecision.average');
    const memoryTrend = this.calculateTrend('memory.heapUsed');
    const queueTrend = this.calculateTrend('concurrency.queuedOperations');
    
    const predictedMetrics: PerformanceMetrics = {
      ...currentMetrics,
      processing: {
        ...currentMetrics.processing,
        tickToDecision: {
          ...currentMetrics.processing.tickToDecision,
          average: Math.max(0, currentMetrics.processing.tickToDecision.average + processingTrend)
        }
      },
      memory: {
        ...currentMetrics.memory,
        heapUsed: Math.max(0, currentMetrics.memory.heapUsed + memoryTrend)
      },
      concurrency: {
        ...currentMetrics.concurrency,
        queuedOperations: Math.max(0, currentMetrics.concurrency.queuedOperations + queueTrend)
      }
    };
    
    const reasoning: string[] = [];
    let recommendedAction: ScalingAction | undefined;
    let confidence = 0.5;
    
    // Simple prediction logic
    if (processingTrend > 50 || queueTrend > 5) {
      recommendedAction = {
        type: 'SCALE_UP',
        amount: 1,
        unit: 'INSTANCES',
        target: 'WORKERS'
      };
      reasoning.push('Predicted increase in processing time and queue length');
      confidence = 0.7;
    } else if (processingTrend < -20 && queueTrend < -2 && this.currentState.workers > this.config.limits.minInstances) {
      recommendedAction = {
        type: 'SCALE_DOWN',
        amount: 1,
        unit: 'INSTANCES',
        target: 'WORKERS'
      };
      reasoning.push('Predicted decrease in processing time and queue length');
      confidence = 0.6;
    }
    
    return {
      timestamp: new Date(),
      predictedMetrics,
      confidence,
      recommendedAction,
      reasoning
    };
  }

  private calculateTrend(metric: string): number {
    const history = this.conditionHistory.get(metric);
    if (!history || history.length < 5) return 0;
    
    const recent = history.slice(-5);
    const values = recent.map(h => h.value);
    
    // Simple linear trend calculation
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + (i * v), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope * this.config.predictiveScaling.lookAheadMinutes;
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Auto Scaler...');
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    // Log final stats
    const stats = this.getScalingStats();
    
    await auditLogger.logSystemStop({
      component: 'AutoScaler',
      metadata: {
        uptime: Date.now(),
        reason: 'shutdown',
        finalStats: {
          totalScalingEvents: stats.totalScalingEvents,
          successRate: stats.successRate,
          currentState: this.currentState
        }
      }
    });
    
    console.log('✅ Auto Scaler shutdown complete');
    this.emit('shutdown');
  }
}

// Default scaling configuration
export const defaultScalingConfig: ScalingConfig = {
  enabled: true,
  mode: 'AUTOMATIC',
  cooldownPeriod: 300000, // 5 minutes
  scaleUpRules: [
    {
      id: 'high-processing-time',
      name: 'High Processing Time Scale Up',
      conditions: [
        {
          metric: 'processing.tickToDecision.average',
          operator: 'GREATER_THAN',
          value: 300,
          duration: 120000, // 2 minutes
          aggregation: 'AVERAGE'
        }
      ],
      action: {
        type: 'SCALE_UP',
        amount: 1,
        unit: 'INSTANCES',
        target: 'WORKERS'
      },
      priority: 100,
      enabled: true
    },
    {
      id: 'high-queue-length',
      name: 'High Queue Length Scale Up',
      conditions: [
        {
          metric: 'concurrency.queuedOperations',
          operator: 'GREATER_THAN',
          value: 15,
          duration: 60000, // 1 minute
          aggregation: 'AVERAGE'
        }
      ],
      action: {
        type: 'SCALE_UP',
        amount: 1,
        unit: 'INSTANCES',
        target: 'WORKERS'
      },
      priority: 90,
      enabled: true
    }
  ],
  scaleDownRules: [
    {
      id: 'low-processing-time',
      name: 'Low Processing Time Scale Down',
      conditions: [
        {
          metric: 'processing.tickToDecision.average',
          operator: 'LESS_THAN',
          value: 100,
          duration: 600000, // 10 minutes
          aggregation: 'AVERAGE'
        },
        {
          metric: 'concurrency.queuedOperations',
          operator: 'LESS_THAN',
          value: 3,
          duration: 600000, // 10 minutes
          aggregation: 'AVERAGE'
        }
      ],
      action: {
        type: 'SCALE_DOWN',
        amount: 1,
        unit: 'INSTANCES',
        target: 'WORKERS'
      },
      priority: 50,
      enabled: true
    }
  ],
  limits: {
    minInstances: 1,
    maxInstances: 10,
    maxScaleUpStep: 3,
    maxScaleDownStep: 2
  },
  targetMetrics: {
    cpuUtilization: 70,
    memoryUtilization: 80,
    processingTime: 200,
    queueLength: 10
  },
  predictiveScaling: {
    enabled: false,
    lookAheadMinutes: 15,
    confidenceThreshold: 0.7
  }
};