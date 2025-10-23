import { EnhancedSignalWeightingEngine, ConfidenceFactors } from '../EnhancedSignalWeightingEngine';
import { PriceBar, VolumeBar } from '../VolumeProfileAnalyzer';
import { EventBus } from '../../core/EventBus';

/**
 * Example demonstrating Fibonacci Confluence and Gamma Exposure Integration
 * 
 * This example shows:
 * 1. Fibonacci Confluence Analysis (10% weight in signal confidence)
 * 2. Gamma Exposure Assessment (10% weight in signal confidence)
 * 3. Complete Enhanced Confidence Calculation with all 6 factors
 * 4. Support/Resistance level identification from Fibonacci analysis
 * 5. Market structure impact assessment from Gamma exposure
 */

async function demonstrateFibonacciGammaIntegration() {
  console.log('=== Fibonacci Confluence and Gamma Exposure Integration Demo ===\n');

  // 1. Initialize components
  const eventBus = new EventBus();
  const signalEngine = new EnhancedSignalWeightingEngine();
  
  // Enable integration for event emission
  signalEngine.enablePaperTradingIntegration();
  
  console.log('✅ Initialized Enhanced Signal Weighting Engine with Fibonacci and Gamma Integration\n');

  // 2. Set up event listeners to monitor analysis
  setupEventListeners(eventBus, signalEngine);

  // 3. Generate sample market data
  const ticker = 'SPY';
  const timeframe = '1D';
  const { priceData, volumeData, multiTimeframeData } = generateSampleMarketData(ticker);
  
  console.log(`📊 Generated sample market data for ${ticker}:`);
  console.log(`   Price bars: ${priceData.length}`);
  console.log(`   Volume bars: ${volumeData.length}`);
  console.log(`   Timeframes: ${Array.from(multiTimeframeData.keys()).join(', ')}\n`);

  // 4. Demonstrate Fibonacci Confluence Analysis
  console.log('🔢 Analyzing Fibonacci Confluence...\n');
  await demonstrateFibonacciConfluenceAnalysis(signalEngine, ticker, timeframe);

  // 5. Demonstrate Gamma Exposure Assessment
  console.log('⚡ Assessing Gamma Exposure...\n');
  await demonstrateGammaExposureAssessment(signalEngine, ticker, timeframe);

  // 6. Demonstrate Complete Enhanced Confidence Calculation
  console.log('🎯 Computing Complete Enhanced Signal Confidence...\n');
  await demonstrateCompleteEnhancedConfidence(
    signalEngine, 
    ticker, 
    priceData, 
    volumeData, 
    multiTimeframeData,
    timeframe
  );

  // 7. Show factor weight validation
  console.log('⚖️ Validating Factor Weight Distribution...\n');
  await validateFactorWeights(signalEngine, ticker, priceData, volumeData, multiTimeframeData, timeframe);

  // 8. Demonstrate zone-based adjustments
  console.log('🎚️ Demonstrating Zone-based Confidence Adjustments...\n');
  await demonstrateZoneAdjustments(signalEngine, ticker, timeframe);

  console.log('✅ Fibonacci Confluence and Gamma Exposure integration demo completed\n');
}

/**
 * Set up event listeners to monitor analysis events
 */
function setupEventListeners(eventBus: EventBus, signalEngine: EnhancedSignalWeightingEngine) {
  // Fibonacci confluence events
  eventBus.on('fibonacci:confluence:calculated', (data) => {
    console.log(`🔢 Fibonacci Confluence Analysis Complete for ${data.ticker}:`);
    console.log(`   Confluence Score: ${(data.result.confluenceScore * 100).toFixed(1)}%`);
    console.log(`   Current Zone: ${data.result.currentZone}`);
    console.log(`   Expansion Level: ${data.result.expansionLevel.toFixed(3)}`);
    console.log(`   Zone Multiplier: ${data.result.zoneMultiplier.toFixed(2)}`);
    console.log(`   Support/Resistance Levels: ${data.result.supportResistanceLevels.length}`);
    console.log(`   Analysis Confidence: ${(data.result.confidence * 100).toFixed(1)}%\n`);
  });

  // Gamma exposure events
  eventBus.on('gamma:exposure:assessed', (data) => {
    console.log(`⚡ Gamma Exposure Assessment Complete for ${data.ticker}:`);
    console.log(`   Net Gamma Exposure: ${data.result.netGammaExposure.toLocaleString()}`);
    console.log(`   Confidence Adjustment: ${(data.result.confidenceAdjustment * 100).toFixed(1)}%`);
    console.log(`   Acceleration Potential: ${(data.result.movementImpact.accelerationPotential * 100).toFixed(1)}%`);
    console.log(`   Suppression Level: ${(data.result.movementImpact.suppressionLevel * 100).toFixed(1)}%`);
    console.log(`   Pinning Risk: ${(data.result.movementImpact.pinningRisk * 100).toFixed(1)}%`);
    console.log(`   Analysis Confidence: ${(data.result.confidence * 100).toFixed(1)}%\n`);
  });

  // Complete enhanced confidence events
  eventBus.on('confidence:complete:enhanced', (data) => {
    console.log(`🎯 Complete Enhanced Confidence Calculated for ${data.ticker}:`);
    console.log(`   Final Confidence: ${(data.result.confidence * 100).toFixed(1)}%`);
    console.log(`   Factor Confluence: ${(data.result.factorConfluence * 100).toFixed(1)}%`);
    console.log(`   Signal Strength: ${(data.result.signalStrength * 100).toFixed(1)}%`);
    console.log(`   Reliability: ${(data.result.reliability * 100).toFixed(1)}%\n`);
    
    console.log('   Complete Factor Breakdown:');
    console.log(`     Trend Composite (25%): ${(data.result.breakdown.trendComposite * 100).toFixed(1)}%`);
    console.log(`     Momentum Divergence (20%): ${(data.result.breakdown.momentumDivergence * 100).toFixed(1)}%`);
    console.log(`     Volume Profile (20%): ${(data.result.breakdown.volumeProfile * 100).toFixed(1)}%`);
    console.log(`     Ribbon Alignment (15%): ${(data.result.breakdown.ribbonAlignment * 100).toFixed(1)}%`);
    console.log(`     Fibonacci Confluence (10%): ${(data.result.breakdown.fibonacciConfluence * 100).toFixed(1)}%`);
    console.log(`     Gamma Exposure (10%): ${(data.result.breakdown.gammaExposure * 100).toFixed(1)}%`);
    
    console.log('\n   Advanced Adjustments:');
    console.log(`     Fibonacci Zone Adjustment: ${data.result.adjustments.fibonacciZoneAdjustment.toFixed(3)}x`);
    console.log(`     Gamma Exposure Adjustment: ${data.result.adjustments.gammaExposureAdjustment.toFixed(3)}x`);
    console.log(`     Quality Adjustment: ${(data.result.adjustments.qualityAdjustment * 100).toFixed(1)}%`);
    console.log(`     Reliability Adjustment: ${(data.result.adjustments.reliabilityAdjustment * 100).toFixed(1)}%\n`);
  });
}

/**
 * Demonstrate Fibonacci Confluence Analysis
 */
async function demonstrateFibonacciConfluenceAnalysis(
  signalEngine: EnhancedSignalWeightingEngine,
  ticker: string,
  timeframe: string
) {
  const fibResult = await signalEngine.calculateFibonacciConfluence(ticker, timeframe);

  console.log('Fibonacci Confluence Analysis Results:');
  console.log(`  Confluence Score: ${(fibResult.confluenceScore * 100).toFixed(1)}%`);
  console.log(`  Current Zone: ${fibResult.currentZone}`);
  console.log(`  Expansion Level: ${fibResult.expansionLevel.toFixed(3)}`);
  console.log(`  Zone Multiplier: ${fibResult.zoneMultiplier.toFixed(2)}`);
  console.log(`  Analysis Confidence: ${(fibResult.confidence * 100).toFixed(1)}%`);
  
  console.log('\n  Support/Resistance Levels:');
  fibResult.supportResistanceLevels.slice(0, 5).forEach((level, index) => {
    console.log(`    ${index + 1}. ${level.type} at $${level.price.toFixed(2)} (Strength: ${(level.strength * 100).toFixed(1)}%)`);
  });
  
  console.log('\n  Expansion Zone Analysis:');
  console.log(`    Zone Strength: ${(fibResult.expansionZoneAnalysis.zoneStrength * 100).toFixed(1)}%`);
  console.log(`    Next Zone Target: ${fibResult.expansionZoneAnalysis.nextZoneTarget}`);
  console.log(`    Zone Risk: ${fibResult.expansionZoneAnalysis.zoneRisk}`);
  console.log(`    Trading Implications:`);
  fibResult.expansionZoneAnalysis.tradingImplications.forEach(implication => {
    console.log(`      - ${implication}`);
  });
  console.log('');
}

/**
 * Demonstrate Gamma Exposure Assessment
 */
async function demonstrateGammaExposureAssessment(
  signalEngine: EnhancedSignalWeightingEngine,
  ticker: string,
  timeframe: string
) {
  const gammaResult = await signalEngine.assessGammaExposure(ticker, timeframe);

  console.log('Gamma Exposure Assessment Results:');
  console.log(`  Net Gamma Exposure: ${gammaResult.netGammaExposure.toLocaleString()}`);
  console.log(`  Confidence Adjustment: ${(gammaResult.confidenceAdjustment * 100).toFixed(1)}%`);
  console.log(`  Analysis Confidence: ${(gammaResult.confidence * 100).toFixed(1)}%`);
  
  console.log('\n  Movement Impact Analysis:');
  console.log(`    Acceleration Potential: ${(gammaResult.movementImpact.accelerationPotential * 100).toFixed(1)}%`);
  console.log(`    Suppression Level: ${(gammaResult.movementImpact.suppressionLevel * 100).toFixed(1)}%`);
  console.log(`    Breakout Potential: ${(gammaResult.movementImpact.breakoutPotential * 100).toFixed(1)}%`);
  console.log(`    Pinning Risk: ${(gammaResult.movementImpact.pinningRisk * 100).toFixed(1)}%`);
  
  console.log('\n  Market Structure Impact:');
  console.log(`    Dealer Hedging Pressure: ${(gammaResult.marketStructureImpact.dealerHedgingPressure * 100).toFixed(1)}%`);
  console.log(`    Flow Amplification: ${gammaResult.marketStructureImpact.flowAmplification.toFixed(2)}x`);
  console.log(`    Liquidity Impact: ${(gammaResult.marketStructureImpact.liquidityImpact * 100).toFixed(1)}%`);
  console.log(`    Volatility Impact: ${(gammaResult.marketStructureImpact.volatilityImpact * 100).toFixed(1)}%`);
  
  console.log('\n  Volatility Effects:');
  console.log(`    Suppression Level: ${(gammaResult.volatilityEffects.suppressionLevel * 100).toFixed(1)}%`);
  console.log(`    Breakout Potential: ${(gammaResult.volatilityEffects.breakoutPotential * 100).toFixed(1)}%`);
  console.log(`    Expected Volatility: ${(gammaResult.volatilityEffects.expectedVolatility * 100).toFixed(1)}%`);
  console.log(`    Realized Volatility: ${(gammaResult.volatilityEffects.realizedVolatility * 100).toFixed(1)}%\n`);
}

/**
 * Demonstrate Complete Enhanced Confidence Calculation
 */
async function demonstrateCompleteEnhancedConfidence(
  signalEngine: EnhancedSignalWeightingEngine,
  ticker: string,
  priceData: PriceBar[],
  volumeData: VolumeBar[],
  multiTimeframeData: Map<string, PriceBar[]>,
  timeframe: string
) {
  // Create sample confidence factors
  const factors: ConfidenceFactors = {
    trendStrength: 0.8,
    volumeConfirmation: 0.75,
    supportResistance: 0.7,
    momentumAlignment: 0.85,
    volatilityEnvironment: 0.6,
    marketBreadth: 0.65,
    regimeAlignment: 0.8,
    sectorStrength: 0.7
  };

  const completeResult = await signalEngine.computeCompleteEnhancedConfidence(
    ticker,
    factors,
    priceData,
    volumeData,
    multiTimeframeData,
    timeframe
  );

  console.log('Complete Enhanced Confidence Calculation Results:');
  console.log(`  Final Confidence: ${(completeResult.confidence * 100).toFixed(1)}%`);
  console.log(`  Confidence Delta: ${(completeResult.confidenceDelta * 100).toFixed(1)}%`);
  console.log(`  Factor Confluence: ${(completeResult.factorConfluence * 100).toFixed(1)}%`);
  console.log(`  Signal Strength: ${(completeResult.signalStrength * 100).toFixed(1)}%`);
  console.log(`  Reliability Score: ${(completeResult.reliability * 100).toFixed(1)}%`);
  
  console.log('\n  Complete Factor Breakdown (Exact Weights):');
  console.log(`    Trend Composite (25%): ${(completeResult.breakdown.trendComposite * 100).toFixed(1)}%`);
  console.log(`    Momentum Divergence (20%): ${(completeResult.breakdown.momentumDivergence * 100).toFixed(1)}%`);
  console.log(`    Volume Profile (20%): ${(completeResult.breakdown.volumeProfile * 100).toFixed(1)}%`);
  console.log(`    Ribbon Alignment (15%): ${(completeResult.breakdown.ribbonAlignment * 100).toFixed(1)}%`);
  console.log(`    Fibonacci Confluence (10%): ${(completeResult.breakdown.fibonacciConfluence * 100).toFixed(1)}%`);
  console.log(`    Gamma Exposure (10%): ${(completeResult.breakdown.gammaExposure * 100).toFixed(1)}%`);
  
  // Verify total weight
  const totalWeight = 
    completeResult.breakdown.trendComposite +
    completeResult.breakdown.momentumDivergence +
    completeResult.breakdown.volumeProfile +
    completeResult.breakdown.ribbonAlignment +
    completeResult.breakdown.fibonacciConfluence +
    completeResult.breakdown.gammaExposure;
  
  console.log(`    Core Factors Total: ${(totalWeight * 100).toFixed(1)}%`);
  
  console.log('\n  Advanced Adjustments:');
  console.log(`    Fibonacci Zone Adjustment: ${completeResult.adjustments.fibonacciZoneAdjustment.toFixed(3)}x`);
  console.log(`    Gamma Exposure Adjustment: ${completeResult.adjustments.gammaExposureAdjustment.toFixed(3)}x`);
  console.log(`    Quality Adjustment: ${(completeResult.adjustments.qualityAdjustment * 100).toFixed(1)}%`);
  console.log(`    Reliability Adjustment: ${(completeResult.adjustments.reliabilityAdjustment * 100).toFixed(1)}%`);
  
  console.log('\n  Component Analysis Summary:');
  console.log(`    Volume Profile Score: ${(completeResult.componentAnalysis.volumeProfile.overallVolumeProfile * 100).toFixed(1)}%`);
  console.log(`    Ribbon Alignment Score: ${(completeResult.componentAnalysis.ribbonAlignment.overallRibbonAlignment * 100).toFixed(1)}%`);
  console.log(`    Fibonacci Confluence Score: ${(completeResult.componentAnalysis.fibonacciConfluence.confluenceScore * 100).toFixed(1)}%`);
  console.log(`    Gamma Exposure Score: ${(completeResult.componentAnalysis.gammaExposure.confidenceAdjustment * 100).toFixed(1)}%\n`);
}

/**
 * Validate factor weight distribution
 */
async function validateFactorWeights(
  signalEngine: EnhancedSignalWeightingEngine,
  ticker: string,
  priceData: PriceBar[],
  volumeData: VolumeBar[],
  multiTimeframeData: Map<string, PriceBar[]>,
  timeframe: string
) {
  const factors: ConfidenceFactors = {
    trendStrength: 1.0,
    volumeConfirmation: 1.0,
    supportResistance: 1.0,
    momentumAlignment: 1.0,
    volatilityEnvironment: 1.0,
    marketBreadth: 1.0,
    regimeAlignment: 1.0,
    sectorStrength: 1.0
  };

  const result = await signalEngine.computeCompleteEnhancedConfidence(
    ticker,
    factors,
    priceData,
    volumeData,
    multiTimeframeData,
    timeframe
  );

  console.log('Factor Weight Validation (All factors at 100%):');
  console.log('Expected vs Actual Weights:');
  console.log(`  Trend Composite: Expected 25%, Actual ${(result.breakdown.trendComposite * 100).toFixed(1)}%`);
  console.log(`  Momentum Divergence: Expected 20%, Actual ${(result.breakdown.momentumDivergence * 100).toFixed(1)}%`);
  console.log(`  Volume Profile: Expected 20%, Actual ${(result.breakdown.volumeProfile * 100).toFixed(1)}%`);
  console.log(`  Ribbon Alignment: Expected 15%, Actual ${(result.breakdown.ribbonAlignment * 100).toFixed(1)}%`);
  console.log(`  Fibonacci Confluence: Expected 10%, Actual ${(result.breakdown.fibonacciConfluence * 100).toFixed(1)}%`);
  console.log(`  Gamma Exposure: Expected 10%, Actual ${(result.breakdown.gammaExposure * 100).toFixed(1)}%`);
  
  const totalCoreWeight = 
    result.breakdown.trendComposite +
    result.breakdown.momentumDivergence +
    result.breakdown.volumeProfile +
    result.breakdown.ribbonAlignment +
    result.breakdown.fibonacciConfluence +
    result.breakdown.gammaExposure;
  
  console.log(`\n  Total Core Weight: ${(totalCoreWeight * 100).toFixed(1)}% (Expected: 100%)`);
  console.log(`  Weight Distribution Accuracy: ${totalCoreWeight >= 0.95 && totalCoreWeight <= 1.05 ? '✅ PASS' : '❌ FAIL'}\n`);
}

/**
 * Demonstrate zone-based adjustments
 */
async function demonstrateZoneAdjustments(
  signalEngine: EnhancedSignalWeightingEngine,
  ticker: string,
  timeframe: string
) {
  console.log('Zone-based Confidence Adjustments:');
  
  // Test different Fibonacci zones
  const zones = ['COMPRESSION', 'MID_EXPANSION', 'FULL_EXPANSION', 'OVER_EXTENSION', 'EXHAUSTION'];
  
  for (const zone of zones) {
    // This would normally come from actual analysis, but we'll simulate for demo
    console.log(`  ${zone} Zone:`);
    
    // Get zone multiplier from Fibonacci engine
    const fibEngine = signalEngine.getFibExpansionEngine();
    const zoneMultiplier = fibEngine.calculateZoneMultiplier(zone as any);
    
    console.log(`    Zone Multiplier: ${zoneMultiplier.toFixed(2)}x`);
    console.log(`    Confidence Impact: ${zoneMultiplier > 1 ? 'Positive' : zoneMultiplier < 1 ? 'Negative' : 'Neutral'}`);
    
    if (zone === 'COMPRESSION') {
      console.log(`    Implication: Favorable for new positions`);
    } else if (zone === 'EXHAUSTION') {
      console.log(`    Implication: Avoid new positions`);
    } else {
      console.log(`    Implication: Standard position sizing`);
    }
    console.log('');
  }
  
  // Test different Gamma exposure levels
  console.log('Gamma Exposure Adjustments:');
  const gammaLevels = [
    { level: -3000000, description: 'High Negative Gamma' },
    { level: -1000000, description: 'Moderate Negative Gamma' },
    { level: 0, description: 'Neutral Gamma' },
    { level: 1000000, description: 'Moderate Positive Gamma' },
    { level: 3000000, description: 'High Positive Gamma' }
  ];
  
  for (const gamma of gammaLevels) {
    console.log(`  ${gamma.description} (${gamma.level.toLocaleString()}):`);
    
    let adjustment = 1.0;
    if (gamma.level < -2000000) adjustment = 1.2;
    else if (gamma.level < -500000) adjustment = 1.1;
    else if (gamma.level > 2000000) adjustment = 0.8;
    else if (gamma.level > 500000) adjustment = 0.9;
    
    console.log(`    Confidence Adjustment: ${adjustment.toFixed(2)}x`);
    console.log(`    Impact: ${adjustment > 1 ? 'Boost (Acceleration potential)' : adjustment < 1 ? 'Reduce (Suppression risk)' : 'Neutral'}`);
    console.log('');
  }
}

/**
 * Generate sample market data for testing
 */
function generateSampleMarketData(ticker: string) {
  const priceData: PriceBar[] = [];
  const volumeData: VolumeBar[] = [];
  const multiTimeframeData = new Map<string, PriceBar[]>();
  
  // Generate 100 bars of sample data
  let currentPrice = 420; // SPY around $420
  const baseVolume = 50000000; // 50M volume base
  
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000); // Daily bars
    
    // Generate realistic price movement with some trend
    const volatility = 0.015; // 1.5% daily volatility
    const trend = 0.0005; // Slight upward trend
    const randomMove = (Math.random() - 0.5) * volatility * currentPrice;
    const trendMove = trend * currentPrice;
    
    const open = currentPrice;
    const close = currentPrice + randomMove + trendMove;
    const high = Math.max(open, close) + Math.random() * 0.003 * currentPrice;
    const low = Math.min(open, close) - Math.random() * 0.003 * currentPrice;
    
    currentPrice = close;
    
    const priceBar: PriceBar = {
      timestamp,
      open,
      high,
      low,
      close
    };
    
    // Generate volume with correlation to price movement
    const priceChange = Math.abs(close - open);
    const volumeMultiplier = 1 + (priceChange / open) * 5; // Higher volume on bigger moves
    const volume = Math.floor(baseVolume * volumeMultiplier * (0.7 + Math.random() * 0.6));
    
    const volumeBar: VolumeBar = {
      timestamp,
      volume,
      buyVolume: Math.floor(volume * (close > open ? 0.55 : 0.45)),
      sellVolume: Math.floor(volume * (close > open ? 0.45 : 0.55))
    };
    
    priceData.push(priceBar);
    volumeData.push(volumeBar);
  }
  
  // Create multi-timeframe data (simplified - same data for different timeframes)
  multiTimeframeData.set('1D', priceData);
  multiTimeframeData.set('4H', priceData.filter((_, i) => i % 6 === 0)); // Every 6th bar for 4H
  multiTimeframeData.set('1H', priceData.filter((_, i) => i % 24 === 0)); // Every 24th bar for 1H
  multiTimeframeData.set('15m', priceData.filter((_, i) => i % 96 === 0)); // Every 96th bar for 15m
  
  return { priceData, volumeData, multiTimeframeData };
}

// Example of integration with existing systems
export class FibonacciGammaIntegration {
  private signalEngine: EnhancedSignalWeightingEngine;
  
  constructor() {
    this.signalEngine = new EnhancedSignalWeightingEngine();
    this.signalEngine.enablePaperTradingIntegration();
    this.setupIntegration();
  }
  
  private setupIntegration() {
    // Integration with Fibonacci analysis
    this.signalEngine.eventBus.on('fibonacci:confluence:calculated', (data) => {
      if (data.result.currentZone === 'COMPRESSION' && data.result.confluenceScore > 0.7) {
        console.log(`🎯 High-probability setup: ${data.ticker} in compression zone with strong confluence`);
      }
      
      if (data.result.currentZone === 'EXHAUSTION') {
        console.log(`⚠️ Risk warning: ${data.ticker} in exhaustion zone - avoid new positions`);
      }
    });
    
    // Integration with Gamma exposure
    this.signalEngine.eventBus.on('gamma:exposure:assessed', (data) => {
      if (data.result.netGammaExposure < -2000000) {
        console.log(`🚀 Acceleration potential: ${data.ticker} has high negative gamma exposure`);
      }
      
      if (data.result.movementImpact.pinningRisk > 0.8) {
        console.log(`📌 Pinning risk: ${data.ticker} has high pinning risk near expiration`);
      }
    });
    
    // Integration with complete enhanced confidence
    this.signalEngine.eventBus.on('confidence:complete:enhanced', (data) => {
      if (data.result.confidence > 0.85 && data.result.factorConfluence > 0.8) {
        console.log(`⭐ Exceptional signal: ${data.ticker} shows high confidence with strong factor confluence`);
      }
    });
  }
  
  public async analyzeCompleteSignal(
    ticker: string,
    priceData: PriceBar[],
    volumeData: VolumeBar[],
    multiTimeframeData: Map<string, PriceBar[]>,
    timeframe: string = '1D'
  ) {
    const factors: ConfidenceFactors = {
      trendStrength: 0.8,
      volumeConfirmation: 0.75,
      supportResistance: 0.7,
      momentumAlignment: 0.85,
      volatilityEnvironment: 0.6,
      marketBreadth: 0.65,
      regimeAlignment: 0.8,
      sectorStrength: 0.7
    };

    return await this.signalEngine.computeCompleteEnhancedConfidence(
      ticker,
      factors,
      priceData,
      volumeData,
      multiTimeframeData,
      timeframe
    );
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateFibonacciGammaIntegration().catch(console.error);
}

export { 
  demonstrateFibonacciGammaIntegration, 
  FibonacciGammaIntegration 
};