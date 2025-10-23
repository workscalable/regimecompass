import { EventEmitter } from 'events';
import { PerformanceMonitor, PerformanceMetrics } from '../monitoring/PerformanceMonitor';
import { auditLogger } from '../logging/AuditLogger';
import { logger } from '../logging/Logger';

export interface AlertingConfig {
  enabled: boolean;
  checkInterval: number;
  alertCooldown: number; // Minimum time between similar alerts
  escalationRules: EscalationRule[];
  thresholds: AlertThreshold[];
  channels: NotificationChannel[];
  degradationDetection: {
    enabled: boolean;
    windowSize: number;
    degradationThreshold: number;
    recoveryThreshold: number;
  };
}

export interface AlertThreshold {
  id: string;
  name: string;
  metric: string;
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'NOT_EQUALS';
  value: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  conditions?: AlertCondition[];
  actions: AlertAction[];
}

export interface AlertCondition {
  metric: string;
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS';
  value: number;
  duration?: number; // How long condition must persist
}

export interface EscalationRule {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  escalateAfter: number; // milliseconds
  escalateTo: string[];
  maxEscalations: number;
}

export interface NotificationChannel {
  id: string;
  type: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'SLACK' | 'TEAMS';
  config: any;
  enabled: boolean;
  severityFilter: string[];
  rateLimiting: {
    enabled: boolean;
    maxPerHour: number;
    maxPerDay: number;
  };
}

export interface PerformanceAlert {
  id: string;
  timestamp: Date;
  threshold: AlertThreshold;
  currentValue: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  context: {
    metric: string;
    component: string;
    additionalData?: any;
  };
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  escalations: AlertEscalation[];
  actions: AlertActionResult[];
}

export interface AlertEscalation {
  timestamp: Date;
  escalatedTo: string[];
  reason: string;
  level: number;
}

export interface AlertActionResult {
  action: AlertAction;
  timestamp: Date;
  success: boolean;
  result?: any;
  error?: string;
}

export type AlertAction = 
  | 'NOTIFY'
  | 'LOG'
  | 'SCALE_UP'
  | 'SCALE_DOWN'
  | 'RESTART_SERVICE'
  | 'THROTTLE_REQUESTS'
  | 'ENABLE_CIRCUIT_BREAKER'
  | 'TRIGGER_RECOVERY';

export interface DegradationEvent {
  id: string;
  timestamp: Date;
  type: 'PERFORMANCE_DEGRADATION' | 'PERFORMANCE_RECOVERY';
  metrics: {
    before: PerformanceMetrics;
    after: PerformanceMetrics;
    degradationScore: number;
  };
  affectedComponents: string[];
  recoveryActions: string[];
  status: 'DETECTED' | 'RECOVERING' | 'RECOVERED';
}

export class PerformanceAlerting extends EventEmitter {
  private config: AlertingConfig;
  private performanceMonitor: PerformanceMonitor;
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private alertHistory: PerformanceAlert[] = [];
  private lastAlertTimes: Map<string, Date> = new Map();
  private degradationEvents: Map<string, DegradationEvent> = new Map();
  private monitoringTimer?: NodeJS.Timeout;
  private metricsHistory: PerformanceMetrics[] = [];

  constructor(config: AlertingConfig, performanceMonitor: PerformanceMonitor) {
    super();
    this.config = config;
    this.performanceMonitor = performanceMonitor;
  }

  public async initialize(): Promise<void> {
    console.log('🚨 Initializing Performance Alerting...');
    
    try {
      if (this.config.enabled) {
        // Start monitoring
        this.startMonitoring();
        
        // Setup performance monitor event listeners
        this.setupEventListeners();
      }
      
      console.log('✅ Performance Alerting initialized');
      this.emit('initialized');
      
      // Log initialization
      await auditLogger.logSystemStart({
        component: 'PerformanceAlerting',
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          config: {
            enabled: this.config.enabled,
            thresholds: this.config.thresholds.length,
            channels: this.config.channels.length
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Performance Alerting:', error);
      throw error;
    }
  }

  public async checkThresholds(metrics: PerformanceMetrics): Promise<PerformanceAlert[]> {
    const triggeredAlerts: PerformanceAlert[] = [];
    
    for (const threshold of this.config.thresholds) {
      if (!threshold.enabled) continue;
      
      const currentValue = this.getMetricValue(threshold.metric, metrics);
      const thresholdMet = this.evaluateThreshold(threshold, currentValue);
      
      if (thresholdMet) {
        // Check if we're in cooldown period
        const lastAlertTime = this.lastAlertTimes.get(threshold.id);
        if (lastAlertTime && 
            Date.now() - lastAlertTime.getTime() < this.config.alertCooldown) {
          continue;
        }
        
        // Check additional conditions if specified
        if (threshold.conditions && !this.evaluateConditions(threshold.conditions, metrics)) {
          continue;
        }
        
        const alert = await this.createAlert(threshold, currentValue, metrics);
        triggeredAlerts.push(alert);
        
        this.lastAlertTimes.set(threshold.id, new Date());
      }
    }
    
    return triggeredAlerts;
  }

  public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }
    
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    
    this.emit('alertAcknowledged', alert);
    
    // Log acknowledgment
    await auditLogger.logAlertAcknowledged(alertId, acknowledgedBy, {
      component: 'PerformanceAlerting',
      operation: 'acknowledge_alert'
    });
    
    return true;
  }

  public async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }
    
    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    
    // Move to history
    this.alertHistory.push(alert);
    this.activeAlerts.delete(alertId);
    
    this.emit('alertResolved', alert);
    
    // Log resolution
    await auditLogger.logAlertResolved(alertId, resolvedBy || 'system', {
      component: 'PerformanceAlerting',
      operation: 'resolve_alert'
    });
    
    return true;
  }

  public async detectPerformanceDegradation(
    currentMetrics: PerformanceMetrics
  ): Promise<DegradationEvent | null> {
    if (!this.config.degradationDetection.enabled) {
      return null;
    }
    
    // Store metrics history
    this.metricsHistory.push(currentMetrics);
    
    // Keep only recent history
    const windowSize = this.config.degradationDetection.windowSize;
    if (this.metricsHistory.length > windowSize) {
      this.metricsHistory = this.metricsHistory.slice(-windowSize);
    }
    
    // Need at least half window size for comparison
    if (this.metricsHistory.length < windowSize / 2) {
      return null;
    }
    
    // Calculate degradation score
    const degradationScore = this.calculateDegradationScore(currentMetrics);
    
    if (degradationScore > this.config.degradationDetection.degradationThreshold) {
      // Performance degradation detected
      const degradationEvent = await this.createDegradationEvent(
        'PERFORMANCE_DEGRADATION',
        currentMetrics,
        degradationScore
      );
      
      return degradationEvent;
    }
    
    // Check for recovery
    const activeEvents = Array.from(this.degradationEvents.values())
      .filter(event => event.status === 'DETECTED' || event.status === 'RECOVERING');
    
    if (activeEvents.length > 0 && 
        degradationScore < this.config.degradationDetection.recoveryThreshold) {
      // Performance recovery detected
      const recoveryEvent = await this.createDegradationEvent(
        'PERFORMANCE_RECOVERY',
        currentMetrics,
        degradationScore
      );
      
      // Mark active events as recovered
      for (const event of activeEvents) {
        event.status = 'RECOVERED';
      }
      
      return recoveryEvent;
    }
    
    return null;
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getAlertHistory(limit: number = 100): PerformanceAlert[] {
    return this.alertHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public getDegradationEvents(): DegradationEvent[] {
    return Array.from(this.degradationEvents.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getAlertingStats(): {
    totalAlerts: number;
    activeAlerts: number;
    alertsBySeverity: Record<string, number>;
    averageResolutionTime: number;
    escalationRate: number;
  } {
    const allAlerts = [...this.activeAlerts.values(), ...this.alertHistory];
    const alertsBySeverity: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0
    };
    
    let totalResolutionTime = 0;
    let resolvedAlerts = 0;
    let escalatedAlerts = 0;
    
    for (const alert of allAlerts) {
      alertsBySeverity[alert.severity]++;
      
      if (alert.resolvedAt) {
        totalResolutionTime += alert.resolvedAt.getTime() - alert.timestamp.getTime();
        resolvedAlerts++;
      }
      
      if (alert.escalations.length > 0) {
        escalatedAlerts++;
      }
    }
    
    return {
      totalAlerts: allAlerts.length,
      activeAlerts: this.activeAlerts.size,
      alertsBySeverity,
      averageResolutionTime: resolvedAlerts > 0 ? totalResolutionTime / resolvedAlerts : 0,
      escalationRate: allAlerts.length > 0 ? escalatedAlerts / allAlerts.length : 0
    };
  }

  private startMonitoring(): void {
    this.monitoringTimer = setInterval(async () => {
      try {
        const currentMetrics = this.performanceMonitor.getCurrentMetrics();
        
        // Check thresholds
        const triggeredAlerts = await this.checkThresholds(currentMetrics);
        
        // Check for performance degradation
        const degradationEvent = await this.detectPerformanceDegradation(currentMetrics);
        
        // Process escalations
        await this.processEscalations();
        
        this.emit('monitoringCycle', {
          metrics: currentMetrics,
          triggeredAlerts: triggeredAlerts.length,
          degradationEvent: !!degradationEvent
        });
        
      } catch (error) {
        console.error('Monitoring cycle error:', error);
      }
    }, this.config.checkInterval);
  }

  private setupEventListeners(): void {
    this.performanceMonitor.on('performanceAlert', async (alert: any) => {
      await this.handlePerformanceMonitorAlert(alert);
    });
  }

  private async handlePerformanceMonitorAlert(alert: any): Promise<void> {
    // Convert performance monitor alert to our alert format
    const threshold: AlertThreshold = {
      id: `pm-${alert.metric}`,
      name: `Performance Monitor: ${alert.metric}`,
      metric: alert.metric,
      operator: 'GREATER_THAN',
      value: alert.threshold,
      severity: alert.severity,
      enabled: true,
      actions: ['NOTIFY', 'LOG']
    };
    
    await this.createAlert(threshold, alert.value, null);
  }

  private async createAlert(
    threshold: AlertThreshold,
    currentValue: number,
    metrics: PerformanceMetrics | null
  ): Promise<PerformanceAlert> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: PerformanceAlert = {
      id: alertId,
      timestamp: new Date(),
      threshold,
      currentValue,
      severity: threshold.severity,
      message: this.generateAlertMessage(threshold, currentValue),
      context: {
        metric: threshold.metric,
        component: 'PerformanceMonitor',
        additionalData: metrics
      },
      status: 'ACTIVE',
      escalations: [],
      actions: []
    };
    
    this.activeAlerts.set(alertId, alert);
    
    // Execute alert actions
    await this.executeAlertActions(alert);
    
    this.emit('alertTriggered', alert);
    
    // Log alert
    await auditLogger.logAlertTriggered(alertId, threshold.name, threshold.severity, {
      component: 'PerformanceAlerting',
      operation: 'create_alert',
      metadata: { metric: threshold.metric, value: currentValue }
    });
    
    return alert;
  }

  private async createDegradationEvent(
    type: 'PERFORMANCE_DEGRADATION' | 'PERFORMANCE_RECOVERY',
    currentMetrics: PerformanceMetrics,
    degradationScore: number
  ): Promise<DegradationEvent> {
    const eventId = `degradation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const baselineMetrics = this.calculateBaselineMetrics();
    
    const event: DegradationEvent = {
      id: eventId,
      timestamp: new Date(),
      type,
      metrics: {
        before: baselineMetrics,
        after: currentMetrics,
        degradationScore
      },
      affectedComponents: this.identifyAffectedComponents(currentMetrics, baselineMetrics),
      recoveryActions: this.generateRecoveryActions(type, degradationScore),
      status: type === 'PERFORMANCE_DEGRADATION' ? 'DETECTED' : 'RECOVERED'
    };
    
    this.degradationEvents.set(eventId, event);
    
    this.emit('degradationEvent', event);
    
    // Log degradation event
    await auditLogger.logEvent(
      'ALERT_TRIGGERED',
      'performance',
      type.toLowerCase(),
      {
        eventId,
        degradationScore,
        affectedComponents: event.affectedComponents
      },
      'SUCCESS',
      { component: 'PerformanceAlerting', operation: 'degradation_detection' }
    );
    
    return event;
  }

  private async executeAlertActions(alert: PerformanceAlert): Promise<void> {
    for (const action of alert.threshold.actions) {
      try {
        const result = await this.executeAction(action, alert);
        
        alert.actions.push({
          action,
          timestamp: new Date(),
          success: true,
          result
        });
        
      } catch (error) {
        alert.actions.push({
          action,
          timestamp: new Date(),
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        
        console.error(`Alert action ${action} failed:`, error);
      }
    }
  }

  private async executeAction(action: AlertAction, alert: PerformanceAlert): Promise<any> {
    switch (action) {
      case 'NOTIFY':
        return await this.sendNotifications(alert);
      
      case 'LOG':
        await logger.warn('PERFORMANCE', alert.message, {
          alertId: alert.id,
          metric: alert.threshold.metric,
          value: alert.currentValue,
          threshold: alert.threshold.value
        });
        return 'logged';
      
      case 'SCALE_UP':
        this.emit('scaleUp', { alert, reason: 'performance_threshold' });
        return 'scale_up_triggered';
      
      case 'SCALE_DOWN':
        this.emit('scaleDown', { alert, reason: 'performance_threshold' });
        return 'scale_down_triggered';
      
      case 'RESTART_SERVICE':
        this.emit('restartService', { alert, component: alert.context.component });
        return 'restart_triggered';
      
      case 'THROTTLE_REQUESTS':
        this.emit('throttleRequests', { alert, level: alert.severity });
        return 'throttling_enabled';
      
      case 'ENABLE_CIRCUIT_BREAKER':
        this.emit('enableCircuitBreaker', { alert, component: alert.context.component });
        return 'circuit_breaker_enabled';
      
      case 'TRIGGER_RECOVERY':
        this.emit('triggerRecovery', { alert, actions: this.generateRecoveryActions('PERFORMANCE_DEGRADATION', 0) });
        return 'recovery_triggered';
      
      default:
        throw new Error(`Unknown alert action: ${action}`);
    }
  }

  private async sendNotifications(alert: PerformanceAlert): Promise<string[]> {
    const results: string[] = [];
    
    for (const channel of this.config.channels) {
      if (!channel.enabled || !channel.severityFilter.includes(alert.severity)) {
        continue;
      }
      
      // Check rate limiting
      if (await this.isRateLimited(channel, alert)) {
        continue;
      }
      
      try {
        await this.sendNotification(channel, alert);
        results.push(`${channel.type}:success`);
      } catch (error) {
        results.push(`${channel.type}:failed`);
        console.error(`Notification failed for ${channel.type}:`, error);
      }
    }
    
    return results;
  }

  private async sendNotification(channel: NotificationChannel, alert: PerformanceAlert): Promise<void> {
    const message = this.formatNotificationMessage(alert, channel.type);
    
    switch (channel.type) {
      case 'EMAIL':
        await this.sendEmailNotification(channel.config, message, alert);
        break;
      case 'SMS':
        await this.sendSMSNotification(channel.config, message, alert);
        break;
      case 'WEBHOOK':
        await this.sendWebhookNotification(channel.config, message, alert);
        break;
      case 'SLACK':
        await this.sendSlackNotification(channel.config, message, alert);
        break;
      case 'TEAMS':
        await this.sendTeamsNotification(channel.config, message, alert);
        break;
    }
  }

  private async processEscalations(): Promise<void> {
    for (const alert of this.activeAlerts.values()) {
      if (alert.status !== 'ACTIVE') continue;
      
      const escalationRule = this.config.escalationRules.find(rule => rule.severity === alert.severity);
      if (!escalationRule) continue;
      
      const timeSinceAlert = Date.now() - alert.timestamp.getTime();
      const timeSinceLastEscalation = alert.escalations.length > 0 ? 
        Date.now() - alert.escalations[alert.escalations.length - 1].timestamp.getTime() : 
        timeSinceAlert;
      
      if (timeSinceLastEscalation >= escalationRule.escalateAfter && 
          alert.escalations.length < escalationRule.maxEscalations) {
        
        await this.escalateAlert(alert, escalationRule);
      }
    }
  }

  private async escalateAlert(alert: PerformanceAlert, rule: EscalationRule): Promise<void> {
    const escalation: AlertEscalation = {
      timestamp: new Date(),
      escalatedTo: rule.escalateTo,
      reason: `Alert not acknowledged after ${rule.escalateAfter}ms`,
      level: alert.escalations.length + 1
    };
    
    alert.escalations.push(escalation);
    alert.status = 'ESCALATED';
    
    // Send escalation notifications
    await this.sendEscalationNotifications(alert, escalation);
    
    this.emit('alertEscalated', { alert, escalation });
    
    // Log escalation
    await auditLogger.logEvent(
      'ALERT_TRIGGERED',
      'performance',
      'alert_escalated',
      {
        alertId: alert.id,
        escalationLevel: escalation.level,
        escalatedTo: escalation.escalatedTo
      },
      'SUCCESS',
      { component: 'PerformanceAlerting', operation: 'escalate_alert' }
    );
  }

  private getMetricValue(metric: string, metrics: PerformanceMetrics): number {
    switch (metric) {
      case 'processing.tickToDecision.average':
        return metrics.processing.tickToDecision.average;
      case 'processing.tickToDecision.p95':
        return metrics.processing.tickToDecision.p95;
      case 'memory.heapUsed':
        return metrics.memory.heapUsed;
      case 'memory.rss':
        return metrics.memory.rss;
      case 'cpu.usage':
        return metrics.cpu.usage;
      case 'concurrency.queuedOperations':
        return metrics.concurrency.queuedOperations;
      case 'concurrency.activeTickers':
        return metrics.concurrency.activeTickers;
      default:
        return 0;
    }
  }

  private evaluateThreshold(threshold: AlertThreshold, currentValue: number): boolean {
    switch (threshold.operator) {
      case 'GREATER_THAN':
        return currentValue > threshold.value;
      case 'LESS_THAN':
        return currentValue < threshold.value;
      case 'EQUALS':
        return currentValue === threshold.value;
      case 'NOT_EQUALS':
        return currentValue !== threshold.value;
      default:
        return false;
    }
  }

  private evaluateConditions(conditions: AlertCondition[], metrics: PerformanceMetrics): boolean {
    return conditions.every(condition => {
      const value = this.getMetricValue(condition.metric, metrics);
      return this.evaluateThreshold(
        { ...condition, id: '', name: '', enabled: true, severity: 'LOW', actions: [] },
        value
      );
    });
  }

  private calculateDegradationScore(currentMetrics: PerformanceMetrics): number {
    if (this.metricsHistory.length < 2) return 0;
    
    const baseline = this.calculateBaselineMetrics();
    let score = 0;
    
    // Processing time degradation
    const processingDegradation = (currentMetrics.processing.tickToDecision.average - baseline.processing.tickToDecision.average) / baseline.processing.tickToDecision.average;
    score += Math.max(0, processingDegradation) * 40;
    
    // Memory usage degradation
    const memoryDegradation = (currentMetrics.memory.heapUsed - baseline.memory.heapUsed) / baseline.memory.heapUsed;
    score += Math.max(0, memoryDegradation) * 30;
    
    // CPU usage degradation
    const cpuDegradation = (currentMetrics.cpu.usage - baseline.cpu.usage) / Math.max(1, baseline.cpu.usage);
    score += Math.max(0, cpuDegradation) * 20;
    
    // Queue length degradation
    const queueDegradation = (currentMetrics.concurrency.queuedOperations - baseline.concurrency.queuedOperations) / Math.max(1, baseline.concurrency.queuedOperations);
    score += Math.max(0, queueDegradation) * 10;
    
    return Math.min(100, score);
  }

  private calculateBaselineMetrics(): PerformanceMetrics {
    if (this.metricsHistory.length === 0) {
      return this.performanceMonitor.getCurrentMetrics();
    }
    
    // Calculate average of recent metrics (excluding current)
    const recentMetrics = this.metricsHistory.slice(0, -1);
    const count = recentMetrics.length;
    
    if (count === 0) {
      return this.metricsHistory[0];
    }
    
    // Simple averaging - could be enhanced with weighted averages
    const baseline = { ...recentMetrics[0] };
    
    baseline.processing.tickToDecision.average = 
      recentMetrics.reduce((sum, m) => sum + m.processing.tickToDecision.average, 0) / count;
    baseline.memory.heapUsed = 
      recentMetrics.reduce((sum, m) => sum + m.memory.heapUsed, 0) / count;
    baseline.cpu.usage = 
      recentMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / count;
    baseline.concurrency.queuedOperations = 
      recentMetrics.reduce((sum, m) => sum + m.concurrency.queuedOperations, 0) / count;
    
    return baseline;
  }

  private identifyAffectedComponents(current: PerformanceMetrics, baseline: PerformanceMetrics): string[] {
    const affected: string[] = [];
    
    if (current.processing.tickToDecision.average > baseline.processing.tickToDecision.average * 1.5) {
      affected.push('SignalProcessing');
    }
    
    if (current.memory.heapUsed > baseline.memory.heapUsed * 1.3) {
      affected.push('MemoryManagement');
    }
    
    if (current.cpu.usage > baseline.cpu.usage * 1.5) {
      affected.push('CPUIntensive');
    }
    
    if (current.concurrency.queuedOperations > baseline.concurrency.queuedOperations * 2) {
      affected.push('OperationQueue');
    }
    
    return affected;
  }

  private generateRecoveryActions(type: string, degradationScore: number): string[] {
    const actions: string[] = [];
    
    if (type === 'PERFORMANCE_DEGRADATION') {
      if (degradationScore > 70) {
        actions.push('SCALE_UP', 'ENABLE_CIRCUIT_BREAKER', 'THROTTLE_REQUESTS');
      } else if (degradationScore > 40) {
        actions.push('SCALE_UP', 'THROTTLE_REQUESTS');
      } else {
        actions.push('OPTIMIZE_QUERIES', 'CLEAR_CACHE');
      }
    }
    
    return actions;
  }

  private generateAlertMessage(threshold: AlertThreshold, currentValue: number): string {
    return `${threshold.name}: ${threshold.metric} is ${currentValue} (threshold: ${threshold.value})`;
  }

  private formatNotificationMessage(alert: PerformanceAlert, channelType: string): string {
    const baseMessage = `🚨 ${alert.severity} Alert: ${alert.message}`;
    
    switch (channelType) {
      case 'SLACK':
        return `${baseMessage}\n*Component:* ${alert.context.component}\n*Time:* ${alert.timestamp.toISOString()}`;
      case 'EMAIL':
        return `${baseMessage}\n\nComponent: ${alert.context.component}\nTime: ${alert.timestamp.toISOString()}\nAlert ID: ${alert.id}`;
      default:
        return baseMessage;
    }
  }

  private async isRateLimited(channel: NotificationChannel, alert: PerformanceAlert): Promise<boolean> {
    // Simplified rate limiting - would need proper implementation
    return false;
  }

  // Notification method stubs - would need actual implementations
  private async sendEmailNotification(config: any, message: string, alert: PerformanceAlert): Promise<void> {
    console.log(`📧 Email notification: ${message}`);
  }

  private async sendSMSNotification(config: any, message: string, alert: PerformanceAlert): Promise<void> {
    console.log(`📱 SMS notification: ${message}`);
  }

  private async sendWebhookNotification(config: any, message: string, alert: PerformanceAlert): Promise<void> {
    console.log(`🔗 Webhook notification: ${message}`);
  }

  private async sendSlackNotification(config: any, message: string, alert: PerformanceAlert): Promise<void> {
    console.log(`💬 Slack notification: ${message}`);
  }

  private async sendTeamsNotification(config: any, message: string, alert: PerformanceAlert): Promise<void> {
    console.log(`👥 Teams notification: ${message}`);
  }

  private async sendEscalationNotifications(alert: PerformanceAlert, escalation: AlertEscalation): Promise<void> {
    console.log(`📢 Escalation notification for alert ${alert.id} to: ${escalation.escalatedTo.join(', ')}`);
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Performance Alerting...');
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    // Log final stats
    const stats = this.getAlertingStats();
    
    await auditLogger.logSystemStop({
      component: 'PerformanceAlerting',
      metadata: {
        uptime: Date.now(),
        reason: 'shutdown',
        finalStats: {
          totalAlerts: stats.totalAlerts,
          activeAlerts: stats.activeAlerts,
          escalationRate: stats.escalationRate
        }
      }
    });
    
    console.log('✅ Performance Alerting shutdown complete');
    this.emit('shutdown');
  }
}

// Default alerting configuration
export const defaultAlertingConfig: AlertingConfig = {
  enabled: true,
  checkInterval: 30000, // 30 seconds
  alertCooldown: 300000, // 5 minutes
  escalationRules: [
    {
      severity: 'CRITICAL',
      escalateAfter: 300000, // 5 minutes
      escalateTo: ['ops-team@company.com'],
      maxEscalations: 3
    },
    {
      severity: 'HIGH',
      escalateAfter: 600000, // 10 minutes
      escalateTo: ['ops-team@company.com'],
      maxEscalations: 2
    }
  ],
  thresholds: [
    {
      id: 'processing-time-high',
      name: 'High Processing Time',
      metric: 'processing.tickToDecision.average',
      operator: 'GREATER_THAN',
      value: 200,
      severity: 'MEDIUM',
      enabled: true,
      actions: ['NOTIFY', 'LOG']
    },
    {
      id: 'processing-time-critical',
      name: 'Critical Processing Time',
      metric: 'processing.tickToDecision.average',
      operator: 'GREATER_THAN',
      value: 500,
      severity: 'HIGH',
      enabled: true,
      actions: ['NOTIFY', 'LOG', 'SCALE_UP']
    },
    {
      id: 'memory-usage-high',
      name: 'High Memory Usage',
      metric: 'memory.heapUsed',
      operator: 'GREATER_THAN',
      value: 512,
      severity: 'MEDIUM',
      enabled: true,
      actions: ['NOTIFY', 'LOG']
    },
    {
      id: 'queue-length-high',
      name: 'High Queue Length',
      metric: 'concurrency.queuedOperations',
      operator: 'GREATER_THAN',
      value: 20,
      severity: 'HIGH',
      enabled: true,
      actions: ['NOTIFY', 'LOG', 'SCALE_UP', 'THROTTLE_REQUESTS']
    }
  ],
  channels: [
    {
      id: 'console-log',
      type: 'WEBHOOK',
      config: { url: 'console' },
      enabled: true,
      severityFilter: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      rateLimiting: {
        enabled: false,
        maxPerHour: 60,
        maxPerDay: 200
      }
    }
  ],
  degradationDetection: {
    enabled: true,
    windowSize: 10,
    degradationThreshold: 30,
    recoveryThreshold: 10
  }
};