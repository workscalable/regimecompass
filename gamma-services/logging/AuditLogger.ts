import { logger, LogContext } from './Logger';

export type AuditEventType = 
  | 'TRADE_EXECUTED'
  | 'POSITION_OPENED'
  | 'POSITION_CLOSED'
  | 'POSITION_UPDATED'
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_UPDATED'
  | 'RISK_LIMIT_CHANGED'
  | 'CONFIGURATION_CHANGED'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'API_ACCESS'
  | 'DATA_EXPORT'
  | 'ALERT_TRIGGERED'
  | 'ALERT_ACKNOWLEDGED'
  | 'ALERT_RESOLVED'
  | 'SYSTEM_START'
  | 'SYSTEM_STOP'
  | 'ERROR_OCCURRED'
  | 'RECOVERY_ATTEMPTED';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  accountId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource: string;
  action: string;
  details: Record<string, any>;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  errorMessage?: string;
  correlationId?: string;
  tags?: string[];
}

export interface AuditFilter {
  eventTypes?: AuditEventType[];
  userId?: string;
  accountId?: string;
  resource?: string;
  outcome?: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  limit?: number;
}

/**
 * Audit Logger for comprehensive tracking of all paper trading operations
 */
export class AuditLogger {
  private auditEvents: AuditEvent[] = [];
  private eventCounter = 0;

  constructor() {
    this.startAuditCleanup();
  }

  /**
   * Log an audit event
   */
  async logEvent(
    eventType: AuditEventType,
    resource: string,
    action: string,
    details: Record<string, any>,
    outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL' = 'SUCCESS',
    context: LogContext = {},
    errorMessage?: string
  ): Promise<string> {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType,
      userId: context.userId,
      accountId: context.accountId,
      sessionId: context.sessionId,
      ipAddress: context.metadata?.ipAddress,
      userAgent: context.metadata?.userAgent,
      resource,
      action,
      details,
      outcome,
      errorMessage,
      correlationId: context.correlationId,
      tags: this.generateTags(eventType, resource, action)
    };

    // Store audit event
    this.auditEvents.push(auditEvent);
    
    // Keep only last 10,000 events in memory
    if (this.auditEvents.length > 10000) {
      this.auditEvents = this.auditEvents.slice(-10000);
    }

    // Log to main logger
    const logLevel = outcome === 'FAILURE' ? 'ERROR' : 'INFO';
    await logger.log(
      logLevel,
      'SYSTEM',
      `Audit: ${eventType} - ${resource}.${action}`,
      {
        ...context,
        metadata: {
          auditEventId: auditEvent.id,
          outcome,
          resource,
          action
        }
      },
      errorMessage ? new Error(errorMessage) : undefined,
      undefined,
      auditEvent.tags
    );

    return auditEvent.id;
  }

  /**
   * Log trade execution event
   */
  async logTradeExecution(
    signalId: string,
    ticker: string,
    side: 'LONG' | 'SHORT',
    quantity: number,
    price: number,
    outcome: 'SUCCESS' | 'FAILURE',
    context: LogContext,
    errorMessage?: string
  ): Promise<string> {
    return await this.logEvent(
      'TRADE_EXECUTED',
      'trade',
      'execute',
      {
        signalId,
        ticker,
        side,
        quantity,
        price,
        premium: price * quantity * 100
      },
      outcome,
      context,
      errorMessage
    );
  }

  /**
   * Log position management events
   */
  async logPositionOpened(
    positionId: string,
    ticker: string,
    contractDetails: Record<string, any>,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'POSITION_OPENED',
      'position',
      'open',
      {
        positionId,
        ticker,
        ...contractDetails
      },
      'SUCCESS',
      context
    );
  }

  async logPositionClosed(
    positionId: string,
    ticker: string,
    exitReason: string,
    pnl: number,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'POSITION_CLOSED',
      'position',
      'close',
      {
        positionId,
        ticker,
        exitReason,
        pnl,
        pnlPercent: context.metadata?.pnlPercent
      },
      'SUCCESS',
      context
    );
  }

  async logPositionUpdated(
    positionId: string,
    ticker: string,
    updates: Record<string, any>,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'POSITION_UPDATED',
      'position',
      'update',
      {
        positionId,
        ticker,
        updates
      },
      'SUCCESS',
      context
    );
  }

  /**
   * Log account management events
   */
  async logAccountCreated(
    accountId: string,
    initialBalance: number,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'ACCOUNT_CREATED',
      'account',
      'create',
      {
        accountId,
        initialBalance
      },
      'SUCCESS',
      context
    );
  }

  async logAccountUpdated(
    accountId: string,
    changes: Record<string, any>,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'ACCOUNT_UPDATED',
      'account',
      'update',
      {
        accountId,
        changes
      },
      'SUCCESS',
      context
    );
  }

  /**
   * Log risk management events
   */
  async logRiskLimitChanged(
    limitType: string,
    oldValue: any,
    newValue: any,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'RISK_LIMIT_CHANGED',
      'risk',
      'updateLimit',
      {
        limitType,
        oldValue,
        newValue
      },
      'SUCCESS',
      context
    );
  }

  /**
   * Log configuration changes
   */
  async logConfigurationChanged(
    configKey: string,
    oldValue: any,
    newValue: any,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'CONFIGURATION_CHANGED',
      'configuration',
      'update',
      {
        configKey,
        oldValue,
        newValue
      },
      'SUCCESS',
      context
    );
  }

  /**
   * Log user authentication events
   */
  async logUserLogin(
    userId: string,
    outcome: 'SUCCESS' | 'FAILURE',
    context: LogContext,
    errorMessage?: string
  ): Promise<string> {
    return await this.logEvent(
      'USER_LOGIN',
      'authentication',
      'login',
      {
        userId,
        loginMethod: context.metadata?.loginMethod || 'unknown'
      },
      outcome,
      context,
      errorMessage
    );
  }

  async logUserLogout(
    userId: string,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'USER_LOGOUT',
      'authentication',
      'logout',
      {
        userId,
        sessionDuration: context.metadata?.sessionDuration
      },
      'SUCCESS',
      context
    );
  }

  /**
   * Log API access events
   */
  async logApiAccess(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    context: LogContext
  ): Promise<string> {
    const outcome = statusCode >= 400 ? 'FAILURE' : 'SUCCESS';
    
    return await this.logEvent(
      'API_ACCESS',
      'api',
      method.toLowerCase(),
      {
        endpoint,
        method,
        statusCode,
        responseTime
      },
      outcome,
      context,
      statusCode >= 400 ? `HTTP ${statusCode}` : undefined
    );
  }

  /**
   * Log data export events
   */
  async logDataExport(
    exportType: string,
    recordCount: number,
    format: string,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'DATA_EXPORT',
      'data',
      'export',
      {
        exportType,
        recordCount,
        format,
        fileSize: context.metadata?.fileSize
      },
      'SUCCESS',
      context
    );
  }

  /**
   * Log alert events
   */
  async logAlertTriggered(
    alertId: string,
    alertType: string,
    severity: string,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'ALERT_TRIGGERED',
      'alert',
      'trigger',
      {
        alertId,
        alertType,
        severity
      },
      'SUCCESS',
      context
    );
  }

  async logAlertAcknowledged(
    alertId: string,
    acknowledgedBy: string,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'ALERT_ACKNOWLEDGED',
      'alert',
      'acknowledge',
      {
        alertId,
        acknowledgedBy
      },
      'SUCCESS',
      context
    );
  }

  async logAlertResolved(
    alertId: string,
    resolvedBy: string,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'ALERT_RESOLVED',
      'alert',
      'resolve',
      {
        alertId,
        resolvedBy
      },
      'SUCCESS',
      context
    );
  }

  /**
   * Log system events
   */
  async logSystemStart(context: LogContext = {}): Promise<string> {
    return await this.logEvent(
      'SYSTEM_START',
      'system',
      'start',
      {
        version: context.metadata?.version || '1.0.0',
        environment: context.metadata?.environment || 'development'
      },
      'SUCCESS',
      context
    );
  }

  async logSystemStop(context: LogContext = {}): Promise<string> {
    return await this.logEvent(
      'SYSTEM_STOP',
      'system',
      'stop',
      {
        uptime: context.metadata?.uptime,
        reason: context.metadata?.reason || 'normal'
      },
      'SUCCESS',
      context
    );
  }

  /**
   * Log error and recovery events
   */
  async logErrorOccurred(
    errorType: string,
    errorMessage: string,
    context: LogContext
  ): Promise<string> {
    return await this.logEvent(
      'ERROR_OCCURRED',
      'error',
      'occur',
      {
        errorType,
        component: context.component,
        operation: context.operation
      },
      'FAILURE',
      context,
      errorMessage
    );
  }

  async logRecoveryAttempted(
    recoveryType: string,
    outcome: 'SUCCESS' | 'FAILURE',
    context: LogContext,
    errorMessage?: string
  ): Promise<string> {
    return await this.logEvent(
      'RECOVERY_ATTEMPTED',
      'recovery',
      'attempt',
      {
        recoveryType,
        attempts: context.metadata?.attempts || 1
      },
      outcome,
      context,
      errorMessage
    );
  }

  /**
   * Query audit events with filters
   */
  queryEvents(filter: AuditFilter = {}): AuditEvent[] {
    let filteredEvents = [...this.auditEvents];

    // Filter by event types
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      filteredEvents = filteredEvents.filter(event => 
        filter.eventTypes!.includes(event.eventType)
      );
    }

    // Filter by user ID
    if (filter.userId) {
      filteredEvents = filteredEvents.filter(event => 
        event.userId === filter.userId
      );
    }

    // Filter by account ID
    if (filter.accountId) {
      filteredEvents = filteredEvents.filter(event => 
        event.accountId === filter.accountId
      );
    }

    // Filter by resource
    if (filter.resource) {
      filteredEvents = filteredEvents.filter(event => 
        event.resource === filter.resource
      );
    }

    // Filter by outcome
    if (filter.outcome) {
      filteredEvents = filteredEvents.filter(event => 
        event.outcome === filter.outcome
      );
    }

    // Filter by date range
    if (filter.startDate) {
      filteredEvents = filteredEvents.filter(event => 
        event.timestamp >= filter.startDate!
      );
    }

    if (filter.endDate) {
      filteredEvents = filteredEvents.filter(event => 
        event.timestamp <= filter.endDate!
      );
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      filteredEvents = filteredEvents.filter(event => 
        event.tags && filter.tags!.some(tag => event.tags!.includes(tag))
      );
    }

    // Sort by timestamp (newest first)
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      filteredEvents = filteredEvents.slice(0, filter.limit);
    }

    return filteredEvents;
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics(): {
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsByOutcome: Record<string, number>;
    eventsByResource: Record<string, number>;
    recentActivity: AuditEvent[];
  } {
    const eventsByType: Record<AuditEventType, number> = {
      TRADE_EXECUTED: 0,
      POSITION_OPENED: 0,
      POSITION_CLOSED: 0,
      POSITION_UPDATED: 0,
      ACCOUNT_CREATED: 0,
      ACCOUNT_UPDATED: 0,
      RISK_LIMIT_CHANGED: 0,
      CONFIGURATION_CHANGED: 0,
      USER_LOGIN: 0,
      USER_LOGOUT: 0,
      API_ACCESS: 0,
      DATA_EXPORT: 0,
      ALERT_TRIGGERED: 0,
      ALERT_ACKNOWLEDGED: 0,
      ALERT_RESOLVED: 0,
      SYSTEM_START: 0,
      SYSTEM_STOP: 0,
      ERROR_OCCURRED: 0,
      RECOVERY_ATTEMPTED: 0
    };

    const eventsByOutcome: Record<string, number> = {
      SUCCESS: 0,
      FAILURE: 0,
      PARTIAL: 0
    };

    const eventsByResource: Record<string, number> = {};

    this.auditEvents.forEach(event => {
      eventsByType[event.eventType]++;
      eventsByOutcome[event.outcome]++;
      
      eventsByResource[event.resource] = (eventsByResource[event.resource] || 0) + 1;
    });

    const recentActivity = this.auditEvents
      .slice(-20)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalEvents: this.auditEvents.length,
      eventsByType,
      eventsByOutcome,
      eventsByResource,
      recentActivity
    };
  }

  /**
   * Export audit events
   */
  exportEvents(filter: AuditFilter = {}, format: 'JSON' | 'CSV' = 'JSON'): string {
    const events = this.queryEvents(filter);
    
    if (format === 'CSV') {
      return this.exportToCsv(events);
    } else {
      return JSON.stringify(events, null, 2);
    }
  }

  /**
   * Export events to CSV format
   */
  private exportToCsv(events: AuditEvent[]): string {
    if (events.length === 0) return '';

    const headers = [
      'ID', 'Timestamp', 'Event Type', 'User ID', 'Account ID', 
      'Resource', 'Action', 'Outcome', 'Error Message', 'Correlation ID'
    ];

    const rows = events.map(event => [
      event.id,
      event.timestamp.toISOString(),
      event.eventType,
      event.userId || '',
      event.accountId || '',
      event.resource,
      event.action,
      event.outcome,
      event.errorMessage || '',
      event.correlationId || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  /**
   * Generate event ID
   */
  private generateEventId(): string {
    this.eventCounter++;
    return `audit-${Date.now()}-${this.eventCounter.toString().padStart(6, '0')}`;
  }

  /**
   * Generate tags for event
   */
  private generateTags(eventType: AuditEventType, resource: string, action: string): string[] {
    const tags = [
      eventType.toLowerCase(),
      resource,
      action,
      'audit'
    ];

    // Add category tags
    if (eventType.includes('TRADE') || eventType.includes('POSITION')) {
      tags.push('trading');
    }
    
    if (eventType.includes('USER') || eventType === 'API_ACCESS') {
      tags.push('security');
    }
    
    if (eventType.includes('ALERT') || eventType.includes('ERROR')) {
      tags.push('monitoring');
    }
    
    if (eventType.includes('SYSTEM') || eventType.includes('CONFIGURATION')) {
      tags.push('system');
    }

    return tags;
  }

  /**
   * Start periodic cleanup of old audit events
   */
  private startAuditCleanup(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
      const originalLength = this.auditEvents.length;
      
      this.auditEvents = this.auditEvents.filter(event => event.timestamp >= cutoff);
      
      const removedCount = originalLength - this.auditEvents.length;
      if (removedCount > 0) {
        logger.info('SYSTEM', `Cleaned up ${removedCount} old audit events`, {
          operation: 'audit-cleanup',
          metadata: {
            removedCount,
            remainingCount: this.auditEvents.length
          }
        });
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  /**
   * Get event by ID
   */
  getEventById(eventId: string): AuditEvent | null {
    return this.auditEvents.find(event => event.id === eventId) || null;
  }

  /**
   * Clear all audit events (use with caution)
   */
  clearAllEvents(): void {
    const eventCount = this.auditEvents.length;
    this.auditEvents = [];
    
    logger.warn('SYSTEM', `All audit events cleared`, {
      operation: 'audit-clear',
      metadata: {
        clearedCount: eventCount
      }
    });
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();