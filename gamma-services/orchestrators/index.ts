import { RealtimeOrchestrator, RealtimeOrchestratorConfig } from './RealtimeOrchestrator';
import { MultiTickerOrchestrator } from './MultiTickerOrchestrator';
import { ReadySetGoController } from './ReadySetGoController';
import { EventBus } from '../core/EventBus';
import { DatabaseManager } from '../database/DatabaseManager';

// Singleton instance
let realtimeOrchestratorInstance: RealtimeOrchestrator | null = null;

export function initializeRealtimeOrchestrator(
  eventBus: EventBus,
  databaseManager: DatabaseManager,
  config: RealtimeOrchestratorConfig
): RealtimeOrchestrator {
  if (!realtimeOrchestratorInstance) {
    realtimeOrchestratorInstance = new RealtimeOrchestrator(eventBus, databaseManager, config);
  }
  return realtimeOrchestratorInstance;
}

export function getRealtimeOrchestrator(): RealtimeOrchestrator {
  if (!realtimeOrchestratorInstance) {
    throw new Error('RealtimeOrchestrator not initialized. Call initializeRealtimeOrchestrator first.');
  }
  return realtimeOrchestratorInstance;
}

// Default configuration factory
export function createDefaultOrchestratorConfig(): RealtimeOrchestratorConfig {
  return {
    multiTickerEnabled: true,
    singleTickerMode: false,
    currentTicker: 'SPY',
    paperTradingEnabled: true,
    liveTradingEnabled: false,
    watchlist: ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT', 'NVDA', 'TSLA'],
    maxConcurrentTrades: 5,
    confidenceThreshold: 0.65,
    multiTickerMode: 'PRIORITY',
    minRRThreshold: 2.0,
    confidenceDeltaThreshold: 0.04,
    cooldownPeriod: 30000,
    enableRegimeFiltering: true,
    enableLearning: true,
    healthCheckInterval: 60000,
    autoSwitchThreshold: 0.75,
    performanceTrackingEnabled: true,
    performanceReviewInterval: 60,
    emergencyShutdownEnabled: true,
    maxDrawdownThreshold: 0.15,
    maxConsecutiveLosses: 5
  };
}

// Configuration presets
export const OrchestratorPresets = {
  CONSERVATIVE: {
    confidenceThreshold: 0.75,
    maxConcurrentTrades: 3,
    multiTickerMode: 'PRIORITY' as const,
    emergencyShutdownEnabled: true,
    maxDrawdownThreshold: 0.10,
    maxConsecutiveLosses: 3
  },
  
  BALANCED: {
    confidenceThreshold: 0.65,
    maxConcurrentTrades: 5,
    multiTickerMode: 'PRIORITY' as const,
    emergencyShutdownEnabled: true,
    maxDrawdownThreshold: 0.15,
    maxConsecutiveLosses: 5
  },
  
  AGGRESSIVE: {
    confidenceThreshold: 0.55,
    maxConcurrentTrades: 8,
    multiTickerMode: 'EQUAL_WEIGHT' as const,
    emergencyShutdownEnabled: true,
    maxDrawdownThreshold: 0.20,
    maxConsecutiveLosses: 7
  },
  
  SINGLE_TICKER_FOCUS: {
    singleTickerMode: true,
    multiTickerEnabled: false,
    maxConcurrentTrades: 1,
    confidenceThreshold: 0.70,
    emergencyShutdownEnabled: true,
    maxDrawdownThreshold: 0.12,
    maxConsecutiveLosses: 4
  }
};

export * from './RealtimeOrchestrator';
export * from './MultiTickerOrchestrator';
export * from './ReadySetGoController';