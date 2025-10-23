import { EventEmitter } from 'events';
import { ConfigurationService } from './ConfigurationService';
import { GammaAdaptiveConfig, ConfigValidationResult } from './ConfigurationManager';

/**
 * Parameter Customization API
 * 
 * Provides high-level interfaces for customizing system parameters:
 * - Watchlist management with ticker addition/removal
 * - Confidence threshold and signal weight adjustments
 * - Risk parameter modification and Fibonacci zone multiplier tuning
 * - Real-time parameter validation and application
 * - Parameter change history and rollback capabilities
 */

export interface WatchlistOperation {
  operation: 'ADD' | 'REMOVE' | 'REORDER' | 'REPLACE';
  tickers: string[];
  position?: number; // For insertion at specific position
  reason?: string;
}

export interface SignalWeightAdjustment {
  factor: 'trendComposite' | 'momentumDivergence' | 'volumeProfile' | 'ribbonAlignment' | 'fibConfluence' | 'gammaExposure';
  newWeight: number;
  reason?: string;
}

export interface ConfidenceThresholdAdjustment {
  type: 'MINIMUM' | 'MAXIMUM' | 'TRADING';
  newThreshold: number;
  reason?: string;
}

export interface RiskParameterAdjustment {
  parameter: 'maxRiskPerTrade' | 'maxPortfolioHeat' | 'maxDrawdown' | 'maxConsecutiveLosses' | 'vixThreshold';
  newValue: number;
  reason?: string;
}

export interface FibZoneMultiplierAdjustment {
  zone: 'COMPRESSION' | 'MID_EXPANSION' | 'FULL_EXPANSION' | 'OVER_EXTENSION' | 'EXHAUSTION';
  newMultiplier: number;
  reason?: string;
}

export interface ParameterChangeResult {
  success: boolean;
  validation: ConfigValidationResult;
  appliedChanges: string[];
  warnings: string[];
  rollbackId?: string;
}

export interface ParameterPreset {
  name: string;
  description: string;
  category: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE' | 'CUSTOM';
  parameters: Partial<GammaAdaptiveConfig>;
  author: string;
  createdAt: Date;
}

export class ParameterCustomizationAPI extends EventEmitter {
  private configService: ConfigurationService;
  private changeHistory: Map<string, any> = new Map();
  private presets: Map<string, ParameterPreset> = new Map();

  constructor(configService: ConfigurationService) {
    super();
    this.configService = configService;
    this.initializePresets();
  }

  // Watchlist Management

  /**
   * Add tickers to watchlist
   */
  public async addTickersToWatchlist(tickers: string[], position?: number, reason?: string): Promise<ParameterChangeResult> {
    try {
      const currentConfig = this.configService.getOrchestratorConfig();
      const currentWatchlist = [...currentConfig.watchlist];
      
      // Validate tickers
      const validTickers = this.validateTickers(tickers);
      if (validTickers.length === 0) {
        return {
          success: false,
          validation: { isValid: false, errors: [{ path: 'tickers', message: 'No valid tickers provided', severity: 'error', code: 'INVALID_TICKERS' }], warnings: [] },
          appliedChanges: [],
          warnings: ['No valid tickers to add']
        };
      }

      // Remove duplicates
      const newTickers = validTickers.filter(ticker => !currentWatchlist.includes(ticker));
      if (newTickers.length === 0) {
        return {
          success: false,
          validation: { isValid: false, errors: [{ path: 'tickers', message: 'All tickers already in watchlist', severity: 'error', code: 'DUPLICATE_TICKERS' }], warnings: [] },
          appliedChanges: [],
          warnings: ['All provided tickers are already in the watchlist']
        };
      }

      // Add tickers at specified position or end
      let updatedWatchlist: string[];
      if (position !== undefined && position >= 0 && position <= currentWatchlist.length) {
        updatedWatchlist = [
          ...currentWatchlist.slice(0, position),
          ...newTickers,
          ...currentWatchlist.slice(position)
        ];
      } else {
        updatedWatchlist = [...currentWatchlist, ...newTickers];
      }

      // Apply changes
      const result = await this.configService.updateOrchestratorConfig({
        watchlist: updatedWatchlist
      });

      if (result.isValid) {
        this.emit('watchlistUpdated', {
          operation: 'ADD',
          tickers: newTickers,
          position,
          reason,
          newWatchlist: updatedWatchlist,
          timestamp: new Date()
        });
      }

      return {
        success: result.isValid,
        validation: result,
        appliedChanges: [`Added ${newTickers.length} tickers: ${newTickers.join(', ')}`],
        warnings: result.warnings.map(w => w.message)
      };
    } catch (error) {
      return this.handleError('addTickersToWatchlist', error);
    }
  }

  /**
   * Remove tickers from watchlist
   */
  public async removeTickersFromWatchlist(tickers: string[], reason?: string): Promise<ParameterChangeResult> {
    try {
      const currentConfig = this.configService.getOrchestratorConfig();
      const currentWatchlist = [...currentConfig.watchlist];
      
      // Filter out tickers to remove
      const updatedWatchlist = currentWatchlist.filter(ticker => !tickers.includes(ticker));
      const removedTickers = currentWatchlist.filter(ticker => tickers.includes(ticker));

      if (removedTickers.length === 0) {
        return {
          success: false,
          validation: { isValid: false, errors: [{ path: 'tickers', message: 'No tickers found to remove', severity: 'error', code: 'TICKERS_NOT_FOUND' }], warnings: [] },
          appliedChanges: [],
          warnings: ['No specified tickers found in watchlist']
        };
      }

      if (updatedWatchlist.length === 0) {
        return {
          success: false,
          validation: { isValid: false, errors: [{ path: 'watchlist', message: 'Cannot remove all tickers from watchlist', severity: 'error', code: 'EMPTY_WATCHLIST' }], warnings: [] },
          appliedChanges: [],
          warnings: ['Watchlist cannot be empty']
        };
      }

      // Apply changes
      const result = await this.configService.updateOrchestratorConfig({
        watchlist: updatedWatchlist
      });

      if (result.isValid) {
        this.emit('watchlistUpdated', {
          operation: 'REMOVE',
          tickers: removedTickers,
          reason,
          newWatchlist: updatedWatchlist,
          timestamp: new Date()
        });
      }

      return {
        success: result.isValid,
        validation: result,
        appliedChanges: [`Removed ${removedTickers.length} tickers: ${removedTickers.join(', ')}`],
        warnings: result.warnings.map(w => w.message)
      };
    } catch (error) {
      return this.handleError('removeTickersFromWatchlist', error);
    }
  }

  /**
   * Reorder watchlist
   */
  public async reorderWatchlist(newOrder: string[], reason?: string): Promise<ParameterChangeResult> {
    try {
      const currentConfig = this.configService.getOrchestratorConfig();
      const currentWatchlist = [...currentConfig.watchlist];

      // Validate that all current tickers are included
      const missingTickers = currentWatchlist.filter(ticker => !newOrder.includes(ticker));
      const extraTickers = newOrder.filter(ticker => !currentWatchlist.includes(ticker));

      if (missingTickers.length > 0 || extraTickers.length > 0) {
        return {
          success: false,
          validation: { 
            isValid: false, 
            errors: [{ 
              path: 'watchlist', 
              message: `Reorder must include all current tickers. Missing: ${missingTickers.join(', ')}, Extra: ${extraTickers.join(', ')}`, 
              severity: 'error', 
              code: 'INVALID_REORDER' 
            }], 
            warnings: [] 
          },
          appliedChanges: [],
          warnings: ['Reorder must include exactly the same tickers as current watchlist']
        };
      }

      // Apply changes
      const result = await this.configService.updateOrchestratorConfig({
        watchlist: newOrder
      });

      if (result.isValid) {
        this.emit('watchlistUpdated', {
          operation: 'REORDER',
          tickers: newOrder,
          reason,
          newWatchlist: newOrder,
          timestamp: new Date()
        });
      }

      return {
        success: result.isValid,
        validation: result,
        appliedChanges: ['Watchlist reordered'],
        warnings: result.warnings.map(w => w.message)
      };
    } catch (error) {
      return this.handleError('reorderWatchlist', error);
    }
  }

  /**
   * Get current watchlist with metadata
   */
  public getWatchlistInfo(): {
    tickers: string[];
    count: number;
    maxConcurrentTrades: number;
    priorityWeights: Record<string, number>;
    lastModified: string;
  } {
    const config = this.configService.getOrchestratorConfig();
    return {
      tickers: config.watchlist,
      count: config.watchlist.length,
      maxConcurrentTrades: config.maxConcurrentTrades,
      priorityWeights: config.priorityWeights,
      lastModified: this.configService.getConfig().lastModified
    };
  } 
 // Signal Weight Adjustments

  /**
   * Adjust signal processing weights
   */
  public async adjustSignalWeights(adjustments: SignalWeightAdjustment[], reason?: string): Promise<ParameterChangeResult> {
    try {
      const currentConfig = this.configService.getSignalProcessingConfig();
      const newWeights = { ...currentConfig.weights };
      const appliedChanges: string[] = [];

      // Apply adjustments
      for (const adjustment of adjustments) {
        if (adjustment.newWeight < 0 || adjustment.newWeight > 1) {
          return {
            success: false,
            validation: { 
              isValid: false, 
              errors: [{ 
                path: `signalProcessing.weights.${adjustment.factor}`, 
                message: `Weight must be between 0 and 1, got: ${adjustment.newWeight}`, 
                severity: 'error', 
                code: 'INVALID_WEIGHT' 
              }], 
              warnings: [] 
            },
            appliedChanges: [],
            warnings: [`Invalid weight for ${adjustment.factor}: ${adjustment.newWeight}`]
          };
        }

        const oldWeight = newWeights[adjustment.factor];
        newWeights[adjustment.factor] = adjustment.newWeight;
        appliedChanges.push(`${adjustment.factor}: ${oldWeight.toFixed(3)} → ${adjustment.newWeight.toFixed(3)}`);
      }

      // Validate total weight sum
      const totalWeight = Object.values(newWeights).reduce((sum, weight) => sum + weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        return {
          success: false,
          validation: { 
            isValid: false, 
            errors: [{ 
              path: 'signalProcessing.weights', 
              message: `Signal weights must sum to 1.0, current sum: ${totalWeight.toFixed(3)}`, 
              severity: 'error', 
              code: 'INVALID_WEIGHT_SUM' 
            }], 
            warnings: [] 
          },
          appliedChanges: [],
          warnings: [`Weight sum is ${totalWeight.toFixed(3)}, must be 1.0`]
        };
      }

      // Apply changes
      const result = await this.configService.updateSignalProcessingConfig({
        weights: newWeights
      });

      if (result.isValid) {
        this.emit('signalWeightsUpdated', {
          adjustments,
          newWeights,
          reason,
          timestamp: new Date()
        });
      }

      return {
        success: result.isValid,
        validation: result,
        appliedChanges,
        warnings: result.warnings.map(w => w.message)
      };
    } catch (error) {
      return this.handleError('adjustSignalWeights', error);
    }
  }

  /**
   * Reset signal weights to default
   */
  public async resetSignalWeightsToDefault(reason?: string): Promise<ParameterChangeResult> {
    const defaultWeights = {
      trendComposite: 0.25,
      momentumDivergence: 0.20,
      volumeProfile: 0.20,
      ribbonAlignment: 0.15,
      fibConfluence: 0.10,
      gammaExposure: 0.10
    };

    const adjustments: SignalWeightAdjustment[] = Object.entries(defaultWeights).map(([factor, weight]) => ({
      factor: factor as any,
      newWeight: weight,
      reason: 'Reset to default'
    }));

    return this.adjustSignalWeights(adjustments, reason || 'Reset to default weights');
  }

  /**
   * Get current signal weights with metadata
   */
  public getSignalWeightsInfo(): {
    weights: Record<string, number>;
    totalWeight: number;
    isValid: boolean;
    lastModified: string;
  } {
    const config = this.configService.getSignalProcessingConfig();
    const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
    
    return {
      weights: config.weights,
      totalWeight,
      isValid: Math.abs(totalWeight - 1.0) <= 0.01,
      lastModified: this.configService.getConfig().lastModified
    };
  }

  // Confidence Threshold Adjustments

  /**
   * Adjust confidence thresholds
   */
  public async adjustConfidenceThresholds(adjustments: ConfidenceThresholdAdjustment[], reason?: string): Promise<ParameterChangeResult> {
    try {
      const orchestratorConfig = this.configService.getOrchestratorConfig();
      const signalConfig = this.configService.getSignalProcessingConfig();
      
      const updates: any = {};
      const appliedChanges: string[] = [];

      for (const adjustment of adjustments) {
        if (adjustment.newThreshold < 0 || adjustment.newThreshold > 1) {
          return {
            success: false,
            validation: { 
              isValid: false, 
              errors: [{ 
                path: `threshold.${adjustment.type}`, 
                message: `Threshold must be between 0 and 1, got: ${adjustment.newThreshold}`, 
                severity: 'error', 
                code: 'INVALID_THRESHOLD' 
              }], 
              warnings: [] 
            },
            appliedChanges: [],
            warnings: [`Invalid threshold for ${adjustment.type}: ${adjustment.newThreshold}`]
          };
        }

        switch (adjustment.type) {
          case 'TRADING':
            const oldTradingThreshold = orchestratorConfig.confidenceThreshold;
            updates.orchestrator = { confidenceThreshold: adjustment.newThreshold };
            appliedChanges.push(`Trading threshold: ${oldTradingThreshold.toFixed(3)} → ${adjustment.newThreshold.toFixed(3)}`);
            break;
          case 'MINIMUM':
            const oldMinThreshold = signalConfig.thresholds.minConfidence;
            updates.signalProcessing = { 
              thresholds: { 
                ...signalConfig.thresholds, 
                minConfidence: adjustment.newThreshold 
              } 
            };
            appliedChanges.push(`Min threshold: ${oldMinThreshold.toFixed(3)} → ${adjustment.newThreshold.toFixed(3)}`);
            break;
          case 'MAXIMUM':
            const oldMaxThreshold = signalConfig.thresholds.maxConfidence;
            updates.signalProcessing = { 
              thresholds: { 
                ...signalConfig.thresholds, 
                maxConfidence: adjustment.newThreshold 
              } 
            };
            appliedChanges.push(`Max threshold: ${oldMaxThreshold.toFixed(3)} → ${adjustment.newThreshold.toFixed(3)}`);
            break;
        }
      }

      // Validate threshold relationships
      const finalMinThreshold = updates.signalProcessing?.thresholds?.minConfidence || signalConfig.thresholds.minConfidence;
      const finalMaxThreshold = updates.signalProcessing?.thresholds?.maxConfidence || signalConfig.thresholds.maxConfidence;
      const finalTradingThreshold = updates.orchestrator?.confidenceThreshold || orchestratorConfig.confidenceThreshold;

      if (finalMinThreshold >= finalMaxThreshold) {
        return {
          success: false,
          validation: { 
            isValid: false, 
            errors: [{ 
              path: 'thresholds', 
              message: 'Min confidence must be less than max confidence', 
              severity: 'error', 
              code: 'INVALID_THRESHOLD_RANGE' 
            }], 
            warnings: [] 
          },
          appliedChanges: [],
          warnings: ['Min threshold must be less than max threshold']
        };
      }

      if (finalTradingThreshold < finalMinThreshold || finalTradingThreshold > finalMaxThreshold) {
        return {
          success: false,
          validation: { 
            isValid: false, 
            errors: [{ 
              path: 'thresholds', 
              message: 'Trading threshold must be between min and max thresholds', 
              severity: 'error', 
              code: 'INVALID_TRADING_THRESHOLD' 
            }], 
            warnings: [] 
          },
          appliedChanges: [],
          warnings: ['Trading threshold must be within min/max range']
        };
      }

      // Apply changes
      const results: ConfigValidationResult[] = [];
      
      if (updates.orchestrator) {
        const result = await this.configService.updateOrchestratorConfig(updates.orchestrator);
        results.push(result);
      }
      
      if (updates.signalProcessing) {
        const result = await this.configService.updateSignalProcessingConfig(updates.signalProcessing);
        results.push(result);
      }

      const allValid = results.every(r => r.isValid);
      const allWarnings = results.flatMap(r => r.warnings.map(w => w.message));

      if (allValid) {
        this.emit('confidenceThresholdsUpdated', {
          adjustments,
          reason,
          timestamp: new Date()
        });
      }

      return {
        success: allValid,
        validation: { 
          isValid: allValid, 
          errors: results.flatMap(r => r.errors), 
          warnings: results.flatMap(r => r.warnings) 
        },
        appliedChanges,
        warnings: allWarnings
      };
    } catch (error) {
      return this.handleError('adjustConfidenceThresholds', error);
    }
  }

  /**
   * Get current confidence thresholds
   */
  public getConfidenceThresholdsInfo(): {
    tradingThreshold: number;
    minThreshold: number;
    maxThreshold: number;
    isValid: boolean;
    lastModified: string;
  } {
    const orchestratorConfig = this.configService.getOrchestratorConfig();
    const signalConfig = this.configService.getSignalProcessingConfig();
    
    const tradingThreshold = orchestratorConfig.confidenceThreshold;
    const minThreshold = signalConfig.thresholds.minConfidence;
    const maxThreshold = signalConfig.thresholds.maxConfidence;
    
    const isValid = minThreshold < maxThreshold && 
                   tradingThreshold >= minThreshold && 
                   tradingThreshold <= maxThreshold;

    return {
      tradingThreshold,
      minThreshold,
      maxThreshold,
      isValid,
      lastModified: this.configService.getConfig().lastModified
    };
  }  // Risk Parameter Adjustments

  /**
   * Adjust risk management parameters
   */
  public async adjustRiskParameters(adjustments: RiskParameterAdjustment[], reason?: string): Promise<ParameterChangeResult> {
    try {
      const currentConfig = this.configService.getRiskManagementConfig();
      const updates: any = {};
      const appliedChanges: string[] = [];

      for (const adjustment of adjustments) {
        // Validate parameter ranges
        const validation = this.validateRiskParameter(adjustment.parameter, adjustment.newValue);
        if (!validation.isValid) {
          return {
            success: false,
            validation,
            appliedChanges: [],
            warnings: validation.warnings.map(w => w.message)
          };
        }

        // Apply adjustment based on parameter type
        switch (adjustment.parameter) {
          case 'maxRiskPerTrade':
            const oldRiskPerTrade = currentConfig.positionSizing.maxRiskPerTrade;
            updates.positionSizing = { 
              ...updates.positionSizing, 
              maxRiskPerTrade: adjustment.newValue 
            };
            appliedChanges.push(`Max risk per trade: ${(oldRiskPerTrade * 100).toFixed(1)}% → ${(adjustment.newValue * 100).toFixed(1)}%`);
            break;
          case 'maxPortfolioHeat':
            const oldPortfolioHeat = currentConfig.positionSizing.maxPortfolioHeat;
            updates.positionSizing = { 
              ...updates.positionSizing, 
              maxPortfolioHeat: adjustment.newValue 
            };
            appliedChanges.push(`Max portfolio heat: ${(oldPortfolioHeat * 100).toFixed(1)}% → ${(adjustment.newValue * 100).toFixed(1)}%`);
            break;
          case 'maxDrawdown':
            const oldDrawdown = currentConfig.positionSizing.maxDrawdown;
            updates.positionSizing = { 
              ...updates.positionSizing, 
              maxDrawdown: adjustment.newValue 
            };
            appliedChanges.push(`Max drawdown: ${(oldDrawdown * 100).toFixed(1)}% → ${(adjustment.newValue * 100).toFixed(1)}%`);
            break;
          case 'maxConsecutiveLosses':
            const oldConsecutiveLosses = currentConfig.limits.maxConsecutiveLosses;
            updates.limits = { 
              ...updates.limits, 
              maxConsecutiveLosses: adjustment.newValue 
            };
            appliedChanges.push(`Max consecutive losses: ${oldConsecutiveLosses} → ${adjustment.newValue}`);
            break;
          case 'vixThreshold':
            const oldVixThreshold = currentConfig.limits.vixThreshold;
            updates.limits = { 
              ...updates.limits, 
              vixThreshold: adjustment.newValue 
            };
            appliedChanges.push(`VIX threshold: ${oldVixThreshold} → ${adjustment.newValue}`);
            break;
        }
      }

      // Apply changes
      const result = await this.configService.updateRiskManagementConfig(updates);

      if (result.isValid) {
        this.emit('riskParametersUpdated', {
          adjustments,
          reason,
          timestamp: new Date()
        });
      }

      return {
        success: result.isValid,
        validation: result,
        appliedChanges,
        warnings: result.warnings.map(w => w.message)
      };
    } catch (error) {
      return this.handleError('adjustRiskParameters', error);
    }
  }

  /**
   * Adjust Fibonacci zone multipliers
   */
  public async adjustFibZoneMultipliers(adjustments: FibZoneMultiplierAdjustment[], reason?: string): Promise<ParameterChangeResult> {
    try {
      const currentConfig = this.configService.getRiskManagementConfig();
      const newMultipliers = { ...currentConfig.positionSizing.fibZoneMultipliers };
      const appliedChanges: string[] = [];

      for (const adjustment of adjustments) {
        // Validate multiplier ranges
        if (adjustment.newMultiplier < 0 || adjustment.newMultiplier > 2) {
          return {
            success: false,
            validation: { 
              isValid: false, 
              errors: [{ 
                path: `fibZoneMultipliers.${adjustment.zone}`, 
                message: `Multiplier must be between 0 and 2, got: ${adjustment.newMultiplier}`, 
                severity: 'error', 
                code: 'INVALID_MULTIPLIER' 
              }], 
              warnings: [] 
            },
            appliedChanges: [],
            warnings: [`Invalid multiplier for ${adjustment.zone}: ${adjustment.newMultiplier}`]
          };
        }

        // Enforce EXHAUSTION zone requirement
        if (adjustment.zone === 'EXHAUSTION' && adjustment.newMultiplier !== 0) {
          return {
            success: false,
            validation: { 
              isValid: false, 
              errors: [{ 
                path: 'fibZoneMultipliers.EXHAUSTION', 
                message: 'EXHAUSTION zone multiplier must be 0 (requirement)', 
                severity: 'error', 
                code: 'INVALID_EXHAUSTION_MULTIPLIER' 
              }], 
              warnings: [] 
            },
            appliedChanges: [],
            warnings: ['EXHAUSTION zone multiplier must remain 0']
          };
        }

        const oldMultiplier = newMultipliers[adjustment.zone];
        newMultipliers[adjustment.zone] = adjustment.newMultiplier;
        appliedChanges.push(`${adjustment.zone}: ${oldMultiplier.toFixed(2)}x → ${adjustment.newMultiplier.toFixed(2)}x`);
      }

      // Apply changes
      const result = await this.configService.updateRiskManagementConfig({
        positionSizing: {
          ...currentConfig.positionSizing,
          fibZoneMultipliers: newMultipliers
        }
      });

      if (result.isValid) {
        this.emit('fibZoneMultipliersUpdated', {
          adjustments,
          newMultipliers,
          reason,
          timestamp: new Date()
        });
      }

      return {
        success: result.isValid,
        validation: result,
        appliedChanges,
        warnings: result.warnings.map(w => w.message)
      };
    } catch (error) {
      return this.handleError('adjustFibZoneMultipliers', error);
    }
  }

  /**
   * Get current risk parameters
   */
  public getRiskParametersInfo(): {
    positionSizing: {
      maxRiskPerTrade: number;
      maxPortfolioHeat: number;
      maxDrawdown: number;
    };
    limits: {
      maxConsecutiveLosses: number;
      vixThreshold: number;
    };
    fibZoneMultipliers: Record<string, number>;
    lastModified: string;
  } {
    const config = this.configService.getRiskManagementConfig();
    
    return {
      positionSizing: {
        maxRiskPerTrade: config.positionSizing.maxRiskPerTrade,
        maxPortfolioHeat: config.positionSizing.maxPortfolioHeat,
        maxDrawdown: config.positionSizing.maxDrawdown
      },
      limits: {
        maxConsecutiveLosses: config.limits.maxConsecutiveLosses,
        vixThreshold: config.limits.vixThreshold
      },
      fibZoneMultipliers: Object.fromEntries(
        Object.entries(config.positionSizing.fibZoneMultipliers).map(([zone, multiplier]) => [zone, multiplier])
      ),
      lastModified: this.configService.getConfig().lastModified
    };
  }

  // Parameter Presets

  /**
   * Apply parameter preset
   */
  public async applyParameterPreset(presetName: string, reason?: string): Promise<ParameterChangeResult> {
    try {
      const preset = this.presets.get(presetName);
      if (!preset) {
        return {
          success: false,
          validation: { 
            isValid: false, 
            errors: [{ 
              path: 'preset', 
              message: `Preset not found: ${presetName}`, 
              severity: 'error', 
              code: 'PRESET_NOT_FOUND' 
            }], 
            warnings: [] 
          },
          appliedChanges: [],
          warnings: [`Preset '${presetName}' not found`]
        };
      }

      // Apply preset parameters
      const results: ConfigValidationResult[] = [];
      const appliedChanges: string[] = [];

      if (preset.parameters.orchestrator) {
        const result = await this.configService.updateOrchestratorConfig(preset.parameters.orchestrator);
        results.push(result);
        appliedChanges.push('Updated orchestrator settings');
      }

      if (preset.parameters.signalProcessing) {
        const result = await this.configService.updateSignalProcessingConfig(preset.parameters.signalProcessing);
        results.push(result);
        appliedChanges.push('Updated signal processing settings');
      }

      if (preset.parameters.riskManagement) {
        const result = await this.configService.updateRiskManagementConfig(preset.parameters.riskManagement);
        results.push(result);
        appliedChanges.push('Updated risk management settings');
      }

      const allValid = results.every(r => r.isValid);
      const allWarnings = results.flatMap(r => r.warnings.map(w => w.message));

      if (allValid) {
        this.emit('presetApplied', {
          presetName,
          preset,
          reason,
          timestamp: new Date()
        });
      }

      return {
        success: allValid,
        validation: { 
          isValid: allValid, 
          errors: results.flatMap(r => r.errors), 
          warnings: results.flatMap(r => r.warnings) 
        },
        appliedChanges: [`Applied preset: ${presetName}`, ...appliedChanges],
        warnings: allWarnings
      };
    } catch (error) {
      return this.handleError('applyParameterPreset', error);
    }
  }

  /**
   * Get available parameter presets
   */
  public getAvailablePresets(): ParameterPreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Create custom parameter preset
   */
  public createCustomPreset(name: string, description: string, author: string): ParameterPreset {
    const currentConfig = this.configService.getConfig();
    
    const preset: ParameterPreset = {
      name,
      description,
      category: 'CUSTOM',
      parameters: {
        orchestrator: currentConfig.orchestrator,
        signalProcessing: currentConfig.signalProcessing,
        riskManagement: currentConfig.riskManagement
      },
      author,
      createdAt: new Date()
    };

    this.presets.set(name, preset);
    
    this.emit('presetCreated', {
      preset,
      timestamp: new Date()
    });

    return preset;
  }  // Private helper methods

  private validateTickers(tickers: string[]): string[] {
    return tickers.filter(ticker => {
      // Basic ticker validation
      return typeof ticker === 'string' && 
             ticker.length >= 1 && 
             ticker.length <= 5 && 
             /^[A-Z]+$/.test(ticker.toUpperCase());
    }).map(ticker => ticker.toUpperCase());
  }

  private validateRiskParameter(parameter: string, value: number): ConfigValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    switch (parameter) {
      case 'maxRiskPerTrade':
        if (value <= 0 || value > 0.1) {
          errors.push({
            path: 'maxRiskPerTrade',
            message: 'Max risk per trade must be between 0 and 10%',
            severity: 'error',
            code: 'INVALID_RISK_PER_TRADE'
          });
        } else if (value > 0.05) {
          warnings.push({
            path: 'maxRiskPerTrade',
            message: 'Risk per trade above 5% is aggressive',
            recommendation: 'Consider keeping risk per trade below 3%'
          });
        }
        break;
      case 'maxPortfolioHeat':
        if (value <= 0 || value > 0.5) {
          errors.push({
            path: 'maxPortfolioHeat',
            message: 'Max portfolio heat must be between 0 and 50%',
            severity: 'error',
            code: 'INVALID_PORTFOLIO_HEAT'
          });
        } else if (value > 0.25) {
          warnings.push({
            path: 'maxPortfolioHeat',
            message: 'Portfolio heat above 25% is very aggressive',
            recommendation: 'Consider keeping portfolio heat below 20%'
          });
        }
        break;
      case 'maxDrawdown':
        if (value <= 0 || value > 0.2) {
          errors.push({
            path: 'maxDrawdown',
            message: 'Max drawdown must be between 0 and 20%',
            severity: 'error',
            code: 'INVALID_DRAWDOWN'
          });
        } else if (value > 0.1) {
          warnings.push({
            path: 'maxDrawdown',
            message: 'Drawdown above 10% is aggressive',
            recommendation: 'Consider keeping drawdown below 5%'
          });
        }
        break;
      case 'maxConsecutiveLosses':
        if (!Number.isInteger(value) || value < 1 || value > 10) {
          errors.push({
            path: 'maxConsecutiveLosses',
            message: 'Max consecutive losses must be an integer between 1 and 10',
            severity: 'error',
            code: 'INVALID_CONSECUTIVE_LOSSES'
          });
        } else if (value > 5) {
          warnings.push({
            path: 'maxConsecutiveLosses',
            message: 'Allowing more than 5 consecutive losses is risky',
            recommendation: 'Consider limiting to 2-3 consecutive losses'
          });
        }
        break;
      case 'vixThreshold':
        if (value < 10 || value > 100) {
          errors.push({
            path: 'vixThreshold',
            message: 'VIX threshold must be between 10 and 100',
            severity: 'error',
            code: 'INVALID_VIX_THRESHOLD'
          });
        } else if (value < 20 || value > 50) {
          warnings.push({
            path: 'vixThreshold',
            message: 'VIX threshold outside typical range (20-50)',
            recommendation: 'Consider using a threshold between 25-35'
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private handleError(operation: string, error: any): ParameterChangeResult {
    console.error(`Error in ${operation}:`, error);
    
    this.emit('parameterError', {
      operation,
      error: error.message || error,
      timestamp: new Date()
    });

    return {
      success: false,
      validation: { 
        isValid: false, 
        errors: [{ 
          path: operation, 
          message: `Internal error: ${error.message || error}`, 
          severity: 'error', 
          code: 'INTERNAL_ERROR' 
        }], 
        warnings: [] 
      },
      appliedChanges: [],
      warnings: ['An internal error occurred']
    };
  }

  private initializePresets(): void {
    // Conservative preset
    this.presets.set('conservative', {
      name: 'Conservative',
      description: 'Low-risk settings for volatile market conditions',
      category: 'CONSERVATIVE',
      parameters: {
        orchestrator: {
          watchlist: ['SPY', 'QQQ', 'IWM'],
          maxConcurrentTrades: 2,
          confidenceThreshold: 0.75,
          fibZoneBlocklist: ['EXHAUSTION'],
          updateInterval: 30000,
          priorityWeights: {
            'SPY': 1.0,
            'QQQ': 0.8,
            'IWM': 0.6
          },
          cooldownPeriod: 300000,
          maxTickersPerWorker: 3
        },
        signalProcessing: {
          weights: {
            trendComposite: 0.30,
            momentumDivergence: 0.25,
            volumeProfile: 0.20,
            ribbonAlignment: 0.15,
            fibConfluence: 0.05,
            gammaExposure: 0.05
          },
          thresholds: {
            minConfidence: 0.6,
            maxConfidence: 0.95,
            convictionMultiplier: 1.2,
            regimeAdjustment: 0.1
          },
          adjustments: {
            regimeWeights: {
              'BULL_MARKET': 1.0,
              'BEAR_MARKET': 0.8,
              'SIDEWAYS': 0.9
            },
            volatilityAdjustments: {
              'low': 1.0,
              'medium': 0.8,
              'high': 0.6
            },
            timeOfDayMultipliers: {
              'premarket': 0.8,
              'market_open': 1.0,
              'midday': 0.9,
              'market_close': 1.1,
              'afterhours': 0.7
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
            maxRiskPerTrade: 0.015,
            maxPortfolioHeat: 0.15,
            maxDrawdown: 0.03,
            confidenceMultipliers: {
              high: 1.2,
              medium: 1.0,
              low: 0.8
            },
            fibZoneMultipliers: {
              'COMPRESSION': 1.0,
              'MID_EXPANSION': 0.8,
              'FULL_EXPANSION': 0.5,
              'OVER_EXTENSION': 0.2,
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
            maxConsecutiveLosses: 1,
            maxDailyLoss: 0.05,
            vixThreshold: 25,
            emergencyStopLoss: 0.1
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
        }
      },
      author: 'System',
      createdAt: new Date()
    });

    // Balanced preset
    this.presets.set('balanced', {
      name: 'Balanced',
      description: 'Default balanced settings for normal market conditions',
      category: 'BALANCED',
      parameters: {
        orchestrator: {
          watchlist: ['SPY', 'QQQ', 'IWM', 'XLF', 'XLK'],
          maxConcurrentTrades: 3,
          confidenceThreshold: 0.62,
          fibZoneBlocklist: ['EXHAUSTION'],
          updateInterval: 30000,
          priorityWeights: {
            'SPY': 1.0,
            'QQQ': 0.9,
            'IWM': 0.7,
            'XLF': 0.6,
            'XLK': 0.8
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
            convictionMultiplier: 1.1,
            regimeAdjustment: 0.1
          },
          adjustments: {
            regimeWeights: {
              'BULL_MARKET': 1.0,
              'BEAR_MARKET': 0.8,
              'SIDEWAYS': 0.9
            },
            volatilityAdjustments: {
              'low': 1.0,
              'medium': 0.8,
              'high': 0.6
            },
            timeOfDayMultipliers: {
              'premarket': 0.8,
              'market_open': 1.0,
              'midday': 0.9,
              'market_close': 1.1,
              'afterhours': 0.7
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
              high: 1.1,
              medium: 1.0,
              low: 0.9
            },
            fibZoneMultipliers: {
              'COMPRESSION': 1.2,
              'MID_EXPANSION': 1.0,
              'FULL_EXPANSION': 0.8,
              'OVER_EXTENSION': 0.4,
              'EXHAUSTION': 0.0
            },
            regimeAdjustments: {
              'BULL_MARKET': 1.0,
              'BEAR_MARKET': 0.8,
              'SIDEWAYS': 0.9
            },
            vixAdjustments: {
              low: 1.0,
              medium: 0.8,
              high: 0.6
            }
          },
          limits: {
            maxConsecutiveLosses: 2,
            maxDailyLoss: 0.08,
            vixThreshold: 30,
            emergencyStopLoss: 0.15
          },
          drawdownProtection: {
            maxDrawdownThreshold: 0.08,
            defensiveModeThreshold: 0.06,
            recoveryThreshold: 0.03,
            positionReductionFactor: 0.6,
            defensiveModeMultiplier: 0.4
          },
          marketRiskAdjustments: {
            fibZoneMultipliers: {
              'COMPRESSION': 1.1,
              'MID_EXPANSION': 1.0,
              'FULL_EXPANSION': 0.9,
              'OVER_EXTENSION': 0.6,
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
              high: 0.6,
              extreme: 0.3
            },
            regimeMultipliers: {
              'BULL_MARKET': 1.0,
              'BEAR_MARKET': 0.8,
              'SIDEWAYS': 0.9,
              'HIGH_VOLATILITY': 0.7,
              'LOW_VOLATILITY': 1.1
            },
            emergencyOverrides: {
              enabled: true,
              maxReduction: 0.15,
              triggerConditions: ['VIX > 40', 'SPY daily change > 3%']
            }
          }
        }
      },
      author: 'System',
      createdAt: new Date()
    });

    // Aggressive preset
    this.presets.set('aggressive', {
      name: 'Aggressive',
      description: 'Higher-risk settings for low-volatility bull markets',
      category: 'AGGRESSIVE',
      parameters: {
        orchestrator: {
          watchlist: ['SPY', 'QQQ', 'IWM', 'XLF', 'XLK', 'XLE', 'XLI', 'XLU'],
          maxConcurrentTrades: 5,
          confidenceThreshold: 0.55,
          fibZoneBlocklist: ['EXHAUSTION'],
          updateInterval: 30000,
          priorityWeights: {
            'SPY': 1.0,
            'QQQ': 0.9,
            'IWM': 0.8,
            'XLF': 0.7,
            'XLK': 0.8,
            'XLE': 0.6,
            'XLI': 0.7,
            'XLU': 0.5
          },
          cooldownPeriod: 300000,
          maxTickersPerWorker: 8
        },
        signalProcessing: {
          weights: {
            trendComposite: 0.20,
            momentumDivergence: 0.15,
            volumeProfile: 0.25,
            ribbonAlignment: 0.15,
            fibConfluence: 0.15,
            gammaExposure: 0.10
          },
          thresholds: {
            minConfidence: 0.4,
            maxConfidence: 0.95,
            convictionMultiplier: 1.0,
            regimeAdjustment: 0.1
          },
          adjustments: {
            regimeWeights: {
              'BULL_MARKET': 1.0,
              'BEAR_MARKET': 0.8,
              'SIDEWAYS': 0.9
            },
            volatilityAdjustments: {
              'low': 1.0,
              'medium': 0.8,
              'high': 0.6
            },
            timeOfDayMultipliers: {
              'premarket': 0.8,
              'market_open': 1.0,
              'midday': 0.9,
              'market_close': 1.1,
              'afterhours': 0.7
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
            maxRiskPerTrade: 0.03,
            maxPortfolioHeat: 0.25,
            maxDrawdown: 0.07,
            confidenceMultipliers: {
              high: 1.0,
              medium: 0.9,
              low: 0.8
            },
            fibZoneMultipliers: {
              'COMPRESSION': 1.5,
              'MID_EXPANSION': 1.2,
              'FULL_EXPANSION': 1.0,
              'OVER_EXTENSION': 0.6,
              'EXHAUSTION': 0.0
            },
            regimeAdjustments: {
              'BULL_MARKET': 1.0,
              'BEAR_MARKET': 0.8,
              'SIDEWAYS': 0.9
            },
            vixAdjustments: {
              low: 1.0,
              medium: 0.8,
              high: 0.6
            }
          },
          limits: {
            maxConsecutiveLosses: 3,
            maxDailyLoss: 0.12,
            vixThreshold: 35,
            emergencyStopLoss: 0.20
          },
          drawdownProtection: {
            maxDrawdownThreshold: 0.12,
            defensiveModeThreshold: 0.08,
            recoveryThreshold: 0.05,
            positionReductionFactor: 0.7,
            defensiveModeMultiplier: 0.5
          },
          marketRiskAdjustments: {
            fibZoneMultipliers: {
              'COMPRESSION': 1.3,
              'MID_EXPANSION': 1.1,
              'FULL_EXPANSION': 1.0,
              'OVER_EXTENSION': 0.7,
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
              high: 0.6,
              extreme: 0.4
            },
            regimeMultipliers: {
              'BULL_MARKET': 1.0,
              'BEAR_MARKET': 0.8,
              'SIDEWAYS': 0.9,
              'HIGH_VOLATILITY': 0.7,
              'LOW_VOLATILITY': 1.1
            },
            emergencyOverrides: {
              enabled: true,
              maxReduction: 0.20,
              triggerConditions: ['VIX > 45', 'SPY daily change > 4%']
            }
          }
        }
      },
      author: 'System',
      createdAt: new Date()
    });
  }

  /**
   * Get parameter customization summary
   */
  public getParameterSummary(): {
    watchlist: { count: number; tickers: string[] };
    signalWeights: { isValid: boolean; totalWeight: number };
    confidenceThresholds: { trading: number; min: number; max: number; isValid: boolean };
    riskParameters: { maxRiskPerTrade: number; maxPortfolioHeat: number; maxDrawdown: number };
    fibZoneMultipliers: Record<string, number>;
    availablePresets: string[];
    lastModified: string;
  } {
    const watchlistInfo = this.getWatchlistInfo();
    const signalWeightsInfo = this.getSignalWeightsInfo();
    const confidenceThresholdsInfo = this.getConfidenceThresholdsInfo();
    const riskParametersInfo = this.getRiskParametersInfo();

    return {
      watchlist: {
        count: watchlistInfo.count,
        tickers: watchlistInfo.tickers
      },
      signalWeights: {
        isValid: signalWeightsInfo.isValid,
        totalWeight: signalWeightsInfo.totalWeight
      },
      confidenceThresholds: {
        trading: confidenceThresholdsInfo.tradingThreshold,
        min: confidenceThresholdsInfo.minThreshold,
        max: confidenceThresholdsInfo.maxThreshold,
        isValid: confidenceThresholdsInfo.isValid
      },
      riskParameters: riskParametersInfo.positionSizing,
      fibZoneMultipliers: riskParametersInfo.fibZoneMultipliers,
      availablePresets: Array.from(this.presets.keys()),
      lastModified: this.configService.getConfig().lastModified
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.changeHistory.clear();
    this.presets.clear();
    this.removeAllListeners();
  }
}