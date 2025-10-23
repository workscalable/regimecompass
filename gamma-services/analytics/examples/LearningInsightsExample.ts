import { LearningInsightsEngine } from '../LearningInsightsEngine';
import { EventBus } from '../../core/EventBus';
import { DatabaseManager } from '../../database/DatabaseManager';
import { PaperPosition, MarketRegime } from '../../models/PaperTradingTypes';

/**
 * Example usage of the Learning Insights Engine
 * 
 * This example demonstrates how to:
 * 1. Initialize the Learning Insights Engine
 * 2. Generate strategy recommendations
 * 3. Analyze Fibonacci zone performance
 * 4. Adapt to different market regimes
 * 5. Monitor learning progress
 */

async function demonstrateLearningInsights() {
  // Initialize dependencies
  const eventBus = EventBus.getInstance();
  const databaseManager = new DatabaseManager({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || ''
  });
  
  // Create Learning Insights Engine
  const insightsEngine = new LearningInsightsEngine(eventBus, databaseManager);
  
  console.log('=== Learning Insights Engine Demo ===\n');
  
  // Simulate some trade history for analysis
  await simulateTradeHistory(eventBus);
  
  // Wait for insights to be generated
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 1. Generate Strategy Recommendations
  console.log('1. Generating Strategy Recommendations...');
  const recommendations = await insightsEngine.generateRecommendations();
  
  console.log(`Generated ${recommendations.length} recommendations:`);
  recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. [${rec.impact}] ${rec.title}`);
    console.log(`     ${rec.description}`);
    console.log(`     Expected: ${rec.expectedImprovement}`);
    console.log(`     Confidence: ${(rec.confidence * 100).toFixed(1)}%\n`);
  });
  
  // 2. Analyze Fibonacci Zone Performance
  console.log('2. Analyzing Fibonacci Zone Performance...');
  const fibOptimizations = await insightsEngine.analyzeFibonacciZonePerformance();
  
  console.log('Fibonacci Zone Optimizations:');
  fibOptimizations.forEach(opt => {
    const adjustment = ((opt.recommendedMultiplier - opt.currentMultiplier) * 100).toFixed(1);
    console.log(`  ${opt.zone}:`);
    console.log(`    Win Rate: ${(opt.winRate * 100).toFixed(1)}%`);
    console.log(`    Current Multiplier: ${opt.currentMultiplier.toFixed(2)}`);
    console.log(`    Recommended: ${opt.recommendedMultiplier.toFixed(2)} (${adjustment}% change)`);
    console.log(`    Confidence: ${(opt.confidence * 100).toFixed(1)}%\n`);
  });
  
  // 3. Market Regime Adaptation
  console.log('3. Analyzing Market Regime Adaptations...');
  const regimeAdaptations = await insightsEngine.adaptToMarketRegime();
  
  console.log('Market Regime Adaptations:');
  regimeAdaptations.forEach(adaptation => {
    console.log(`  ${adaptation.regime} Market:`);
    console.log(`    Win Rate: ${(adaptation.overallPerformance.winRate * 100).toFixed(1)}%`);
    console.log(`    Total Trades: ${adaptation.overallPerformance.totalTrades}`);
    console.log(`    Signal Adjustments:`);
    
    Object.entries(adaptation.signalAdjustments).forEach(([signal, adj]) => {
      const change = ((adj.recommendedWeight - adj.currentWeight) * 100).toFixed(1);
      console.log(`      ${signal}: ${adj.currentWeight.toFixed(2)} → ${adj.recommendedWeight.toFixed(2)} (${change}%)`);
    });
    
    console.log(`    Recommendations:`);
    adaptation.recommendations.forEach(rec => {
      console.log(`      - ${rec}`);
    });
    console.log('');
  });
  
  // 4. Monitor System Health
  console.log('4. System Health Status:');
  const health = await insightsEngine.getHealthStatus();
  console.log(`  Trade History: ${health.tradeHistory} trades`);
  console.log(`  Active Recommendations: ${health.recommendations}`);
  console.log(`  Fibonacci Optimizations: ${health.fibonacciOptimizations}`);
  console.log(`  Regime Adaptations: ${health.regimeAdaptations}\n`);
  
  // 5. Listen for real-time insights
  console.log('5. Setting up real-time insight monitoring...');
  
  eventBus.on('insights:recommendations:generated', (data) => {
    console.log(`📊 New recommendations generated: ${data.recommendations.length} items`);
  });
  
  eventBus.on('insights:fibonacci:optimization', (data) => {
    console.log(`📈 Fibonacci optimization: ${data.zone} zone adjustment ${data.adjustment > 0 ? '+' : ''}${(data.adjustment * 100).toFixed(1)}%`);
  });
  
  eventBus.on('insights:regime:adaptation', (data) => {
    console.log(`🎯 Regime adaptation: ${data.regime} market performance updated`);
  });
  
  console.log('Learning Insights Engine is now monitoring and learning from trades...\n');
  
  // Cleanup
  setTimeout(async () => {
    await insightsEngine.shutdown();
    console.log('Demo completed. Learning Insights Engine shutdown.');
  }, 5000);
}

async function simulateTradeHistory(eventBus: EventBus) {
  console.log('Simulating trade history for analysis...\n');
  
  const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA'];
  const regimes: MarketRegime[] = ['BULL', 'BEAR', 'NEUTRAL'];
  
  // Generate 50 simulated trades
  for (let i = 0; i < 50; i++) {
    const ticker = tickers[Math.floor(Math.random() * tickers.length)];
    const regime = regimes[Math.floor(Math.random() * regimes.length)];
    
    // Simulate different win rates based on regime
    let winProbability = 0.6; // Base win rate
    if (regime === 'BULL') winProbability = 0.65;
    if (regime === 'BEAR') winProbability = 0.55;
    if (regime === 'NEUTRAL') winProbability = 0.58;
    
    const isWin = Math.random() < winProbability;
    const pnl = isWin ? Math.random() * 500 + 100 : -(Math.random() * 300 + 50);
    
    const position: PaperPosition = {
      id: `sim_trade_${i}`,
      signalId: `signal_${i}`,
      ticker,
      optionSymbol: `${ticker}_CALL_400`,
      contractType: 'CALL',
      strike: 400 + Math.random() * 100,
      expiration: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      side: 'LONG',
      quantity: Math.floor(Math.random() * 5) + 1,
      entryPrice: Math.random() * 10 + 2,
      currentPrice: Math.random() * 10 + 2,
      entryTimestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      exitTimestamp: new Date(),
      exitPrice: Math.random() * 10 + 2,
      pnl,
      pnlPercent: (pnl / (Math.random() * 10 + 2)) * 100,
      maxFavorableExcursion: Math.abs(pnl) * 1.2,
      maxAdverseExcursion: -Math.abs(pnl) * 0.8,
      status: 'CLOSED',
      confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
      conviction: Math.random() * 0.4 + 0.6,
      regime,
      greeks: {
        delta: Math.random() * 0.8 + 0.2,
        gamma: Math.random() * 0.1,
        theta: -(Math.random() * 0.5),
        vega: Math.random() * 0.3,
        rho: Math.random() * 0.1,
        impliedVolatility: Math.random() * 0.4 + 0.2
      }
    };
    
    // Emit position closed event
    eventBus.emit('paper:position:closed', { 
      position, 
      reason: 'SIGNAL_EXIT',
      finalPnL: pnl 
    });
    
    // Small delay to simulate realistic timing
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  console.log('Trade history simulation completed.\n');
}

// Example of how to integrate with existing systems
class LearningInsightsIntegration {
  private insightsEngine: LearningInsightsEngine;
  
  constructor(eventBus: EventBus, databaseManager: DatabaseManager) {
    this.insightsEngine = new LearningInsightsEngine(eventBus, databaseManager);
    this.setupIntegration();
  }
  
  private setupIntegration() {
    // Integration with paper trading system
    // Note: In actual implementation, use a shared event bus reference
    // this.insightsEngine.eventBus.on('paper:position:closed', async (data) => {
    //   // Automatically trigger analysis when enough trades accumulate
    //   const health = await this.insightsEngine.getHealthStatus();
    //   if (health.tradeHistory % 10 === 0) {
    //     await this.insightsEngine.generateRecommendations();
    //   }
    // });
    
    // Integration with signal processing
    // this.insightsEngine.eventBus.on('insights:recommendations:generated', (data) => {
    //   // Apply signal optimization recommendations
    //   data.recommendations
    //     .filter(rec => rec.category === 'SIGNAL_OPTIMIZATION' && rec.impact === 'HIGH')
    //     .forEach(rec => {
    //       console.log(`Applying signal optimization: ${rec.title}`);
    //       // Implementation would adjust signal weights in SignalWeightingEngine
    //     });
    // });
    
    // Integration with risk management
    // this.insightsEngine.eventBus.on('insights:fibonacci:optimization', (data) => {
    //   if (data.confidence > 0.8) {
    //     console.log(`Updating Fibonacci zone multiplier: ${data.zone}`);
    //     // Implementation would update zone multipliers in risk management
    //   }
    // });
  }
  
  public async getPerformanceInsights() {
    return {
      recommendations: this.insightsEngine.getRecommendations(),
      fibonacciOptimizations: this.insightsEngine.getFibonacciOptimizations(),
      regimeAdaptations: this.insightsEngine.getRegimeAdaptations()
    };
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateLearningInsights().catch(console.error);
}

export { demonstrateLearningInsights, LearningInsightsIntegration };