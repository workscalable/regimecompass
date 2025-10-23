import { PositionManagementConfig } from './AutomatedPositionManager';

export const DEFAULT_POSITION_MANAGEMENT_CONFIG: PositionManagementConfig = {
  // Confidence-based exit parameters
  confidenceBasedExits: {
    highConfidence: {
      profitTarget: 0.75, // 75% profit target for high confidence trades
      stopLoss: 0.40, // 40% stop loss for high confidence trades
      timeDecayThreshold: 0.25 // 25% time decay threshold
    },
    mediumConfidence: {
      profitTarget: 0.50, // 50% profit target for medium confidence trades
      stopLoss: 0.50, // 50% stop loss for medium confidence trades
      timeDecayThreshold: 0.30 // 30% time decay threshold
    },
    lowConfidence: {
      profitTarget: 0.30, // 30% profit target for low confidence trades
      stopLoss: 0.60, // 60% stop loss for low confidence trades (tighter)
      timeDecayThreshold: 0.35 // 35% time decay threshold
    }
  },
  
  // Time-based exit parameters
  timeBasedExits: {
    maxHoldingPeriodHours: 72, // Maximum 72 hours (3 days) holding period
    expirationWarningDays: 2, // Warn 2 days before expiration
    forceExitBeforeExpirationHours: 4, // Force exit 4 hours before expiration
    weekendExitEnabled: false // Disable weekend exits by default
  },
  
  // Portfolio heat management
  portfolioHeatManagement: {
    maxPortfolioHeat: 0.20, // Maximum 20% portfolio heat
    heatReductionThreshold: 0.15, // Start reducing heat at 15%
    emergencyExitThreshold: 0.25, // Emergency exit at 25%
    consecutiveLossLimit: 3, // Maximum 3 consecutive losses
    drawdownProtectionThreshold: 0.05 // Trigger protection at 5% drawdown
  },
  
  // Position sizing validation
  positionSizing: {
    maxRiskPerTrade: 0.02, // Maximum 2% risk per trade
    maxPositionSize: 0.10, // Maximum 10% position size
    minPositionSize: 0.001, // Minimum 0.1% position size
    confidenceMultipliers: {
      high: 1.2, // 20% larger positions for high confidence
      medium: 1.0, // Normal size for medium confidence
      low: 0.8 // 20% smaller positions for low confidence
    }
  },
  
  // Automation settings
  automation: {
    enableAutoExits: true, // Enable automated exits
    enablePositionSizeValidation: true, // Enable position size validation
    enablePortfolioHeatManagement: true, // Enable portfolio heat management
    enableTimeBasedExits: true // Enable time-based exits
  }
};

export const CONSERVATIVE_POSITION_MANAGEMENT_CONFIG: PositionManagementConfig = {
  // More conservative confidence-based exits
  confidenceBasedExits: {
    highConfidence: {
      profitTarget: 0.50, // Lower profit targets
      stopLoss: 0.30, // Tighter stop losses
      timeDecayThreshold: 0.20
    },
    mediumConfidence: {
      profitTarget: 0.35,
      stopLoss: 0.40,
      timeDecayThreshold: 0.25
    },
    lowConfidence: {
      profitTarget: 0.25,
      stopLoss: 0.50,
      timeDecayThreshold: 0.30
    }
  },
  
  // More conservative time-based exits
  timeBasedExits: {
    maxHoldingPeriodHours: 48, // Shorter holding period
    expirationWarningDays: 3, // Earlier warning
    forceExitBeforeExpirationHours: 8, // Earlier force exit
    weekendExitEnabled: true // Exit before weekends
  },
  
  // More conservative portfolio heat management
  portfolioHeatManagement: {
    maxPortfolioHeat: 0.15, // Lower maximum heat
    heatReductionThreshold: 0.10, // Earlier heat reduction
    emergencyExitThreshold: 0.18, // Lower emergency threshold
    consecutiveLossLimit: 2, // Lower consecutive loss limit
    drawdownProtectionThreshold: 0.03 // Earlier drawdown protection
  },
  
  // More conservative position sizing
  positionSizing: {
    maxRiskPerTrade: 0.015, // Lower risk per trade
    maxPositionSize: 0.08, // Smaller maximum position size
    minPositionSize: 0.001,
    confidenceMultipliers: {
      high: 1.1, // Smaller multipliers
      medium: 1.0,
      low: 0.7
    }
  },
  
  // Full automation enabled
  automation: {
    enableAutoExits: true,
    enablePositionSizeValidation: true,
    enablePortfolioHeatManagement: true,
    enableTimeBasedExits: true
  }
};

export const AGGRESSIVE_POSITION_MANAGEMENT_CONFIG: PositionManagementConfig = {
  // More aggressive confidence-based exits
  confidenceBasedExits: {
    highConfidence: {
      profitTarget: 1.0, // Higher profit targets
      stopLoss: 0.50, // Wider stop losses
      timeDecayThreshold: 0.30
    },
    mediumConfidence: {
      profitTarget: 0.75,
      stopLoss: 0.60,
      timeDecayThreshold: 0.35
    },
    lowConfidence: {
      profitTarget: 0.50,
      stopLoss: 0.70,
      timeDecayThreshold: 0.40
    }
  },
  
  // More aggressive time-based exits
  timeBasedExits: {
    maxHoldingPeriodHours: 120, // Longer holding period
    expirationWarningDays: 1, // Later warning
    forceExitBeforeExpirationHours: 2, // Later force exit
    weekendExitEnabled: false // Hold through weekends
  },
  
  // More aggressive portfolio heat management
  portfolioHeatManagement: {
    maxPortfolioHeat: 0.30, // Higher maximum heat
    heatReductionThreshold: 0.25, // Later heat reduction
    emergencyExitThreshold: 0.35, // Higher emergency threshold
    consecutiveLossLimit: 5, // Higher consecutive loss limit
    drawdownProtectionThreshold: 0.08 // Later drawdown protection
  },
  
  // More aggressive position sizing
  positionSizing: {
    maxRiskPerTrade: 0.03, // Higher risk per trade
    maxPositionSize: 0.15, // Larger maximum position size
    minPositionSize: 0.001,
    confidenceMultipliers: {
      high: 1.5, // Larger multipliers
      medium: 1.0,
      low: 0.8
    }
  },
  
  // Full automation enabled
  automation: {
    enableAutoExits: true,
    enablePositionSizeValidation: true,
    enablePortfolioHeatManagement: true,
    enableTimeBasedExits: true
  }
};

// Configuration validation function
export function validatePositionManagementConfig(config: PositionManagementConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate confidence-based exits
  const confidenceLevels = ['highConfidence', 'mediumConfidence', 'lowConfidence'] as const;
  for (const level of confidenceLevels) {
    const exits = config.confidenceBasedExits[level];
    
    if (exits.profitTarget <= 0 || exits.profitTarget > 5) {
      errors.push(`${level} profit target must be between 0 and 5 (500%)`);
    }
    
    if (exits.stopLoss <= 0 || exits.stopLoss > 1) {
      errors.push(`${level} stop loss must be between 0 and 1 (100%)`);
    }
    
    if (exits.timeDecayThreshold <= 0 || exits.timeDecayThreshold > 1) {
      errors.push(`${level} time decay threshold must be between 0 and 1`);
    }
  }
  
  // Validate time-based exits
  if (config.timeBasedExits.maxHoldingPeriodHours <= 0) {
    errors.push('Maximum holding period must be positive');
  }
  
  if (config.timeBasedExits.expirationWarningDays < 0) {
    errors.push('Expiration warning days cannot be negative');
  }
  
  if (config.timeBasedExits.forceExitBeforeExpirationHours < 0) {
    errors.push('Force exit before expiration hours cannot be negative');
  }
  
  // Validate portfolio heat management
  if (config.portfolioHeatManagement.maxPortfolioHeat <= 0 || config.portfolioHeatManagement.maxPortfolioHeat > 1) {
    errors.push('Maximum portfolio heat must be between 0 and 1');
  }
  
  if (config.portfolioHeatManagement.heatReductionThreshold >= config.portfolioHeatManagement.maxPortfolioHeat) {
    errors.push('Heat reduction threshold must be less than maximum portfolio heat');
  }
  
  if (config.portfolioHeatManagement.emergencyExitThreshold <= config.portfolioHeatManagement.maxPortfolioHeat) {
    errors.push('Emergency exit threshold should be greater than maximum portfolio heat');
  }
  
  if (config.portfolioHeatManagement.consecutiveLossLimit <= 0) {
    errors.push('Consecutive loss limit must be positive');
  }
  
  if (config.portfolioHeatManagement.drawdownProtectionThreshold <= 0 || config.portfolioHeatManagement.drawdownProtectionThreshold > 1) {
    errors.push('Drawdown protection threshold must be between 0 and 1');
  }
  
  // Validate position sizing
  if (config.positionSizing.maxRiskPerTrade <= 0 || config.positionSizing.maxRiskPerTrade > 1) {
    errors.push('Maximum risk per trade must be between 0 and 1');
  }
  
  if (config.positionSizing.maxPositionSize <= 0 || config.positionSizing.maxPositionSize > 1) {
    errors.push('Maximum position size must be between 0 and 1');
  }
  
  if (config.positionSizing.minPositionSize <= 0 || config.positionSizing.minPositionSize >= config.positionSizing.maxPositionSize) {
    errors.push('Minimum position size must be positive and less than maximum position size');
  }
  
  // Validate confidence multipliers
  const multipliers = config.positionSizing.confidenceMultipliers;
  if (multipliers.high <= 0 || multipliers.medium <= 0 || multipliers.low <= 0) {
    errors.push('All confidence multipliers must be positive');
  }
  
  if (multipliers.high < multipliers.medium || multipliers.medium < multipliers.low) {
    errors.push('Confidence multipliers should be ordered: high >= medium >= low');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Helper function to create custom configuration
export function createCustomPositionManagementConfig(
  baseConfig: PositionManagementConfig = DEFAULT_POSITION_MANAGEMENT_CONFIG,
  overrides: Partial<PositionManagementConfig> = {}
): PositionManagementConfig {
  const config = {
    ...baseConfig,
    ...overrides,
    confidenceBasedExits: {
      ...baseConfig.confidenceBasedExits,
      ...overrides.confidenceBasedExits
    },
    timeBasedExits: {
      ...baseConfig.timeBasedExits,
      ...overrides.timeBasedExits
    },
    portfolioHeatManagement: {
      ...baseConfig.portfolioHeatManagement,
      ...overrides.portfolioHeatManagement
    },
    positionSizing: {
      ...baseConfig.positionSizing,
      ...overrides.positionSizing
    },
    automation: {
      ...baseConfig.automation,
      ...overrides.automation
    }
  };
  
  const validation = validatePositionManagementConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid position management configuration: ${validation.errors.join(', ')}`);
  }
  
  return config;
}

// Export configuration presets
export const POSITION_MANAGEMENT_PRESETS = {
  DEFAULT: DEFAULT_POSITION_MANAGEMENT_CONFIG,
  CONSERVATIVE: CONSERVATIVE_POSITION_MANAGEMENT_CONFIG,
  AGGRESSIVE: AGGRESSIVE_POSITION_MANAGEMENT_CONFIG
} as const;

export type PositionManagementPreset = keyof typeof POSITION_MANAGEMENT_PRESETS;