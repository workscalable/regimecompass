import { 
  MarketSnapshot, 
  RegimeFactors, 
  RegimeType, 
  EarlyWarningSignals,
  ConfidenceLevel,
  BreadthData,
  IndexData,
  VIXData,
  GammaData
} from './types';

/**
 * Regime Strength Scoring System
 * Provides quantitative assessment of regime durability and confidence
 * Scores range from 0-100 with early warning detection
 */

export interface RegimeStrengthAnalysis {
  overallStrength: number; // 0-100
  factorStrengths: {
    breadth: number;
    trend: number;
    ema: number;
    volatility: number;
    gamma: number;
  };
  durabilityScore: number; // How likely regime is to persist
  vulnerabilityScore: number; // How likely regime is to change
  earlyWarnings: EarlyWarningSignals;
  recommendedAction: 'aggressive' | 'cautious' | 'defensive' | 'wait';
}

/**
 * Calculate comprehensive regime strength score (0-100)
 */
export function calculateRegimeStrength(
  snapshot: MarketSnapshot,
  factors: RegimeFactors
): RegimeStrengthAnalysis {
  const factorStrengths = calculateFactorStrengths(snapshot);
  const overallStrength = calculateOverallStrength(factorStrengths, factors);
  const durabilityScore = calculateDurabilityScore(snapshot, overallStrength);
  const vulnerabilityScore = calculateVulnerabilityScore(snapshot, factorStrengths);
  const earlyWarnings = detectEarlyWarnings(snapshot, factorStrengths);
  const recommendedAction = determineRecommendedAction(overallStrength, vulnerabilityScore, earlyWarnings);

  return {
    overallStrength,
    factorStrengths,
    durabilityScore,
    vulnerabilityScore,
    earlyWarnings,
    recommendedAction
  };
}

/**
 * Calculate individual factor strengths (0-100 each)
 */
function calculateFactorStrengths(snapshot: MarketSnapshot): {
  breadth: number;
  trend: number;
  ema: number;
  volatility: number;
  gamma: number;
} {
  return {
    breadth: calculateBreadthStrength(snapshot.breadth),
    trend: calculateTrendStrength(snapshot.indexes.SPY),
    ema: calculateEMAStrength(snapshot.indexes.SPY),
    volatility: calculateVolatilityStrength(snapshot.vix),
    gamma: calculateGammaStrength(snapshot.gamma)
  };
}

/**
 * Calculate breadth factor strength (0-100)
 */
function calculateBreadthStrength(breadth: BreadthData): number {
  let strength = 0;
  
  // Primary breadth percentage (0-40 points)
  const breadthPct = breadth.breadthPct;
  if (breadthPct >= 0.8) strength += 40;
  else if (breadthPct >= 0.7) strength += 35;
  else if (breadthPct >= 0.62) strength += 25; // BULL threshold
  else if (breadthPct >= 0.5) strength += 15;
  else if (breadthPct >= 0.38) strength += 10; // BEAR threshold
  else if (breadthPct >= 0.2) strength += 5;
  // Below 20% gets 0 points
  
  // Advance/Decline ratio (0-25 points)
  const adRatio = breadth.advanceDeclineRatio;
  if (adRatio >= 3) strength += 25;
  else if (adRatio >= 2) strength += 20;
  else if (adRatio >= 1.5) strength += 15;
  else if (adRatio >= 1) strength += 10;
  else if (adRatio >= 0.67) strength += 5;
  // Below 0.67 gets 0 points
  
  // New highs vs new lows (0-20 points)
  const totalHighsLows = breadth.newHighs + breadth.newLows;
  if (totalHighsLows > 0) {
    const highsRatio = breadth.newHighs / totalHighsLows;
    strength += highsRatio * 20;
  } else {
    strength += 10; // Neutral if no new highs/lows
  }
  
  // Participation rate (0-15 points)
  const totalActive = breadth.advancingStocks + breadth.decliningStocks;
  const totalStocks = totalActive + breadth.unchangedStocks;
  const participationRate = totalActive / totalStocks;
  strength += participationRate * 15;
  
  return Math.min(100, strength);
}

/**
 * Calculate trend factor strength (0-100)
 */
function calculateTrendStrength(spyData: IndexData): number {
  let strength = 0;
  
  // 9-day trend score (0-50 points)
  const trendScore = Math.abs(spyData.trendScore9);
  if (trendScore >= 7) strength += 50;
  else if (trendScore >= 5) strength += 40;
  else if (trendScore >= 3) strength += 25; // Regime threshold
  else if (trendScore >= 1) strength += 10;
  // Score of 0 gets 0 points
  
  // Price momentum (0-25 points)
  const changePercent = Math.abs(spyData.changePercent);
  if (changePercent >= 2) strength += 25;
  else if (changePercent >= 1) strength += 20;
  else if (changePercent >= 0.5) strength += 15;
  else if (changePercent >= 0.25) strength += 10;
  else strength += 5;
  
  // Volume confirmation (0-25 points)
  // This would require volume vs average volume comparison
  // For now, use a simplified approach based on absolute volume
  if (spyData.volume > 50000000) strength += 25; // High volume
  else if (spyData.volume > 30000000) strength += 20;
  else if (spyData.volume > 20000000) strength += 15;
  else if (spyData.volume > 10000000) strength += 10;
  else strength += 5;
  
  return Math.min(100, strength);
}

/**
 * Calculate EMA alignment strength (0-100)
 */
function calculateEMAStrength(spyData: IndexData): number {
  let strength = 0;
  
  // EMA spread (0-60 points)
  const emaSpread = Math.abs(spyData.ema20 - spyData.ema50) / spyData.ema50;
  if (emaSpread >= 0.05) strength += 60; // 5%+ spread
  else if (emaSpread >= 0.03) strength += 50; // 3%+ spread
  else if (emaSpread >= 0.01) strength += 40; // 1%+ spread
  else if (emaSpread >= 0.005) strength += 25; // 0.5%+ spread
  else if (emaSpread >= 0.0025) strength += 15; // 0.25%+ spread (regime threshold)
  else strength += 5; // Very tight spread
  
  // EMA slope/direction (0-40 points)
  // Simplified: assume positive if EMA20 > EMA50, negative otherwise
  const isAligned = spyData.ema20 > spyData.ema50;
  if (isAligned) {
    // Additional points for strong alignment
    if (emaSpread >= 0.02) strength += 40;
    else if (emaSpread >= 0.01) strength += 30;
    else if (emaSpread >= 0.005) strength += 20;
    else strength += 10;
  } else {
    // Bearish alignment
    if (emaSpread >= 0.02) strength += 40;
    else if (emaSpread >= 0.01) strength += 30;
    else if (emaSpread >= 0.005) strength += 20;
    else strength += 10;
  }
  
  return Math.min(100, strength);
}

/**
 * Calculate volatility factor strength (0-100)
 */
function calculateVolatilityStrength(vix: VIXData): number {
  let strength = 0;
  
  // VIX level assessment (0-50 points)
  const vixLevel = vix.value;
  if (vixLevel <= 12) strength += 50; // Very low VIX
  else if (vixLevel <= 15) strength += 45;
  else if (vixLevel <= 18) strength += 40;
  else if (vixLevel <= 20) strength += 30; // Regime threshold
  else if (vixLevel <= 25) strength += 20;
  else if (vixLevel <= 30) strength += 10;
  else strength += 5; // High VIX
  
  // VIX trend direction (0-30 points)
  const vixChange = vix.change;
  const vixChangePercent = Math.abs(vix.changePercent);
  
  if (vixChangePercent >= 10) {
    // Large VIX move
    if (vixChange < 0) strength += 30; // VIX falling strongly
    else strength += 5; // VIX rising strongly (bearish)
  } else if (vixChangePercent >= 5) {
    // Moderate VIX move
    if (vixChange < 0) strength += 25; // VIX falling
    else strength += 10; // VIX rising
  } else {
    // Small VIX move
    strength += 20; // Stability is good
  }
  
  // 5-day VIX trend (0-20 points)
  const fiveDayChange = vix.fiveDayChange;
  if (Math.abs(fiveDayChange) >= 5) {
    if (fiveDayChange < 0) strength += 20; // VIX declining over 5 days
    else strength += 5; // VIX rising over 5 days
  } else {
    strength += 15; // Stable VIX
  }
  
  return Math.min(100, strength);
}

/**
 * Calculate gamma factor strength (0-100)
 */
function calculateGammaStrength(gamma: GammaData): number {
  let strength = 0;
  
  // Gamma exposure level (0-40 points)
  const gexBillions = gamma.gex / 1000000000; // Convert to billions
  const absGex = Math.abs(gexBillions);
  
  if (absGex >= 3) strength += 40; // Very high gamma exposure
  else if (absGex >= 2) strength += 35;
  else if (absGex >= 1) strength += 30;
  else if (absGex >= 0.5) strength += 25;
  else strength += 15; // Low gamma exposure
  
  // Gamma bias assessment (0-35 points)
  switch (gamma.bias) {
    case 'supportive':
      strength += 35; // Best for trending markets
      break;
    case 'neutral':
      strength += 20;
      break;
    case 'suppressive':
      strength += 10; // Can limit moves
      break;
  }
  
  // Zero gamma distance (0-25 points)
  const zeroGammaDist = gamma.zeroGammaDist;
  if (zeroGammaDist <= 0.005) strength += 25; // Very close to zero gamma
  else if (zeroGammaDist <= 0.01) strength += 20; // Close to zero gamma (regime threshold)
  else if (zeroGammaDist <= 0.02) strength += 15;
  else if (zeroGammaDist <= 0.05) strength += 10;
  else strength += 5; // Far from zero gamma
  
  return Math.min(100, strength);
}

/**
 * Calculate overall regime strength from factor strengths
 */
function calculateOverallStrength(
  factorStrengths: { breadth: number; trend: number; ema: number; volatility: number; gamma: number },
  factors: RegimeFactors
): number {
  // Weight factors based on their importance and current alignment
  const weights = {
    breadth: 0.25,    // Most important - market participation
    trend: 0.25,      // Momentum is key
    ema: 0.20,        // Trend confirmation
    volatility: 0.15, // Risk environment
    gamma: 0.15       // Market structure
  };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  // Only include aligned factors in strength calculation
  if (factors.breadth) {
    weightedSum += factorStrengths.breadth * weights.breadth;
    totalWeight += weights.breadth;
  }
  
  if (factors.emaAlignment) {
    weightedSum += factorStrengths.ema * weights.ema;
    totalWeight += weights.ema;
  }
  
  if (factors.trendScore) {
    weightedSum += factorStrengths.trend * weights.trend;
    totalWeight += weights.trend;
  }
  
  if (factors.volatility) {
    weightedSum += factorStrengths.volatility * weights.volatility;
    totalWeight += weights.volatility;
  }
  
  if (factors.gamma) {
    weightedSum += factorStrengths.gamma * weights.gamma;
    totalWeight += weights.gamma;
  }
  
  // If no factors are aligned, return low strength
  if (totalWeight === 0) return 10;
  
  // Calculate weighted average and apply alignment bonus
  const baseStrength = weightedSum / totalWeight;
  const alignmentBonus = (totalWeight / 1.0) * 10; // Bonus for more factors aligned
  
  return Math.min(100, baseStrength + alignmentBonus);
}

/**
 * Calculate regime durability score (how likely to persist)
 */
function calculateDurabilityScore(snapshot: MarketSnapshot, overallStrength: number): number {
  let durability = overallStrength * 0.6; // Base from overall strength
  
  // Add durability factors
  
  // Breadth persistence
  if (snapshot.breadth.breadthPct > 0.7 || snapshot.breadth.breadthPct < 0.3) {
    durability += 15; // Extreme breadth tends to persist
  }
  
  // Trend momentum
  if (Math.abs(snapshot.indexes.SPY.trendScore9) >= 6) {
    durability += 10; // Strong momentum persists
  }
  
  // VIX stability
  if (snapshot.vix.value < 15 || snapshot.vix.value > 30) {
    durability += 10; // Extreme VIX levels tend to persist short-term
  }
  
  // Volume confirmation
  if (snapshot.indexes.SPY.volume > 40000000) {
    durability += 5; // High volume supports persistence
  }
  
  return Math.min(100, durability);
}

/**
 * Calculate vulnerability score (how likely to change)
 */
function calculateVulnerabilityScore(
  snapshot: MarketSnapshot,
  factorStrengths: { breadth: number; trend: number; ema: number; volatility: number; gamma: number }
): number {
  let vulnerability = 0;
  
  // Factor weakness analysis
  const weakFactors = Object.values(factorStrengths).filter(strength => strength < 30).length;
  vulnerability += weakFactors * 15; // Each weak factor adds vulnerability
  
  // Breadth deterioration
  if (snapshot.breadth.breadthPct > 0.5 && snapshot.breadth.breadthPct < 0.6) {
    vulnerability += 20; // Breadth in danger zone
  }
  
  // Momentum deceleration
  if (Math.abs(snapshot.indexes.SPY.trendScore9) <= 2) {
    vulnerability += 15; // Weak momentum
  }
  
  // VIX warning signs
  if (snapshot.vix.value > 18 && snapshot.vix.change > 0) {
    vulnerability += 15; // Rising VIX
  }
  
  // EMA compression
  const emaSpread = Math.abs(snapshot.indexes.SPY.ema20 - snapshot.indexes.SPY.ema50) / snapshot.indexes.SPY.ema50;
  if (emaSpread < 0.005) {
    vulnerability += 10; // EMAs converging
  }
  
  // Gamma instability
  if (snapshot.gamma.zeroGammaDist > 0.02) {
    vulnerability += 10; // Far from zero gamma
  }
  
  return Math.min(100, vulnerability);
}

/**
 * Detect early warning signals
 */
function detectEarlyWarnings(
  snapshot: MarketSnapshot,
  factorStrengths: { breadth: number; trend: number; ema: number; volatility: number; gamma: number }
): EarlyWarningSignals {
  const warningFactors: string[] = [];
  let bullToBearWarning = false;
  let bearToBullWarning = false;
  let confirmationLevel: ConfidenceLevel = 'low';
  
  const currentRegime = snapshot.regime;
  
  if (currentRegime === 'BULL') {
    // Check for BULL deterioration
    if (factorStrengths.breadth < 40) warningFactors.push('Breadth weakening');
    if (factorStrengths.trend < 30) warningFactors.push('Momentum slowing');
    if (factorStrengths.volatility < 40) warningFactors.push('Volatility rising');
    if (factorStrengths.ema < 30) warningFactors.push('EMA support weakening');
    if (factorStrengths.gamma < 30) warningFactors.push('Gamma turning suppressive');
    
    bullToBearWarning = warningFactors.length >= 2;
  }
  
  if (currentRegime === 'BEAR') {
    // Check for BEAR improvement
    if (factorStrengths.breadth > 60) warningFactors.push('Breadth improving');
    if (factorStrengths.trend > 70) warningFactors.push('Momentum building');
    if (factorStrengths.volatility > 60) warningFactors.push('Volatility declining');
    if (factorStrengths.ema > 70) warningFactors.push('EMA alignment improving');
    if (factorStrengths.gamma > 70) warningFactors.push('Gamma turning supportive');
    
    bearToBullWarning = warningFactors.length >= 2;
  }
  
  // Determine confirmation level
  if (warningFactors.length >= 4) confirmationLevel = 'high';
  else if (warningFactors.length >= 3) confirmationLevel = 'medium';
  else if (warningFactors.length >= 2) confirmationLevel = 'low';
  
  return {
    bullToBearWarning,
    bearToBullWarning,
    confirmationLevel,
    warningFactors,
    timeframe: warningFactors.length >= 3 ? '1-3 days' : warningFactors.length >= 2 ? '3-7 days' : '1-2 weeks'
  };
}

/**
 * Determine recommended action based on strength and vulnerability
 */
function determineRecommendedAction(
  overallStrength: number,
  vulnerabilityScore: number,
  earlyWarnings: EarlyWarningSignals
): 'aggressive' | 'cautious' | 'defensive' | 'wait' {
  // High strength, low vulnerability = aggressive
  if (overallStrength >= 70 && vulnerabilityScore <= 30) {
    return 'aggressive';
  }
  
  // High warnings = defensive
  if (earlyWarnings.confirmationLevel === 'high' || vulnerabilityScore >= 70) {
    return 'defensive';
  }
  
  // Medium strength with some warnings = cautious
  if (overallStrength >= 50 && vulnerabilityScore <= 50) {
    return 'cautious';
  }
  
  // Low strength or high uncertainty = wait
  return 'wait';
}

/**
 * Get regime strength summary for display
 */
export function getRegimeStrengthSummary(analysis: RegimeStrengthAnalysis): {
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  description: string;
  keyStrengths: string[];
  keyWeaknesses: string[];
} {
  const strength = analysis.overallStrength;
  
  let grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  let description: string;
  
  if (strength >= 90) {
    grade = 'A+';
    description = 'Exceptional regime strength with all factors aligned';
  } else if (strength >= 80) {
    grade = 'A';
    description = 'Strong regime with solid factor support';
  } else if (strength >= 70) {
    grade = 'B+';
    description = 'Good regime strength with minor weaknesses';
  } else if (strength >= 60) {
    grade = 'B';
    description = 'Moderate regime strength with some concerns';
  } else if (strength >= 50) {
    grade = 'C+';
    description = 'Weak regime strength with mixed signals';
  } else if (strength >= 40) {
    grade = 'C';
    description = 'Poor regime strength with significant weaknesses';
  } else if (strength >= 30) {
    grade = 'D';
    description = 'Very weak regime likely to change soon';
  } else {
    grade = 'F';
    description = 'Failed regime with imminent change expected';
  }
  
  // Identify key strengths and weaknesses
  const keyStrengths: string[] = [];
  const keyWeaknesses: string[] = [];
  
  const factors = analysis.factorStrengths;
  
  if (factors.breadth >= 70) keyStrengths.push('Strong market breadth');
  else if (factors.breadth <= 30) keyWeaknesses.push('Weak market breadth');
  
  if (factors.trend >= 70) keyStrengths.push('Strong momentum');
  else if (factors.trend <= 30) keyWeaknesses.push('Weak momentum');
  
  if (factors.ema >= 70) keyStrengths.push('Clear trend alignment');
  else if (factors.ema <= 30) keyWeaknesses.push('Poor trend alignment');
  
  if (factors.volatility >= 70) keyStrengths.push('Favorable volatility environment');
  else if (factors.volatility <= 30) keyWeaknesses.push('Unfavorable volatility');
  
  if (factors.gamma >= 70) keyStrengths.push('Supportive options structure');
  else if (factors.gamma <= 30) keyWeaknesses.push('Suppressive options structure');
  
  return {
    grade,
    description,
    keyStrengths,
    keyWeaknesses
  };
}