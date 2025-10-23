/**
 * Configuration Management System for Paper Trading
 * Handles environment-specific configurations, validation, and hot-reloading
 */

import { logger } from '../logging/Logger';
import { auditLogger } from '../logging/AuditLogger';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionTimeout: number;
  maxConnections: number;
  retryAttempts: number;
}

export interface ApiConfig {
  polygon: {
    apiKey: string;
    baseUrl: string;
    rateLimit: number;
    timeout: number;
    retryAttempts: number;
  };
  tradier: {
    apiKey: string;
    baseUrl: string;
    rateLimit: number;
    timeout: number;
    retryAttempts: number;
  };
}

export interface TradingConfig {
  defaultAccountBalance: number;
  maxPositionsPerAccount: number;
  maxRiskPerTrade: number;
  maxPortfolioHeat: number;
  maxDrawdown: number;
  positionSizeMultiplier: number;
  profitTargetMultiple: number;
  stopLossPercent: number;
  timeDecayThreshold: number;
  maxConsecutiveLosses: number;
  confidenceThresholds: {
    high: number;
    medium: number;
    low: number;
  };
  expirationDays: {
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}

export interface MonitoringConfig {
  healthCheckInterval: number;
  metricsRetentionDays: number;
  alertCooldownMs: number;
  performanceThresholds: {
    tradeExecution: number;
    positionUpdate: number;
    optionsChainFetch: number;
    pnlCalculation: number;
    riskCheck: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    timeoutMs: number;
    monitoringWindowMs: number;
  };
}

export interface LoggingConfig {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  outputs: {
    console: {
      enabled: boolean;
      colorize: boolean;
    };
    file: {
      enabled: boolean;
      path: string;
      maxSize: string;
      maxFiles: number;
      rotateDaily: boolean;
    };
    remote: {
      enabled: boolean;
      endpoint: string;
      apiKey: string;
      batchSize: number;
      flushInterval: number;
    };
  };
  auditRetentionDays: number;
}

export interface AlertingConfig {
  channels: {
    email: {
      enabled: boolean;
      smtp: {
        host: string;
        port: number;
        secure: boolean;
        auth: {
          user: string;
          pass: string;
        };
      };
      recipients: string[];
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
      username: string;
    };
    webhook: {
      enabled: boolean;
      url: string;
      headers: Record<string, string>;
      timeout: number;
    };
  };
  rules: {
    criticalErrorCooldown: number;
    highErrorRateCooldown: number;
    tradeFailureCooldown: number;
    riskViolationCooldown: number;
  };
}

export interface PaperTradingConfig {
  database: DatabaseConfig;
  apis: ApiConfig;
  trading: TradingConfig;
  monitoring: MonitoringConfig;
  logging: LoggingConfig;
  alerting: AlertingConfig;
  environment: 'development' | 'staging' | 'production';
  version: string;
  features: {
    syntheticPricing: boolean;
    multiTickerSupport: boolean;
    learningEngine: boolean;
    performanceAnalytics: boolean;
    riskManagement: boolean;
  };
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value?: any;
}

export class ConfigManager {
  private config: PaperTradingConfig | null = null;
  private configPath: string;
  private watchers: Map<string, (config: PaperTradingConfig) => void> = new Map();
  private validationErrors: ConfigValidationError[] = [];

  constructor(configPath: string = './config/paper-trading-config.json') {
    this.configPath = configPath;
  }

  /**
   * Load configuration from file and environment variables
   */
  async loadConfig(): Promise<PaperTradingConfig> {
    try {
      // Load base configuration from file
      const baseConfig = await this.loadConfigFile();
      
      // Override with environment variables
      const config = this.applyEnvironmentOverrides(baseConfig);
      
      // Validate configuration
      const validationErrors = this.validateConfig(config);
      if (validationErrors.length > 0) {
        this.validationErrors = validationErrors;
        throw new Error(`Configuration validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
      }

      this.config = config;
      
      await logger.info('SYSTEM', 'Configuration loaded successfully', {
        metadata: {
          environment: config.environment,
          version: config.version,
          configPath: this.configPath
        }
      });

      await auditLogger.logConfigurationChanged(
        'system-config',
        null,
        'loaded',
        {
          component: 'ConfigManager',
          metadata: { 
            environment: config.environment,
            version: config.version,
            featuresEnabled: Object.keys(config.features).filter(key => config.features[key as keyof typeof config.features])
          }
        }
      );

      // Notify watchers
      this.notifyWatchers(config);

      return config;
    } catch (error) {
      await logger.error('SYSTEM', 'Failed to load configuration', {
        metadata: {
          configPath: this.configPath,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }, error as Error);
      
      throw error;
    }
  }

  /**
   * Load configuration from file
   */
  private async loadConfigFile(): Promise<PaperTradingConfig> {
    try {
      // In a real implementation, this would read from the file system
      // For now, we'll return a default configuration
      return this.getDefaultConfig();
    } catch (error) {
      await logger.warn('SYSTEM', 'Config file not found, using defaults', {
        metadata: {
          configPath: this.configPath
        }
      });
      
      return this.getDefaultConfig();
    }
  }

  /**
   * Apply environment variable overrides
   */
  private applyEnvironmentOverrides(config: PaperTradingConfig): PaperTradingConfig {
    const overriddenConfig = { ...config };

    // Database overrides
    if (process.env.DB_HOST) overriddenConfig.database.host = process.env.DB_HOST;
    if (process.env.DB_PORT) overriddenConfig.database.port = parseInt(process.env.DB_PORT);
    if (process.env.DB_NAME) overriddenConfig.database.database = process.env.DB_NAME;
    if (process.env.DB_USER) overriddenConfig.database.username = process.env.DB_USER;
    if (process.env.DB_PASSWORD) overriddenConfig.database.password = process.env.DB_PASSWORD;
    if (process.env.DB_SSL) overriddenConfig.database.ssl = process.env.DB_SSL === 'true';

    // API overrides
    if (process.env.POLYGON_API_KEY) overriddenConfig.apis.polygon.apiKey = process.env.POLYGON_API_KEY;
    if (process.env.TRADIER_API_KEY) overriddenConfig.apis.tradier.apiKey = process.env.TRADIER_API_KEY;

    // Trading overrides
    if (process.env.DEFAULT_ACCOUNT_BALANCE) {
      overriddenConfig.trading.defaultAccountBalance = parseFloat(process.env.DEFAULT_ACCOUNT_BALANCE);
    }
    if (process.env.MAX_RISK_PER_TRADE) {
      overriddenConfig.trading.maxRiskPerTrade = parseFloat(process.env.MAX_RISK_PER_TRADE);
    }

    // Environment
    if (process.env.NODE_ENV) {
      overriddenConfig.environment = process.env.NODE_ENV as 'development' | 'staging' | 'production';
    }

    // Logging overrides
    if (process.env.LOG_LEVEL) {
      overriddenConfig.logging.level = process.env.LOG_LEVEL as any;
    }

    // Alerting overrides
    if (process.env.SMTP_HOST) overriddenConfig.alerting.channels.email.smtp.host = process.env.SMTP_HOST;
    if (process.env.SMTP_USER) overriddenConfig.alerting.channels.email.smtp.auth.user = process.env.SMTP_USER;
    if (process.env.SMTP_PASS) overriddenConfig.alerting.channels.email.smtp.auth.pass = process.env.SMTP_PASS;
    if (process.env.SLACK_WEBHOOK_URL) overriddenConfig.alerting.channels.slack.webhookUrl = process.env.SLACK_WEBHOOK_URL;

    return overriddenConfig;
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: PaperTradingConfig): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    // Validate database configuration
    if (!config.database.host) {
      errors.push({ path: 'database.host', message: 'Database host is required' });
    }
    if (!config.database.username) {
      errors.push({ path: 'database.username', message: 'Database username is required' });
    }
    if (!config.database.password) {
      errors.push({ path: 'database.password', message: 'Database password is required' });
    }
    if (config.database.port < 1 || config.database.port > 65535) {
      errors.push({ path: 'database.port', message: 'Database port must be between 1 and 65535', value: config.database.port });
    }

    // Validate API configuration
    if (!config.apis.polygon.apiKey) {
      errors.push({ path: 'apis.polygon.apiKey', message: 'Polygon API key is required' });
    }
    if (!config.apis.tradier.apiKey) {
      errors.push({ path: 'apis.tradier.apiKey', message: 'Tradier API key is required' });
    }

    // Validate trading configuration
    if (config.trading.defaultAccountBalance <= 0) {
      errors.push({ path: 'trading.defaultAccountBalance', message: 'Default account balance must be positive', value: config.trading.defaultAccountBalance });
    }
    if (config.trading.maxRiskPerTrade <= 0 || config.trading.maxRiskPerTrade > 1) {
      errors.push({ path: 'trading.maxRiskPerTrade', message: 'Max risk per trade must be between 0 and 1', value: config.trading.maxRiskPerTrade });
    }
    if (config.trading.maxPortfolioHeat <= 0 || config.trading.maxPortfolioHeat > 1) {
      errors.push({ path: 'trading.maxPortfolioHeat', message: 'Max portfolio heat must be between 0 and 1', value: config.trading.maxPortfolioHeat });
    }

    // Validate confidence thresholds
    const { confidenceThresholds } = config.trading;
    if (confidenceThresholds.low >= confidenceThresholds.medium || confidenceThresholds.medium >= confidenceThresholds.high) {
      errors.push({ path: 'trading.confidenceThresholds', message: 'Confidence thresholds must be in ascending order (low < medium < high)' });
    }

    // Validate monitoring configuration
    if (config.monitoring.healthCheckInterval < 1000) {
      errors.push({ path: 'monitoring.healthCheckInterval', message: 'Health check interval must be at least 1000ms', value: config.monitoring.healthCheckInterval });
    }

    // Validate performance thresholds
    Object.entries(config.monitoring.performanceThresholds).forEach(([key, value]) => {
      if (value <= 0) {
        errors.push({ path: `monitoring.performanceThresholds.${key}`, message: 'Performance threshold must be positive', value });
      }
    });

    // Validate logging configuration
    const validLogLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    if (!validLogLevels.includes(config.logging.level)) {
      errors.push({ path: 'logging.level', message: 'Invalid log level', value: config.logging.level });
    }

    // Validate alerting configuration
    if (config.alerting.channels.email.enabled) {
      if (!config.alerting.channels.email.smtp.host) {
        errors.push({ path: 'alerting.channels.email.smtp.host', message: 'SMTP host is required when email is enabled' });
      }
      if (config.alerting.channels.email.recipients.length === 0) {
        errors.push({ path: 'alerting.channels.email.recipients', message: 'At least one email recipient is required when email is enabled' });
      }
    }

    if (config.alerting.channels.slack.enabled && !config.alerting.channels.slack.webhookUrl) {
      errors.push({ path: 'alerting.channels.slack.webhookUrl', message: 'Slack webhook URL is required when Slack is enabled' });
    }

    // Validate environment
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(config.environment)) {
      errors.push({ path: 'environment', message: 'Invalid environment', value: config.environment });
    }

    return errors;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): PaperTradingConfig {
    return {
      database: {
        host: 'localhost',
        port: 5432,
        database: 'paper_trading',
        username: 'postgres',
        password: 'password',
        ssl: false,
        connectionTimeout: 30000,
        maxConnections: 10,
        retryAttempts: 3
      },
      apis: {
        polygon: {
          apiKey: '',
          baseUrl: 'https://api.polygon.io',
          rateLimit: 5,
          timeout: 10000,
          retryAttempts: 3
        },
        tradier: {
          apiKey: '',
          baseUrl: 'https://api.tradier.com',
          rateLimit: 10,
          timeout: 10000,
          retryAttempts: 3
        }
      },
      trading: {
        defaultAccountBalance: 100000,
        maxPositionsPerAccount: 50,
        maxRiskPerTrade: 0.02,
        maxPortfolioHeat: 0.20,
        maxDrawdown: 0.10,
        positionSizeMultiplier: 1.0,
        profitTargetMultiple: 2.0,
        stopLossPercent: 0.50,
        timeDecayThreshold: 0.10,
        maxConsecutiveLosses: 3,
        confidenceThresholds: {
          high: 0.8,
          medium: 0.6,
          low: 0.4
        },
        expirationDays: {
          highConfidence: 14,
          mediumConfidence: 7,
          lowConfidence: 3
        }
      },
      monitoring: {
        healthCheckInterval: 30000,
        metricsRetentionDays: 30,
        alertCooldownMs: 300000,
        performanceThresholds: {
          tradeExecution: 500,
          positionUpdate: 100,
          optionsChainFetch: 2000,
          pnlCalculation: 50,
          riskCheck: 100
        },
        circuitBreaker: {
          failureThreshold: 5,
          timeoutMs: 60000,
          monitoringWindowMs: 300000
        }
      },
      logging: {
        level: 'INFO',
        outputs: {
          console: {
            enabled: true,
            colorize: true
          },
          file: {
            enabled: true,
            path: './logs/paper-trading.log',
            maxSize: '10MB',
            maxFiles: 5,
            rotateDaily: true
          },
          remote: {
            enabled: false,
            endpoint: '',
            apiKey: '',
            batchSize: 100,
            flushInterval: 10000
          }
        },
        auditRetentionDays: 90
      },
      alerting: {
        channels: {
          email: {
            enabled: false,
            smtp: {
              host: '',
              port: 587,
              secure: false,
              auth: {
                user: '',
                pass: ''
              }
            },
            recipients: []
          },
          slack: {
            enabled: false,
            webhookUrl: '',
            channel: '#alerts',
            username: 'Paper Trading Bot'
          },
          webhook: {
            enabled: false,
            url: '',
            headers: {},
            timeout: 5000
          }
        },
        rules: {
          criticalErrorCooldown: 300000,
          highErrorRateCooldown: 600000,
          tradeFailureCooldown: 60000,
          riskViolationCooldown: 180000
        }
      },
      environment: 'development',
      version: '1.0.0',
      features: {
        syntheticPricing: true,
        multiTickerSupport: true,
        learningEngine: true,
        performanceAnalytics: true,
        riskManagement: true
      }
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): PaperTradingConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Get configuration section
   */
  getSection<K extends keyof PaperTradingConfig>(section: K): PaperTradingConfig[K] {
    return this.getConfig()[section];
  }

  /**
   * Update configuration section
   */
  async updateSection<K extends keyof PaperTradingConfig>(
    section: K, 
    updates: Partial<PaperTradingConfig[K]>,
    userId?: string
  ): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }

    const sectionConfig = this.config[section];
    const oldValue = sectionConfig && typeof sectionConfig === 'object' ? { ...sectionConfig } : {};
    const newValue = sectionConfig && typeof sectionConfig === 'object' ? { ...sectionConfig, ...updates } : { ...updates };

    // Validate the updated configuration
    const tempConfig = { ...this.config, [section]: newValue };
    const validationErrors = this.validateConfig(tempConfig);
    
    if (validationErrors.length > 0) {
      throw new Error(`Configuration validation failed: ${validationErrors.map(e => e.message).join(', ')}`);
    }

    // Apply the update
    this.config[section] = newValue as any;

    await logger.info('SYSTEM', `Configuration section updated: ${section}`, {
      metadata: {
        section,
        userId,
        changes: updates
      }
    });

    await auditLogger.logConfigurationChanged(
      `config.${section}`,
      oldValue,
      newValue,
      {
        userId,
        component: 'ConfigManager',
        metadata: { section, changes: updates }
      }
    );

    // Notify watchers
    this.notifyWatchers(this.config);

    // Save to file (in a real implementation)
    await this.saveConfigFile();
  }

  /**
   * Watch for configuration changes
   */
  watch(watcherId: string, callback: (config: PaperTradingConfig) => void): void {
    this.watchers.set(watcherId, callback);
  }

  /**
   * Stop watching configuration changes
   */
  unwatch(watcherId: string): void {
    this.watchers.delete(watcherId);
  }

  /**
   * Notify all watchers of configuration changes
   */
  private notifyWatchers(config: PaperTradingConfig): void {
    for (const [watcherId, callback] of this.watchers) {
      try {
        callback(config);
      } catch (error) {
        logger.error('SYSTEM', `Configuration watcher error: ${watcherId}`, {
          metadata: {
            watcherId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }, error as Error);
      }
    }
  }

  /**
   * Save configuration to file
   */
  private async saveConfigFile(): Promise<void> {
    try {
      // In a real implementation, this would write to the file system
      await logger.debug('SYSTEM', 'Configuration saved to file', {
        metadata: {
          configPath: this.configPath
        }
      });
    } catch (error) {
      await logger.error('SYSTEM', 'Failed to save configuration file', {
        metadata: {
          configPath: this.configPath,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }, error as Error);
    }
  }

  /**
   * Reload configuration from file
   */
  async reloadConfig(): Promise<PaperTradingConfig> {
    await logger.info('SYSTEM', 'Reloading configuration', {
      metadata: {
        configPath: this.configPath
      }
    });

    return await this.loadConfig();
  }

  /**
   * Get validation errors
   */
  getValidationErrors(): ConfigValidationError[] {
    return [...this.validationErrors];
  }

  /**
   * Validate environment variables
   */
  validateEnvironmentVariables(): { valid: boolean; missing: string[]; invalid: string[] } {
    const required = [
      'DB_HOST',
      'DB_USER', 
      'DB_PASSWORD',
      'POLYGON_API_KEY',
      'TRADIER_API_KEY'
    ];

    const optional = [
      'DB_PORT',
      'DB_NAME',
      'DB_SSL',
      'NODE_ENV',
      'LOG_LEVEL',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS',
      'SLACK_WEBHOOK_URL'
    ];

    const missing: string[] = [];
    const invalid: string[] = [];

    // Check required variables
    for (const varName of required) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    // Validate specific formats
    if (process.env.DB_PORT && isNaN(parseInt(process.env.DB_PORT))) {
      invalid.push('DB_PORT (must be a number)');
    }

    if (process.env.NODE_ENV && !['development', 'staging', 'production'].includes(process.env.NODE_ENV)) {
      invalid.push('NODE_ENV (must be development, staging, or production)');
    }

    if (process.env.LOG_LEVEL && !['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'].includes(process.env.LOG_LEVEL)) {
      invalid.push('LOG_LEVEL (must be DEBUG, INFO, WARN, ERROR, or CRITICAL)');
    }

    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid
    };
  }

  /**
   * Get configuration summary for monitoring
   */
  getConfigSummary(): {
    environment: string;
    version: string;
    featuresEnabled: string[];
    databaseConnected: boolean;
    apisConfigured: boolean;
    alertingEnabled: boolean;
    loggingLevel: string;
  } {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    return {
      environment: this.config.environment,
      version: this.config.version,
      featuresEnabled: Object.keys(this.config.features).filter(
        key => this.config!.features[key as keyof typeof this.config.features]
      ),
      databaseConnected: !!(this.config.database.host && this.config.database.username),
      apisConfigured: !!(this.config.apis.polygon.apiKey && this.config.apis.tradier.apiKey),
      alertingEnabled: Object.values(this.config.alerting.channels).some(channel => channel.enabled),
      loggingLevel: this.config.logging.level
    };
  }
}

// Export singleton instance
export const configManager = new ConfigManager();