import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface SessionConfig {
  sessionTimeout: number; // in milliseconds
  maxSessions: number;
  secureHeaders: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  httpOnly: boolean;
  secure: boolean;
  cookieName: string;
  cleanupInterval: number;
}

export interface Session {
  id: string;
  userId: string;
  username: string;
  roles: string[];
  permissions: string[];
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint?: string;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface SecurityHeaders {
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Strict-Transport-Security': string;
  'Content-Security-Policy': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
}

export class SessionManager extends EventEmitter {
  private config: SessionConfig;
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: SessionConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    console.log('🔐 Initializing Session Manager...');
    
    // Start cleanup timer
    this.startCleanupTimer();
    
    console.log('✅ Session Manager initialized');
  }

  public async createSession(
    userId: string,
    username: string,
    roles: string[],
    permissions: string[],
    ipAddress: string,
    userAgent: string,
    deviceFingerprint?: string
  ): Promise<Session> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.sessionTimeout);

    // Check if user has too many active sessions
    const userSessionIds = this.userSessions.get(userId) || new Set();
    if (userSessionIds.size >= this.config.maxSessions) {
      // Remove oldest session
      const oldestSessionId = this.findOldestSession(Array.from(userSessionIds));
      if (oldestSessionId) {
        await this.destroySession(oldestSessionId);
      }
    }

    const session: Session = {
      id: sessionId,
      userId,
      username,
      roles,
      permissions,
      createdAt: now,
      lastActivity: now,
      expiresAt,
      ipAddress,
      userAgent,
      deviceFingerprint,
      isActive: true,
      metadata: {}
    };

    this.sessions.set(sessionId, session);
    
    // Track user sessions
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    console.log(`🎫 Created session for user: ${username} (${sessionId})`);
    this.emit('sessionCreated', session);

    return session;
  }

  public async getSession(sessionId: string): Promise<Session | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date() || !session.isActive) {
      await this.destroySession(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + this.config.sessionTimeout);

    return session;
  }

  public async refreshSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return false;
    }

    const now = new Date();
    session.lastActivity = now;
    session.expiresAt = new Date(now.getTime() + this.config.sessionTimeout);

    console.log(`🔄 Refreshed session: ${sessionId}`);
    this.emit('sessionRefreshed', session);

    return true;
  }

  public async destroySession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    // Remove from sessions
    this.sessions.delete(sessionId);
    
    // Remove from user sessions
    const userSessionIds = this.userSessions.get(session.userId);
    if (userSessionIds) {
      userSessionIds.delete(sessionId);
      if (userSessionIds.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    console.log(`🗑️  Destroyed session: ${sessionId}`);
    this.emit('sessionDestroyed', { sessionId, userId: session.userId });

    return true;
  }

  public async destroyAllUserSessions(userId: string): Promise<number> {
    const userSessionIds = this.userSessions.get(userId);
    
    if (!userSessionIds) {
      return 0;
    }

    const sessionIds = Array.from(userSessionIds);
    let destroyedCount = 0;

    for (const sessionId of sessionIds) {
      const success = await this.destroySession(sessionId);
      if (success) {
        destroyedCount++;
      }
    }

    console.log(`🗑️  Destroyed ${destroyedCount} sessions for user: ${userId}`);
    this.emit('allUserSessionsDestroyed', { userId, count: destroyedCount });

    return destroyedCount;
  }

  public async validateSession(
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    // Validate IP address (optional strict checking)
    if (process.env.STRICT_IP_VALIDATION === 'true' && session.ipAddress !== ipAddress) {
      console.log(`🚫 IP address mismatch for session ${sessionId}: ${session.ipAddress} vs ${ipAddress}`);
      await this.destroySession(sessionId);
      this.emit('sessionSecurityViolation', {
        sessionId,
        type: 'IP_MISMATCH',
        expected: session.ipAddress,
        actual: ipAddress
      });
      return null;
    }

    // Validate user agent (optional strict checking)
    if (process.env.STRICT_UA_VALIDATION === 'true' && session.userAgent !== userAgent) {
      console.log(`🚫 User agent mismatch for session ${sessionId}`);
      await this.destroySession(sessionId);
      this.emit('sessionSecurityViolation', {
        sessionId,
        type: 'USER_AGENT_MISMATCH',
        expected: session.userAgent,
        actual: userAgent
      });
      return null;
    }

    return session;
  }

  public getUserSessions(userId: string): Session[] {
    const userSessionIds = this.userSessions.get(userId);
    
    if (!userSessionIds) {
      return [];
    }

    return Array.from(userSessionIds)
      .map(sessionId => this.sessions.get(sessionId))
      .filter((session): session is Session => session !== undefined && session.isActive);
  }

  public getActiveSessions(): Session[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  public getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
    uniqueUsers: number;
    averageSessionDuration: number;
  } {
    const now = new Date();
    let activeSessions = 0;
    let expiredSessions = 0;
    let totalDuration = 0;

    for (const session of this.sessions.values()) {
      if (session.expiresAt < now || !session.isActive) {
        expiredSessions++;
      } else {
        activeSessions++;
        totalDuration += now.getTime() - session.createdAt.getTime();
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
      uniqueUsers: this.userSessions.size,
      averageSessionDuration: activeSessions > 0 ? totalDuration / activeSessions : 0
    };
  }

  public generateSecurityHeaders(): SecurityHeaders {
    if (!this.config.secureHeaders) {
      return {} as SecurityHeaders;
    }

    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': this.generateCSP(),
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': this.generatePermissionsPolicy()
    };
  }

  public generateSessionCookie(sessionId: string): string {
    const options = [
      `${this.config.cookieName}=${sessionId}`,
      `Max-Age=${Math.floor(this.config.sessionTimeout / 1000)}`,
      `SameSite=${this.config.sameSite}`,
      'Path=/'
    ];

    if (this.config.httpOnly) {
      options.push('HttpOnly');
    }

    if (this.config.secure) {
      options.push('Secure');
    }

    return options.join('; ');
  }

  public clearSessionCookie(): string {
    return `${this.config.cookieName}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=${this.config.sameSite}`;
  }

  public async updateSessionMetadata(sessionId: string, metadata: Record<string, any>): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return false;
    }

    session.metadata = { ...session.metadata, ...metadata };
    session.lastActivity = new Date();

    return true;
  }

  public async flagSuspiciousActivity(
    sessionId: string,
    activityType: string,
    details: any
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return;
    }

    const suspiciousActivity = {
      type: activityType,
      timestamp: new Date(),
      details,
      sessionId,
      userId: session.userId
    };

    // Add to session metadata
    if (!session.metadata.suspiciousActivities) {
      session.metadata.suspiciousActivities = [];
    }
    session.metadata.suspiciousActivities.push(suspiciousActivity);

    console.log(`🚨 Suspicious activity detected: ${activityType} for session ${sessionId}`);
    this.emit('suspiciousActivity', suspiciousActivity);

    // Auto-destroy session if too many suspicious activities
    if (session.metadata.suspiciousActivities.length >= 3) {
      console.log(`🚫 Auto-destroying session due to suspicious activity: ${sessionId}`);
      await this.destroySession(sessionId);
    }
  }

  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private findOldestSession(sessionIds: string[]): string | null {
    let oldestSession: Session | null = null;
    let oldestSessionId: string | null = null;

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && (!oldestSession || session.createdAt < oldestSession.createdAt)) {
        oldestSession = session;
        oldestSessionId = sessionId;
      }
    }

    return oldestSessionId;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, this.config.cleanupInterval);
  }

  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessionIds: string[] = [];

    for (const [sessionId, session] of this.sessions) {
      if (session.expiresAt < now || !session.isActive) {
        expiredSessionIds.push(sessionId);
      }
    }

    for (const sessionId of expiredSessionIds) {
      await this.destroySession(sessionId);
    }

    if (expiredSessionIds.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessionIds.length} expired sessions`);
    }
  }

  private generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' wss: ws:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    return directives.join('; ');
  }

  private generatePermissionsPolicy(): string {
    const policies = [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ];

    return policies.join(', ');
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Session Manager...');
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Destroy all active sessions
    const activeSessionIds = Array.from(this.sessions.keys());
    for (const sessionId of activeSessionIds) {
      await this.destroySession(sessionId);
    }

    console.log('✅ Session Manager shut down');
  }
}

// Default session configuration
export const createDefaultSessionConfig = (): SessionConfig => ({
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000'), // 30 minutes
  maxSessions: parseInt(process.env.MAX_SESSIONS_PER_USER || '5'),
  secureHeaders: process.env.NODE_ENV === 'production',
  sameSite: (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') || 'strict',
  httpOnly: process.env.COOKIE_HTTP_ONLY !== 'false',
  secure: process.env.NODE_ENV === 'production',
  cookieName: process.env.SESSION_COOKIE_NAME || 'gamma_session',
  cleanupInterval: parseInt(process.env.SESSION_CLEANUP_INTERVAL || '300000') // 5 minutes
});

// Session middleware for Express.js
export function createSessionMiddleware(sessionManager: SessionManager) {
  return async (req: any, res: any, next: any) => {
    try {
      // Apply security headers
      const securityHeaders = sessionManager.generateSecurityHeaders();
      for (const [header, value] of Object.entries(securityHeaders)) {
        res.setHeader(header, value);
      }

      // Extract session ID from cookie or header
      const sessionId = req.cookies?.gamma_session || req.headers['x-session-id'];
      
      if (!sessionId) {
        req.session = null;
        return next();
      }

      // Validate session
      const session = await sessionManager.validateSession(
        sessionId,
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || ''
      );

      if (session) {
        req.session = session;
        req.user = {
          id: session.userId,
          username: session.username,
          roles: session.roles,
          permissions: session.permissions
        };
      } else {
        req.session = null;
        req.user = null;
        
        // Clear invalid session cookie
        res.setHeader('Set-Cookie', sessionManager.clearSessionCookie());
      }

      next();
    } catch (error) {
      console.error('Session middleware error:', error);
      req.session = null;
      req.user = null;
      next();
    }
  };
}

// Authorization middleware
export function requireAuth(sessionManager: SessionManager) {
  return (req: any, res: any, next: any) => {
    if (!req.session || !req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    next();
  };
}

export function requireRole(role: string) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !req.user.roles.includes(role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: role
      });
    }
    next();
  };
}

export function requirePermission(permission: string) {
  return (req: any, res: any, next: any) => {
    if (!req.user || (!req.user.permissions.includes(permission) && !req.user.roles.includes('admin'))) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission
      });
    }
    next();
  };
}