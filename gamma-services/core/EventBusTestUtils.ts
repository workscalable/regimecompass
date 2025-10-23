import { EventBus } from './EventBus';
import { MultiTickerEventManager } from './MultiTickerEventManager';
import { TradeSignal } from '../models/PaperTradingTypes';

// Test utilities for EventBus and MultiTickerEventManager
export class EventBusTestUtils {
  private eventBus: EventBus;
  private eventManager: MultiTickerEventManager;
  private testSubscriptions: string[] = [];
  private receivedEvents: Array<{ event: string; data: any; timestamp: Date }> = [];

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.eventManager = new MultiTickerEventManager(this.eventBus);
  }

  // Test basic event emission and listening
  public testBasicEventFlow(): void {
    console.log('📡 Testing basic event flow...');
    
    let eventReceived = false;
    
    // Set up listener
    this.eventBus.on('trade:signal', (data) => {
      eventReceived = true;
      console.log('✅ Trade signal received:', data);
    });
    
    // Emit test signal
    const testSignal: TradeSignal = {
      signalId: 'test_signal_1',
      ticker: 'TEST',
      side: 'LONG',
      confidence: 0.75,
      conviction: 0.8,
      expectedMove: 2.5,
      timeframe: 'MEDIUM',
      regime: 'BULL',
      source: 'MANUAL',
      timestamp: new Date()
    };
    
    this.eventBus.emit('trade:signal', testSignal);
    
    if (eventReceived) {
      console.log('✅ Basic event flow test passed');
    } else {
      console.log('❌ Basic event flow test failed');
    }
  }

  // Test multi-ticker event routing
  public testMultiTickerRouting(): void {
    console.log('📡 Testing multi-ticker event routing...');
    
    const testTickers = ['AAPL', 'MSFT', 'GOOGL'];
    const receivedEvents: Record<string, any[]> = {};
    
    // Register tickers
    testTickers.forEach(ticker => {
      this.eventManager.registerTicker(ticker, ['trade:signal', 'confidence:update']);
      receivedEvents[ticker] = [];
      
      // Subscribe to ticker events
      const subscriptionId = this.eventManager.subscribeToTicker(
        ticker,
        ['trade:signal'],
        (event, data) => {
          receivedEvents[ticker].push({ event, data });
        }
      );
      
      this.testSubscriptions.push(subscriptionId);
    });
    
    // Emit ticker-specific signals
    testTickers.forEach((ticker, index) => {
      const signal: TradeSignal = {
        signalId: `test_${ticker}_${index}`,
        ticker,
        side: 'LONG',
        confidence: 0.6 + (index * 0.1),
        conviction: 0.7,
        expectedMove: 2.0 + index,
        timeframe: 'MEDIUM',
        regime: 'BULL',
        source: 'MANUAL',
        timestamp: new Date()
      };
      
      this.eventBus.emitTickerSignal(ticker, signal);
    });
    
    // Check results
    setTimeout(() => {
      let allReceived = true;
      testTickers.forEach(ticker => {
        if (receivedEvents[ticker].length === 0) {
          allReceived = false;
          console.log(`❌ No events received for ${ticker}`);
        } else {
          console.log(`✅ Events received for ${ticker}: ${receivedEvents[ticker].length}`);
        }
      });
      
      if (allReceived) {
        console.log('✅ Multi-ticker routing test passed');
      } else {
        console.log('❌ Multi-ticker routing test failed');
      }
    }, 100);
  }

  // Test event aggregation
  public testEventAggregation(): void {
    console.log('📡 Testing event aggregation...');
    
    let aggregatedEvents: any[] = [];
    
    // Set up confidence aggregation
    this.eventManager.setupConfidenceAggregation(500, 5); // 500ms window, 5 max batch
    
    // Listen for aggregated events
    this.eventBus.on('aggregate:confidence:batch', (data) => {
      aggregatedEvents.push(data);
      console.log('✅ Aggregated confidence batch received:', data.updates.length, 'updates');
    });
    
    // Emit multiple confidence updates rapidly
    const confidenceUpdates = [
      { ticker: 'AAPL', confidence: 75, delta: 2 },
      { ticker: 'MSFT', confidence: 82, delta: -1 },
      { ticker: 'GOOGL', confidence: 68, delta: 3 },
      { ticker: 'AMZN', confidence: 71, delta: 0 },
      { ticker: 'TSLA', confidence: 65, delta: -2 }
    ];
    
    this.eventManager.emitBatchConfidenceUpdates(confidenceUpdates);
    
    // Check results after aggregation window
    setTimeout(() => {
      if (aggregatedEvents.length > 0) {
        console.log('✅ Event aggregation test passed');
      } else {
        console.log('❌ Event aggregation test failed');
      }
    }, 600);
  }

  // Test event batching
  public testEventBatching(): void {
    console.log('📡 Testing event batching...');
    
    this.eventManager.enableBatchProcessing(3, 200); // 3 events or 200ms
    
    let batchedEventsReceived = 0;
    
    // Listen for individual events (should be batched)
    this.eventBus.on('engine:confidence', (data) => {
      batchedEventsReceived++;
    });
    
    // Emit events rapidly
    for (let i = 0; i < 10; i++) {
      this.eventBus.emitConfidenceUpdate(`TEST${i}`, 0.5 + (i * 0.05), 0.01);
    }
    
    // Check batching effectiveness after delay
    setTimeout(() => {
      console.log(`📊 Batched events received: ${batchedEventsReceived}`);
      if (batchedEventsReceived <= 5) { // Should be fewer due to batching
        console.log('✅ Event batching test passed');
      } else {
        console.log('❌ Event batching test failed - too many individual events');
      }
      
      this.eventManager.disableBatchProcessing();
    }, 300);
  }

  // Test performance under load
  public testPerformanceLoad(eventCount: number = 1000): void {
    console.log(`📡 Testing performance with ${eventCount} events...`);
    
    const startTime = performance.now();
    let eventsReceived = 0;
    
    // Set up listener
    this.eventBus.on('system:health', (data) => {
      eventsReceived++;
    });
    
    // Emit events rapidly
    for (let i = 0; i < eventCount; i++) {
      this.eventBus.emit('system:health', {
        id: i,
        ticker: `TEST${i % 10}`,
        timestamp: Date.now()
      });
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    const throughput = eventCount / (duration / 1000);
    
    console.log(`📊 Performance Results:`);
    console.log(`  Events emitted: ${eventCount}`);
    console.log(`  Events received: ${eventsReceived}`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(`  Throughput: ${throughput.toFixed(0)} events/second`);
    
    if (eventsReceived === eventCount && throughput > 1000) {
      console.log('✅ Performance test passed');
    } else {
      console.log('❌ Performance test failed');
    }
  }

  // Test event filtering
  public testEventFiltering(): void {
    console.log('📡 Testing event filtering...');
    
    let filteredEventsReceived = 0;
    let allEventsReceived = 0;
    
    // Add filter for specific ticker
    this.eventManager.addTickerFilter('FILTER_TEST', ['trade:signal'], (data) => {
      return data.confidence > 0.7; // Only allow high confidence signals
    });
    
    // Listen for all trade signals
    this.eventBus.on('trade:signal', (data) => {
      allEventsReceived++;
      if (data.ticker === 'FILTER_TEST' && data.confidence > 0.7) {
        filteredEventsReceived++;
      }
    });
    
    // Emit signals with different confidence levels
    const testSignals = [
      { confidence: 0.5 }, // Should be filtered out
      { confidence: 0.8 }, // Should pass
      { confidence: 0.6 }, // Should be filtered out
      { confidence: 0.9 }  // Should pass
    ];
    
    testSignals.forEach((signalData, index) => {
      const signal: TradeSignal = {
        signalId: `filter_test_${index}`,
        ticker: 'FILTER_TEST',
        side: 'LONG',
        confidence: signalData.confidence,
        conviction: 0.7,
        expectedMove: 2.0,
        timeframe: 'MEDIUM',
        regime: 'BULL',
        source: 'MANUAL',
        timestamp: new Date()
      };
      
      this.eventBus.emitTickerSignal('FILTER_TEST', signal);
    });
    
    setTimeout(() => {
      console.log(`📊 Filtering Results:`);
      console.log(`  All events received: ${allEventsReceived}`);
      console.log(`  High confidence events: ${filteredEventsReceived}`);
      
      if (filteredEventsReceived === 2) { // Should only receive 2 high confidence signals
        console.log('✅ Event filtering test passed');
      } else {
        console.log('❌ Event filtering test failed');
      }
    }, 100);
  }

  // Test event history and statistics
  public testEventHistory(): void {
    console.log('📡 Testing event history and statistics...');
    
    // Emit various events
    this.eventBus.emit('trade:signal', { signalId: 'hist_1', ticker: 'HIST' } as any);
    this.eventBus.emit('paper:position:update', { positionId: 'pos_1' } as any);
    this.eventBus.emit('system:health', { status: 'healthy' } as any);
    
    // Check history
    const history = this.eventBus.getEventHistory();
    const stats = this.eventBus.getEventStats();
    
    console.log(`📊 Event History: ${history.length} events`);
    console.log(`📊 Event Stats:`, stats);
    
    if (history.length >= 3 && Object.keys(stats).length >= 3) {
      console.log('✅ Event history test passed');
    } else {
      console.log('❌ Event history test failed');
    }
  }

  // Test system health monitoring
  public testHealthMonitoring(): void {
    console.log('📡 Testing system health monitoring...');
    
    let healthEventsReceived = 0;
    
    // Listen for health events
    this.eventBus.on('system:health', (data) => {
      healthEventsReceived++;
      console.log('✅ Health event received:', data.status);
    });
    
    // Emit health status
    this.eventBus.emitSystemHealth('healthy', {
      eventBus: true,
      multiTicker: true,
      paperTrading: true
    });
    
    // Check EventBus health
    const healthCheck = this.eventBus.healthCheck();
    console.log('📊 EventBus Health:', healthCheck);
    
    if (healthEventsReceived > 0 && healthCheck.healthy) {
      console.log('✅ Health monitoring test passed');
    } else {
      console.log('❌ Health monitoring test failed');
    }
  }

  // Run all tests
  public runAllTests(): void {
    console.log('📡 Running all EventBus tests...\n');
    
    this.testBasicEventFlow();
    setTimeout(() => this.testMultiTickerRouting(), 200);
    setTimeout(() => this.testEventAggregation(), 400);
    setTimeout(() => this.testEventBatching(), 1200);
    setTimeout(() => this.testPerformanceLoad(500), 1800);
    setTimeout(() => this.testEventFiltering(), 2200);
    setTimeout(() => this.testEventHistory(), 2400);
    setTimeout(() => this.testHealthMonitoring(), 2600);
    
    setTimeout(() => {
      console.log('\n📡 All EventBus tests completed!');
      this.cleanup();
    }, 3000);
  }

  // Get test statistics
  public getTestStatistics(): any {
    const multiTickerStats = this.eventManager.getMultiTickerStats();
    const eventBusStats = this.eventBus.getEventStats();
    const healthCheck = this.eventBus.healthCheck();
    
    return {
      multiTickerStats,
      eventBusStats,
      healthCheck,
      activeSubscriptions: this.testSubscriptions.length,
      receivedEvents: this.receivedEvents.length
    };
  }

  // Clean up test data
  public cleanup(): void {
    // Unsubscribe all test subscriptions
    this.testSubscriptions.forEach(subId => {
      this.eventManager.unsubscribe(subId);
    });
    this.testSubscriptions = [];
    
    // Clear received events
    this.receivedEvents = [];
    
    // Reset event manager stats
    this.eventManager.resetStats();
    
    // Clear event history
    this.eventBus.clearEventHistory();
    
    console.log('📡 Test cleanup completed');
  }
}

// Export test runner functions
export function runEventBusTests(): void {
  const testUtils = new EventBusTestUtils();
  testUtils.runAllTests();
}

export function testEventBusPerformance(eventCount: number = 1000): void {
  const testUtils = new EventBusTestUtils();
  testUtils.testPerformanceLoad(eventCount);
  testUtils.cleanup();
}

export function testMultiTickerEvents(): void {
  const testUtils = new EventBusTestUtils();
  testUtils.testMultiTickerRouting();
  setTimeout(() => testUtils.cleanup(), 500);
}