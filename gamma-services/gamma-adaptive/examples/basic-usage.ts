// Example usage of Gamma Adaptive Trading System v3.0

import { 
  GammaAdaptiveSystem, 
  DEFAULT_GAMMA_ADAPTIVE_CONFIG,
  MultiTickerConfig 
} from '../index.js';

/**
 * Basic usage example for Gamma Adaptive Trading System
 */
async function basicUsageExample() {
  console.log('🚀 Gamma Adaptive Trading System v3.0 - Basic Usage Example');
  console.log('================================================================');

  try {
    // 1. Create custom configuration (or use default)
    const customConfig = {
      ...DEFAULT_GAMMA_ADAPTIVE_CONFIG,
      orchestrator: {
        ...DEFAULT_GAMMA_ADAPTIVE_CONFIG.orchestrator,
        watchlist: ['SPY', 'QQQ', 'AAPL'], // Monitor fewer tickers for demo
        maxConcurrentTrades: 2,
        confidenceThreshold: 0.65,
        updateInterval: 10000 // 10 seconds for demo
      }
    };

    // 2. Initialize the system
    const gammaSystem = new GammaAdaptiveSystem(customConfig);
    
    // 3. Set up event listeners
    setupEventListeners(gammaSystem);
    
    // 4. Initialize the system
    console.log('Initializing Gamma Adaptive System...');
    await gammaSystem.initialize();
    
    // 5. Start monitoring
    console.log('Starting multi-ticker monitoring...');
    await gammaSystem.startMonitoring();
    
    // 6. Simulate market data updates
    console.log('Simulating market data updates...');
    await simulateMarketData(gammaSystem);
    
    // 7. Get system status
    const status = gammaSystem.getOrchestratorState();
    console.log('System Status:', {
      activeTickerCount: status.activeTickerCount,
      activeTrades: status.activeTrades,
      portfolioHeat: status.portfolioHeat,
      systemHealth: status.systemHealth.status
    });
    
    // 8. Get performance metrics
    const metrics = await gammaSystem.getPerformanceMetrics();
    console.log('Performance Metrics:', metrics);
    
    // 9. Stop monitoring after demo
    setTimeout(async () => {
      console.log('Stopping system...');
      await gammaSystem.stopMonitoring();
      console.log('Demo completed successfully! 🎉');
    }, 30000); // Stop after 30 seconds
    
  } catch (error) {
    console.error('Error in basic usage example:', error);
  }
}

/**
 * Set up event listeners for system monitoring
 */
function setupEventListeners(gammaSystem: GammaAdaptiveSystem) {
  // System initialization events
  gammaSystem.on('system:initialized', (data) => {
    console.log('✅ System Initialized:', data);
  });

  // Monitoring events
  gammaSystem.on('monitoring:started', (data) => {
    console.log('📊 Monitoring Started for tickers:', data.tickers);
  });

  gammaSystem.on('monitoring:stopped', (data) => {
    console.log('⏹️ Monitoring Stopped at:', data.timestamp);
  });

  // Orchestrator events
  gammaSystem.on('orchestrator:started', (data) => {
    console.log('🎯 Orchestrator Started:', data);
  });

  // Ticker state transitions
  gammaSystem.on('ticker:state:transition', (data) => {
    console.log(`🔄 ${data.ticker}: ${data.from} → ${data.to}`);
  });

  // Trade execution events
  gammaSystem.on('trade:executed', (data) => {
    console.log('🚀 Trade Executed:', {
      ticker: data.ticker,
      confidence: data.confidence,
      recommendations: data.recommendations.length
    });
  });

  // Signal processing events
  gammaSystem.on('signal:processed', (data) => {
    console.log(`📈 Signal Processed: ${data.ticker} (${data.confidence.toFixed(3)})`);
  });

  // Market processing events
  gammaSystem.on('market:processed', (data) => {
    console.log(`📊 Market Update: ${data.ticker} - Confidence: ${data.confidence.toFixed(3)}`);
  });

  // Error events
  gammaSystem.on('system:error', (error) => {
    console.error('❌ System Error:', error);
  });

  gammaSystem.on('market:error', (error) => {
    console.error('❌ Market Error:', error);
  });
}

/**
 * Simulate market data updates for demonstration
 */
async function simulateMarketData(gammaSystem: GammaAdaptiveSystem) {
  const tickers = ['SPY', 'QQQ', 'AAPL'];
  let updateCount = 0;
  
  const marketDataInterval = setInterval(async () => {
    try {
      // Simulate market data for each ticker
      for (const ticker of tickers) {
        const marketData = {
          ticker,
          price: 100 + Math.random() * 20, // Random price between 100-120
          volume: Math.floor(Math.random() * 1000000), // Random volume
          timestamp: new Date()
        };
        
        await gammaSystem.processMarketUpdate(marketData);
      }
      
      updateCount++;
      
      // Stop after 5 updates (demo purposes)
      if (updateCount >= 5) {
        clearInterval(marketDataInterval);
        console.log('Market data simulation completed');
      }
    } catch (error) {
      console.error('Error in market data simulation:', error);
      clearInterval(marketDataInterval);
    }
  }, 5000); // Update every 5 seconds
}

/**
 * Advanced usage example with custom configuration
 */
async function advancedUsageExample() {
  console.log('🔧 Advanced Usage Example - Custom Configuration');
  console.log('================================================');

  // Create highly customized configuration
  const advancedConfig = {
    ...DEFAULT_GAMMA_ADAPTIVE_CONFIG,
    orchestrator: {
      watchlist: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA'],
      maxConcurrentTrades: 5,
      confidenceThreshold: 0.7, // Higher threshold
      fibZoneBlocklist: ['EXHAUSTION', 'OVER_EXTENSION'], // Block risky zones
      updateInterval: 15000, // 15 seconds
      priorityWeights: {
        'SPY': 1.5, // Highest priority
        'QQQ': 1.3,
        'AAPL': 1.2,
        'MSFT': 1.1,
        'NVDA': 1.0,
        'TSLA': 0.9 // Lower priority due to volatility
      }
    },
    signalProcessing: {
      weights: {
        trendComposite: 0.30,     // Increased trend weight
        momentumDivergence: 0.25, // Increased momentum weight
        volumeProfile: 0.20,
        ribbonAlignment: 0.15,
        fibConfluence: 0.05,      // Reduced fib weight
        gammaExposure: 0.05       // Reduced gamma weight
      },
      thresholds: {
        confidenceThreshold: 0.7,
        convictionThreshold: 0.8
      },
      adjustments: {
        regimeMultiplier: 1.2,
        volatilityAdjustment: 0.8
      }
    },
    riskManagement: {
      ...DEFAULT_GAMMA_ADAPTIVE_CONFIG.riskManagement,
      limits: {
        maxRiskPerTrade: 0.015,    // More conservative
        maxPortfolioHeat: 0.15,    // Lower heat limit
        maxDrawdown: 0.03,         // Tighter drawdown
        maxConsecutiveLosses: 1,   // Stop after 1 loss
        maxDailyLoss: 0.03,
        vixThreshold: 25           // Lower VIX threshold
      }
    }
  };

  const gammaSystem = new GammaAdaptiveSystem(advancedConfig);
  
  // Set up advanced monitoring
  setupAdvancedMonitoring(gammaSystem);
  
  await gammaSystem.initialize();
  await gammaSystem.startMonitoring();
  
  console.log('Advanced system running with custom configuration...');
}

/**
 * Set up advanced monitoring with detailed logging
 */
function setupAdvancedMonitoring(gammaSystem: GammaAdaptiveSystem) {
  // Detailed performance tracking
  setInterval(async () => {
    const metrics = await gammaSystem.getPerformanceMetrics();
    console.log('📊 Performance Update:', {
      activeTickerCount: metrics.activeTickerCount,
      signalsProcessed: metrics.totalSignalsProcessed,
      activeTrades: metrics.activeTrades,
      portfolioHeat: `${(metrics.portfolioHeat * 100).toFixed(1)}%`,
      systemHealth: metrics.systemHealth.status,
      processingLatency: `${metrics.performance.processingLatency}ms`,
      throughput: `${metrics.performance.throughput}/s`,
      errorRate: `${(metrics.performance.errorRate * 100).toFixed(2)}%`
    });
  }, 10000); // Every 10 seconds
}

// Run examples
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting Gamma Adaptive Trading System Examples...\n');
  
  // Run basic example
  basicUsageExample().catch(console.error);
  
  // Uncomment to run advanced example
  // setTimeout(() => {
  //   advancedUsageExample().catch(console.error);
  // }, 60000); // Start advanced example after 1 minute
}

export { basicUsageExample, advancedUsageExample };