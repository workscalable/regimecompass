import { Request, Response, NextFunction } from 'express';
import { SecurityMonitor } from './SecurityMonitor';
import { auditLogger } from '../logging/AuditLogger';

export interface DDoSConfig {
  enabled: boolean;
  threshold: number;
  windowMs: number;
  blockDuration: number;
  whitelist: string[];
  checkInterval: number;
  maxConcurrentRequests: number;
  suspiciousThreshold: number;
  autoBlock: boolean;
}

export interface ConnectionInfo {
  ip: string;
  requestCount: number;
  firstRequest: Date;
  lastRequest: Date;
  concurrentRequests: number;
  blocked: boolean;
  blockExpires?: Date;
  suspicious: boolean;
}

export class DDoSProtection {
  private config: DDoSConfig;
  private securityMonitor?: SecurityMonitor;
  private connections: Map<string, ConnectionInfo> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private monitoringTimer?: NodeJS.Timeout;

  constructor(config: DDoSConfig, securityMonitor?: SecurityMonitor) {
    this.config = config;
    this.securityMonitor = securityMonitor;
    
    if (config.enabled) {
      this.startMonitoring();
      this.startCleanup();
    }
  }

  /**
   * Express middleware for DDoS protection
   */
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      try {
        const ip = this.getClientIP(req);
        
        // Check if IP is whitelisted
        if (this.config.whitelist.includes(ip)) {
          return next();
        }

        // Check if IP is currently blocked
        if (await this.isBlocked(ip)) {
          return this.handleBlockedRequest(req, res, ip);
        }

        // Track connection
        await this.trackConnection(ip, req);

        // Check for DDoS patterns
        const isDDoS = await this.checkForDDoS(ip, req);
        if (isDDoS) {
          return this.handleDDoSDetection(req, res, ip);
        }

        // Increment concurrent requests
        this.incrementConcurrentRequests(ip);

        // Hook into response end to decrement concurrent requests
        res.on('finish', () => {
          this.decrementConcurrentRequests(ip);
        });

        res.on('close', () => {
          this.decrementConcurrentRequests(ip);
        });

        next();
      } catch (error) {
        console.error('DDoS protection error:', error);
        next(); // Continue on error to avoid breaking the application
      }
    };
  }

  /**
   * Track connection from IP
   */
  private async trackConnection(ip: string, req: Request): Promise<void> {
    const now = new Date();
    let connection = this.connections.get(ip);

    if (!connection) {
      connection = {
        ip,
        requestCount: 0,
        firstRequest: now,
        lastRequest: now,
        concurrentRequests: 0,
        blocked: false,
        suspicious: false
      };
      this.connections.set(ip, connection);
    }

    connection.requestCount++;
    connection.lastRequest = now;

    // Check if connection is becoming suspicious
    const timeWindow = now.getTime() - connection.firstRequest.getTime();
    if (timeWindow <= this.config.windowMs && 
        connection.requestCount >= this.config.suspiciousThreshold) {
      
      if (!connection.suspicious) {
        connection.suspicious = true;
        
        await auditLogger.logEvent(
          'ALERT_TRIGGERED',
          'security',
          'suspicious_activity',
          {
            ip,
            requestCount: connection.requestCount,
            timeWindow,
            threshold: this.config.suspiciousThreshold
          },
          'SUCCESS',
          {
            component: 'DDoSProtection',
            operation: 'track_suspicious_activity',
            metadata: {
              ipAddress: ip,
              userAgent: req.get('User-Agent')
            }
          }
        );
      }
    }
  }

  /**
   * Check for DDoS attack patterns
   */
  private async checkForDDoS(ip: string, req: Request): Promise<boolean> {
    const connection = this.connections.get(ip);
    if (!connection) return false;

    const now = new Date();
    const timeWindow = now.getTime() - connection.firstRequest.getTime();

    // Check request rate threshold
    if (timeWindow <= this.config.windowMs && 
        connection.requestCount >= this.config.threshold) {
      
      // DDoS attack detected
      await this.logDDoSDetection(ip, connection, req);
      
      if (this.securityMonitor) {
        await this.securityMonitor.detectDDoSAttack(
          ip,
          connection.requestCount,
          timeWindow
        );
      }

      return true;
    }

    // Check concurrent requests threshold
    if (connection.concurrentRequests >= this.config.maxConcurrentRequests) {
      await this.logConcurrentRequestsExceeded(ip, connection, req);
      return true;
    }

    return false;
  }

  /**
   * Check if IP is currently blocked
   */
  private async isBlocked(ip: string): Promise<boolean> {
    const connection = this.connections.get(ip);
    if (!connection || !connection.blocked) {
      return false;
    }

    // Check if block has expired
    if (connection.blockExpires && new Date() >= connection.blockExpires) {
      connection.blocked = false;
      connection.blockExpires = undefined;
      return false;
    }

    return true;
  }

  /**
   * Block IP address
   */
  private async blockIP(ip: string, reason: string, duration?: number): Promise<void> {
    const connection = this.connections.get(ip) || {
      ip,
      requestCount: 0,
      firstRequest: new Date(),
      lastRequest: new Date(),
      concurrentRequests: 0,
      blocked: false,
      suspicious: false
    };

    connection.blocked = true;
    
    if (duration) {
      connection.blockExpires = new Date(Date.now() + duration);
    }

    this.connections.set(ip, connection);

    // Log block action
    await auditLogger.logEvent(
      'ALERT_TRIGGERED',
      'security',
      'ip_blocked',
      {
        ip,
        reason,
        duration,
        permanent: !duration
      },
      'SUCCESS',
      {
        component: 'DDoSProtection',
        operation: 'block_ip'
      }
    );

    // Notify security monitor if available
    if (this.securityMonitor) {
      await this.securityMonitor.blockEntity('IP', ip, reason, duration);
    }
  }

  /**
   * Handle blocked request
   */
  private handleBlockedRequest(req: Request, res: Response, ip: string): void {
    const connection = this.connections.get(ip);
    const retryAfter = connection?.blockExpires 
      ? Math.ceil((connection.blockExpires.getTime() - Date.now()) / 1000)
      : 3600; // Default 1 hour

    res.set({
      'Retry-After': retryAfter.toString(),
      'X-Blocked-Reason': 'DDoS Protection'
    });

    res.status(429).json({
      error: 'IP address blocked',
      message: 'Your IP address has been temporarily blocked due to suspicious activity.',
      retryAfter
    });

    // Log blocked request attempt
    auditLogger.logEvent(
      'API_ACCESS',
      'security',
      'blocked_request_attempt',
      {
        ip,
        endpoint: req.path,
        method: req.method
      },
      'FAILURE',
      {
        component: 'DDoSProtection',
        metadata: {
          ipAddress: ip,
          userAgent: req.get('User-Agent')
        }
      },
      'Request from blocked IP'
    );
  }

  /**
   * Handle DDoS detection
   */
  private async handleDDoSDetection(req: Request, res: Response, ip: string): Promise<void> {
    if (this.config.autoBlock) {
      await this.blockIP(ip, 'DDoS attack detected', this.config.blockDuration);
    }

    res.status(429).json({
      error: 'Too many requests',
      message: 'DDoS protection activated. Please try again later.',
      retryAfter: Math.ceil(this.config.blockDuration / 1000)
    });
  }

  /**
   * Increment concurrent requests for IP
   */
  private incrementConcurrentRequests(ip: string): void {
    const connection = this.connections.get(ip);
    if (connection) {
      connection.concurrentRequests++;
    }
  }

  /**
   * Decrement concurrent requests for IP
   */
  private decrementConcurrentRequests(ip: string): void {
    const connection = this.connections.get(ip);
    if (connection && connection.concurrentRequests > 0) {
      connection.concurrentRequests--;
    }
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.ip ||
      'unknown'
    ).split(',')[0].trim();
  }

  /**
   * Log DDoS detection
   */
  private async logDDoSDetection(
    ip: string,
    connection: ConnectionInfo,
    req: Request
  ): Promise<void> {
    await auditLogger.logEvent(
      'ALERT_TRIGGERED',
      'security',
      'ddos_detected',
      {
        ip,
        requestCount: connection.requestCount,
        timeWindow: new Date().getTime() - connection.firstRequest.getTime(),
        threshold: this.config.threshold,
        endpoint: req.path,
        method: req.method
      },
      'SUCCESS',
      {
        component: 'DDoSProtection',
        operation: 'detect_ddos',
        metadata: {
          ipAddress: ip,
          userAgent: req.get('User-Agent')
        }
      }
    );
  }

  /**
   * Log concurrent requests exceeded
   */
  private async logConcurrentRequestsExceeded(
    ip: string,
    connection: ConnectionInfo,
    req: Request
  ): Promise<void> {
    await auditLogger.logEvent(
      'ALERT_TRIGGERED',
      'security',
      'concurrent_requests_exceeded',
      {
        ip,
        concurrentRequests: connection.concurrentRequests,
        maxConcurrentRequests: this.config.maxConcurrentRequests,
        endpoint: req.path,
        method: req.method
      },
      'SUCCESS',
      {
        component: 'DDoSProtection',
        operation: 'concurrent_requests_exceeded',
        metadata: {
          ipAddress: ip,
          userAgent: req.get('User-Agent')
        }
      }
    );
  }

  /**
   * Start monitoring for DDoS patterns
   */
  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.analyzeConnections();
    }, this.config.checkInterval);
  }

  /**
   * Start cleanup of old connection data
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldConnections();
    }, 60 * 1000); // Run every minute
  }

  /**
   * Analyze connections for patterns
   */
  private analyzeConnections(): void {
    const now = new Date();
    const suspiciousIPs: string[] = [];

    for (const [ip, connection] of this.connections.entries()) {
      // Skip whitelisted IPs
      if (this.config.whitelist.includes(ip)) {
        continue;
      }

      const timeWindow = now.getTime() - connection.firstRequest.getTime();
      
      // Check for suspicious patterns
      if (timeWindow <= this.config.windowMs * 2 && 
          connection.requestCount >= this.config.suspiciousThreshold) {
        suspiciousIPs.push(ip);
      }
    }

    if (suspiciousIPs.length > 0) {
      auditLogger.logEvent(
        'ALERT_TRIGGERED',
        'security',
        'suspicious_ips_detected',
        {
          suspiciousIPs,
          count: suspiciousIPs.length
        },
        'SUCCESS',
        {
          component: 'DDoSProtection',
          operation: 'analyze_connections'
        }
      );
    }
  }

  /**
   * Clean up old connection data
   */
  private cleanupOldConnections(): void {
    const now = new Date();
    const cutoff = new Date(now.getTime() - this.config.windowMs * 2);
    let cleanedCount = 0;

    for (const [ip, connection] of this.connections.entries()) {
      // Don't clean up blocked connections that haven't expired
      if (connection.blocked && connection.blockExpires && now < connection.blockExpires) {
        continue;
      }

      // Clean up old inactive connections
      if (connection.lastRequest < cutoff && connection.concurrentRequests === 0) {
        this.connections.delete(ip);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old DDoS protection entries`);
    }
  }

  /**
   * Get current connection statistics
   */
  public getStatistics(): {
    totalConnections: number;
    blockedConnections: number;
    suspiciousConnections: number;
    topIPs: Array<{ ip: string; requestCount: number; suspicious: boolean }>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      blockedConnections: 0,
      suspiciousConnections: 0,
      topIPs: [] as Array<{ ip: string; requestCount: number; suspicious: boolean }>
    };

    const ipStats: Array<{ ip: string; requestCount: number; suspicious: boolean }> = [];

    for (const connection of this.connections.values()) {
      if (connection.blocked) {
        stats.blockedConnections++;
      }
      if (connection.suspicious) {
        stats.suspiciousConnections++;
      }

      ipStats.push({
        ip: connection.ip,
        requestCount: connection.requestCount,
        suspicious: connection.suspicious
      });
    }

    // Sort by request count and take top 10
    stats.topIPs = ipStats
      .sort((a, b) => b.requestCount - a.requestCount)
      .slice(0, 10);

    return stats;
  }

  /**
   * Manually block an IP address
   */
  public async manuallyBlockIP(
    ip: string,
    reason: string,
    duration?: number
  ): Promise<void> {
    await this.blockIP(ip, reason, duration);
  }

  /**
   * Manually unblock an IP address
   */
  public async manuallyUnblockIP(ip: string, reason: string): Promise<void> {
    const connection = this.connections.get(ip);
    if (connection && connection.blocked) {
      connection.blocked = false;
      connection.blockExpires = undefined;

      await auditLogger.logEvent(
        'ALERT_RESOLVED',
        'security',
        'ip_unblocked',
        {
          ip,
          reason
        },
        'SUCCESS',
        {
          component: 'DDoSProtection',
          operation: 'unblock_ip'
        }
      );
    }
  }

  /**
   * Check if an IP is currently blocked
   */
  public async checkIPStatus(ip: string): Promise<{
    blocked: boolean;
    suspicious: boolean;
    requestCount: number;
    blockExpires?: Date;
  }> {
    const connection = this.connections.get(ip);
    
    if (!connection) {
      return {
        blocked: false,
        suspicious: false,
        requestCount: 0
      };
    }

    return {
      blocked: connection.blocked,
      suspicious: connection.suspicious,
      requestCount: connection.requestCount,
      blockExpires: connection.blockExpires
    };
  }

  /**
   * Shutdown DDoS protection
   */
  public shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    console.log('🛡️ DDoS Protection shutdown complete');
  }
}

/**
 * Create DDoS protection middleware
 */
export function createDDoSProtection(
  config: DDoSConfig,
  securityMonitor?: SecurityMonitor
) {
  const ddosProtection = new DDoSProtection(config, securityMonitor);
  return ddosProtection.middleware();
}

/**
 * Default DDoS protection configurations
 */
export const DDoSPresets = {
  // Strict protection for sensitive endpoints
  strict: {
    enabled: true,
    threshold: 10,
    windowMs: 60 * 1000, // 1 minute
    blockDuration: 15 * 60 * 1000, // 15 minutes
    whitelist: [],
    checkInterval: 10 * 1000, // 10 seconds
    maxConcurrentRequests: 5,
    suspiciousThreshold: 5,
    autoBlock: true
  },

  // Moderate protection for general API
  moderate: {
    enabled: true,
    threshold: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDuration: 5 * 60 * 1000, // 5 minutes
    whitelist: [],
    checkInterval: 30 * 1000, // 30 seconds
    maxConcurrentRequests: 20,
    suspiciousThreshold: 50,
    autoBlock: true
  },

  // Lenient protection for public endpoints
  lenient: {
    enabled: true,
    threshold: 1000,
    windowMs: 60 * 1000, // 1 minute
    blockDuration: 60 * 1000, // 1 minute
    whitelist: [],
    checkInterval: 60 * 1000, // 1 minute
    maxConcurrentRequests: 100,
    suspiciousThreshold: 500,
    autoBlock: false
  }
};