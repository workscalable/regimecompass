import { MomentumDivergence, DivergenceType, TimeframeType } from '../types';
import { calculateRSI, calculateMACD, detectMomentumDivergence } from '../math';

/**
 * Momentum Divergence Detection System
 * Implements RSI and MACD divergence analysis for early reversal signals
 * Based on the predictive analytics from the trading specifications
 */

export interface DivergenceAnalysis {
  rsiDivergence: {
    type: DivergenceType;
    strength: number;
    pricePoints: number[];
    rsiPoints: number[];
    timeframe: TimeframeType;
  };
  macdDivergence: {
    type: DivergenceType;
    strength: number;
    pricePoints: number[];
    macdPoints: number[];
    timeframe: TimeframeType;
  };
  hiddenDivergence: {
    bullish: boolean;
    bearish: boolean;
    strength: number;
  };
  overallSignal: {
    type: DivergenceType;
    strength: number;
    confidence: number;
    timeframe: TimeframeType;
  };
}

/**
 * Detect comprehensive momentum divergences
 */
export function detectDivergences(
  closes: number[], 
  highs: number[], 
  lows: number[],
  lookbackPeriod: number = 5
): MomentumDivergence {
  if (closes.length < 30) {
    return createEmptyDivergence();
  }

  // Calculate technical indicators
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  
  // Detect RSI divergences
  const rsiDivergence = detectRSIDivergence(closes, rsi, lookbackPeriod);
  
  // Detect MACD divergences
  const macdDivergence = detectMACDDivergence(closes, macd.macd, lookbackPeriod);
  
  // Detect hidden divergences
  const hiddenDivergence = detectHiddenDivergences(closes, highs, lows, rsi, lookbackPeriod);
  
  // Combine signals for overall assessment
  const overallSignal = combinedivergenceSignals(rsiDivergence, macdDivergence, hiddenDivergence);

  return {
    type: overallSignal.type,
    strength: overallSignal.strength,
    timeframe: overallSignal.timeframe,
    rsiDivergence: rsiDivergence.type !== 'none',
    macdDivergence: macdDivergence.type !== 'none',
    hiddenDivergence: hiddenDivergence.bullish || hiddenDivergence.bearish,
    pricePoints: overallSignal.pricePoints,
    indicatorPoints: overallSignal.indicatorPoints
  };
}

/**
 * Detect RSI divergences
 */
function detectRSIDivergence(
  closes: number[], 
  rsi: number[], 
  lookback: number
): {
  type: DivergenceType;
  strength: number;
  pricePoints: number[];
  rsiPoints: number[];
  timeframe: TimeframeType;
} {
  if (rsi.length < lookback * 2) {
    return { type: 'none', strength: 0, pricePoints: [], rsiPoints: [], timeframe: 'short' };
  }

  const recentPrices = closes.slice(-lookback);
  const recentRSI = rsi.slice(-lookback);
  const previousPrices = closes.slice(-lookback * 2, -lookback);
  const previousRSI = rsi.slice(-lookback * 2, -lookback);

  // Find peaks and troughs
  const recentPriceHigh = Math.max(...recentPrices);
  const recentPriceLow = Math.min(...recentPrices);
  const previousPriceHigh = Math.max(...previousPrices);
  const previousPriceLow = Math.min(...previousPrices);

  const recentRSIHigh = Math.max(...recentRSI);
  const recentRSILow = Math.min(...recentRSI);
  const previousRSIHigh = Math.max(...previousRSI);
  const previousRSILow = Math.min(...previousRSI);

  // Regular Bearish Divergence: Price makes higher high, RSI makes lower high
  if (recentPriceHigh > previousPriceHigh && recentRSIHigh < previousRSIHigh) {
    const priceStrength = (recentPriceHigh - previousPriceHigh) / previousPriceHigh;
    const rsiWeakness = (previousRSIHigh - recentRSIHigh) / previousRSIHigh;
    const strength = Math.min(1, (priceStrength + rsiWeakness) / 2);
    
    return {
      type: 'bearish',
      strength,
      pricePoints: [previousPriceHigh, recentPriceHigh],
      rsiPoints: [previousRSIHigh, recentRSIHigh],
      timeframe: determineTimeframe(strength)
    };
  }

  // Regular Bullish Divergence: Price makes lower low, RSI makes higher low
  if (recentPriceLow < previousPriceLow && recentRSILow > previousRSILow) {
    const priceWeakness = (previousPriceLow - recentPriceLow) / previousPriceLow;
    const rsiStrength = (recentRSILow - previousRSILow) / Math.abs(previousRSILow);
    const strength = Math.min(1, (priceWeakness + rsiStrength) / 2);
    
    return {
      type: 'bullish',
      strength,
      pricePoints: [previousPriceLow, recentPriceLow],
      rsiPoints: [previousRSILow, recentRSILow],
      timeframe: determineTimeframe(strength)
    };
  }

  return { type: 'none', strength: 0, pricePoints: [], rsiPoints: [], timeframe: 'short' };
}

/**
 * Detect MACD divergences
 */
function detectMACDDivergence(
  closes: number[], 
  macdLine: number[], 
  lookback: number
): {
  type: DivergenceType;
  strength: number;
  pricePoints: number[];
  macdPoints: number[];
  timeframe: TimeframeType;
} {
  if (macdLine.length < lookback * 2) {
    return { type: 'none', strength: 0, pricePoints: [], macdPoints: [], timeframe: 'short' };
  }

  // Align arrays (MACD starts later than price data)
  const alignedCloses = closes.slice(-(macdLine.length));
  
  const recentPrices = alignedCloses.slice(-lookback);
  const recentMACD = macdLine.slice(-lookback);
  const previousPrices = alignedCloses.slice(-lookback * 2, -lookback);
  const previousMACD = macdLine.slice(-lookback * 2, -lookback);

  // Find peaks and troughs
  const recentPriceHigh = Math.max(...recentPrices);
  const recentPriceLow = Math.min(...recentPrices);
  const previousPriceHigh = Math.max(...previousPrices);
  const previousPriceLow = Math.min(...previousPrices);

  const recentMACDHigh = Math.max(...recentMACD);
  const recentMACDLow = Math.min(...recentMACD);
  const previousMACDHigh = Math.max(...previousMACD);
  const previousMACDLow = Math.min(...previousMACD);

  // Bearish Divergence: Price higher high, MACD lower high
  if (recentPriceHigh > previousPriceHigh && recentMACDHigh < previousMACDHigh) {
    const priceStrength = (recentPriceHigh - previousPriceHigh) / previousPriceHigh;
    const macdWeakness = Math.abs(previousMACDHigh - recentMACDHigh) / Math.abs(previousMACDHigh);
    const strength = Math.min(1, (priceStrength + macdWeakness) / 2);
    
    return {
      type: 'bearish',
      strength,
      pricePoints: [previousPriceHigh, recentPriceHigh],
      macdPoints: [previousMACDHigh, recentMACDHigh],
      timeframe: determineTimeframe(strength)
    };
  }

  // Bullish Divergence: Price lower low, MACD higher low
  if (recentPriceLow < previousPriceLow && recentMACDLow > previousMACDLow) {
    const priceWeakness = (previousPriceLow - recentPriceLow) / previousPriceLow;
    const macdStrength = Math.abs(recentMACDLow - previousMACDLow) / Math.abs(previousMACDLow);
    const strength = Math.min(1, (priceWeakness + macdStrength) / 2);
    
    return {
      type: 'bullish',
      strength,
      pricePoints: [previousPriceLow, recentPriceLow],
      macdPoints: [previousMACDLow, recentMACDLow],
      timeframe: determineTimeframe(strength)
    };
  }

  return { type: 'none', strength: 0, pricePoints: [], macdPoints: [], timeframe: 'short' };
}

/**
 * Detect hidden divergences (trend continuation signals)
 */
function detectHiddenDivergences(
  closes: number[],
  highs: number[],
  lows: number[],
  rsi: number[],
  lookback: number
): {
  bullish: boolean;
  bearish: boolean;
  strength: number;
} {
  if (rsi.length < lookback * 2) {
    return { bullish: false, bearish: false, strength: 0 };
  }

  const recentPrices = closes.slice(-lookback);
  const recentHighs = highs.slice(-lookback);
  const recentLows = lows.slice(-lookback);
  const recentRSI = rsi.slice(-lookback);
  
  const previousPrices = closes.slice(-lookback * 2, -lookback);
  const previousHighs = highs.slice(-lookback * 2, -lookback);
  const previousLows = lows.slice(-lookback * 2, -lookback);
  const previousRSI = rsi.slice(-lookback * 2, -lookback);

  // Hidden Bullish Divergence (in uptrend): Price makes higher low, RSI makes lower low
  const recentLow = Math.min(...recentLows);
  const previousLow = Math.min(...previousLows);
  const recentRSILow = Math.min(...recentRSI);
  const previousRSILow = Math.min(...previousRSI);
  
  const hiddenBullish = recentLow > previousLow && recentRSILow < previousRSILow;

  // Hidden Bearish Divergence (in downtrend): Price makes lower high, RSI makes higher high
  const recentHigh = Math.max(...recentHighs);
  const previousHigh = Math.max(...previousHighs);
  const recentRSIHigh = Math.max(...recentRSI);
  const previousRSIHigh = Math.max(...previousRSI);
  
  const hiddenBearish = recentHigh < previousHigh && recentRSIHigh > previousRSIHigh;

  // Calculate strength based on the magnitude of divergence
  let strength = 0;
  if (hiddenBullish) {
    const priceImprovement = (recentLow - previousLow) / previousLow;
    const rsiDivergence = (previousRSILow - recentRSILow) / previousRSILow;
    strength = Math.min(1, (priceImprovement + rsiDivergence) / 2);
  } else if (hiddenBearish) {
    const priceWeakening = (previousHigh - recentHigh) / previousHigh;
    const rsiDivergence = (recentRSIHigh - previousRSIHigh) / previousRSIHigh;
    strength = Math.min(1, (priceWeakening + rsiDivergence) / 2);
  }

  return {
    bullish: hiddenBullish,
    bearish: hiddenBearish,
    strength
  };
}

/**
 * Combine divergence signals for overall assessment
 */
function combinedivergenceSignals(
  rsiDiv: any,
  macdDiv: any,
  hiddenDiv: any
): {
  type: DivergenceType;
  strength: number;
  timeframe: TimeframeType;
  pricePoints: number[];
  indicatorPoints: number[];
} {
  const signals = [];
  
  // Collect all signals
  if (rsiDiv.type !== 'none') {
    signals.push({ type: rsiDiv.type, strength: rsiDiv.strength, source: 'RSI' });
  }
  
  if (macdDiv.type !== 'none') {
    signals.push({ type: macdDiv.type, strength: macdDiv.strength, source: 'MACD' });
  }
  
  if (hiddenDiv.bullish) {
    signals.push({ type: 'bullish', strength: hiddenDiv.strength, source: 'Hidden' });
  }
  
  if (hiddenDiv.bearish) {
    signals.push({ type: 'bearish', strength: hiddenDiv.strength, source: 'Hidden' });
  }

  if (signals.length === 0) {
    return {
      type: 'none',
      strength: 0,
      timeframe: 'short',
      pricePoints: [],
      indicatorPoints: []
    };
  }

  // Determine dominant signal
  const bullishSignals = signals.filter(s => s.type === 'bullish');
  const bearishSignals = signals.filter(s => s.type === 'bearish');

  let dominantType: DivergenceType = 'none';
  let combinedStrength = 0;

  if (bullishSignals.length > bearishSignals.length) {
    dominantType = 'bullish';
    combinedStrength = bullishSignals.reduce((sum, s) => sum + s.strength, 0) / bullishSignals.length;
  } else if (bearishSignals.length > bullishSignals.length) {
    dominantType = 'bearish';
    combinedStrength = bearishSignals.reduce((sum, s) => sum + s.strength, 0) / bearishSignals.length;
  } else if (bullishSignals.length > 0 && bearishSignals.length > 0) {
    // Conflicting signals - use the stronger one
    const avgBullish = bullishSignals.reduce((sum, s) => sum + s.strength, 0) / bullishSignals.length;
    const avgBearish = bearishSignals.reduce((sum, s) => sum + s.strength, 0) / bearishSignals.length;
    
    if (avgBullish > avgBearish) {
      dominantType = 'bullish';
      combinedStrength = avgBullish * 0.7; // Reduce strength due to conflict
    } else {
      dominantType = 'bearish';
      combinedStrength = avgBearish * 0.7;
    }
  }

  // Use the strongest signal's price points
  const strongestSignal = signals.reduce((prev, current) => 
    current.strength > prev.strength ? current : prev
  );

  let pricePoints: number[] = [];
  let indicatorPoints: number[] = [];

  if (strongestSignal.source === 'RSI') {
    pricePoints = rsiDiv.pricePoints;
    indicatorPoints = rsiDiv.rsiPoints;
  } else if (strongestSignal.source === 'MACD') {
    pricePoints = macdDiv.pricePoints;
    indicatorPoints = macdDiv.macdPoints;
  }

  return {
    type: dominantType,
    strength: combinedStrength,
    timeframe: determineTimeframe(combinedStrength),
    pricePoints,
    indicatorPoints
  };
}

/**
 * Determine timeframe based on divergence strength
 */
function determineTimeframe(strength: number): TimeframeType {
  if (strength >= 0.7) return 'short'; // 1-3 days
  if (strength >= 0.4) return 'medium'; // 3-7 days
  return 'long'; // 1-2 weeks
}

/**
 * Create empty divergence result
 */
function createEmptyDivergence(): MomentumDivergence {
  return {
    type: 'none',
    strength: 0,
    timeframe: 'short',
    rsiDivergence: false,
    macdDivergence: false,
    hiddenDivergence: false,
    pricePoints: [],
    indicatorPoints: []
  };
}

/**
 * Get divergence trading signals
 */
export function getDivergenceSignals(divergence: MomentumDivergence): {
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  timeframe: string;
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let signal: 'buy' | 'sell' | 'hold' = 'hold';
  let confidence = 0;

  if (divergence.type === 'none') {
    return {
      signal: 'hold',
      confidence: 0,
      timeframe: 'N/A',
      reasoning: ['No momentum divergences detected']
    };
  }

  // Base confidence from strength
  confidence = divergence.strength;

  // Adjust confidence based on multiple confirmations
  let confirmations = 0;
  if (divergence.rsiDivergence) {
    confirmations++;
    reasoning.push('RSI divergence detected');
  }
  if (divergence.macdDivergence) {
    confirmations++;
    reasoning.push('MACD divergence detected');
  }
  if (divergence.hiddenDivergence) {
    confirmations++;
    reasoning.push('Hidden divergence detected');
  }

  // Boost confidence with multiple confirmations
  if (confirmations >= 2) {
    confidence = Math.min(0.9, confidence * 1.3);
    reasoning.push(`${confirmations} indicators confirm divergence`);
  }

  // Determine signal
  if (divergence.type === 'bullish' && confidence >= 0.5) {
    signal = 'buy';
    reasoning.push('Bullish divergence suggests upward reversal');
  } else if (divergence.type === 'bearish' && confidence >= 0.5) {
    signal = 'sell';
    reasoning.push('Bearish divergence suggests downward reversal');
  }

  // Timeframe interpretation
  let timeframeDesc = '';
  switch (divergence.timeframe) {
    case 'short':
      timeframeDesc = '1-3 days';
      break;
    case 'medium':
      timeframeDesc = '3-7 days';
      break;
    case 'long':
      timeframeDesc = '1-2 weeks';
      break;
  }

  return {
    signal,
    confidence,
    timeframe: timeframeDesc,
    reasoning
  };
}

/**
 * Analyze divergence patterns for regime implications
 */
export function analyzeDivergenceForRegime(
  divergence: MomentumDivergence,
  currentRegime: string
): {
  regimeRisk: 'low' | 'medium' | 'high';
  changeProb: number;
  recommendation: string;
} {
  let regimeRisk: 'low' | 'medium' | 'high' = 'low';
  let changeProb = 0;
  let recommendation = 'No action needed';

  if (divergence.type === 'none') {
    return { regimeRisk, changeProb, recommendation };
  }

  // Calculate regime change probability
  changeProb = divergence.strength * 0.6; // Base probability

  // Adjust based on current regime alignment
  if (currentRegime === 'BULL' && divergence.type === 'bearish') {
    changeProb *= 1.5; // Higher risk in opposing divergence
    regimeRisk = changeProb > 0.6 ? 'high' : changeProb > 0.3 ? 'medium' : 'low';
    recommendation = 'Consider reducing long exposure';
  } else if (currentRegime === 'BEAR' && divergence.type === 'bullish') {
    changeProb *= 1.5;
    regimeRisk = changeProb > 0.6 ? 'high' : changeProb > 0.3 ? 'medium' : 'low';
    recommendation = 'Consider reducing short exposure';
  } else if (currentRegime === 'NEUTRAL') {
    regimeRisk = 'medium';
    recommendation = `Prepare for potential ${divergence.type} breakout`;
  }

  // Multiple confirmations increase risk
  const confirmations = [
    divergence.rsiDivergence,
    divergence.macdDivergence,
    divergence.hiddenDivergence
  ].filter(Boolean).length;

  if (confirmations >= 2) {
    changeProb = Math.min(0.9, changeProb * 1.3);
    if (regimeRisk === 'low') regimeRisk = 'medium';
    if (regimeRisk === 'medium') regimeRisk = 'high';
  }

  return {
    regimeRisk,
    changeProb: Math.min(0.9, changeProb),
    recommendation
  };
}