// File: /gamma-services/mtf/core/MTFConfig.ts

import { TradeState } from './TradeDecisionEngine';
import { AlertConfig } from '../alerts/AlertManager';

export interface MTFConfiguration {
  timeframeWeights: {
    daily: number;
    hourly: number;
    thirty: number;
  };
  confidenceThresholds: {
    readyToSet: number;
    setToGo: number;
    goToTrade: number;
    tradeToExit: number;
  };
  bonusMultipliers: {
    powerCandle: number;
    volumeSurge: number;
    ribbonAlignment: number;
  };
  riskAdjustments: {
    highConfidenceMultiplier: number;
    mediumConfidenceMultiplier: number;
    lowConfidenceMultiplier: number;
    regimeBiasAdjustment: number;
  };
  stateTiming: {
    minimumStateDurations: Record<TradeState, number>;
    sequenceTimeout: number;
    cooldownPeriod: number;
    maxTransitionsPerWindow: number;
    transitionWindow: number;
  };
  fibonacciZones: {
    compressionBonus: number;
    exhaustionPenalty: number;
    extendedZoneStopMultiplier: number;
    extendedZoneTimeMultiplier: number;
  };
  gammaExposure: {
    maxAdjustment: number;
    adjustmentMultiplier: number;
    pinningRiskThreshold: number;
  };
  alertSettings: AlertConfig;
  persistence: {
    logRetentionDays: number;
    maxLogEntries: number;
    backupInterval: number;
    compressionEnabled: boolean;
  };
}

export class MTFConfigManager {
  private static instance: MTFConfigManager;
  private config: MTFConfiguration;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): MTFConfigManager {
    if (!MTFConfigManager.instance) {
      MTFConfigManager.instance = new MTFConfigManager();
    }
    return MTFConfigManager.instance;
  }

  public getConfig(): MTFConfiguration {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<MTFConfiguration>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }

  public resetToDefaults(): void {
    this.config = this.getDefaultConfig();
  }

  public getTimeframeWeights() {
    return this.config.timeframeWeights;
  }

  public getConfidenceThresholds() {
    return this.config.confidenceThresholds;
  }

  public getBonusMultipliers() {
    return this.config.bonusMultipliers;
  }

  public getRiskAdjustments() {
    return this.config.riskAdjustments;
  }

  public getStateTiming() {
    return this.config.stateTiming;
  }

  public getFibonacciZones() {
    return this.config.fibonacciZones;
  }

  public getGammaExposure() {
    return this.config.gammaExposure;
  }

  public getAlertSettings() {
    return this.config.alertSettings;
  }

  public getPersistenceSettings() {
    return this.config.persistence;
  }

  private getDefaultConfig(): MTFConfiguration {
    return {
      timeframeWeights: {
        daily: 0.40,    // Highest weight for trend context
        hourly: 0.35,   // Medium weight for momentum
        thirty: 0.25    // Lower weight for entry timing
      },
      confidenceThresholds: {
        readyToSet: 0.55,    // 30m confidence threshold
        setToGo: 0.60,       // Hourly confidence threshold
        goToTrade: 0.70,     // MTF confluence threshold
        tradeToExit: 0.50    // Exit threshold
      },
      bonusMultipliers: {
        powerCandle: 0.04,        // 4% bonus for power candles
        volumeSurge: 0.03,        // 3% bonus for volume surge
        ribbonAlignment: 0.05     // 5% bonus for ribbon alignment
      },
      riskAdjustments: {
        highConfidenceMultiplier: 1.25,  // >70% confidence
        mediumConfidenceMultiplier: 1.1, // 60-70% confidence
        lowConfidenceMultiplier: 0.5,    // <60% confidence
        regimeBiasAdjustment: 0.1        // ±10% for regime bias
      },
      stateTiming: {
        minimumStateDurations: {
          'READY': 60000,    // 1 minute
          'SET': 120000,     // 2 minutes
          'GO': 60000,       // 1 minute
          'TRADE': 30000,    // 30 seconds
          'EXIT': 30000,     // 30 seconds
          'ABORT': 10000     // 10 seconds
        },
        sequenceTimeout: 7200000,      // 2 hours
        cooldownPeriod: 300000,        // 5 minutes
        maxTransitionsPerWindow: 5,    // Max transitions in window
        transitionWindow: 300000       // 5 minute window
      },
      fibonacciZones: {
        compressionBonus: 0.03,           // 3% bonus in compression
        exhaustionPenalty: -0.05,         // 5% penalty in exhaustion
        extendedZoneStopMultiplier: 0.7,  // Tighter stops in extended zones
        extendedZoneTimeMultiplier: 0.8   // Less time in extended zones
      },
      gammaExposure: {
        maxAdjustment: 0.1,          // ±10% max adjustment
        adjustmentMultiplier: 0.05,   // 5% per unit of gamma exposure
        pinningRiskThreshold: 0.3     // High positive GEX threshold
      },
      alertSettings: {
        enabled: true,
        channels: {
          slack: { enabled: false },
          telegram: { enabled: false },
          discord: { enabled: false },
          dashboard: { enabled: true }
        },
        cooldowns: {
          LOW: 300000,    // 5 minutes
          MEDIUM: 120000, // 2 minutes
          HIGH: 60000,    // 1 minute
          CRITICAL: 30000 // 30 seconds
        }
      },
      persistence: {
        logRetentionDays: 30,
        maxLogEntries: 10000,
        backupInterval: 86400000,  // 24 hours
        compressionEnabled: true
      }
    };
  }

  private validateConfig(): void {
    const config = this.config;

    // Validate timeframe weights sum to 1
    const weightSum = config.timeframeWeights.daily + 
                     config.timeframeWeights.hourly + 
                     config.timeframeWeights.thirty;
    
    if (Math.abs(weightSum - 1.0) > 0.001) {
      throw new Error(`Timeframe weights must sum to 1.0, got ${weightSum}`);
    }

    // Validate confidence thresholds are in valid range
    Object.entries(config.confidenceThresholds).forEach(([key, value]) => {
      if (value < 0 || value > 1) {
        throw new Error(`Confidence threshold ${key} must be between 0 and 1, got ${value}`);
      }
    });

    // Validate bonus multipliers are reasonable
    Object.entries(config.bonusMultipliers).forEach(([key, value]) => {
      if (value < 0 || value > 0.2) {
        throw new Error(`Bonus multiplier ${key} must be between 0 and 0.2, got ${value}`);
      }
    });

    // Validate risk adjustments
    Object.entries(config.riskAdjustments).forEach(([key, value]) => {
      if (value < 0 || value > 5) {
        throw new Error(`Risk adjustment ${key} must be between 0 and 5, got ${value}`);
      }
    });

    // Validate state timing
    Object.entries(config.stateTiming.minimumStateDurations).forEach(([key, value]) => {
      if (value < 0 || value > 3600000) { // Max 1 hour
        throw new Error(`State duration ${key} must be between 0 and 3600000ms, got ${value}`);
      }
    });

    console.log('MTF configuration validated successfully');
  }

  public exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  public importConfig(configJson: string): void {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = { ...this.getDefaultConfig(), ...importedConfig };
      this.validateConfig();
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error.message}`);
    }
  }

  public getConfigSummary(): {
    timeframeWeights: string;
    confidenceThresholds: string;
    stateTiming: string;
    alertsEnabled: boolean;
  } {
    return {
      timeframeWeights: `Daily: ${this.config.timeframeWeights.daily}, Hourly: ${this.config.timeframeWeights.hourly}, 30m: ${this.config.timeframeWeights.thirty}`,
      confidenceThresholds: `Ready→Set: ${this.config.confidenceThresholds.readyToSet}, Set→Go: ${this.config.confidenceThresholds.setToGo}, Go→Trade: ${this.config.confidenceThresholds.goToTrade}`,
      stateTiming: `Sequence timeout: ${this.config.stateTiming.sequenceTimeout / 1000}s, Cooldown: ${this.config.stateTiming.cooldownPeriod / 1000}s`,
      alertsEnabled: this.config.alertSettings.enabled
    };
  }
}