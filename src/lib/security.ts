/**
 * Comprehensive security system for RegimeCompass
 * Implements authentication, authorization, input validation, and security headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from './monitoring';

export interface SecurityConfig {
  corsOrigins: string[];
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  apiKeyValidation: boolean;
  inputSanitization: boolean;
  securityHeaders: boolean;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface SecurityContext {
  isAuthenticated: boolean;
  apiKey?: string;
  userId?: string;
  permissions: string[];
  rateLimitRemaining: number;
}

/**
 * Security middleware for API routes
 */
export class SecurityMiddleware {
  private static rateLimitStore = new Map<string, RateLimitEntry>();
  private static config: SecurityConfig = {
    corsOrigins: ['*'], // Configure based on environment
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100 // 100 requests per window
    },
    apiKeyValidation: true,
    inputSanitization: true,
    securityHeaders: true
  };

  /**
   * Apply security middleware to request
   */
  static async applyMiddleware(
    request: NextRequest,
    requiredPermissions: string[] = []
  ): Promise<{ 
    allowed: boolean; 
    response?: NextResponse; 
    context?: SecurityContext 
  }> {
    try {
      // 1. Apply CORS
      const corsResult = this.applyCORS(request);
      if (!corsResult.allowed) {
        return { allowed: false, response: corsResult.response };
      }

      // 2. Apply rate limiting
      const rateLimitResult = this.applyRateLimit(request);
      if (!rateLimitResult.allowed) {
        return { allowed: false, response: rateLimitResult.response };
      }

      // 3. Validate API key if required
      const authResult = this.validateAuthentication(request);
      if (!authResult.allowed) {
        return { allowed: false, response: authResult.response };
      }

      // 4. Check permissions
      const permissionResult = this.checkPermissions(authResult.context!, requiredPermissions);
      if (!permissionResult.allowed) {
        return { allowed: false, response: permissionResult.response };
      }

      // 5. Sanitize input
      const sanitizationResult = await this.sanitizeInput(request);
      if (!sanitizationResult.allowed) {
        return { allowed: false, response: sanitizationResult.response };
      }

      return { 
        allowed: true, 
        context: {
          ...authResult.context!,
          rateLimitRemaining: rateLimitResult.remaining!
        }
      };

    } catch (error) {
      logger.error('Security middleware error', error as Error);
      return {
        allowed: false,
        response: NextResponse.json({
          error: 'Security validation failed',
          timestamp: new Date().toISOString()
        }, { status: 500 })
      };
    }
  }

  /**
   * Apply CORS headers and validation
   */
  private static applyCORS(request: NextRequest): { 
    allowed: boolean; 
    response?: NextResponse 
  } {
    const origin = request.headers.get('origin');
    const method = request.method;

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return {
        allowed: true,
        response: new NextResponse(null, {
          status: 200,
          headers: this.getCORSHeaders(origin)
        })
      };
    }

    // Validate origin if not wildcard
    if (this.config.corsOrigins[0] !== '*' && origin) {
      if (!this.config.corsOrigins.includes(origin)) {
        logger.warn('CORS violation', { origin, allowedOrigins: this.config.corsOrigins });
        return {
          allowed: false,
          response: NextResponse.json({
            error: 'CORS policy violation',
            message: 'Origin not allowed'
          }, { status: 403 })
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Apply rate limiting
   */
  private static applyRateLimit(request: NextRequest): { 
    allowed: boolean; 
    response?: NextResponse;
    remaining?: number;
  } {
    const clientId = this.getClientIdentifier(request);
    const now = Date.now();
    const windowStart = now - this.config.rateLimiting.windowMs;

    // Clean up old entries
    this.cleanupRateLimit(windowStart);

    // Get or create rate limit entry
    let entry = this.rateLimitStore.get(clientId);
    if (!entry || entry.resetTime < windowStart) {
      entry = {
        count: 0,
        resetTime: now + this.config.rateLimiting.windowMs
      };
    }

    // Check if limit exceeded
    if (entry.count >= this.config.rateLimiting.maxRequests) {
      logger.warn('Rate limit exceeded', { 
        clientId, 
        count: entry.count, 
        limit: this.config.rateLimiting.maxRequests 
      });

      return {
        allowed: false,
        response: NextResponse.json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Limit: ${this.config.rateLimiting.maxRequests} per ${this.config.rateLimiting.windowMs / 1000}s`,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        }, { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': this.config.rateLimiting.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString()
          }
        })
      };
    }

    // Increment counter
    entry.count++;
    this.rateLimitStore.set(clientId, entry);

    return { 
      allowed: true, 
      remaining: this.config.rateLimiting.maxRequests - entry.count 
    };
  }

  /**
   * Validate API key authentication
   */
  private static validateAuthentication(request: NextRequest): {
    allowed: boolean;
    response?: NextResponse;
    context?: SecurityContext;
  } {
    if (!this.config.apiKeyValidation) {
      return {
        allowed: true,
        context: {
          isAuthenticated: false,
          permissions: ['read'],
          rateLimitRemaining: 0
        }
      };
    }

    const apiKey = request.headers.get('x-api-key') || 
                   request.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return {
        allowed: false,
        response: NextResponse.json({
          error: 'Authentication required',
          message: 'API key required. Provide via X-API-Key header or Authorization: Bearer token'
        }, { status: 401 })
      };
    }

    // Validate API key (in production, check against database)
    const validApiKeys = this.getValidApiKeys();
    const keyInfo = validApiKeys.get(apiKey);

    if (!keyInfo) {
      logger.warn('Invalid API key attempt', { 
        apiKey: apiKey.substring(0, 8) + '...',
        ip: request.ip
      });

      return {
        allowed: false,
        response: NextResponse.json({
          error: 'Invalid API key',
          message: 'The provided API key is not valid'
        }, { status: 401 })
      };
    }

    return {
      allowed: true,
      context: {
        isAuthenticated: true,
        apiKey,
        userId: keyInfo.userId,
        permissions: keyInfo.permissions,
        rateLimitRemaining: 0
      }
    };
  }

  /**
   * Check user permissions
   */
  private static checkPermissions(
    context: SecurityContext,
    requiredPermissions: string[]
  ): { allowed: boolean; response?: NextResponse } {
    if (requiredPermissions.length === 0) {
      return { allowed: true };
    }

    const hasPermission = requiredPermissions.every(permission =>
      context.permissions.includes(permission) || context.permissions.includes('admin')
    );

    if (!hasPermission) {
      logger.warn('Permission denied', {
        userId: context.userId,
        required: requiredPermissions,
        available: context.permissions
      });

      return {
        allowed: false,
        response: NextResponse.json({
          error: 'Insufficient permissions',
          message: `Required permissions: ${requiredPermissions.join(', ')}`,
          available: context.permissions
        }, { status: 403 })
      };
    }

    return { allowed: true };
  }

  /**
   * Sanitize request input
   */
  private static async sanitizeInput(request: NextRequest): Promise<{
    allowed: boolean;
    response?: NextResponse;
  }> {
    if (!this.config.inputSanitization) {
      return { allowed: true };
    }

    try {
      // Check for common injection patterns
      const url = request.url;
      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /\bselect\b.*\bfrom\b/gi,
        /\bunion\b.*\bselect\b/gi,
        /\bdrop\b.*\btable\b/gi
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
          logger.warn('Suspicious input detected', { 
            url: url.substring(0, 200),
            pattern: pattern.source
          });

          return {
            allowed: false,
            response: NextResponse.json({
              error: 'Invalid input',
              message: 'Request contains potentially malicious content'
            }, { status: 400 })
          };
        }
      }

      // Validate JSON body if present
      if (request.headers.get('content-type')?.includes('application/json')) {
        try {
          const body = await request.clone().text();
          if (body) {
            JSON.parse(body); // Validate JSON structure
            
            // Check for suspicious content in JSON
            for (const pattern of suspiciousPatterns) {
              if (pattern.test(body)) {
                logger.warn('Suspicious JSON content', { 
                  bodyPreview: body.substring(0, 200)
                });

                return {
                  allowed: false,
                  response: NextResponse.json({
                    error: 'Invalid JSON content',
                    message: 'JSON body contains potentially malicious content'
                  }, { status: 400 })
                };
              }
            }
          }
        } catch (jsonError) {
          return {
            allowed: false,
            response: NextResponse.json({
              error: 'Invalid JSON',
              message: 'Request body is not valid JSON'
            }, { status: 400 })
          };
        }
      }

      return { allowed: true };

    } catch (error) {
      logger.error('Input sanitization error', error as Error);
      return {
        allowed: false,
        response: NextResponse.json({
          error: 'Input validation failed',
          message: 'Unable to validate request input'
        }, { status: 500 })
      };
    }
  }

  /**
   * Get CORS headers
   */
  private static getCORSHeaders(origin?: string | null): Record<string, string> {
    const allowedOrigin = this.config.corsOrigins[0] === '*' ? '*' : 
                         (origin && this.config.corsOrigins.includes(origin)) ? origin : 
                         this.config.corsOrigins[0];

    return {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'true'
    };
  }

  /**
   * Get client identifier for rate limiting
   */
  private static getClientIdentifier(request: NextRequest): string {
    // Try to get API key first, then fall back to IP
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      return `api:${apiKey}`;
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Clean up old rate limit entries
   */
  private static cleanupRateLimit(windowStart: number): void {
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (entry.resetTime < windowStart) {
        this.rateLimitStore.delete(key);
      }
    }
  }

  /**
   * Get valid API keys (in production, load from database)
   */
  private static getValidApiKeys(): Map<string, { userId: string; permissions: string[] }> {
    const keys = new Map();
    
    // Demo keys - in production, load from secure storage
    keys.set('demo_key_12345', {
      userId: 'demo_user',
      permissions: ['read', 'export']
    });
    
    keys.set('admin_key_67890', {
      userId: 'admin_user',
      permissions: ['admin', 'read', 'write', 'export', 'webhook']
    });

    return keys;
  }

  /**
   * Apply security headers to response
   */
  static applySecurityHeaders(response: NextResponse, origin?: string): NextResponse {
    if (!this.config.securityHeaders) {
      return response;
    }

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Content Security Policy
    response.headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https:; " +
      "font-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
    );

    // CORS headers
    const corsHeaders = this.getCORSHeaders(origin);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  /**
   * Update security configuration
   */
  static updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Security configuration updated', { config: this.config });
  }

  /**
   * Get current security configuration
   */
  static getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

/**
 * Input validation utilities
 */
export class InputValidator {
  /**
   * Validate and sanitize string input
   */
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove potentially dangerous characters
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();

    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate numeric input
   */
  static validateNumber(
    input: any, 
    min?: number, 
    max?: number
  ): { valid: boolean; value?: number; error?: string } {
    const num = Number(input);
    
    if (isNaN(num)) {
      return { valid: false, error: 'Input must be a valid number' };
    }

    if (min !== undefined && num < min) {
      return { valid: false, error: `Number must be at least ${min}` };
    }

    if (max !== undefined && num > max) {
      return { valid: false, error: `Number must be at most ${max}` };
    }

    return { valid: true, value: num };
  }

  /**
   * Validate array input
   */
  static validateArray(
    input: any, 
    maxLength?: number,
    itemValidator?: (item: any) => boolean
  ): { valid: boolean; value?: any[]; error?: string } {
    if (!Array.isArray(input)) {
      return { valid: false, error: 'Input must be an array' };
    }

    if (maxLength !== undefined && input.length > maxLength) {
      return { valid: false, error: `Array must have at most ${maxLength} items` };
    }

    if (itemValidator) {
      for (let i = 0; i < input.length; i++) {
        if (!itemValidator(input[i])) {
          return { valid: false, error: `Invalid item at index ${i}` };
        }
      }
    }

    return { valid: true, value: input };
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Validate URL format
   */
  static validateURL(url: string): { valid: boolean; error?: string } {
    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
}

/**
 * Security audit logging
 */
export class SecurityAudit {
  private static auditLog: Array<{
    timestamp: Date;
    event: string;
    details: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  /**
   * Log security event
   */
  static logEvent(
    event: string, 
    details: any, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): void {
    const entry = {
      timestamp: new Date(),
      event,
      details,
      severity
    };

    this.auditLog.push(entry);
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    // Log to main logger based on severity
    switch (severity) {
      case 'critical':
        logger.fatal(`Security: ${event}`, undefined, details);
        break;
      case 'high':
        logger.error(`Security: ${event}`, undefined, details);
        break;
      case 'medium':
        logger.warn(`Security: ${event}`, details);
        break;
      case 'low':
        logger.info(`Security: ${event}`, details);
        break;
    }
  }

  /**
   * Get security audit log
   */
  static getAuditLog(since?: Date): typeof SecurityAudit.auditLog {
    if (!since) return [...this.auditLog];
    
    return this.auditLog.filter(entry => entry.timestamp >= since);
  }

  /**
   * Get security statistics
   */
  static getSecurityStats(since?: Date): {
    totalEvents: number;
    eventsBySeverity: Record<string, number>;
    eventsByType: Record<string, number>;
  } {
    const events = this.getAuditLog(since);
    
    const eventsBySeverity: Record<string, number> = {};
    const eventsByType: Record<string, number> = {};

    events.forEach(event => {
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      eventsByType[event.event] = (eventsByType[event.event] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      eventsBySeverity,
      eventsByType
    };
  }
}