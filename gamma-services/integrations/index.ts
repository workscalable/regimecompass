import { SignalWeightingIntegration } from './SignalWeightingIntegration';
import { EventBus } from '../core/EventBus';
import { EnhancedSignalWeightingEngine } from '../signals/EnhancedSignalWeightingEngine';

// Singleton instance
let signalWeightingIntegrationInstance: SignalWeightingIntegration | null = null;

export function initializeSignalWeightingIntegration(
  eventBus: EventBus,
  enhancedEngine?: EnhancedSignalWeightingEngine
): SignalWeightingIntegration {
  if (!signalWeightingIntegrationInstance) {
    signalWeightingIntegrationInstance = new SignalWeightingIntegration(eventBus, enhancedEngine);
  }
  return signalWeightingIntegrationInstance;
}

export function getSignalWeightingIntegration(): SignalWeightingIntegration {
  if (!signalWeightingIntegrationInstance) {
    throw new Error('SignalWeightingIntegration not initialized. Call initializeSignalWeightingIntegration first.');
  }
  return signalWeightingIntegrationInstance;
}

export * from './SignalWeightingIntegration';
export * from '../signals/EnhancedSignalWeightingEngine';