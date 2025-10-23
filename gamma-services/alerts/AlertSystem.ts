import { EventBus } from '../core/EventBus';
import { PaperPosition, TradeSignal, MarketRegime } from '../models/PaperTradingTypes';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data: any;
  timestamp: Date;
  acknowledged: boolean;
  webhookSent: boolean;
  retryCount: number;
}

export type AlertType = 
  | 'TRADE_EXECUTED'
  | 'TRADE_CLOSED'
  | 'RISK_VIOLATION'
  | 'PERFORMANCE_MILESTONE'
  | 'POSITION_ALERT'
  | 'SYSTEM_ERROR'
  | 'REGIME_CHANGE'
  | 'CONFIDENCE_THRESHOLD'
  | 'DRAWDOWN_WARNING'
  | 'PROFIT_TARGET_HIT';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownPeriod: number; // milliseconds
  lastTriggered?: Date;
}

export interface AlertCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains' | 'in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface AlertAction {
  type: 'WEBHOOK' | 'EMAIL' | 'PUSH' | 'LOG' | 'STORE';
  config: any;
  enabled: boolean;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class AlertSystem {
  private eventBus: EventBus;
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private webhookConfigs: Map<string, WebhookConfig> = new Map();
  private isInitialized: boolean = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.setupEventListeners();
    this.setupDefaultRules();
    this.setupDefaultWebhooks();
    
    this.isInitialized = true;
    console.log('🚨 Alert System initialized');
  }

  private setupEventListeners(): void {
    // Listen for trade events
    this.eventBus.on('trade:executed', (data) => {
      this.handleTradeExecuted(data);
    });

    this.eventBus.on('paper:position:closed', (data) => {
      this.handleTradeClosed(data.position);
    });

    // Listen for risk events
    this.eventBus.on('risk:violation', (data) => {
      this.handleRiskViolation(data);
    });

    // Listen for performance events
    this.eventBus.on('performance:milestone', (data) => {
      this.handlePerformanceMilestone(data);
    });

    // Listen for regime changes
    this.eventBus.on('regime:change', (data) => {
      this.handleRegimeChange(data);
    });

    // Listen for system errors
    this.eventBus.on('system:error', (data) => {
      this.handleSystemError(data);
    });

    // Listen for position updates
    this.eventBus.on('position:update', (data) => {
      this.handlePositionUpdate(data);
    });
  }

  private setupDefaultRules(): void {
    // Trade execution alerts
    this.addAlertRule({
      id: 'trade_executed',
      name: 'Trade Executed',
      type: 'TRADE_EXECUTED',
      enabled: true,
      conditions: [],
      actions: [
        { type: 'WEBHOOK', config: { webhookId: 'default' }, enabled: true },
        { type: 'STORE', config: {}, enabled: true }
      ],
      cooldownPeriod: 0
    });

    // Large loss alert
    this.addAlertRule({
      id: 'large_loss',
      name: 'Large Loss Alert',
      type: 'POSITION_ALERT',
      enabled: true,
      conditions: [
        { field: 'pnl', operator: 'lt', value: -500 }
      ],
      actions: [
        { type: 'WEBHOOK', config: { webhookId: 'default' }, enabled: true },
        { type: 'STORE', config: {}, enabled: true }
      ],
      cooldownPeriod: 300000 // 5 minutes
    });

    // Drawdown warning
    this.addAlertRule({
      id: 'drawdown_warning',
      name: 'Drawdown Warning',
      type: 'DRAWDOWN_WARNING',
      enabled: true,
      conditions: [
        { field: 'drawdown', operator: 'gt', value: 0.1 } // 10%
      ],
      actions: [
        { type: 'WEBHOOK', config: { webhookId: 'default' }, enabled: true },
        { type: 'STORE', config: {}, enabled: true }
      ],
      cooldownPeriod: 3600000 // 1 hour
    });

    // Profit milestone
    this.addAlertRule({
      id: 'profit_milestone',
      name: 'Profit Milestone',
      type: 'PERFORMANCE_MILESTONE',
      enabled: true,
      conditions: [
        { field: 'totalPnL', operator: 'gte', value: 1000 }
      ],
      actions: [
        { type: 'WEBHOOK', config: { webhookId: 'default' }, enabled: true },
        { type: 'STORE', config: {}, enabled: true }
      ],
      cooldownPeriod: 86400000 // 24 hours
    });

    // Risk violation
    this.addAlertRule({
      id: 'risk_violation',
      name: 'Risk Violation',
      type: 'RISK_VIOLATION',
      enabled: true,
      conditions: [],
      actions: [
        { type: 'WEBHOOK', config: { webhookId: 'default' }, enabled: true },
        { type: 'STORE', config: {}, enabled: true }
      ],
      cooldownPeriod: 60000 // 1 minute
    });
  }

  private setupDefaultWebhooks(): void {
    // Default webhook configuration
    this.addWebhookConfig('default', {
      url: process.env.PAPER_TRADING_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/paper-trading',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WEBHOOK_AUTH_TOKEN || 'default-token'}`
      },
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000
    });

    // Discord webhook (if configured)
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.addWebhookConfig('discord', {
        url: process.env.DISCORD_WEBHOOK_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        retryAttempts: 2,
        retryDelay: 2000
      });
    }

    // Slack webhook (if configured)
    if (process.env.SLACK_WEBHOOK_URL) {
      this.addWebhookConfig('slack', {
        url: process.env.SLACK_WEBHOOK_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        retryAttempts: 2,
        retryDelay: 2000
      });
    }
  }

  // Event handlers
  private async handleTradeExecuted(data: any): Promise<void> {
    const alert = this.createAlert({
      type: 'TRADE_EXECUTED',
      severity: 'MEDIUM',
      title: 'Trade Executed',
      message: `${data.signal?.side || 'UNKNOWN'} position opened for ${data.signal?.ticker || 'UNKNOWN'}`,
      data: {
        signalId: data.signalId,
        positionId: data.positionId,
        ticker: data.signal?.ticker,
        side: data.signal?.side,
        confidence: data.signal?.confidence,
        expectedMove: data.signal?.expectedMove
      }
    });

    await this.processAlert(alert);
  }

  private async handleTradeClosed(position: PaperPosition): Promise<void> {
    const severity: AlertSeverity = position.pnl > 0 ? 'LOW' : 
                                   position.pnl < -200 ? 'HIGH' : 'MEDIUM';

    const alert = this.createAlert({
      type: 'TRADE_CLOSED',
      severity,
      title: 'Trade Closed',
      message: `${position.side} position closed for ${position.ticker}: ${position.pnl > 0 ? 'PROFIT' : 'LOSS'} $${position.pnl.toFixed(2)}`,
      data: {
        positionId: position.id,
        ticker: position.ticker,
        side: position.side,
        pnl: position.pnl,
        pnlPercent: position.entryPrice > 0 ? (position.pnl / (position.entryPrice * position.quantity)) * 100 : 0,
        exitReason: position.exitReason,
        holdingPeriod: position.exitTimestamp ?
          Math.floor((position.exitTimestamp.getTime() - position.entryTimestamp.getTime()) / (1000 * 60 * 60 * 24)) : 0
      }
    });

    await this.processAlert(alert);
  }

  private async handleRiskViolation(data: any): Promise<void> {
    const alert = this.createAlert({
      type: 'RISK_VIOLATION',
      severity: 'HIGH',
      title: 'Risk Violation Detected',
      message: `Risk limit exceeded: ${data.violationType}`,
      data: {
        violationType: data.violationType,
        currentValue: data.currentValue,
        limit: data.limit,
        ticker: data.ticker,
        positionId: data.positionId
      }
    });

    await this.processAlert(alert);
  }

  private async handlePerformanceMilestone(data: any): Promise<void> {
    const alert = this.createAlert({
      type: 'PERFORMANCE_MILESTONE',
      severity: 'LOW',
      title: 'Performance Milestone Reached',
      message: `${data.milestone}: ${data.value}`,
      data: {
        milestone: data.milestone,
        value: data.value,
        previousValue: data.previousValue,
        timestamp: data.timestamp
      }
    });

    await this.processAlert(alert);
  }

  private async handleRegimeChange(data: any): Promise<void> {
    const alert = this.createAlert({
      type: 'REGIME_CHANGE',
      severity: 'MEDIUM',
      title: 'Market Regime Change',
      message: `Market regime changed for ${data.ticker}: ${data.previousRegime} → ${data.newRegime}`,
      data: {
        ticker: data.ticker,
        previousRegime: data.previousRegime,
        newRegime: data.newRegime,
        confidence: data.confidence,
        strength: data.strength
      }
    });

    await this.processAlert(alert);
  }

  private async handleSystemError(data: any): Promise<void> {
    const alert = this.createAlert({
      type: 'SYSTEM_ERROR',
      severity: data.severity || 'HIGH',
      title: 'System Error',
      message: `System error in ${data.component}: ${data.error?.message || 'Unknown error'}`,
      data: {
        component: data.component,
        error: data.error?.message,
        stack: data.error?.stack,
        context: data.context
      }
    });

    await this.processAlert(alert);
  }

  private async handlePositionUpdate(data: any): Promise<void> {
    // Check for position-specific alerts
    const position = data.position;
    
    // Large unrealized loss
    if (position.unrealizedPnL && position.unrealizedPnL < -300) {
      const alert = this.createAlert({
        type: 'POSITION_ALERT',
        severity: 'HIGH',
        title: 'Large Unrealized Loss',
        message: `Position ${position.ticker} has unrealized loss of $${Math.abs(position.unrealizedPnL).toFixed(2)}`,
        data: {
          positionId: position.id,
          ticker: position.ticker,
          unrealizedPnL: position.unrealizedPnL,
          entryPrice: position.entryPrice,
          currentPrice: position.currentPrice
        }
      });

      await this.processAlert(alert);
    }

    // Long holding period
    const daysHeld = Math.floor((Date.now() - position.entryTime.getTime()) / (1000 * 60 * 60 * 24));
    if (daysHeld > 21) {
      const alert = this.createAlert({
        type: 'POSITION_ALERT',
        severity: 'MEDIUM',
        title: 'Long Holding Period',
        message: `Position ${position.ticker} held for ${daysHeld} days`,
        data: {
          positionId: position.id,
          ticker: position.ticker,
          daysHeld,
          unrealizedPnL: position.unrealizedPnL
        }
      });

      await this.processAlert(alert);
    }
  }

  // Alert management methods
  private createAlert(alertData: {
    type: AlertType;
    severity: AlertSeverity;
    title: string;
    message: string;
    data: any;
  }): Alert {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: alertData.type,
      severity: alertData.severity,
      title: alertData.title,
      message: alertData.message,
      data: alertData.data,
      timestamp: new Date(),
      acknowledged: false,
      webhookSent: false,
      retryCount: 0
    };

    this.alerts.set(alert.id, alert);
    return alert;
  }

  private async processAlert(alert: Alert): Promise<void> {
    // Check if alert should be triggered based on rules
    const applicableRules = Array.from(this.alertRules.values())
      .filter(rule => rule.enabled && rule.type === alert.type);

    for (const rule of applicableRules) {
      if (this.shouldTriggerRule(rule, alert)) {
        await this.executeRuleActions(rule, alert);
      }
    }

    // Emit alert event
    this.eventBus.emit('alert:created', alert);
    
    console.log(`🚨 Alert created: ${alert.title} (${alert.severity})`);
  }

  private shouldTriggerRule(rule: AlertRule, alert: Alert): boolean {
    // Check cooldown period
    if (rule.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
      if (timeSinceLastTrigger < rule.cooldownPeriod) {
        return false;
      }
    }

    // Check conditions
    if (rule.conditions.length === 0) {
      return true; // No conditions means always trigger
    }

    return this.evaluateConditions(rule.conditions, alert.data);
  }

  private evaluateConditions(conditions: AlertCondition[], data: any): boolean {
    if (conditions.length === 0) return true;

    let result = this.evaluateCondition(conditions[0], data);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, data);

      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(condition: AlertCondition, data: any): boolean {
    const fieldValue = this.getNestedValue(data, condition.field);
    
    switch (condition.operator) {
      case 'gt': return fieldValue > condition.value;
      case 'lt': return fieldValue < condition.value;
      case 'eq': return fieldValue === condition.value;
      case 'gte': return fieldValue >= condition.value;
      case 'lte': return fieldValue <= condition.value;
      case 'contains': return String(fieldValue).includes(condition.value);
      case 'in': return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      default: return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async executeRuleActions(rule: AlertRule, alert: Alert): Promise<void> {
    rule.lastTriggered = new Date();

    for (const action of rule.actions) {
      if (!action.enabled) continue;

      try {
        switch (action.type) {
          case 'WEBHOOK':
            await this.sendWebhook(action.config.webhookId || 'default', alert);
            break;
          case 'STORE':
            // Already stored in createAlert
            break;
          case 'LOG':
            console.log(`🚨 Alert: ${alert.title} - ${alert.message}`);
            break;
          // Add EMAIL, PUSH implementations as needed
        }
      } catch (error) {
        console.error(`Failed to execute alert action ${action.type}:`, error);
      }
    }
  }

  // Webhook methods
  private async sendWebhook(webhookId: string, alert: Alert): Promise<void> {
    const config = this.webhookConfigs.get(webhookId);
    if (!config) {
      console.error(`Webhook config not found: ${webhookId}`);
      return;
    }

    const payload = this.formatWebhookPayload(alert, webhookId);

    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.timeout)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      alert.webhookSent = true;
      console.log(`📡 Webhook sent successfully: ${webhookId}`);

    } catch (error) {
      console.error(`Webhook failed for ${webhookId}:`, error);
      
      // Retry logic
      if (alert.retryCount < config.retryAttempts) {
        alert.retryCount++;
        setTimeout(() => {
          this.sendWebhook(webhookId, alert);
        }, config.retryDelay * alert.retryCount);
      }
    }
  }

  private formatWebhookPayload(alert: Alert, webhookId: string): any {
    const basePayload = {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp.toISOString(),
      data: alert.data
    };

    // Format for specific webhook types
    switch (webhookId) {
      case 'discord':
        return {
          embeds: [{
            title: alert.title,
            description: alert.message,
            color: this.getSeverityColor(alert.severity),
            timestamp: alert.timestamp.toISOString(),
            fields: Object.entries(alert.data).map(([key, value]) => ({
              name: key,
              value: String(value),
              inline: true
            }))
          }]
        };

      case 'slack':
        return {
          text: alert.title,
          attachments: [{
            color: this.getSeverityColor(alert.severity),
            fields: [{
              title: 'Message',
              value: alert.message,
              short: false
            }, ...Object.entries(alert.data).map(([key, value]) => ({
              title: key,
              value: String(value),
              short: true
            }))]
          }]
        };

      default:
        return basePayload;
    }
  }

  private getSeverityColor(severity: AlertSeverity): number | string {
    switch (severity) {
      case 'LOW': return 0x00ff00; // Green
      case 'MEDIUM': return 0xffff00; // Yellow
      case 'HIGH': return 0xff8000; // Orange
      case 'CRITICAL': return 0xff0000; // Red
      default: return 0x808080; // Gray
    }
  }

  // Public API methods
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`📋 Alert rule added: ${rule.name}`);
  }

  public removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    console.log(`📋 Alert rule removed: ${ruleId}`);
  }

  public updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      console.log(`📋 Alert rule updated: ${ruleId}`);
    }
  }

  public addWebhookConfig(id: string, config: WebhookConfig): void {
    this.webhookConfigs.set(id, config);
    console.log(`📡 Webhook config added: ${id}`);
  }

  public removeWebhookConfig(id: string): void {
    this.webhookConfigs.delete(id);
    console.log(`📡 Webhook config removed: ${id}`);
  }

  public getAlerts(filters?: {
    type?: AlertType;
    severity?: AlertSeverity;
    acknowledged?: boolean;
    limit?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.type) alerts = alerts.filter(a => a.type === filters.type);
      if (filters.severity) alerts = alerts.filter(a => a.severity === filters.severity);
      if (filters.acknowledged !== undefined) alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      alerts = alerts.slice(0, filters.limit);
    }

    return alerts;
  }

  public acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.eventBus.emit('alert:acknowledged', alert);
      console.log(`✅ Alert acknowledged: ${alertId}`);
    }
  }

  public clearOldAlerts(olderThanDays: number = 30): void {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;

    for (const [id, alert] of Array.from(this.alerts)) {
      if (alert.timestamp < cutoffDate) {
        this.alerts.delete(id);
        removedCount++;
      }
    }

    console.log(`🧹 Cleared ${removedCount} old alerts`);
  }

  public getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  public getWebhookConfigs(): string[] {
    return Array.from(this.webhookConfigs.keys());
  }

  public testWebhook(webhookId: string): Promise<void> {
    const testAlert = this.createAlert({
      type: 'SYSTEM_ERROR',
      severity: 'LOW',
      title: 'Webhook Test',
      message: 'This is a test webhook message',
      data: { test: true, timestamp: new Date().toISOString() }
    });

    return this.sendWebhook(webhookId, testAlert);
  }

  public getStatistics(): {
    totalAlerts: number;
    alertsByType: Record<AlertType, number>;
    alertsBySeverity: Record<AlertSeverity, number>;
    acknowledgedAlerts: number;
    webhooksSent: number;
    activeRules: number;
  } {
    const alerts = Array.from(this.alerts.values());
    
    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<AlertType, number>);

    const alertsBySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<AlertSeverity, number>);

    return {
      totalAlerts: alerts.length,
      alertsByType,
      alertsBySeverity,
      acknowledgedAlerts: alerts.filter(a => a.acknowledged).length,
      webhooksSent: alerts.filter(a => a.webhookSent).length,
      activeRules: Array.from(this.alertRules.values()).filter(r => r.enabled).length
    };
  }

  public shutdown(): void {
    this.alerts.clear();
    this.alertRules.clear();
    this.webhookConfigs.clear();
    this.isInitialized = false;
    console.log('🚨 Alert System shutdown complete');
  }

  // Missing methods for compatibility
  public updateMetric(metricName: string, value: any): void {
    // Update internal metrics for alerting
    console.log(`📊 Alert System metric updated: ${metricName} = ${value}`);
  }

  public on(eventName: string, callback: (data: any) => void): void {
    // Set up event listeners for alert system
    this.eventBus.on(eventName as any, callback);
  }
}

// Export a default instance
export const alertSystem = new AlertSystem(EventBus.getInstance());