// Signal Weighting Engine Demo
// Demonstrates multi-factor confidence scoring with Fibonacci and Gamma integration

import { 
  SignalWeightingEngine,
  SignalFactors,
  FibonacciAnalysis,
  GammaAnalysis,
  FibZone
} from '../index.js';

/**
 * Comprehensive signal weighting demonstration
 */
async function signalWeightingDemo() {
  console.log('📊 Signal Weighting Engine Demo');
  console.log('================================');

  const engine = new SignalWeightingEngine();

  // Test different signal scenarios
  await testHighConfidenceSignal(engine);
  await testMediumConfidenceSignal(engine);
  await testLowConfidenceSignal(engine);
  await testConflictingSignals(engine);
  await testFibonacciIntegration(engine);
  await testGammaIntegration(engine);
  await testWeightAdjustment(engine);
  await testSignalValidation(engine);
}

/**
 * Test high confidence signal scenario
 */
async function testHighConfidenceSignal(engine: SignalWeightingEngine) {
  console.log('\n🚀 High Confidence Signal Test');
  console.log('------------------------------');

  const factors: SignalFactors = {
    ticker: 'AAPL',
    trendComposite: 0.85,        // Strong uptrend
    momentumDivergence: 0.78,    // Good momentum
    volumeProfile: 0.82,         // Strong volume
    ribbonAlignment: 0.75,       // Good alignment
    fibConfluence: 0.65,         // Decent fib support
    gammaExposure: -0.3,         // Negative gamma (good for trends)
    timestamp: new Date()
  };

  const fibAnalysis: FibonacciAnalysis = {
    currentZone: 'COMPRESSION',
    expansionLevel: 0.4,
    keyLevels: { support: [180, 175], resistance: [185, 190], targets: [195, 200] },
    confluence: 0.7,
    zoneMultiplier: 1.2,         // Compression bonus
    riskAdjustment: 0.03
  };

  const gammaAnalysis: GammaAnalysis = {
    netGammaExposure: -0.3,
    gammaFlip: 182.5,
    volSuppressionLevel: -0.4,
    accelerationZones: [180, 185],
    pinningRisk: 0.1,
    confidenceAdjustment: 0.05   // Positive adjustment for negative gamma
  };

  const result = engine.computeEnhancedConfidence(factors, fibAnalysis, gammaAnalysis);

  console.log('High Confidence Result:', {
    confidence: result.confidence,
    conviction: result.conviction,
    breakdown: {
      trend: result.breakdown.trendWeight.toFixed(3),
      momentum: result.breakdown.momentumWeight.toFixed(3),
      volume: result.breakdown.volumeWeight.toFixed(3),
      ribbon: result.breakdown.ribbonWeight.toFixed(3),
      fib: result.breakdown.fibWeight.toFixed(3),
      gamma: result.breakdown.gammaWeight.toFixed(3)
    }
  });

  // Validate the signal
  const validation = engine.validateSignalFactors(factors);
  console.log('Signal Validation:', {
    isValid: validation.isValid,
    quality: validation.quality.toFixed(3),
    warnings: validation.warnings.length
  });
}

/**
 * Test medium confidence signal scenario
 */
async function testMediumConfidenceSignal(engine: SignalWeightingEngine) {
  console.log('\n📈 Medium Confidence Signal Test');
  console.log('--------------------------------');

  const factors: SignalFactors = {
    ticker: 'SPY',
    trendComposite: 0.62,        // Moderate uptrend
    momentumDivergence: 0.58,    // Moderate momentum
    volumeProfile: 0.55,         // Average volume
    ribbonAlignment: 0.60,       // Moderate alignment
    fibConfluence: 0.45,         // Weak fib support
    gammaExposure: 0.1,          // Slight positive gamma
    timestamp: new Date()
  };

  const fibAnalysis: FibonacciAnalysis = {
    currentZone: 'MID_EXPANSION',
    expansionLevel: 1.0,
    keyLevels: { support: [420, 415], resistance: [425, 430], targets: [435, 440] },
    confluence: 0.5,
    zoneMultiplier: 1.0,         // Neutral zone
    riskAdjustment: 0.0
  };

  const result = engine.computeEnhancedConfidence(factors, fibAnalysis);

  console.log('Medium Confidence Result:', {
    confidence: result.confidence,
    conviction: result.conviction,
    expectedRange: 'Should be moderate (0.5-0.7)'
  });
}

/**
 * Test low confidence signal scenario
 */
async function testLowConfidenceSignal(engine: SignalWeightingEngine) {
  console.log('\n📉 Low Confidence Signal Test');
  console.log('-----------------------------');

  const factors: SignalFactors = {
    ticker: 'TSLA',
    trendComposite: 0.35,        // Weak trend
    momentumDivergence: 0.42,    // Mixed momentum
    volumeProfile: 0.38,         // Low volume
    ribbonAlignment: 0.25,       // Poor alignment
    fibConfluence: 0.30,         // Weak fib support
    gammaExposure: 0.4,          // High positive gamma (pinning risk)
    timestamp: new Date()
  };

  const fibAnalysis: FibonacciAnalysis = {
    currentZone: 'EXHAUSTION',
    expansionLevel: 2.8,
    keyLevels: { support: [200, 195], resistance: [220, 225], targets: [230, 235] },
    confluence: 0.2,
    zoneMultiplier: 0.0,         // Exhaustion penalty
    riskAdjustment: -0.1
  };

  const gammaAnalysis: GammaAnalysis = {
    netGammaExposure: 0.4,
    gammaFlip: 210,
    volSuppressionLevel: 0.6,
    accelerationZones: [],
    pinningRisk: 0.8,
    confidenceAdjustment: -0.08  // Negative adjustment for high pinning risk
  };

  const result = engine.computeEnhancedConfidence(factors, fibAnalysis, gammaAnalysis);

  console.log('Low Confidence Result:', {
    confidence: result.confidence,
    conviction: result.conviction,
    expectedRange: 'Should be low (0.0-0.4)',
    note: 'Exhaustion zone and high gamma exposure should significantly reduce confidence'
  });
}

/**
 * Test conflicting signals scenario
 */
async function testConflictingSignals(engine: SignalWeightingEngine) {
  console.log('\n⚡ Conflicting Signals Test');
  console.log('---------------------------');

  const factors: SignalFactors = {
    ticker: 'QQQ',
    trendComposite: 0.80,        // Strong trend (bullish)
    momentumDivergence: 0.25,    // Weak momentum (bearish divergence)
    volumeProfile: 0.70,         // Good volume (bullish)
    ribbonAlignment: 0.30,       // Poor alignment (bearish)
    fibConfluence: 0.60,         // Good fib support (bullish)
    gammaExposure: -0.2,         // Negative gamma (bullish for trends)
    timestamp: new Date()
  };

  const result = engine.computeEnhancedConfidence(factors);

  console.log('Conflicting Signals Result:', {
    confidence: result.confidence,
    conviction: result.conviction,
    note: 'Mixed signals should result in moderate confidence with lower conviction'
  });

  // Show individual factor contributions
  console.log('Factor Breakdown:', {
    trend: `${factors.trendComposite} → ${result.breakdown.trendWeight.toFixed(3)}`,
    momentum: `${factors.momentumDivergence} → ${result.breakdown.momentumWeight.toFixed(3)}`,
    volume: `${factors.volumeProfile} → ${result.breakdown.volumeWeight.toFixed(3)}`,
    ribbon: `${factors.ribbonAlignment} → ${result.breakdown.ribbonWeight.toFixed(3)}`
  });
}

/**
 * Test Fibonacci integration effects
 */
async function testFibonacciIntegration(engine: SignalWeightingEngine) {
  console.log('\n📐 Fibonacci Integration Test');
  console.log('-----------------------------');

  const baseFactor: SignalFactors = {
    ticker: 'NVDA',
    trendComposite: 0.70,
    momentumDivergence: 0.65,
    volumeProfile: 0.60,
    ribbonAlignment: 0.55,
    fibConfluence: 0.50,
    gammaExposure: 0.0,
    timestamp: new Date()
  };

  // Test different Fibonacci zones
  const fibZones: { zone: FibZone; multiplier: number }[] = [
    { zone: 'COMPRESSION', multiplier: 1.2 },
    { zone: 'MID_EXPANSION', multiplier: 1.0 },
    { zone: 'FULL_EXPANSION', multiplier: 0.8 },
    { zone: 'OVER_EXTENSION', multiplier: 0.5 },
    { zone: 'EXHAUSTION', multiplier: 0.0 }
  ];

  console.log('Fibonacci Zone Effects:');
  
  for (const { zone, multiplier } of fibZones) {
    const fibAnalysis: FibonacciAnalysis = {
      currentZone: zone,
      expansionLevel: 1.0,
      keyLevels: { support: [], resistance: [], targets: [] },
      confluence: 0.5,
      zoneMultiplier: multiplier,
      riskAdjustment: 0.0
    };

    const result = engine.computeEnhancedConfidence(baseFactor, fibAnalysis);
    
    console.log(`  ${zone}: ${result.confidence.toFixed(3)} (${multiplier}x multiplier)`);
  }
}

/**
 * Test Gamma exposure integration
 */
async function testGammaIntegration(engine: SignalWeightingEngine) {
  console.log('\n⚛️ Gamma Integration Test');
  console.log('-------------------------');

  const baseFactor: SignalFactors = {
    ticker: 'META',
    trendComposite: 0.65,
    momentumDivergence: 0.60,
    volumeProfile: 0.55,
    ribbonAlignment: 0.50,
    fibConfluence: 0.45,
    gammaExposure: 0.0,
    timestamp: new Date()
  };

  // Test different gamma scenarios
  const gammaScenarios = [
    { name: 'High Negative Gamma (Trend Acceleration)', exposure: -0.5, adjustment: 0.1 },
    { name: 'Moderate Negative Gamma', exposure: -0.2, adjustment: 0.05 },
    { name: 'Neutral Gamma', exposure: 0.0, adjustment: 0.0 },
    { name: 'Moderate Positive Gamma (Pinning Risk)', exposure: 0.2, adjustment: -0.03 },
    { name: 'High Positive Gamma (Strong Pinning)', exposure: 0.5, adjustment: -0.08 }
  ];

  console.log('Gamma Exposure Effects:');
  
  for (const scenario of gammaScenarios) {
    const gammaAnalysis: GammaAnalysis = {
      netGammaExposure: scenario.exposure,
      gammaFlip: 300,
      volSuppressionLevel: scenario.exposure > 0 ? 0.5 : -0.3,
      accelerationZones: scenario.exposure < 0 ? [295, 305] : [],
      pinningRisk: Math.abs(scenario.exposure),
      confidenceAdjustment: scenario.adjustment
    };

    const result = engine.computeEnhancedConfidence(baseFactor, undefined, gammaAnalysis);
    
    console.log(`  ${scenario.name}: ${result.confidence.toFixed(3)} (${scenario.adjustment >= 0 ? '+' : ''}${scenario.adjustment})`);
  }
}

/**
 * Test dynamic weight adjustment
 */
async function testWeightAdjustment(engine: SignalWeightingEngine) {
  console.log('\n⚖️ Weight Adjustment Test');
  console.log('-------------------------');

  const factors: SignalFactors = {
    ticker: 'AMZN',
    trendComposite: 0.75,
    momentumDivergence: 0.70,
    volumeProfile: 0.65,
    ribbonAlignment: 0.60,
    fibConfluence: 0.55,
    gammaExposure: -0.1,
    timestamp: new Date()
  };

  // Test with default weights
  console.log('Current weights:', engine.getWeights());
  const defaultResult = engine.computeEnhancedConfidence(factors);
  console.log('Default weights result:', defaultResult.confidence.toFixed(3));

  // Test with trend-focused weights
  engine.updateWeights({
    trendComposite: 0.40,      // Increased from 0.25
    momentumDivergence: 0.30,  // Increased from 0.20
    volumeProfile: 0.15,       // Decreased from 0.20
    ribbonAlignment: 0.10,     // Decreased from 0.15
    fibConfluence: 0.03,       // Decreased from 0.10
    gammaExposure: 0.02        // Decreased from 0.10
  });

  const trendFocusedResult = engine.computeEnhancedConfidence(factors);
  console.log('Trend-focused weights result:', trendFocusedResult.confidence.toFixed(3));

  // Reset to default weights
  engine.updateWeights({
    trendComposite: 0.25,
    momentumDivergence: 0.20,
    volumeProfile: 0.20,
    ribbonAlignment: 0.15,
    fibConfluence: 0.10,
    gammaExposure: 0.10
  });

  console.log('Weight adjustment impact:', {
    default: defaultResult.confidence.toFixed(3),
    trendFocused: trendFocusedResult.confidence.toFixed(3),
    difference: (trendFocusedResult.confidence - defaultResult.confidence).toFixed(3)
  });
}

/**
 * Test signal validation
 */
async function testSignalValidation(engine: SignalWeightingEngine) {
  console.log('\n✅ Signal Validation Test');
  console.log('-------------------------');

  // Test valid signal
  const validSignal: SignalFactors = {
    ticker: 'GOOGL',
    trendComposite: 0.75,
    momentumDivergence: 0.70,
    volumeProfile: 0.65,
    ribbonAlignment: 0.60,
    fibConfluence: 0.55,
    gammaExposure: -0.1,
    timestamp: new Date()
  };

  const validResult = engine.validateSignalFactors(validSignal);
  console.log('Valid Signal:', {
    isValid: validResult.isValid,
    quality: validResult.quality.toFixed(3),
    issues: validResult.issues.length,
    warnings: validResult.warnings.length
  });

  // Test stale signal
  const staleSignal: SignalFactors = {
    ...validSignal,
    timestamp: new Date(Date.now() - 600000) // 10 minutes old
  };

  const staleResult = engine.validateSignalFactors(staleSignal);
  console.log('Stale Signal:', {
    isValid: staleResult.isValid,
    quality: staleResult.quality.toFixed(3),
    warnings: staleResult.warnings
  });

  // Test extreme values signal
  const extremeSignal: SignalFactors = {
    ticker: 'EXTREME',
    trendComposite: 0.99,        // Extreme high
    momentumDivergence: 0.01,    // Extreme low
    volumeProfile: 0.98,         // Extreme high
    ribbonAlignment: 0.02,       // Extreme low
    fibConfluence: 0.50,
    gammaExposure: 0.0,
    timestamp: new Date()
  };

  const extremeResult = engine.validateSignalFactors(extremeSignal);
  console.log('Extreme Values Signal:', {
    isValid: extremeResult.isValid,
    quality: extremeResult.quality.toFixed(3),
    warnings: extremeResult.warnings
  });
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting Signal Weighting Engine Demo...\n');
  signalWeightingDemo().catch(console.error);
}

export { signalWeightingDemo };