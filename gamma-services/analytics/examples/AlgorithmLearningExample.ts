/**
 * Example demonstrating the Algorithm Learning and Calibration System
 * This shows how the system:
 * 1. Analyzes trade outcomes with confidence vs actual outcome analysis
 * 2. Calibrates confidence thresholds with bounded adjustments (±20%) to prevent overfitting
 * 3. Recognizes signal patterns and adjusts effectiveness weighting
 */

import { EventBus } from '../../core/EventBus';
import { DatabaseManager } from '../../database/DatabaseManager';
import { AlgorithmLearningEngine } from '../AlgorithmLearningEngine';
import { PaperPosition, MarketRegime, ExitReason } from '../../models/PaperTradingTypes';
import { DEFAULT_LEARNING_CONFIG } from '../types/LearningTypes';

export class AlgorithmLearningExample {
  private eventBus: EventBus;
  private databaseManager: DatabaseManager;
  private learningEngine: AlgorithmLearningEngine;

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.databaseManager = new DatabaseManager({
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_KEY || ''
    });
    this.learningEngine = new AlgorithmLearningEngine(
      this.eventBus,
      this.databaseManager,
      DEFAULT_LEARNING_CONFIG
    );
  }

  /**
   * Example 1: Trade Outcome Analysis
   */
  public async demonstrateTradeOutcomeAnalysis(): Promise<void> {
    console.log('\n=== Trade Outcome Analysis Example ===');
    
    // Simulate a series of trades with varying confidence and outcomes
    const tradeOutcomes = this.generateSampleTradeOutcomes();
    
    // Set up the learning engine with sample data
    (this.learningEngine as any).tradeOutcomes = tradeOutcomes;
    
    // Analyze trade outcomes
    const analysis = await this.learningEngine.analyzeTradeOutcomes();
    
    console.log('Trade Outcome Analysis Results:');
    console.log(`  Total Outcomes Analyzed: ${analysis.length}`);
    
    // Calculate overall statistics
    const avgPredictionError = analysis.reduce((sum, a) => sum + a.predictionError, 0) / analysis.length;
    const avgCalibrationScore = analysis.reduce((sum, a) => sum + a.calibrationScore, 0) / analysis.length;
    const overconfidentTrades = analysis.filter(a => a.predictionError > 0.3).length;
    
    console.log(`  Average Prediction Error: ${(avgPredictionError * 100).toFixed(1)}%`);
    console.log(`  Average Calibration Score: ${avgCalibrationScore.toFixed(3)} (lower is better)`);
    console.log(`  Overconfident Trades: ${overconfidentTrades} (${((overconfidentTrades / analysis.length) * 100).toFixed(1)}%)`);
    
    // Show examples by confidence range
    const highConfidenceAnalysis = analysis.filter(a => a.predictedConfidence >= 0.8);
    const mediumConfidenceAnalysis = analysis.filter(a => a.predictedConfidence >= 0.6 && a.predictedConfidence < 0.8);
    const lowConfidenceAnalysis = analysis.filter(a => a.predictedConfidence < 0.6);
    
    console.log('\nAnalysis by Confidence Range:');
    console.log(`  High Confidence (≥80%): ${highConfidenceAnalysis.length} trades`);
    if (highConfidenceAnalysis.length > 0) {
      const highConfWinRate = highConfidenceAnalysis.filter(a => a.actualOutcome === 'WIN').length / highConfidenceAnalysis.length;
      console.log(`    Actual Win Rate: ${(highConfWinRate * 100).toFixed(1)}%`);
      console.log(`    Expected Win Rate: ${(highConfidenceAnalysis.reduce((sum, a) => sum + a.predictedConfidence, 0) / highConfidenceAnalysis.length * 100).toFixed(1)}%`);
    }
    
    console.log(`  Medium Confidence (60-80%): ${mediumConfidenceAnalysis.length} trades`);
    if (mediumConfidenceAnalysis.length > 0) {
      const medConfWinRate = mediumConfidenceAnalysis.filter(a => a.actualOutcome === 'WIN').length / mediumConfidenceAnalysis.length;
      console.log(`    Actual Win Rate: ${(medConfWinRate * 100).toFixed(1)}%`);
      console.log(`    Expected Win Rate: ${(mediumConfidenceAnalysis.reduce((sum, a) => sum + a.predictedConfidence, 0) / mediumConfidenceAnalysis.length * 100).toFixed(1)}%`);
    }
    
    console.log(`  Low Confidence (<60%): ${lowConfidenceAnalysis.length} trades`);
    if (lowConfidenceAnalysis.length > 0) {
      const lowConfWinRate = lowConfidenceAnalysis.filter(a => a.actualOutcome === 'WIN').length / lowConfidenceAnalysis.length;
      console.log(`    Actual Win Rate: ${(lowConfWinRate * 100).toFixed(1)}%`);
      console.log(`    Expected Win Rate: ${(lowConfidenceAnalysis.reduce((sum, a) => sum + a.predictedConfidence, 0) / lowConfidenceAnalysis.length * 100).toFixed(1)}%`);
    }
  }

  /**
   * Example 2: Confidence Calibration with Bounded Adjustments
   */
  public async demonstrateConfidenceCalibration(): Promise<void> {
    console.log('\n=== Confidence Calibration Example ===');
    
    // Generate poorly calibrated trade outcomes to demonstrate calibration
    const poorlyCalibrated = this.generatePoorlyCalibratedOutcomes();
    (this.learningEngine as any).tradeOutcomes = poorlyCalibrated;
    
    // Perform confidence calibration
    const calibrations = await this.learningEngine.calibrateConfidenceThresholds();
    
    console.log('Confidence Calibration Results:');
    console.log(`  Calibration Ranges Analyzed: ${calibrations.length}`);
    
    calibrations.forEach(calibration => {
      console.log(`\n  Range ${calibration.confidenceRange}:`);
      console.log(`    Total Trades: ${calibration.totalTrades}`);
      console.log(`    Expected Win Rate: ${(calibration.expectedWinRate * 100).toFixed(1)}%`);
      console.log(`    Actual Win Rate: ${(calibration.actualWinRate * 100).toFixed(1)}%`);
      console.log(`    Calibration Error: ${(calibration.calibrationError * 100).toFixed(1)}%`);
      console.log(`    Recommended Adjustment: ${(calibration.recommendedAdjustment * 100).toFixed(1)}%`);
      console.log(`    Reliability: ${(calibration.reliability * 100).toFixed(1)}%`);
      
      // Interpret calibration
      if (Math.abs(calibration.calibrationError) < 0.05) {
        console.log(`    ✅ Well calibrated`);
      } else if (calibration.calibrationError > 0) {
        console.log(`    ⚠️  Underconfident - actual performance better than predicted`);
      } else {
        console.log(`    ❌ Overconfident - actual performance worse than predicted`);
      }
      
      // Show bounded adjustment
      console.log(`    📊 Bounded Adjustment: ${Math.abs(calibration.recommendedAdjustment) <= 0.2 ? '✅' : '❌'} (max ±20%)`);
    });
    
    // Demonstrate overfitting prevention
    console.log('\nOverfitting Prevention Measures:');
    console.log('  ✅ Bounded adjustments (±20% maximum)');
    console.log('  ✅ Validation split (20% holdout)');
    console.log('  ✅ Adjustment decay (5% per period)');
    console.log('  ✅ Minimum trade requirements');
  }

  /**
   * Example 3: Signal Pattern Recognition and Effectiveness Weighting
   */
  public async demonstrateSignalPatternRecognition(): Promise<void> {
    console.log('\n=== Signal Pattern Recognition Example ===');
    
    // Generate patterned trade outcomes
    const patternedOutcomes = this.generatePatternedOutcomes();
    (this.learningEngine as any).tradeOutcomes = patternedOutcomes;
    
    // Recognize signal patterns
    const patterns = await this.learningEngine.recognizeSignalPatterns();
    
    console.log('Signal Pattern Recognition Results:');
    console.log(`  Patterns Identified: ${patterns.length}`);
    
    patterns.forEach(pattern => {
      console.log(`\n  Pattern: ${pattern.patternDescription}`);
      console.log(`    Signal Type: ${pattern.signalType}`);
      console.log(`    Total Occurrences: ${pattern.historicalPerformance.totalOccurrences}`);
      console.log(`    Success Rate: ${(pattern.historicalPerformance.successRate * 100).toFixed(1)}%`);
      console.log(`    Average P&L: $${pattern.historicalPerformance.averagePnL.toFixed(0)}`);
      console.log(`    Average Holding Period: ${pattern.historicalPerformance.averageHoldingPeriod.toFixed(1)} hours`);
      console.log(`    Effectiveness Score: ${(pattern.effectiveness * 100).toFixed(1)}%`);
      console.log(`    Recommended Weight: ${(pattern.recommendedWeight * 100).toFixed(1)}%`);
      console.log(`    Pattern Confidence: ${(pattern.confidence * 100).toFixed(1)}%`);
      
      // Interpret effectiveness
      if (pattern.effectiveness > 0.7) {
        console.log(`    ✅ High-performing pattern - consider increasing weight`);
      } else if (pattern.effectiveness > 0.5) {
        console.log(`    ⚠️  Moderate pattern - maintain current approach`);
      } else {
        console.log(`    ❌ Underperforming pattern - consider reducing weight`);
      }
    });
    
    // Show signal effectiveness weightings
    const weightings = this.learningEngine.getSignalWeightings();
    
    console.log('\nSignal Effectiveness Weightings:');
    weightings.forEach(weighting => {
      console.log(`\n  ${weighting.signalType.toUpperCase()} Signal:`);
      console.log(`    Current Weight: ${(weighting.currentWeight * 100).toFixed(1)}%`);
      console.log(`    Recommended Weight: ${(weighting.recommendedWeight * 100).toFixed(1)}%`);
      console.log(`    Effectiveness: ${(weighting.effectiveness * 100).toFixed(1)}%`);
      console.log(`    Total Contributions: ${weighting.totalContributions}`);
      console.log(`    Successful Contributions: ${weighting.successfulContributions}`);
      console.log(`    Weight Adjustment: ${(weighting.weightAdjustment * 100).toFixed(1)}%`);
      
      // Show adjustment direction
      if (Math.abs(weighting.weightAdjustment) > 0.02) {
        const direction = weighting.weightAdjustment > 0 ? 'INCREASE' : 'DECREASE';
        console.log(`    📈 Recommendation: ${direction} weight by ${Math.abs(weighting.weightAdjustment * 100).toFixed(1)}%`);
      } else {
        console.log(`    ✅ Current weight is optimal`);
      }
    });
  }

  /**
   * Example 4: Learning Insights Generation
   */
  public async demonstrateLearningInsights(): Promise<void> {
    console.log('\n=== Learning Insights Generation Example ===');
    
    // Set up mixed data to generate various insights
    const mixedOutcomes = [
      ...this.generateSampleTradeOutcomes(),
      ...this.generatePoorlyCalibratedOutcomes(),
      ...this.generatePatternedOutcomes()
    ];
    (this.learningEngine as any).tradeOutcomes = mixedOutcomes;
    
    // Perform full learning cycle
    await this.learningEngine.analyzeTradeOutcomes();
    await this.learningEngine.calibrateConfidenceThresholds();
    await this.learningEngine.recognizeSignalPatterns();
    
    // Generate insights
    const insights = await (this.learningEngine as any).generateLearningInsights();
    
    console.log('Learning Insights Generated:');
    console.log(`  Total Insights: ${insights.length}`);
    
    // Group insights by category
    const insightsByCategory = insights.reduce((acc: any, insight: any) => {
      if (!acc[insight.category]) acc[insight.category] = [];
      acc[insight.category].push(insight);
      return acc;
    }, {} as Record<string, any[]>);
    
    Object.entries(insightsByCategory).forEach(([category, categoryInsights]: [string, any]) => {
      console.log(`\n  ${category} Insights (${categoryInsights.length}):`);
      
      categoryInsights.forEach((insight: any) => {
        console.log(`\n    📊 ${insight.title}`);
        console.log(`       Description: ${insight.description}`);
        console.log(`       Impact: ${insight.impact}`);
        console.log(`       Priority: ${insight.priority}/10`);
        console.log(`       Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
        console.log(`       Actionable: ${insight.actionable ? '✅' : '❌'}`);
        if (insight.actionable) {
          console.log(`       Recommendation: ${insight.recommendation}`);
        }
        
        // Show implementation status
        console.log(`       Status: ${insight.status}`);
      });
    });
    
    // Show insight prioritization
    const highPriorityInsights = insights.filter((i: any) => i.priority >= 7);
    console.log(`\nHigh Priority Insights: ${highPriorityInsights.length}`);
    highPriorityInsights.forEach((insight: any) => {
      console.log(`  🔥 ${insight.title} (Priority: ${insight.priority})`);
    });
  }

  /**
   * Example 5: Real-Time Learning and Adaptation
   */
  public async demonstrateRealTimeLearning(): Promise<void> {
    console.log('\n=== Real-Time Learning and Adaptation Example ===');
    
    // Set up event listeners to demonstrate real-time learning
    this.eventBus.on('learning:calibration:updated', (data) => {
      console.log(`📊 Calibration updated at ${data.timestamp.toISOString()}`);
      console.log(`   Calibrations: ${data.calibrations.length}`);
    });
    
    this.eventBus.on('learning:insights:generated', (data) => {
      console.log(`💡 New insights generated at ${data.timestamp.toISOString()}`);
      console.log(`   Insights: ${data.insights.length}`);
      data.insights.forEach((insight: any) => {
        if (insight.priority >= 8) {
          console.log(`   🔥 High Priority: ${insight.title}`);
        }
      });
    });
    
    // Start real-time learning
    await this.learningEngine.startLearning();
    console.log('✅ Real-time learning started');
    
    // Simulate incoming trades
    console.log('\nSimulating incoming trades...');
    for (let i = 0; i < 5; i++) {
      const position = this.createSamplePosition(
        'SPY',
        Math.random() > 0.6 ? 100 : -50,
        0.6 + (Math.random() * 0.4),
        'BULL',
        'PROFIT_TARGET'
      );
      
      // Simulate trade completion
      await (this.learningEngine as any).onTradeCompleted(position);
      console.log(`  Trade ${i + 1}: ${position.pnl > 0 ? 'WIN' : 'LOSS'} (Confidence: ${(position.confidence * 100).toFixed(1)}%)`);
    }
    
    // Check learning status
    const healthStatus = await this.learningEngine.getHealthStatus();
    console.log('\nLearning Engine Status:');
    console.log(`  Running: ${healthStatus.isRunning}`);
    console.log(`  Trade Outcomes: ${healthStatus.tradeOutcomes}`);
    console.log(`  Calibrations: ${healthStatus.calibrations}`);
    console.log(`  Patterns: ${healthStatus.patterns}`);
    console.log(`  Insights: ${healthStatus.insights}`);
    
    // Stop learning
    this.learningEngine.stopLearning();
    console.log('🛑 Real-time learning stopped');
  }

  /**
   * Example 6: Configuration and Overfitting Prevention
   */
  public async demonstrateConfigurationAndOverfittingPrevention(): Promise<void> {
    console.log('\n=== Configuration and Overfitting Prevention Example ===');
    
    // Show current configuration
    const currentConfig = this.learningEngine.getConfig();
    console.log('Current Learning Configuration:');
    console.log(`  Min Trades for Calibration: ${currentConfig.minTradesForCalibration}`);
    console.log(`  Max Calibration Adjustment: ±${(currentConfig.maxCalibrationAdjustment * 100).toFixed(0)}%`);
    console.log(`  Validation Split Ratio: ${(currentConfig.validationSplitRatio * 100).toFixed(0)}%`);
    console.log(`  Adjustment Decay Rate: ${(currentConfig.adjustmentDecayRate * 100).toFixed(1)}%`);
    console.log(`  Bounded Adjustments: ${currentConfig.enableBoundedAdjustments ? '✅' : '❌'}`);
    
    // Demonstrate overfitting prevention measures
    console.log('\nOverfitting Prevention Measures:');
    console.log('1. 📊 Bounded Adjustments:');
    console.log(`   - Maximum adjustment: ±${(currentConfig.maxCalibrationAdjustment * 100).toFixed(0)}%`);
    console.log('   - Prevents extreme corrections from small samples');
    
    console.log('2. 🔄 Validation Split:');
    console.log(`   - ${(currentConfig.validationSplitRatio * 100).toFixed(0)}% of data held out for validation`);
    console.log('   - Ensures adjustments work on unseen data');
    
    console.log('3. 📉 Adjustment Decay:');
    console.log(`   - ${((1 - currentConfig.adjustmentDecayRate) * 100).toFixed(1)}% decay per period`);
    console.log('   - Reduces adjustment magnitude over time');
    
    console.log('4. 📏 Minimum Sample Requirements:');
    console.log(`   - Minimum ${currentConfig.minTradesForCalibration} trades for calibration`);
    console.log(`   - Minimum ${currentConfig.minPatternOccurrences} occurrences for patterns`);
    console.log('   - Ensures statistical significance');
    
    // Update configuration for more conservative learning
    console.log('\nUpdating configuration for more conservative learning...');
    this.learningEngine.updateConfig({
      maxCalibrationAdjustment: 0.1, // Reduce from 20% to 10%
      validationSplitRatio: 0.3, // Increase validation set to 30%
      adjustmentDecayRate: 0.90, // Increase decay to 10%
      minTradesForCalibration: 30 // Increase minimum trades
    });
    
    const updatedConfig = this.learningEngine.getConfig();
    console.log('Updated Configuration:');
    console.log(`  Max Calibration Adjustment: ±${(updatedConfig.maxCalibrationAdjustment * 100).toFixed(0)}%`);
    console.log(`  Validation Split Ratio: ${(updatedConfig.validationSplitRatio * 100).toFixed(0)}%`);
    console.log(`  Adjustment Decay Rate: ${(updatedConfig.adjustmentDecayRate * 100).toFixed(1)}%`);
    console.log(`  Min Trades for Calibration: ${updatedConfig.minTradesForCalibration}`);
  }

  /**
   * Run all examples
   */
  public async runAllExamples(): Promise<void> {
    console.log('🧠 Algorithm Learning and Calibration System Examples');
    console.log('====================================================');

    try {
      await this.demonstrateTradeOutcomeAnalysis();
      await this.demonstrateConfidenceCalibration();
      await this.demonstrateSignalPatternRecognition();
      await this.demonstrateLearningInsights();
      await this.demonstrateRealTimeLearning();
      await this.demonstrateConfigurationAndOverfittingPrevention();

      console.log('\n✅ All examples completed successfully!');
      console.log('\nKey Benefits of Algorithm Learning:');
      console.log('• Continuous confidence calibration for improved accuracy');
      console.log('• Signal pattern recognition for strategy optimization');
      console.log('• Bounded adjustments to prevent overfitting');
      console.log('• Real-time learning from trade outcomes');
      console.log('• Actionable insights for strategy improvement');
      console.log('• Robust validation and statistical significance testing');

    } catch (error) {
      console.error('❌ Error running examples:', error);
    }
  }

  // Helper methods for generating sample data

  private generateSampleTradeOutcomes() {
    const outcomes = [];
    
    for (let i = 0; i < 30; i++) {
      const confidence = 0.4 + (Math.random() * 0.6); // 0.4-1.0
      const shouldWin = Math.random() < (confidence * 0.8 + 0.1); // Somewhat calibrated
      
      outcomes.push({
        signalId: `signal_${i}`,
        ticker: ['SPY', 'QQQ', 'AAPL'][i % 3],
        predictedConfidence: confidence,
        actualOutcome: shouldWin ? 'WIN' : 'LOSS',
        actualOutcomeValue: shouldWin ? 1 : 0,
        pnl: shouldWin ? 50 + (Math.random() * 100) : -(25 + (Math.random() * 75)),
        pnlPercent: shouldWin ? 10 + (Math.random() * 20) : -(5 + (Math.random() * 15)),
        holdingPeriod: 12 + (Math.random() * 36),
        marketRegime: ['BULL', 'BEAR', 'NEUTRAL'][Math.floor(Math.random() * 3)] as MarketRegime,
        signalSource: 'REGIMECOMPASS' as const,
        exitReason: shouldWin ? 'PROFIT_TARGET' : 'STOP_LOSS',
        predictionError: 0,
        calibrationScore: 0,
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
      });
    }
    
    return outcomes;
  }

  private generatePoorlyCalibratedOutcomes() {
    const outcomes = [];
    
    // Overconfident outcomes (high confidence, low success)
    for (let i = 0; i < 15; i++) {
      outcomes.push({
        signalId: `overconf_${i}`,
        ticker: 'SPY',
        predictedConfidence: 0.8 + (Math.random() * 0.2),
        actualOutcome: Math.random() > 0.7 ? 'WIN' : 'LOSS', // 30% success
        actualOutcomeValue: Math.random() > 0.7 ? 1 : 0,
        pnl: Math.random() > 0.7 ? 100 : -60,
        pnlPercent: Math.random() > 0.7 ? 20 : -12,
        holdingPeriod: 24,
        marketRegime: 'BULL' as MarketRegime,
        signalSource: 'REGIMECOMPASS' as const,
        exitReason: 'STOP_LOSS',
        predictionError: 0,
        calibrationScore: 0,
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
      });
    }
    
    // Underconfident outcomes (low confidence, high success)
    for (let i = 0; i < 15; i++) {
      outcomes.push({
        signalId: `underconf_${i}`,
        ticker: 'QQQ',
        predictedConfidence: 0.3 + (Math.random() * 0.2),
        actualOutcome: Math.random() > 0.2 ? 'WIN' : 'LOSS', // 80% success
        actualOutcomeValue: Math.random() > 0.2 ? 1 : 0,
        pnl: Math.random() > 0.2 ? 120 : -30,
        pnlPercent: Math.random() > 0.2 ? 24 : -6,
        holdingPeriod: 18,
        marketRegime: 'BULL' as MarketRegime,
        signalSource: 'REGIMECOMPASS' as const,
        exitReason: 'PROFIT_TARGET',
        predictionError: 0,
        calibrationScore: 0,
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
      });
    }
    
    return outcomes;
  }

  private generatePatternedOutcomes() {
    const outcomes = [];
    
    // Pattern 1: BULL + High Confidence = Good Performance
    for (let i = 0; i < 12; i++) {
      outcomes.push({
        signalId: `bull_high_${i}`,
        ticker: 'SPY',
        predictedConfidence: 0.8 + (Math.random() * 0.2),
        actualOutcome: Math.random() > 0.15 ? 'WIN' : 'LOSS', // 85% success
        actualOutcomeValue: Math.random() > 0.15 ? 1 : 0,
        pnl: Math.random() > 0.15 ? 100 + (Math.random() * 50) : -(30 + (Math.random() * 20)),
        pnlPercent: Math.random() > 0.15 ? 20 + (Math.random() * 10) : -(6 + (Math.random() * 4)),
        holdingPeriod: 16 + (Math.random() * 8),
        marketRegime: 'BULL' as MarketRegime,
        signalSource: 'REGIMECOMPASS' as const,
        exitReason: 'PROFIT_TARGET',
        predictionError: 0,
        calibrationScore: 0,
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
      });
    }
    
    // Pattern 2: BEAR + Low Confidence = Poor Performance
    for (let i = 0; i < 10; i++) {
      outcomes.push({
        signalId: `bear_low_${i}`,
        ticker: 'QQQ',
        predictedConfidence: 0.3 + (Math.random() * 0.2),
        actualOutcome: Math.random() > 0.75 ? 'WIN' : 'LOSS', // 25% success
        actualOutcomeValue: Math.random() > 0.75 ? 1 : 0,
        pnl: Math.random() > 0.75 ? 60 + (Math.random() * 40) : -(80 + (Math.random() * 40)),
        pnlPercent: Math.random() > 0.75 ? 12 + (Math.random() * 8) : -(16 + (Math.random() * 8)),
        holdingPeriod: 28 + (Math.random() * 12),
        marketRegime: 'BEAR' as MarketRegime,
        signalSource: 'REGIMECOMPASS' as const,
        exitReason: 'STOP_LOSS',
        predictionError: 0,
        calibrationScore: 0,
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
      });
    }
    
    // Pattern 3: NEUTRAL + Medium Confidence = Mixed Performance
    for (let i = 0; i < 8; i++) {
      outcomes.push({
        signalId: `neutral_med_${i}`,
        ticker: 'AAPL',
        predictedConfidence: 0.6 + (Math.random() * 0.2),
        actualOutcome: Math.random() > 0.4 ? 'WIN' : 'LOSS', // 60% success
        actualOutcomeValue: Math.random() > 0.4 ? 1 : 0,
        pnl: Math.random() > 0.4 ? 80 + (Math.random() * 40) : -(50 + (Math.random() * 30)),
        pnlPercent: Math.random() > 0.4 ? 16 + (Math.random() * 8) : -(10 + (Math.random() * 6)),
        holdingPeriod: 20 + (Math.random() * 10),
        marketRegime: 'NEUTRAL' as MarketRegime,
        signalSource: 'REGIMECOMPASS' as const,
        exitReason: Math.random() > 0.4 ? 'PROFIT_TARGET' : 'STOP_LOSS',
        predictionError: 0,
        calibrationScore: 0,
        timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000))
      });
    }
    
    return outcomes;
  }

  private createSamplePosition(
    ticker: string,
    pnl: number,
    confidence: number,
    regime: MarketRegime,
    exitReason: ExitReason
  ): PaperPosition {
    return {
      id: `pos_${ticker}_${Date.now()}_${Math.random()}`,
      signalId: `signal_${ticker}_${Date.now()}`,
      ticker,
      optionSymbol: `${ticker}240315C450`,
      contractType: 'CALL',
      strike: 450,
      expiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      side: 'LONG',
      quantity: 1,
      entryPrice: 2.50,
      currentPrice: pnl > 0 ? 3.00 : 2.00,
      entryTimestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      exitTimestamp: new Date(),
      exitPrice: pnl > 0 ? 3.00 : 2.00,
      pnl,
      pnlPercent: (pnl / 250) * 100,
      maxFavorableExcursion: Math.max(pnl, 0),
      maxAdverseExcursion: Math.min(pnl, 0),
      greeks: {
        delta: 0.5,
        gamma: 0.1,
        theta: -0.05,
        vega: 0.2,
        rho: 0.01,
        impliedVolatility: 0.25
      },
      status: 'CLOSED',
      confidence,
      conviction: confidence * 0.8,
      regime,
      exitReason
    };
  }

  public async shutdown(): Promise<void> {
    await this.learningEngine.shutdown();
    console.log('🔄 Algorithm Learning example shutdown complete');
  }
}

// Example usage
if (require.main === module) {
  const example = new AlgorithmLearningExample();
  
  example.runAllExamples()
    .then(() => example.shutdown())
    .catch(console.error);
}