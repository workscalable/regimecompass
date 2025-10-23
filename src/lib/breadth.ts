import { BreadthData, SectorData, SectorScores } from './types';

/**
 * Breadth Analysis System
 * Calculates market breadth from sector participation and stock advance/decline data
 * Core component for regime classification (Factor 1)
 */

/**
 * Calculate breadth percentage from sector data
 * This is the primary breadth metric used in regime classification
 */
export function calculateBreadthFromSectors(sectors: Record<string, SectorData>): number {
  const sectorArray = Object.values(sectors);
  if (sectorArray.length === 0) return 0.5; // Default neutral if no data

  // Count sectors with positive performance (advancing)
  const advancingSectors = sectorArray.filter(sector => sector.changePercent > 0).length;
  
  return advancingSectors / sectorArray.length;
}

/**
 * Calculate breadth percentage from sector trend scores
 * Uses 9-day trend scores for more robust breadth calculation
 */
export function calculateBreadthFromTrendScores(sectorScores: SectorScores): number {
  const scores = Object.values(sectorScores);
  if (scores.length === 0) return 0.5;

  // Count sectors with positive trend scores (net advancing over 9 days)
  const advancingCount = scores.filter(score => score > 0).length;
  
  return advancingCount / scores.length;
}

/**
 * Calculate comprehensive breadth data from sector information
 */
export function calculateComprehensiveBreadth(
  sectors: Record<string, SectorData>,
  sectorScores?: SectorScores
): BreadthData {
  const sectorArray = Object.values(sectors);
  
  // Basic advance/decline from sector performance
  const advancingSectors = sectorArray.filter(s => s.changePercent > 0);
  const decliningStectors = sectorArray.filter(s => s.changePercent < 0);
  const unchangedSectors = sectorArray.filter(s => s.changePercent === 0);
  
  // Calculate breadth percentage
  const breadthPct = advancingSectors.length / sectorArray.length;
  
  // Estimate stock counts (approximate based on sector representation)
  // Each major sector represents roughly 45-50 stocks in major indices
  const stocksPerSector = 45;
  const totalStocks = sectorArray.length * stocksPerSector;
  const advancingStocks = Math.round(breadthPct * totalStocks);
  const decliningStocks = totalStocks - advancingStocks - (unchangedSectors.length * stocksPerSector);
  
  // Calculate new highs/lows based on sector strength
  const strongSectors = sectorArray.filter(s => s.changePercent > 2); // >2% gain
  const weakSectors = sectorArray.filter(s => s.changePercent < -2); // >2% loss
  
  const newHighs = Math.round(strongSectors.length * stocksPerSector * 0.1); // 10% of strong sector stocks
  const newLows = Math.round(weakSectors.length * stocksPerSector * 0.1); // 10% of weak sector stocks
  
  // Advance/Decline ratio
  const advanceDeclineRatio = decliningStocks > 0 ? advancingStocks / decliningStocks : advancingStocks;

  return {
    breadthPct,
    advancingStocks,
    decliningStocks,
    unchangedStocks: unchangedSectors.length * stocksPerSector,
    newHighs,
    newLows,
    advanceDeclineRatio
  };
}

/**
 * Analyze breadth momentum and trend
 */
export function analyzeBreadthMomentum(
  currentBreadth: BreadthData,
  historicalBreadth?: BreadthData[]
): {
  momentum: 'accelerating' | 'decelerating' | 'stable';
  trend: 'improving' | 'deteriorating' | 'sideways';
  strength: number; // 0-1 scale
  divergence: boolean;
} {
  let momentum: 'accelerating' | 'decelerating' | 'stable' = 'stable';
  let trend: 'improving' | 'deteriorating' | 'sideways' = 'sideways';
  let strength = currentBreadth.breadthPct;
  let divergence = false;

  if (historicalBreadth && historicalBreadth.length >= 2) {
    const previous = historicalBreadth[historicalBreadth.length - 1];
    const twoDaysAgo = historicalBreadth[historicalBreadth.length - 2];
    
    // Calculate momentum (rate of change)
    const currentChange = currentBreadth.breadthPct - previous.breadthPct;
    const previousChange = previous.breadthPct - twoDaysAgo.breadthPct;
    
    if (Math.abs(currentChange) > Math.abs(previousChange)) {
      momentum = 'accelerating';
    } else if (Math.abs(currentChange) < Math.abs(previousChange)) {
      momentum = 'decelerating';
    }
    
    // Calculate trend over longer period
    if (historicalBreadth.length >= 5) {
      const fiveDayAvg = historicalBreadth.slice(-5).reduce((sum, b) => sum + b.breadthPct, 0) / 5;
      
      if (currentBreadth.breadthPct > fiveDayAvg + 0.05) {
        trend = 'improving';
      } else if (currentBreadth.breadthPct < fiveDayAvg - 0.05) {
        trend = 'deteriorating';
      }
    }
    
    // Check for divergence (breadth vs price action)
    // This would require price data to implement fully
    // For now, use advance/decline ratio as proxy
    if (currentBreadth.advanceDeclineRatio < 0.8 && currentBreadth.breadthPct > 0.6) {
      divergence = true; // Breadth weakening despite positive percentage
    }
  }

  // Calculate strength score
  strength = calculateBreadthStrength(currentBreadth);

  return {
    momentum,
    trend,
    strength,
    divergence
  };
}

/**
 * Calculate breadth strength score (0-1 scale)
 */
export function calculateBreadthStrength(breadth: BreadthData): number {
  let strength = 0;
  
  // Base breadth percentage (0-40 points)
  strength += breadth.breadthPct * 40;
  
  // Advance/decline ratio (0-25 points)
  const adRatio = Math.min(3, breadth.advanceDeclineRatio); // Cap at 3:1
  strength += (adRatio / 3) * 25;
  
  // New highs vs new lows (0-20 points)
  const totalHighsLows = breadth.newHighs + breadth.newLows;
  if (totalHighsLows > 0) {
    const highsRatio = breadth.newHighs / totalHighsLows;
    strength += highsRatio * 20;
  } else {
    strength += 10; // Neutral if no new highs/lows
  }
  
  // Participation rate (0-15 points)
  const totalParticipation = breadth.advancingStocks + breadth.decliningStocks;
  const participationRate = totalParticipation / (totalParticipation + breadth.unchangedStocks);
  strength += participationRate * 15;
  
  return Math.min(1, strength / 100);
}

/**
 * Identify breadth patterns and signals
 */
export function identifyBreadthPatterns(
  currentBreadth: BreadthData,
  historicalBreadth?: BreadthData[]
): {
  pattern: 'thrust' | 'divergence' | 'exhaustion' | 'accumulation' | 'distribution' | 'neutral';
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
} {
  let pattern: 'thrust' | 'divergence' | 'exhaustion' | 'accumulation' | 'distribution' | 'neutral' = 'neutral';
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let confidence = 0.5;
  let description = 'No clear breadth pattern detected';

  // Breadth thrust pattern (90%+ breadth)
  if (currentBreadth.breadthPct >= 0.9) {
    pattern = 'thrust';
    signal = 'bullish';
    confidence = 0.8;
    description = 'Breadth thrust detected - strong bullish signal';
  }
  
  // Breadth exhaustion (very low breadth)
  else if (currentBreadth.breadthPct <= 0.1) {
    pattern = 'exhaustion';
    signal = 'bullish'; // Contrarian signal
    confidence = 0.7;
    description = 'Breadth exhaustion - potential oversold bounce';
  }
  
  // Check for patterns requiring historical data
  if (historicalBreadth && historicalBreadth.length >= 3) {
    const recent = historicalBreadth.slice(-3);
    const avgRecent = recent.reduce((sum, b) => sum + b.breadthPct, 0) / 3;
    
    // Accumulation pattern (steadily improving breadth)
    if (currentBreadth.breadthPct > avgRecent + 0.1 && 
        recent.every((b, i) => i === 0 || b.breadthPct >= recent[i-1].breadthPct)) {
      pattern = 'accumulation';
      signal = 'bullish';
      confidence = 0.65;
      description = 'Accumulation pattern - breadth steadily improving';
    }
    
    // Distribution pattern (steadily deteriorating breadth)
    else if (currentBreadth.breadthPct < avgRecent - 0.1 && 
             recent.every((b, i) => i === 0 || b.breadthPct <= recent[i-1].breadthPct)) {
      pattern = 'distribution';
      signal = 'bearish';
      confidence = 0.65;
      description = 'Distribution pattern - breadth steadily deteriorating';
    }
    
    // Divergence pattern (breadth not confirming)
    else if (historicalBreadth.length >= 5) {
      const momentum = analyzeBreadthMomentum(currentBreadth, historicalBreadth);
      if (momentum.divergence) {
        pattern = 'divergence';
        signal = 'bearish';
        confidence = 0.6;
        description = 'Breadth divergence - participation weakening';
      }
    }
  }

  return {
    pattern,
    signal,
    confidence,
    description
  };
}

/**
 * Generate breadth-based trading signals
 */
export function generateBreadthSignals(breadth: BreadthData): {
  regimeSupport: 'bull' | 'bear' | 'neutral';
  actionSignal: 'buy' | 'sell' | 'hold' | 'reduce';
  urgency: 'high' | 'medium' | 'low';
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let regimeSupport: 'bull' | 'bear' | 'neutral' = 'neutral';
  let actionSignal: 'buy' | 'sell' | 'hold' | 'reduce' = 'hold';
  let urgency: 'high' | 'medium' | 'low' = 'low';

  // Regime support analysis
  if (breadth.breadthPct >= 0.62) {
    regimeSupport = 'bull';
    reasoning.push(`Strong breadth at ${(breadth.breadthPct * 100).toFixed(1)}% supports BULL regime`);
  } else if (breadth.breadthPct <= 0.38) {
    regimeSupport = 'bear';
    reasoning.push(`Weak breadth at ${(breadth.breadthPct * 100).toFixed(1)}% supports BEAR regime`);
  } else {
    reasoning.push(`Neutral breadth at ${(breadth.breadthPct * 100).toFixed(1)}% - mixed signals`);
  }

  // Action signals based on breadth extremes
  if (breadth.breadthPct >= 0.9) {
    actionSignal = 'buy';
    urgency = 'high';
    reasoning.push('Breadth thrust above 90% - strong buy signal');
  } else if (breadth.breadthPct >= 0.75) {
    actionSignal = 'buy';
    urgency = 'medium';
    reasoning.push('Strong breadth above 75% - favorable for longs');
  } else if (breadth.breadthPct <= 0.1) {
    actionSignal = 'buy';
    urgency = 'medium';
    reasoning.push('Breadth exhaustion below 10% - oversold bounce candidate');
  } else if (breadth.breadthPct <= 0.25) {
    actionSignal = 'reduce';
    urgency = 'high';
    reasoning.push('Very weak breadth below 25% - reduce long exposure');
  } else if (breadth.breadthPct <= 0.4) {
    actionSignal = 'reduce';
    urgency = 'medium';
    reasoning.push('Weak breadth below 40% - caution warranted');
  }

  // Advance/decline ratio considerations
  if (breadth.advanceDeclineRatio > 2) {
    reasoning.push(`Strong A/D ratio of ${breadth.advanceDeclineRatio.toFixed(2)} confirms breadth`);
  } else if (breadth.advanceDeclineRatio < 0.5) {
    reasoning.push(`Weak A/D ratio of ${breadth.advanceDeclineRatio.toFixed(2)} shows internal weakness`);
    if (actionSignal === 'buy') actionSignal = 'hold';
    if (actionSignal === 'hold') actionSignal = 'reduce';
  }

  // New highs/lows analysis
  const newHighsRatio = breadth.newHighs / (breadth.newHighs + breadth.newLows);
  if (breadth.newHighs > breadth.newLows * 2) {
    reasoning.push(`New highs (${breadth.newHighs}) dominating new lows (${breadth.newLows})`);
  } else if (breadth.newLows > breadth.newHighs * 2) {
    reasoning.push(`New lows (${breadth.newLows}) dominating new highs (${breadth.newHighs})`);
    if (urgency === 'low') urgency = 'medium';
  }

  return {
    regimeSupport,
    actionSignal,
    urgency,
    reasoning
  };
}

/**
 * Calculate sector participation rate
 */
export function calculateSectorParticipation(sectors: Record<string, SectorData>): {
  participationRate: number;
  leadingSectors: string[];
  laggingSectors: string[];
  rotationSignal: 'into_growth' | 'into_value' | 'into_defensive' | 'mixed';
} {
  const sectorArray = Object.values(sectors);
  const totalSectors = sectorArray.length;
  
  // Calculate participation (sectors with meaningful moves)
  const activeSectors = sectorArray.filter(s => Math.abs(s.changePercent) > 0.5);
  const participationRate = activeSectors.length / totalSectors;
  
  // Identify leading and lagging sectors
  const sortedSectors = sectorArray.sort((a, b) => b.changePercent - a.changePercent);
  const leadingSectors = sortedSectors.slice(0, 3).map(s => s.symbol);
  const laggingSectors = sortedSectors.slice(-3).map(s => s.symbol);
  
  // Determine rotation signal based on sector performance
  let rotationSignal: 'into_growth' | 'into_value' | 'into_defensive' | 'mixed' = 'mixed';
  
  const growthSectors = ['XLK', 'XLY', 'XLC']; // Tech, Consumer Disc, Communications
  const valueSectors = ['XLF', 'XLE', 'XLI']; // Financials, Energy, Industrials
  const defensiveSectors = ['XLU', 'XLP', 'XLV']; // Utilities, Staples, Healthcare
  
  const growthPerf = leadingSectors.filter(s => growthSectors.includes(s)).length;
  const valuePerf = leadingSectors.filter(s => valueSectors.includes(s)).length;
  const defensivePerf = leadingSectors.filter(s => defensiveSectors.includes(s)).length;
  
  if (growthPerf >= 2) rotationSignal = 'into_growth';
  else if (valuePerf >= 2) rotationSignal = 'into_value';
  else if (defensivePerf >= 2) rotationSignal = 'into_defensive';
  
  return {
    participationRate,
    leadingSectors,
    laggingSectors,
    rotationSignal
  };
}