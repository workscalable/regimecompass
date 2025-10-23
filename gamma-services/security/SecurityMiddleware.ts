import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { AuthenticationService, User } from './AuthenticationService';

export interface AuthenticatedRequest extends Request {
  user?: User;
  correlationId?: string;
}

export interface SecurityConfig {
  jwtSecret: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  corsOrigins: string[];
  trustedProxies: string[];
}

export class SecurityMiddleware {
  private authService: AuthenticationService;
  private config: SecurityConfig;

  constructor(authService: AuthenticationService, config: SecurityConfig) {
    this.authService = authService;
    this.config = config;
  }

  /**
   * Authentication middleware
   */
  authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const token = authHeader.substring(7);
      const user = await this.authService.verifyToken(token);
      
      req.user = user;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };

  /**
   * Optional authentication middleware
   */
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const user = await this.authService.verifyToken(token);
        req.user = user;
      }
      
      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  };

  /**
   * Authorization middleware - check if user has required permissions
   */
  authorize = (requiredPermissions: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // In a production system, you would check user permissions
      // For now, we'll just check if user is active
      if (!req.user.isActive) {
        res.status(403).json({ error: 'Account is deactivated' });
        return;
      }

      next();
    };
  };

  /**
   * Rate limiting middleware
   */
  createRateLimit = (windowMs: number = this.config.rateLimitWindowMs, max: number = this.config.rateLimitMax) => {
    return rateLimit({
      windowMs,
      max,
      message: {
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  };

  /**
   * API key validation middleware
   */
  validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({ error: 'API key required' });
      return;
    }

    // In a production system, you would validate against a database
    if (!this.isValidApiKey(apiKey)) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    next();
  };

  /**
   * CORS middleware
   */
  cors = (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    
    if (this.config.corsOrigins.includes(origin as string) || process.env.NODE_ENV === 'development') {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    next();
  };

  /**
   * Security headers middleware
   */
  securityHeaders = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });

  /**
   * Request logging middleware
   */
  requestLogger = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId();
    
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip} - ${correlationId}`);
    
    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${correlationId}`);
    });
    
    next();
  };

  /**
   * Input validation middleware
   */
  validateInput = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Basic input validation
        if (req.body && typeof req.body === 'object') {
          this.sanitizeInput(req.body);
        }
        
        if (req.query && typeof req.query === 'object') {
          this.sanitizeInput(req.query);
        }
        
        next();
      } catch (error) {
        res.status(400).json({ error: 'Invalid input data' });
      }
    };
  };

  /**
   * Error handling middleware
   */
  errorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
    console.error(`[${new Date().toISOString()}] Error:`, error);
    
    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Internal server error' });
    } else {
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  };

  /**
   * Account ownership validation
   */
  validateAccountOwnership = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const accountId = req.params.accountId;
    
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // In a production system, you would check if the user owns the account
    // For now, we'll just validate the format
    if (!this.isValidUUID(accountId)) {
      res.status(400).json({ error: 'Invalid account ID' });
      return;
    }
    
    next();
  };

  /**
   * Trading permissions validation
   */
  validateTradingPermissions = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!req.user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }
    
    // In a production system, you would check trading permissions
    next();
  };

  /**
   * Admin permissions validation
   */
  validateAdminPermissions = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // In a production system, you would check admin permissions
    // For now, we'll just check if user is active
    if (!req.user.isActive) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };

  private isValidApiKey(apiKey: string): boolean {
    // In a production system, you would validate against a database
    return apiKey.startsWith('rc_') && apiKey.length === 32;
  }

  private generateCorrelationId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeInput(obj: any): void {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potentially dangerous characters
        obj[key] = obj[key].replace(/[<>]/g, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeInput(obj[key]);
      }
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}
