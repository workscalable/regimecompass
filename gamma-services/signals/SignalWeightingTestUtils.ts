import { EnhancedSignalWeightingEngine, ConfidenceFactors } from './EnhancedSignalWeightingEngine';
import { SignalWeightingIntegration } from '../integrations/SignalWeightingIntegration';
import { EventBus } from '../core/EventBus';

// Test utilities for SignalWeighting system
export class SignalWeightingTestUtils {
  private engine: EnhancedSignalWeightingEngine;
  private integration: SignalWeightingIntegration;
  private eventBus: EventBus;

  constructor() {
    this.eventBus = new EventBus();
    this.engine = new EnhancedSignalWeightingEngine();
    this.integration = new SignalWeightingIntegration(this.eventBus, this.engine);
  }

  // Generate mock confidence factors for testing
  public generateMockConfidenceFactors(
    overrides: Partial<ConfidenceFactors> = {}
  ): ConfidenceFactors {
    return {
      trendStrength: Math.random() * 0.4 + 0.3, // 0.3 - 0.7
      volumeConfirmation: Math.random() * 0.6 + 0.2, // 0.2 - 0.8
      supportResistance: Math.random() * 0.5 + 0.25, // 0.25 - 0.75
      momentumAlignment: Math.random() * 0.7 + 0.15, // 0.15 - 0.85
      volatilityEnvironment: Math.random() * 0.8 + 0.1, // 0.1 - 0.9
      marketBreadth: Math.random() * 0.6 + 0.2, // 0.2 - 0.8
      regimeAlignment: Math.random() * 0.8 + 0.1, // 0.1 - 0.9
      sectorStrength: Math.random() * 0.6 + 0.2, // 0.2 - 0.8
      ...overrides
    };
  }

  // Generate mock ticker data for multi-ticker testing
  public generateMockTickerData(tickers: string[]): Map<string, ConfidenceFactors> {
    const tickerFactors = new Map<string, ConfidenceFactors>();
    
    for (const ticker of tickers) {
      // Create slightly different factors for each ticker
      const baseFactors = this.generateMockConfidenceFactors();
      
      // Add some ticker-specific variations
      if (ticker.includes('SPY')) {
        baseFactors.marketBreadth += 0.1;
        baseFactors.regimeAlignment += 0.05;
      } else if (ticker.includes('QQQ')) {
        baseFactors.trendStrength += 0.1;
        baseFactors.momentumAlignment += 0.05;
      } else if (ticker.includes('IWM')) {
        baseFactors.volatilityEnvironment += 0.1;
        baseFactors.sectorStrength -= 0.05;
      }
      
      // Ensure values stay within bounds
      Object.keys(baseFactors).forEach(key => {
        baseFactors[key as keyof ConfidenceFactors] = Math.max(0, Math.min(1, baseFactors[key as keyof ConfidenceFactors]));
      });
      
      tickerFactors.set(ticker, baseFactors);
    }
    
    return tickerFactors;
  }

  // Test single ticker confidence computation
  public testSingleTickerConfidence(ticker: string = 'TEST'): any {
    const factors = this.generateMockConfidenceFactors();
    const result = this.engine.computeTickerConfidence(ticker, factors);
    
    console.log(`📊 Single Ticker Test (${ticker}):`, {
      confidence: (result.confidence * 100).toFixed(1) + '%',
      confidenceDelta: (result.confidenceDelta * 100).toFixed(1) + '%',
      reliability: (result.reliability * 100).toFixed(1) + '%',
      breakdown: Object.entries(result.breakdown).map(([key, value]) => 
        `${key}: ${(value * 100).toFixed(1)}%`
      ).join(', ')
    });
    
    return result;
  }

  // Test multi-ticker confidence computation
  public testMultiTickerConfidence(tickers: string[] = ['SPY', 'QQQ', 'IWM', 'AAPL', 'MSFT']): any {
    const tickerFactors = this.generateMockTickerData(tickers);
    const result = this.engine.computeMultiTickerConfidence(tickerFactors);
    
    console.log('📊 Multi-Ticker Test Results:');
    console.log(`  Aggregate Confidence: ${(result.aggregateConfidence * 100).toFixed(1)}%`);
    console.log(`  Market Consensus: ${(result.marketConsensus * 100).toFixed(1)}%`);
    console.log(`  Recommended Focus: ${result.recommendedFocus}`);
    console.log(`  Top Tickers: ${result.topTickers.join(', ')}`);
    console.log(`  High Confidence: ${result.confidenceDistribution.high.join(', ')}`);
    console.log(`  Medium Confidence: ${result.confidenceDistribution.medium.join(', ')}`);
    console.log(`  Low Confidence: ${result.confidenceDistribution.low.join(', ')}`);
    
    return result;
  }

  // Test confidence normalization
  public testConfidenceNormalization(): void {
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    const rawConfidences = new Map([
      ['AAPL', 0.85],
      ['MSFT', 0.72],
      ['GOOGL', 0.91],
      ['AMZN', 0.45],
      ['TSLA', 0.38]
    ]);
    
    console.log('📊 Confidence Normalization Test:');
    console.log('Raw Confidences:', Object.fromEntries(rawConfidences));
    
    // Create mock factors and compute normalized confidences
    const tickerFactors = new Map<string, ConfidenceFactors>();
    for (const [ticker, confidence] of rawConfidences) {
      const factors = this.generateMockConfidenceFactors({
        trendStrength: confidence,
        momentumAlignment: confidence
      });
      tickerFactors.set(ticker, factors);
    }
    
    const result = this.engine.computeMultiTickerConfidence(tickerFactors);
    console.log('Normalized Confidences:', Object.fromEntries(result.normalizedConfidences));
  }

  // Test integration with legacy system
  public testLegacyIntegration(): void {
    console.log('📊 Testing Legacy Integration...');
    
    // Initialize integration
    this.integration.initialize();
    
    // Simulate legacy confidence updates
    const testUpdates = [
      { ticker: 'SPY', confidence: 75, breakdown: { trendStrength: 0.8, momentum: 0.7 } },
      { ticker: 'QQQ', confidence: 82, breakdown: { trendStrength: 0.9, momentum: 0.8 } },
      { ticker: 'IWM', confidence: 68, breakdown: { trendStrength: 0.6, momentum: 0.7 } }
    ];
    
    for (const update of testUpdates) {
      this.integration.handleLegacySignalUpdate(
        update.ticker,
        update.confidence,
        update.breakdown
      );
    }
    
    // Test multi-ticker computation
    const multiResult = this.integration.computeMultiTickerConfidence(['SPY', 'QQQ', 'IWM']);
    console.log('Legacy Integration Result:', {
      aggregateConfidence: (multiResult.aggregateConfidence * 100).toFixed(1) + '%',
      topTickers: multiResult.topTickers
    });
  }

  // Performance test
  public performanceTest(tickerCount: number = 100, iterations: number = 1000): void {
    console.log(`📊 Performance Test: ${tickerCount} tickers, ${iterations} iterations`);
    
    // Generate test data
    const tickers = Array.from({ length: tickerCount }, (_, i) => `TICK${i.toString().padStart(3, '0')}`);
    const tickerFactors = this.generateMockTickerData(tickers);
    
    // Measure performance
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      this.engine.computeMultiTickerConfidence(tickerFactors);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`Average Time per Iteration: ${avgTime.toFixed(2)}ms`);
    console.log(`Throughput: ${(iterations / (totalTime / 1000)).toFixed(0)} computations/second`);
  }

  // Stress test with varying confidence patterns
  public stressTest(): void {
    console.log('📊 Stress Test: Various confidence patterns');
    
    const patterns = [
      { name: 'All High', confidences: [0.9, 0.85, 0.88, 0.92, 0.87] },
      { name: 'All Low', confidences: [0.2, 0.15, 0.18, 0.22, 0.17] },
      { name: 'Mixed', confidences: [0.9, 0.2, 0.7, 0.3, 0.8] },
      { name: 'Gradual', confidences: [0.1, 0.3, 0.5, 0.7, 0.9] },
      { name: 'Volatile', confidences: [0.9, 0.1, 0.8, 0.2, 0.7] }
    ];
    
    for (const pattern of patterns) {
      const tickers = pattern.confidences.map((_, i) => `${pattern.name.toUpperCase()}_${i}`);
      const tickerFactors = new Map<string, ConfidenceFactors>();
      
      pattern.confidences.forEach((confidence, i) => {
        const factors = this.generateMockConfidenceFactors({
          trendStrength: confidence,
          momentumAlignment: confidence
        });
        tickerFactors.set(tickers[i], factors);
      });
      
      const result = this.engine.computeMultiTickerConfidence(tickerFactors);
      
      console.log(`${pattern.name} Pattern:`, {
        aggregateConfidence: (result.aggregateConfidence * 100).toFixed(1) + '%',
        marketConsensus: (result.marketConsensus * 100).toFixed(1) + '%',
        recommendedFocus: result.recommendedFocus
      });
    }
  }

  // Test weight sensitivity
  public testWeightSensitivity(): void {
    console.log('📊 Weight Sensitivity Test');
    
    const baseFactors = this.generateMockConfidenceFactors();
    const ticker = 'WEIGHT_TEST';
    
    const weightConfigs = [
      { name: 'Technical Heavy', weights: { technical: 0.6, momentum: 0.3, regime: 0.1 } },
      { name: 'Momentum Heavy', weights: { technical: 0.2, momentum: 0.6, regime: 0.2 } },
      { name: 'Regime Heavy', weights: { technical: 0.2, momentum: 0.2, regime: 0.6 } },
      { name: 'Balanced', weights: { technical: 0.33, momentum: 0.33, regime: 0.34 } }
    ];
    
    for (const config of weightConfigs) {
      // Create new engine with different weights
      const testEngine = new EnhancedSignalWeightingEngine(config.weights);
      const result = testEngine.computeTickerConfidence(ticker, baseFactors);
      
      console.log(`${config.name}:`, {
        confidence: (result.confidence * 100).toFixed(1) + '%',
        weights: config.weights
      });
    }
  }

  // Run all tests
  public runAllTests(): void {
    console.log('📊 Running All SignalWeighting Tests...\n');
    
    this.testSingleTickerConfidence();
    console.log('');
    
    this.testMultiTickerConfidence();
    console.log('');
    
    this.testConfidenceNormalization();
    console.log('');
    
    this.testLegacyIntegration();
    console.log('');
    
    this.performanceTest(50, 100);
    console.log('');
    
    this.stressTest();
    console.log('');
    
    this.testWeightSensitivity();
    console.log('');
    
    console.log('📊 All tests completed!');
  }

  // Get test statistics
  public getTestStatistics(): any {
    return this.engine.getConfidenceStatistics();
  }

  // Clean up test data
  public cleanup(): void {
    this.engine.resetTickerData();
    this.integration.clearCache();
    console.log('📊 Test cleanup completed');
  }
}

// Export test runner function
export function runSignalWeightingTests(): void {
  const testUtils = new SignalWeightingTestUtils();
  testUtils.runAllTests();
  testUtils.cleanup();
}

// Export individual test functions
export function testSingleTicker(): void {
  const testUtils = new SignalWeightingTestUtils();
  testUtils.testSingleTickerConfidence();
}

export function testMultiTicker(): void {
  const testUtils = new SignalWeightingTestUtils();
  testUtils.testMultiTickerConfidence();
}

export function testPerformance(): void {
  const testUtils = new SignalWeightingTestUtils();
  testUtils.performanceTest();
}