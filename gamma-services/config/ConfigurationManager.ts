import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration Manager for Gamma Adaptive System
 * 
 * Provides comprehensive configuration management with:
 * - Hot-reload capabilities without system restart
 * - Schema validation and error handling
 * - Environment-specific configuration support
 * - Real-time configuration change notifications
 * - Backup and rollback functionality
 */

export interface GammaAdaptiveConfig {
  // System metadata
  version: string;
  environment: 'development' | 'staging' | 'production';
  lastModified: string;
  
  // Orchestrator configuration
  orchestrator: {
    watchlist: string[];
    maxConcurrentTrades: number;
    confidenceThreshold: number;
    fibZoneBlocklist: string[];
    updateInterval: number;
    priorityWeights: Record<string, number>;
    cooldownPeriod: number;
    maxTickersPerWorker: number;
  };
  
  // Signal processing configuration
  signalProcessing: {
    weights: {
      trendComposite: number;
      momentumDivergence: number;
      volumeProfile: number;
      ribbonAlignment: number;
      fibConfluence: number;
      gammaExposure: number;
    };
    thresholds: {
      minConfidence: number;
      maxConfidence: number;
      convictionMultiplier: number;
      regimeAdjustment: number;
    };
    adjustments: {
      regimeWeights: Record<string, number>;
      volatilityAdjustments: Record<string, number>;
      timeOfDayMultipliers: Record<string, number>;
    };
    caching: {
      enabled: boolean;
      ttlMinutes: number;
      maxCacheSize: number;
    };
  };
  
  // Risk management configuration
  riskManagement: {
    positionSizing: {
      maxRiskPerTrade: number;
      maxPortfolioHeat: number;
      maxDrawdown: number;
      confidenceMultipliers: {
        high: number;
        medium: number;
        low: number;
      };
      fibZoneMultipliers: Record<string, number>;
      regimeAdjustments: Record<string, number>;
      vixAdjustments: {
        low: number;
        medium: number;
        high: number;
      };
    };
    limits: {
      maxConsecutiveLosses: number;
      maxDailyLoss: number;
      vixThreshold: number;
      emergencyStopLoss: number;
    };
    drawdownProtection: {
      maxDrawdownThreshold: number;
      defensiveModeThreshold: number;
      recoveryThreshold: number;
      positionReductionFactor: number;
      defensiveModeMultiplier: number;
    };
    marketRiskAdjustments: {
      fibZoneMultipliers: Record<string, number>;
      vixThresholds: {
        low: number;
        medium: number;
        high: number;
        extreme: number;
      };
      vixMultipliers: {
        low: number;
        medium: number;
        high: number;
        extreme: number;
      };
      regimeMultipliers: Record<string, number>;
      emergencyOverrides: {
        enabled: boolean;
        maxReduction: number;
        triggerConditions: string[];
      };
    };
  };
  
  // Data provider configuration
  dataProviders: {
    primary: {
      name: string;
      apiKey: string;
      baseUrl: string;
      rateLimit: number;
      timeout: number;
    };
    fallback: {
      name: string;
      apiKey: string;
      baseUrl: string;
      rateLimit: number;
      timeout: number;
    };
    options: {
      name: string;
      apiKey: string;
      baseUrl: string;
      rateLimit: number;
    };
    vix: {
      name: string;
      apiKey: string;
      baseUrl: string;
      updateInterval: number;
    };
  };
  
  // Logging and monitoring
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableFile: boolean;
    filePath: string;
    maxFileSize: string;
    maxFiles: number;
    enableStructuredLogging: boolean;
    correlationIds: boolean;
  };
  
  // Performance and scaling
  performance: {
    maxConcurrentOperations: number;
    processingTimeout: number;
    memoryThreshold: number;
    cpuThreshold: number;
    healthCheckInterval: number;
    metricsCollection: {
      enabled: boolean;
      interval: number;
      retention: number;
    };
  };
  
  // Feature flags
  features: {
    paperTradingEnabled: boolean;
    liveTradingEnabled: boolean;
    learningSystemEnabled: boolean;
    dashboardEnabled: boolean;
    alertsEnabled: boolean;
    backtestingEnabled: boolean;
    apiEnabled: boolean;
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigError[];
  warnings: ConfigWarning[];
}

export interface ConfigError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ConfigWarning {
  path: string;
  message: string;
  recommendation: string;
}

export class ConfigurationManager extends EventEmitter {
  private config: GammaAdaptiveConfig;
  private configPath: string;
  private backupPath: string;
  private watchEnabled: boolean = true;
  private fileWatcher: fs.FSWatcher | null = null;
  private validationSchema: any;

  constructor(configPath: string = './gamma-adaptive-config.json') {
    super();
    this.configPath = path.resolve(configPath);
    this.backupPath = this.configPath.replace('.json', '.backup.json');
    this.validationSchema = this.createValidationSchema();
    this.config = this.loadConfiguration();
    this.setupFileWatcher();
  }

  /**
   * Get current configuration
   */
  public getConfig(): GammaAdaptiveConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Update configuration with validation
   */
  public async updateConfig(updates: Partial<GammaAdaptiveConfig>): Promise<ConfigValidationResult> {
    // Create backup of current config
    await this.createBackup();
    
    // Merge updates with current config
    const newConfig = this.deepMerge(this.config, updates);
    
    // Validate new configuration
    const validation = this.validateConfiguration(newConfig);
    
    if (!validation.isValid) {
      this.emit('configValidationFailed', validation);
      return validation;
    }
    
    // Apply configuration
    const previousConfig = this.config;
    this.config = newConfig;
    this.config.lastModified = new Date().toISOString();
    
    try {
      // Save to file
      await this.saveConfiguration();
      
      // Emit change event
      this.emit('configChanged', {
        previousConfig,
        newConfig: this.config,
        changes: this.getConfigChanges(previousConfig, this.config),
        timestamp: new Date()
      });
      
      return validation;
    } catch (error) {
      // Rollback on save failure
      this.config = previousConfig;
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Validate configuration against schema
   */
  public validateConfiguration(config: GammaAdaptiveConfig): ConfigValidationResult {
    const errors: ConfigError[] = [];
    const warnings: ConfigWarning[] = [];

    // Validate orchestrator settings
    this.validateOrchestrator(config.orchestrator, errors, warnings);
    
    // Validate signal processing settings
    this.validateSignalProcessing(config.signalProcessing, errors, warnings);
    
    // Validate risk management settings
    this.validateRiskManagement(config.riskManagement, errors, warnings);
    
    // Validate data providers
    this.validateDataProviders(config.dataProviders, errors, warnings);
    
    // Validate performance settings
    this.validatePerformance(config.performance, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }  /**
 
  * Get specific configuration section
   */
  public getConfigSection<T extends keyof GammaAdaptiveConfig>(section: T): GammaAdaptiveConfig[T] {
    return JSON.parse(JSON.stringify(this.config[section]));
  }

  /**
   * Update specific configuration section
   */
  public async updateConfigSection<T extends keyof GammaAdaptiveConfig>(
    section: T, 
    updates: Partial<GammaAdaptiveConfig[T]>
  ): Promise<ConfigValidationResult> {
    const sectionUpdate = { [section]: updates } as Partial<GammaAdaptiveConfig>;
    return this.updateConfig(sectionUpdate);
  }

  /**
   * Reload configuration from file
   */
  public async reloadConfiguration(): Promise<void> {
    try {
      const newConfig = this.loadConfiguration();
      const validation = this.validateConfiguration(newConfig);
      
      if (!validation.isValid) {
        this.emit('configReloadFailed', validation);
        throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      const previousConfig = this.config;
      this.config = newConfig;
      
      this.emit('configReloaded', {
        previousConfig,
        newConfig: this.config,
        timestamp: new Date()
      });
    } catch (error) {
      this.emit('configReloadError', error);
      throw error;
    }
  }

  /**
   * Restore configuration from backup
   */
  public async restoreFromBackup(): Promise<void> {
    if (!fs.existsSync(this.backupPath)) {
      throw new Error('No backup configuration found');
    }
    
    try {
      const backupConfig = JSON.parse(fs.readFileSync(this.backupPath, 'utf8'));
      const validation = this.validateConfiguration(backupConfig);
      
      if (!validation.isValid) {
        throw new Error(`Backup configuration is invalid: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      const previousConfig = this.config;
      this.config = backupConfig;
      
      await this.saveConfiguration();
      
      this.emit('configRestored', {
        previousConfig,
        restoredConfig: this.config,
        timestamp: new Date()
      });
    } catch (error) {
      this.emit('configRestoreError', error);
      throw error;
    }
  }

  /**
   * Export configuration to file
   */
  public async exportConfiguration(filePath: string): Promise<void> {
    try {
      const configJson = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(filePath, configJson, 'utf8');
      
      this.emit('configExported', {
        filePath,
        timestamp: new Date()
      });
    } catch (error) {
      this.emit('configExportError', error);
      throw error;
    }
  }

  /**
   * Import configuration from file
   */
  public async importConfiguration(filePath: string): Promise<ConfigValidationResult> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Configuration file not found: ${filePath}`);
      }
      
      const importedConfig = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const validation = this.validateConfiguration(importedConfig);
      
      if (validation.isValid) {
        await this.updateConfig(importedConfig);
        
        this.emit('configImported', {
          filePath,
          config: importedConfig,
          timestamp: new Date()
        });
      }
      
      return validation;
    } catch (error) {
      this.emit('configImportError', error);
      throw error;
    }
  }

  // Private helper methods

  private loadConfiguration(): GammaAdaptiveConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      } else {
        // Create default configuration if file doesn't exist
        const defaultConfig = this.createDefaultConfiguration();
        this.saveConfigurationSync(defaultConfig);
        return defaultConfig;
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      return this.createDefaultConfiguration();
    }
  }

  private async saveConfiguration(): Promise<void> {
    const configJson = JSON.stringify(this.config, null, 2);
    return new Promise((resolve, reject) => {
      fs.writeFile(this.configPath, configJson, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private saveConfigurationSync(config: GammaAdaptiveConfig): void {
    const configJson = JSON.stringify(config, null, 2);
    fs.writeFileSync(this.configPath, configJson, 'utf8');
  }

  private async createBackup(): Promise<void> {
    if (fs.existsSync(this.configPath)) {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      fs.writeFileSync(this.backupPath, configData, 'utf8');
    }
  }

  private setupFileWatcher(): void {
    if (!this.watchEnabled) return;
    
    try {
      this.fileWatcher = fs.watch(this.configPath, (eventType) => {
        if (eventType === 'change') {
          // Debounce file changes
          setTimeout(() => {
            this.reloadConfiguration().catch(error => {
              console.error('Failed to reload configuration:', error);
            });
          }, 1000);
        }
      });
    } catch (error) {
      console.warn('Failed to setup file watcher:', error);
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private getConfigChanges(oldConfig: GammaAdaptiveConfig, newConfig: GammaAdaptiveConfig): string[] {
    const changes: string[] = [];
    
    // This is a simplified implementation
    // In a real system, you'd want a more sophisticated diff algorithm
    const oldJson = JSON.stringify(oldConfig, null, 2);
    const newJson = JSON.stringify(newConfig, null, 2);
    
    if (oldJson !== newJson) {
      changes.push('Configuration updated');
    }
    
    return changes;
  }  // Validation methods

  private validateOrchestrator(orchestrator: any, errors: ConfigError[], warnings: ConfigWarning[]): void {
    if (!Array.isArray(orchestrator.watchlist) || orchestrator.watchlist.length === 0) {
      errors.push({
        path: 'orchestrator.watchlist',
        message: 'Watchlist must be a non-empty array',
        severity: 'error',
        code: 'INVALID_WATCHLIST'
      });
    }

    if (orchestrator.maxConcurrentTrades < 1 || orchestrator.maxConcurrentTrades > 10) {
      errors.push({
        path: 'orchestrator.maxConcurrentTrades',
        message: 'Max concurrent trades must be between 1 and 10',
        severity: 'error',
        code: 'INVALID_CONCURRENT_TRADES'
      });
    }

    if (orchestrator.confidenceThreshold < 0.5 || orchestrator.confidenceThreshold > 0.95) {
      warnings.push({
        path: 'orchestrator.confidenceThreshold',
        message: 'Confidence threshold outside recommended range (0.5-0.95)',
        recommendation: 'Consider using a threshold between 0.6 and 0.8'
      });
    }

    if (orchestrator.updateInterval < 1000 || orchestrator.updateInterval > 300000) {
      warnings.push({
        path: 'orchestrator.updateInterval',
        message: 'Update interval outside recommended range (1-300 seconds)',
        recommendation: 'Consider using an interval between 30-60 seconds'
      });
    }
  }

  private validateSignalProcessing(signalProcessing: any, errors: ConfigError[], warnings: ConfigWarning[]): void {
    const weights = signalProcessing.weights;
    const totalWeight = Object.values(weights).reduce((sum: number, weight: any) => sum + weight, 0);
    
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      errors.push({
        path: 'signalProcessing.weights',
        message: `Signal weights must sum to 1.0, current sum: ${totalWeight.toFixed(3)}`,
        severity: 'error',
        code: 'INVALID_WEIGHT_SUM'
      });
    }

    Object.entries(weights).forEach(([key, value]: [string, any]) => {
      if (value < 0 || value > 1) {
        errors.push({
          path: `signalProcessing.weights.${key}`,
          message: `Weight must be between 0 and 1, got: ${value}`,
          severity: 'error',
          code: 'INVALID_WEIGHT_VALUE'
        });
      }
    });

    const thresholds = signalProcessing.thresholds;
    if (thresholds.minConfidence >= thresholds.maxConfidence) {
      errors.push({
        path: 'signalProcessing.thresholds',
        message: 'Min confidence must be less than max confidence',
        severity: 'error',
        code: 'INVALID_THRESHOLD_RANGE'
      });
    }
  }

  private validateRiskManagement(riskManagement: any, errors: ConfigError[], warnings: ConfigWarning[]): void {
    const positionSizing = riskManagement.positionSizing;
    
    if (positionSizing.maxRiskPerTrade > 0.05) {
      warnings.push({
        path: 'riskManagement.positionSizing.maxRiskPerTrade',
        message: 'Risk per trade exceeds 5%, which is aggressive',
        recommendation: 'Consider reducing to 2-3% for better risk management'
      });
    }

    if (positionSizing.maxPortfolioHeat > 0.25) {
      errors.push({
        path: 'riskManagement.positionSizing.maxPortfolioHeat',
        message: 'Portfolio heat exceeds 25%, which is dangerous',
        severity: 'error',
        code: 'EXCESSIVE_PORTFOLIO_HEAT'
      });
    }

    // Validate Fibonacci zone multipliers
    const fibMultipliers = positionSizing.fibZoneMultipliers;
    if (fibMultipliers.EXHAUSTION !== 0) {
      errors.push({
        path: 'riskManagement.positionSizing.fibZoneMultipliers.EXHAUSTION',
        message: 'EXHAUSTION zone multiplier must be 0 (requirement)',
        severity: 'error',
        code: 'INVALID_EXHAUSTION_MULTIPLIER'
      });
    }

    // Validate VIX adjustments
    const vixAdjustments = riskManagement.marketRiskAdjustments?.vixMultipliers;
    if (vixAdjustments && vixAdjustments.high > 0.5) {
      errors.push({
        path: 'riskManagement.marketRiskAdjustments.vixMultipliers.high',
        message: 'High VIX multiplier must be <= 0.5 (50% reduction requirement)',
        severity: 'error',
        code: 'INVALID_VIX_MULTIPLIER'
      });
    }
  }

  private validateDataProviders(dataProviders: any, errors: ConfigError[], warnings: ConfigWarning[]): void {
    ['primary', 'fallback'].forEach(provider => {
      const config = dataProviders[provider];
      if (!config.apiKey || config.apiKey.length < 10) {
        errors.push({
          path: `dataProviders.${provider}.apiKey`,
          message: 'API key is required and must be at least 10 characters',
          severity: 'error',
          code: 'INVALID_API_KEY'
        });
      }

      if (!config.baseUrl || !config.baseUrl.startsWith('http')) {
        errors.push({
          path: `dataProviders.${provider}.baseUrl`,
          message: 'Base URL must be a valid HTTP/HTTPS URL',
          severity: 'error',
          code: 'INVALID_BASE_URL'
        });
      }

      if (config.rateLimit < 1 || config.rateLimit > 1000) {
        warnings.push({
          path: `dataProviders.${provider}.rateLimit`,
          message: 'Rate limit outside typical range (1-1000 requests/minute)',
          recommendation: 'Verify rate limit with your data provider'
        });
      }
    });
  }

  private validatePerformance(performance: any, errors: ConfigError[], warnings: ConfigWarning[]): void {
    if (performance.maxConcurrentOperations > 100) {
      warnings.push({
        path: 'performance.maxConcurrentOperations',
        message: 'High concurrent operations may impact performance',
        recommendation: 'Monitor system resources carefully'
      });
    }

    if (performance.processingTimeout < 1000) {
      warnings.push({
        path: 'performance.processingTimeout',
        message: 'Very short processing timeout may cause failures',
        recommendation: 'Consider increasing to at least 5 seconds'
      });
    }

    if (performance.memoryThreshold > 0.9) {
      errors.push({
        path: 'performance.memoryThreshold',
        message: 'Memory threshold too high, system may become unstable',
        severity: 'error',
        code: 'DANGEROUS_MEMORY_THRESHOLD'
      });
    }
  }

  private createValidationSchema(): any {
    // This would typically use a JSON Schema library like Ajv
    // For now, we'll use the validation methods above
    return {};
  }

  private createDefaultConfiguration(): GammaAdaptiveConfig {
    return {
      version: '1.0.0',
      environment: 'development',
      lastModified: new Date().toISOString(),
      
      orchestrator: {
        watchlist: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'NFLX'],
        maxConcurrentTrades: 3,
        confidenceThreshold: 0.62,
        fibZoneBlocklist: ['EXHAUSTION'],
        updateInterval: 30000,
        priorityWeights: {
          'SPY': 1.0,
          'QQQ': 0.9,
          'AAPL': 0.8
        },
        cooldownPeriod: 300000,
        maxTickersPerWorker: 5
      },
      
      signalProcessing: {
        weights: {
          trendComposite: 0.25,
          momentumDivergence: 0.20,
          volumeProfile: 0.20,
          ribbonAlignment: 0.15,
          fibConfluence: 0.10,
          gammaExposure: 0.10
        },
        thresholds: {
          minConfidence: 0.5,
          maxConfidence: 0.95,
          convictionMultiplier: 1.2,
          regimeAdjustment: 0.1
        },
        adjustments: {
          regimeWeights: {
            'BULL_MARKET': 1.1,
            'BEAR_MARKET': 0.9,
            'SIDEWAYS': 1.0
          },
          volatilityAdjustments: {
            'LOW': 1.0,
            'MEDIUM': 0.9,
            'HIGH': 0.8
          },
          timeOfDayMultipliers: {
            'MARKET_OPEN': 1.2,
            'MID_DAY': 1.0,
            'MARKET_CLOSE': 1.1
          }
        },
        caching: {
          enabled: true,
          ttlMinutes: 5,
          maxCacheSize: 1000
        }
      },
      
      riskManagement: {
        positionSizing: {
          maxRiskPerTrade: 0.02,
          maxPortfolioHeat: 0.20,
          maxDrawdown: 0.05,
          confidenceMultipliers: {
            high: 1.2,
            medium: 1.0,
            low: 0.8
          },
          fibZoneMultipliers: {
            'COMPRESSION': 1.2,
            'MID_EXPANSION': 1.0,
            'FULL_EXPANSION': 0.8,
            'OVER_EXTENSION': 0.4,
            'EXHAUSTION': 0.0
          },
          regimeAdjustments: {
            'BULL_MARKET': 1.1,
            'BEAR_MARKET': 0.8,
            'SIDEWAYS': 0.9
          },
          vixAdjustments: {
            low: 1.0,
            medium: 0.8,
            high: 0.5
          }
        },
        limits: {
          maxConsecutiveLosses: 2,
          maxDailyLoss: 0.03,
          vixThreshold: 30,
          emergencyStopLoss: 0.10
        },
        drawdownProtection: {
          maxDrawdownThreshold: 0.05,
          defensiveModeThreshold: 0.04,
          recoveryThreshold: 0.02,
          positionReductionFactor: 0.5,
          defensiveModeMultiplier: 0.3
        },
        marketRiskAdjustments: {
          fibZoneMultipliers: {
            'COMPRESSION': 1.2,
            'MID_EXPANSION': 1.0,
            'FULL_EXPANSION': 0.8,
            'OVER_EXTENSION': 0.4,
            'EXHAUSTION': 0.0
          },
          vixThresholds: {
            low: 15,
            medium: 25,
            high: 35,
            extreme: 50
          },
          vixMultipliers: {
            low: 1.0,
            medium: 0.8,
            high: 0.5,
            extreme: 0.2
          },
          regimeMultipliers: {
            'BULL_MARKET': 1.1,
            'BEAR_MARKET': 0.7,
            'SIDEWAYS': 0.9,
            'HIGH_VOLATILITY': 0.6,
            'LOW_VOLATILITY': 1.0
          },
          emergencyOverrides: {
            enabled: true,
            maxReduction: 0.1,
            triggerConditions: ['VIX > 50', 'SPY daily change > 5%']
          }
        }
      },
      
      dataProviders: {
        primary: {
          name: 'Polygon.io',
          apiKey: process.env.POLYGON_API_KEY || 'your-polygon-api-key',
          baseUrl: 'https://api.polygon.io',
          rateLimit: 100,
          timeout: 5000
        },
        fallback: {
          name: 'TwelveData',
          apiKey: process.env.TWELVE_DATA_API_KEY || 'your-twelve-data-api-key',
          baseUrl: 'https://api.twelvedata.com',
          rateLimit: 60,
          timeout: 5000
        },
        options: {
          name: 'Tradier',
          apiKey: process.env.TRADIER_API_KEY || 'your-tradier-api-key',
          baseUrl: 'https://api.tradier.com',
          rateLimit: 120
        },
        vix: {
          name: 'CBOE',
          apiKey: process.env.CBOE_API_KEY || 'your-cboe-api-key',
          baseUrl: 'https://api.cboe.com',
          updateInterval: 60000
        }
      },
      
      logging: {
        level: 'info',
        enableConsole: true,
        enableFile: true,
        filePath: './logs/gamma-adaptive.log',
        maxFileSize: '10MB',
        maxFiles: 5,
        enableStructuredLogging: true,
        correlationIds: true
      },
      
      performance: {
        maxConcurrentOperations: 50,
        processingTimeout: 30000,
        memoryThreshold: 0.8,
        cpuThreshold: 0.8,
        healthCheckInterval: 30000,
        metricsCollection: {
          enabled: true,
          interval: 60000,
          retention: 86400000
        }
      },
      
      features: {
        paperTradingEnabled: true,
        liveTradingEnabled: false,
        learningSystemEnabled: true,
        dashboardEnabled: true,
        alertsEnabled: true,
        backtestingEnabled: true,
        apiEnabled: true
      }
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    this.removeAllListeners();
  }
}