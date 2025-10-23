import { EventEmitter } from 'events';
import { RiskViolation, PortfolioRisk } from './PortfolioRiskManager';

/**
 * Risk Alert System
 * 
 * Handles risk violation detection, alerting, and automated responses:
 * - Real-time risk monitoring and threshold alerts
 * - Escalation procedures for different violation severities
 * - Automated risk mitigation actions
 * - Alert history and acknowledgment tracking
 */

export interface AlertConfig {
  channels: AlertChannel[];
  thresholds: AlertThreshold[];
  escalationRules: EscalationRule[];
  autoActions: AutoAction[];
}

export interface AlertChannel {
  type: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'DASHBOARD' | 'LOG';
  config: {
    endpoint?: string;
    recipients?: string[];
    enabled: boolean;
  };
}

export interface AlertThreshold {
  metric: 'PORTFOLIO_HEAT' | 'DRAWDOWN' | 'CONSECUTIVE_LOSSES' | 'DAILY_LOSS' | 'VIX';
  warning: number;
  critical: number;
  enabled: boolean;
}

export interface EscalationRule {
  violationType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  delayMinutes: number;
  channels: string[];
  autoActions: string[];
}

export interface AutoAction {
  trigger: 'HEAT_EXCEEDED' | 'DRAWDOWN_EXCEEDED' | 'CONSECUTIVE_LOSSES' | 'DAILY_LOSS';
  severity: 'HIGH' | 'CRITICAL';
  action: 'HALT_TRADING' | 'REDUCE_POSITIONS' | 'CLOSE_POSITIONS' | 'NOTIFY_ADMIN';
  parameters?: any;
}

export interface Alert {
  id: string;
  timestamp: Date;
  type: 'RISK_VIOLATION' | 'THRESHOLD_BREACH' | 'SYSTEM_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  data: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export class RiskAlertSystem extends EventEmitter {
  private config: AlertConfig;
  private alerts: Map<string, Alert> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private isEnabled: boolean = true;

  constructor(config: AlertConfig) {
    super();
    this.config = config;
  }

  /**
   * Process risk violation and generate alerts
   */
  public processRiskViolation(violation: RiskViolation): void {
    if (!this.isEnabled) return;

    const alert = this.createAlert(violation);
    this.alerts.set(alert.id, alert);

    // Send immediate alerts
    this.sendAlert(alert);

    // Set up escalation if needed
    this.setupEscalation(alert, violation);

    // Execute auto actions
    this.executeAutoActions(violation);

    this.emit('alertGenerated', alert);
  }

  /**
   * Process portfolio risk update
   */
  public processRiskUpdate(portfolioRisk: PortfolioRisk): void {
    if (!this.isEnabled) return;

    // Check thresholds
    this.checkThresholds(portfolioRisk);

    // Update existing alerts if risk improves
    this.updateAlertsForRiskImprovement(portfolioRisk);
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.acknowledged) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    // Cancel escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    this.emit('alertAcknowledged', alert);
    return true;
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.emit('alertResolved', alert);
    return true;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get alert history
   */
  public getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.alerts.values())
      .filter(alert => alert.timestamp >= cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }  // Priv
ate helper methods

  private createAlert(violation: RiskViolation): Alert {
    return {
      id: this.generateAlertId(),
      timestamp: new Date(),
      type: 'RISK_VIOLATION',
      severity: violation.severity,
      message: this.formatAlertMessage(violation),
      data: violation,
      acknowledged: false,
      resolved: false
    };
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatAlertMessage(violation: RiskViolation): string {
    const percentage = (violation.currentValue * 100).toFixed(1);
    const threshold = (violation.threshold * 100).toFixed(1);

    switch (violation.type) {
      case 'HEAT_EXCEEDED':
        return `Portfolio heat ${percentage}% exceeds ${threshold}% limit`;
      case 'DRAWDOWN_EXCEEDED':
        return `Drawdown ${percentage}% exceeds ${threshold}% limit`;
      case 'CONSECUTIVE_LOSSES':
        return `${violation.currentValue} consecutive losses exceeds ${violation.threshold} limit`;
      case 'DAILY_LOSS':
        return `Daily loss ${percentage}% exceeds ${threshold}% limit`;
      case 'VIX_THRESHOLD':
        return `VIX ${violation.currentValue.toFixed(1)} exceeds ${violation.threshold} threshold`;
      default:
        return `Risk violation: ${violation.type}`;
    }
  }

  private sendAlert(alert: Alert): void {
    this.config.channels.forEach(channel => {
      if (channel.config.enabled) {
        this.sendToChannel(alert, channel);
      }
    });
  }

  private sendToChannel(alert: Alert, channel: AlertChannel): void {
    try {
      switch (channel.type) {
        case 'DASHBOARD':
          this.emit('dashboardAlert', alert);
          break;
        case 'LOG':
          console.log(`[RISK ALERT] ${alert.severity}: ${alert.message}`);
          break;
        case 'WEBHOOK':
          if (channel.config.endpoint) {
            this.sendWebhook(alert, channel.config.endpoint);
          }
          break;
        case 'EMAIL':
          if (channel.config.recipients) {
            this.sendEmail(alert, channel.config.recipients);
          }
          break;
        case 'SMS':
          if (channel.config.recipients) {
            this.sendSMS(alert, channel.config.recipients);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to send alert to ${channel.type}:`, error);
    }
  }

  private setupEscalation(alert: Alert, violation: RiskViolation): void {
    const escalationRule = this.config.escalationRules.find(
      rule => rule.violationType === violation.type && rule.severity === violation.severity
    );

    if (escalationRule && escalationRule.delayMinutes > 0) {
      const timer = setTimeout(() => {
        if (!alert.acknowledged) {
          this.escalateAlert(alert, escalationRule);
        }
      }, escalationRule.delayMinutes * 60 * 1000);

      this.escalationTimers.set(alert.id, timer);
    }
  }

  private escalateAlert(alert: Alert, rule: EscalationRule): void {
    console.log(`Escalating alert ${alert.id} after ${rule.delayMinutes} minutes`);
    
    // Send to escalation channels
    rule.channels.forEach(channelType => {
      const channel = this.config.channels.find(c => c.type === channelType);
      if (channel) {
        this.sendToChannel(alert, channel);
      }
    });

    // Execute escalation auto actions
    rule.autoActions.forEach(actionType => {
      const action = this.config.autoActions.find(a => a.action === actionType);
      if (action) {
        this.executeAutoAction(action, alert.data);
      }
    });

    this.emit('alertEscalated', alert);
  }

  private executeAutoActions(violation: RiskViolation): void {
    const applicableActions = this.config.autoActions.filter(
      action => action.trigger === violation.type && action.severity === violation.severity
    );

    applicableActions.forEach(action => {
      this.executeAutoAction(action, violation);
    });
  }

  private executeAutoAction(action: AutoAction, data: any): void {
    try {
      switch (action.action) {
        case 'HALT_TRADING':
          this.emit('haltTrading', { reason: 'Auto action triggered', data });
          break;
        case 'REDUCE_POSITIONS':
          this.emit('reducePositions', { 
            percentage: action.parameters?.percentage || 50,
            data 
          });
          break;
        case 'CLOSE_POSITIONS':
          this.emit('closePositions', { 
            criteria: action.parameters?.criteria || 'ALL',
            data 
          });
          break;
        case 'NOTIFY_ADMIN':
          this.emit('notifyAdmin', { 
            urgency: 'HIGH',
            message: `Auto action triggered: ${action.trigger}`,
            data 
          });
          break;
      }
    } catch (error) {
      console.error(`Failed to execute auto action ${action.action}:`, error);
    }
  }  privat
e checkThresholds(portfolioRisk: PortfolioRisk): void {
    this.config.thresholds.forEach(threshold => {
      if (!threshold.enabled) return;

      let currentValue: number;
      let metricName: string;

      switch (threshold.metric) {
        case 'PORTFOLIO_HEAT':
          currentValue = portfolioRisk.currentHeat;
          metricName = 'Portfolio Heat';
          break;
        case 'DRAWDOWN':
          currentValue = portfolioRisk.drawdown;
          metricName = 'Drawdown';
          break;
        case 'CONSECUTIVE_LOSSES':
          currentValue = portfolioRisk.consecutiveLosses;
          metricName = 'Consecutive Losses';
          break;
        case 'DAILY_LOSS':
          currentValue = Math.abs(portfolioRisk.dailyPnL) / 100000; // Assuming 100k account
          metricName = 'Daily Loss';
          break;
        default:
          return;
      }

      // Check critical threshold
      if (currentValue >= threshold.critical) {
        this.generateThresholdAlert(metricName, currentValue, threshold.critical, 'CRITICAL');
      }
      // Check warning threshold
      else if (currentValue >= threshold.warning) {
        this.generateThresholdAlert(metricName, currentValue, threshold.warning, 'HIGH');
      }
    });
  }

  private generateThresholdAlert(
    metricName: string,
    currentValue: number,
    threshold: number,
    severity: 'HIGH' | 'CRITICAL'
  ): void {
    const alertId = `threshold_${metricName.toLowerCase().replace(' ', '_')}_${Date.now()}`;
    
    // Check if we already have a recent alert for this threshold
    const recentAlert = Array.from(this.alerts.values()).find(
      alert => alert.message.includes(metricName) && 
               alert.timestamp > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );

    if (recentAlert) return; // Don't spam alerts

    const alert: Alert = {
      id: alertId,
      timestamp: new Date(),
      type: 'THRESHOLD_BREACH',
      severity,
      message: `${metricName} threshold breached: ${(currentValue * 100).toFixed(1)}% >= ${(threshold * 100).toFixed(1)}%`,
      data: { metric: metricName, currentValue, threshold },
      acknowledged: false,
      resolved: false
    };

    this.alerts.set(alertId, alert);
    this.sendAlert(alert);
    this.emit('thresholdAlert', alert);
  }

  private updateAlertsForRiskImprovement(portfolioRisk: PortfolioRisk): void {
    // Auto-resolve alerts if risk conditions improve
    const activeAlerts = this.getActiveAlerts();
    
    activeAlerts.forEach(alert => {
      if (alert.type === 'RISK_VIOLATION' && this.shouldAutoResolve(alert, portfolioRisk)) {
        this.resolveAlert(alert.id);
      }
    });
  }

  private shouldAutoResolve(alert: Alert, portfolioRisk: PortfolioRisk): boolean {
    const violation = alert.data as RiskViolation;
    
    switch (violation.type) {
      case 'HEAT_EXCEEDED':
        return portfolioRisk.currentHeat < violation.threshold * 0.9; // 10% buffer
      case 'DRAWDOWN_EXCEEDED':
        return portfolioRisk.drawdown < violation.threshold * 0.9;
      case 'CONSECUTIVE_LOSSES':
        return portfolioRisk.consecutiveLosses < violation.threshold;
      default:
        return false;
    }
  }

  // Placeholder methods for external integrations
  private async sendWebhook(alert: Alert, endpoint: string): Promise<void> {
    // Implementation would send HTTP POST to webhook endpoint
    console.log(`Webhook alert sent to ${endpoint}:`, alert.message);
  }

  private async sendEmail(alert: Alert, recipients: string[]): Promise<void> {
    // Implementation would send email via SMTP or email service
    console.log(`Email alert sent to ${recipients.join(', ')}:`, alert.message);
  }

  private async sendSMS(alert: Alert, recipients: string[]): Promise<void> {
    // Implementation would send SMS via SMS service
    console.log(`SMS alert sent to ${recipients.join(', ')}:`, alert.message);
  }

  /**
   * Update alert configuration
   */
  public updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Enable/disable alert system
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.emit('enabledChanged', enabled);
  }

  /**
   * Get alert statistics
   */
  public getAlertStats(hours: number = 24): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    acknowledged: number;
    resolved: number;
  } {
    const alerts = this.getAlertHistory(hours);
    
    const stats = {
      total: alerts.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      acknowledged: alerts.filter(a => a.acknowledged).length,
      resolved: alerts.filter(a => a.resolved).length
    };

    alerts.forEach(alert => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
    });

    return stats;
  }
}