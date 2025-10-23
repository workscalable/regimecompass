import { Request, Response, NextFunction } from 'express';
import { SecurityMonitor } from './SecurityMonitor';
import { auditLogger } from '../logging/AuditLogger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private securityMonitor?: SecurityMonitor;

  constructor(config: RateLimitConfig, securityMonitor?: SecurityMonitor) {
    this.config = {
      windowMs: 15 * 60 * 1000, // 15 minutes default
      maxRequests: 100, // 100 requests per window default
      message: 'Too many requests, please try again later.',
      statusCode: 429,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: (req: Request) => req.ip || 'unknown',
      skip: () => false,
      ...config
    };
    this.securityMonitor = securityMonitor;
  }

  /**
   * Express middleware for rate limiting
   */
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip if configured to skip this request
        if (this.config.skip && this.config.skip(req)) {
          return next();
        }

        const key = this.config.keyGenerator!(req);
        
        // Check rate limit
        const rateLimitResult = await this.checkRateLimit(key);
        
        // Add rate limit headers
        res.set({
          'X-RateLimit-Limit': this.config.maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString()
        });

        if (!rateLimitResult.allowed) {
          // Rate limit exceeded
          await this.handleRateLimitExceeded(req, res, key, rateLimitResult);
          return;
        }

        // Store rate limit info for potential logging after response
        (req as any).rateLimitInfo = {
          limit: this.config.maxRequests,
          current: this.config.maxRequests - rateLimitResult.remaining + 1,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        };

        // Hook into response to log if needed
        const originalSend = res.send;
        res.send = function(body) {
          const statusCode = res.statusCode;
          
          // Log rate limit usage if configured
          if (!config.skipSuccessfulRequests || statusCode >= 400) {
            auditLogger.logApiAccess(
              req.path,
              req.method,
              statusCode,
              Date.now() - (req as any).startTime || 0,
              {
                userId: (req as any).user?.id,
                sessionId: (req as any).sessionId,
                correlationId: (req as any).correlationId,
                metadata: {
                  ipAddress: req.ip,
                  userAgent: req.get('User-Agent'),
                  rateLimitInfo: (req as any).rateLimitInfo
                }
              }
            );
          }
          
          return originalSend.call(this, body);
        };

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        next(); // Continue on error to avoid breaking the application
      }
    };
  }

  /**
   * Check rate limit for a specific key
   */
  private async checkRateLimit(key: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    if (this.securityMonitor) {
      return await this.securityMonitor.checkRateLimit(
        key,
        this.config.maxRequests,
        this.config.windowMs
      );
    }

    // Fallback implementation if no security monitor
    return {
      allowed: true,
      remaining: this.config.maxRequests,
      resetTime: new Date(Date.now() + this.config.windowMs)
    };
  }

  /**
   * Handle rate limit exceeded
   */
  private async handleRateLimitExceeded(
    req: Request,
    res: Response,
    key: string,
    rateLimitResult: { allowed: boolean; remaining: number; resetTime: Date }
  ): Promise<void> {
    // Log rate limit exceeded event
    await auditLogger.logEvent(
      'API_ACCESS',
      'api',
      'rate_limit_exceeded',
      {
        endpoint: req.path,
        method: req.method,
        key,
        limit: this.config.maxRequests,
        windowMs: this.config.windowMs
      },
      'FAILURE',
      {
        userId: (req as any).user?.id,
        sessionId: (req as any).sessionId,
        correlationId: (req as any).correlationId,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      },
      'Rate limit exceeded'
    );

    // Call custom handler if provided
    if (this.config.onLimitReached) {
      this.config.onLimitReached(req, res);
    }

    // Send rate limit response
    res.status(this.config.statusCode!).json({
      error: 'Rate limit exceeded',
      message: this.config.message,
      retryAfter: Math.ceil((rateLimitResult.resetTime.getTime() - Date.now()) / 1000)
    });
  }

  /**
   * Create rate limiter for specific endpoints
   */
  public static createEndpointLimiter(
    maxRequests: number,
    windowMs: number,
    securityMonitor?: SecurityMonitor
  ): RateLimiter {
    return new RateLimiter({
      maxRequests,
      windowMs,
      message: `Too many requests to this endpoint. Limit: ${maxRequests} per ${windowMs / 1000} seconds.`
    }, securityMonitor);
  }

  /**
   * Create strict rate limiter for sensitive endpoints
   */
  public static createStrictLimiter(securityMonitor?: SecurityMonitor): RateLimiter {
    return new RateLimiter({
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Too many requests to sensitive endpoint. Please try again later.',
      onLimitReached: (req, res) => {
        // Additional logging for sensitive endpoints
        auditLogger.logEvent(
          'ALERT_TRIGGERED',
          'security',
          'sensitive_endpoint_rate_limit',
          {
            endpoint: req.path,
            method: req.method,
            severity: 'MEDIUM'
          },
          'SUCCESS',
          {
            userId: (req as any).user?.id,
            metadata: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            }
          }
        );
      }
    }, securityMonitor);
  }

  /**
   * Create user-specific rate limiter
   */
  public static createUserLimiter(
    maxRequests: number,
    windowMs: number,
    securityMonitor?: SecurityMonitor
  ): RateLimiter {
    return new RateLimiter({
      maxRequests,
      windowMs,
      keyGenerator: (req: Request) => {
        const userId = (req as any).user?.id;
        return userId ? `user:${userId}` : `ip:${req.ip}`;
      },
      message: 'Too many requests from your account. Please try again later.'
    }, securityMonitor);
  }

  /**
   * Create IP-based rate limiter
   */
  public static createIPLimiter(
    maxRequests: number,
    windowMs: number,
    securityMonitor?: SecurityMonitor
  ): RateLimiter {
    return new RateLimiter({
      maxRequests,
      windowMs,
      keyGenerator: (req: Request) => `ip:${req.ip}`,
      message: 'Too many requests from your IP address. Please try again later.'
    }, securityMonitor);
  }

  /**
   * Create sliding window rate limiter
   */
  public static createSlidingWindowLimiter(
    maxRequests: number,
    windowMs: number,
    securityMonitor?: SecurityMonitor
  ): RateLimiter {
    return new RateLimiter({
      maxRequests,
      windowMs,
      keyGenerator: (req: Request) => {
        const now = Date.now();
        const windowStart = Math.floor(now / windowMs) * windowMs;
        return `sliding:${req.ip}:${windowStart}`;
      }
    }, securityMonitor);
  }
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimit(
  config: RateLimitConfig,
  securityMonitor?: SecurityMonitor
) {
  const rateLimiter = new RateLimiter(config, securityMonitor);
  return rateLimiter.middleware();
}

/**
 * Common rate limiting configurations
 */
export const RateLimitPresets = {
  // General API rate limiting
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5
  },
  
  // Password reset endpoints
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3
  },
  
  // Trading endpoints
  trading: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60
  },
  
  // Data export endpoints
  export: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10
  },
  
  // Admin endpoints
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  }
};

/**
 * Express middleware to add request timing
 */
export function requestTimer() {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as any).startTime = Date.now();
    next();
  };
}