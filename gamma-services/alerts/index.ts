import { AlertSystem } from './AlertSystem';
import { EventBus } from '../core/EventBus';

// Singleton instance
let alertSystemInstance: AlertSystem | null = null;

export function initializeAlertSystem(eventBus: EventBus): AlertSystem {
  if (!alertSystemInstance) {
    alertSystemInstance = new AlertSystem(eventBus);
  }
  return alertSystemInstance;
}

export function getAlertSystem(): AlertSystem {
  if (!alertSystemInstance) {
    throw new Error('AlertSystem not initialized. Call initializeAlertSystem first.');
  }
  return alertSystemInstance;
}

export * from './AlertSystem';