/**
 * Core mathematical functions for regime compass trading system
 * Based on the trading logic provided in the specification files
 */

/**
 * Calculate 9-day trend score
 * Returns a score from -9 to +9 based on daily price movements
 * +9 = All 9 days up, -9 = All 9 days down
 */
export function trendScore9(closes: number[]): number {
  if (closes.length < 10) {
    throw new Error('Need at least 10 closing prices for 9-day trend score');
  }

  let sum = 0;
  // Look at the last 9 days of price changes
  for (let i = closes.length - 9; i < closes.length; i++) {
    const up = closes[i] > closes[i - 1] ? 1 : -1;
    sum += up;
  }

  return sum; // Range: -9 to +9
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) {
    throw new Error(`Need at least ${period} prices for EMA calculation`);
  }

  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA for the first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  ema.push(sum / period);

  // Calculate EMA for remaining values
  for (let i = period; i < prices.length; i++) {
    const emaValue = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(emaValue);
  }

  return ema;
}

/**
 * Get the latest EMA value for a given period
 */
export function getLatestEMA(prices: number[], period: number): number {
  const emaArray = calculateEMA(prices, period);
  return emaArray[emaArray.length - 1];
}

/**
 * Calculate Average True Range (ATR)
 * Used for position sizing and stop loss calculations
 */
export function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (highs.length !== lows.length || lows.length !== closes.length) {
    throw new Error('High, low, and close arrays must be the same length');
  }

  if (highs.length < period + 1) {
    throw new Error(`Need at least ${period + 1} periods for ATR calculation`);
  }

  const trueRanges: number[] = [];

  // Calculate True Range for each period
  for (let i = 1; i < highs.length; i++) {
    const highLow = highs[i] - lows[i];
    const highClosePrev = Math.abs(highs[i] - closes[i - 1]);
    const lowClosePrev = Math.abs(lows[i] - closes[i - 1]);

    const trueRange = Math.max(highLow, highClosePrev, lowClosePrev);
    trueRanges.push(trueRange);
  }

  // Calculate ATR as EMA of True Ranges
  const atrArray = calculateEMA(trueRanges, period);
  return atrArray[atrArray.length - 1];
}

/**
 * Calculate RSI (Relative Strength Index)
 * Used for momentum divergence detection
 */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  if (closes.length < period + 1) {
    throw new Error(`Need at least ${period + 1} closes for RSI calculation`);
  }

  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate gains and losses
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  const rsi: number[] = [];

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

  // Calculate first RSI value
  let rs = avgGain / avgLoss;
  rsi.push(100 - (100 / (1 + rs)));

  // Calculate subsequent RSI values using smoothed averages
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Used for momentum analysis and divergence detection
 */
export function calculateMACD(closes: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  if (closes.length < slowPeriod) {
    throw new Error(`Need at least ${slowPeriod} closes for MACD calculation`);
  }

  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  // MACD line = Fast EMA - Slow EMA
  const macdLine: number[] = [];
  const startIndex = slowPeriod - fastPeriod;

  for (let i = startIndex; i < fastEMA.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i - startIndex]);
  }

  // Signal line = EMA of MACD line
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Histogram = MACD line - Signal line
  const histogram: number[] = [];
  const histogramStartIndex = signalPeriod - 1;

  for (let i = histogramStartIndex; i < macdLine.length; i++) {
    histogram.push(macdLine[i] - signalLine[i - histogramStartIndex]);
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: histogram
  };
}

/**
 * Calculate breadth percentage from sector data
 * Core component of regime classification
 */
export function calculateBreadthPercentage(sectorScores: Record<string, number>): number {
  const scores = Object.values(sectorScores);
  if (scores.length === 0) return 0.5; // Default to neutral if no data

  const advancingCount = scores.filter(score => score > 0).length;
  return advancingCount / scores.length;
}

/**
 * Check EMA alignment for regime classification
 * Returns true if EMA20 > EMA50 * 1.0025 (bull) or EMA20 < EMA50 * 0.9975 (bear)
 */
export function checkEMAAlignment(ema20: number, ema50: number, type: 'bull' | 'bear'): boolean {
  if (type === 'bull') {
    return ema20 > ema50 * 1.0025;
  } else {
    return ema20 < ema50 * 0.9975;
  }
}

/**
 * Calculate position size based on ATR and risk parameters
 * Core function for risk management
 */
export function calculatePositionSize(
  accountSize: number,
  riskPerTrade: number, // percentage (e.g., 0.01 for 1%)
  atr: number,
  volatilityAdjustment: number = 1.0,
  maxPositionPct: number = 0.1 // 10% max per position
): number {
  const riskAmount = accountSize * riskPerTrade;
  const atrRisk = atr * 2; // 2x ATR for stop loss
  
  let positionSize = (riskAmount / atrRisk) * volatilityAdjustment;
  
  // Cap at maximum position size
  const maxPositionSize = accountSize * maxPositionPct;
  positionSize = Math.min(positionSize, maxPositionSize);
  
  return positionSize;
}

/**
 * Calculate stop loss level based on ATR
 */
export function calculateStopLoss(entryPrice: number, atr: number, direction: 'long' | 'short', atrMultiplier: number = 2): number {
  if (direction === 'long') {
    return entryPrice - (atr * atrMultiplier);
  } else {
    return entryPrice + (atr * atrMultiplier);
  }
}

/**
 * Calculate profit target based on ATR
 */
export function calculateProfitTarget(entryPrice: number, atr: number, direction: 'long' | 'short', atrMultiplier: number = 1.5): number {
  if (direction === 'long') {
    return entryPrice + (atr * atrMultiplier);
  } else {
    return entryPrice - (atr * atrMultiplier);
  }
}

/**
 * Calculate pivot levels for support/resistance
 * Used in predictive analysis
 */
export function calculatePivotLevels(highs: number[], lows: number[], closes: number[], lookback: number = 5) {
  if (highs.length < lookback || lows.length < lookback || closes.length < lookback) {
    throw new Error(`Need at least ${lookback} periods for pivot calculation`);
  }

  const recentHighs = highs.slice(-lookback);
  const recentLows = lows.slice(-lookback);
  const lastClose = closes[closes.length - 1];

  const pivot = (Math.max(...recentHighs) + Math.min(...recentLows) + lastClose) / 3;
  
  const r1 = 2 * pivot - Math.min(...recentLows);
  const s1 = 2 * pivot - Math.max(...recentHighs);
  const r2 = pivot + (r1 - s1);
  const s2 = pivot - (r1 - s1);

  return {
    pivot,
    resistance: [r1, r2],
    support: [s1, s2]
  };
}

/**
 * Calculate volume-weighted average price (VWAP)
 */
export function calculateVWAP(prices: number[], volumes: number[]): number {
  if (prices.length !== volumes.length) {
    throw new Error('Prices and volumes arrays must be the same length');
  }

  let totalVolume = 0;
  let totalVolumePrice = 0;

  for (let i = 0; i < prices.length; i++) {
    totalVolume += volumes[i];
    totalVolumePrice += prices[i] * volumes[i];
  }

  return totalVolumePrice / totalVolume;
}

/**
 * Calculate regime strength score (0-100)
 * Based on multiple factors alignment
 */
export function calculateRegimeStrength(
  breadthPct: number,
  trendScore: number,
  emaAlignment: boolean,
  vixLevel: number,
  gammaSupport: boolean
): number {
  let strength = 0;

  // Breadth strength (0-25 points)
  if (breadthPct > 0.7) strength += 25;
  else if (breadthPct > 0.6) strength += 15;
  else if (breadthPct > 0.5) strength += 5;

  // Trend strength (0-25 points)
  if (Math.abs(trendScore) >= 6) strength += 25;
  else if (Math.abs(trendScore) >= 3) strength += 15;
  else if (Math.abs(trendScore) >= 1) strength += 5;

  // EMA alignment (0-20 points)
  if (emaAlignment) strength += 20;

  // VIX condition (0-15 points)
  if (vixLevel < 15) strength += 15;
  else if (vixLevel < 20) strength += 10;
  else if (vixLevel < 25) strength += 5;

  // Gamma support (0-15 points)
  if (gammaSupport) strength += 15;

  return Math.min(strength, 100);
}

/**
 * Detect momentum divergences between price and indicators
 */
export function detectMomentumDivergence(
  prices: number[],
  indicator: number[],
  lookback: number = 5
): { type: 'bullish' | 'bearish' | 'none'; strength: number } {
  if (prices.length < lookback * 2 || indicator.length < lookback * 2) {
    return { type: 'none', strength: 0 };
  }

  const recentPrices = prices.slice(-lookback);
  const recentIndicator = indicator.slice(-lookback);
  const previousPrices = prices.slice(-lookback * 2, -lookback);
  const previousIndicator = indicator.slice(-lookback * 2, -lookback);

  const priceHigh = Math.max(...recentPrices);
  const priceLow = Math.min(...recentPrices);
  const prevPriceHigh = Math.max(...previousPrices);
  const prevPriceLow = Math.min(...previousPrices);

  const indicatorHigh = Math.max(...recentIndicator);
  const indicatorLow = Math.min(...recentIndicator);
  const prevIndicatorHigh = Math.max(...previousIndicator);
  const prevIndicatorLow = Math.min(...previousIndicator);

  // Bearish divergence: Price makes higher high, indicator makes lower high
  if (priceHigh > prevPriceHigh && indicatorHigh < prevIndicatorHigh) {
    const priceStrength = (priceHigh - prevPriceHigh) / prevPriceHigh;
    const indicatorWeakness = (prevIndicatorHigh - indicatorHigh) / prevIndicatorHigh;
    return { 
      type: 'bearish', 
      strength: Math.min((priceStrength + indicatorWeakness) / 2, 1) 
    };
  }

  // Bullish divergence: Price makes lower low, indicator makes higher low
  if (priceLow < prevPriceLow && indicatorLow > prevIndicatorLow) {
    const priceWeakness = (prevPriceLow - priceLow) / prevPriceLow;
    const indicatorStrength = (indicatorLow - prevIndicatorLow) / Math.abs(prevIndicatorLow);
    return { 
      type: 'bullish', 
      strength: Math.min((priceWeakness + indicatorStrength) / 2, 1) 
    };
  }

  return { type: 'none', strength: 0 };
}

/**
 * Calculate volume confirmation signals
 */
export function analyzeVolumeConfirmation(
  prices: number[],
  volumes: number[],
  lookback: number = 5
): { 
  upThrust: boolean; 
  downThrust: boolean; 
  volumeSpike: boolean;
  volumeRatio: number;
} {
  if (prices.length < lookback || volumes.length < lookback) {
    return { upThrust: false, downThrust: false, volumeSpike: false, volumeRatio: 1 };
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

  return {
    upThrust,
    downThrust,
    volumeSpike,
    volumeRatio
  };
}

/**
 * Utility function to normalize values to 0-1 range
 */
export function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculate correlation between two arrays
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }

  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}