/**
 * Simple setup test to verify UAT environment works
 */

import { describe, test, expect } from '@jest/globals';
import { 
  MockMultiTickerOrchestrator,
  MockConfigurationManager 
} from './mocks/SystemMocks';

describe('UAT Setup Verification', () => {
  test('should initialize mock components successfully', async () => {
    const configManager = new MockConfigurationManager();
    await configManager.loadConfiguration();
    
    const orchestrator = new MockMultiTickerOrchestrator({
      tickers: ['SPY', 'QQQ', 'AAPL']
    });
    
    await orchestrator.initialize();
    await orchestrator.start();
    
    const tickers = orchestrator.getMonitoredTickers();
    expect(tickers).toHaveLength(3);
    expect(tickers).toContain('SPY');
    expect(tickers).toContain('QQQ');
    expect(tickers).toContain('AAPL');
    
    const spyState = orchestrator.getTickerState('SPY');
    expect(spyState.lifecycle).toBe('READY');
    expect(spyState.isActive).toBe(true);
    
    await orchestrator.shutdown();
  });

  test('should handle signal simulation', async () => {
    const orchestrator = new MockMultiTickerOrchestrator({
      tickers: ['SPY']
    });
    
    await orchestrator.initialize();
    await orchestrator.start();
    
    // Simulate a high confidence signal
    await orchestrator.simulateSignalUpdate('SPY', 0.85);
    
    const state = orchestrator.getTickerState('SPY');
    expect(state.lastSignal).toBeDefined();
    expect(state.lastSignal.confidence).toBe(0.85);
    expect(state.lastSignal.ticker).toBe('SPY');
    
    await orchestrator.shutdown();
  });

  test('should verify all mock components are available', () => {
    // This test ensures all required mock classes are properly exported
    const { 
      MockMultiTickerOrchestrator,
      MockSignalWeightingEngine,
      MockOptionsRecommendationEngine,
      MockPaperTradingEngine,
      MockPerformanceAnalyticsEngine,
      MockRiskManager,
      MockDataPipeline,
      MockConfigurationManager
    } = require('./mocks/SystemMocks');
    
    expect(MockMultiTickerOrchestrator).toBeDefined();
    expect(MockSignalWeightingEngine).toBeDefined();
    expect(MockOptionsRecommendationEngine).toBeDefined();
    expect(MockPaperTradingEngine).toBeDefined();
    expect(MockPerformanceAnalyticsEngine).toBeDefined();
    expect(MockRiskManager).toBeDefined();
    expect(MockDataPipeline).toBeDefined();
    expect(MockConfigurationManager).toBeDefined();
  });
});