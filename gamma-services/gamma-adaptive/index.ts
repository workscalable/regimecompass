// Gamma Adaptive Trading System v3.0
// Main exports for the complete production trading system

// Main system class
export { GammaAdaptiveSystem, DEFAULT_GAMMA_ADAPTIVE_CONFIG } from './GammaAdaptiveSystem.js';

// Core orchestrator and state management
export { MultiTickerOrchestrator } from './orchestrators/MultiTickerOrchestrator.js';
export { TickerStateManager } from './orchestrators/TickerStateManager.js';
export { PriorityManager } from './orchestrators/PriorityManager.js';
export { ConcurrentProcessor } from './orchestrators/ConcurrentProcessor.js';

// Analysis engines
export { SignalWeightingEngine } from './engines/SignalWeightingEngine.js';
export { FibExpansionEngine } from './engines/FibExpansionEngine.js';
export { GammaExposureEngine } from './engines/GammaExposureEngine.js';
export { OptionsRecommendationEngine } from './engines/OptionsRecommendationEngine.js';

// Type definitions
export * from './types/core.js';

// Version info
export const VERSION = '3.0.0';
export const BUILD_DATE = new Date().toISOString();

console.log(`Gamma Adaptive Trading System v${VERSION} loaded`);
console.log(`Build Date: ${BUILD_DATE}`);
console.log('🚀 Ready for production deployment with multi-asset orchestration');