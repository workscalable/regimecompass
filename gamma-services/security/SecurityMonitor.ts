import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { auditLogger, AuditEventType } from '../logging/AuditLogger';
import { logger } from '../logging/Logger';

export interface SecurityConfig {
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
    keyGenerator?: (req: any) => string;
  };
  ddosProtection: {
    enabled: boolean;
    threshold: number;
    windowMs: number;
    blockDuration: number;
    whitelist: string[];
  };
  intrusionDetection: {
    enabled: boolean;
    failedLoginThreshold: number;
    suspiciousActivityThreshold: number;
    timeWindow: number;
    autoBlock: boolean;
    blockDuration: number;
  };
  threatMonitoring: {
    enabled: boolean;
    patterns: ThreatPattern[];
    realTimeAnalysis: boolean;
    alertThresholds: AlertThreshold[];
  };
  incidentResponse: {
    enabled: boolean;
    autoResponse: boolean;
    escalationRules: EscalationRule[];
    notificationChannels: NotificationChannel[];
  };
}

export interface ThreatPattern {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'SYSTEM' | 'NETWORK';
  enabled: boolean;
  actions: SecurityAction[];
}

export interface AlertThreshold {
  metric: string;
  threshold: number;
  timeWindow: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  action: SecurityAction;
}

export interface EscalationRule {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeToEscalate: number;
  escalateTo: string[];
  autoEscalate: boolean;
}

export interface NotificationChannel {
  type: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'SLACK';
  config: any;
  enabled: boolean;
  severityFilter: string[];
}

export type SecurityAction = 
  | 'LOG'
  | 'ALERT'
  | 'BLOCK_IP'
  | 'BLOCK_USER'
  | 'RATE_LIMIT'
  | 'REQUIRE_2FA'
  | 'ESCALATE'
  | 'QUARANTINE';

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source: {
    ip?: string;
    userId?: string;
    userAgent?: string;
    endpoint?: string;
  };
  details: {
    description: string;
    pattern?: string;
    evidence: any;
    riskScore: number;
  };
  actions: SecurityAction[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: Date;
}

export type SecurityEventType = 
  | 'FAILED_LOGIN_ATTEMPT'
  | 'BRUTE_FORCE_ATTACK'
  | 'SUSPICIOUS_API_USAGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DDOS_ATTEMPT'
  | 'UNAUTHORIZED_ACCESS'
  | 'DATA_EXFILTRATION'
  | 'MALICIOUS_PAYLOAD'
  | 'PRIVILEGE_ESCALATION'
  | 'ACCOUNT_TAKEOVER'
  | 'ANOMALOUS_BEHAVIOR'
  | 'SECURITY_POLICY_VIOLATION';

export interface SecurityMetrics {
  totalEvents: number;
  eventsBySeverity: Record<string, number>;
  eventsByType: Record<string, number>;
  blockedIPs: number;
  blockedUsers: number;
  activeThreats: number;
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  falsePositiveRate: number;
  lastUpdate: Date;
}

export interface RateLimitEntry {
  key: string;
  count: number;
  resetTime: Date;
  blocked: boolean;
}

export interface BlockedEntity {
  id: string;
  type: 'IP' | 'USER';
  value: string;
  reason: string;
  blockedAt: Date;
  expiresAt?: Date;
  permanent: boolean;
}

export class SecurityMonitor extends EventEmitter {
  private config: SecurityConfig;
  private securityEvents: Map<string, SecurityEvent> = new Map();
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private blockedEntities: Map<string, BlockedEntity> = new Map();
  private threatPatterns: Map<string, ThreatPattern> = new Map();
  private securityMetrics: SecurityMetrics;
  private cleanupTimer?: NodeJS.Timeout;
  private metricsTimer?: NodeJS.Timeout;

  constructor(config: SecurityConfig) {
    super();
    this.config = config;
    this.securityMetrics = {
      totalEvents: 0,
      eventsBySeverity: {},
      eventsByType: {},
      blockedIPs: 0,
      blockedUsers: 0,
      activeThreats: 0,
      responseTime: { average: 0, p95: 0, p99: 0 },
      falsePositiveRate: 0,
      lastUpdate: new Date()
    };

    this.initializeThreatPatterns();
    this.startPeriodicCleanup();
    this.startMetricsCollection();
  }

  public async initialize(): Promise<void> {
    console.log('🛡️ Initializing Security Monitor...');
    
    try {
      // Load threat patterns
      this.loadThreatPatterns();
      
      // Initialize rate limiting
      if (this.config.rateLimiting.enabled) {
        this.initializeRateLimiting();
      }
      
      // Initialize DDoS protection
      if (this.config.ddosProtection.enabled) {
        this.initializeDDoSProtection();
      }
      
      // Initialize intrusion detection
      if (this.config.intrusionDetection.enabled) {
        this.initializeIntrusionDetection();
      }
      
      // Start threat monitoring
      if (this.config.threatMonitoring.enabled) {
        this.startThreatMonitoring();
      }
      
      console.log('✅ Security Monitor initialized');
      this.emit('initialized');
      
      // Log system start
      await auditLogger.logSystemStart({
        component: 'SecurityMonitor',
        metadata: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Security Monitor:', error);
      throw error;
    }
  }

  public async checkRateLimit(
    key: string,
    customLimit?: number,
    customWindow?: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    if (!this.config.rateLimiting.enabled) {
      return { allowed: true, remaining: Infinity, resetTime: new Date() };
    }

    const limit = customLimit || this.config.rateLimiting.maxRequests;
    const windowMs = customWindow || this.config.rateLimiting.windowMs;
    const now = new Date();
    
    let entry = this.rateLimitStore.get(key);
    
    if (!entry || now >= entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        key,
        count: 1,
        resetTime: new Date(now.getTime() + windowMs),
        blocked: false
      };
      this.rateLimitStore.set(key, entry);
      
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: entry.resetTime
      };
    }
    
    entry.count++;
    
    if (entry.count > limit) {
      entry.blocked = true;
      
      // Create security event for rate limit exceeded
      await this.createSecurityEvent(
        'RATE_LIMIT_EXCEEDED',
        'MEDIUM',
        { ip: key },
        {
          description: `Rate limit exceeded for key: ${key}`,
          evidence: { count: entry.count, limit, window: windowMs },
          riskScore: 60
        },
        ['LOG', 'RATE_LIMIT']
      );
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }
    
    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime
    };
  }

  public async detectDDoSAttack(
    ip: string,
    requestCount: number,
    timeWindow: number
  ): Promise<boolean> {
    if (!this.config.ddosProtection.enabled) {
      return false;
    }

    // Check if IP is whitelisted
    if (this.config.ddosProtection.whitelist.includes(ip)) {
      return false;
    }

    const threshold = this.config.ddosProtection.threshold;
    const windowMs = this.config.ddosProtection.windowMs;
    
    if (requestCount > threshold && timeWindow <= windowMs) {
      // DDoS attack detected
      await this.createSecurityEvent(
        'DDOS_ATTEMPT',
        'CRITICAL',
        { ip },
        {
          description: `DDoS attack detected from IP: ${ip}`,
          evidence: { requestCount, timeWindow, threshold },
          riskScore: 95
        },
        ['LOG', 'ALERT', 'BLOCK_IP', 'ESCALATE']
      );
      
      // Block IP
      await this.blockEntity('IP', ip, 'DDoS attack detected', this.config.ddosProtection.blockDuration);
      
      return true;
    }
    
    return false;
  }

  public async detectIntrusionAttempt(
    userId: string,
    ip: string,
    eventType: 'FAILED_LOGIN' | 'SUSPICIOUS_ACTIVITY',
    details: any
  ): Promise<boolean> {
    if (!this.config.intrusionDetection.enabled) {
      return false;
    }

    const key = `${eventType}_${userId || ip}`;
    const now = new Date();
    const timeWindow = this.config.intrusionDetection.timeWindow;
    const threshold = eventType === 'FAILED_LOGIN' 
      ? this.config.intrusionDetection.failedLoginThreshold
      : this.config.intrusionDetection.suspiciousActivityThreshold;

    // Count recent events
    const recentEvents = Array.from(this.securityEvents.values())
      .filter(event => 
        event.timestamp >= new Date(now.getTime() - timeWindow) &&
        (event.source.userId === userId || event.source.ip === ip) &&
        event.type === (eventType === 'FAILED_LOGIN' ? 'FAILED_LOGIN_ATTEMPT' : 'SUSPICIOUS_API_USAGE')
      );

    if (recentEvents.length >= threshold) {
      const securityEventType = eventType === 'FAILED_LOGIN' ? 'BRUTE_FORCE_ATTACK' : 'ANOMALOUS_BEHAVIOR';
      
      await this.createSecurityEvent(
        securityEventType,
        'HIGH',
        { userId, ip },
        {
          description: `Intrusion attempt detected: ${eventType}`,
          evidence: { recentEvents: recentEvents.length, threshold, timeWindow, details },
          riskScore: 85
        },
        ['LOG', 'ALERT', 'BLOCK_USER', 'REQUIRE_2FA']
      );
      
      // Auto-block if enabled
      if (this.config.intrusionDetection.autoBlock) {
        if (userId) {
          await this.blockEntity('USER', userId, 'Intrusion attempt detected', this.config.intrusionDetection.blockDuration);
        }
        if (ip) {
          await this.blockEntity('IP', ip, 'Intrusion attempt detected', this.config.intrusionDetection.blockDuration);
        }
      }
      
      return true;
    }
    
    return false;
  }

  public async analyzeThreat(
    data: string,
    context: {
      ip?: string;
      userId?: string;
      endpoint?: string;
      userAgent?: string;
    }
  ): Promise<ThreatAnalysisResult> {
    const threats: DetectedThreat[] = [];
    let maxRiskScore = 0;
    
    for (const pattern of this.threatPatterns.values()) {
      if (!pattern.enabled) continue;
      
      let match = false;
      
      if (pattern.pattern instanceof RegExp) {
        match = pattern.pattern.test(data);
      } else {
        match = data.includes(pattern.pattern);
      }
      
      if (match) {
        const riskScore = this.calculateRiskScore(pattern.severity);
        maxRiskScore = Math.max(maxRiskScore, riskScore);
        
        threats.push({
          patternId: pattern.id,
          name: pattern.name,
          severity: pattern.severity,
          category: pattern.category,
          riskScore,
          evidence: { match: true, data: data.substring(0, 200) }
        });
        
        // Create security event for detected threat
        await this.createSecurityEvent(
          this.mapCategoryToEventType(pattern.category),
          pattern.severity,
          context,
          {
            description: `Threat detected: ${pattern.name}`,
            pattern: pattern.id,
            evidence: { data: data.substring(0, 200) },
            riskScore
          },
          pattern.actions
        );
      }
    }
    
    return {
      threatDetected: threats.length > 0,
      threats,
      overallRiskScore: maxRiskScore,
      recommendedActions: this.getRecommendedActions(maxRiskScore)
    };
  }

  public async blockEntity(
    type: 'IP' | 'USER',
    value: string,
    reason: string,
    duration?: number
  ): Promise<string> {
    const blockId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = duration ? new Date(now.getTime() + duration) : undefined;
    
    const blockedEntity: BlockedEntity = {
      id: blockId,
      type,
      value,
      reason,
      blockedAt: now,
      expiresAt,
      permanent: !duration
    };
    
    this.blockedEntities.set(blockId, blockedEntity);
    
    // Update metrics
    if (type === 'IP') {
      this.securityMetrics.blockedIPs++;
    } else {
      this.securityMetrics.blockedUsers++;
    }
    
    // Log the block action
    await auditLogger.logEvent(
      'ALERT_TRIGGERED',
      'security',
      'block_entity',
      {
        blockId,
        type,
        value,
        reason,
        duration,
        permanent: !duration
      },
      'SUCCESS',
      {
        component: 'SecurityMonitor',
        operation: 'block_entity'
      }
    );
    
    this.emit('entityBlocked', blockedEntity);
    
    return blockId;
  }

  public async unblockEntity(blockId: string, reason: string): Promise<boolean> {
    const blockedEntity = this.blockedEntities.get(blockId);
    if (!blockedEntity) {
      return false;
    }
    
    this.blockedEntities.delete(blockId);
    
    // Update metrics
    if (blockedEntity.type === 'IP') {
      this.securityMetrics.blockedIPs = Math.max(0, this.securityMetrics.blockedIPs - 1);
    } else {
      this.securityMetrics.blockedUsers = Math.max(0, this.securityMetrics.blockedUsers - 1);
    }
    
    // Log the unblock action
    await auditLogger.logEvent(
      'ALERT_RESOLVED',
      'security',
      'unblock_entity',
      {
        blockId,
        type: blockedEntity.type,
        value: blockedEntity.value,
        reason,
        originalReason: blockedEntity.reason
      },
      'SUCCESS',
      {
        component: 'SecurityMonitor',
        operation: 'unblock_entity'
      }
    );
    
    this.emit('entityUnblocked', { ...blockedEntity, unblockReason: reason });
    
    return true;
  }

  public isBlocked(type: 'IP' | 'USER', value: string): boolean {
    const now = new Date();
    
    for (const entity of this.blockedEntities.values()) {
      if (entity.type === type && entity.value === value) {
        // Check if block has expired
        if (entity.expiresAt && now >= entity.expiresAt) {
          this.blockedEntities.delete(entity.id);
          continue;
        }
        return true;
      }
    }
    
    return false;
  }

  public async resolveSecurityEvent(
    eventId: string,
    resolution: string,
    resolvedBy: string
  ): Promise<boolean> {
    const event = this.securityEvents.get(eventId);
    if (!event) {
      return false;
    }
    
    event.status = 'RESOLVED';
    event.resolution = resolution;
    event.resolvedAt = new Date();
    event.assignedTo = resolvedBy;
    
    await auditLogger.logAlertResolved(eventId, resolvedBy, {
      component: 'SecurityMonitor',
      operation: 'resolve_security_event'
    });
    
    this.emit('securityEventResolved', event);
    
    return true;
  }

  public getSecurityMetrics(): SecurityMetrics {
    return { ...this.securityMetrics };
  }

  public getActiveThreats(): SecurityEvent[] {
    return Array.from(this.securityEvents.values())
      .filter(event => event.status === 'OPEN' || event.status === 'INVESTIGATING')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getBlockedEntities(): BlockedEntity[] {
    const now = new Date();
    const activeBlocks: BlockedEntity[] = [];
    
    for (const [id, entity] of this.blockedEntities.entries()) {
      // Remove expired blocks
      if (entity.expiresAt && now >= entity.expiresAt) {
        this.blockedEntities.delete(id);
        continue;
      }
      activeBlocks.push(entity);
    }
    
    return activeBlocks;
  }

  private async createSecurityEvent(
    type: SecurityEventType,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    source: { ip?: string; userId?: string; userAgent?: string; endpoint?: string },
    details: { description: string; pattern?: string; evidence: any; riskScore: number },
    actions: SecurityAction[]
  ): Promise<string> {
    const eventId = crypto.randomUUID();
    
    const securityEvent: SecurityEvent = {
      id: eventId,
      timestamp: new Date(),
      type,
      severity,
      source,
      details,
      actions,
      status: 'OPEN'
    };
    
    this.securityEvents.set(eventId, securityEvent);
    
    // Update metrics
    this.securityMetrics.totalEvents++;
    this.securityMetrics.eventsBySeverity[severity] = (this.securityMetrics.eventsBySeverity[severity] || 0) + 1;
    this.securityMetrics.eventsByType[type] = (this.securityMetrics.eventsByType[type] || 0) + 1;
    this.securityMetrics.activeThreats++;
    this.securityMetrics.lastUpdate = new Date();
    
    // Execute actions
    await this.executeSecurityActions(actions, securityEvent);
    
    // Log security event
    await auditLogger.logAlertTriggered(eventId, type, severity, {
      component: 'SecurityMonitor',
      operation: 'create_security_event',
      metadata: { source, riskScore: details.riskScore }
    });
    
    this.emit('securityEvent', securityEvent);
    
    return eventId;
  }

  private async executeSecurityActions(actions: SecurityAction[], event: SecurityEvent): Promise<void> {
    for (const action of actions) {
      try {
        switch (action) {
          case 'LOG':
            await logger.warn('SECURITY', `Security event: ${event.type}`, {
              eventId: event.id,
              severity: event.severity,
              source: event.source,
              riskScore: event.details.riskScore
            });
            break;
            
          case 'ALERT':
            await this.sendAlert(event);
            break;
            
          case 'BLOCK_IP':
            if (event.source.ip) {
              await this.blockEntity('IP', event.source.ip, `Security event: ${event.type}`);
            }
            break;
            
          case 'BLOCK_USER':
            if (event.source.userId) {
              await this.blockEntity('USER', event.source.userId, `Security event: ${event.type}`);
            }
            break;
            
          case 'ESCALATE':
            await this.escalateEvent(event);
            break;
            
          // Add other action implementations as needed
        }
      } catch (error) {
        await logger.error('SECURITY', `Failed to execute security action: ${action}`, {
          eventId: event.id,
          action,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private async sendAlert(event: SecurityEvent): Promise<void> {
    // Send alert through configured notification channels
    for (const channel of this.config.incidentResponse.notificationChannels) {
      if (!channel.enabled || !channel.severityFilter.includes(event.severity)) {
        continue;
      }
      
      try {
        await this.sendNotification(channel, event);
      } catch (error) {
        await logger.error('SECURITY', `Failed to send alert through ${channel.type}`, {
          eventId: event.id,
          channel: channel.type,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  private async sendNotification(channel: NotificationChannel, event: SecurityEvent): Promise<void> {
    // Implementation would depend on the notification channel type
    // This is a placeholder for the actual notification logic
    console.log(`📢 Security Alert [${channel.type}]: ${event.type} - ${event.details.description}`);
  }

  private async escalateEvent(event: SecurityEvent): Promise<void> {
    const rule = this.config.incidentResponse.escalationRules.find(r => r.severity === event.severity);
    if (!rule) return;
    
    // Implementation for escalation logic
    console.log(`🚨 Escalating security event ${event.id} to: ${rule.escalateTo.join(', ')}`);
  }

  private calculateRiskScore(severity: string): number {
    switch (severity) {
      case 'LOW': return 25;
      case 'MEDIUM': return 50;
      case 'HIGH': return 75;
      case 'CRITICAL': return 100;
      default: return 0;
    }
  }

  private mapCategoryToEventType(category: string): SecurityEventType {
    switch (category) {
      case 'AUTHENTICATION': return 'FAILED_LOGIN_ATTEMPT';
      case 'AUTHORIZATION': return 'UNAUTHORIZED_ACCESS';
      case 'DATA_ACCESS': return 'DATA_EXFILTRATION';
      case 'SYSTEM': return 'SECURITY_POLICY_VIOLATION';
      case 'NETWORK': return 'SUSPICIOUS_API_USAGE';
      default: return 'ANOMALOUS_BEHAVIOR';
    }
  }

  private getRecommendedActions(riskScore: number): SecurityAction[] {
    if (riskScore >= 90) return ['LOG', 'ALERT', 'BLOCK_IP', 'ESCALATE'];
    if (riskScore >= 70) return ['LOG', 'ALERT', 'RATE_LIMIT'];
    if (riskScore >= 50) return ['LOG', 'ALERT'];
    return ['LOG'];
  }

  private initializeThreatPatterns(): void {
    // Initialize with default threat patterns
    const defaultPatterns: ThreatPattern[] = [
      {
        id: 'sql-injection',
        name: 'SQL Injection',
        description: 'Detects potential SQL injection attempts',
        pattern: /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(from|where|order|group)\b)|(\b(or|and)\b.*=.*)|('.*'.*=.*)/i,
        severity: 'HIGH',
        category: 'DATA_ACCESS',
        enabled: true,
        actions: ['LOG', 'ALERT', 'BLOCK_IP']
      },
      {
        id: 'xss-attempt',
        name: 'Cross-Site Scripting',
        description: 'Detects potential XSS attempts',
        pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        severity: 'MEDIUM',
        category: 'SYSTEM',
        enabled: true,
        actions: ['LOG', 'ALERT']
      },
      {
        id: 'path-traversal',
        name: 'Path Traversal',
        description: 'Detects directory traversal attempts',
        pattern: /(\.\.[\/\\]){2,}/,
        severity: 'HIGH',
        category: 'SYSTEM',
        enabled: true,
        actions: ['LOG', 'ALERT', 'BLOCK_IP']
      }
    ];
    
    defaultPatterns.forEach(pattern => {
      this.threatPatterns.set(pattern.id, pattern);
    });
  }

  private loadThreatPatterns(): void {
    // Load additional threat patterns from configuration
    if (this.config.threatMonitoring.patterns) {
      this.config.threatMonitoring.patterns.forEach(pattern => {
        this.threatPatterns.set(pattern.id, pattern);
      });
    }
  }

  private initializeRateLimiting(): void {
    console.log('🚦 Rate limiting initialized');
  }

  private initializeDDoSProtection(): void {
    console.log('🛡️ DDoS protection initialized');
  }

  private initializeIntrusionDetection(): void {
    console.log('🔍 Intrusion detection initialized');
  }

  private startThreatMonitoring(): void {
    console.log('👁️ Threat monitoring started');
  }

  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 60 * 1000); // Run every hour
  }

  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.updateMetrics();
    }, 60 * 1000); // Update every minute
  }

  private cleanupExpiredEntries(): void {
    const now = new Date();
    
    // Clean up expired rate limit entries
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now >= entry.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }
    
    // Clean up expired blocked entities
    for (const [id, entity] of this.blockedEntities.entries()) {
      if (entity.expiresAt && now >= entity.expiresAt) {
        this.blockedEntities.delete(id);
      }
    }
    
    // Clean up old security events (keep last 30 days)
    const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    for (const [id, event] of this.securityEvents.entries()) {
      if (event.timestamp < cutoff && event.status === 'RESOLVED') {
        this.securityEvents.delete(id);
      }
    }
  }

  private updateMetrics(): void {
    // Update active threats count
    this.securityMetrics.activeThreats = Array.from(this.securityEvents.values())
      .filter(event => event.status === 'OPEN' || event.status === 'INVESTIGATING')
      .length;
    
    this.securityMetrics.lastUpdate = new Date();
  }

  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Security Monitor...');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    await auditLogger.logSystemStop({
      component: 'SecurityMonitor',
      metadata: {
        uptime: Date.now(),
        reason: 'shutdown'
      }
    });
    
    console.log('✅ Security Monitor shutdown complete');
    this.emit('shutdown');
  }
}

export interface ThreatAnalysisResult {
  threatDetected: boolean;
  threats: DetectedThreat[];
  overallRiskScore: number;
  recommendedActions: SecurityAction[];
}

export interface DetectedThreat {
  patternId: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'SYSTEM' | 'NETWORK';
  riskScore: number;
  evidence: any;
}