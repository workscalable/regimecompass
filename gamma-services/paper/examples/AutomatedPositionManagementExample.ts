/**
 * Example demonstrating the Automated Position Management system
 * This shows how the system handles:
 * 1. Automated profit target and stop loss execution based on confidence levels
 * 2. Time-based exits and expiration handling with intrinsic value settlement
 * 3. Position sizing validation and portfolio heat management
 */

import { EventBus } from '../../core/EventBus';
import { AutomatedPositionManager, PositionManagementConfig } from '../AutomatedPositionManager';
import { ExitConditionManager, ExitConditionConfig } from '../ExitConditionManager';
import { RiskManager } from '../RiskManager';
import { DatabaseManager } from '../../database/DatabaseManager';
import { PaperPosition, TradeSignal, ExitReason } from '../../models/PaperTradingTypes';
import { DEFAULT_POSITION_MANAGEMENT_CONFIG, CONSERVATIVE_POSITION_MANAGEMENT_CONFIG } from '../AutomatedPositionManagerConfig';

export class AutomatedPositionManagementExample {
  private eventBus: EventBus;
  private automatedPositionManager: AutomatedPositionManager;
  private exitConditionManager: ExitConditionManager;
  private riskManager: RiskManager;
  private databaseManager: DatabaseManager;

  constructor() {
    // Initialize dependencies
    this.eventBus = new EventBus();
    this.riskManager = new RiskManager(this.eventBus, {});
    this.databaseManager = new DatabaseManager();
    
    // Initialize exit condition manager
    const exitConfig: ExitConditionConfig = {
      profitTargetPercent: 50,
      stopLossPercent: 50,
      timeDecayThreshold: 0.30,
      trailingStopPercent: 20,
      breakevenStopEnabled: true,
      expirationDaysWarning: 2,
      enableAutoExit: true
    };
    
    this.exitConditionManager = new ExitConditionManager(this.eventBus, exitConfig);
    
    // Initialize automated position manager with conservative settings
    this.automatedPositionManager = new AutomatedPositionManager(
      CONSERVATIVE_POSITION_MANAGEMENT_CONFIG,
      this.exitConditionManager,
      this.riskManager,
      this.databaseManager,
      this.eventBus
    );
  }

  /**
   * Example 1: Position Size Validation Based on Confidence
   */
  public async demonstratePositionSizeValidation(): Promise<void> {
    console.log('\n=== Position Size Validation Example ===');
    
    // High confidence signal
    const highConfidenceSignal: TradeSignal = {
      signalId: 'high-conf-001',
      ticker: 'SPY',
      side: 'LONG',
      confidence: 0.9, // Very high confidence
      conviction: 0.8,
      expectedMove: 3.0,
      timeframe: 'MEDIUM',
      regime: 'BULL',
      source: 'REGIMECOMPASS',
      timestamp: new Date()
    };

    // Low confidence signal
    const lowConfidenceSignal: TradeSignal = {
      signalId: 'low-conf-001',
      ticker: 'QQQ',
      side: 'LONG',
      confidence: 0.4, // Low confidence
      conviction: 0.3,
      expectedMove: 2.0,
      timeframe: 'SHORT',
      regime: 'NEUTRAL',
      source: 'REGIMECOMPASS',
      timestamp: new Date()
    };

    const proposedSize = 10;
    const accountBalance = 100000;

    // Validate high confidence position
    const highConfValidation = await this.automatedPositionManager.validatePositionSize(
      highConfidenceSignal,
      proposedSize,
      accountBalance
    );

    console.log('High Confidence Signal Validation:');
    console.log(`  Original Size: ${proposedSize} contracts`);
    console.log(`  Recommended Size: ${highConfValidation.recommendedSize} contracts`);
    console.log(`  Approved: ${highConfValidation.approved}`);
    console.log(`  Risk per Trade: ${(highConfValidation.riskMetrics.riskPerTrade * 100).toFixed(2)}%`);

    // Validate low confidence position
    const lowConfValidation = await this.automatedPositionManager.validatePositionSize(
      lowConfidenceSignal,
      proposedSize,
      accountBalance
    );

    console.log('\nLow Confidence Signal Validation:');
    console.log(`  Original Size: ${proposedSize} contracts`);
    console.log(`  Recommended Size: ${lowConfValidation.recommendedSize} contracts`);
    console.log(`  Approved: ${lowConfValidation.approved}`);
    console.log(`  Risk per Trade: ${(lowConfValidation.riskMetrics.riskPerTrade * 100).toFixed(2)}%`);

    // Demonstrate confidence multiplier effect
    console.log('\nConfidence Multiplier Effect:');
    console.log(`  High confidence gets ${((highConfValidation.recommendedSize / lowConfValidation.recommendedSize) * 100).toFixed(0)}% larger position size`);
  }

  /**
   * Example 2: Confidence-Based Exit Parameters
   */
  public async demonstrateConfidenceBasedExits(): Promise<void> {
    console.log('\n=== Confidence-Based Exit Parameters Example ===');
    
    const config = this.automatedPositionManager.getConfig();
    
    console.log('Exit Parameters by Confidence Level:');
    console.log('\nHigh Confidence (≥80%):');
    console.log(`  Profit Target: ${(config.confidenceBasedExits.highConfidence.profitTarget * 100).toFixed(0)}%`);
    console.log(`  Stop Loss: ${(config.confidenceBasedExits.highConfidence.stopLoss * 100).toFixed(0)}%`);
    console.log(`  Time Decay Threshold: ${(config.confidenceBasedExits.highConfidence.timeDecayThreshold * 100).toFixed(0)}%`);

    console.log('\nMedium Confidence (60-79%):');
    console.log(`  Profit Target: ${(config.confidenceBasedExits.mediumConfidence.profitTarget * 100).toFixed(0)}%`);
    console.log(`  Stop Loss: ${(config.confidenceBasedExits.mediumConfidence.stopLoss * 100).toFixed(0)}%`);
    console.log(`  Time Decay Threshold: ${(config.confidenceBasedExits.mediumConfidence.timeDecayThreshold * 100).toFixed(0)}%`);

    console.log('\nLow Confidence (<60%):');
    console.log(`  Profit Target: ${(config.confidenceBasedExits.lowConfidence.profitTarget * 100).toFixed(0)}%`);
    console.log(`  Stop Loss: ${(config.confidenceBasedExits.lowConfidence.stopLoss * 100).toFixed(0)}%`);
    console.log(`  Time Decay Threshold: ${(config.confidenceBasedExits.lowConfidence.timeDecayThreshold * 100).toFixed(0)}%`);

    console.log('\nStrategy: Higher confidence trades get:');
    console.log('  - Higher profit targets (more room to run)');
    console.log('  - Wider stop losses (more tolerance for volatility)');
    console.log('  - Lower time decay thresholds (more tolerance for theta)');
  }

  /**
   * Example 3: Time-Based Exit Scenarios
   */
  public async demonstrateTimeBasedExits(): Promise<void> {
    console.log('\n=== Time-Based Exit Scenarios Example ===');
    
    const config = this.automatedPositionManager.getConfig();
    
    console.log('Time-Based Exit Configuration:');
    console.log(`  Maximum Holding Period: ${config.timeBasedExits.maxHoldingPeriodHours} hours`);
    console.log(`  Expiration Warning: ${config.timeBasedExits.expirationWarningDays} days before`);
    console.log(`  Force Exit Before Expiration: ${config.timeBasedExits.forceExitBeforeExpirationHours} hours`);
    console.log(`  Weekend Exit Enabled: ${config.timeBasedExits.weekendExitEnabled}`);

    // Simulate different time-based scenarios
    const scenarios = [
      {
        name: 'Normal Position',
        holdingHours: 24,
        hoursToExpiration: 168, // 7 days
        shouldExit: false,
        reason: 'Within normal parameters'
      },
      {
        name: 'Maximum Holding Period Exceeded',
        holdingHours: config.timeBasedExits.maxHoldingPeriodHours + 1,
        hoursToExpiration: 72,
        shouldExit: true,
        reason: 'TIME_DECAY'
      },
      {
        name: 'Approaching Expiration',
        holdingHours: 24,
        hoursToExpiration: config.timeBasedExits.forceExitBeforeExpirationHours - 1,
        shouldExit: true,
        reason: 'EXPIRATION'
      }
    ];

    console.log('\nTime-Based Exit Scenarios:');
    scenarios.forEach(scenario => {
      console.log(`\n${scenario.name}:`);
      console.log(`  Holding Period: ${scenario.holdingHours} hours`);
      console.log(`  Time to Expiration: ${scenario.hoursToExpiration} hours`);
      console.log(`  Should Exit: ${scenario.shouldExit}`);
      console.log(`  Reason: ${scenario.reason}`);
    });
  }

  /**
   * Example 4: Portfolio Heat Management
   */
  public async demonstratePortfolioHeatManagement(): Promise<void> {
    console.log('\n=== Portfolio Heat Management Example ===');
    
    const heatMetrics = this.automatedPositionManager.getPortfolioHeatMetrics();
    const config = this.automatedPositionManager.getConfig();
    
    console.log('Portfolio Heat Configuration:');
    console.log(`  Maximum Portfolio Heat: ${(config.portfolioHeatManagement.maxPortfolioHeat * 100).toFixed(0)}%`);
    console.log(`  Heat Reduction Threshold: ${(config.portfolioHeatManagement.heatReductionThreshold * 100).toFixed(0)}%`);
    console.log(`  Emergency Exit Threshold: ${(config.portfolioHeatManagement.emergencyExitThreshold * 100).toFixed(0)}%`);
    console.log(`  Consecutive Loss Limit: ${config.portfolioHeatManagement.consecutiveLossLimit}`);
    console.log(`  Drawdown Protection: ${(config.portfolioHeatManagement.drawdownProtectionThreshold * 100).toFixed(0)}%`);

    console.log('\nCurrent Portfolio Metrics:');
    console.log(`  Current Heat: ${(heatMetrics.currentHeat * 100).toFixed(2)}%`);
    console.log(`  Available Capacity: ${(heatMetrics.availableCapacity * 100).toFixed(2)}%`);
    console.log(`  Risk Score: ${heatMetrics.riskScore.toFixed(0)}/100`);
    console.log(`  Consecutive Losses: ${heatMetrics.consecutiveLosses}`);
    console.log(`  Current Drawdown: ${(heatMetrics.currentDrawdown * 100).toFixed(2)}%`);

    // Simulate heat management scenarios
    console.log('\nHeat Management Actions:');
    if (heatMetrics.currentHeat > config.portfolioHeatManagement.emergencyExitThreshold) {
      console.log('  🚨 EMERGENCY: Close all positions immediately');
    } else if (heatMetrics.currentHeat > config.portfolioHeatManagement.heatReductionThreshold) {
      console.log('  ⚠️  WARNING: Reduce heat by closing losing positions');
    } else {
      console.log('  ✅ NORMAL: Portfolio heat within acceptable limits');
    }

    if (heatMetrics.consecutiveLosses >= config.portfolioHeatManagement.consecutiveLossLimit) {
      console.log('  🛑 PROTECTION: Consecutive loss limit reached - reduce position sizes');
    }

    if (heatMetrics.currentDrawdown > config.portfolioHeatManagement.drawdownProtectionThreshold) {
      console.log('  🛡️  DRAWDOWN: Drawdown protection activated - defensive mode');
    }
  }

  /**
   * Example 5: Expiration Handling with Intrinsic Value Settlement
   */
  public async demonstrateExpirationHandling(): Promise<void> {
    console.log('\n=== Expiration Handling Example ===');
    
    // Simulate different expiration scenarios
    const expirationScenarios = [
      {
        name: 'ITM Call Option',
        contractType: 'CALL' as const,
        strike: 450,
        underlyingPrice: 455,
        intrinsicValue: 5,
        entryPrice: 3.50,
        finalPnL: (5 - 3.50) * 100 // $150 profit
      },
      {
        name: 'OTM Call Option',
        contractType: 'CALL' as const,
        strike: 460,
        underlyingPrice: 455,
        intrinsicValue: 0,
        entryPrice: 2.25,
        finalPnL: (0 - 2.25) * 100 // $225 loss
      },
      {
        name: 'ITM Put Option',
        contractType: 'PUT' as const,
        strike: 450,
        underlyingPrice: 445,
        intrinsicValue: 5,
        entryPrice: 4.00,
        finalPnL: (5 - 4.00) * 100 // $100 profit
      },
      {
        name: 'OTM Put Option',
        contractType: 'PUT' as const,
        strike: 440,
        underlyingPrice: 445,
        intrinsicValue: 0,
        entryPrice: 1.75,
        finalPnL: (0 - 1.75) * 100 // $175 loss
      }
    ];

    console.log('Expiration Settlement Examples:');
    expirationScenarios.forEach(scenario => {
      console.log(`\n${scenario.name}:`);
      console.log(`  Strike Price: $${scenario.strike}`);
      console.log(`  Underlying Price at Expiration: $${scenario.underlyingPrice}`);
      console.log(`  Intrinsic Value: $${scenario.intrinsicValue}`);
      console.log(`  Entry Price: $${scenario.entryPrice}`);
      console.log(`  Final P&L: $${scenario.finalPnL.toFixed(0)} ${scenario.finalPnL > 0 ? '(Profit)' : '(Loss)'}`);
    });

    console.log('\nExpiration Handling Process:');
    console.log('1. Monitor positions approaching expiration');
    console.log('2. Force exit 4 hours before expiration (configurable)');
    console.log('3. If position expires, calculate intrinsic value');
    console.log('4. Settle position at intrinsic value');
    console.log('5. Update P&L and remove from active positions');
  }

  /**
   * Example 6: Configuration Customization
   */
  public async demonstrateConfigurationCustomization(): Promise<void> {
    console.log('\n=== Configuration Customization Example ===');
    
    console.log('Available Configuration Presets:');
    console.log('1. DEFAULT - Balanced approach');
    console.log('2. CONSERVATIVE - Lower risk, tighter controls');
    console.log('3. AGGRESSIVE - Higher risk, looser controls');

    // Show current configuration
    const currentConfig = this.automatedPositionManager.getConfig();
    console.log('\nCurrent Configuration (Conservative):');
    console.log(`  Max Risk per Trade: ${(currentConfig.positionSizing.maxRiskPerTrade * 100).toFixed(1)}%`);
    console.log(`  Max Portfolio Heat: ${(currentConfig.portfolioHeatManagement.maxPortfolioHeat * 100).toFixed(0)}%`);
    console.log(`  High Confidence Profit Target: ${(currentConfig.confidenceBasedExits.highConfidence.profitTarget * 100).toFixed(0)}%`);

    // Demonstrate configuration update
    console.log('\nUpdating Configuration for More Aggressive Settings:');
    this.automatedPositionManager.updateConfig({
      positionSizing: {
        ...currentConfig.positionSizing,
        maxRiskPerTrade: 0.025 // Increase from 1.5% to 2.5%
      },
      portfolioHeatManagement: {
        ...currentConfig.portfolioHeatManagement,
        maxPortfolioHeat: 0.20 // Increase from 15% to 20%
      }
    });

    const updatedConfig = this.automatedPositionManager.getConfig();
    console.log(`  Updated Max Risk per Trade: ${(updatedConfig.positionSizing.maxRiskPerTrade * 100).toFixed(1)}%`);
    console.log(`  Updated Max Portfolio Heat: ${(updatedConfig.portfolioHeatManagement.maxPortfolioHeat * 100).toFixed(0)}%`);
  }

  /**
   * Run all examples
   */
  public async runAllExamples(): Promise<void> {
    console.log('🤖 Automated Position Management System Examples');
    console.log('================================================');

    try {
      await this.demonstratePositionSizeValidation();
      await this.demonstrateConfidenceBasedExits();
      await this.demonstrateTimeBasedExits();
      await this.demonstratePortfolioHeatManagement();
      await this.demonstrateExpirationHandling();
      await this.demonstrateConfigurationCustomization();

      console.log('\n✅ All examples completed successfully!');
      console.log('\nKey Benefits of Automated Position Management:');
      console.log('• Confidence-based position sizing and exit strategies');
      console.log('• Automated time-based exits prevent theta decay');
      console.log('• Portfolio heat management prevents overexposure');
      console.log('• Intrinsic value settlement handles expiration automatically');
      console.log('• Configurable risk parameters for different trading styles');
      console.log('• Real-time monitoring and automated responses');

    } catch (error) {
      console.error('❌ Error running examples:', error);
    }
  }

  /**
   * Cleanup resources
   */
  public async shutdown(): Promise<void> {
    await this.automatedPositionManager.shutdown();
    console.log('🔄 Automated Position Management system shutdown complete');
  }
}

// Example usage
if (require.main === module) {
  const example = new AutomatedPositionManagementExample();
  
  example.runAllExamples()
    .then(() => example.shutdown())
    .catch(console.error);
}