// File: /gamma-services/mtf/alerts/AlertManager.ts

import { WebhookDispatcher } from './WebhookDispatcher';

export interface Alert {
  type: 'STATE_TRANSITION' | 'CONFIDENCE_DECAY' | 'RISK_ALERT' | 'SYSTEM_STATUS';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  channels: ('slack' | 'telegram' | 'discord' | 'dashboard')[];
  data?: any;
  timestamp: number;
}

export interface AlertConfig {
  enabled: boolean;
  channels: {
    slack: {
      enabled: boolean;
      webhookUrl?: string;
    };
    telegram: {
      enabled: boolean;
      botToken?: string;
      chatId?: string;
    };
    discord: {
      enabled: boolean;
      webhookUrl?: string;
    };
    dashboard: {
      enabled: boolean;
    };
  };
  cooldowns: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };
}

export class AlertManager {
  private webhookDispatcher: WebhookDispatcher;
  private cooldownManager: Map<string, number> = new Map();
  private config: AlertConfig;

  constructor(config?: Partial<AlertConfig>) {
    this.config = {
      enabled: true,
      channels: {
        slack: { enabled: false },
        telegram: { enabled: false },
        discord: { enabled: false },
        dashboard: { enabled: true }
      },
      cooldowns: {
        LOW: 300000,    // 5 minutes
        MEDIUM: 120000, // 2 minutes
        HIGH: 60000,    // 1 minute
        CRITICAL: 30000 // 30 seconds
      },
      ...config
    };

    this.webhookDispatcher = new WebhookDispatcher(this.config);
  }

  public async dispatchAlert(alert: Alert): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Check cooldown for similar alerts
      const cooldownKey = `${alert.type}_${alert.priority}`;
      const lastAlertTime = this.cooldownManager.get(cooldownKey) || 0;
      
      if (Date.now() - lastAlertTime < this.getCooldownMs(alert.priority)) {
        return; // Skip due to cooldown
      }

      // Dispatch to configured channels
      const promises = alert.channels
        .filter(channel => this.config.channels[channel]?.enabled)
        .map(channel => this.sendToChannel(alert, channel));

      await Promise.allSettled(promises);

      // Update cooldown
      this.cooldownManager.set(cooldownKey, Date.now());

      console.log(`Alert dispatched: ${alert.type} - ${alert.priority} - ${alert.message}`);
    } catch (error) {
      console.error('Failed to dispatch alert:', error);
    }
  }

  public async sendBulkAlerts(alerts: Alert[]): Promise<void> {
    const promises = alerts.map(alert => this.dispatchAlert(alert));
    await Promise.allSettled(promises);
  }

  public updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.webhookDispatcher.updateConfig(this.config);
  }

  public clearCooldowns(): void {
    this.cooldownManager.clear();
  }

  public getCooldownStatus(): Record<string, { lastAlert: number; nextAllowed: number }> {
    const status: Record<string, { lastAlert: number; nextAllowed: number }> = {};
    
    for (const [key, lastTime] of this.cooldownManager.entries()) {
      const [type, priority] = key.split('_');
      const cooldown = this.getCooldownMs(priority as Alert['priority']);
      
      status[key] = {
        lastAlert: lastTime,
        nextAllowed: lastTime + cooldown
      };
    }
    
    return status;
  }

  private async sendToChannel(alert: Alert, channel: string): Promise<void> {
    try {
      switch (channel) {
        case 'slack':
          await this.webhookDispatcher.sendToSlack(this.formatSlackMessage(alert));
          break;
        case 'telegram':
          await this.webhookDispatcher.sendToTelegram(this.formatTelegramMessage(alert));
          break;
        case 'discord':
          await this.webhookDispatcher.sendToDiscord(this.formatDiscordMessage(alert));
          break;
        case 'dashboard':
          this.emitDashboardAlert(alert);
          break;
        default:
          console.warn(`Unknown alert channel: ${channel}`);
      }
    } catch (error) {
      console.error(`Failed to send alert to ${channel}:`, error);
    }
  }

  private formatSlackMessage(alert: Alert): any {
    const color = {
      'LOW': '#36a64f',
      'MEDIUM': '#f2c744',
      'HIGH': '#e67e22', 
      'CRITICAL': '#e74c3c'
    }[alert.priority];

    return {
      attachments: [{
        color,
        title: `Trading Alert - ${alert.type}`,
        text: alert.message,
        fields: alert.data ? this.formatDataFields(alert.data) : [],
        ts: Math.floor(alert.timestamp / 1000)
      }]
    };
  }

  private formatTelegramMessage(alert: Alert): string {
    const priorityIcon = {
      'LOW': '🔵',
      'MEDIUM': '🟡',
      'HIGH': '🟠',
      'CRITICAL': '🔴'
    }[alert.priority];

    let message = `${priorityIcon} *${alert.type}*\n\n${alert.message}\n\n*Time:* ${new Date(alert.timestamp).toLocaleTimeString()}`;

    if (alert.data) {
      message += '\n\n*Details:*';
      Object.entries(alert.data).forEach(([key, value]) => {
        message += `\n• ${key}: ${value}`;
      });
    }

    return message;
  }

  private formatDiscordMessage(alert: Alert): any {
    return {
      embeds: [{
        title: `Trading Alert - ${alert.type}`,
        description: alert.message,
        color: this.getDiscordColor(alert.priority),
        timestamp: new Date(alert.timestamp).toISOString(),
        fields: alert.data ? this.formatDataFields(alert.data) : []
      }]
    };
  }

  private emitDashboardAlert(alert: Alert): void {
    // Emit event for real-time dashboard updates
    try {
      const eventBus = require('../../orchestrators/EventBus').default;
      eventBus.emit('alert:new', alert);
    } catch (error) {
      console.error('Failed to emit dashboard alert:', error);
    }
  }

  private formatDataFields(data: any): any[] {
    return Object.entries(data).map(([key, value]) => ({
      title: key,
      value: String(value),
      short: true
    }));
  }

  private getDiscordColor(priority: string): number {
    const colors = {
      'LOW': 0x36a64f,    // Green
      'MEDIUM': 0xf2c744, // Yellow
      'HIGH': 0xe67e22,   // Orange
      'CRITICAL': 0xe74c3c // Red
    };
    return colors[priority] || 0x95a5a6;
  }

  private getCooldownMs(priority: string): number {
    return this.config.cooldowns[priority] || 60000;
  }

  // Utility methods for creating common alerts
  public static createStateTransitionAlert(
    ticker: string,
    fromState: string,
    toState: string,
    confidence: number,
    notes: string[]
  ): Alert {
    const emoji = {
      'READY': '⏹️',
      'SET': '🟡', 
      'GO': '🟢',
      'TRADE': '🚀',
      'EXIT': '📤',
      'ABORT': '🚫'
    }[toState] || '❓';

    const priority = ['TRADE', 'ABORT'].includes(toState) ? 'HIGH' : 
                    ['EXIT', 'GO'].includes(toState) ? 'MEDIUM' : 'LOW';

    return {
      type: 'STATE_TRANSITION',
      priority: priority as Alert['priority'],
      message: `${emoji} ${ticker} | ${fromState} → ${toState}\nConfidence: ${(confidence * 100).toFixed(1)}%\nNotes: ${notes.join(', ')}`,
      channels: ['slack', 'telegram', 'dashboard'],
      data: {
        ticker,
        fromState,
        toState,
        confidence,
        notes
      },
      timestamp: Date.now()
    };
  }

  public static createRiskAlert(
    ticker: string,
    riskType: string,
    currentValue: number,
    threshold: number,
    action: string
  ): Alert {
    return {
      type: 'RISK_ALERT',
      priority: 'HIGH',
      message: `⚠️ Risk Alert: ${ticker}\n${riskType}: ${currentValue} exceeds threshold ${threshold}\nAction: ${action}`,
      channels: ['slack', 'telegram', 'dashboard'],
      data: {
        ticker,
        riskType,
        currentValue,
        threshold,
        action
      },
      timestamp: Date.now()
    };
  }

  public static createSystemAlert(
    component: string,
    status: string,
    message: string,
    priority: Alert['priority'] = 'MEDIUM'
  ): Alert {
    return {
      type: 'SYSTEM_STATUS',
      priority,
      message: `🔧 System Alert: ${component}\nStatus: ${status}\n${message}`,
      channels: ['slack', 'dashboard'],
      data: {
        component,
        status,
        message
      },
      timestamp: Date.now()
    };
  }
}