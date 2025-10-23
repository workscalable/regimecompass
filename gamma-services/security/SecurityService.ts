import { EventEmitter } from 'events';
import { SecurityMonitor } from './SecurityMonitor';
import { RateLimiter } from './RateLimiter';
import { DDoSProtection } from './DDoSProtection';
import { IntrusionDetection } from './IntrusionDetection';
import { GammaSecurityConfig, getSecurityConfig, validateSecurityConfig } from './SecurityConfig';
import { auditLogger } from '../logging/AuditLogger';
import { logger } from '../logging/Logger';

export interface SecurityServiceStatus {
  status: 'INITIALIZING' | 'RUNNING' | 'DEGRADED' | 'STOPPED' | 'ERROR';
  components: {
    securityMonitor: 'RUNNING' | 'STOPPED' | 'ERROR';
    rateLimiter: 'RUNNING' | 'STOPPED' | 'ERROR';
    ddosProtection: 'RUNNING' | 'STOPPED' | 'ERROR';
    intrusionDetection: 'RUNNING' | 'STOPPED' | 'ERROR';
  };
  metrics: {
    totalSecurityEvents: number;
    activeThreats: number;
    blockedIPs: number;
    blockedUsers: number;
    rateLimitViolations: number;
    intrusionAttempts: number;
  };
  lastHealthCheck: Date;
  uptime: number;
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  type: 'SECURITY_EVENT' | 'SYSTEM_ERROR' | 'THRESHOLD_EXCEEDED' | 'COMPONENT_FAILURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  component: string;
  message: string;
  details: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class SecurityService extends EventEmitter {
  private config: GammaSecurityConfig;
  private securityMonitor?: SecurityMonitor;
  private rateLimiter?: RateLimiter;
  private ddosProtection?: DDoSProtection;
  private intrusionDetection?: IntrusionDetection;
  private status: SecurityServiceStatus;
  private alerts: Map<string, SecurityAlert> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private startTime: Date;

  constructor(config?: GammaSecurityConfig) {
    super();
    this.config = config || getSecurityConfig();
    this.startTime = new Date();
    
    this.status = {
      status: 'INITIALIZING',
      components: {
        securityMonitor: 'STOPPED',
        rateLimiter: 'STOPPED',
        ddosProtection: 'STOPPED',
        intrusionDetection: 'STOPPED'
      },
      metrics: {
        totalSecurityEvents: 0,
        activeThreats: 0,
        blockedIPs: 0,
        blockedUsers: 0,
        rateLimitViolations: 0,
        intrusionAttempts: 0
      },
      lastHealthCheck: new Date(),
      uptime: 0
    };
  }

  public async initialize(): Promise<void> {
    console.log('🛡️ Initializing Security Service...');
    
    try {
      // Validate configuration
      const validation = validateSecurityConfig(this.config);
      if (!validation.valid) {
        throw new Error(`Invalid security configuration: ${validation.errors.join(', ')}`);
      }

      // Initialize Security Monitor
      this.securityMonitor = new SecurityMonitor(this.config.security);
      await this.securityMonitor.initialize();
      this.status.components.securityMonitor = 'RUNNING';
      
      // Set up event listeners
      this.setupEventListeners();

      // Initialize Rate Limiter
      if (this.config.rateLimiting) {
        this.rateLimiter = new RateLimiter(this.config.rateLimiting, this.securityMonitor);
        this.status.components.rateLimiter = 'RUNNING';
      }

      // Initialize DDoS Protection
      if (this.config.ddosProtection.enabled) {
        this.ddosProtection = new DDoSProtection(this.config.ddosProtection, this.securityMonitor);
        this.status.components.ddosProtection = 'RUNNING';
      }

      // Initialize Intrusion Detection
      if (this.config.intrusionDetection.enabled) {
        this.intrusionDetection = new IntrusionDetection(this.config.intrusionDetection, this.securityMonitor);
        await this.intrusionDetection.initialize();
        this.status.components.intrusionDetection = 'RUNNING';
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.status.status = 'RUNNING';
      
      console.log('✅ Security Service initialized successfully');
      this.emit('initialized');

      // Log initialization
      await auditLogger.logSystemStart({
        component: 'SecurityService',
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          componentsEnabled: {
            securityMonitor: true,
            rateLimiter: !!this.rateLimiter,
            ddosProtection: this.config.ddosProtection.enabled,
            intrusionDetection: this.config.intrusionDetection.enabled
          }
        }
      });

    } catch (error) {
      this.status.status = 'ERROR';
      console.error('❌ Failed to initialize Security Service:', error);
      
      await auditLogger.logErrorOccurred(
        'INITIALIZATION_ERROR',
        error instanceof Error ? error.message : String(error),
        {
          component: 'SecurityService',
          operation: 'initialize'
        }
      );
      
      throw error;
    }
  }

  public getRateLimitMiddleware() {
    if (!this.rateLimiter) {
      throw new Error('Rate limiter not initialized');
    }
    return this.rateLimiter.middleware();
  }

  public getDDoSProtectionMiddleware() {
    if (!this.ddosProtection) {
      throw new Error('DDoS protection not initialized');
    }
    return this.ddosProtection.middleware();
  }

  public async analyzeRequest(
    data: string,
    context: {
      ip?: string;
      userId?: string;
      endpoint?: string;
      userAgent?: string;
    }
  ): Promise<{
    threatDetected: boolean;
    riskScore: number;
    actions: string[];
    blocked: boolean;
  }> {
    if (!this.securityMonitor) {
      throw new Error('Security monitor not initialized');
    }

    const threatAnalysis = await this.securityMonitor.analyzeThreat(data, context);
    
    return {
      threatDetected: threatAnalysis.threatDetected,
      riskScore: threatAnalysis.overallRiskScore,
      actions: threatAnalysis.recommendedActions,
      blocked: threatAnalysis.overallRiskScore >= 80
    };
  }

  public async analyzeLoginAttempt(
    userId: string,
    ip: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<{
    riskScore: number;
    blocked: boolean;
    recommendations: string[];
  }> {
    if (!this.intrusionDetection) {
      return { riskScore: 0, blocked: false, recommendations: [] };
    }

    const analysis = await this.intrusionDetection.analyzeLoginAttempt(
      userId,
      ip,
      userAgent,
      success,
      failureReason
    );

    return {
      riskScore: analysis.riskScore,
      blocked: analysis.blocked,
      recommendations: analysis.recommendations
    };
  }

  public async analyzeUserActivity(
    userId: string,
    action: string,
    endpoint: string,
    ip: string,
    userAgent: string,
    duration: number,
    dataAccessed?: string[]
  ): Promise<{
    riskScore: number;
    blocked: boolean;
    recommendations: string[];
  }> {
    if (!this.intrusionDetection) {
      return { riskScore: 0, blocked: false, recommendations: [] };
    }

    const analysis = await this.intrusionDetection.analyzeUserActivity(
      userId,
      action,
      endpoint,
      ip,
      userAgent,
      duration,
      dataAccessed
    );

    return {
      riskScore: analysis.riskScore,
      blocked: analysis.blocked,
      recommendations: analysis.recommendations
    };
  }

  public isBlocked(type: 'IP' | 'USER', value: string): boolean {
    if (!this.securityMonitor) {
      return false;
    }
    return this.securityMonitor.isBlocked(type, value);
  }

  public async blockEntity(
    type: 'IP' | 'USER',
    value: string,
    reason: string,
    duration?: number
  ): Promise<string> {
    if (!this.securityMonitor) {
      throw new Error('Security monitor not initialized');
    }
    return await this.securityMonitor.blockEntity(type, value, reason, duration);
  }

  public async unblockEntity(blockId: string, reason: string): Promise<boolean> {
    if (!this.securityMonitor) {
      throw new Error('Security monitor not initialized');
    }
    return await this.securityMonitor.unblockEntity(blockId, reason);
  }

  public getSecurityStatus(): SecurityServiceStatus {
    this.updateMetrics();
    return { ...this.status };
  }

  public getActiveThreats(): any[] {
    if (!this.securityMonitor) {
      return [];
    }
    return this.securityMonitor.getActiveThreats();
  }

  public getSecurityAlerts(): SecurityAlert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    await auditLogger.logAlertAcknowledged(alertId, acknowledgedBy, {
      component: 'SecurityService',
      operation: 'acknowledge_alert'
    });

    this.emit('alertAcknowledged', alert);
    return true;
  }

  public async generateSecurityReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: { start: Date; end: Date };
    summary: {
      totalEvents: number;
      threatsByType: Record<string, number>;
      threatsBySeverity: Record<string, number>;
      blockedEntities: number;
      falsePositives: number;
    };
    trends: {
      dailyThreats: Array<{ date: string; count: number }>;
      topThreats: Array<{ type: string; count: number }>;
      topBlockedIPs: Array<{ ip: string; count: number }>;
    };
    recommendations: string[];
  }> {
    if (!this.securityMonitor) {
      throw new Error('Security monitor not initialized');
    }

    // This would integrate with actual data storage
    // For now, return a basic report structure
    const report = {
      period: { start: startDate, end: endDate },
      summary: {
        totalEvents: this.status.metrics.totalSecurityEvents,
        threatsByType: {},
        threatsBySeverity: {},
        blockedEntities: this.status.metrics.blockedIPs + this.status.metrics.blockedUsers,
        falsePositives: 0
      },
      trends: {
        dailyThreats: [],
        topThreats: [],
        topBlockedIPs: []
      },
      recommendations: [
        'Review and update security policies regularly',
        'Monitor for new threat patterns',
        'Ensure all security components are properly configured'
      ]
    };

    await auditLogger.logDataExport(
      'security_report',
      1,
      'JSON',
      {
        component: 'SecurityService',
        operation: 'generate_security_report',
        metadata: {
          period: report.period,
          totalEvents: report.summary.totalEvents
        }
      }
    );

    return report;
  }

  private setupEventListeners(): void {
    if (this.securityMonitor) {
      this.securityMonitor.on('securityEvent', (event) => {
        this.handleSecurityEvent(event);
      });

      this.securityMonitor.on('entityBlocked', (entity) => {
        this.handleEntityBlocked(entity);
      });

      this.securityMonitor.on('alert', (alert) => {
        this.handleAlert(alert);
      });
    }

    if (this.intrusionDetection) {
      this.intrusionDetection.on('intrusionDetected', (event) => {
        this.handleIntrusionDetected(event);
      });
    }
  }

  private async handleSecurityEvent(event: any): Promise<void> {
    this.status.metrics.totalSecurityEvents++;
    
    if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      this.status.metrics.activeThreats++;
    }

    await this.createAlert(
      'SECURITY_EVENT',
      event.severity,
      'SecurityMonitor',
      `Security event detected: ${event.type}`,
      event
    );

    this.emit('securityEvent', event);
  }

  private async handleEntityBlocked(entity: any): Promise<void> {
    if (entity.type === 'IP') {
      this.status.metrics.blockedIPs++;
    } else {
      this.status.metrics.blockedUsers++;
    }

    await this.createAlert(
      'SECURITY_EVENT',
      'MEDIUM',
      'SecurityMonitor',
      `Entity blocked: ${entity.type} ${entity.value}`,
      entity
    );

    this.emit('entityBlocked', entity);
  }

  private async handleAlert(alert: any): Promise<void> {
    await this.createAlert(
      'THRESHOLD_EXCEEDED',
      alert.severity,
      'SecurityMonitor',
      `Alert threshold exceeded: ${alert.threshold.metric}`,
      alert
    );
  }

  private async handleIntrusionDetected(event: any): Promise<void> {
    this.status.metrics.intrusionAttempts++;

    await this.createAlert(
      'SECURITY_EVENT',
      event.severity,
      'IntrusionDetection',
      `Intrusion detected: ${event.type}`,
      event
    );

    this.emit('intrusionDetected', event);
  }

  private async createAlert(
    type: SecurityAlert['type'],
    severity: SecurityAlert['severity'],
    component: string,
    message: string,
    details: any
  ): Promise<string> {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: SecurityAlert = {
      id: alertId,
      timestamp: new Date(),
      type,
      severity,
      component,
      message,
      details,
      acknowledged: false
    };

    this.alerts.set(alertId, alert);

    // Log alert
    await auditLogger.logAlertTriggered(alertId, type, severity, {
      component: 'SecurityService',
      operation: 'create_alert',
      metadata: { component, message }
    });

    this.emit('alert', alert);

    return alertId;
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 60 * 1000); // Every minute
  }

  private performHealthCheck(): void {
    let healthyComponents = 0;
    let totalComponents = 0;

    // Check Security Monitor
    totalComponents++;
    if (this.securityMonitor && this.status.components.securityMonitor === 'RUNNING') {
      healthyComponents++;
    } else {
      this.status.components.securityMonitor = 'ERROR';
    }

    // Check Rate Limiter
    if (this.rateLimiter) {
      totalComponents++;
      if (this.status.components.rateLimiter === 'RUNNING') {
        healthyComponents++;
      }
    }

    // Check DDoS Protection
    if (this.ddosProtection) {
      totalComponents++;
      if (this.status.components.ddosProtection === 'RUNNING') {
        healthyComponents++;
      }
    }

    // Check Intrusion Detection
    if (this.intrusionDetection) {
      totalComponents++;
      if (this.status.components.intrusionDetection === 'RUNNING') {
        healthyComponents++;
      }
    }

    // Update overall status
    if (healthyComponents === totalComponents) {
      this.status.status = 'RUNNING';
    } else if (healthyComponents > 0) {
      this.status.status = 'DEGRADED';
    } else {
      this.status.status = 'ERROR';
    }

    this.status.lastHealthCheck = new Date();
    this.status.uptime = Date.now() - this.startTime.getTime();

    this.emit('healthCheck', this.status);
  }

  private updateMetrics(): void {
    if (this.securityMonitor) {
      const metrics = this.securityMonitor.getSecurityMetrics();
      this.status.metrics.totalSecurityEvents = metrics.totalEvents;
      this.status.metrics.activeThreats = metrics.activeThreats;
      this.status.metrics.blockedIPs = metrics.blockedIPs;
      this.status.metrics.blockedUsers = metrics.blockedUsers;
    }
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Security Service...');
    
    this.status.status = 'STOPPED';

    // Clear health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // Shutdown components
    if (this.securityMonitor) {
      await this.securityMonitor.shutdown();
      this.status.components.securityMonitor = 'STOPPED';
    }

    if (this.ddosProtection) {
      this.ddosProtection.shutdown();
      this.status.components.ddosProtection = 'STOPPED';
    }

    if (this.intrusionDetection) {
      await this.intrusionDetection.shutdown();
      this.status.components.intrusionDetection = 'STOPPED';
    }

    this.status.components.rateLimiter = 'STOPPED';

    // Log shutdown
    await auditLogger.logSystemStop({
      component: 'SecurityService',
      metadata: {
        uptime: this.status.uptime,
        reason: 'shutdown'
      }
    });

    console.log('✅ Security Service shutdown complete');
    this.emit('shutdown');
  }
}

// Export singleton instance
export const securityService = new SecurityService();