import { VolumeAnalysis, ThrustType } from '../types';

/**
 * Volume Analysis System
 * Implements volume confirmation signals, thrust detection, and accumulation/distribution analysis
 * Based on the predictive analytics from the trading specifications
 */

export interface VolumeSignals {
  upThrust: boolean;
  downThrust: boolean;
  volumeSpike: boolean;
  exhaustion: boolean;
  accumulation: boolean;
  distribution: boolean;
  confirmation: boolean;
  volumeRatio: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  accumulationDistribution: number;
}

export interface VolumePattern {
  pattern: 'thrust' | 'exhaustion' | 'accumulation' | 'distribution' | 'breakout' | 'selloff' | 'neutral';
  strength: number;
  reliability: number;
  description: string;
  implications: string[];
}

/**
 * Analyze volume confirmation signals
 * Core function implementing the volume analysis from trading specifications
 */
export function analyzeVolumeConfirmation(
  prices: number[],
  volumes: number[],
  lookback: number = 5
): VolumeAnalysis {
  if (prices.length !== volumes.length || prices.length < lookback) {
    return createEmptyVolumeAnalysis();
  }

  const recentVolumes = volumes.slice(-lookback);
  const recentPrices = prices.slice(-lookback);
  
  const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
  const currentVolume = volumes[volumes.length - 1];
  const currentPrice = prices[prices.length - 1];
  const previousPrice = prices[prices.length - 2];

  const volumeRatio = currentVolume / avgVolume;
  const volumeSpike = volumeRatio > 1.5;

  // Up thrust: Price up on above average volume
  const upThrust = currentPrice > previousPrice && volumeRatio > 1.2;

  // Down thrust: Price down on above average volume
  const downThrust = currentPrice < previousPrice && volumeRatio > 1.2;

  // Determine thrust type
  let thrust: ThrustType = 'none';
  if (upThrust) thrust = 'up';
  else if (downThrust) thrust = 'down';

  // Volume confirmation of price move
  const priceChange = Math.abs(currentPrice - previousPrice) / previousPrice;
  const confirmation = (priceChange > 0.005 && volumeRatio > 1.1) || volumeSpike;

  // Exhaustion detection (high volume with small price move)
  const exhaustion = volumeRatio > 2.0 && priceChange < 0.005;

  // Accumulation/Distribution calculation
  const accumulationDistribution = calculateAccumulationDistribution(prices, volumes, lookback);

  // Volume trend analysis
  const volumeTrend = analyzeVolumeTrend(volumes, lookback);

  return {
    confirmation,
    thrust,
    exhaustion,
    volumeSpike,
    accumulationDistribution,
    volumeRatio,
    trend: volumeTrend
  };
}

/**
 * Calculate Accumulation/Distribution Line
 */
function calculateAccumulationDistribution(
  prices: number[],
  volumes: number[],
  lookback: number
): number {
  if (prices.length < 3) return 0;

  let adLine = 0;
  const startIndex = Math.max(0, prices.length - lookback);

  for (let i = startIndex; i < prices.length; i++) {
    if (i === 0) continue;

    const high = prices[i];
    const low = prices[i];
    const close = prices[i];
    const volume = volumes[i];

    // Simplified A/D calculation (assuming OHLC data not available)
    // Use close position relative to previous close as proxy
    const prevClose = prices[i - 1];
    const moneyFlowMultiplier = (close - prevClose) / Math.abs(close - prevClose || 1);
    const moneyFlowVolume = moneyFlowMultiplier * volume;
    
    adLine += moneyFlowVolume;
  }

  return adLine;
}

/**
 * Analyze volume trend over lookback period
 */
function analyzeVolumeTrend(volumes: number[], lookback: number): 'increasing' | 'decreasing' | 'stable' {
  if (volumes.length < lookback) return 'stable';

  const recentVolumes = volumes.slice(-lookback);
  const firstHalf = recentVolumes.slice(0, Math.floor(lookback / 2));
  const secondHalf = recentVolumes.slice(Math.floor(lookback / 2));

  const firstHalfAvg = firstHalf.reduce((sum, vol) => sum + vol, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, vol) => sum + vol, 0) / secondHalf.length;

  const changeRatio = secondHalfAvg / firstHalfAvg;

  if (changeRatio > 1.15) return 'increasing';
  if (changeRatio < 0.85) return 'decreasing';
  return 'stable';
}

/**
 * Comprehensive volume signal analysis
 */
export function analyzeVolumeSignals(
  prices: number[],
  volumes: number[],
  lookback: number = 10
): VolumeSignals {
  if (prices.length !== volumes.length || prices.length < lookback) {
    return createEmptyVolumeSignals();
  }

  const basicAnalysis = analyzeVolumeConfirmation(prices, volumes, lookback);
  
  // Extended analysis
  const recentVolumes = volumes.slice(-lookback);
  const recentPrices = prices.slice(-lookback);
  const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
  
  // Accumulation/Distribution patterns
  const accumulation = detectAccumulation(prices, volumes, lookback);
  const distribution = detectDistribution(prices, volumes, lookback);

  return {
    upThrust: basicAnalysis.thrust === 'up',
    downThrust: basicAnalysis.thrust === 'down',
    volumeSpike: basicAnalysis.volumeSpike,
    exhaustion: basicAnalysis.exhaustion,
    accumulation,
    distribution,
    confirmation: basicAnalysis.confirmation,
    volumeRatio: basicAnalysis.volumeRatio,
    trend: basicAnalysis.trend,
    accumulationDistribution: basicAnalysis.accumulationDistribution
  };
}

/**
 * Detect accumulation pattern
 */
function detectAccumulation(prices: number[], volumes: number[], lookback: number): boolean {
  if (prices.length < lookback) return false;

  const recentPrices = prices.slice(-lookback);
  const recentVolumes = volumes.slice(-lookback);
  
  // Look for: stable/rising prices with increasing volume
  const priceStability = calculatePriceStability(recentPrices);
  const volumeIncrease = analyzeVolumeTrend(volumes, lookback) === 'increasing';
  const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
  const recentAvgVolume = recentVolumes.slice(-3).reduce((sum, vol) => sum + vol, 0) / 3;
  
  return priceStability > 0.7 && volumeIncrease && (recentAvgVolume / avgVolume) > 1.2;
}

/**
 * Detect distribution pattern
 */
function detectDistribution(prices: number[], volumes: number[], lookback: number): boolean {
  if (prices.length < lookback) return false;

  const recentPrices = prices.slice(-lookback);
  const recentVolumes = volumes.slice(-lookback);
  
  // Look for: stable/declining prices with high volume
  const priceWeakness = calculatePriceWeakness(recentPrices);
  const highVolume = recentVolumes.some(vol => vol > (recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length) * 1.5);
  
  return priceWeakness > 0.6 && highVolume;
}

/**
 * Calculate price stability (0-1 scale)
 */
function calculatePriceStability(prices: number[]): number {
  if (prices.length < 2) return 0;

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(Math.abs(prices[i] - prices[i-1]) / prices[i-1]);
  }

  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  return Math.max(0, 1 - (avgChange * 20)); // Scale so 5% avg change = 0 stability
}

/**
 * Calculate price weakness (0-1 scale)
 */
function calculatePriceWeakness(prices: number[]): number {
  if (prices.length < 2) return 0;

  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const maxPrice = Math.max(...prices);
  
  // Weakness = how much price has fallen from peak
  const peakDecline = (maxPrice - lastPrice) / maxPrice;
  const overallDecline = Math.max(0, (firstPrice - lastPrice) / firstPrice);
  
  return Math.min(1, (peakDecline + overallDecline) / 2);
}

/**
 * Identify volume patterns
 */
export function identifyVolumePattern(
  prices: number[],
  volumes: number[],
  lookback: number = 10
): VolumePattern {
  const signals = analyzeVolumeSignals(prices, volumes, lookback);
  
  // Volume thrust pattern
  if (signals.upThrust && signals.volumeRatio > 2) {
    return {
      pattern: 'thrust',
      strength: Math.min(1, signals.volumeRatio / 3),
      reliability: 0.8,
      description: 'Strong upward volume thrust detected',
      implications: ['Bullish breakout likely', 'Strong buying interest', 'Momentum building']
    };
  }

  if (signals.downThrust && signals.volumeRatio > 2) {
    return {
      pattern: 'selloff',
      strength: Math.min(1, signals.volumeRatio / 3),
      reliability: 0.8,
      description: 'Strong downward volume thrust detected',
      implications: ['Bearish breakdown likely', 'Heavy selling pressure', 'Momentum declining']
    };
  }

  // Volume exhaustion pattern
  if (signals.exhaustion) {
    return {
      pattern: 'exhaustion',
      strength: Math.min(1, signals.volumeRatio / 4),
      reliability: 0.7,
      description: 'Volume exhaustion detected - high volume with minimal price movement',
      implications: ['Potential reversal ahead', 'Buying/selling climax', 'Momentum stalling']
    };
  }

  // Accumulation pattern
  if (signals.accumulation) {
    return {
      pattern: 'accumulation',
      strength: 0.6,
      reliability: 0.65,
      description: 'Accumulation pattern - steady volume with stable prices',
      implications: ['Smart money accumulating', 'Potential upward breakout', 'Building support']
    };
  }

  // Distribution pattern
  if (signals.distribution) {
    return {
      pattern: 'distribution',
      strength: 0.6,
      reliability: 0.65,
      description: 'Distribution pattern - high volume with price weakness',
      implications: ['Smart money distributing', 'Potential downward breakdown', 'Building resistance']
    };
  }

  // Breakout pattern
  if (signals.volumeSpike && signals.confirmation) {
    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices[prices.length - 2];
    const isUpBreakout = currentPrice > previousPrice;
    
    return {
      pattern: 'breakout',
      strength: Math.min(1, signals.volumeRatio / 2.5),
      reliability: 0.75,
      description: `Volume-confirmed ${isUpBreakout ? 'upward' : 'downward'} breakout`,
      implications: [
        `${isUpBreakout ? 'Bullish' : 'Bearish'} momentum confirmed`,
        'High probability of continuation',
        'Strong institutional interest'
      ]
    };
  }

  return {
    pattern: 'neutral',
    strength: 0,
    reliability: 0,
    description: 'No significant volume pattern detected',
    implications: ['Normal trading activity', 'No clear directional bias']
  };
}

/**
 * Generate volume-based trading signals
 */
export function generateVolumeSignals(
  prices: number[],
  volumes: number[],
  lookback: number = 10
): {
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string[];
  timeframe: string;
} {
  const pattern = identifyVolumePattern(prices, volumes, lookback);
  const signals = analyzeVolumeSignals(prices, volumes, lookback);
  
  let signal: 'buy' | 'sell' | 'hold' = 'hold';
  let confidence = 0;
  const reasoning: string[] = [];

  switch (pattern.pattern) {
    case 'thrust':
      signal = 'buy';
      confidence = pattern.strength * pattern.reliability;
      reasoning.push('Strong upward volume thrust detected');
      reasoning.push(`Volume ${signals.volumeRatio.toFixed(1)}x above average`);
      break;

    case 'selloff':
      signal = 'sell';
      confidence = pattern.strength * pattern.reliability;
      reasoning.push('Strong downward volume selloff detected');
      reasoning.push(`Heavy selling on ${signals.volumeRatio.toFixed(1)}x volume`);
      break;

    case 'breakout':
      const currentPrice = prices[prices.length - 1];
      const previousPrice = prices[prices.length - 2];
      signal = currentPrice > previousPrice ? 'buy' : 'sell';
      confidence = pattern.strength * pattern.reliability;
      reasoning.push('Volume-confirmed breakout detected');
      reasoning.push(`${signal === 'buy' ? 'Upward' : 'Downward'} momentum with volume support`);
      break;

    case 'accumulation':
      signal = 'buy';
      confidence = 0.6;
      reasoning.push('Accumulation pattern suggests building strength');
      reasoning.push('Smart money likely accumulating positions');
      break;

    case 'distribution':
      signal = 'sell';
      confidence = 0.6;
      reasoning.push('Distribution pattern suggests weakness ahead');
      reasoning.push('Smart money likely reducing positions');
      break;

    case 'exhaustion':
      // Contrarian signal
      const recentTrend = prices[prices.length - 1] > prices[prices.length - 5] ? 'up' : 'down';
      signal = recentTrend === 'up' ? 'sell' : 'buy';
      confidence = 0.5;
      reasoning.push('Volume exhaustion suggests potential reversal');
      reasoning.push(`High volume (${signals.volumeRatio.toFixed(1)}x) with minimal price movement`);
      break;

    default:
      reasoning.push('No clear volume signal detected');
      break;
  }

  // Adjust confidence based on additional factors
  if (signals.confirmation && confidence > 0) {
    confidence = Math.min(0.9, confidence * 1.2);
    reasoning.push('Volume confirms price movement');
  }

  if (signals.trend === 'increasing' && signal === 'buy') {
    confidence = Math.min(0.9, confidence * 1.1);
    reasoning.push('Rising volume trend supports bullish signal');
  } else if (signals.trend === 'increasing' && signal === 'sell') {
    confidence = Math.min(0.9, confidence * 1.1);
    reasoning.push('Rising volume trend supports bearish signal');
  }

  // Determine timeframe based on pattern strength
  let timeframe = 'Medium-term (3-7 days)';
  if (pattern.strength > 0.7) timeframe = 'Short-term (1-3 days)';
  else if (pattern.strength < 0.3) timeframe = 'Long-term (1-2 weeks)';

  return {
    signal,
    confidence,
    reasoning,
    timeframe
  };
}

/**
 * Analyze volume for regime implications
 */
export function analyzeVolumeForRegime(
  prices: number[],
  volumes: number[],
  currentRegime: string,
  lookback: number = 10
): {
  regimeSupport: 'strong' | 'moderate' | 'weak';
  changeRisk: number;
  recommendation: string;
} {
  const pattern = identifyVolumePattern(prices, volumes, lookback);
  const signals = analyzeVolumeSignals(prices, volumes, lookback);
  
  let regimeSupport: 'strong' | 'moderate' | 'weak' = 'moderate';
  let changeRisk = 0.3; // Base risk
  let recommendation = 'Monitor volume patterns';

  // Analyze volume support for current regime
  if (currentRegime === 'BULL') {
    if (pattern.pattern === 'thrust' || (signals.upThrust && signals.confirmation)) {
      regimeSupport = 'strong';
      changeRisk = 0.1;
      recommendation = 'Volume strongly supports BULL regime';
    } else if (pattern.pattern === 'distribution' || signals.exhaustion) {
      regimeSupport = 'weak';
      changeRisk = 0.7;
      recommendation = 'Volume shows weakness - consider reducing exposure';
    } else if (signals.accumulation) {
      regimeSupport = 'strong';
      changeRisk = 0.2;
      recommendation = 'Accumulation supports continued strength';
    }
  } else if (currentRegime === 'BEAR') {
    if (pattern.pattern === 'selloff' || (signals.downThrust && signals.confirmation)) {
      regimeSupport = 'strong';
      changeRisk = 0.1;
      recommendation = 'Volume confirms BEAR regime continuation';
    } else if (pattern.pattern === 'accumulation' || (signals.exhaustion && signals.downThrust)) {
      regimeSupport = 'weak';
      changeRisk = 0.7;
      recommendation = 'Volume suggests potential reversal';
    }
  } else { // NEUTRAL
    if (pattern.pattern === 'breakout') {
      changeRisk = 0.8;
      recommendation = 'Volume breakout suggests regime change imminent';
    } else if (pattern.pattern === 'accumulation') {
      changeRisk = 0.6;
      recommendation = 'Accumulation suggests bullish breakout ahead';
    } else if (pattern.pattern === 'distribution') {
      changeRisk = 0.6;
      recommendation = 'Distribution suggests bearish breakdown ahead';
    }
  }

  return {
    regimeSupport,
    changeRisk: Math.min(0.9, changeRisk),
    recommendation
  };
}

/**
 * Create empty volume analysis
 */
function createEmptyVolumeAnalysis(): VolumeAnalysis {
  return {
    confirmation: false,
    thrust: 'none',
    exhaustion: false,
    volumeSpike: false,
    accumulationDistribution: 0,
    volumeRatio: 1,
    trend: 'stable'
  };
}

/**
 * Create empty volume signals
 */
function createEmptyVolumeSignals(): VolumeSignals {
  return {
    upThrust: false,
    downThrust: false,
    volumeSpike: false,
    exhaustion: false,
    accumulation: false,
    distribution: false,
    confirmation: false,
    volumeRatio: 1,
    trend: 'stable',
    accumulationDistribution: 0
  };
}