import { 
  SectorData, 
  SectorScores, 
  SectorRecommendations, 
  SectorAllocation 
} from './types';
import { 
  SECTOR_CLASSIFICATIONS, 
  calculateSectorScores, 
  detectSectorRotation,
  calculateGroupPerformance
} from './sectorAnalysis';

/**
 * Sector Rotation Logic and Recommendations System
 * Implements overweight/underweight recommendations and portfolio allocation
 * Based on sector rotation patterns and relative strength analysis
 */

export interface RotationAnalysis {
  currentPhase: 'early_cycle' | 'mid_cycle' | 'late_cycle' | 'recession' | 'recovery';
  rotationSignal: 'into_growth' | 'into_value' | 'into_defensive' | 'mixed';
  rotationStrength: number;
  timeframe: 'short_term' | 'medium_term' | 'long_term';
  confidence: number;
  keyDrivers: string[];
}

export interface AllocationRecommendation {
  sector: string;
  name: string;
  currentWeight: number;
  recommendedWeight: number;
  adjustment: number;
  reasoning: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
}

export interface PortfolioAllocation {
  coreHoldings: AllocationRecommendation[];    // 40-60% allocation
  satelliteHoldings: AllocationRecommendation[]; // 20-40% allocation
  tacticalHoldings: AllocationRecommendation[];  // 10-20% allocation
  cashRecommendation: number;
}

/**
 * Create sector rotation recommendations
 */
export function createSectorRotationRecommendations(
  sectors: Record<string, SectorData>,
  currentRegime: string
): {
  recommendations: SectorRecommendations;
  rotationAnalysis: RotationAnalysis;
  allocationRecommendations: AllocationRecommendation[];
} {
  const scores = calculateSectorScores(sectors);
  
  // Analyze rotation patterns
  const rotationAnalysis = analyzeRotationPhase(scores, currentRegime);
  
  // Generate basic recommendations
  const recommendations = generateBasicRecommendations(scores);
  
  // Create detailed allocation recommendations
  const allocationRecommendations = generateAllocationRecommendations(
    sectors, 
    scores, 
    rotationAnalysis
  );
  
  return {
    recommendations,
    rotationAnalysis,
    allocationRecommendations
  };
}

/**
 * Analyze current rotation phase and patterns
 */
function analyzeRotationPhase(scores: SectorScores, currentRegime: string): RotationAnalysis {
  const groupPerformance = calculateGroupPerformance(scores);
  const rotation = detectSectorRotation(scores);
  
  // Determine cycle phase based on sector performance patterns
  let currentPhase: RotationAnalysis['currentPhase'] = 'mid_cycle';
  let timeframe: RotationAnalysis['timeframe'] = 'medium_term';
  let confidence = 0.6;
  const keyDrivers: string[] = [];
  
  // Early Cycle: Technology and Financials leading
  if (groupPerformance.technology > 3 && groupPerformance.value > 2) {
    currentPhase = 'early_cycle';
    keyDrivers.push('Technology and Financials leading');
    confidence = 0.7;
  }
  
  // Mid Cycle: Industrials and Consumer Discretionary strong
  else if (groupPerformance.cyclical > 2 && groupPerformance.growth > 1) {
    currentPhase = 'mid_cycle';
    keyDrivers.push('Cyclical sectors showing strength');
    confidence = 0.6;
  }
  
  // Late Cycle: Energy and Materials outperforming
  else if (scores['XLE'] > 3 || scores['XLB'] > 3) {
    currentPhase = 'late_cycle';
    keyDrivers.push('Energy and Materials outperforming');
    confidence = 0.7;
  }
  
  // Recession: Defensive sectors leading
  else if (groupPerformance.defensive > groupPerformance.cyclical + 2) {
    currentPhase = 'recession';
    keyDrivers.push('Defensive sectors outperforming');
    confidence = 0.8;
    timeframe = 'long_term';
  }
  
  // Recovery: Financials and Technology starting to lead
  else if (scores['XLF'] > 2 && scores['XLK'] > 1 && currentRegime === 'BEAR') {
    currentPhase = 'recovery';
    keyDrivers.push('Early signs of recovery in growth sectors');
    confidence = 0.5;
    timeframe = 'long_term';
  }
  
  // Add regime-based insights
  if (currentRegime === 'BULL') {
    keyDrivers.push('BULL regime supports risk-on positioning');
  } else if (currentRegime === 'BEAR') {
    keyDrivers.push('BEAR regime favors defensive positioning');
  }
  
  // Determine rotation strength and timeframe
  let rotationStrength = rotation.rotationStrength;
  if (rotation.rotationInProgress) {
    keyDrivers.push(`${rotation.rotationType.replace('_', ' ')} rotation in progress`);
    timeframe = rotationStrength > 0.7 ? 'short_term' : 'medium_term';
  }
  
  return {
    currentPhase,
    rotationSignal: rotation.rotationType === 'none' ? 'mixed' : 
                   rotation.rotationType === 'value_to_growth' ? 'into_growth' :
                   rotation.rotationType === 'growth_to_value' ? 'into_value' :
                   rotation.rotationType === 'risk_off' ? 'into_defensive' : 'mixed',
    rotationStrength,
    timeframe,
    confidence,
    keyDrivers
  };
}

/**
 * Generate basic sector recommendations
 */
function generateBasicRecommendations(scores: SectorScores): SectorRecommendations {
  const sortedSectors = Object.entries(scores).sort(([,a], [,b]) => b - a);
  
  // Top 3 sectors for overweighting (score >= 5 or top performers)
  const overweight = sortedSectors
    .filter(([, score]) => score >= 5)
    .slice(0, 3)
    .map(([symbol]) => symbol);
  
  // If less than 3 strong sectors, add top performers
  if (overweight.length < 3) {
    const additionalSectors = sortedSectors
      .filter(([symbol, score]) => !overweight.includes(symbol) && score >= 1)
      .slice(0, 3 - overweight.length)
      .map(([symbol]) => symbol);
    overweight.push(...additionalSectors);
  }
  
  // Bottom sectors for underweighting (score <= -3)
  const underweight = sortedSectors
    .filter(([, score]) => score <= -3)
    .map(([symbol]) => symbol);
  
  // Neutral sectors (not in overweight or underweight)
  const neutral = sortedSectors
    .filter(([symbol, score]) => 
      !overweight.includes(symbol) && 
      !underweight.includes(symbol) && 
      score > -3 && score < 5
    )
    .map(([symbol]) => symbol);
  
  // Determine rotation signal
  const groupPerf = calculateGroupPerformance(scores);
  let rotationSignal: SectorRecommendations['rotationSignal'] = 'mixed';
  
  if (groupPerf.growth > groupPerf.value + 1) {
    rotationSignal = 'into_growth';
  } else if (groupPerf.value > groupPerf.growth + 1) {
    rotationSignal = 'into_value';
  } else if (groupPerf.defensive > groupPerf.cyclical + 1) {
    rotationSignal = 'into_defensive';
  }
  
  return {
    overweight,
    underweight,
    neutral,
    rotationSignal
  };
}

/**
 * Generate detailed allocation recommendations
 */
function generateAllocationRecommendations(
  sectors: Record<string, SectorData>,
  scores: SectorScores,
  rotationAnalysis: RotationAnalysis
): AllocationRecommendation[] {
  const recommendations: AllocationRecommendation[] = [];
  const totalSectors = Object.keys(sectors).length;
  const baseWeight = 100 / totalSectors; // Equal weight baseline
  
  Object.entries(sectors).forEach(([symbol, data]) => {
    const score = scores[symbol];
    const recommendation = generateSectorAllocation(
      symbol,
      data,
      score,
      baseWeight,
      rotationAnalysis
    );
    recommendations.push(recommendation);
  });
  
  // Normalize weights to ensure they sum to 100%
  const totalWeight = recommendations.reduce((sum, rec) => sum + rec.recommendedWeight, 0);
  if (totalWeight !== 100) {
    const adjustment = 100 / totalWeight;
    recommendations.forEach(rec => {
      rec.recommendedWeight *= adjustment;
      rec.adjustment = rec.recommendedWeight - rec.currentWeight;
    });
  }
  
  return recommendations.sort((a, b) => b.recommendedWeight - a.recommendedWeight);
}

/**
 * Generate allocation for individual sector
 */
function generateSectorAllocation(
  symbol: string,
  data: SectorData,
  score: number,
  baseWeight: number,
  rotationAnalysis: RotationAnalysis
): AllocationRecommendation {
  let recommendedWeight = baseWeight;
  let reasoning = 'Neutral allocation based on equal weighting';
  let confidence = 0.5;
  let priority: 'high' | 'medium' | 'low' = 'medium';
  
  // Adjust based on trend score
  if (score >= 7) {
    recommendedWeight = baseWeight * 2.0; // Double weight for very strong sectors
    reasoning = `Very strong trend score (${score}) warrants overweight`;
    confidence = 0.8;
    priority = 'high';
  } else if (score >= 5) {
    recommendedWeight = baseWeight * 1.5; // 50% overweight
    reasoning = `Strong trend score (${score}) suggests overweight`;
    confidence = 0.7;
    priority = 'high';
  } else if (score >= 3) {
    recommendedWeight = baseWeight * 1.2; // 20% overweight
    reasoning = `Positive trend score (${score}) supports modest overweight`;
    confidence = 0.6;
    priority = 'medium';
  } else if (score <= -5) {
    recommendedWeight = baseWeight * 0.3; // Significant underweight
    reasoning = `Very weak trend score (${score}) warrants significant underweight`;
    confidence = 0.8;
    priority = 'high';
  } else if (score <= -3) {
    recommendedWeight = baseWeight * 0.5; // 50% underweight
    reasoning = `Weak trend score (${score}) suggests underweight`;
    confidence = 0.7;
    priority = 'high';
  } else if (score <= 0) {
    recommendedWeight = baseWeight * 0.8; // 20% underweight
    reasoning = `Negative trend score (${score}) suggests modest underweight`;
    confidence = 0.6;
    priority = 'medium';
  }
  
  // Adjust based on rotation analysis
  const rotationAdjustment = getRotationAdjustment(symbol, rotationAnalysis);
  recommendedWeight *= rotationAdjustment.multiplier;
  
  if (rotationAdjustment.multiplier !== 1) {
    reasoning += `. ${rotationAdjustment.reason}`;
    confidence = Math.min(0.9, confidence + 0.1);
  }
  
  // Ensure reasonable bounds
  recommendedWeight = Math.max(1, Math.min(25, recommendedWeight)); // 1-25% range
  
  return {
    sector: symbol,
    name: data.name,
    currentWeight: baseWeight,
    recommendedWeight,
    adjustment: recommendedWeight - baseWeight,
    reasoning,
    confidence,
    priority
  };
}

/**
 * Get rotation-based adjustment for sector
 */
function getRotationAdjustment(
  symbol: string,
  rotationAnalysis: RotationAnalysis
): { multiplier: number; reason: string } {
  let multiplier = 1.0;
  let reason = '';
  
  const { rotationSignal, rotationStrength, currentPhase } = rotationAnalysis;
  
  // Growth sectors
  if (SECTOR_CLASSIFICATIONS.growth.includes(symbol)) {
    if (rotationSignal === 'into_growth') {
      multiplier = 1 + (rotationStrength * 0.3);
      reason = 'Rotation into growth sectors favors this position';
    } else if (rotationSignal === 'into_value') {
      multiplier = 1 - (rotationStrength * 0.2);
      reason = 'Rotation away from growth sectors reduces allocation';
    }
  }
  
  // Value sectors
  if (SECTOR_CLASSIFICATIONS.value.includes(symbol)) {
    if (rotationSignal === 'into_value') {
      multiplier = 1 + (rotationStrength * 0.3);
      reason = 'Rotation into value sectors favors this position';
    } else if (rotationSignal === 'into_growth') {
      multiplier = 1 - (rotationStrength * 0.2);
      reason = 'Rotation away from value sectors reduces allocation';
    }
  }
  
  // Defensive sectors
  if (SECTOR_CLASSIFICATIONS.defensive.includes(symbol)) {
    if (rotationSignal === 'into_defensive') {
      multiplier = 1 + (rotationStrength * 0.4);
      reason = 'Flight to quality favors defensive sectors';
    } else if (currentPhase === 'early_cycle' || currentPhase === 'mid_cycle') {
      multiplier = 0.8;
      reason = 'Risk-on environment reduces defensive allocation';
    }
  }
  
  // Cyclical sectors
  if (SECTOR_CLASSIFICATIONS.cyclical.includes(symbol)) {
    if (currentPhase === 'early_cycle' || currentPhase === 'mid_cycle') {
      multiplier = 1.2;
      reason = 'Economic expansion favors cyclical sectors';
    } else if (currentPhase === 'recession') {
      multiplier = 0.7;
      reason = 'Economic contraction hurts cyclical sectors';
    }
  }
  
  // Specific sector adjustments
  switch (symbol) {
    case 'XLK': // Technology
      if (currentPhase === 'early_cycle' || currentPhase === 'recovery') {
        multiplier *= 1.1;
        reason += ' Technology leads in early cycle phases';
      }
      break;
      
    case 'XLF': // Financials
      if (currentPhase === 'early_cycle') {
        multiplier *= 1.2;
        reason += ' Financials benefit from rising rates in early cycle';
      }
      break;
      
    case 'XLE': // Energy
      if (currentPhase === 'late_cycle') {
        multiplier *= 1.3;
        reason += ' Energy outperforms in late cycle phases';
      }
      break;
      
    case 'XLU': // Utilities
      if (rotationSignal === 'into_defensive') {
        multiplier *= 1.2;
        reason += ' Utilities provide defensive characteristics';
      }
      break;
  }
  
  return { multiplier, reason };
}

/**
 * Create portfolio allocation recommendations
 */
export function createPortfolioAllocation(
  allocationRecommendations: AllocationRecommendation[],
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): PortfolioAllocation {
  // Sort by priority and recommended weight
  const sortedRecs = allocationRecommendations.sort((a, b) => {
    const priorityScore = { high: 3, medium: 2, low: 1 };
    return (priorityScore[b.priority] * b.recommendedWeight) - (priorityScore[a.priority] * a.recommendedWeight);
  });
  
  // Allocate based on risk tolerance
  const allocations = getRiskBasedAllocations(riskTolerance);
  
  const coreHoldings = sortedRecs
    .slice(0, 4)
    .map(rec => ({
      ...rec,
      recommendedWeight: rec.recommendedWeight * allocations.core
    }));
  
  const satelliteHoldings = sortedRecs
    .slice(4, 7)
    .map(rec => ({
      ...rec,
      recommendedWeight: rec.recommendedWeight * allocations.satellite
    }));
  
  const tacticalHoldings = sortedRecs
    .slice(7)
    .filter(rec => rec.priority === 'high')
    .map(rec => ({
      ...rec,
      recommendedWeight: rec.recommendedWeight * allocations.tactical
    }));
  
  return {
    coreHoldings,
    satelliteHoldings,
    tacticalHoldings,
    cashRecommendation: allocations.cash
  };
}

/**
 * Get risk-based allocation percentages
 */
function getRiskBasedAllocations(riskTolerance: 'conservative' | 'moderate' | 'aggressive') {
  switch (riskTolerance) {
    case 'conservative':
      return { core: 0.7, satellite: 0.2, tactical: 0.05, cash: 0.05 };
    case 'moderate':
      return { core: 0.6, satellite: 0.25, tactical: 0.1, cash: 0.05 };
    case 'aggressive':
      return { core: 0.5, satellite: 0.3, tactical: 0.15, cash: 0.05 };
    default:
      return { core: 0.6, satellite: 0.25, tactical: 0.1, cash: 0.05 };
  }
}

/**
 * Generate top 3 sector recommendations for overweighting
 */
export function getTop3SectorRecommendations(
  allocationRecommendations: AllocationRecommendation[]
): {
  overweight: AllocationRecommendation[];
  reasoning: string[];
} {
  const overweight = allocationRecommendations
    .filter(rec => rec.adjustment > 0)
    .sort((a, b) => b.adjustment - a.adjustment)
    .slice(0, 3);
  
  const reasoning = [
    `Top 3 overweight recommendations based on trend scores and rotation analysis`,
    `Combined allocation adjustment: +${overweight.reduce((sum, rec) => sum + rec.adjustment, 0).toFixed(1)}%`,
    `Average confidence: ${(overweight.reduce((sum, rec) => sum + rec.confidence, 0) / overweight.length * 100).toFixed(0)}%`
  ];
  
  return { overweight, reasoning };
}

/**
 * Identify sectors to avoid based on weak performance
 */
export function getSectorsToAvoid(
  allocationRecommendations: AllocationRecommendation[]
): {
  avoidList: string[];
  reasoning: string[];
} {
  const weakSectors = allocationRecommendations
    .filter(rec => rec.adjustment < -2) // More than 2% underweight
    .sort((a, b) => a.adjustment - b.adjustment);
  
  const avoidList = weakSectors.map(rec => rec.sector);
  
  const reasoning = weakSectors.map(rec => 
    `${rec.sector}: ${rec.reasoning}`
  );
  
  return { avoidList, reasoning };
}