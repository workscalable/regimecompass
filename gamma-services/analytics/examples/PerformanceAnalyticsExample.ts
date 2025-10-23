/**
 * Example demonstrating the Performance Analytics Engine
 * This shows how the system:
 * 1. Calculates real-time performance metrics (win rate, profit factor, Sharpe ratio, drawdown)
 * 2. Analyzes confidence effectiveness and signal accuracy tracking
 * 3. Provides performance breakdown by ticker, strategy, and market regime
 */

import { EventBus } from '../../core/EventBus';
import { DatabaseManager } from '../../database/DatabaseManager';
import { PerformanceAnalyticsEngine } from '../PerformanceAnalyticsEngine';
import { PaperPosition, TradeAnalysis, MarketRegime, ExitReason } from '../../models/PaperTradingTypes';
import { DEFAULT_ANALYTICS_CONFIG } from '../types/AnalyticsTypes';

export class PerformanceAnalyticsExample {
  private eventBus: EventBus;
  private databaseManager: DatabaseManager;
  private analyticsEngine: PerformanceAnalyticsEngine;

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.databaseManager = new DatabaseManager({
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_KEY || ''
    });
    this.analyticsEngine = new PerformanceAnalyticsEngine(
      this.eventBus,
      this.databaseManager,
      DEFAULT_ANALYTICS_CONFIG
    );
  }

  /**
   * Example 1: Real-Time Performance Metrics Calculation
   */
  public async demonstrateRealTimeMetrics(): Promise<void> {
    console.log('\n=== Real-Time Performance Metrics Example ===');
    
    // Simulate a series of trades with different outcomes
    const sampleTrades = this.generateSampleTrades();
    
    // Set up the analytics engine with sample data
    (this.analyticsEngine as any).tradesCache = sampleTrades;
    (this.analyticsEngine as any).lastCacheUpdate = new Date();
    
    // Calculate real-time metrics
    const metrics = await this.analyticsEngine.calculateRealTimeMetrics();
    
    console.log('Performance Metrics Summary:');
    console.log(`  Total Trades: ${metrics.totalTrades}`);
    console.log(`  Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
    console.log(`  Total P&L: $${metrics.totalPnL.toFixed(0)}`);
    console.log(`  Average Win: $${metrics.averageWin.toFixed(0)}`);
    console.log(`  Average Loss: $${metrics.averageLoss.toFixed(0)}`);
    console.log(`  Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
    console.log(`  Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);
    console.log(`  Max Drawdown: $${metrics.maxDrawdown.toFixed(0)} (${metrics.maxDrawdownPercent.toFixed(1)}%)`);
    console.log(`  Current Drawdown: $${metrics.currentDrawdown.toFixed(0)} (${metrics.currentDrawdownPercent.toFixed(1)}%)`);
    console.log(`  Average Holding Period: ${metrics.averageHoldingPeriod.toFixed(1)} hours`);
    console.log(`  Best Trade: $${metrics.bestTrade.toFixed(0)}`);
    console.log(`  Worst Trade: $${metrics.worstTrade.toFixed(0)}`);
    console.log(`  Consecutive Wins: ${metrics.consecutiveWins}`);
    console.log(`  Consecutive Losses: ${metrics.consecutiveLosses}`);
    console.log(`  Average Confidence: ${(metrics.averageConfidence * 100).toFixed(1)}%`);
    console.log(`  Confidence Accuracy: ${(metrics.confidenceAccuracy * 100).toFixed(1)}%`);
    
    // Interpret the metrics
    this.interpretMetrics(metrics);
  }

  /**
   * Example 2: Confidence Effectiveness Analysis
   */
  public async demonstrateConfidenceEffectiveness(): Promise<void> {
    console.log('\n=== Confidence Effectiveness Analysis Example ===');
    
    // Generate trades with varying confidence levels
    const confidenceTrades = this.generateConfidenceVariedTrades();
    (this.analyticsEngine as any).tradesCache = confidenceTrades;
    (this.analyticsEngine as any).lastCacheUpdate = new Date();
    
    const effectiveness = await this.analyticsEngine.analyzeConfidenceEffectiveness();
    
    console.log('Confidence Effectiveness by Range:');
    effectiveness.forEach(range => {
      console.log(`\n${range.confidenceRange} Confidence Range:`);
      console.log(`  Total Trades: ${range.totalTrades}`);
      console.log(`  Win Rate: ${(range.winRate * 100).toFixed(1)}%`);
      console.log(`  Average P&L: $${range.averagePnL.toFixed(0)}`);
      console.log(`  Accuracy: ${(range.accuracy * 100).toFixed(1)}%`);
      console.log(`  Calibration: ${(range.calibration * 100).toFixed(1)}%`);
      console.log(`  Recommended Adjustment: ${(range.recommendedAdjustment * 100).toFixed(1)}%`);
      
      // Provide interpretation
      if (range.calibration > 0.8) {
        console.log(`  ✅ Well calibrated - confidence predictions are accurate`);
      } else if (range.calibration > 0.6) {
        console.log(`  ⚠️  Moderately calibrated - some adjustment needed`);
      } else {
        console.log(`  ❌ Poorly calibrated - significant adjustment required`);
      }
    });
  }

  /**
   * Example 3: Signal Accuracy Analysis
   */
  public async demonstrateSignalAccuracy(): Promise<void> {
    console.log('\n=== Signal Accuracy Analysis Example ===');
    
    // Generate trade analyses with different signal types
    const analyses = this.generateSignalAnalyses();
    (this.analyticsEngine as any).analysisCache = analyses;
    (this.analyticsEngine as any).lastCacheUpdate = new Date();
    
    const signalAccuracy = await this.analyticsEngine.analyzeSignalAccuracy();
    
    console.log('Signal Type Effectiveness:');
    signalAccuracy.forEach(signal => {
      console.log(`\n${signal.signalType.toUpperCase()} Signal:`);
      console.log(`  Total Signals: ${signal.totalSignals}`);
      console.log(`  Successful Signals: ${signal.successfulSignals}`);
      console.log(`  Accuracy: ${(signal.accuracy * 100).toFixed(1)}%`);
      console.log(`  Average Contribution: ${(signal.averageContribution * 100).toFixed(1)}%`);
      console.log(`  Effectiveness: ${(signal.effectiveness * 100).toFixed(1)}%`);
      console.log(`  Recommended Weight: ${(signal.recommendedWeight * 100).toFixed(1)}%`);
      
      // Provide recommendations
      if (signal.effectiveness > 0.15) {
        console.log(`  ✅ High performing signal - consider increasing weight`);
      } else if (signal.effectiveness > 0.10) {
        console.log(`  ⚠️  Moderate performing signal - maintain current weight`);
      } else {
        console.log(`  ❌ Underperforming signal - consider reducing weight`);
      }
    });
  }

  /**
   * Example 4: Performance Breakdown Analysis
   */
  public async demonstratePerformanceBreakdown(): Promise<void> {
    console.log('\n=== Performance Breakdown Analysis Example ===');
    
    // Generate diverse trades across different dimensions
    const diverseTrades = this.generateDiverseTrades();
    (this.analyticsEngine as any).tradesCache = diverseTrades;
    (this.analyticsEngine as any).lastCacheUpdate = new Date();
    
    const breakdown = await this.analyticsEngine.generatePerformanceBreakdown();
    
    // Performance by ticker
    console.log('\nPerformance by Ticker:');
    Object.entries(breakdown.byTicker).forEach(([ticker, metrics]) => {
      console.log(`  ${ticker}: ${metrics.totalTrades} trades, ${(metrics.winRate * 100).toFixed(1)}% win rate, $${metrics.totalPnL.toFixed(0)} P&L`);
    });
    
    // Performance by market regime
    console.log('\nPerformance by Market Regime:');
    Object.entries(breakdown.byRegime).forEach(([regime, metrics]) => {
      console.log(`  ${regime}: ${metrics.totalTrades} trades, ${(metrics.winRate * 100).toFixed(1)}% win rate, $${metrics.totalPnL.toFixed(0)} P&L`);
    });
    
    // Performance by confidence level
    console.log('\nPerformance by Confidence Level:');
    Object.entries(breakdown.byConfidence).forEach(([range, metrics]) => {
      console.log(`  ${range}: ${metrics.totalTrades} trades, ${(metrics.winRate * 100).toFixed(1)}% win rate, $${metrics.totalPnL.toFixed(0)} P&L`);
    });
    
    // Performance by exit reason
    console.log('\nPerformance by Exit Reason:');
    Object.entries(breakdown.byExitReason).forEach(([reason, metrics]) => {
      console.log(`  ${reason}: ${metrics.totalTrades} trades, ${(metrics.winRate * 100).toFixed(1)}% win rate, $${metrics.totalPnL.toFixed(0)} P&L`);
    });
    
    // Time-based performance
    console.log('\nTime-based Performance:');
    console.log(`  Daily periods analyzed: ${breakdown.byTimeframe.daily.length}`);
    console.log(`  Weekly periods analyzed: ${breakdown.byTimeframe.weekly.length}`);
    console.log(`  Monthly periods analyzed: ${breakdown.byTimeframe.monthly.length}`);
  }

  /**
   * Example 5: Real-Time Analytics and Alerting
   */
  public async demonstrateRealTimeAnalytics(): Promise<void> {
    console.log('\n=== Real-Time Analytics and Alerting Example ===');
    
    // Set up event listeners to demonstrate real-time capabilities
    this.eventBus.on('analytics:metrics:updated', (data) => {
      console.log(`📊 Metrics updated at ${data.timestamp.toISOString()}`);
      console.log(`   Win Rate: ${(data.metrics.winRate * 100).toFixed(1)}%`);
      console.log(`   Total P&L: $${data.metrics.totalPnL.toFixed(0)}`);
    });
    
    this.eventBus.on('analytics:performance:alert', (data) => {
      console.log(`🚨 Performance Alert at ${data.timestamp.toISOString()}:`);
      data.alerts.forEach((alert: string) => {
        console.log(`   - ${alert}`);
      });
    });
    
    // Start real-time analytics
    await this.analyticsEngine.startRealTimeAnalytics();
    console.log('✅ Real-time analytics started');
    
    // Simulate some trades to trigger updates
    const poorTrades = this.generatePoorPerformanceTrades();
    (this.analyticsEngine as any).tradesCache = poorTrades;
    
    // Trigger manual update to demonstrate alerting
    await (this.analyticsEngine as any).updateRealTimeMetrics();
    
    // Check health status
    const healthStatus = await this.analyticsEngine.getHealthStatus();
    console.log('\nAnalytics Engine Health Status:');
    console.log(`  Running: ${healthStatus.isRunning}`);
    console.log(`  Last Update: ${healthStatus.lastUpdate.toISOString()}`);
    console.log(`  Cache Size: ${healthStatus.cacheSize} trades`);
    console.log(`  Metrics Available: ${healthStatus.metricsAvailable}`);
    
    // Stop analytics
    this.analyticsEngine.stopRealTimeAnalytics();
    console.log('🛑 Real-time analytics stopped');
  }

  /**
   * Example 6: Configuration Management
   */
  public async demonstrateConfigurationManagement(): Promise<void> {
    console.log('\n=== Configuration Management Example ===');
    
    // Show current configuration
    const currentConfig = this.analyticsEngine.getConfig();
    console.log('Current Configuration:');
    console.log(`  Lookback Period: ${currentConfig.lookbackPeriodDays} days`);
    console.log(`  Min Trades for Analysis: ${currentConfig.minTradesForAnalysis}`);
    console.log(`  Update Interval: ${currentConfig.realTimeUpdateIntervalMs}ms`);
    console.log(`  Min Win Rate Threshold: ${(currentConfig.minWinRateThreshold * 100).toFixed(1)}%`);
    console.log(`  Min Profit Factor Threshold: ${currentConfig.minProfitFactorThreshold}`);
    console.log(`  Max Drawdown Threshold: ${(currentConfig.maxDrawdownThreshold * 100).toFixed(1)}%`);
    
    // Update configuration for more aggressive monitoring
    console.log('\nUpdating configuration for more aggressive monitoring...');
    this.analyticsEngine.updateConfig({
      lookbackPeriodDays: 14, // Shorter lookback
      minTradesForAnalysis: 5, // Lower minimum
      realTimeUpdateIntervalMs: 2000, // More frequent updates
      minWinRateThreshold: 0.60, // Higher win rate requirement
      maxDrawdownThreshold: 0.03 // Lower drawdown tolerance
    });
    
    const updatedConfig = this.analyticsEngine.getConfig();
    console.log('Updated Configuration:');
    console.log(`  Lookback Period: ${updatedConfig.lookbackPeriodDays} days`);
    console.log(`  Min Trades for Analysis: ${updatedConfig.minTradesForAnalysis}`);
    console.log(`  Update Interval: ${updatedConfig.realTimeUpdateIntervalMs}ms`);
    console.log(`  Min Win Rate Threshold: ${(updatedConfig.minWinRateThreshold * 100).toFixed(1)}%`);
    console.log(`  Max Drawdown Threshold: ${(updatedConfig.maxDrawdownThreshold * 100).toFixed(1)}%`);
  }

  /**
   * Run all examples
   */
  public async runAllExamples(): Promise<void> {
    console.log('🔬 Performance Analytics Engine Examples');
    console.log('=========================================');

    try {
      await this.demonstrateRealTimeMetrics();
      await this.demonstrateConfidenceEffectiveness();
      await this.demonstrateSignalAccuracy();
      await this.demonstratePerformanceBreakdown();
      await this.demonstrateRealTimeAnalytics();
      await this.demonstrateConfigurationManagement();

      console.log('\n✅ All examples completed successfully!');
      console.log('\nKey Benefits of Performance Analytics:');
      console.log('• Real-time calculation of comprehensive performance metrics');
      console.log('• Confidence effectiveness analysis for signal calibration');
      console.log('• Signal accuracy tracking for algorithm improvement');
      console.log('• Multi-dimensional performance breakdown analysis');
      console.log('• Automated alerting for performance degradation');
      console.log('• Configurable thresholds and monitoring parameters');

    } catch (error) {
      console.error('❌ Error running examples:', error);
    }
  }

  // Helper methods for generating sample data

  private generateSampleTrades(): PaperPosition[] {
    return [
      this.createTrade('SPY', 150, 0.85, 'BULL', 'PROFIT_TARGET', new Date('2024-01-01')),
      this.createTrade('SPY', -75, 0.70, 'BULL', 'STOP_LOSS', new Date('2024-01-02')),
      this.createTrade('QQQ', 200, 0.90, 'BULL', 'PROFIT_TARGET', new Date('2024-01-03')),
      this.createTrade('AAPL', -50, 0.60, 'NEUTRAL', 'STOP_LOSS', new Date('2024-01-04')),
      this.createTrade('MSFT', 125, 0.80, 'BULL', 'PROFIT_TARGET', new Date('2024-01-05')),
      this.createTrade('NVDA', 300, 0.95, 'BULL', 'PROFIT_TARGET', new Date('2024-01-06')),
      this.createTrade('TSLA', -100, 0.65, 'BEAR', 'STOP_LOSS', new Date('2024-01-07')),
      this.createTrade('META', 175, 0.85, 'BULL', 'PROFIT_TARGET', new Date('2024-01-08')),
      this.createTrade('AMZN', -80, 0.55, 'NEUTRAL', 'TIME_DECAY', new Date('2024-01-09')),
      this.createTrade('GOOGL', 225, 0.88, 'BULL', 'PROFIT_TARGET', new Date('2024-01-10'))
    ];
  }

  private generateConfidenceVariedTrades(): PaperPosition[] {
    const trades: PaperPosition[] = [];
    
    // High confidence trades (0.8-1.0) - should perform well
    for (let i = 0; i < 8; i++) {
      const confidence = 0.8 + (Math.random() * 0.2);
      const pnl = Math.random() > 0.25 ? 100 + (Math.random() * 100) : -(50 + (Math.random() * 50)); // 75% win rate
      trades.push(this.createTrade('SPY', pnl, confidence, 'BULL', pnl > 0 ? 'PROFIT_TARGET' : 'STOP_LOSS'));
    }
    
    // Medium confidence trades (0.6-0.8) - moderate performance
    for (let i = 0; i < 6; i++) {
      const confidence = 0.6 + (Math.random() * 0.2);
      const pnl = Math.random() > 0.4 ? 80 + (Math.random() * 80) : -(40 + (Math.random() * 40)); // 60% win rate
      trades.push(this.createTrade('QQQ', pnl, confidence, 'NEUTRAL', pnl > 0 ? 'PROFIT_TARGET' : 'STOP_LOSS'));
    }
    
    // Low confidence trades (0.4-0.6) - poor performance
    for (let i = 0; i < 4; i++) {
      const confidence = 0.4 + (Math.random() * 0.2);
      const pnl = Math.random() > 0.6 ? 60 + (Math.random() * 60) : -(30 + (Math.random() * 30)); // 40% win rate
      trades.push(this.createTrade('AAPL', pnl, confidence, 'BEAR', pnl > 0 ? 'PROFIT_TARGET' : 'STOP_LOSS'));
    }
    
    return trades;
  }

  private generateSignalAnalyses(): TradeAnalysis[] {
    return [
      this.createAnalysis('SPY', 150, ['High confidence trend signal performed well', 'Strong momentum confirmation']),
      this.createAnalysis('QQQ', -75, ['Momentum divergence signal failed to predict reversal']),
      this.createAnalysis('AAPL', 200, ['Volume profile signal identified institutional accumulation']),
      this.createAnalysis('MSFT', -50, ['Ribbon alignment signal gave false breakout indication']),
      this.createAnalysis('NVDA', 125, ['Fibonacci confluence at key resistance level worked perfectly']),
      this.createAnalysis('TSLA', -100, ['Gamma exposure analysis missed dealer positioning shift']),
      this.createAnalysis('META', 175, ['Combined trend and volume signals provided strong entry']),
      this.createAnalysis('AMZN', -80, ['Ribbon alignment conflicted with momentum indicators'])
    ];
  }

  private generateDiverseTrades(): PaperPosition[] {
    const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'META', 'AMZN'];
    const regimes: MarketRegime[] = ['BULL', 'BEAR', 'NEUTRAL'];
    const exitReasons: ExitReason[] = ['PROFIT_TARGET', 'STOP_LOSS', 'TIME_DECAY', 'EXPIRATION'];
    const trades: PaperPosition[] = [];
    
    for (let i = 0; i < 20; i++) {
      const ticker = tickers[i % tickers.length];
      const regime = regimes[i % regimes.length];
      const exitReason = exitReasons[i % exitReasons.length];
      const confidence = 0.4 + (Math.random() * 0.6);
      const pnl = Math.random() > 0.4 ? 50 + (Math.random() * 150) : -(25 + (Math.random() * 75));
      
      trades.push(this.createTrade(ticker, pnl, confidence, regime, exitReason, new Date(Date.now() - (i * 24 * 60 * 60 * 1000))));
    }
    
    return trades;
  }

  private generatePoorPerformanceTrades(): PaperPosition[] {
    const trades: PaperPosition[] = [];
    
    // Generate 15 trades with poor performance (20% win rate)
    for (let i = 0; i < 15; i++) {
      const pnl = i < 3 ? 50 + (Math.random() * 50) : -(30 + (Math.random() * 70)); // 20% win rate
      const confidence = 0.5 + (Math.random() * 0.4);
      trades.push(this.createTrade('SPY', pnl, confidence, 'BEAR', pnl > 0 ? 'PROFIT_TARGET' : 'STOP_LOSS'));
    }
    
    return trades;
  }

  private createTrade(
    ticker: string,
    pnl: number,
    confidence: number,
    regime: MarketRegime,
    exitReason: ExitReason,
    exitDate?: Date
  ): PaperPosition {
    const exit = exitDate || new Date();
    const entry = new Date(exit.getTime() - (Math.random() * 48 * 60 * 60 * 1000)); // Random 0-48 hours before exit
    
    return {
      id: `pos_${ticker}_${Date.now()}_${Math.random()}`,
      signalId: `signal_${ticker}_${Date.now()}`,
      ticker,
      optionSymbol: `${ticker}240315C450`,
      contractType: 'CALL',
      strike: 450,
      expiration: new Date(exit.getTime() + 30 * 24 * 60 * 60 * 1000),
      side: 'LONG',
      quantity: Math.ceil(Math.abs(pnl) / 50), // Position size based on PnL
      entryPrice: 2.50,
      currentPrice: pnl > 0 ? 3.00 : 2.00,
      entryTimestamp: entry,
      exitTimestamp: exit,
      exitPrice: pnl > 0 ? 3.00 : 2.00,
      pnl,
      pnlPercent: (pnl / 250) * 100,
      maxFavorableExcursion: Math.max(pnl, pnl * 1.2),
      maxAdverseExcursion: Math.min(pnl, pnl * 0.8),
      greeks: {
        delta: 0.5 + (Math.random() * 0.3),
        gamma: 0.05 + (Math.random() * 0.1),
        theta: -(0.02 + (Math.random() * 0.08)),
        vega: 0.1 + (Math.random() * 0.2),
        rho: 0.005 + (Math.random() * 0.01),
        impliedVolatility: 0.2 + (Math.random() * 0.3)
      },
      status: 'CLOSED',
      confidence,
      conviction: confidence * (0.7 + (Math.random() * 0.3)),
      regime,
      exitReason
    };
  }

  private createAnalysis(ticker: string, pnl: number, learnings: string[]): TradeAnalysis {
    return {
      signalId: `signal_${ticker}_${Date.now()}`,
      ticker,
      entryConfidence: 0.7 + (Math.random() * 0.3),
      exitConfidence: 0.5 + (Math.random() * 0.4),
      expectedMove: 2.0 + (Math.random() * 2.0),
      actualMove: Math.abs(pnl / 100),
      pnl,
      holdingPeriod: (12 + (Math.random() * 36)) * 60 * 60 * 1000, // 12-48 hours
      maxFavorableExcursion: Math.max(pnl, pnl * 1.1),
      maxAdverseExcursion: Math.min(pnl, pnl * 0.9),
      exitReason: pnl > 0 ? 'PROFIT_TARGET' : 'STOP_LOSS',
      learnings
    };
  }

  private interpretMetrics(metrics: any): void {
    console.log('\nPerformance Interpretation:');
    
    // Win rate analysis
    if (metrics.winRate >= 0.70) {
      console.log('✅ Excellent win rate - strategy is highly effective');
    } else if (metrics.winRate >= 0.60) {
      console.log('✅ Good win rate - strategy is performing well');
    } else if (metrics.winRate >= 0.55) {
      console.log('⚠️  Acceptable win rate - monitor for improvement opportunities');
    } else {
      console.log('❌ Poor win rate - strategy needs significant improvement');
    }
    
    // Profit factor analysis
    if (metrics.profitFactor >= 2.0) {
      console.log('✅ Excellent profit factor - wins significantly outweigh losses');
    } else if (metrics.profitFactor >= 1.5) {
      console.log('✅ Good profit factor - profitable strategy');
    } else if (metrics.profitFactor >= 1.2) {
      console.log('⚠️  Acceptable profit factor - marginally profitable');
    } else {
      console.log('❌ Poor profit factor - losses too large relative to wins');
    }
    
    // Sharpe ratio analysis
    if (metrics.sharpeRatio >= 2.0) {
      console.log('✅ Excellent risk-adjusted returns');
    } else if (metrics.sharpeRatio >= 1.0) {
      console.log('✅ Good risk-adjusted returns');
    } else if (metrics.sharpeRatio >= 0.5) {
      console.log('⚠️  Acceptable risk-adjusted returns');
    } else {
      console.log('❌ Poor risk-adjusted returns - too much volatility for returns');
    }
    
    // Drawdown analysis
    if (metrics.maxDrawdownPercent <= 3) {
      console.log('✅ Excellent drawdown control');
    } else if (metrics.maxDrawdownPercent <= 5) {
      console.log('✅ Good drawdown control');
    } else if (metrics.maxDrawdownPercent <= 10) {
      console.log('⚠️  Acceptable drawdown - monitor risk management');
    } else {
      console.log('❌ Excessive drawdown - improve risk management');
    }
  }

  public async shutdown(): Promise<void> {
    await this.analyticsEngine.shutdown();
    console.log('🔄 Performance Analytics example shutdown complete');
  }
}

// Example usage
if (require.main === module) {
  const example = new PerformanceAnalyticsExample();
  
  example.runAllExamples()
    .then(() => example.shutdown())
    .catch(console.error);
}