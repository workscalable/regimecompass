/**
 * Configuration Initialization Script
 * Handles startup configuration loading, validation, and system initialization
 */

import { configManager } from './ConfigManager';
import { environmentValidator } from './EnvironmentValidator';
import { logger } from '../logging/Logger';
import { auditLogger } from '../logging/AuditLogger';
import { alertSystem } from '../alerts/AlertSystem';

export class ConfigInitializer {
  private initialized = false;

  /**
   * Initialize the entire configuration system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      await logger.warn('SYSTEM', 'Configuration already initialized, skipping');
      return;
    }

    try {
      await logger.info('SYSTEM', 'Starting configuration initialization');

      // Step 1: Validate environment variables
      await this.validateEnvironment();

      // Step 2: Load configuration
      await this.loadConfiguration();

      // Step 3: Initialize logging system
      await this.initializeLogging();

      // Step 4: Initialize alerting system
      await this.initializeAlerting();

      // Step 5: Validate system readiness
      await this.validateSystemReadiness();

      this.initialized = true;

      await logger.info('SYSTEM', 'Configuration initialization completed successfully');
      await auditLogger.logSystemStart({
        component: 'ConfigInitializer',
        metadata: {
          environment: process.env.NODE_ENV || 'development',
          version: '1.0.0'
        }
      });

    } catch (error) {
      await logger.error('SYSTEM', 'Configuration initialization failed', {
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }, error as Error);

      throw new Error(`Configuration initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate environment variables
   */
  private async validateEnvironment(): Promise<void> {
    await logger.info('SYSTEM', 'Validating environment variables');

    const validationResult = await environmentValidator.validateAndLog();

    if (!validationResult.valid) {
      const errorMessage = `Environment validation failed: ${validationResult.errors.join(', ')}`;
      throw new Error(errorMessage);
    }

    if (validationResult.warnings.length > 0) {
      await logger.warn('SYSTEM', `Environment validation completed with ${validationResult.warnings.length} warnings`);
    } else {
      await logger.info('SYSTEM', 'Environment validation passed');
    }
  }

  /**
   * Load configuration from files and environment
   */
  private async loadConfiguration(): Promise<void> {
    await logger.info('SYSTEM', 'Loading configuration');

    try {
      const config = await configManager.loadConfig();
      
      await logger.info('SYSTEM', 'Configuration loaded successfully', {
        metadata: {
          environment: config.environment,
          version: config.version,
          featuresEnabled: Object.keys(config.features).filter(key => 
            config.features[key as keyof typeof config.features]
          )
        }
      });

    } catch (error) {
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize logging system based on configuration
   */
  private async initializeLogging(): Promise<void> {
    await logger.info('SYSTEM', 'Initializing logging system');

    try {
      const loggingConfig = configManager.getSection('logging');
      
      // Set log level
      logger.setDefaultContext({
        component: 'PaperTradingSystem',
        metadata: {
          environment: configManager.getSection('environment'),
          version: configManager.getSection('version')
        }
      });

      // Initialize file logging if enabled
      if (loggingConfig.outputs.file.enabled) {
        // In a real implementation, this would configure file logging
        await logger.info('SYSTEM', 'File logging enabled', {
          metadata: {
            path: loggingConfig.outputs.file.path,
            maxSize: loggingConfig.outputs.file.maxSize
          }
        });
      }

      // Initialize remote logging if enabled
      if (loggingConfig.outputs.remote.enabled) {
        // In a real implementation, this would configure remote logging
        await logger.info('SYSTEM', 'Remote logging enabled', {
          metadata: {
            endpoint: loggingConfig.outputs.remote.endpoint
          }
        });
      }

      await logger.info('SYSTEM', 'Logging system initialized successfully');

    } catch (error) {
      throw new Error(`Failed to initialize logging: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize alerting system based on configuration
   */
  private async initializeAlerting(): Promise<void> {
    await logger.info('SYSTEM', 'Initializing alerting system');

    try {
      const alertingConfig = configManager.getSection('alerting');

      // Configure email alerts if enabled
      if (alertingConfig.channels.email.enabled) {
        // In a real implementation, this would configure email alerting
        await logger.info('SYSTEM', 'Email alerting enabled', {
          metadata: {
            recipients: alertingConfig.channels.email.recipients.length,
            smtpHost: alertingConfig.channels.email.smtp.host
          }
        });
      }

      // Configure Slack alerts if enabled
      if (alertingConfig.channels.slack.enabled) {
        // In a real implementation, this would configure Slack alerting
        await logger.info('SYSTEM', 'Slack alerting enabled', {
          metadata: {
            channel: alertingConfig.channels.slack.channel
          }
        });
      }

      // Configure webhook alerts if enabled
      if (alertingConfig.channels.webhook.enabled) {
        // In a real implementation, this would configure webhook alerting
        await logger.info('SYSTEM', 'Webhook alerting enabled', {
          metadata: {
            url: alertingConfig.channels.webhook.url
          }
        });
      }

      // Update alert system cooldowns
      const rules = alertingConfig.rules;
      // In a real implementation, this would update alert system configuration

      await logger.info('SYSTEM', 'Alerting system initialized successfully');

    } catch (error) {
      throw new Error(`Failed to initialize alerting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate system readiness
   */
  private async validateSystemReadiness(): Promise<void> {
    await logger.info('SYSTEM', 'Validating system readiness');

    const config = configManager.getConfig();
    const issues: string[] = [];

    // Check database configuration
    if (!config.database.host || !config.database.username || !config.database.password) {
      issues.push('Database configuration incomplete');
    }

    // Check API keys
    if (!config.apis.polygon.apiKey) {
      issues.push('Polygon API key not configured');
    }
    if (!config.apis.tradier.apiKey) {
      issues.push('Tradier API key not configured');
    }

    // Check production-specific requirements
    if (config.environment === 'production') {
      if (!config.database.ssl) {
        issues.push('SSL should be enabled for production database');
      }
      
      if (config.logging.level === 'DEBUG') {
        issues.push('Debug logging should not be used in production');
      }

      if (!config.alerting.channels.email.enabled && !config.alerting.channels.slack.enabled) {
        issues.push('At least one alert channel should be enabled in production');
      }
    }

    // Check feature dependencies
    if (config.features.learningEngine && !config.features.performanceAnalytics) {
      issues.push('Learning engine requires performance analytics to be enabled');
    }

    if (issues.length > 0) {
      await logger.warn('SYSTEM', 'System readiness validation found issues', {
        metadata: {
          issues: issues.length,
          details: issues
        }
      });

      // Don't fail initialization for warnings, just log them
      for (const issue of issues) {
        await logger.warn('SYSTEM', `Readiness issue: ${issue}`);
      }
    } else {
      await logger.info('SYSTEM', 'System readiness validation passed');
    }
  }

  /**
   * Get initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reinitialize configuration (for hot reloading)
   */
  async reinitialize(): Promise<void> {
    await logger.info('SYSTEM', 'Reinitializing configuration system');
    
    this.initialized = false;
    await this.initialize();
    
    await logger.info('SYSTEM', 'Configuration system reinitialized');
  }

  /**
   * Shutdown configuration system
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    await logger.info('SYSTEM', 'Shutting down configuration system');

    try {
      // Flush any pending logs
      await logger.flush();
      
      // Close logger outputs
      await logger.close();

      // Shutdown alert system
      await alertSystem.shutdown();

      this.initialized = false;

      console.log('Configuration system shutdown completed');

    } catch (error) {
      console.error('Error during configuration shutdown:', error);
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    initialized: boolean;
    configValid: boolean;
    environmentValid: boolean;
    systemReady: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check if initialized
    if (!this.initialized) {
      issues.push('Configuration system not initialized');
    }

    // Validate environment
    const envValidation = environmentValidator.validate();
    if (!envValidation.valid) {
      issues.push(`Environment validation failed: ${envValidation.errors.length} errors`);
    }

    // Check configuration
    let configValid = false;
    try {
      const config = configManager.getConfig();
      configValid = true;
    } catch (error) {
      issues.push('Configuration not loaded');
    }

    // Check system readiness
    let systemReady = true;
    if (configValid) {
      try {
        await this.validateSystemReadiness();
      } catch (error) {
        systemReady = false;
        issues.push('System readiness validation failed');
      }
    } else {
      systemReady = false;
    }

    return {
      initialized: this.initialized,
      configValid,
      environmentValid: envValidation.valid,
      systemReady,
      issues
    };
  }

  /**
   * Generate configuration report
   */
  async generateConfigReport(): Promise<string> {
    const config = configManager.getConfig();
    const envValidation = environmentValidator.validate();
    const healthStatus = await this.getHealthStatus();

    let report = '# Paper Trading System Configuration Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    // System Status
    report += '## System Status\n\n';
    report += `- **Initialized**: ${healthStatus.initialized ? '✅' : '❌'}\n`;
    report += `- **Environment**: ${config.environment}\n`;
    report += `- **Version**: ${config.version}\n`;
    report += `- **Config Valid**: ${healthStatus.configValid ? '✅' : '❌'}\n`;
    report += `- **Environment Valid**: ${healthStatus.environmentValid ? '✅' : '❌'}\n`;
    report += `- **System Ready**: ${healthStatus.systemReady ? '✅' : '❌'}\n\n`;

    // Environment Validation
    report += '## Environment Validation\n\n';
    report += `- **Total Variables**: ${envValidation.summary.total}\n`;
    report += `- **Required**: ${envValidation.summary.required}\n`;
    report += `- **Provided**: ${envValidation.summary.provided}\n`;
    report += `- **Valid**: ${envValidation.summary.valid}\n`;
    report += `- **Errors**: ${envValidation.errors.length}\n`;
    report += `- **Warnings**: ${envValidation.warnings.length}\n\n`;

    if (envValidation.errors.length > 0) {
      report += '### Errors\n\n';
      envValidation.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }

    if (envValidation.warnings.length > 0) {
      report += '### Warnings\n\n';
      envValidation.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }

    // Features
    report += '## Enabled Features\n\n';
    Object.entries(config.features).forEach(([feature, enabled]) => {
      report += `- **${feature}**: ${enabled ? '✅' : '❌'}\n`;
    });
    report += '\n';

    // Configuration Summary
    report += '## Configuration Summary\n\n';
    report += `- **Database**: ${config.database.host}:${config.database.port}/${config.database.database}\n`;
    report += `- **Logging Level**: ${config.logging.level}\n`;
    report += `- **Default Account Balance**: $${config.trading.defaultAccountBalance.toLocaleString()}\n`;
    report += `- **Max Risk Per Trade**: ${(config.trading.maxRiskPerTrade * 100).toFixed(1)}%\n`;
    report += `- **Health Check Interval**: ${config.monitoring.healthCheckInterval}ms\n\n`;

    // Issues
    if (healthStatus.issues.length > 0) {
      report += '## Issues\n\n';
      healthStatus.issues.forEach(issue => {
        report += `- ${issue}\n`;
      });
      report += '\n';
    }

    return report;
  }
}

// Export singleton instance
export const configInitializer = new ConfigInitializer();