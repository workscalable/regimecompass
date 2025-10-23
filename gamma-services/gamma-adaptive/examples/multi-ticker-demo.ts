// Multi-Ticker State Management Demo
// Demonstrates enhanced Ready-Set-Go lifecycle with concurrent processing

import { 
  GammaAdaptiveSystem, 
  DEFAULT_GAMMA_ADAPTIVE_CONFIG,
  TickerStateManager,
  PriorityManager,
  ConcurrentProcessor
} from '../index.js';

/**
 * Comprehensive multi-ticker demonstration
 */
async function multiTickerDemo() {
  console.log('🎯 Multi-Ticker State Management Demo');
  console.log('=====================================');

  // Enhanced configuration for multi-ticker demo
  const enhancedConfig = {
    ...DEFAULT_GAMMA_ADAPTIVE_CONFIG,
    orchestrator: {
      watchlist: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN'],
      maxConcurrentTrades: 5,
      confidenceThreshold: 0.65,
      fibZoneBlocklist: ['EXHAUSTION'],
      updateInterval: 5000, // 5 seconds for demo
      priorityWeights: {
        'SPY': 1.5,    // Highest priority
        'QQQ': 1.4,
        'AAPL': 1.3,
        'MSFT': 1.2,
        'NVDA': 1.1,
        'TSLA': 0.9,   // Lower priority (volatile)
        'META': 1.0,
        'AMZN': 1.0
      }
    }
  };

  const gammaSystem = new GammaAdaptiveSystem(enhancedConfig);
  
  // Set up comprehensive monitoring
  setupComprehensiveMonitoring(gammaSystem);
  
  try {
    // Initialize and start system
    await gammaSystem.initialize();
    await gammaSystem.startMonitoring();
    
    // Demonstrate state management features
    await demonstrateStateManagement(gammaSystem);
    
    // Demonstrate concurrent processing
    await demonstrateConcurrentProcessing(gammaSystem);
    
    // Demonstrate priority management
    await demonstratePriorityManagement(gammaSystem);
    
    // Run for demo period
    console.log('🔄 Running multi-ticker demo for 60 seconds...');
    await simulateMultiTickerActivity(gammaSystem, 60000);
    
  } catch (error) {
    console.error('❌ Demo error:', error);
  } finally {
    await gammaSystem.stopMonitoring();
    console.log('✅ Multi-ticker demo completed');
  }
}

/**
 * Demonstrate state management capabilities
 */
async function demonstrateStateManagement(gammaSystem: GammaAdaptiveSystem) {
  console.log('\n📊 State Management Demonstration');
  console.log('----------------------------------');
  
  const orchestratorState = gammaSystem.getOrchestratorState();
  
  console.log('Initial State:', {
    activeTickerCount: orchestratorState.activeTickerCount,
    statusDistribution: getStatusDistribution(orchestratorState.tickers)
  });
  
  // Simulate state transitions
  console.log('🔄 Simulating state transitions...');
  
  // Force some tickers to different states for demonstration
  const tickers = Object.keys(orchestratorState.tickers);
  
  if (tickers.length >= 3) {
    console.log(`📈 Moving ${tickers[0]} to SET state`);
    console.log(`🚀 Moving ${tickers[1]} to GO state`);
    console.log(`⏸️ Moving ${tickers[2]} to COOLDOWN state`);
  }
  
  // Show updated distribution
  setTimeout(() => {
    const updatedState = gammaSystem.getOrchestratorState();
    console.log('Updated State:', {
      activeTickerCount: updatedState.activeTickerCount,
      statusDistribution: getStatusDistribution(updatedState.tickers)
    });
  }, 2000);
}

/**
 * Demonstrate concurrent processing capabilities
 */
async function demonstrateConcurrentProcessing(gammaSystem: GammaAdaptiveSystem) {
  console.log('\n⚡ Concurrent Processing Demonstration');
  console.log('-------------------------------------');
  
  // Simulate high-frequency market updates
  const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'];
  
  console.log('🔥 Sending concurrent market updates...');
  
  const startTime = Date.now();
  const promises = tickers.map(async (ticker, index) => {
    // Stagger updates slightly
    await new Promise(resolve => setTimeout(resolve, index * 100));
    
    return gammaSystem.processMarketUpdate({
      ticker,
      price: 100 + Math.random() * 50,
      volume: Math.floor(Math.random() * 1000000),
      timestamp: new Date()
    });
  });
  
  await Promise.all(promises);
  const processingTime = Date.now() - startTime;
  
  console.log(`✅ Processed ${tickers.length} tickers concurrently in ${processingTime}ms`);
  
  // Show processing statistics
  const metrics = await gammaSystem.getPerformanceMetrics();
  console.log('Processing Metrics:', {
    throughput: `${metrics.performance.throughput}/s`,
    latency: `${metrics.performance.processingLatency}ms`,
    errorRate: `${(metrics.performance.errorRate * 100).toFixed(2)}%`
  });
}

/**
 * Demonstrate priority management
 */
async function demonstratePriorityManagement(gammaSystem: GammaAdaptiveSystem) {
  console.log('\n🎯 Priority Management Demonstration');
  console.log('-----------------------------------');
  
  const orchestratorState = gammaSystem.getOrchestratorState();
  const tickers = Object.values(orchestratorState.tickers);
  
  // Show priority scoring
  console.log('Ticker Priority Analysis:');
  
  const priorityManager = new PriorityManager({
    'SPY': 1.5,
    'QQQ': 1.4,
    'AAPL': 1.3,
    'MSFT': 1.2,
    'NVDA': 1.1,
    'TSLA': 0.9,
    'META': 1.0,
    'AMZN': 1.0
  });
  
  const prioritizedTickers = priorityManager.prioritizeTickers(tickers);
  
  prioritizedTickers.slice(0, 5).forEach((ticker, index) => {
    const score = priorityManager.calculatePriorityScore(ticker);
    console.log(`${index + 1}. ${ticker.ticker}: ${score.toFixed(1)} points (${ticker.status})`);
  });
  
  // Show resource utilization
  const queueStats = priorityManager.getQueueStatistics();
  console.log('\nResource Utilization:', {
    tasks: `${(queueStats.resourceUtilization.tasks * 100).toFixed(1)}%`,
    memory: `${(queueStats.resourceUtilization.memory * 100).toFixed(1)}%`,
    cpu: `${(queueStats.resourceUtilization.cpu * 100).toFixed(1)}%`,
    network: `${(queueStats.resourceUtilization.network * 100).toFixed(1)}%`
  });
}

/**
 * Simulate multi-ticker activity
 */
async function simulateMultiTickerActivity(gammaSystem: GammaAdaptiveSystem, duration: number) {
  const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN'];
  const startTime = Date.now();
  let updateCount = 0;
  
  const activityInterval = setInterval(async () => {
    try {
      // Random ticker selection
      const ticker = tickers[Math.floor(Math.random() * tickers.length)];
      
      // Simulate market update
      await gammaSystem.processMarketUpdate({
        ticker,
        price: 100 + Math.random() * 100,
        volume: Math.floor(Math.random() * 2000000),
        timestamp: new Date()
      });
      
      updateCount++;
      
      // Periodic status update
      if (updateCount % 10 === 0) {
        const orchestratorState = gammaSystem.getOrchestratorState();
        const metrics = await gammaSystem.getPerformanceMetrics();
        
        console.log(`📊 Status Update (${updateCount} updates):`, {
          activeTickers: orchestratorState.activeTickerCount,
          activeTrades: orchestratorState.activeTrades,
          portfolioHeat: `${(orchestratorState.portfolioHeat * 100).toFixed(1)}%`,
          throughput: `${metrics.performance.throughput}/s`,
          systemHealth: orchestratorState.systemHealth.status
        });
      }
      
    } catch (error) {
      console.error('Activity simulation error:', error);
    }
  }, 1000); // Update every second
  
  // Stop after duration
  setTimeout(() => {
    clearInterval(activityInterval);
    console.log(`🏁 Activity simulation completed: ${updateCount} updates in ${duration/1000}s`);
  }, duration);
  
  // Wait for completion
  await new Promise(resolve => setTimeout(resolve, duration + 1000));
}

/**
 * Set up comprehensive monitoring
 */
function setupComprehensiveMonitoring(gammaSystem: GammaAdaptiveSystem) {
  // System events
  gammaSystem.on('system:initialized', (data) => {
    console.log('🚀 System Initialized:', data);
  });

  // State transition events
  gammaSystem.on('ticker:state:transition', (data) => {
    console.log(`🔄 ${data.ticker}: ${data.from} → ${data.to}`);
  });

  // Trade execution events
  gammaSystem.on('trade:executed', (data) => {
    console.log(`💰 Trade: ${data.ticker} (${data.confidence.toFixed(3)})`);
  });

  // Processing events
  gammaSystem.on('signal:processed', (data) => {
    if (Math.random() < 0.1) { // Show 10% of signals to avoid spam
      console.log(`📈 Signal: ${data.ticker} (${data.confidence.toFixed(3)})`);
    }
  });

  // Error events
  gammaSystem.on('system:error', (error) => {
    console.error('❌ System Error:', error);
  });

  // Performance monitoring
  setInterval(async () => {
    try {
      const metrics = await gammaSystem.getPerformanceMetrics();
      const orchestratorState = gammaSystem.getOrchestratorState();
      
      // Only log if there's significant activity
      if (orchestratorState.totalSignalsProcessed > 0) {
        console.log('📊 Performance:', {
          signals: orchestratorState.totalSignalsProcessed,
          latency: `${metrics.performance.processingLatency}ms`,
          throughput: `${metrics.performance.throughput}/s`,
          health: orchestratorState.systemHealth.status
        });
      }
    } catch (error) {
      // Ignore monitoring errors
    }
  }, 15000); // Every 15 seconds
}

/**
 * Get status distribution from ticker states
 */
function getStatusDistribution(tickers: Record<string, any>) {
  const distribution: Record<string, number> = {};
  
  for (const ticker of Object.values(tickers)) {
    const status = (ticker as any).status;
    distribution[status] = (distribution[status] || 0) + 1;
  }
  
  return distribution;
}

/**
 * Standalone state manager demo
 */
async function standaloneStateManagerDemo() {
  console.log('\n🔧 Standalone State Manager Demo');
  console.log('=================================');
  
  const stateManager = new TickerStateManager();
  
  // Initialize some tickers
  const tickers = ['SPY', 'QQQ', 'AAPL'];
  tickers.forEach(ticker => stateManager.initializeTicker(ticker));
  
  // Set up event monitoring
  stateManager.on('ticker:updated', (data) => {
    if (data.statusChanged) {
      console.log(`🔄 ${data.ticker}: ${data.previousState.status} → ${data.newState.status}`);
    }
  });
  
  stateManager.on('ticker:transition', (data) => {
    console.log(`📝 Transition recorded: ${data.ticker} (${data.transition.duration}ms in previous state)`);
  });
  
  // Simulate state transitions
  console.log('Simulating state transitions...');
  
  // SPY: READY → SET → GO → COOLDOWN → READY
  stateManager.updateTickerState('SPY', { 
    status: 'SET', 
    confidence: 0.7, 
    conviction: 0.8 
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  stateManager.updateTickerState('SPY', { 
    status: 'GO', 
    confidence: 0.85, 
    conviction: 0.9 
  });
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  stateManager.updateTickerState('SPY', { 
    status: 'COOLDOWN',
    cooldownUntil: new Date(Date.now() + 3000) // 3 second cooldown
  });
  
  // Show statistics
  const stats = stateManager.getStateStatistics();
  console.log('State Statistics:', {
    totalTickers: stats.totalTickers,
    statusDistribution: stats.statusDistribution,
    averageConfidence: stats.averageConfidence,
    tickersInCooldown: stats.tickersInCooldown
  });
  
  // Wait for cooldown to expire
  console.log('Waiting for cooldown to expire...');
  await new Promise(resolve => setTimeout(resolve, 4000));
  
  const finalStats = stateManager.getStateStatistics();
  console.log('Final Statistics:', {
    statusDistribution: finalStats.statusDistribution,
    readyTickers: finalStats.readyTickers
  });
}

// Run demos
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🎯 Starting Multi-Ticker State Management Demos...\n');
  
  // Run main demo
  multiTickerDemo().catch(console.error);
  
  // Run standalone demo after main demo
  setTimeout(() => {
    standaloneStateManagerDemo().catch(console.error);
  }, 70000); // Start after 70 seconds
}

export { multiTickerDemo, standaloneStateManagerDemo };