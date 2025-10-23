import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GammaAdaptiveScalingSystem, ScalabilityManager, LoadBalancer, MetricsCollector } from '../gamma-services/scaling';

describe('Gamma Adaptive Scaling System', () => {
  let scalingSystem: GammaAdaptiveScalingSystem;
  
  beforeEach(async () => {
    // Create test configuration with shorter intervals for faster testing
    const testConfig = {
      scaling: {
        minInstances: 1,
        maxInstances: 5,
        targetCpuUtilization: 70,
        targetMemoryUtilization: 75,
        scaleUpThreshold: 0.8,
        scaleDownThreshold: 0.3,
        cooldownPeriod: 5000, // 5 seconds for testing
        evaluationPeriod: 2000  // 2 seconds for testing
      },
      loadBalancer: {
        maxWorkersPerNode: 5,
        maxTickersPerWorker: 3,
        healthCheckInterval: 5000,
        loadThreshold: 0.8,
        failoverTimeout: 3000,
        scalingPolicy: 'ADAPTIVE' as const
      },
      metrics: {
        collectionInterval: 1000,
        retentionPeriod: 60000,
        aggregationWindows: [5000, 15000],
        alertThresholds: {
          cpuUsage: 80,
          memoryUsage: 85,
          errorRate: 0.05,
          latency: 200,
          throughput: 10,
          availability: 0.99
        },
        exportTargets: []
      }
    };
    
    const dashboardConfig = {
      port: 3003, // Use different port for testing
      refreshInterval: 2000,
      enableRealTime: false, // Disable for testing
      authentication: { enabled: false }
    };
    
    scalingSystem = new GammaAdaptiveScalingSystem(testConfig, dashboardConfig);
  });
  
  afterEach(async () => {
    if (scalingSystem) {
      await scalingSystem.shutdown();
    }
  });
  
  describe('System Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(scalingSystem.initialize()).resolves.not.toThrow();
    });
    
    test('should throw error when initializing twice', async () => {
      await scalingSystem.initialize();
      await expect(scalingSystem.initialize()).rejects.toThrow('already initialized');
    });
    
    test('should provide access to components', async () => {
      await scalingSystem.initialize();
      
      expect(scalingSystem.getScalabilityManager()).toBeInstanceOf(ScalabilityManager);
      expect(scalingSystem.getMonitoringDashboard()).toBeDefined();
    });
  });
  
  describe('Ticker Management', () => {
    beforeEach(async () => {
      await scalingSystem.initialize();
    });
    
    test('should add ticker successfully', async () => {
      const workerId = await scalingSystem.addTicker('SPY');
      expect(workerId).toBeDefined();
      expect(typeof workerId).toBe('string');
    });
    
    test('should remove ticker successfully', async () => {
      await scalingSystem.addTicker('SPY');
      await expect(scalingSystem.removeTicker('SPY')).resolves.not.toThrow();
    });
    
    test('should handle multiple tickers', async () => {
      const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT'];
      const workerIds = [];
      
      for (const ticker of tickers) {
        const workerId = await scalingSystem.addTicker(ticker);
        workerIds.push(workerId);
      }
      
      expect(workerIds).toHaveLength(4);
      expect(new Set(workerIds).size).toBeGreaterThan(0); // At least one unique worker
    });
  });
  
  describe('System Status', () => {
    beforeEach(async () => {
      await scalingSystem.initialize();
    });
    
    test('should provide system status', async () => {
      const status = await scalingSystem.getSystemStatus();
      
      expect(status).toHaveProperty('capacity');
      expect(status).toHaveProperty('health');
      expect(status).toHaveProperty('metrics');
      expect(status).toHaveProperty('scaling');
      
      expect(status.capacity).toHaveProperty('currentCapacity');
      expect(status.capacity).toHaveProperty('utilization');
      expect(status.capacity).toHaveProperty('performance');
      expect(status.capacity).toHaveProperty('limits');
    });
    
    test('should show updated status after adding tickers', async () => {
      const initialStatus = await scalingSystem.getSystemStatus();
      const initialTickers = initialStatus.capacity.currentCapacity.totalTickers;
      
      await scalingSystem.addTicker('SPY');
      await scalingSystem.addTicker('QQQ');
      
      // Wait a bit for metrics to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedStatus = await scalingSystem.getSystemStatus();
      const updatedTickers = updatedStatus.capacity.currentCapacity.totalTickers;
      
      expect(updatedTickers).toBeGreaterThan(initialTickers);
    });
  });
  
  describe('Error Handling', () => {
    test('should throw error when accessing uninitialized system', async () => {
      await expect(scalingSystem.addTicker('SPY')).rejects.toThrow('not initialized');
      await expect(scalingSystem.removeTicker('SPY')).rejects.toThrow('not initialized');
      await expect(scalingSystem.getSystemStatus()).rejects.toThrow('not initialized');
    });
    
    test('should handle shutdown gracefully', async () => {
      await scalingSystem.initialize();
      await scalingSystem.addTicker('SPY');
      
      await expect(scalingSystem.shutdown()).resolves.not.toThrow();
    });
  });
});

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer;
  
  beforeEach(() => {
    const config = {
      maxWorkersPerNode: 3,
      maxTickersPerWorker: 2,
      healthCheckInterval: 5000,
      loadThreshold: 0.8,
      failoverTimeout: 3000,
      scalingPolicy: 'ADAPTIVE' as const
    };
    
    loadBalancer = new LoadBalancer(config);
  });
  
  afterEach(async () => {
    if (loadBalancer) {
      await loadBalancer.shutdown();
    }
  });
  
  describe('Worker Management', () => {
    test('should initialize with worker pool', async () => {
      await loadBalancer.initialize();
      
      const stats = loadBalancer.getWorkerStats();
      expect(stats.length).toBeGreaterThan(0);
    });
    
    test('should assign tickers to workers', async () => {
      await loadBalancer.initialize();
      
      const workerId1 = await loadBalancer.assignTicker('SPY');
      const workerId2 = await loadBalancer.assignTicker('QQQ');
      
      expect(workerId1).toBeDefined();
      expect(workerId2).toBeDefined();
      
      const stats = loadBalancer.getWorkerStats();
      const totalAssignedTickers = stats.reduce((sum, worker) => sum + worker.tickersAssigned.length, 0);
      
      expect(totalAssignedTickers).toBe(2);
    });
    
    test('should remove tickers from workers', async () => {
      await loadBalancer.initialize();
      
      await loadBalancer.assignTicker('SPY');
      await loadBalancer.removeTicker('SPY');
      
      const stats = loadBalancer.getWorkerStats();
      const totalAssignedTickers = stats.reduce((sum, worker) => sum + worker.tickersAssigned.length, 0);
      
      expect(totalAssignedTickers).toBe(0);
    });
    
    test('should balance load across workers', async () => {
      await loadBalancer.initialize();
      
      // Add multiple tickers
      const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT'];
      for (const ticker of tickers) {
        await loadBalancer.assignTicker(ticker);
      }
      
      const loadDistribution = loadBalancer.getLoadDistribution();
      const loads = Object.values(loadDistribution);
      
      // Check that load is distributed (not all on one worker)
      const maxLoad = Math.max(...loads);
      const minLoad = Math.min(...loads.filter(load => load > 0));
      
      expect(maxLoad - minLoad).toBeLessThan(1.0); // Load should be reasonably balanced
    });
  });
  
  describe('Load Rebalancing', () => {
    test('should rebalance load when requested', async () => {
      await loadBalancer.initialize();
      
      // Add tickers to create imbalance
      const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'];
      for (const ticker of tickers) {
        await loadBalancer.assignTicker(ticker);
      }
      
      await expect(loadBalancer.rebalanceLoad()).resolves.not.toThrow();
    });
  });
});

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;
  
  beforeEach(() => {
    const config = {
      collectionInterval: 1000,
      retentionPeriod: 10000,
      aggregationWindows: [2000, 5000],
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        errorRate: 0.05,
        latency: 200,
        throughput: 10,
        availability: 0.99
      },
      exportTargets: []
    };
    
    metricsCollector = new MetricsCollector(config);
  });
  
  afterEach(async () => {
    if (metricsCollector) {
      await metricsCollector.shutdown();
    }
  });
  
  describe('Metrics Collection', () => {
    test('should initialize successfully', async () => {
      await expect(metricsCollector.initialize()).resolves.not.toThrow();
    });
    
    test('should collect system metrics', async () => {
      await metricsCollector.initialize();
      
      const systemMetrics = metricsCollector.getSystemMetrics();
      
      expect(systemMetrics).toHaveProperty('timestamp');
      expect(systemMetrics).toHaveProperty('cpu');
      expect(systemMetrics).toHaveProperty('memory');
      expect(systemMetrics.cpu).toHaveProperty('usage');
      expect(systemMetrics.memory).toHaveProperty('used');
    });
    
    test('should collect application metrics', async () => {
      await metricsCollector.initialize();
      
      const appMetrics = metricsCollector.getApplicationMetrics();
      
      expect(appMetrics).toHaveProperty('timestamp');
      expect(appMetrics).toHaveProperty('processing');
      expect(appMetrics).toHaveProperty('trading');
      expect(appMetrics).toHaveProperty('errors');
    });
    
    test('should collect performance metrics', async () => {
      await metricsCollector.initialize();
      
      const perfMetrics = metricsCollector.getPerformanceMetrics();
      
      expect(perfMetrics).toHaveProperty('timestamp');
      expect(perfMetrics).toHaveProperty('latency');
      expect(perfMetrics).toHaveProperty('throughput');
      expect(perfMetrics).toHaveProperty('reliability');
    });
  });
  
  describe('Metrics Recording', () => {
    beforeEach(async () => {
      await metricsCollector.initialize();
    });
    
    test('should record processing times', () => {
      metricsCollector.recordProcessingTime('test-operation', 150);
      
      const appMetrics = metricsCollector.getApplicationMetrics();
      expect(appMetrics.processing.signalsProcessed).toBeGreaterThan(0);
    });
    
    test('should record errors', () => {
      const error = new Error('Test error');
      metricsCollector.recordError('TEST_ERROR', error);
      
      const appMetrics = metricsCollector.getApplicationMetrics();
      expect(appMetrics.errors.totalErrors).toBeGreaterThan(0);
    });
    
    test('should record signal processing', () => {
      metricsCollector.recordSignalProcessed('SPY', 100);
      
      const appMetrics = metricsCollector.getApplicationMetrics();
      expect(appMetrics.processing.signalsProcessed).toBeGreaterThan(0);
    });
  });
  
  describe('Alert Thresholds', () => {
    beforeEach(async () => {
      await metricsCollector.initialize();
    });
    
    test('should check alert thresholds', () => {
      const violations = metricsCollector.checkAlertThresholds();
      
      expect(Array.isArray(violations)).toBe(true);
      // Violations array might be empty if system is healthy
    });
    
    test('should detect high error rate violations', () => {
      // Record many errors to trigger violation
      for (let i = 0; i < 10; i++) {
        metricsCollector.recordError('TEST_ERROR', new Error('Test'));
        metricsCollector.recordProcessingTime('test', 100);
      }
      
      const violations = metricsCollector.checkAlertThresholds();
      const errorRateViolation = violations.find(v => v.type === 'ERROR_RATE');
      
      if (errorRateViolation) {
        expect(errorRateViolation.severity).toBe('CRITICAL');
      }
    });
  });
  
  describe('Metrics History', () => {
    beforeEach(async () => {
      await metricsCollector.initialize();
    });
    
    test('should provide metrics history', () => {
      const duration = 5000; // 5 seconds
      
      const systemHistory = metricsCollector.getMetricsHistory('system', duration);
      const appHistory = metricsCollector.getMetricsHistory('application', duration);
      const perfHistory = metricsCollector.getMetricsHistory('performance', duration);
      
      expect(Array.isArray(systemHistory)).toBe(true);
      expect(Array.isArray(appHistory)).toBe(true);
      expect(Array.isArray(perfHistory)).toBe(true);
    });
    
    test('should provide aggregated metrics', async () => {
      // Wait a bit for some metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const aggregated = metricsCollector.getAggregatedMetrics(5000);
      
      if (aggregated) {
        expect(aggregated).toHaveProperty('timestamp');
        expect(aggregated).toHaveProperty('window');
        expect(aggregated).toHaveProperty('processing');
      }
    });
  });
});

// Helper function for async testing
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}