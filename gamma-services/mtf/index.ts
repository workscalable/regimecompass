// File: /gamma-services/mtf/index.ts

// Core exports
export { MTFTradeDecisionEngine } from './core/TradeDecisionEngine';
export { TradeStateManager } from './core/TradeStateManager';
export { MTFConfigManager } from './core/MTFConfig';
export { EnhancedReadySetGoController } from './core/EnhancedReadySetGoController';

// Orchestrator exports
export { TemporalSequencer } from './orchestrator/TemporalSequencer';

// Alert exports
export { AlertManager } from './alerts/AlertManager';
export { WebhookDispatcher } from './alerts/WebhookDispatcher';

// Schema and validation exports
export * from './core/MTFSchemas';

// Type exports for external use
export type {
  TimeframeSignal,
  MTFSignalBundle,
  TradeDecision,
  TradeState,
  TemporalContext,
  StateTransition,
  SequenceData,
  Alert,
  MTFConfiguration
} from './core/MTFSchemas';

export type {
  EnhancedTradeExecution,
  PositionExit
} from './core/EnhancedReadySetGoController';

export type {
  AlertConfig,
  WebhookResponse
} from './alerts/AlertManager';

// Utility functions
export const MTFUtils = {
  // Create a mock signal bundle for testing
  createMockSignalBundle: (ticker: string, overrides: Partial<MTFSignalBundle> = {}): MTFSignalBundle => {
    return {
      ticker,
      daily: {
        confidence: 0.7,
        bias: 'LONG',
        powerCandle: false,
        volumeSurge: false,
        ribbonAlignment: 0.8,
        momentumDivergence: 0.1,
        timestamp: Date.now()
      },
      hourly: {
        confidence: 0.65,
        bias: 'LONG',
        powerCandle: false,
        volumeSurge: true,
        ribbonAlignment: 0.75,
        momentumDivergence: 0.05,
        timestamp: Date.now()
      },
      thirty: {
        confidence: 0.6,
        bias: 'LONG',
        powerCandle: true,
        volumeSurge: true,
        ribbonAlignment: 0.7,
        momentumDivergence: 0.0,
        timestamp: Date.now()
      },
      regimeBias: 0.6,
      fibZone: 1.0,
      gammaExposure: -0.1,
      vwapDeviation: 0.02,
      ...overrides
    };
  },

  // Calculate state transition probability
  calculateTransitionProbability: (
    currentState: TradeState,
    targetState: TradeState,
    confidence: number,
    mtfConfluence: number
  ): number => {
    const stateTransitions = {
      'READY': { 'SET': confidence > 0.55 ? 0.8 : 0.2 },
      'SET': { 
        'GO': mtfConfluence > 0.65 ? 0.9 : 0.3,
        'READY': mtfConfluence < 0.4 ? 0.7 : 0.1
      },
      'GO': { 
        'TRADE': mtfConfluence > 0.70 ? 0.95 : 0.4,
        'SET': mtfConfluence < 0.60 ? 0.6 : 0.2
      },
      'TRADE': { 
        'EXIT': confidence < 0.50 ? 0.8 : 0.3,
        'ABORT': confidence < 0.30 ? 0.9 : 0.1
      },
      'EXIT': { 'READY': 0.9 },
      'ABORT': { 'READY': 0.9 }
    };

    return stateTransitions[currentState]?.[targetState] || 0;
  },

  // Format confidence as percentage
  formatConfidence: (confidence: number): string => {
    return `${(confidence * 100).toFixed(1)}%`;
  },

  // Format duration in human readable format
  formatDuration: (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },

  // Get state emoji
  getStateEmoji: (state: TradeState): string => {
    const emojis = {
      'READY': '⏹️',
      'SET': '🟡',
      'GO': '🟢',
      'TRADE': '🚀',
      'EXIT': '📤',
      'ABORT': '🚫'
    };
    return emojis[state] || '❓';
  },

  // Get priority color
  getPriorityColor: (priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): string => {
    const colors = {
      'LOW': '#36a64f',
      'MEDIUM': '#f2c744',
      'HIGH': '#e67e22',
      'CRITICAL': '#e74c3c'
    };
    return colors[priority] || '#95a5a6';
  },

  // Validate ticker format
  isValidTicker: (ticker: string): boolean => {
    return /^[A-Z]{1,10}$/.test(ticker);
  },

  // Calculate timeframe alignment score
  calculateAlignmentScore: (alignment: { daily: boolean; hourly: boolean; thirty: boolean }): number => {
    const alignedCount = Object.values(alignment).filter(Boolean).length;
    return alignedCount / 3;
  },

  // Generate decision summary
  generateDecisionSummary: (decision: TradeDecision): string => {
    const emoji = MTFUtils.getStateEmoji(decision.state);
    const confidence = MTFUtils.formatConfidence(decision.confidence);
    const alignment = MTFUtils.calculateAlignmentScore(decision.timeframeAlignment);
    
    return `${emoji} ${decision.ticker} | ${decision.state} | ${confidence} confidence | ${(alignment * 100).toFixed(0)}% aligned`;
  }
};

// Constants
export const MTF_CONSTANTS = {
  // Default timeframe weights
  DEFAULT_WEIGHTS: {
    DAILY: 0.40,
    HOURLY: 0.35,
    THIRTY: 0.25
  },

  // State transition thresholds
  THRESHOLDS: {
    READY_TO_SET: 0.55,
    SET_TO_GO: 0.60,
    GO_TO_TRADE: 0.70,
    TRADE_TO_EXIT: 0.50
  },

  // Bonus multipliers
  BONUSES: {
    POWER_CANDLE: 0.04,
    VOLUME_SURGE: 0.03,
    RIBBON_ALIGNMENT: 0.05
  },

  // Risk adjustments
  RISK_MULTIPLIERS: {
    HIGH_CONFIDENCE: 1.25,
    MEDIUM_CONFIDENCE: 1.1,
    LOW_CONFIDENCE: 0.5
  },

  // State durations (milliseconds)
  STATE_DURATIONS: {
    READY: 60000,    // 1 minute
    SET: 120000,     // 2 minutes
    GO: 60000,       // 1 minute
    TRADE: 30000,    // 30 seconds
    EXIT: 30000,     // 30 seconds
    ABORT: 10000     // 10 seconds
  },

  // Alert cooldowns (milliseconds)
  ALERT_COOLDOWNS: {
    LOW: 300000,     // 5 minutes
    MEDIUM: 120000,  // 2 minutes
    HIGH: 60000,     // 1 minute
    CRITICAL: 30000  // 30 seconds
  },

  // File paths
  PATHS: {
    TRADE_LOG: 'gamma-services/mtf/data/trade_state_log.json',
    ACTIVE_SIGNALS: 'gamma-services/mtf/data/active_signals.json',
    CONFIG: 'gamma-services/mtf/data/mtf_config.json'
  }
};

// Version information
export const MTF_VERSION = {
  VERSION: '3.0.0',
  BUILD_DATE: new Date().toISOString(),
  FEATURES: [
    'Multi-timeframe confluence scoring',
    'Temporal state sequencing',
    'Dynamic risk management',
    'Multi-channel alerting',
    'Production-grade persistence',
    'Comprehensive validation'
  ]
};

// Export default configuration factory
export const createMTFSystem = (eventBus: any, config?: Partial<MTFConfiguration>) => {
  // Initialize configuration
  const configManager = MTFConfigManager.getInstance();
  if (config) {
    configManager.updateConfig(config);
  }

  // Create core components
  const decisionEngine = new MTFTradeDecisionEngine(eventBus);
  const controller = new EnhancedReadySetGoController(eventBus);
  const alertManager = new AlertManager(configManager.getAlertSettings());

  return {
    decisionEngine,
    controller,
    alertManager,
    configManager,
    version: MTF_VERSION,
    utils: MTFUtils,
    constants: MTF_CONSTANTS
  };
};