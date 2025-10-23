// Browser notification service for paper trading alerts

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  data?: any;
}

export class NotificationService {
  private static instance: NotificationService;
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'Notification' in window;
    if (this.isSupported) {
      this.permission = Notification.permission;
    }
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser');
      return 'denied';
    }

    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  public async showNotification(options: NotificationOptions): Promise<Notification | null> {
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return null;
    }

    if (this.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        data: options.data
      });

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return null;
    }
  }

  // Predefined notification types for paper trading
  public showTradeExecuted(ticker: string, side: string, confidence: number): Promise<Notification | null> {
    return this.showNotification({
      title: '📈 Trade Executed',
      body: `${side} position opened for ${ticker} (confidence: ${(confidence * 100).toFixed(1)}%)`,
      tag: 'trade-executed',
      data: { type: 'trade_executed', ticker, side, confidence }
    });
  }

  public showTradeClosed(ticker: string, pnl: number, side: string): Promise<Notification | null> {
    const isProfit = pnl > 0;
    return this.showNotification({
      title: isProfit ? '💰 Trade Profit' : '📉 Trade Loss',
      body: `${side} ${ticker} closed: ${isProfit ? '+' : ''}$${pnl.toFixed(2)}`,
      tag: 'trade-closed',
      requireInteraction: !isProfit && Math.abs(pnl) > 200, // Require interaction for large losses
      data: { type: 'trade_closed', ticker, pnl, side }
    });
  }

  public showRiskViolation(violationType: string, ticker?: string): Promise<Notification | null> {
    return this.showNotification({
      title: '⚠️ Risk Violation',
      body: `Risk limit exceeded: ${violationType}${ticker ? ` (${ticker})` : ''}`,
      tag: 'risk-violation',
      requireInteraction: true,
      data: { type: 'risk_violation', violationType, ticker }
    });
  }

  public showPerformanceMilestone(milestone: string, value: string): Promise<Notification | null> {
    return this.showNotification({
      title: '🎯 Performance Milestone',
      body: `${milestone}: ${value}`,
      tag: 'performance-milestone',
      data: { type: 'performance_milestone', milestone, value }
    });
  }

  public showSystemError(component: string, error: string): Promise<Notification | null> {
    return this.showNotification({
      title: '🚨 System Error',
      body: `Error in ${component}: ${error}`,
      tag: 'system-error',
      requireInteraction: true,
      data: { type: 'system_error', component, error }
    });
  }

  public showRegimeChange(ticker: string, oldRegime: string, newRegime: string): Promise<Notification | null> {
    return this.showNotification({
      title: '📊 Regime Change',
      body: `${ticker}: ${oldRegime} → ${newRegime}`,
      tag: 'regime-change',
      data: { type: 'regime_change', ticker, oldRegime, newRegime }
    });
  }

  public isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  public isSupported(): boolean {
    return this.isSupported;
  }

  public getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  // Clear all notifications with a specific tag
  public clearNotifications(tag?: string): void {
    if (!this.isSupported) return;

    // Note: There's no direct way to clear notifications in the browser API
    // This is a placeholder for potential future implementation
    console.log(`Clearing notifications${tag ? ` with tag: ${tag}` : ''}`);
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

import { useState } from 'react';

// Hook for React components
export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationService.getPermissionStatus()
  );

  const requestPermission = async () => {
    const newPermission = await notificationService.requestPermission();
    setPermission(newPermission);
    return newPermission;
  };

  return {
    permission,
    requestPermission,
    showNotification: notificationService.showNotification.bind(notificationService),
    showTradeExecuted: notificationService.showTradeExecuted.bind(notificationService),
    showTradeClosed: notificationService.showTradeClosed.bind(notificationService),
    showRiskViolation: notificationService.showRiskViolation.bind(notificationService),
    showPerformanceMilestone: notificationService.showPerformanceMilestone.bind(notificationService),
    showSystemError: notificationService.showSystemError.bind(notificationService),
    showRegimeChange: notificationService.showRegimeChange.bind(notificationService),
    isSupported: notificationService.isSupported(),
    isPermissionGranted: notificationService.isPermissionGranted()
  };
}

// Auto-request permission on first load (optional)
export function initializeNotifications(): Promise<NotificationPermission> {
  return notificationService.requestPermission();
}