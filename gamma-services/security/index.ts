// Security Service Components
export { SecurityService, securityService } from './SecurityService';
export { SecurityMonitor } from './SecurityMonitor';
export { RateLimiter, createRateLimit, RateLimitPresets, requestTimer } from './RateLimiter';
export { DDoSProtection, createDDoSProtection, DDoSPresets } from './DDoSProtection';
export { IntrusionDetection } from './IntrusionDetection';

// Security Configuration
export {
  GammaSecurityConfig,
  defaultSecurityConfig,
  securityConfigs,
  securityPresets,
  getSecurityConfig,
  getSecurityPreset,
  validateSecurityConfig
} from './SecurityConfig';

// Types and Interfaces
export type {
  SecurityConfig,
  SecurityEvent,
  SecurityEventType,
  SecurityMetrics,
  ThreatPattern,
  AlertThreshold,
  ComplianceStandard,
  ComplianceRequirement,
  SecurityAction
} from './SecurityMonitor';

export type {
  RateLimitConfig,
  RateLimitInfo
} from './RateLimiter';

export type {
  DDoSConfig,
  ConnectionInfo
} from './DDoSProtection';

export type {
  IntrusionConfig,
  IntrusionPattern,
  UserBehaviorProfile,
  LoginAttempt,
  UserActivity,
  BehaviorAnomaly,
  IntrusionEvent,
  IntrusionAnalysisResult
} from './IntrusionDetection';

export type {
  SecurityServiceStatus,
  SecurityAlert
} from './SecurityService';

// Utility functions for common security operations
export const SecurityUtils = {
  /**
   * Generate secure random string
   */
  generateSecureToken: (length: number = 32): string => {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Hash sensitive data
   */
  hashSensitiveData: (data: string): string => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  },

  /**
   * Validate IP address format
   */
  isValidIP: (ip: string): boolean => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  },

  /**
   * Check if IP is in private range
   */
  isPrivateIP: (ip: string): boolean => {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];
    return privateRanges.some(range => range.test(ip));
  },

  /**
   * Sanitize user input
   */
  sanitizeInput: (input: string): string => {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;&|`$]/g, '') // Remove command injection characters
      .trim();
  },

  /**
   * Check password strength
   */
  checkPasswordStrength: (password: string): {
    score: number;
    feedback: string[];
  } => {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    return { score, feedback };
  },

  /**
   * Generate CSRF token
   */
  generateCSRFToken: (): string => {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('base64');
  },

  /**
   * Validate CSRF token
   */
  validateCSRFToken: (token: string, sessionToken: string): boolean => {
    return token === sessionToken;
  }
};

// Security middleware factory functions
export const SecurityMiddleware = {
  /**
   * Create security headers middleware
   */
  securityHeaders: () => {
    return (req: any, res: any, next: any) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Content-Security-Policy', "default-src 'self'");
      next();
    };
  },

  /**
   * Create CORS middleware with security considerations
   */
  secureCORS: (allowedOrigins: string[] = []) => {
    return (req: any, res: any, next: any) => {
      const origin = req.headers.origin;
      
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }
      
      next();
    };
  },

  /**
   * Create request sanitization middleware
   */
  sanitizeRequest: () => {
    return (req: any, res: any, next: any) => {
      // Sanitize query parameters
      if (req.query) {
        for (const key in req.query) {
          if (typeof req.query[key] === 'string') {
            req.query[key] = SecurityUtils.sanitizeInput(req.query[key]);
          }
        }
      }

      // Sanitize body parameters
      if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
          if (typeof req.body[key] === 'string') {
            req.body[key] = SecurityUtils.sanitizeInput(req.body[key]);
          }
        }
      }

      next();
    };
  }
};

// Export default security service instance
export default securityService;