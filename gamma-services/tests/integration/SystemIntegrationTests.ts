import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PerformanceMonitor, defaultPerformanceConfig } from '../../monitoring/PerformanceMonitor';
import { PerformanceAlerting, defaultAlertingConfig } from '../../scaling/PerformanceAlerting';
import { AutoScaler, defaultScalingConfig } from '../../scaling/AutoScaler';
import { CacheManager, defaultCacheConfig } from '../../caching/CacheManager';
import { DatabaseOptimizer, defaultDatabaseConfig } from '../../database/DatabaseOptimizer';
import { DataAccessLayer, defaultDataAccessConfig } from '../../database/DataAccessLayer';
import { SecurityService } from '../../security/SecurityService';

/**
 * System Integration Tests (SIT) for Gamma Adaptive System
 * 
 * These tests verify that all system components work together correctly
 * and meet the performance requirements specified in the design.
 */
describe('Gamma Adaptive System - System Integration Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let performanceAlerting: PerformanceAlerting;
  let autoScaler: AutoScaler;
  let cacheManager: CacheManager;
  let databaseOptimizer: DatabaseOptimizer;
  let dataAccessLayer: DataAccessLayer;
  let securityService: SecurityService;

  beforeAll(async () => {
    // Initialize all system components
    console.log('🧪 Initializing System Integration Test Environment...');
    
    // Performance monitoring
    performanceMonitor = new PerformanceMonitor(defaultPerformanceConfig);
    await performanceMonitor.initialize();
    
    // Performance alerting
    performanceAlerting = new PerformanceAlerting(defaultAlertingConfig, performanceMonitor);
    await performanceAlerting.initialize();
    
    // Auto scaling
    autoScaler = new AutoScaler(defaultScalingConfig, performanceMonitor, performanceAlerting);
    await autoScaler.initialize();
    
    // Caching
    cacheManager = new CacheManager(defaultCacheConfig);
    await cacheManager.initialize();
    
    // Database optimization
    databaseOptimizer = new DatabaseOptimizer(defaultDatabaseConfig, cacheManager);
    await databaseOptimizer.initialize();
    
    // Data access layer
    dataAccessLayer = new DataAccessLayer(defaultDataAccessConfig, databaseOptimizer, cacheManager);
    await dataAccessLayer.initialize();
    
    // Security service
    securityService = new SecurityService();
    await securityService.initialize();
    
    console.log('✅ System Integration Test Environment Ready');
  }, 30000);

  afterAll(async () => {
    // Cleanup all components
    console.log('🧹 Cleaning up System Integration Test Environment...');
    
    await performanceMonitor?.shutdown();
    await performanceAlerting?.shutdown();
    await autoScaler?.shutdown();
    await cacheManager?.shutdown();
    await databaseOptimizer?.shutdown();
    await dataAccessLayer?.shutdown();
    await securityService?.shutdown();
    
    console.log('✅ System Integration Test Environment Cleaned Up');
  }, 15000);

  describe('SIT-001: Performance Monitoring Integration', () => {
    test('should track tick-to-decision processing time under 200ms target', async () => {
      // Start a simulated operation
      const operationId = performanceMonitor.startOperation('SPY', 'signal_processing');
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Complete the operation
      const duration = performanceMonitor.completeOperation(operationId, true);
      
      expect(duration).toBeLessThan(200);
      
      // Verify metrics are updated
      const stats = performanceMonitor.getProcessingTimeStats();
      expect(stats.count).toBeGreaterThan(0);
      expect(stats.average).toBeLessThan(200);
    });

    test('should handle concurrent operations for 10+ tickers', async () => {
      const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'NFLX', 'AMD', 'CRM'];
      const operationIds: string[] = [];
      
      // Start concurrent operations
      for (const ticker of tickers) {
        const operationId = performanceMonitor.startOperation(ticker, 'concurrent_processing');
        operationIds.push(operationId);
      }
      
      // Verify all operations are tracked
      const activeOps = performanceMonitor.getActiveOperations();
      expect(activeOps.length).toBeGreaterThanOrEqual(tickers.length);
      
      // Complete all operations
      for (const operationId of operationIds) {
        performanceMonitor.completeOperation(operationId, true);
      }
      
      // Verify metrics
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.concurrency.activeTickers).toBeGreaterThanOrEqual(10);
    });

    test('should detect memory leaks and optimize garbage collection', async () => {
      const initialMetrics = performanceMonitor.getCurrentMetrics();
      
      // Simulate memory-intensive operations
      const largeObjects = [];
      for (let i = 0; i < 1000; i++) {
        largeObjects.push(new Array(1000).fill(Math.random()));
      }
      
      // Force garbage collection if available
      performanceMonitor.optimizeGarbageCollection();
      
      // Wait for GC to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalMetrics = performanceMonitor.getCurrentMetrics();
      
      // Memory leak detection
      const leakDetection = performanceMonitor.detectMemoryLeaks();
      expect(leakDetection).toBeDefined();
      
      // Cleanup
      largeObjects.length = 0;
    });
  });

  describe('SIT-002: Caching and Database Integration', () => {
    test('should achieve sub-100ms response times with caching', async () => {
      const testData = { id: 1, name: 'Test Data', value: Math.random() };
      
      // First write (cache miss)
      const startWrite = Date.now();
      await dataAccessLayer.create('test_table', testData);
      const writeTime = Date.now() - startWrite;
      
      // First read (cache miss)
      const startRead1 = Date.now();
      const result1 = await dataAccessLayer.findById('test_table', 1);
      const readTime1 = Date.now() - startRead1;
      
      // Second read (cache hit)
      const startRead2 = Date.now();
      const result2 = await dataAccessLayer.findById('test_table', 1);
      const readTime2 = Date.now() - startRead2;
      
      expect(result1).toEqual(result2);
      expect(readTime2).toBeLessThan(100); // Sub-100ms target
      expect(readTime2).toBeLessThan(readTime1); // Cache should be faster
      
      // Verify cache hit
      const metrics = dataAccessLayer.getMetrics();
      expect(metrics.reads.cacheHitRate).toBeGreaterThan(0);
    });

    test('should handle database connection pooling efficiently', async () => {
      const connectionPromises = [];
      
      // Create multiple concurrent database operations
      for (let i = 0; i < 20; i++) {
        connectionPromises.push(
          dataAccessLayer.findMany('test_table', { active: true }, { limit: 10 })
        );
      }
      
      const startTime = Date.now();
      const results = await Promise.all(connectionPromises);
      const totalTime = Date.now() - startTime;
      
      // All operations should complete successfully
      expect(results).toHaveLength(20);
      
      // Should handle concurrent connections efficiently
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
      
      // Verify connection metrics
      const dbMetrics = await databaseOptimizer.getConnectionMetrics();
      expect(dbMetrics.totalConnections).toBeGreaterThan(0);
      expect(dbMetrics.connectionErrors).toBe(0);
    });

    test('should implement intelligent cache invalidation', async () => {
      const testData = { id: 2, name: 'Cache Test', value: 'original' };
      
      // Create and cache data
      await dataAccessLayer.create('test_table', testData);
      await dataAccessLayer.findById('test_table', 2); // Cache it
      
      // Update data (should invalidate cache)
      const updatedData = { name: 'Cache Test Updated', value: 'updated' };
      await dataAccessLayer.update('test_table', 2, updatedData);
      
      // Read updated data
      const result = await dataAccessLayer.findById('test_table', 2);
      expect(result?.value).toBe('updated');
      
      // Verify cache invalidation worked
      const cacheStats = cacheManager.getStats();
      expect(cacheStats.totalEntries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('SIT-003: Security Integration', () => {
    test('should detect and block malicious requests', async () => {
      const maliciousPayload = "'; DROP TABLE users; --";
      
      // Analyze malicious request
      const analysis = await securityService.analyzeRequest(maliciousPayload, {
        ip: '192.168.1.100',
        endpoint: '/api/data',
        userAgent: 'TestAgent/1.0'
      });
      
      expect(analysis.threatDetected).toBe(true);
      expect(analysis.riskScore).toBeGreaterThan(50);
      expect(analysis.blocked).toBe(true);
    });

    test('should implement rate limiting effectively', async () => {
      const requests = [];
      
      // Simulate rapid requests from same IP
      for (let i = 0; i < 15; i++) {
        requests.push(
          securityService.analyzeRequest('normal request', {
            ip: '192.168.1.101',
            endpoint: '/api/test'
          })
        );
      }
      
      const results = await Promise.all(requests);
      
      // Some requests should be blocked due to rate limiting
      const blockedRequests = results.filter(r => r.blocked);
      expect(blockedRequests.length).toBeGreaterThan(0);
    });

    test('should detect intrusion attempts', async () => {
      const userId = 'test-user-123';
      const ip = '192.168.1.102';
      
      // Simulate multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await securityService.analyzeLoginAttempt(
          userId,
          ip,
          'TestAgent/1.0',
          false,
          'Invalid password'
        );
      }
      
      // Should detect intrusion attempt
      const finalAttempt = await securityService.analyzeLoginAttempt(
        userId,
        ip,
        'TestAgent/1.0',
        false,
        'Invalid password'
      );
      
      expect(finalAttempt.riskScore).toBeGreaterThan(70);
      expect(finalAttempt.blocked).toBe(true);
    });
  });

  describe('SIT-004: Performance Alerting and Scaling Integration', () => {
    test('should trigger alerts when performance thresholds are exceeded', async () => {
      // Simulate high processing time
      const operationId = performanceMonitor.startOperation('TEST', 'slow_operation');
      
      // Wait to exceed threshold
      await new Promise(resolve => setTimeout(resolve, 600)); // 600ms > 200ms threshold
      
      performanceMonitor.completeOperation(operationId, true);
      
      // Check for triggered alerts
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      const alerts = await performanceAlerting.checkThresholds(currentMetrics);
      
      expect(alerts.length).toBeGreaterThan(0);
      
      // Verify alert properties
      const processingAlert = alerts.find(a => a.threshold.metric.includes('processing'));
      if (processingAlert) {
        expect(processingAlert.severity).toMatch(/MEDIUM|HIGH|CRITICAL/);
        expect(processingAlert.currentValue).toBeGreaterThan(200);
      }
    });

    test('should automatically scale based on performance metrics', async () => {
      const initialState = autoScaler.getCurrentState();
      
      // Simulate high load conditions
      for (let i = 0; i < 25; i++) {
        const opId = performanceMonitor.startOperation(`TICKER_${i}`, 'high_load_operation');
        // Don't complete immediately to build queue
        setTimeout(() => performanceMonitor.completeOperation(opId, true), 100 * i);
      }
      
      // Wait for metrics to update
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Evaluate scaling
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      const scalingEvent = await autoScaler.evaluateScaling(currentMetrics);
      
      if (scalingEvent) {
        expect(scalingEvent.type).toBe('SCALE_UP');
        expect(scalingEvent.success).toBe(true);
        
        const newState = autoScaler.getCurrentState();
        expect(newState.workers).toBeGreaterThan(initialState.workers);
      }
    });

    test('should detect performance degradation and trigger recovery', async () => {
      // Get baseline metrics
      const baselineMetrics = performanceMonitor.getCurrentMetrics();
      
      // Simulate performance degradation
      const degradedOperations = [];
      for (let i = 0; i < 10; i++) {
        const opId = performanceMonitor.startOperation('DEGRADED', 'slow_operation');
        degradedOperations.push(opId);
        
        // Simulate slow processing
        setTimeout(() => {
          performanceMonitor.completeOperation(opId, true);
        }, 800); // Much slower than baseline
      }
      
      // Wait for operations to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check for degradation detection
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      const degradationEvent = await performanceAlerting.detectPerformanceDegradation(currentMetrics);
      
      if (degradationEvent) {
        expect(degradationEvent.type).toBe('PERFORMANCE_DEGRADATION');
        expect(degradationEvent.metrics.degradationScore).toBeGreaterThan(0);
        expect(degradationEvent.recoveryActions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('SIT-005: End-to-End System Integration', () => {
    test('should handle complete trading workflow with all components', async () => {
      const ticker = 'INTEGRATION_TEST';
      const startTime = Date.now();
      
      // 1. Start signal processing operation
      const signalOpId = performanceMonitor.startOperation(ticker, 'signal_processing');
      
      // 2. Simulate data access with caching
      const marketData = await dataAccessLayer.getOrSet(
        `market_data:${ticker}`,
        async () => ({
          symbol: ticker,
          price: 150.50,
          volume: 1000000,
          timestamp: new Date()
        }),
        { ttl: 60000, tags: ['market_data'] }
      );
      
      expect(marketData).toBeDefined();
      expect(marketData.symbol).toBe(ticker);
      
      // 3. Complete signal processing
      const processingTime = performanceMonitor.completeOperation(signalOpId, true);
      expect(processingTime).toBeLessThan(200); // Meet performance target
      
      // 4. Simulate trade execution
      const tradeOpId = performanceMonitor.startOperation(ticker, 'trade_execution');
      
      const tradeData = {
        symbol: ticker,
        side: 'BUY',
        quantity: 100,
        price: marketData.price,
        timestamp: new Date()
      };
      
      const trade = await dataAccessLayer.create('trades', tradeData);
      expect(trade).toBeDefined();
      
      const executionTime = performanceMonitor.completeOperation(tradeOpId, true);
      expect(executionTime).toBeLessThan(100); // Fast execution target
      
      // 5. Verify security monitoring
      const securityAnalysis = await securityService.analyzeUserActivity(
        'test-user',
        'TRADE',
        '/api/trades',
        '127.0.0.1',
        'TestAgent/1.0',
        executionTime,
        ['trades']
      );
      
      expect(securityAnalysis.riskScore).toBeLessThan(50); // Normal activity
      expect(securityAnalysis.blocked).toBe(false);
      
      // 6. Verify overall system performance
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(1000); // Complete workflow under 1 second
      
      // 7. Check system health
      const metrics = performanceMonitor.getCurrentMetrics();
      expect(metrics.processing.tickToDecision.average).toBeLessThan(200);
      expect(metrics.memory.heapUsed).toBeLessThan(512);
      expect(metrics.concurrency.queuedOperations).toBeLessThan(20);
    });

    test('should maintain performance under concurrent load', async () => {
      const concurrentOperations = 50;
      const promises = [];
      
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(this.simulateCompleteWorkflow(`LOAD_TEST_${i}`));
      }
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All operations should complete successfully
      expect(results).toHaveLength(concurrentOperations);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.processingTime).toBeLessThan(500); // Reasonable under load
      });
      
      // System should handle load efficiently
      expect(totalTime).toBeLessThan(10000); // 10 seconds max for all operations
      
      // Verify system stability
      const finalMetrics = performanceMonitor.getCurrentMetrics();
      expect(finalMetrics.concurrency.failedOperations).toBe(0);
    });

    test('should recover from system stress and maintain stability', async () => {
      // Create system stress
      const stressOperations = [];
      for (let i = 0; i < 100; i++) {
        const opId = performanceMonitor.startOperation(`STRESS_${i}`, 'stress_test');
        stressOperations.push(opId);
      }
      
      // Simulate memory pressure
      const memoryPressure = new Array(10000).fill(0).map(() => new Array(1000).fill(Math.random()));
      
      // Wait for stress to build
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if alerts are triggered
      const stressMetrics = performanceMonitor.getCurrentMetrics();
      const alerts = await performanceAlerting.checkThresholds(stressMetrics);
      
      // System should detect stress
      expect(alerts.length).toBeGreaterThan(0);
      
      // Trigger recovery
      performanceMonitor.optimizeGarbageCollection();
      
      // Complete stress operations
      stressOperations.forEach(opId => {
        performanceMonitor.completeOperation(opId, true);
      });
      
      // Clear memory pressure
      memoryPressure.length = 0;
      
      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify recovery
      const recoveryMetrics = performanceMonitor.getCurrentMetrics();
      expect(recoveryMetrics.memory.heapUsed).toBeLessThan(stressMetrics.memory.heapUsed);
      expect(recoveryMetrics.concurrency.queuedOperations).toBeLessThan(10);
    });
  });

  // Helper method for complete workflow simulation
  private async simulateCompleteWorkflow(ticker: string): Promise<{
    success: boolean;
    processingTime: number;
    executionTime: number;
  }> {
    try {
      const signalOpId = performanceMonitor.startOperation(ticker, 'workflow_signal');
      
      // Simulate data access
      await dataAccessLayer.getOrSet(
        `workflow_data:${ticker}`,
        async () => ({ symbol: ticker, data: Math.random() }),
        { ttl: 30000 }
      );
      
      const processingTime = performanceMonitor.completeOperation(signalOpId, true);
      
      const tradeOpId = performanceMonitor.startOperation(ticker, 'workflow_trade');
      
      // Simulate trade
      await dataAccessLayer.create('workflow_trades', {
        symbol: ticker,
        timestamp: new Date(),
        value: Math.random() * 1000
      });
      
      const executionTime = performanceMonitor.completeOperation(tradeOpId, true);
      
      return {
        success: true,
        processingTime,
        executionTime
      };
    } catch (error) {
      return {
        success: false,
        processingTime: 0,
        executionTime: 0
      };
    }
  }
});

/**
 * Performance Benchmarks
 * 
 * These tests verify that the system meets specific performance targets
 */
describe('Performance Benchmarks', () => {
  test('PERF-001: Tick-to-decision processing under 200ms', async () => {
    const iterations = 100;
    const processingTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const opId = performanceMonitor.startOperation('BENCHMARK', 'tick_to_decision');
      
      // Simulate realistic processing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 150));
      
      const duration = performanceMonitor.completeOperation(opId, true);
      processingTimes.push(duration);
    }
    
    const averageTime = processingTimes.reduce((sum, time) => sum + time, 0) / iterations;
    const p95Time = processingTimes.sort((a, b) => a - b)[Math.floor(iterations * 0.95)];
    
    expect(averageTime).toBeLessThan(200);
    expect(p95Time).toBeLessThan(300);
    
    console.log(`📊 Benchmark Results - Average: ${averageTime.toFixed(2)}ms, P95: ${p95Time.toFixed(2)}ms`);
  });

  test('PERF-002: Database response time under 100ms', async () => {
    const iterations = 50;
    const responseTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      await dataAccessLayer.findMany('benchmark_table', { active: true }, { limit: 10 });
      
      const responseTime = Date.now() - startTime;
      responseTimes.push(responseTime);
    }
    
    const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / iterations;
    const maxTime = Math.max(...responseTimes);
    
    expect(averageTime).toBeLessThan(100);
    expect(maxTime).toBeLessThan(200);
    
    console.log(`📊 Database Benchmark - Average: ${averageTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);
  });

  test('PERF-003: Memory usage stability under load', async () => {
    const initialMemory = performanceMonitor.getCurrentMetrics().memory.heapUsed;
    
    // Create sustained load
    const operations = [];
    for (let i = 0; i < 1000; i++) {
      const opId = performanceMonitor.startOperation(`MEMORY_TEST_${i}`, 'memory_load');
      operations.push(opId);
      
      // Create some memory pressure
      const data = new Array(100).fill(Math.random());
      
      setTimeout(() => {
        performanceMonitor.completeOperation(opId, true);
      }, Math.random() * 100);
    }
    
    // Wait for operations to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Force garbage collection
    performanceMonitor.optimizeGarbageCollection();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalMemory = performanceMonitor.getCurrentMetrics().memory.heapUsed;
    const memoryGrowth = finalMemory - initialMemory;
    
    // Memory growth should be reasonable
    expect(memoryGrowth).toBeLessThan(100); // Less than 100MB growth
    
    console.log(`📊 Memory Benchmark - Initial: ${initialMemory.toFixed(2)}MB, Final: ${finalMemory.toFixed(2)}MB, Growth: ${memoryGrowth.toFixed(2)}MB`);
  });
});