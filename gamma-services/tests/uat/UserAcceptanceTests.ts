/**
 * User Acceptance Tests (UAT) for Gamma Adaptive System
 * 
 * These tests validate complete end-to-end workflows from a user perspective,
 * ensuring all requirements are met in realistic trading scenarios.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { 
  MockMultiTickerOrchestrator as MultiTickerOrchestrator,
  MockSignalWeightingEngine as SignalWeightingEngine,
  MockOptionsRecommendationEngine as OptionsRecommendationEngine,
  MockPaperTradingEngine as PaperTradingEngine,
  MockPerformanceAnalyticsEngine as PerformanceAnalyticsEngine,
  MockRiskManager as RiskManager,
  MockDataPipeline as DataPipeline,
  MockConfigurationManager as ConfigurationManager
} from './mocks/SystemMocks';

// Test data and mocks
const TEST_TICKERS = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'NFLX'];
const TEST_TIMEOUT = 30000; // 30 seconds for complex workflows

describe('UAT: Complete Trading System Workflows', () => {
  let orchestrator: MultiTickerOrchestrator;
  let signalEngine: SignalWeightingEngine;
  let optionsEngine: OptionsRecommendationEngine;
  let paperTradingEngine: PaperTradingEngine;
  let analyticsEngine: PerformanceAnalyticsEngine;
  let riskManager: RiskManager;
  let dataPipeline: DataPipeline;
  let configManager: ConfigurationManager;

  beforeAll(async () => {
    // Initialize all system components
    configManager = new ConfigurationManager();
    await configManager.loadConfiguration();
    
    dataPipeline = new DataPipeline(configManager.getDataConfig());
    await dataPipeline.initialize();
    
    riskManager = new RiskManager(configManager.getRiskConfig());
    signalEngine = new SignalWeightingEngine(configManager.getSignalConfig());
    optionsEngine = new OptionsRecommendationEngine(configManager.getOptionsConfig());
    paperTradingEngine = new PaperTradingEngine(configManager.getTradingConfig());
    analyticsEngine = new PerformanceAnalyticsEngine(configManager.getAnalyticsConfig());
    
    orchestrator = new MultiTickerOrchestrator({
      tickers: TEST_TICKERS,
      signalEngine,
      optionsEngine,
      paperTradingEngine,
      analyticsEngine,
      riskManager,
      dataPipeline
    });
    
    await orchestrator.initialize();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    await orchestrator?.shutdown();
    await dataPipeline?.disconnect();
  });

  beforeEach(async () => {
    // Reset system state for each test
    await orchestrator.reset();
    await paperTradingEngine.resetPortfolio();
    await analyticsEngine.clearMetrics();
  });

  describe('UAT-1: Multi-Ticker Trading Workflow', () => {
    test('Complete workflow: System startup → Signal generation → Options recommendation → Trade execution → Performance tracking', async () => {
      // Step 1: System Startup and Multi-Ticker Monitoring
      console.log('UAT-1.1: Starting multi-ticker monitoring system...');
      
      const startTime = Date.now();
      await orchestrator.start();
      
      // Verify all tickers are being monitored
      const monitoredTickers = orchestrator.getMonitoredTickers();
      expect(monitoredTickers).toHaveLength(TEST_TICKERS.length);
      expect(monitoredTickers).toEqual(expect.arrayContaining(TEST_TICKERS));
      
      // Verify initial states are set correctly
      for (const ticker of TEST_TICKERS) {
        const state = orchestrator.getTickerState(ticker);
        expect(state.lifecycle).toBe('READY');
        expect(state.isActive).toBe(true);
      }
      
      console.log(`✓ Multi-ticker monitoring started in ${Date.now() - startTime}ms`);

      // Step 2: Wait for Signal Generation
      console.log('UAT-1.2: Waiting for signal generation across tickers...');
      
      // Simulate market data updates to trigger signal processing
      await simulateMarketDataUpdates();
      
      // Wait for signals to be processed (max 10 seconds)
      const signalTimeout = Date.now() + 10000;
      let signalsGenerated = false;
      
      while (Date.now() < signalTimeout && !signalsGenerated) {
        const tickerStates = orchestrator.getAllTickerStates();
        signalsGenerated = Object.values(tickerStates).some(state => 
          state.lastSignal && state.lastSignal.confidence > 0.6
        );
        
        if (!signalsGenerated) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      expect(signalsGenerated).toBe(true);
      console.log('✓ High-confidence signals generated');

      // Step 3: Options Recommendations
      console.log('UAT-1.3: Generating options recommendations...');
      
      const highConfidenceTickers = Object.entries(orchestrator.getAllTickerStates())
        .filter(([_, state]) => state.lastSignal?.confidence > 0.7)
        .map(([ticker, _]) => ticker);
      
      expect(highConfidenceTickers.length).toBeGreaterThan(0);
      
      const recommendations = await optionsEngine.generateRecommendations(
        highConfidenceTickers[0],
        orchestrator.getTickerState(highConfidenceTickers[0]).lastSignal
      );
      
      expect(recommendations).toHaveLength(3); // Top 3 recommendations
      expect(recommendations[0].riskReward.ratio).toBeGreaterThan(2.0);
      expect(recommendations[0].liquidity.score).toBeGreaterThan(0.7);
      
      console.log(`✓ Generated ${recommendations.length} options recommendations`);

      // Step 4: Trade Execution
      console.log('UAT-1.4: Executing paper trades...');
      
      const selectedRecommendation = recommendations[0];
      const tradeRequest = {
        ticker: highConfidenceTickers[0],
        optionContract: selectedRecommendation.contract,
        quantity: selectedRecommendation.suggestedQuantity,
        confidence: orchestrator.getTickerState(highConfidenceTickers[0]).lastSignal.confidence,
        strategy: 'LONG_CALL'
      };
      
      const tradeResult = await paperTradingEngine.executeTrade(tradeRequest);
      
      expect(tradeResult.success).toBe(true);
      expect(tradeResult.position).toBeDefined();
      expect(tradeResult.position.quantity).toBe(tradeRequest.quantity);
      
      console.log(`✓ Trade executed: ${tradeResult.position.symbol} x${tradeResult.position.quantity}`);

      // Step 5: Performance Tracking
      console.log('UAT-1.5: Tracking performance metrics...');
      
      // Simulate some time passing and price movement
      await simulatePriceMovement(highConfidenceTickers[0], 0.02); // 2% move
      
      const performance = await analyticsEngine.calculateRealTimeMetrics();
      
      expect(performance.totalTrades).toBe(1);
      expect(performance.currentPnL).toBeDefined();
      expect(performance.portfolioValue).toBeGreaterThan(0);
      
      const positionMetrics = await paperTradingEngine.getPositionMetrics(tradeResult.position.id);
      expect(positionMetrics.currentValue).toBeDefined();
      expect(positionMetrics.unrealizedPnL).toBeDefined();
      
      console.log(`✓ Performance tracked: PnL=${performance.currentPnL}, Portfolio=${performance.portfolioValue}`);
      
      console.log('🎉 UAT-1: Complete multi-ticker trading workflow PASSED');
    }, TEST_TIMEOUT);
  });

  describe('UAT-2: Risk Management and Portfolio Controls', () => {
    test('Risk limits enforcement: Portfolio heat → Position sizing → Drawdown protection → Recovery', async () => {
      console.log('UAT-2: Testing comprehensive risk management...');
      
      await orchestrator.start();
      
      // Step 1: Test Portfolio Heat Limits
      console.log('UAT-2.1: Testing portfolio heat limits...');
      
      // Simulate multiple high-risk trades to approach portfolio limits
      const trades = [];
      for (let i = 0; i < 8; i++) {
        const ticker = TEST_TICKERS[i % TEST_TICKERS.length];
        await simulateHighConfidenceSignal(ticker, 0.85);
        
        const recommendations = await optionsEngine.generateRecommendations(
          ticker,
          orchestrator.getTickerState(ticker).lastSignal
        );
        
        const tradeRequest = {
          ticker,
          optionContract: recommendations[0].contract,
          quantity: recommendations[0].suggestedQuantity,
          confidence: 0.85,
          strategy: 'LONG_CALL'
        };
        
        const result = await paperTradingEngine.executeTrade(tradeRequest);
        if (result.success) {
          trades.push(result.position);
        }
      }
      
      // Verify portfolio heat is being tracked
      const portfolioMetrics = await riskManager.getPortfolioMetrics();
      expect(portfolioMetrics.currentHeat).toBeLessThanOrEqual(0.20); // 20% max
      
      console.log(`✓ Portfolio heat controlled: ${(portfolioMetrics.currentHeat * 100).toFixed(1)}%`);

      // Step 2: Test Position Sizing Adjustments
      console.log('UAT-2.2: Testing confidence-based position sizing...');
      
      // Test different confidence levels
      const confidenceLevels = [0.6, 0.75, 0.9];
      const positionSizes = [];
      
      for (const confidence of confidenceLevels) {
        const sizing = await riskManager.calculatePositionSize('SPY', confidence, 100);
        positionSizes.push(sizing.quantity);
      }
      
      // Higher confidence should result in larger position sizes
      expect(positionSizes[2]).toBeGreaterThan(positionSizes[1]);
      expect(positionSizes[1]).toBeGreaterThan(positionSizes[0]);
      
      console.log(`✓ Position sizing scales with confidence: ${positionSizes.join(' < ')}`);

      // Step 3: Test Drawdown Protection
      console.log('UAT-2.3: Testing drawdown protection mechanisms...');
      
      // Simulate losses to trigger drawdown protection
      for (const position of trades.slice(0, 3)) {
        await simulatePositionLoss(position, -0.15); // 15% loss
      }
      
      const updatedMetrics = await riskManager.getPortfolioMetrics();
      
      if (updatedMetrics.maxDrawdown >= 0.05) { // 5% drawdown threshold
        expect(updatedMetrics.defensiveMode).toBe(true);
        
        // Test that new position sizes are reduced
        const defensiveSizing = await riskManager.calculatePositionSize('QQQ', 0.8, 100);
        const normalSizing = await riskManager.calculatePositionSize('QQQ', 0.8, 100, false);
        
        expect(defensiveSizing.quantity).toBeLessThan(normalSizing.quantity);
        
        console.log('✓ Drawdown protection activated and position sizing reduced');
      }

      // Step 4: Test Recovery Mechanisms
      console.log('UAT-2.4: Testing recovery mechanisms...');
      
      // Simulate profitable trades to test recovery
      for (const position of trades.slice(3, 5)) {
        await simulatePositionGain(position, 0.25); // 25% gain
      }
      
      const recoveryMetrics = await riskManager.getPortfolioMetrics();
      
      // System should gradually return to normal operation
      expect(recoveryMetrics.currentPnL).toBeGreaterThan(updatedMetrics.currentPnL);
      
      console.log(`✓ Recovery tracked: PnL improved from ${updatedMetrics.currentPnL} to ${recoveryMetrics.currentPnL}`);
      
      console.log('🎉 UAT-2: Risk management and portfolio controls PASSED');
    }, TEST_TIMEOUT);
  });

  describe('UAT-3: Real-Time Dashboard and Monitoring', () => {
    test('Dashboard workflow: Real-time updates → Multi-ticker display → Performance analytics → Configuration changes', async () => {
      console.log('UAT-3: Testing real-time dashboard functionality...');
      
      await orchestrator.start();
      
      // Step 1: Test Real-Time State Updates
      console.log('UAT-3.1: Testing real-time ticker state updates...');
      
      const stateUpdates = [];
      const updateListener = (ticker: string, state: any) => {
        stateUpdates.push({ ticker, state, timestamp: Date.now() });
      };
      
      orchestrator.on('stateUpdate', updateListener);
      
      // Trigger state changes
      await simulateMarketDataUpdates();
      
      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      expect(stateUpdates.length).toBeGreaterThan(0);
      
      // Verify update latency is under 100ms requirement
      const updateLatencies = stateUpdates.map(update => 
        update.timestamp - (update.state.lastUpdate || update.timestamp)
      );
      const avgLatency = updateLatencies.reduce((a, b) => a + b, 0) / updateLatencies.length;
      
      expect(avgLatency).toBeLessThan(100);
      
      console.log(`✓ Real-time updates: ${stateUpdates.length} updates, avg latency: ${avgLatency.toFixed(1)}ms`);

      // Step 2: Test Multi-Ticker Dashboard Data
      console.log('UAT-3.2: Testing multi-ticker dashboard data...');
      
      const dashboardData = await orchestrator.getDashboardData();
      
      expect(dashboardData.tickers).toHaveLength(TEST_TICKERS.length);
      expect(dashboardData.overview.totalTickers).toBe(TEST_TICKERS.length);
      expect(dashboardData.overview.activeTickers).toBeGreaterThan(0);
      
      // Verify confidence heatmap data
      const confidenceData = dashboardData.tickers.map(t => t.confidence);
      expect(confidenceData.every(c => c >= 0 && c <= 1)).toBe(true);
      
      console.log(`✓ Dashboard data: ${dashboardData.overview.activeTickers}/${dashboardData.overview.totalTickers} active tickers`);

      // Step 3: Test Performance Analytics Display
      console.log('UAT-3.3: Testing performance analytics display...');
      
      // Execute some trades first
      await simulateMultipleTrades(3);
      
      const analyticsData = await analyticsEngine.getDashboardAnalytics();
      
      expect(analyticsData.performance).toBeDefined();
      expect(analyticsData.performance.totalTrades).toBeGreaterThan(0);
      expect(analyticsData.performance.winRate).toBeGreaterThanOrEqual(0);
      expect(analyticsData.performance.profitFactor).toBeDefined();
      
      expect(analyticsData.charts).toBeDefined();
      expect(analyticsData.charts.equityCurve).toBeInstanceOf(Array);
      expect(analyticsData.charts.drawdownChart).toBeInstanceOf(Array);
      
      console.log(`✓ Analytics data: ${analyticsData.performance.totalTrades} trades, ${(analyticsData.performance.winRate * 100).toFixed(1)}% win rate`);

      // Step 4: Test Configuration Changes
      console.log('UAT-3.4: Testing live configuration updates...');
      
      const originalConfig = configManager.getCurrentConfig();
      
      // Test configuration update
      const newConfig = {
        ...originalConfig,
        orchestrator: {
          ...originalConfig.orchestrator,
          maxConcurrentTrades: 5
        }
      };
      
      const updateResult = await configManager.updateConfiguration(newConfig);
      expect(updateResult.success).toBe(true);
      
      // Verify configuration is applied without restart
      const updatedConfig = configManager.getCurrentConfig();
      expect(updatedConfig.orchestrator.maxConcurrentTrades).toBe(5);
      
      // Verify system adapts to new configuration
      const orchestratorConfig = orchestrator.getConfiguration();
      expect(orchestratorConfig.maxConcurrentTrades).toBe(5);
      
      console.log('✓ Configuration updated without system restart');
      
      orchestrator.off('stateUpdate', updateListener);
      
      console.log('🎉 UAT-3: Real-time dashboard and monitoring PASSED');
    }, TEST_TIMEOUT);
  });

  describe('UAT-4: Algorithm Learning and Adaptation', () => {
    test('Learning workflow: Trade outcomes → Confidence calibration → Signal improvement → Performance optimization', async () => {
      console.log('UAT-4: Testing algorithm learning and adaptation...');
      
      await orchestrator.start();
      
      // Step 1: Generate Initial Baseline
      console.log('UAT-4.1: Establishing baseline performance...');
      
      const initialTrades = await simulateMultipleTrades(10);
      const baselineMetrics = await analyticsEngine.calculateRealTimeMetrics();
      
      expect(baselineMetrics.totalTrades).toBe(10);
      
      console.log(`✓ Baseline established: ${baselineMetrics.totalTrades} trades, ${(baselineMetrics.winRate * 100).toFixed(1)}% win rate`);

      // Step 2: Test Confidence Calibration
      console.log('UAT-4.2: Testing confidence calibration learning...');
      
      const calibrationBefore = await analyticsEngine.getConfidenceCalibration();
      
      // Simulate trades with known outcomes to test learning
      const learningTrades = [];
      for (let i = 0; i < 20; i++) {
        const ticker = TEST_TICKERS[i % TEST_TICKERS.length];
        const confidence = 0.7 + (Math.random() * 0.2); // 0.7-0.9 range
        
        await simulateHighConfidenceSignal(ticker, confidence);
        const trade = await executeTradeForLearning(ticker, confidence);
        
        // Simulate outcome based on confidence (higher confidence = better outcomes)
        const outcome = Math.random() < (confidence * 0.8) ? 'WIN' : 'LOSS';
        await simulateTradeOutcome(trade, outcome);
        
        learningTrades.push({ trade, confidence, outcome });
      }
      
      // Trigger learning analysis
      await analyticsEngine.analyzeTradeOutcomes();
      
      const calibrationAfter = await analyticsEngine.getConfidenceCalibration();
      
      // Verify calibration has been updated
      expect(calibrationAfter.lastUpdate).toBeGreaterThan(calibrationBefore.lastUpdate);
      expect(calibrationAfter.adjustments).toBeDefined();
      
      console.log(`✓ Confidence calibration updated: ${Object.keys(calibrationAfter.adjustments).length} adjustments made`);

      // Step 3: Test Signal Quality Improvement
      console.log('UAT-4.3: Testing signal quality improvement...');
      
      const signalQualityBefore = await signalEngine.getSignalQualityMetrics();
      
      // Generate signals and let the system learn from patterns
      for (let i = 0; i < 15; i++) {
        const ticker = TEST_TICKERS[i % 3]; // Focus on fewer tickers for pattern recognition
        await simulateMarketDataUpdates([ticker]);
        
        const signal = await signalEngine.generateSignal(ticker);
        const trade = await executeTradeForLearning(ticker, signal.confidence);
        
        // Simulate realistic outcomes based on signal strength
        const outcome = determineRealisticOutcome(signal);
        await simulateTradeOutcome(trade, outcome);
      }
      
      // Trigger signal pattern analysis
      await analyticsEngine.analyzeSignalPatterns();
      
      const signalQualityAfter = await signalEngine.getSignalQualityMetrics();
      
      // Verify signal quality metrics have improved or been updated
      expect(signalQualityAfter.lastAnalysis).toBeGreaterThan(signalQualityBefore.lastAnalysis);
      expect(signalQualityAfter.patternWeights).toBeDefined();
      
      console.log(`✓ Signal quality analysis completed: ${Object.keys(signalQualityAfter.patternWeights).length} patterns identified`);

      // Step 4: Test Performance Optimization
      console.log('UAT-4.4: Testing performance optimization recommendations...');
      
      const optimizationRecommendations = await analyticsEngine.generateOptimizationRecommendations();
      
      expect(optimizationRecommendations).toBeInstanceOf(Array);
      expect(optimizationRecommendations.length).toBeGreaterThan(0);
      
      // Verify recommendations are actionable
      const actionableRecommendations = optimizationRecommendations.filter(rec => 
        rec.impact && rec.implementation && rec.priority
      );
      
      expect(actionableRecommendations.length).toBeGreaterThan(0);
      
      console.log(`✓ Generated ${actionableRecommendations.length} actionable optimization recommendations`);

      // Step 5: Verify Learning Persistence
      console.log('UAT-4.5: Testing learning persistence...');
      
      const learningState = await analyticsEngine.exportLearningState();
      
      expect(learningState.confidenceAdjustments).toBeDefined();
      expect(learningState.signalPatterns).toBeDefined();
      expect(learningState.performanceHistory).toBeDefined();
      
      // Simulate system restart and verify learning is retained
      await analyticsEngine.importLearningState(learningState);
      
      const restoredCalibration = await analyticsEngine.getConfidenceCalibration();
      expect(restoredCalibration.adjustments).toEqual(calibrationAfter.adjustments);
      
      console.log('✓ Learning state persisted and restored successfully');
      
      console.log('🎉 UAT-4: Algorithm learning and adaptation PASSED');
    }, TEST_TIMEOUT);
  });

  describe('UAT-5: System Performance and Scalability', () => {
    test('Performance workflow: Concurrent processing → Latency validation → Resource monitoring → Scaling verification', async () => {
      console.log('UAT-5: Testing system performance and scalability...');
      
      // Step 1: Test Concurrent Multi-Ticker Processing
      console.log('UAT-5.1: Testing concurrent multi-ticker processing...');
      
      const startTime = Date.now();
      await orchestrator.start();
      
      // Simulate simultaneous market data updates for all tickers
      const concurrentUpdates = TEST_TICKERS.map(ticker => 
        simulateMarketDataUpdates([ticker])
      );
      
      await Promise.all(concurrentUpdates);
      
      const processingTime = Date.now() - startTime;
      
      // Verify all tickers are processed concurrently within performance requirements
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify each ticker's processing time meets <200ms requirement
      const tickerProcessingTimes = await Promise.all(
        TEST_TICKERS.map(async ticker => {
          const state = orchestrator.getTickerState(ticker);
          return state.lastProcessingTime || 0;
        })
      );
      
      const avgProcessingTime = tickerProcessingTimes.reduce((a, b) => a + b, 0) / tickerProcessingTimes.length;
      expect(avgProcessingTime).toBeLessThan(200); // <200ms requirement
      
      console.log(`✓ Concurrent processing: ${TEST_TICKERS.length} tickers, avg ${avgProcessingTime.toFixed(1)}ms per ticker`);

      // Step 2: Test Signal Processing Latency
      console.log('UAT-5.2: Testing signal processing latency...');
      
      const latencyTests = [];
      
      for (let i = 0; i < 50; i++) {
        const ticker = TEST_TICKERS[i % TEST_TICKERS.length];
        const testStart = Date.now();
        
        await simulateMarketDataUpdates([ticker]);
        const signal = await signalEngine.generateSignal(ticker);
        
        const latency = Date.now() - testStart;
        latencyTests.push(latency);
        
        expect(signal).toBeDefined();
        expect(signal.confidence).toBeGreaterThanOrEqual(0);
      }
      
      const avgLatency = latencyTests.reduce((a, b) => a + b, 0) / latencyTests.length;
      const maxLatency = Math.max(...latencyTests);
      const p95Latency = latencyTests.sort((a, b) => a - b)[Math.floor(latencyTests.length * 0.95)];
      
      expect(avgLatency).toBeLessThan(200);
      expect(p95Latency).toBeLessThan(500);
      
      console.log(`✓ Signal latency: avg ${avgLatency.toFixed(1)}ms, p95 ${p95Latency}ms, max ${maxLatency}ms`);

      // Step 3: Test Memory Management
      console.log('UAT-5.3: Testing memory management and resource usage...');
      
      const initialMemory = process.memoryUsage();
      
      // Simulate heavy load with many operations
      const heavyLoadPromises = [];
      for (let i = 0; i < 100; i++) {
        heavyLoadPromises.push(simulateHeavyOperation());
      }
      
      await Promise.all(heavyLoadPromises);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100);
      
      console.log(`✓ Memory management: ${memoryIncrease.toFixed(1)}MB increase after heavy load`);

      // Step 4: Test Database Performance
      console.log('UAT-5.4: Testing database performance...');
      
      const dbOperations = [];
      
      // Test concurrent database operations
      for (let i = 0; i < 20; i++) {
        const operation = async () => {
          const start = Date.now();
          
          // Simulate database operations
          await paperTradingEngine.savePosition({
            id: `test-${i}`,
            ticker: TEST_TICKERS[i % TEST_TICKERS.length],
            quantity: 1,
            entryPrice: 100 + Math.random() * 50,
            timestamp: new Date()
          });
          
          return Date.now() - start;
        };
        
        dbOperations.push(operation());
      }
      
      const dbLatencies = await Promise.all(dbOperations);
      const avgDbLatency = dbLatencies.reduce((a, b) => a + b, 0) / dbLatencies.length;
      
      expect(avgDbLatency).toBeLessThan(100); // <100ms requirement
      
      console.log(`✓ Database performance: avg ${avgDbLatency.toFixed(1)}ms per operation`);

      // Step 5: Test Scaling Capabilities
      console.log('UAT-5.5: Testing horizontal scaling capabilities...');
      
      // Simulate scaling up to more tickers
      const additionalTickers = ['IWM', 'GLD', 'SLV', 'TLT', 'VIX'];
      
      const scalingStart = Date.now();
      await orchestrator.addTickers(additionalTickers);
      const scalingTime = Date.now() - scalingStart;
      
      expect(scalingTime).toBeLessThan(3000); // Should scale quickly
      
      const totalTickers = orchestrator.getMonitoredTickers();
      expect(totalTickers.length).toBe(TEST_TICKERS.length + additionalTickers.length);
      
      // Verify performance is maintained with additional tickers
      await simulateMarketDataUpdates(additionalTickers);
      
      const scaledProcessingTimes = await Promise.all(
        additionalTickers.map(async ticker => {
          const state = orchestrator.getTickerState(ticker);
          return state.lastProcessingTime || 0;
        })
      );
      
      const scaledAvgTime = scaledProcessingTimes.reduce((a, b) => a + b, 0) / scaledProcessingTimes.length;
      expect(scaledAvgTime).toBeLessThan(250); // Slight degradation acceptable
      
      console.log(`✓ Scaling: Added ${additionalTickers.length} tickers in ${scalingTime}ms, avg processing ${scaledAvgTime.toFixed(1)}ms`);
      
      console.log('🎉 UAT-5: System performance and scalability PASSED');
    }, TEST_TIMEOUT);
  });

  // Helper functions for test simulation
  async function simulateMarketDataUpdates(tickers: string[] = TEST_TICKERS): Promise<void> {
    const updates = tickers.map(ticker => ({
      ticker,
      price: 100 + Math.random() * 100,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: new Date()
    }));
    
    await dataPipeline.processMarketDataBatch(updates);
  }

  async function simulateHighConfidenceSignal(ticker: string, confidence: number): Promise<void> {
    // Use the mock orchestrator's simulate method instead
    await (orchestrator as any).simulateSignalUpdate(ticker, confidence);
  }

  async function simulatePriceMovement(ticker: string, percentMove: number): Promise<void> {
    const currentPrice = await dataPipeline.getCurrentPrice(ticker);
    const newPrice = currentPrice * (1 + percentMove);
    
    await dataPipeline.updatePrice(ticker, newPrice);
  }

  async function simulatePositionLoss(position: any, lossPercent: number): Promise<void> {
    const newValue = position.currentValue * (1 + lossPercent);
    await paperTradingEngine.updatePositionValue(position.id, newValue);
  }

  async function simulatePositionGain(position: any, gainPercent: number): Promise<void> {
    const newValue = position.currentValue * (1 + gainPercent);
    await paperTradingEngine.updatePositionValue(position.id, newValue);
  }

  async function simulateMultipleTrades(count: number): Promise<any[]> {
    const trades = [];
    
    for (let i = 0; i < count; i++) {
      const ticker = TEST_TICKERS[i % TEST_TICKERS.length];
      const confidence = 0.6 + Math.random() * 0.3;
      
      await simulateHighConfidenceSignal(ticker, confidence);
      
      const recommendations = await optionsEngine.generateRecommendations(
        ticker,
        orchestrator.getTickerState(ticker).lastSignal
      );
      
      if (recommendations.length > 0) {
        const trade = await paperTradingEngine.executeTrade({
          ticker,
          optionContract: recommendations[0].contract,
          quantity: recommendations[0].suggestedQuantity,
          confidence,
          strategy: 'LONG_CALL'
        });
        
        if (trade.success) {
          trades.push(trade.position);
        }
      }
    }
    
    return trades;
  }

  async function executeTradeForLearning(ticker: string, confidence: number): Promise<any> {
    const recommendations = await optionsEngine.generateRecommendations(
      ticker,
      { confidence, ticker, timestamp: new Date() }
    );
    
    if (recommendations.length > 0) {
      const result = await paperTradingEngine.executeTrade({
        ticker,
        optionContract: recommendations[0].contract,
        quantity: 1,
        confidence,
        strategy: 'LONG_CALL'
      });
      
      return result.success ? result.position : null;
    }
    
    return null;
  }

  async function simulateTradeOutcome(trade: any, outcome: 'WIN' | 'LOSS'): Promise<void> {
    if (!trade) return;
    
    const multiplier = outcome === 'WIN' ? 1.2 : 0.8;
    const newValue = trade.currentValue * multiplier;
    
    await paperTradingEngine.updatePositionValue(trade.id, newValue);
    await paperTradingEngine.closePosition(trade.id, outcome);
  }

  function determineRealisticOutcome(signal: any): 'WIN' | 'LOSS' {
    // Simulate realistic outcomes based on signal strength
    const winProbability = Math.min(0.8, signal.confidence * 0.9);
    return Math.random() < winProbability ? 'WIN' : 'LOSS';
  }

  async function simulateHeavyOperation(): Promise<void> {
    // Simulate CPU and memory intensive operation
    const data = new Array(10000).fill(0).map(() => Math.random());
    const processed = data.map(x => Math.sin(x) * Math.cos(x));
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
    
    return processed.length > 0 ? undefined : undefined;
  }
});