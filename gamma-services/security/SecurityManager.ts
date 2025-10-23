import { EventEmitter } from 'events';
import { SecureKeyManager, EnvironmentKeyManager } from './SecureKeyManager';
import { JWTAuthManager, createDefaultJWTConfig } from './JWTAuthManager';
import { SessionManager, createDefaultSessionConfig } from './SessionManager';
import * as crypto from 'crypto';
import * as rateLimit from 'express-rate-limit';

export interface SecurityConfig {
  keyManager: {
    keyStorePath: string;
    rotationInterval: number;
    backupCount: number;
  };
  jwt: {
    secretKey: string;
    issuer: string;
    audience: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
  };
  session: {
    sessionTimeout: number;
    maxSessions: number;
    secureHeaders: boolean;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  security: {
    encryptionEnabled: boolean;
    auditLogging: boolean;
    intrusionDetection: boolean;
    passwordPolicy: PasswordPolicy;
  };
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // in days
  preventReuse: number; // number of previous passwords to check
}

export interface SecurityEvent {
  id: string;
  type: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'SESSION_CREATED' | 'SESSION_DESTROYED' | 
        'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_EXCEEDED' | 
        'INTRUSION_DETECTED' | 'PASSWORD_CHANGED' | 'ACCOUNT_LOCKED';
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SecurityMetrics {
  authenticationAttempts: {
    successful: number;
    failed: number;
    rate: number;
  };
  sessions: {
    active: number;
    created: number;
    destroyed: number;
  };
  securityEvents: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  rateLimiting: {
    requestsBlocked: number;
    uniqueIPs: number;
  };
}

export class SecurityManager extends EventEmitter {
  private config: SecurityConfig;
  private keyManager: SecureKeyManager;
  private jwtAuthManager: JWTAuthManager;
  private sessionManager: SessionManager;
  private environmentKeyManager: EnvironmentKeyManager;
  private securityEvents: SecurityEvent[] = [];
  private failedAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private blockedIPs: Set<string> = new Set();
  private metrics: SecurityMetrics;

  constructor(config: SecurityConfig) {
    super();
    this.config = config;
    
    // Initialize managers
    this.keyManager = new SecureKeyManager({
      keyStorePath: config.keyManager.keyStorePath,
      rotationInterval: config.keyManager.rotationInterval,
      backupCount: config.keyManager.backupCount,
      compressionEnabled: true
    });
    
    this.jwtAuthManager = new JWTAuthManager(
      {
        ...createDefaultJWTConfig(),
        ...config.jwt
      },
      this.keyManager
    );
    
    this.sessionManager = new SessionManager({
      ...createDefaultSessionConfig(),
      ...config.session
    });
    
    this.environmentKeyManager = EnvironmentKeyManager.getInstance();
    
    this.metrics = {
      authenticationAttempts: { successful: 0, failed: 0, rate: 0 },
      sessions: { active: 0, created: 0, destroyed: 0 },
      securityEvents: { total: 0, byType: {}, bySeverity: {} },
      rateLimiting: { requestsBlocked: 0, uniqueIPs: 0 }
    };
    
    this.setupEventHandlers();
  }

  public async initialize(): Promise<void> {
    console.log('🔐 Initializing Security Manager...');
    
    try {
      // Initialize all components
      await this.keyManager.initialize();
      await this.environmentKeyManager.initialize();
      await this.jwtAuthManager.initialize();
      await this.sessionManager.initialize();
      
      // Set up security monitoring
      this.startSecurityMonitoring();
      
      console.log('✅ Security Manager initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Security Manager:', error);
      throw error;
    }
  }

  public async authenticateUser(
    username: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{ success: boolean; tokens?: any; session?: any; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Check if IP is blocked
      if (this.blockedIPs.has(ipAddress)) {
        await this.logSecurityEvent('AUTH_FAILURE', {
          username,
          reason: 'IP_BLOCKED',
          ipAddress,
          userAgent
        }, 'HIGH');
        
        return { success: false, error: 'Access denied' };
      }

      // Check rate limiting
      if (this.isRateLimited(ipAddress)) {
        await this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          username,
          ipAddress,
          userAgent
        }, 'MEDIUM');
        
        return { success: false, error: 'Too many attempts' };
      }

      // Validate password policy
      if (!this.validatePassword(password)) {
        await this.logSecurityEvent('AUTH_FAILURE', {
          username,
          reason: 'INVALID_PASSWORD_FORMAT',
          ipAddress,
          userAgent
        }, 'LOW');
        
        return { success: false, error: 'Invalid password format' };
      }

      // Authenticate user
      const user = await this.jwtAuthManager.authenticateUser(username, password);
      
      if (!user) {
        // Track failed attempt
        this.trackFailedAttempt(ipAddress);
        
        await this.logSecurityEvent('AUTH_FAILURE', {
          username,
          reason: 'INVALID_CREDENTIALS',
          ipAddress,
          userAgent,
          duration: Date.now() - startTime
        }, 'MEDIUM');
        
        this.metrics.authenticationAttempts.failed++;
        
        return { success: false, error: 'Invalid credentials' };
      }

      // Generate tokens and session
      const tokens = await this.jwtAuthManager.generateTokens(user, userAgent, ipAddress);
      const session = await this.sessionManager.createSession(
        user.id,
        user.username,
        user.roles,
        user.permissions,
        ipAddress,
        userAgent
      );

      // Clear failed attempts for this IP
      this.failedAttempts.delete(ipAddress);

      await this.logSecurityEvent('AUTH_SUCCESS', {
        userId: user.id,
        username: user.username,
        ipAddress,
        userAgent,
        duration: Date.now() - startTime
      }, 'LOW');

      this.metrics.authenticationAttempts.successful++;
      this.metrics.sessions.created++;

      return { success: true, tokens, session };

    } catch (error) {
      await this.logSecurityEvent('AUTH_FAILURE', {
        username,
        reason: 'SYSTEM_ERROR',
        error: (error as Error).message,
        ipAddress,
        userAgent
      }, 'HIGH');

      return { success: false, error: 'Authentication failed' };
    }
  }

  public async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtAuthManager.verifyToken(token);
      return payload;
    } catch (error) {
      return null;
    }
  }

  public async refreshTokens(refreshToken: string): Promise<any> {
    try {
      return await this.jwtAuthManager.refreshTokens(refreshToken);
    } catch (error) {
      return null;
    }
  }

  public async revokeToken(tokenId: string): Promise<boolean> {
    return this.jwtAuthManager.revokeToken(tokenId);
  }

  public async createUser(userData: {
    username: string;
    email: string;
    password: string;
    roles?: string[];
    permissions?: string[];
  }): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // Validate password policy
      if (!this.validatePassword(userData.password)) {
        return { success: false, error: 'Password does not meet policy requirements' };
      }

      const user = await this.jwtAuthManager.createUser(userData);
      
      await this.logSecurityEvent('AUTH_SUCCESS', {
        userId: user.id,
        username: user.username,
        action: 'USER_CREATED'
      }, 'LOW');

      return { success: true, user };

    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  public async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate new password
      if (!this.validatePassword(newPassword)) {
        return { success: false, error: 'New password does not meet policy requirements' };
      }

      // This would integrate with your user management system
      // For now, we'll just log the event
      await this.logSecurityEvent('PASSWORD_CHANGED', {
        userId
      }, 'MEDIUM');

      return { success: true };

    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  public async getSecurityMetrics(): Promise<SecurityMetrics> {
    // Update session metrics
    const sessionStats = this.sessionManager.getSessionStats();
    this.metrics.sessions.active = sessionStats.activeSessions;

    // Update authentication rate
    const recentEvents = this.securityEvents.filter(
      event => event.timestamp > new Date(Date.now() - 60000) // Last minute
    );
    const authEvents = recentEvents.filter(
      event => event.type === 'AUTH_SUCCESS' || event.type === 'AUTH_FAILURE'
    );
    this.metrics.authenticationAttempts.rate = authEvents.length;

    return { ...this.metrics };
  }

  public async getSecurityEvents(
    limit: number = 100,
    severity?: string,
    type?: string
  ): Promise<SecurityEvent[]> {
    let events = [...this.securityEvents];

    if (severity) {
      events = events.filter(event => event.severity === severity);
    }

    if (type) {
      events = events.filter(event => event.type === type);
    }

    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public createRateLimiter() {
    if (!this.config.rateLimiting.enabled) {
      return (req: any, res: any, next: any) => next();
    }

    return rateLimit({
      windowMs: this.config.rateLimiting.windowMs,
      max: this.config.rateLimiting.maxRequests,
      skipSuccessfulRequests: this.config.rateLimiting.skipSuccessfulRequests,
      handler: (req: any, res: any) => {
        this.metrics.rateLimiting.requestsBlocked++;
        
        this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          path: req.path
        }, 'MEDIUM');

        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(this.config.rateLimiting.windowMs / 1000)
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });
  }

  public validatePassword(password: string): boolean {
    const policy = this.config.security.passwordPolicy;

    if (password.length < policy.minLength) {
      return false;
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      return false;
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      return false;
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      return false;
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return false;
    }

    return true;
  }

  public async encryptSensitiveData(data: string): Promise<string> {
    if (!this.config.security.encryptionEnabled) {
      return data;
    }

    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${key.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  public async decryptSensitiveData(encryptedData: string): Promise<string> {
    if (!this.config.security.encryptionEnabled) {
      return encryptedData;
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const key = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encrypted = parts[3];

    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async logSecurityEvent(
    type: SecurityEvent['type'],
    details: Record<string, any>,
    severity: SecurityEvent['severity'] = 'LOW'
  ): Promise<void> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      type,
      userId: details.userId,
      sessionId: details.sessionId,
      ipAddress: details.ipAddress || 'unknown',
      userAgent: details.userAgent || 'unknown',
      timestamp: new Date(),
      details,
      severity
    };

    this.securityEvents.push(event);

    // Keep only recent events (last 10000)
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-10000);
    }

    // Update metrics
    this.metrics.securityEvents.total++;
    this.metrics.securityEvents.byType[type] = (this.metrics.securityEvents.byType[type] || 0) + 1;
    this.metrics.securityEvents.bySeverity[severity] = (this.metrics.securityEvents.bySeverity[severity] || 0) + 1;

    // Emit event for external handling
    this.emit('securityEvent', event);

    // Handle critical events
    if (severity === 'CRITICAL') {
      await this.handleCriticalEvent(event);
    }

    console.log(`🔒 Security Event [${severity}]: ${type} - ${JSON.stringify(details)}`);
  }

  private async handleCriticalEvent(event: SecurityEvent): Promise<void> {
    // Implement critical event handling (e.g., block IP, alert admins)
    if (event.ipAddress && event.ipAddress !== 'unknown') {
      this.blockedIPs.add(event.ipAddress);
      console.log(`🚫 Blocked IP due to critical security event: ${event.ipAddress}`);
    }

    // Send alert (would integrate with alerting system)
    this.emit('criticalSecurityEvent', event);
  }

  private trackFailedAttempt(ipAddress: string): void {
    const attempts = this.failedAttempts.get(ipAddress) || { count: 0, lastAttempt: new Date() };
    attempts.count++;
    attempts.lastAttempt = new Date();
    
    this.failedAttempts.set(ipAddress, attempts);

    // Block IP after too many failed attempts
    if (attempts.count >= 5) {
      this.blockedIPs.add(ipAddress);
      console.log(`🚫 Blocked IP after ${attempts.count} failed attempts: ${ipAddress}`);
    }
  }

  private isRateLimited(ipAddress: string): boolean {
    // Simple rate limiting check (would be more sophisticated in production)
    const attempts = this.failedAttempts.get(ipAddress);
    if (!attempts) return false;

    const timeSinceLastAttempt = Date.now() - attempts.lastAttempt.getTime();
    return attempts.count >= 3 && timeSinceLastAttempt < 60000; // 1 minute
  }

  private setupEventHandlers(): void {
    // Session events
    this.sessionManager.on('sessionCreated', (session) => {
      this.logSecurityEvent('SESSION_CREATED', {
        userId: session.userId,
        sessionId: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      }, 'LOW');
    });

    this.sessionManager.on('sessionDestroyed', (data) => {
      this.logSecurityEvent('SESSION_DESTROYED', {
        userId: data.userId,
        sessionId: data.sessionId
      }, 'LOW');
      this.metrics.sessions.destroyed++;
    });

    this.sessionManager.on('suspiciousActivity', (activity) => {
      this.logSecurityEvent('SUSPICIOUS_ACTIVITY', activity, 'HIGH');
    });
  }

  private startSecurityMonitoring(): void {
    // Monitor for intrusion patterns
    setInterval(() => {
      this.detectIntrusionPatterns();
    }, 60000); // Every minute

    // Clean up old data
    setInterval(() => {
      this.cleanupSecurityData();
    }, 300000); // Every 5 minutes
  }

  private detectIntrusionPatterns(): void {
    if (!this.config.security.intrusionDetection) return;

    const recentEvents = this.securityEvents.filter(
      event => event.timestamp > new Date(Date.now() - 300000) // Last 5 minutes
    );

    // Detect brute force attacks
    const failedLogins = recentEvents.filter(event => event.type === 'AUTH_FAILURE');
    const ipCounts = new Map<string, number>();

    for (const event of failedLogins) {
      const count = ipCounts.get(event.ipAddress) || 0;
      ipCounts.set(event.ipAddress, count + 1);
    }

    for (const [ip, count] of ipCounts) {
      if (count >= 10) { // 10 failed attempts in 5 minutes
        this.logSecurityEvent('INTRUSION_DETECTED', {
          type: 'BRUTE_FORCE',
          ipAddress: ip,
          attemptCount: count
        }, 'CRITICAL');
      }
    }
  }

  private cleanupSecurityData(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Clean up failed attempts
    for (const [ip, attempts] of this.failedAttempts) {
      if (attempts.lastAttempt < cutoff) {
        this.failedAttempts.delete(ip);
      }
    }

    // Clean up old security events (keep last 24 hours)
    this.securityEvents = this.securityEvents.filter(event => event.timestamp >= cutoff);
  }

  public getKeyManager(): SecureKeyManager {
    return this.keyManager;
  }

  public getJWTAuthManager(): JWTAuthManager {
    return this.jwtAuthManager;
  }

  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  public async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Security Manager...');
    
    await Promise.all([
      this.keyManager.shutdown(),
      this.jwtAuthManager.shutdown(),
      this.sessionManager.shutdown()
    ]);
    
    console.log('✅ Security Manager shut down');
  }
}

// Default security configuration
export const createDefaultSecurityConfig = (): SecurityConfig => ({
  keyManager: {
    keyStorePath: process.env.KEY_STORE_PATH || './keys/secure-keys.json',
    rotationInterval: parseInt(process.env.KEY_ROTATION_INTERVAL || '86400000'), // 24 hours
    backupCount: parseInt(process.env.KEY_BACKUP_COUNT || '5')
  },
  jwt: {
    secretKey: process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex'),
    issuer: process.env.JWT_ISSUER || 'gamma-adaptive-system',
    audience: process.env.JWT_AUDIENCE || 'gamma-adaptive-users',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  session: {
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '1800000'), // 30 minutes
    maxSessions: parseInt(process.env.MAX_SESSIONS_PER_USER || '5'),
    secureHeaders: process.env.NODE_ENV === 'production'
  },
  rateLimiting: {
    enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true'
  },
  security: {
    encryptionEnabled: process.env.ENCRYPTION_ENABLED !== 'false',
    auditLogging: process.env.AUDIT_LOGGING !== 'false',
    intrusionDetection: process.env.INTRUSION_DETECTION !== 'false',
    passwordPolicy: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
      requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
      maxAge: parseInt(process.env.PASSWORD_MAX_AGE || '90'), // 90 days
      preventReuse: parseInt(process.env.PASSWORD_PREVENT_REUSE || '5')
    }
  }
});