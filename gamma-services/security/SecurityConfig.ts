import { SecurityConfig } from './SecurityMiddleware';

export interface ProductionSecurityConfig extends SecurityConfig {
  environment: 'development' | 'staging' | 'production';
  encryptionKey: string;
  sessionSecret: string;
  cookieSecret: string;
  corsOrigins: string[];
  trustedProxies: string[];
  rateLimits: {
    api: { windowMs: number; max: number };
    auth: { windowMs: number; max: number };
    trading: { windowMs: number; max: number };
  };
  securityHeaders: {
    hsts: boolean;
    csp: boolean;
    xssProtection: boolean;
    noSniff: boolean;
  };
  auditLogging: {
    enabled: boolean;
    logLevel: 'minimal' | 'standard' | 'verbose';
    retentionDays: number;
  };
}

export const getSecurityConfig = (): ProductionSecurityConfig => {
  const environment = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';
  
  return {
    environment,
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    trustedProxies: process.env.TRUSTED_PROXIES?.split(',') || ['127.0.0.1'],
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key',
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
    cookieSecret: process.env.COOKIE_SECRET || 'your-cookie-secret',
    rateLimits: {
      api: {
        windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        max: parseInt(process.env.API_RATE_LIMIT_MAX || '1000')
      },
      auth: {
        windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
        max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10')
      },
      trading: {
        windowMs: parseInt(process.env.TRADING_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
        max: parseInt(process.env.TRADING_RATE_LIMIT_MAX || '10')
      }
    },
    securityHeaders: {
      hsts: environment === 'production',
      csp: true,
      xssProtection: true,
      noSniff: true
    },
    auditLogging: {
      enabled: environment === 'production',
      logLevel: (process.env.AUDIT_LOG_LEVEL as 'minimal' | 'standard' | 'verbose') || 'standard',
      retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '90')
    }
  };
};

export const validateSecurityConfig = (config: ProductionSecurityConfig): void => {
  if (!config.jwtSecret || config.jwtSecret === 'your-jwt-secret-key') {
    throw new Error('JWT_SECRET must be set to a secure value');
  }
  
  if (!config.encryptionKey || config.encryptionKey === 'your-encryption-key') {
    throw new Error('ENCRYPTION_KEY must be set to a secure value');
  }
  
  if (!config.sessionSecret || config.sessionSecret === 'your-session-secret') {
    throw new Error('SESSION_SECRET must be set to a secure value');
  }
  
  if (config.environment === 'production') {
    if (config.corsOrigins.includes('http://localhost:3000')) {
      throw new Error('CORS origins must not include localhost in production');
    }
    
    if (config.rateLimits.auth.max > 20) {
      throw new Error('Auth rate limit should be reasonable for production');
    }
  }
  
  if (config.rateLimitMax < 10) {
    throw new Error('Rate limit max should be at least 10');
  }
  
  if (config.rateLimitWindowMs < 60000) {
    throw new Error('Rate limit window should be at least 1 minute');
  }
};

export const getSecurityHeaders = (config: ProductionSecurityConfig) => {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
  
  if (config.securityHeaders.hsts) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }
  
  if (config.securityHeaders.csp) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }
  
  return headers;
};

export const getRateLimitConfig = (config: ProductionSecurityConfig, type: 'api' | 'auth' | 'trading') => {
  const rateLimit = config.rateLimits[type];
  
  return {
    windowMs: rateLimit.windowMs,
    max: rateLimit.max,
    message: {
      error: 'Too many requests',
      retryAfter: Math.ceil(rateLimit.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: any) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/status';
    }
  };
};