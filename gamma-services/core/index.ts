import { EventBus } from './EventBus';
import { MultiTickerEventManager } from './MultiTickerEventManager';

// Singleton instances
let eventBusInstance: EventBus | null = null;
let multiTickerEventManagerInstance: MultiTickerEventManager | null = null;

export function getEventBus(): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = EventBus.getInstance();
  }
  return eventBusInstance;
}

export function initializeMultiTickerEventManager(): MultiTickerEventManager {
  if (!multiTickerEventManagerInstance) {
    const eventBus = getEventBus();
    multiTickerEventManagerInstance = new MultiTickerEventManager(eventBus);
  }
  return multiTickerEventManagerInstance;
}

export function getMultiTickerEventManager(): MultiTickerEventManager {
  if (!multiTickerEventManagerInstance) {
    return initializeMultiTickerEventManager();
  }
  return multiTickerEventManagerInstance;
}

export * from './EventBus';
export * from './MultiTickerEventManager';