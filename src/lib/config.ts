/**
 * Configuration Management System
 * Handles environment variables, validation, and secure configuration
 */

import { logger } from './monitoring';

export interface AppConfig {
  // Environment
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  
  // API Keys
  polygonApiKey?: string;
  twelveDataApiKey?: string;
  tradierApiKey?: string;
  
  // Database (if used)
  databaseUrl?: string;
  
  // Security
  jwtSecret?: string;
  encryptionKey?: string;
  corsOrigins: string[];
  
  // Rate Limiting
  rateLimitWindow: number;
  rateLimitMax: number;
  
  // Caching
  cacheEnabled: boolean;
  cacheTtl: number;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logToFile: boolean;
  
  // Features
  webhooksEnabled: boolean;
  exportEnabled: boolean;
  
  // Performance
  maxConcurrentRequests: number;
  requestTimeout: number;
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Configuration manager with validation and hot-reloading
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private watchers: Array<(config: AppConfig) => void> = [];

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from environment variables
   */
  private loadConfiguration(): AppConfig {
    const config: AppConfig = {
      // Environment
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      
      // API Keys
      polygonApiKey: process.env.POLYGON_API_KEY,
      twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
      tradierApiKey: process.env.TRADIER_API_KEY,
      
      // Database
      databaseUrl: process.env.DATABASE_URL,
      
      // Security
      jwtSecret: process.env.JWT_SECRET,
      encryptionKey: process.env.ENCRYPTION_KEY,
      corsOrigins: this.parseCorsOrigins(process.env.CORS_ORIGINS),
      
      // Rate Limiting
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      
      // Caching
      cacheEnabled: process.env.CACHE_ENABLED !== 'false',
      cacheTtl: parseInt(process.env.CACHE_TTL || '300000', 10), // 5 minutes
      
      // Logging
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      logToFile: process.env.LOG_TO_FILE === 'true',
      
      // Features
      webhooksEnabled: process.env.WEBHOOKS_ENABLED !== 'false',
      exportEnabled: process.env.EXPORT_ENABLED !== 'false',
      
      // Performance
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '100', 10),
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10)
    };

    logger.info('Configuration loaded', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      hasPolygonKey: !!config.polygonApiKey,
      hasTwelveDataKey: !!config.twelveDataApiKey,
      hasTradierKey: !!config.tradierApiKey,
      cacheEnabled: config.cacheEnabled,
      webhooksEnabled: config.webhooksEnabled
    });

    return config;
  }

  /**
   * Parse CORS origins from environment variable
   */
  private parseCorsOrigins(corsEnv?: string): string[] {
    if (!corsEnv) {
      return ['*']; // Default to allow all in development
    }

    return corsEnv.split(',').map(origin => origin.trim());
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields for production
    if (this.config.nodeEnv === 'production') {
      if (!this.config.jwtSecret) {
        errors.push('JWT_SECRET is required in production');
      }
      
      if (!this.config.encryptionKey) {
        errors.push('ENCRYPTION_KEY is required in production');
      }
      
      if (this.config.corsOrigins.includes('*')) {
        warnings.push('CORS is set to allow all origins in production');
      }
    }

    // Validate API keys
    if (!this.config.polygonApiKey) {
      warnings.push('POLYGON_API_KEY not set - market data may be limited');
    }
    
    if (!this.config.twelveDataApiKey) {
      warnings.push('TWELVE_DATA_API_KEY not set - VIX data may be unavailable');
    }
    
    if (!this.config.tradierApiKey) {
      warnings.push('TRADIER_API_KEY not set - options data may be unavailable');
    }

    // Validate numeric ranges
    if (this.config.port < 1 || this.config.port > 65535) {
      errors.push('PORT must be between 1 and 65535');
    }
    
    if (this.config.rateLimitMax < 1) {
      errors.push('RATE_LIMIT_MAX must be greater than 0');
    }
    
    if (this.config.cacheTtl < 1000) {
      warnings.push('CACHE_TTL is very low (< 1 second)');
    }

    // Validate log level
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(this.config.logLevel)) {
      errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`);
    }

    // Log validation results
    if (errors.length > 0) {
      logger.error('Configuration validation failed', undefined, { errors });
    }
    
    if (warnings.length > 0) {
      logger.warn('Configuration warnings', { warnings });
    }

    const result = {
      valid: errors.length === 0,
      errors,
      warnings
    };

    if (!result.valid) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Get current configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get specific configuration value
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  /**
   * Update configuration (for runtime changes)
   */
  updateConfig(updates: Partial<AppConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };
    
    // Validate updated configuration
    try {
      this.validateConfiguration();
      
      logger.info('Configuration updated', {
        changes: Object.keys(updates),
        oldValues: Object.fromEntries(
          Object.keys(updates).map(key => [key, oldConfig[key as keyof AppConfig]])
        ),
        newValues: updates
      });
      
      // Notify watchers
      this.notifyWatchers();
      
    } catch (error) {
      // Rollback on validation failure
      this.config = oldConfig;
      logger.error('Configuration update failed, rolled back', error as Error);
      throw error;
    }
  }

  /**
   * Watch for configuration changes
   */
  watch(callback: (config: AppConfig) => void): () => void {
    this.watchers.push(callback);
    
    // Return unwatch function
    return () => {
      const index = this.watchers.indexOf(callback);
      if (index > -1) {
        this.watchers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all watchers of configuration changes
   */
  private notifyWatchers(): void {
    this.watchers.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        logger.error('Configuration watcher error', error as Error);
      }
    });
  }

  /**
   * Reload configuration from environment
   */
  reload(): void {
    const oldConfig = { ...this.config };
    
    try {
      this.config = this.loadConfiguration();
      this.validateConfiguration();
      
      logger.info('Configuration reloaded successfully');
      this.notifyWatchers();
      
    } catch (error) {
      // Rollback on failure
      this.config = oldConfig;
      logger.error('Configuration reload failed, rolled back', error as Error);
      throw error;
    }
  }

  /**
   * Get configuration for specific environment
   */
  getEnvironmentConfig(): {
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
  } {
    return {
      isDevelopment: this.config.nodeEnv === 'development',
      isProduction: this.config.nodeEnv === 'production',
      isTest: this.config.nodeEnv === 'test'
    };
  }

  /**
   * Get API configuration
   */
  getApiConfig(): {
    hasPolygonKey: boolean;
    hasTwelveDataKey: boolean;
    hasTradierKey: boolean;
    enabledServices: string[];
  } {
    const enabledServices: string[] = [];
    
    if (this.config.polygonApiKey) enabledServices.push('polygon');
    if (this.config.twelveDataApiKey) enabledServices.push('twelveData');
    if (this.config.tradierApiKey) enabledServices.push('tradier');

    return {
      hasPolygonKey: !!this.config.polygonApiKey,
      hasTwelveDataKey: !!this.config.twelveDataApiKey,
      hasTradierKey: !!this.config.tradierApiKey,
      enabledServices
    };
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): {
    corsOrigins: string[];
    rateLimitWindow: number;
    rateLimitMax: number;
    hasJwtSecret: boolean;
    hasEncryptionKey: boolean;
  } {
    return {
      corsOrigins: [...this.config.corsOrigins],
      rateLimitWindow: this.config.rateLimitWindow,
      rateLimitMax: this.config.rateLimitMax,
      hasJwtSecret: !!this.config.jwtSecret,
      hasEncryptionKey: !!this.config.encryptionKey
    };
  }

  /**
   * Export configuration (without sensitive data)
   */
  exportSafeConfig(): Omit<AppConfig, 'polygonApiKey' | 'twelveDataApiKey' | 'tradierApiKey' | 'jwtSecret' | 'encryptionKey' | 'databaseUrl'> {
    const { 
      polygonApiKey, 
      twelveDataApiKey, 
      tradierApiKey, 
      jwtSecret, 
      encryptionKey, 
      databaseUrl, 
      ...safeConfig 
    } = this.config;
    
    return safeConfig;
  }
}

/**
 * Environment variable utilities
 */
export class EnvUtils {
  /**
   * Get required environment variable
   */
  static getRequired(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  /**
   * Get optional environment variable with default
   */
  static getOptional(name: string, defaultValue: string): string {
    return process.env[name] || defaultValue;
  }

  /**
   * Get boolean environment variable
   */
  static getBoolean(name: string, defaultValue: boolean = false): boolean {
    const value = process.env[name];
    if (!value) return defaultValue;
    
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  /**
   * Get number environment variable
   */
  static getNumber(name: string, defaultValue: number): number {
    const value = process.env[name];
    if (!value) return defaultValue;
    
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Environment variable ${name} must be a valid number`);
    }
    
    return parsed;
  }

  /**
   * Get array environment variable (comma-separated)
   */
  static getArray(name: string, defaultValue: string[] = []): string[] {
    const value = process.env[name];
    if (!value) return defaultValue;
    
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }

  /**
   * Validate all required environment variables
   */
  static validateRequired(requiredVars: string[]): void {
    const missing = requiredVars.filter(name => !process.env[name]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

/**
 * Configuration schema for validation
 */
export const ConfigSchema = {
  nodeEnv: {
    type: 'string' as const,
    enum: ['development', 'production', 'test'],
    required: false,
    default: 'development'
  },
  port: {
    type: 'number' as const,
    min: 1,
    max: 65535,
    required: false,
    default: 3000
  },
  polygonApiKey: {
    type: 'string' as const,
    required: false,
    sensitive: true
  },
  twelveDataApiKey: {
    type: 'string' as const,
    required: false,
    sensitive: true
  },
  tradierApiKey: {
    type: 'string' as const,
    required: false,
    sensitive: true
  },
  corsOrigins: {
    type: 'array' as const,
    required: false,
    default: ['*']
  },
  rateLimitWindow: {
    type: 'number' as const,
    min: 1000,
    required: false,
    default: 900000
  },
  rateLimitMax: {
    type: 'number' as const,
    min: 1,
    required: false,
    default: 100
  },
  logLevel: {
    type: 'string' as const,
    enum: ['debug', 'info', 'warn', 'error'],
    required: false,
    default: 'info'
  }
};

// Export singleton instance
export const config = ConfigManager.getInstance();