import { EventEmitter } from 'events';
import { ConfigurationManager, GammaAdaptiveConfig, ConfigValidationResult } from './ConfigurationManager';

/**
 * Configuration Service
 * 
 * High-level service for managing Gamma Adaptive System configuration:
 * - Centralized configuration access for all system components
 * - Real-time configuration change propagation
 * - Environment-specific configuration management
 * - Configuration change history and rollback
 * - Integration with system components
 */

export interface ConfigChangeEvent {
  section: string;
  previousValue: any;
  newValue: any;
  timestamp: Date;
  source: string;
}

export interface ConfigSubscription {
  id: string;
  section: string;
  callback: (newValue: any, previousValue: any) => void;
}

export class ConfigurationService extends EventEmitter {
  private configManager: ConfigurationManager;
  private subscriptions: Map<string, ConfigSubscription> = new Map();
  private changeHistory: ConfigChangeEvent[] = [];
  private maxHistorySize: number = 1000;

  constructor(configPath?: string) {
    super();
    this.configManager = new ConfigurationManager(configPath);
    this.setupConfigManagerEvents();
  }

  /**
   * Get complete configuration
   */
  public getConfig(): GammaAdaptiveConfig {
    return this.configManager.getConfig();
  }

  /**
   * Get orchestrator configuration
   */
  public getOrchestratorConfig() {
    return this.configManager.getConfigSection('orchestrator');
  }

  /**
   * Get signal processing configuration
   */
  public getSignalProcessingConfig() {
    return this.configManager.getConfigSection('signalProcessing');
  }

  /**
   * Get risk management configuration
   */
  public getRiskManagementConfig() {
    return this.configManager.getConfigSection('riskManagement');
  }

  /**
   * Get data providers configuration
   */
  public getDataProvidersConfig() {
    return this.configManager.getConfigSection('dataProviders');
  }

  /**
   * Get logging configuration
   */
  public getLoggingConfig() {
    return this.configManager.getConfigSection('logging');
  }

  /**
   * Get performance configuration
   */
  public getPerformanceConfig() {
    return this.configManager.getConfigSection('performance');
  }

  /**
   * Get feature flags
   */
  public getFeatureFlags() {
    return this.configManager.getConfigSection('features');
  }

  /**
   * Update orchestrator configuration
   */
  public async updateOrchestratorConfig(updates: Partial<GammaAdaptiveConfig['orchestrator']>): Promise<ConfigValidationResult> {
    return this.configManager.updateConfigSection('orchestrator', updates);
  }

  /**
   * Update signal processing configuration
   */
  public async updateSignalProcessingConfig(updates: Partial<GammaAdaptiveConfig['signalProcessing']>): Promise<ConfigValidationResult> {
    return this.configManager.updateConfigSection('signalProcessing', updates);
  }

  /**
   * Update risk management configuration
   */
  public async updateRiskManagementConfig(updates: Partial<GammaAdaptiveConfig['riskManagement']>): Promise<ConfigValidationResult> {
    return this.configManager.updateConfigSection('riskManagement', updates);
  }

  /**
   * Update feature flags
   */
  public async updateFeatureFlags(updates: Partial<GammaAdaptiveConfig['features']>): Promise<ConfigValidationResult> {
    return this.configManager.updateConfigSection('features', updates);
  }

  /**
   * Subscribe to configuration changes for a specific section
   */
  public subscribeToConfigChanges<T extends keyof GammaAdaptiveConfig>(
    section: T,
    callback: (newValue: GammaAdaptiveConfig[T], previousValue: GammaAdaptiveConfig[T]) => void
  ): string {
    const subscriptionId = `${section}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      section,
      callback
    });

    return subscriptionId;
  }

  /**
   * Unsubscribe from configuration changes
   */
  public unsubscribeFromConfigChanges(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get configuration change history
   */
  public getChangeHistory(limit: number = 50): ConfigChangeEvent[] {
    return this.changeHistory.slice(-limit);
  }

  /**
   * Validate current configuration
   */
  public validateConfiguration(): ConfigValidationResult {
    return this.configManager.validateConfiguration(this.configManager.getConfig());
  }

  /**
   * Reload configuration from file
   */
  public async reloadConfiguration(): Promise<void> {
    return this.configManager.reloadConfiguration();
  }

  /**
   * Export configuration to file
   */
  public async exportConfiguration(filePath: string): Promise<void> {
    return this.configManager.exportConfiguration(filePath);
  }

  /**
   * Import configuration from file
   */
  public async importConfiguration(filePath: string): Promise<ConfigValidationResult> {
    return this.configManager.importConfiguration(filePath);
  }

  /**
   * Create configuration backup
   */
  public async createBackup(): Promise<void> {
    // This would create a timestamped backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./config-backup-${timestamp}.json`;
    return this.configManager.exportConfiguration(backupPath);
  }

  /**
   * Restore from backup
   */
  public async restoreFromBackup(): Promise<void> {
    return this.configManager.restoreFromBackup();
  }

  /**
   * Get configuration summary for monitoring
   */
  public getConfigSummary(): {
    version: string;
    environment: string;
    lastModified: string;
    watchlistSize: number;
    maxConcurrentTrades: number;
    confidenceThreshold: number;
    riskLimits: {
      maxRiskPerTrade: number;
      maxPortfolioHeat: number;
      maxDrawdown: number;
    };
    featuresEnabled: string[];
    validationStatus: 'valid' | 'invalid' | 'warnings';
  } {
    const config = this.getConfig();
    const validation = this.validateConfiguration();
    
    return {
      version: config.version,
      environment: config.environment,
      lastModified: config.lastModified,
      watchlistSize: config.orchestrator.watchlist.length,
      maxConcurrentTrades: config.orchestrator.maxConcurrentTrades,
      confidenceThreshold: config.orchestrator.confidenceThreshold,
      riskLimits: {
        maxRiskPerTrade: config.riskManagement.positionSizing.maxRiskPerTrade,
        maxPortfolioHeat: config.riskManagement.positionSizing.maxPortfolioHeat,
        maxDrawdown: config.riskManagement.positionSizing.maxDrawdown
      },
      featuresEnabled: Object.entries(config.features)
        .filter(([_, enabled]) => enabled)
        .map(([feature, _]) => feature),
      validationStatus: validation.isValid ? 'valid' : validation.warnings.length > 0 ? 'warnings' : 'invalid'
    };
  }

  // Private helper methods

  private setupConfigManagerEvents(): void {
    this.configManager.on('configChanged', (event) => {
      this.handleConfigChange(event);
      this.emit('configChanged', event);
    });

    this.configManager.on('configReloaded', (event) => {
      this.emit('configReloaded', event);
    });

    this.configManager.on('configValidationFailed', (validation) => {
      this.emit('configValidationFailed', validation);
    });

    this.configManager.on('configReloadFailed', (validation) => {
      this.emit('configReloadFailed', validation);
    });
  }

  private handleConfigChange(event: any): void {
    const { previousConfig, newConfig, timestamp } = event;
    
    // Notify subscribers of specific section changes
    this.notifySubscribers(previousConfig, newConfig);
    
    // Record change in history
    this.recordConfigChange(previousConfig, newConfig, timestamp);
  }

  private notifySubscribers(previousConfig: GammaAdaptiveConfig, newConfig: GammaAdaptiveConfig): void {
    for (const subscription of this.subscriptions.values()) {
      const previousValue = previousConfig[subscription.section as keyof GammaAdaptiveConfig];
      const newValue = newConfig[subscription.section as keyof GammaAdaptiveConfig];
      
      // Check if the section actually changed
      if (JSON.stringify(previousValue) !== JSON.stringify(newValue)) {
        try {
          subscription.callback(newValue, previousValue);
        } catch (error) {
          console.error(`Error in config subscription callback for ${subscription.section}:`, error);
        }
      }
    }
  }

  private recordConfigChange(previousConfig: GammaAdaptiveConfig, newConfig: GammaAdaptiveConfig, timestamp: Date): void {
    // Record changes for each section that changed
    const sections: (keyof GammaAdaptiveConfig)[] = [
      'orchestrator', 'signalProcessing', 'riskManagement', 
      'dataProviders', 'logging', 'performance', 'features'
    ];

    for (const section of sections) {
      const previousValue = previousConfig[section];
      const newValue = newConfig[section];
      
      if (JSON.stringify(previousValue) !== JSON.stringify(newValue)) {
        const changeEvent: ConfigChangeEvent = {
          section,
          previousValue,
          newValue,
          timestamp,
          source: 'configuration-service'
        };
        
        this.changeHistory.push(changeEvent);
      }
    }

    // Trim history if it gets too large
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory = this.changeHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.configManager.destroy();
    this.subscriptions.clear();
    this.changeHistory = [];
    this.removeAllListeners();
  }
}