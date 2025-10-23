import { MultiTickerOrchestrator } from '../orchestrators/MultiTickerOrchestrator';
import { EnhancedSignal, MultiTickerConfig, TickerState } from '../types/core';

/**
 * Example demonstrating enhanced multi-ticker state management
 * 
 * This example shows:
 * 1. Concurrent state tracking for 10+ tickers
 * 2. Priority-based processing and resource allocation
 * 3. Ready-Set-Go lifecycle management
 * 4. Graceful degradation under resource constraints
 * 5. Real-time event emission within 100ms
 */

async function demonstrateMultiTickerStateManagement() {
  console.log('=== Multi-Ticker State Management Demo ===\n');

  // 1. Configure multi-ticker orchestrator
  const config: MultiTickerConfig = {
    watchlist: [
      'SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 
      'TSLA', 'META', 'AMZN', 'GOOGL', 'NFLX',
      'AMD', 'CRM'  // 12 tickers total
    ],
    maxConcurrentTrades: 3,
    confidenceThreshold: 0.75,
    fibZoneBlocklist: ['EXHAUSTION', 'OVER_EXTENSION'],
    updateInterval: 2000, // 2 seconds
    priorityWeights: {
      'SPY': 1.5,    // Higher priority for SPY
      'QQQ': 1.4,    // High priority for QQQ
      'AAPL': 1.3,   // High priority for AAPL
      'MSFT': 1.2,   // Medium-high priority
      'NVDA': 1.1,   // Medium-high priority
      // Others default to 1.0
    }
  };

  // 2. Create and start orchestrator
  const orchestrator = new MultiTickerOrchestrator(config);
  
  // Set up event listeners to demonstrate real-time capabilities
  setupEventListeners(orchestrator);
  
  // Start the orchestrator
  await orchestrator.start();
  
  console.log(`✅ Started monitoring ${config.watchlist.length} tickers concurrently\n`);

  // 3. Simulate concurrent signal processing
  console.log('📊 Simulating concurrent signal processing...\n');
  
  // Generate signals for multiple tickers simultaneously
  const signalPromises = config.watchlist.map(ticker => 
    simulateEnhancedSignal(orchestrator, ticker)
  );
  
  // Process all signals concurrently
  await Promise.all(signalPromises);
  
  // 4. Demonstrate state transitions
  console.log('🔄 Demonstrating Ready-Set-Go lifecycle transitions...\n');
  await demonstrateStateTransitions(orchestrator);
  
  // 5. Show priority-based processing
  console.log('⚡ Demonstrating priority-based processing...\n');
  await demonstratePriorityProcessing(orchestrator);
  
  // 6. Test resource constraints and graceful degradation
  console.log('🛡️ Testing graceful degradation under resource constraints...\n');
  await demonstrateGracefulDegradation(orchestrator);
  
  // 7. Display final state
  console.log('📈 Final Multi-Ticker State Summary:\n');
  displayStateStatistics(orchestrator);
  
  // 8. Cleanup
  setTimeout(async () => {
    await orchestrator.stop();
    console.log('\n✅ Multi-ticker state management demo completed');
  }, 5000);
}

/**
 * Set up event listeners to monitor real-time state changes
 */
function setupEventListeners(orchestrator: MultiTickerOrchestrator) {
  // Track event emission times to verify <100ms requirement
  const eventTimes = new Map<string, number>();
  
  orchestrator.on('ticker:state:transition', (data) => {
    const emissionTime = Date.now() - data.timestamp.getTime();
    console.log(`🔄 ${data.ticker}: ${data.from} → ${data.to} (${emissionTime}ms)`);
    
    if (emissionTime > 100) {
      console.warn(`⚠️  Event emission took ${emissionTime}ms (>100ms threshold)`);
    }
  });
  
  orchestrator.on('orchestrator:degradation:applied', (data) => {
    console.log(`🛡️ Graceful degradation applied: ${data.reason}`);
    console.log(`   Update interval: ${data.originalInterval}ms → ${data.newInterval}ms`);
    console.log(`   Max concurrent: ${data.maxConcurrentTickers} tickers`);
  });
  
  orchestrator.on('ticker:processing:error', (data) => {
    console.log(`❌ Processing error for ${data.ticker}: ${data.error}`);
  });
  
  orchestrator.on('orchestrator:metrics', (data) => {
    console.log(`📊 Processing metrics: ${data.tickersProcessed} tickers in ${data.processingTime}ms`);
  });
}

/**
 * Simulate enhanced signal for a ticker
 */
async function simulateEnhancedSignal(orchestrator: MultiTickerOrchestrator, ticker: string): Promise<void> {
  // Create realistic signal data
  const signal: EnhancedSignal = {
    ticker,
    timestamp: new Date(),
    confidence: 0.6 + Math.random() * 0.3, // 60-90% confidence
    conviction: 0.5 + Math.random() * 0.4, // 50-90% conviction
    factors: {
      ticker,
      trendComposite: Math.random(),
      momentumDivergence: Math.random(),
      volumeProfile: Math.random(),
      ribbonAlignment: Math.random(),
      fibConfluence: Math.random(),
      gammaExposure: Math.random(),
      timestamp: new Date()
    },
    fibAnalysis: {
      currentZone: getRandomFibZone(),
      expansionLevel: Math.random(),
      keyLevels: {
        support: [400, 395, 390],
        resistance: [410, 415, 420],
        targets: [425, 430, 435]
      },
      confluence: Math.random(),
      zoneMultiplier: 1.0,
      riskAdjustment: Math.random() * 0.2
    },
    gammaAnalysis: {
      netGammaExposure: (Math.random() - 0.5) * 1000000,
      gammaFlip: 400 + Math.random() * 20,
      volSuppressionLevel: Math.random(),
      accelerationZones: [405, 415],
      pinningRisk: Math.random(),
      confidenceAdjustment: Math.random() * 0.1
    },
    recommendations: [],
    riskAssessment: {
      riskScore: Math.random() * 0.8,
      portfolioHeat: Math.random() * 0.1,
      positionSize: Math.floor(Math.random() * 5) + 1,
      maxRisk: 1000,
      stopLoss: 390,
      profitTarget: 420
    },
    metadata: {
      regime: getRandomRegime(),
      volatilityEnvironment: 'NORMAL',
      marketBreadth: Math.random(),
      sectorRotation: 'TECH'
    }
  };
  
  // Process the signal
  await orchestrator.processEnhancedSignal(signal);
  
  // Small delay to simulate realistic timing
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
}

/**
 * Demonstrate state transitions through Ready-Set-Go lifecycle
 */
async function demonstrateStateTransitions(orchestrator: MultiTickerOrchestrator): Promise<void> {
  const testTicker = 'SPY';
  
  // Force transition to SET
  console.log(`Forcing ${testTicker} to SET state...`);
  orchestrator.forceStateTransition(testTicker, 'SET', 'Demo transition');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Force transition to GO
  console.log(`Forcing ${testTicker} to GO state...`);
  orchestrator.forceStateTransition(testTicker, 'GO', 'Demo transition');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Force transition to COOLDOWN
  console.log(`Forcing ${testTicker} to COOLDOWN state...`);
  orchestrator.forceStateTransition(testTicker, 'COOLDOWN', 'Demo transition');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log(`${testTicker} lifecycle demonstration complete\n`);
}

/**
 * Demonstrate priority-based processing
 */
async function demonstratePriorityProcessing(orchestrator: MultiTickerOrchestrator): Promise<void> {
  console.log('Creating high-priority signals for priority demonstration...');
  
  // Create high-confidence signals for high-priority tickers
  const highPriorityTickers = ['SPY', 'QQQ', 'AAPL'];
  
  for (const ticker of highPriorityTickers) {
    const highConfidenceSignal: EnhancedSignal = {
      ticker,
      timestamp: new Date(),
      confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
      conviction: 0.8 + Math.random() * 0.15, // 80-95% conviction
      factors: {
        ticker,
        trendComposite: 0.9,
        momentumDivergence: 0.8,
        volumeProfile: 0.85,
        ribbonAlignment: 0.9,
        fibConfluence: 0.8,
        gammaExposure: 0.7,
        timestamp: new Date()
      },
      fibAnalysis: {
        currentZone: 'COMPRESSION', // High priority zone
        expansionLevel: 0.2,
        keyLevels: { support: [400], resistance: [410], targets: [420] },
        confluence: 0.9,
        zoneMultiplier: 1.2,
        riskAdjustment: 0.1
      },
      gammaAnalysis: {
        netGammaExposure: -500000, // Negative gamma (good for trends)
        gammaFlip: 405,
        volSuppressionLevel: 0.3,
        accelerationZones: [410, 415],
        pinningRisk: 0.2,
        confidenceAdjustment: 0.05
      },
      recommendations: [],
      riskAssessment: {
        riskScore: 0.3, // Low risk
        portfolioHeat: 0.05,
        positionSize: 3,
        maxRisk: 500,
        stopLoss: 395,
        profitTarget: 425
      },
      metadata: {
        regime: 'BULL',
        volatilityEnvironment: 'LOW',
        marketBreadth: 0.8,
        sectorRotation: 'TECH'
      }
    };
    
    await orchestrator.processEnhancedSignal(highConfidenceSignal);
    console.log(`📈 High-priority signal processed for ${ticker}`);
  }
  
  console.log('Priority-based processing demonstration complete\n');
}

/**
 * Demonstrate graceful degradation under resource constraints
 */
async function demonstrateGracefulDegradation(orchestrator: MultiTickerOrchestrator): Promise<void> {
  console.log('Simulating resource constraints...');
  
  // Simulate high load by processing many signals rapidly
  const rapidSignals = [];
  
  for (let i = 0; i < 20; i++) {
    const ticker = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'][i % 5];
    rapidSignals.push(simulateEnhancedSignal(orchestrator, ticker));
  }
  
  // Process all signals simultaneously to stress the system
  await Promise.all(rapidSignals);
  
  console.log('Resource constraint simulation complete\n');
}

/**
 * Display comprehensive state statistics
 */
function displayStateStatistics(orchestrator: MultiTickerOrchestrator): void {
  const statistics = orchestrator.getStateStatistics();
  const processingStats = orchestrator.getProcessingStatistics();
  const orchestratorState = orchestrator.getOrchestratorState();
  
  console.log('📊 State Statistics:');
  console.log(`   Total Tickers: ${statistics.totalTickers}`);
  console.log(`   Ready: ${statistics.readyTickers}`);
  console.log(`   Active (SET/GO): ${statistics.activeTickers}`);
  console.log(`   Cooldown: ${statistics.tickersInCooldown}`);
  console.log(`   Average Confidence: ${(statistics.averageConfidence * 100).toFixed(1)}%`);
  console.log(`   Average Conviction: ${(statistics.averageConviction * 100).toFixed(1)}%`);
  
  console.log('\n⚡ Processing Statistics:');
  console.log(`   Completed Tasks: ${processingStats.completedTasks}`);
  console.log(`   Failed Tasks: ${processingStats.failedTasks}`);
  console.log(`   Average Processing Time: ${processingStats.averageProcessingTime}ms`);
  console.log(`   Throughput: ${processingStats.throughput.toFixed(1)} tasks/sec`);
  
  console.log('\n🎯 Portfolio Status:');
  console.log(`   Active Trades: ${orchestratorState.activeTrades}`);
  console.log(`   Portfolio Heat: ${(orchestratorState.portfolioHeat * 100).toFixed(1)}%`);
  console.log(`   System Health: ${orchestratorState.systemHealth.status}`);
  
  console.log('\n📈 Fibonacci Zone Distribution:');
  Object.entries(statistics.fibZoneDistribution).forEach(([zone, count]) => {
    console.log(`   ${zone}: ${count} tickers`);
  });
}

// Helper functions
function getRandomFibZone(): any {
  const zones = ['COMPRESSION', 'MID_EXPANSION', 'FULL_EXPANSION', 'OVER_EXTENSION', 'EXHAUSTION'];
  return zones[Math.floor(Math.random() * zones.length)];
}

function getRandomRegime(): string {
  const regimes = ['BULL', 'BEAR', 'NEUTRAL'];
  return regimes[Math.floor(Math.random() * regimes.length)];
}

// Example of integration with existing systems
export class MultiTickerStateIntegration {
  private orchestrator: MultiTickerOrchestrator;
  
  constructor(config: MultiTickerConfig) {
    this.orchestrator = new MultiTickerOrchestrator(config);
    this.setupIntegration();
  }
  
  private setupIntegration() {
    // Integration with signal processing
    this.orchestrator.on('ticker:state:transition', (data) => {
      if (data.to === 'GO') {
        console.log(`🚀 ${data.ticker} ready for trade execution`);
        // Trigger options recommendation engine
      }
    });
    
    // Integration with risk management
    this.orchestrator.on('orchestrator:degradation:applied', (data) => {
      console.log(`🛡️ Risk management: System degradation applied`);
      // Notify risk management system
    });
    
    // Integration with performance analytics
    this.orchestrator.on('orchestrator:metrics', (data) => {
      // Send metrics to analytics engine
      console.log(`📊 Analytics: Processing metrics updated`);
    });
  }
  
  public async start() {
    await this.orchestrator.start();
  }
  
  public async stop() {
    await this.orchestrator.stop();
  }
  
  public getSystemStatus() {
    return {
      stateStatistics: this.orchestrator.getStateStatistics(),
      processingStatistics: this.orchestrator.getProcessingStatistics(),
      orchestratorState: this.orchestrator.getOrchestratorState()
    };
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateMultiTickerStateManagement().catch(console.error);
}

export { demonstrateMultiTickerStateManagement, MultiTickerStateIntegration };