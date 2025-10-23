import { createClient } from '@supabase/supabase-js';
import { EncryptionService } from './EncryptionService';

export interface SecurityEvent {
  id: string;
  eventType: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'API_ACCESS' | 'DATA_ACCESS' | 'TRADING_ACTION' | 'SECURITY_VIOLATION';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  resource: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  topUsers: Array<{ userId: string; eventCount: number }>;
  topIPs: Array<{ ipAddress: string; eventCount: number }>;
  securityViolations: number;
  failedLogins: number;
  suspiciousActivity: number;
}

export class SecurityAuditService {
  private supabase: any;
  private encryptionService: EncryptionService;
  private config: {
    enabled: boolean;
    logLevel: 'minimal' | 'standard' | 'verbose';
    retentionDays: number;
  };

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    encryptionService: EncryptionService,
    config: {
      enabled: boolean;
      logLevel: 'minimal' | 'standard' | 'verbose';
      retentionDays: number;
    }
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.encryptionService = encryptionService;
    this.config = config;
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const securityEvent: SecurityEvent = {
        ...event,
        id: this.encryptionService.generateSecureToken(),
        timestamp: new Date()
      };

      // Encrypt sensitive details
      const encryptedDetails = this.encryptionService.encrypt(JSON.stringify(event.details));

      // Store in database
      const { error } = await this.supabase
        .from('security_audit_logs')
        .insert({
          id: securityEvent.id,
          event_type: securityEvent.eventType,
          user_id: securityEvent.userId,
          ip_address: securityEvent.ipAddress,
          user_agent: securityEvent.userAgent,
          resource: securityEvent.resource,
          action: securityEvent.action,
          outcome: securityEvent.outcome,
          severity: securityEvent.severity,
          details: encryptedDetails,
          correlation_id: securityEvent.correlationId,
          created_at: securityEvent.timestamp.toISOString()
        });

      if (error) {
        console.error('Failed to log security event:', error);
      }

      // Check for suspicious patterns
      await this.checkSuspiciousActivity(securityEvent);
    } catch (error) {
      console.error('Security audit logging failed:', error);
    }
  }

  /**
   * Log authentication events
   */
  async logAuthenticationEvent(
    eventType: 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE',
    userId: string,
    ipAddress: string,
    userAgent: string,
    outcome: 'SUCCESS' | 'FAILURE',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType,
      userId,
      ipAddress,
      userAgent,
      resource: 'authentication',
      action: eventType.toLowerCase(),
      outcome,
      severity: outcome === 'FAILURE' ? 'HIGH' : 'LOW',
      details
    });
  }

  /**
   * Log API access events
   */
  async logApiAccessEvent(
    userId: string,
    ipAddress: string,
    userAgent: string,
    resource: string,
    action: string,
    outcome: 'SUCCESS' | 'FAILURE',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'API_ACCESS',
      userId,
      ipAddress,
      userAgent,
      resource,
      action,
      outcome,
      severity: outcome === 'FAILURE' ? 'MEDIUM' : 'LOW',
      details
    });
  }

  /**
   * Log trading events
   */
  async logTradingEvent(
    userId: string,
    ipAddress: string,
    userAgent: string,
    action: string,
    outcome: 'SUCCESS' | 'FAILURE',
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'TRADING_ACTION',
      userId,
      ipAddress,
      userAgent,
      resource: 'trading',
      action,
      outcome,
      severity: outcome === 'FAILURE' ? 'HIGH' : 'LOW',
      details
    });
  }

  /**
   * Log security violations
   */
  async logSecurityViolation(
    userId: string,
    ipAddress: string,
    userAgent: string,
    violation: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'SECURITY_VIOLATION',
      userId,
      ipAddress,
      userAgent,
      resource: 'security',
      action: violation,
      outcome: 'BLOCKED',
      severity: 'CRITICAL',
      details
    });
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeRange: { start: Date; end: Date }): Promise<SecurityMetrics> {
    try {
      const { data: events, error } = await this.supabase
        .from('security_audit_logs')
        .select('*')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString());

      if (error) {
        throw new Error(`Failed to fetch security metrics: ${error.message}`);
      }

      const metrics: SecurityMetrics = {
        totalEvents: events.length,
        eventsByType: {},
        eventsBySeverity: {},
        eventsByOutcome: {},
        topUsers: [],
        topIPs: [],
        securityViolations: 0,
        failedLogins: 0,
        suspiciousActivity: 0
      };

      // Process events
      for (const event of events) {
        // Count by type
        metrics.eventsByType[event.event_type] = (metrics.eventsByType[event.event_type] || 0) + 1;
        
        // Count by severity
        metrics.eventsBySeverity[event.severity] = (metrics.eventsBySeverity[event.severity] || 0) + 1;
        
        // Count by outcome
        metrics.eventsByOutcome[event.outcome] = (metrics.eventsByOutcome[event.outcome] || 0) + 1;
        
        // Count specific events
        if (event.event_type === 'SECURITY_VIOLATION') {
          metrics.securityViolations++;
        }
        
        if (event.event_type === 'LOGIN' && event.outcome === 'FAILURE') {
          metrics.failedLogins++;
        }
      }

      // Get top users
      const userCounts: Record<string, number> = {};
      for (const event of events) {
        if (event.user_id) {
          userCounts[event.user_id] = (userCounts[event.user_id] || 0) + 1;
        }
      }
      
      metrics.topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, eventCount: count }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      // Get top IPs
      const ipCounts: Record<string, number> = {};
      for (const event of events) {
        ipCounts[event.ip_address] = (ipCounts[event.ip_address] || 0) + 1;
      }
      
      metrics.topIPs = Object.entries(ipCounts)
        .map(([ipAddress, count]) => ({ ipAddress, eventCount: count }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      return metrics;
    } catch (error) {
      throw new Error(`Failed to get security metrics: ${error.message}`);
    }
  }

  /**
   * Check for suspicious activity
   */
  private async checkSuspiciousActivity(event: SecurityEvent): Promise<void> {
    try {
      // Check for multiple failed logins from same IP
      if (event.eventType === 'LOGIN' && event.outcome === 'FAILURE') {
        const { data: recentFailures } = await this.supabase
          .from('security_audit_logs')
          .select('*')
          .eq('event_type', 'LOGIN')
          .eq('outcome', 'FAILURE')
          .eq('ip_address', event.ipAddress)
          .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()); // Last 15 minutes

        if (recentFailures && recentFailures.length >= 5) {
          await this.logSecurityViolation(
            event.userId || 'unknown',
            event.ipAddress,
            event.userAgent,
            'Multiple failed login attempts',
            { failureCount: recentFailures.length, timeWindow: '15 minutes' }
          );
        }
      }

      // Check for unusual API access patterns
      if (event.eventType === 'API_ACCESS') {
        const { data: recentApiCalls } = await this.supabase
          .from('security_audit_logs')
          .select('*')
          .eq('event_type', 'API_ACCESS')
          .eq('user_id', event.userId)
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

        if (recentApiCalls && recentApiCalls.length >= 100) {
          await this.logSecurityViolation(
            event.userId || 'unknown',
            event.ipAddress,
            event.userAgent,
            'Excessive API calls',
            { callCount: recentApiCalls.length, timeWindow: '5 minutes' }
          );
        }
      }
    } catch (error) {
      console.error('Suspicious activity check failed:', error);
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
      
      const { error } = await this.supabase
        .from('security_audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Failed to cleanup old audit logs:', error);
      } else {
        console.log(`Cleaned up audit logs older than ${this.config.retentionDays} days`);
      }
    } catch (error) {
      console.error('Audit log cleanup failed:', error);
    }
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    timeRange: { start: Date; end: Date },
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const { data: events, error } = await this.supabase
        .from('security_audit_logs')
        .select('*')
        .gte('created_at', timeRange.start.toISOString())
        .lte('created_at', timeRange.end.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to export audit logs: ${error.message}`);
      }

      if (format === 'json') {
        return JSON.stringify(events, null, 2);
      } else {
        // CSV format
        const headers = ['id', 'event_type', 'user_id', 'ip_address', 'user_agent', 'resource', 'action', 'outcome', 'severity', 'created_at'];
        const csvRows = [headers.join(',')];
        
        for (const event of events) {
          const row = headers.map(header => {
            const value = event[header] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
          });
          csvRows.push(row.join(','));
        }
        
        return csvRows.join('\n');
      }
    } catch (error) {
      throw new Error(`Failed to export audit logs: ${error.message}`);
    }
  }
}
