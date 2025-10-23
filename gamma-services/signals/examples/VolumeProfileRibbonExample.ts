import { EnhancedSignalWeightingEngine, ConfidenceFactors } from '../EnhancedSignalWeightingEngine';
import { VolumeProfileAnalyzer, PriceBar, VolumeBar } from '../VolumeProfileAnalyzer';
import { RibbonAlignmentAnalyzer } from '../RibbonAlignmentAnalyzer';
import { EventBus } from '../../core/EventBus';

/**
 * Example demonstrating Volume Profile and Ribbon Alignment Analysis
 * 
 * This example shows:
 * 1. Volume Profile Analysis (20% weight in signal confidence)
 * 2. Ribbon Alignment Analysis (15% weight in signal confidence)
 * 3. Integration with Enhanced Signal Weighting Engine
 * 4. Multi-timeframe analysis and institutional flow detection
 * 5. Complete signal confidence calculation with new factors
 */

async function demonstrateVolumeProfileAndRibbonAlignment() {
  console.log('=== Volume Profile and Ribbon Alignment Analysis Demo ===\n');

  // 1. Initialize components
  const eventBus = new EventBus();
  const signalEngine = new EnhancedSignalWeightingEngine();
  
  // Enable integration for event emission
  signalEngine.enablePaperTradingIntegration();
  
  console.log('✅ Initialized Enhanced Signal Weighting Engine with Volume Profile and Ribbon Alignment\n');

  // 2. Set up event listeners to monitor analysis
  setupEventListeners(eventBus, signalEngine);

  // 3. Generate sample market data
  const ticker = 'SPY';
  const { priceData, volumeData, multiTimeframeData } = generateSampleMarketData(ticker);
  
  console.log(`📊 Generated sample market data for ${ticker}:`);
  console.log(`   Price bars: ${priceData.length}`);
  console.log(`   Volume bars: ${volumeData.length}`);
  console.log(`   Timeframes: ${Array.from(multiTimeframeData.keys()).join(', ')}\n`);

  // 4. Demonstrate Volume Profile Analysis
  console.log('🔍 Analyzing Volume Profile...\n');
  await demonstrateVolumeProfileAnalysis(signalEngine, ticker, priceData, volumeData);

  // 5. Demonstrate Ribbon Alignment Analysis
  console.log('📈 Analyzing Ribbon Alignment...\n');
  await demonstrateRibbonAlignmentAnalysis(signalEngine, ticker, multiTimeframeData);

  // 6. Demonstrate Enhanced Confidence Calculation
  console.log('⚡ Computing Enhanced Signal Confidence...\n');
  await demonstrateEnhancedConfidenceCalculation(
    signalEngine, 
    ticker, 
    priceData, 
    volumeData, 
    multiTimeframeData
  );

  // 7. Show comparative analysis
  console.log('📊 Comparative Analysis: Before vs After Enhancement\n');
  await demonstrateComparativeAnalysis(signalEngine, ticker, priceData, volumeData, multiTimeframeData);

  console.log('✅ Volume Profile and Ribbon Alignment demo completed\n');
}

/**
 * Set up event listeners to monitor analysis events
 */
function setupEventListeners(eventBus: EventBus, signalEngine: EnhancedSignalWeightingEngine) {
  // Volume profile events
  eventBus.on('volume:profile:analyzed', (data) => {
    console.log(`📊 Volume Profile Analysis Complete for ${data.ticker}:`);
    console.log(`   Overall Score: ${(data.result.overallVolumeProfile * 100).toFixed(1)}%`);
    console.log(`   Institutional Score: ${(data.result.institutionalScore * 100).toFixed(1)}%`);
    console.log(`   Volume Confirmation: ${(data.result.confirmationScore * 100).toFixed(1)}%`);
    console.log(`   Analysis Confidence: ${(data.result.confidence * 100).toFixed(1)}%\n`);
  });

  // Ribbon alignment events
  eventBus.on('ribbon:alignment:analyzed', (data) => {
    console.log(`📈 Ribbon Alignment Analysis Complete for ${data.ticker}:`);
    console.log(`   Overall Alignment: ${(data.result.overallRibbonAlignment * 100).toFixed(1)}%`);
    console.log(`   Short-term: ${(data.result.shortTermAlignment * 100).toFixed(1)}%`);
    console.log(`   Medium-term: ${(data.result.mediumTermAlignment * 100).toFixed(1)}%`);
    console.log(`   Long-term: ${(data.result.longTermAlignment * 100).toFixed(1)}%`);
    console.log(`   Dominant Timeframe: ${data.result.supportingData.dominantTimeframe}`);
    console.log(`   Analysis Confidence: ${(data.result.confidence * 100).toFixed(1)}%\n`);
  });

  // Enhanced confidence events
  eventBus.on('confidence:enhanced', (data) => {
    console.log(`⚡ Enhanced Confidence Calculated for ${data.ticker}:`);
    console.log(`   Final Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    console.log(`   Confidence Delta: ${(data.confidenceDelta * 100).toFixed(1)}%`);
    console.log(`   Reliability: ${(data.reliability * 100).toFixed(1)}%\n`);
    
    console.log('   Factor Breakdown:');
    console.log(`     Trend Composite (25%): ${(data.breakdown.trendComposite * 100).toFixed(1)}%`);
    console.log(`     Momentum Divergence (20%): ${(data.breakdown.momentumDivergence * 100).toFixed(1)}%`);
    console.log(`     Volume Profile (20%): ${(data.breakdown.volumeProfile * 100).toFixed(1)}%`);
    console.log(`     Ribbon Alignment (15%): ${(data.breakdown.ribbonAlignment * 100).toFixed(1)}%`);
    console.log(`     Fibonacci Confluence (10%): ${(data.breakdown.fibConfluence * 100).toFixed(1)}%`);
    console.log(`     Gamma Exposure (10%): ${(data.breakdown.gammaExposure * 100).toFixed(1)}%\n`);
  });
}

/**
 * Demonstrate Volume Profile Analysis
 */
async function demonstrateVolumeProfileAnalysis(
  signalEngine: EnhancedSignalWeightingEngine,
  ticker: string,
  priceData: PriceBar[],
  volumeData: VolumeBar[]
) {
  // Create sample institutional data
  const institutionalData = {
    netFlow: 1500000,
    buyVolume: 2000000,
    sellVolume: 500000,
    retailFlow: 800000,
    darkPoolVolume: 300000,
    blockTradeVolume: 1200000,
    dataQuality: 0.85
  };

  const volumeResult = await signalEngine.assessVolumeProfile(
    ticker,
    priceData,
    volumeData,
    institutionalData
  );

  console.log('Volume Profile Analysis Results:');
  console.log(`  Volume Score: ${(volumeResult.volumeScore * 100).toFixed(1)}%`);
  console.log(`  Institutional Score: ${(volumeResult.institutionalScore * 100).toFixed(1)}%`);
  console.log(`  Pattern Score: ${(volumeResult.patternScore * 100).toFixed(1)}%`);
  console.log(`  Confirmation Score: ${(volumeResult.confirmationScore * 100).toFixed(1)}%`);
  console.log(`  Overall Volume Profile: ${(volumeResult.overallVolumeProfile * 100).toFixed(1)}%`);
  
  console.log('\n  Supporting Data:');
  console.log(`    Total Volume: ${volumeResult.supportingData.totalVolume.toLocaleString()}`);
  console.log(`    Volume Ratio: ${volumeResult.supportingData.volumeRatio.toFixed(2)}x`);
  console.log(`    Volume Profile Levels: ${volumeResult.supportingData.volumeProfile.length}`);
  console.log(`    Volume Patterns: ${volumeResult.supportingData.volumePatterns.length}`);
  console.log(`    Net Institutional Flow: $${volumeResult.supportingData.institutionalFlow.netInstitutionalFlow.toLocaleString()}`);
  console.log(`    Price-Volume Correlation: ${volumeResult.supportingData.volumePriceRelationship.priceVolumeCorrelation.toFixed(3)}\n`);
}

/**
 * Demonstrate Ribbon Alignment Analysis
 */
async function demonstrateRibbonAlignmentAnalysis(
  signalEngine: EnhancedSignalWeightingEngine,
  ticker: string,
  multiTimeframeData: Map<string, PriceBar[]>
) {
  const ribbonResult = await signalEngine.measureRibbonAlignment(ticker, multiTimeframeData);

  console.log('Ribbon Alignment Analysis Results:');
  console.log(`  Short-term Alignment: ${(ribbonResult.shortTermAlignment * 100).toFixed(1)}%`);
  console.log(`  Medium-term Alignment: ${(ribbonResult.mediumTermAlignment * 100).toFixed(1)}%`);
  console.log(`  Long-term Alignment: ${(ribbonResult.longTermAlignment * 100).toFixed(1)}%`);
  console.log(`  Multi-timeframe Alignment: ${(ribbonResult.multiTimeframeAlignment * 100).toFixed(1)}%`);
  console.log(`  Overall Ribbon Alignment: ${(ribbonResult.overallRibbonAlignment * 100).toFixed(1)}%`);
  
  console.log('\n  Supporting Data:');
  console.log(`    Timeframes Analyzed: ${ribbonResult.supportingData.timeframeAlignments.size}`);
  console.log(`    Cross-timeframe Consensus: ${(ribbonResult.supportingData.crossTimeframeConsensus * 100).toFixed(1)}%`);
  console.log(`    Dominant Timeframe: ${ribbonResult.supportingData.dominantTimeframe}`);
  console.log(`    Alignment Trend: ${ribbonResult.supportingData.alignmentTrend}`);
  console.log(`    Support/Resistance Levels: ${ribbonResult.supportingData.supportResistanceLevels.length}`);
  
  // Show timeframe-specific alignments
  console.log('\n  Timeframe-specific Alignments:');
  for (const [timeframe, alignment] of ribbonResult.supportingData.timeframeAlignments) {
    console.log(`    ${timeframe}: ${(alignment.overallAlignment * 100).toFixed(1)}% (${alignment.ribbonDirection})`);
  }
  console.log('');
}

/**
 * Demonstrate Enhanced Confidence Calculation
 */
async function demonstrateEnhancedConfidenceCalculation(
  signalEngine: EnhancedSignalWeightingEngine,
  ticker: string,
  priceData: PriceBar[],
  volumeData: VolumeBar[],
  multiTimeframeData: Map<string, PriceBar[]>
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

  const enhancedResult = await signalEngine.computeEnhancedConfidenceWithVolumeAndRibbon(
    ticker,
    factors,
    priceData,
    volumeData,
    multiTimeframeData
  );

  console.log('Enhanced Confidence Calculation Results:');
  console.log(`  Final Confidence: ${(enhancedResult.confidence * 100).toFixed(1)}%`);
  console.log(`  Confidence Delta: ${(enhancedResult.confidenceDelta * 100).toFixed(1)}%`);
  console.log(`  Reliability Score: ${(enhancedResult.reliability * 100).toFixed(1)}%`);
  
  console.log('\n  Detailed Factor Breakdown:');
  console.log(`    Trend Composite (25%): ${(enhancedResult.breakdown.trendComposite * 100).toFixed(1)}%`);
  console.log(`    Momentum Divergence (20%): ${(enhancedResult.breakdown.momentumDivergence * 100).toFixed(1)}%`);
  console.log(`    Volume Profile (20%): ${(enhancedResult.breakdown.volumeProfile * 100).toFixed(1)}%`);
  console.log(`    Ribbon Alignment (15%): ${(enhancedResult.breakdown.ribbonAlignment * 100).toFixed(1)}%`);
  console.log(`    Fibonacci Confluence (10%): ${(enhancedResult.breakdown.fibConfluence * 100).toFixed(1)}%`);
  console.log(`    Gamma Exposure (10%): ${(enhancedResult.breakdown.gammaExposure * 100).toFixed(1)}%`);
  
  // Calculate total contribution
  const totalContribution = Object.values(enhancedResult.breakdown).reduce((sum, val) => sum + val, 0);
  console.log(`    Total Contribution: ${(totalContribution * 100).toFixed(1)}%\n`);
}

/**
 * Demonstrate comparative analysis
 */
async function demonstrateComparativeAnalysis(
  signalEngine: EnhancedSignalWeightingEngine,
  ticker: string,
  priceData: PriceBar[],
  volumeData: VolumeBar[],
  multiTimeframeData: Map<string, PriceBar[]>
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

  // Basic confidence calculation (without volume profile and ribbon alignment)
  const basicResult = signalEngine.computeTickerConfidence(ticker, factors);
  
  // Enhanced confidence calculation (with volume profile and ribbon alignment)
  const enhancedResult = await signalEngine.computeEnhancedConfidenceWithVolumeAndRibbon(
    ticker,
    factors,
    priceData,
    volumeData,
    multiTimeframeData
  );

  console.log('Comparative Analysis: Basic vs Enhanced Confidence');
  console.log(`  Basic Confidence: ${(basicResult.confidence * 100).toFixed(1)}%`);
  console.log(`  Enhanced Confidence: ${(enhancedResult.confidence * 100).toFixed(1)}%`);
  console.log(`  Improvement: ${((enhancedResult.confidence - basicResult.confidence) * 100).toFixed(1)}%`);
  
  console.log('\n  Factor Contributions:');
  console.log('    Basic Breakdown:');
  Object.entries(basicResult.breakdown).forEach(([factor, value]) => {
    console.log(`      ${factor}: ${(value * 100).toFixed(1)}%`);
  });
  
  console.log('    Enhanced Breakdown:');
  Object.entries(enhancedResult.breakdown).forEach(([factor, value]) => {
    console.log(`      ${factor}: ${(value * 100).toFixed(1)}%`);
  });
  
  console.log('\n  New Factor Analysis:');
  console.log(`    Volume Profile Impact: ${(enhancedResult.breakdown.volumeProfile * 100).toFixed(1)}%`);
  console.log(`    Ribbon Alignment Impact: ${(enhancedResult.breakdown.ribbonAlignment * 100).toFixed(1)}%`);
  console.log(`    Combined New Factor Impact: ${((enhancedResult.breakdown.volumeProfile + enhancedResult.breakdown.ribbonAlignment) * 100).toFixed(1)}%`);
  
  // Analysis quality comparison
  console.log('\n  Analysis Quality:');
  console.log(`    Volume Profile Confidence: ${(enhancedResult.volumeProfile.confidence * 100).toFixed(1)}%`);
  console.log(`    Ribbon Alignment Confidence: ${(enhancedResult.ribbonAlignment.confidence * 100).toFixed(1)}%`);
  console.log(`    Overall Enhancement Quality: ${(((enhancedResult.volumeProfile.confidence + enhancedResult.ribbonAlignment.confidence) / 2) * 100).toFixed(1)}%\n`);
}

/**
 * Generate sample market data for testing
 */
function generateSampleMarketData(ticker: string) {
  const priceData: PriceBar[] = [];
  const volumeData: VolumeBar[] = [];
  const multiTimeframeData = new Map<string, PriceBar[]>();
  
  // Generate 100 bars of sample data
  let currentPrice = 400;
  const baseVolume = 1000000;
  
  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(Date.now() - (100 - i) * 60000); // 1-minute bars
    
    // Generate realistic price movement
    const volatility = 0.02;
    const trend = 0.001; // Slight upward trend
    const randomMove = (Math.random() - 0.5) * volatility * currentPrice;
    const trendMove = trend * currentPrice;
    
    const open = currentPrice;
    const close = currentPrice + randomMove + trendMove;
    const high = Math.max(open, close) + Math.random() * 0.005 * currentPrice;
    const low = Math.min(open, close) - Math.random() * 0.005 * currentPrice;
    
    currentPrice = close;
    
    const priceBar: PriceBar = {
      timestamp,
      open,
      high,
      low,
      close
    };
    
    // Generate volume with some correlation to price movement
    const priceChange = Math.abs(close - open);
    const volumeMultiplier = 1 + (priceChange / open) * 10; // Higher volume on bigger moves
    const volume = Math.floor(baseVolume * volumeMultiplier * (0.5 + Math.random()));
    
    const volumeBar: VolumeBar = {
      timestamp,
      volume,
      buyVolume: Math.floor(volume * (close > open ? 0.6 : 0.4)),
      sellVolume: Math.floor(volume * (close > open ? 0.4 : 0.6))
    };
    
    priceData.push(priceBar);
    volumeData.push(volumeBar);
  }
  
  // Create multi-timeframe data (simplified - same data for different timeframes)
  multiTimeframeData.set('1m', priceData);
  multiTimeframeData.set('5m', priceData.filter((_, i) => i % 5 === 0));
  multiTimeframeData.set('15m', priceData.filter((_, i) => i % 15 === 0));
  multiTimeframeData.set('1h', priceData.filter((_, i) => i % 60 === 0));
  multiTimeframeData.set('4h', priceData.filter((_, i) => i % 240 === 0));
  multiTimeframeData.set('1d', priceData.filter((_, i) => i % 1440 === 0));
  
  return { priceData, volumeData, multiTimeframeData };
}

// Example of integration with existing systems
export class VolumeProfileRibbonIntegration {
  private signalEngine: EnhancedSignalWeightingEngine;
  
  constructor() {
    this.signalEngine = new EnhancedSignalWeightingEngine();
    this.signalEngine.enablePaperTradingIntegration();
    this.setupIntegration();
  }
  
  private setupIntegration() {
    // Integration with signal processing
    this.signalEngine.getVolumeProfileAnalyzer().eventBus.on('volume:profile:analyzed', (data) => {
      if (data.result.overallVolumeProfile > 0.8) {
        console.log(`🚀 High volume profile score for ${data.ticker} - consider increasing position size`);
      }
    });
    
    // Integration with ribbon alignment
    this.signalEngine.getRibbonAlignmentAnalyzer().eventBus.on('ribbon:alignment:analyzed', (data) => {
      if (data.result.overallRibbonAlignment > 0.8) {
        console.log(`📈 Strong ribbon alignment for ${data.ticker} - trend confirmation`);
      }
    });
    
    // Integration with enhanced confidence
    this.signalEngine.eventBus.on('confidence:enhanced', (data) => {
      if (data.confidence > 0.85) {
        console.log(`⚡ High confidence signal for ${data.ticker} - ready for trade execution`);
      }
    });
  }
  
  public async analyzeSignal(
    ticker: string,
    priceData: PriceBar[],
    volumeData: VolumeBar[],
    multiTimeframeData: Map<string, PriceBar[]>
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

    return await this.signalEngine.computeEnhancedConfidenceWithVolumeAndRibbon(
      ticker,
      factors,
      priceData,
      volumeData,
      multiTimeframeData
    );
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateVolumeProfileAndRibbonAlignment().catch(console.error);
}

export { 
  demonstrateVolumeProfileAndRibbonAlignment, 
  VolumeProfileRibbonIntegration 
};