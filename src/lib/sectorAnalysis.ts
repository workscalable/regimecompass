import { 
  SectorData, 
  SectorScores, 
  SectorRecommendations, 
  SectorAllocation, 
  RecommendationType 
} from './types';
import { trendScore9 } from './math';

/**
 * Sector Analysis System
 * Implements sector scoring, rotation analysis, and allocation recommendations
 * Based on 9-day trend scores and relative strength analysis
 */

export interface SectorAnalysis {
  scores: SectorScores;
  recommendations: SectorRecommendations;
  allocation: SectorAllocation[];
  rotationSignal: 'into_growth' | 'into_value' | 'into_defensive' | 'mixed';
  leadershipAnalysis: LeadershipAnalysis;
  breadthMetrics: SectorBreadthMetrics;
}

export interface LeadershipAnalysis {
  leadingSectors: string[];
  laggingSectors: string[];
  rotationInProgress: boolean;
  rotationType: 'growth_to_value' | 'value_to_growth' | 'risk_on' | 'risk_off' | 'none';
  rotationStrength: number;
}

export interface SectorBreadthMetrics {
  advancingSectors: number;
  decliningsectors: number;
  breadthRatio: number;
  participationRate: number;
  concentrationRisk: number;
}

export interface SectorPerformanceMetrics {
  symbol: string;
  name: string;
  trendScore9: number;
  relativeStrength: number;
  momentum: number;
  volatility: number;
  volume: number;
  recommendation: RecommendationType;
  confidence: number;
  reasoning: string[];
}

/**
 * Sector classifications for rotation analysis
 */
export const SECTOR_CLASSIFICATIONS = {
  growth: ['XLK', 'XLY', 'XLC'], // Technology, Consumer Discretionary, Communications
  value: ['XLF', 'XLE', 'XLI', 'XLB'], // Financials, Energy, Industrials, Materials
  defensive: ['XLU', 'XLP', 'XLV', 'XLRE'], // Utilities, Staples, Healthcare, Real Estate
  cyclical: ['XLI', 'XLB', 'XLF', 'XLE'], // Industrials, Materials, Financials, Energy
  technology: ['XLK', 'XLC'], // Technology, Communications
  consumer: ['XLY', 'XLP'], // Consumer Discretionary, Consumer Staples
};

/**
 * Calculate comprehensive sector scores
 */
export function calculateSectorScores(sectors: Record<string, SectorData>): SectorScores {
  const scores: SectorScores = {};
  
  Object.entries(sectors).forEach(([symbol, data]) => {
    // Primary score is the 9-day trend score
    scores[symbol] = data.trendScore9;
  });
  
  return scores;
}

/**
 * Build comprehensive sector scoring system
 */
export function buildSectorScoringSystem(sectors: Record<string, SectorData>): {
  scores: SectorScores;
  performanceMetrics: Record<string, SectorPerformanceMetrics>;
  rankings: {
    byTrendScore: string[];
    byRelativeStrength: string[];
    byMomentum: string[];
  };
} {
  const scores = calculateSectorScores(sectors);
  const performanceMetrics: Record<string, SectorPerformanceMetrics> = {};
  
  // Calculate performance metrics for each sector
  Object.entries(sectors).forEach(([symbol, data]) => {
    const metrics = calculateSectorPerformanceMetrics(data, sectors);
    performanceMetrics[symbol] = metrics;
  });
  
  // Create rankings
  const sectorList = Object.keys(sectors);
  
  const byTrendScore = sectorList.sort((a, b) => scores[b] - scores[a]);
  const byRelativeStrength = sectorList.sort((a, b) => 
    performanceMetrics[b].relativeStrength - performanceMetrics[a].relativeStrength
  );
  const byMomentum = sectorList.sort((a, b) => 
    performanceMetrics[b].momentum - performanceMetrics[a].momentum
  );
  
  return {
    scores,
    performanceMetrics,
    rankings: {
      byTrendScore,
      byRelativeStrength,
      byMomentum
    }
  };
}

/**
 * Calculate detailed performance metrics for a sector
 */
function calculateSectorPerformanceMetrics(
  sectorData: SectorData, 
  allSectors: Record<string, SectorData>
): SectorPerformanceMetrics {
  const symbol = sectorData.symbol;
  const trendScore9 = sectorData.trendScore9;
  
  // Calculate relative strength vs other sectors
  const allScores = Object.values(allSectors).map(s => s.trendScore9);
  const avgScore = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
  const relativeStrength = trendScore9 - avgScore;
  
  // Calculate momentum (simplified - based on recent performance)
  const momentum = sectorData.changePercent;
  
  // Calculate volatility (simplified - based on change magnitude)
  const volatility = Math.abs(sectorData.changePercent);
  
  // Volume score (normalized)
  const avgVolume = Object.values(allSectors).reduce((sum, s) => sum + s.volume, 0) / Object.keys(allSectors).length;
  const volumeScore = sectorData.volume / avgVolume;
  
  // Determine recommendation and confidence
  const { recommendation, confidence, reasoning } = determineSectorRecommendation(
    trendScore9, 
    relativeStrength, 
    momentum, 
    volatility
  );
  
  return {
    symbol,
    name: sectorData.name,
    trendScore9,
    relativeStrength,
    momentum,
    volatility,
    volume: volumeScore,
    recommendation,
    confidence,
    reasoning
  };
}

/**
 * Determine sector recommendation based on metrics
 */
function determineSectorRecommendation(
  trendScore: number,
  relativeStrength: number,
  momentum: number,
  volatility: number
): {
  recommendation: RecommendationType;
  confidence: number;
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let recommendation: RecommendationType = 'HOLD';
  let confidence = 0.5;
  
  // Strong positive signals
  if (trendScore >= 5) {
    recommendation = 'BUY';
    confidence = 0.8;
    reasoning.push(`Strong 9-day trend score of ${trendScore}`);
  }
  // Moderate positive signals
  else if (trendScore >= 3) {
    recommendation = 'BUY';
    confidence = 0.6;
    reasoning.push(`Positive 9-day trend score of ${trendScore}`);
  }
  // Weak positive signals
  else if (trendScore >= 1) {
    recommendation = 'HOLD';
    confidence = 0.5;
    reasoning.push(`Weak positive trend score of ${trendScore}`);
  }
  // Weak negative signals
  else if (trendScore >= -2) {
    recommendation = 'HOLD';
    confidence = 0.4;
    reasoning.push(`Weak negative trend score of ${trendScore}`);
  }
  // Strong negative signals
  else if (trendScore <= -3) {
    recommendation = 'AVOID';
    confidence = 0.7;
    reasoning.push(`Weak 9-day trend score of ${trendScore}`);
  }
  
  // Adjust based on relative strength
  if (relativeStrength > 2) {
    if (recommendation === 'HOLD') recommendation = 'BUY';
    confidence = Math.min(0.9, confidence + 0.1);
    reasoning.push('Strong relative strength vs other sectors');
  } else if (relativeStrength < -2) {
    if (recommendation === 'HOLD') recommendation = 'SELL';
    if (recommendation === 'BUY') recommendation = 'HOLD';
    confidence = Math.max(0.2, confidence - 0.1);
    reasoning.push('Weak relative strength vs other sectors');
  }
  
  // Adjust based on momentum
  if (momentum > 2 && recommendation === 'BUY') {
    confidence = Math.min(0.9, confidence + 0.1);
    reasoning.push('Strong recent momentum');
  } else if (momentum < -2 && recommendation !== 'AVOID') {
    confidence = Math.max(0.2, confidence - 0.1);
    reasoning.push('Weak recent momentum');
  }
  
  // Adjust for high volatility
  if (volatility > 3) {
    confidence = Math.max(0.3, confidence - 0.1);
    reasoning.push('High volatility increases uncertainty');
  }
  
  return { recommendation, confidence, reasoning };
}

/**
 * Create sector strength classification
 */
export function classifySectorStrength(scores: SectorScores): {
  strong: string[];      // Score >= 5
  moderate: string[];    // Score 1-4
  weak: string[];        // Score -2 to 0
  veryWeak: string[];    // Score <= -3
} {
  const strong: string[] = [];
  const moderate: string[] = [];
  const weak: string[] = [];
  const veryWeak: string[] = [];
  
  Object.entries(scores).forEach(([symbol, score]) => {
    if (score >= 5) {
      strong.push(symbol);
    } else if (score >= 1) {
      moderate.push(symbol);
    } else if (score >= -2) {
      weak.push(symbol);
    } else {
      veryWeak.push(symbol);
    }
  });
  
  return { strong, moderate, weak, veryWeak };
}

/**
 * Analyze relative strength between sectors
 */
export function analyzeRelativeStrength(sectors: Record<string, SectorData>): {
  rankings: Array<{
    symbol: string;
    name: string;
    relativeStrength: number;
    rank: number;
  }>;
  strengthSpread: number;
  leaderLaggardGap: number;
} {
  const sectorArray = Object.values(sectors);
  const avgPerformance = sectorArray.reduce((sum, s) => sum + s.changePercent, 0) / sectorArray.length;
  
  // Calculate relative strength for each sector
  const relativeStrengths = sectorArray.map(sector => ({
    symbol: sector.symbol,
    name: sector.name,
    relativeStrength: sector.changePercent - avgPerformance,
    performance: sector.changePercent
  }));
  
  // Sort by relative strength
  relativeStrengths.sort((a, b) => b.relativeStrength - a.relativeStrength);
  
  // Add rankings
  const rankings = relativeStrengths.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
  
  // Calculate metrics
  const strengthSpread = rankings[0].relativeStrength - rankings[rankings.length - 1].relativeStrength;
  const leaderLaggardGap = rankings[0].performance - rankings[rankings.length - 1].performance;
  
  return {
    rankings,
    strengthSpread,
    leaderLaggardGap
  };
}

/**
 * Detect sector rotation patterns
 */
export function detectSectorRotation(
  currentScores: SectorScores,
  historicalScores?: SectorScores[]
): {
  rotationInProgress: boolean;
  rotationType: 'growth_to_value' | 'value_to_growth' | 'risk_on' | 'risk_off' | 'none';
  rotationStrength: number;
  leadingGroups: string[];
  laggingGroups: string[];
} {
  // Calculate group performance
  const groupPerformance = calculateGroupPerformance(currentScores);
  
  let rotationType: 'growth_to_value' | 'value_to_growth' | 'risk_on' | 'risk_off' | 'none' = 'none';
  let rotationStrength = 0;
  let rotationInProgress = false;
  
  // Detect rotation patterns
  const growthScore = groupPerformance.growth;
  const valueScore = groupPerformance.value;
  const defensiveScore = groupPerformance.defensive;
  const cyclicalScore = groupPerformance.cyclical;
  
  // Growth vs Value rotation
  const growthValueSpread = growthScore - valueScore;
  if (Math.abs(growthValueSpread) > 2) {
    rotationInProgress = true;
    rotationType = growthValueSpread > 0 ? 'value_to_growth' : 'growth_to_value';
    rotationStrength = Math.min(1, Math.abs(growthValueSpread) / 5);
  }
  
  // Risk On vs Risk Off rotation
  const riskOnOffSpread = cyclicalScore - defensiveScore;
  if (Math.abs(riskOnOffSpread) > 2 && Math.abs(riskOnOffSpread) > Math.abs(growthValueSpread)) {
    rotationInProgress = true;
    rotationType = riskOnOffSpread > 0 ? 'risk_on' : 'risk_off';
    rotationStrength = Math.min(1, Math.abs(riskOnOffSpread) / 5);
  }
  
  // Identify leading and lagging groups
  const groupScores = [
    { name: 'growth', score: growthScore },
    { name: 'value', score: valueScore },
    { name: 'defensive', score: defensiveScore },
    { name: 'cyclical', score: cyclicalScore }
  ].sort((a, b) => b.score - a.score);
  
  const leadingGroups = groupScores.slice(0, 2).map(g => g.name);
  const laggingGroups = groupScores.slice(-2).map(g => g.name);
  
  return {
    rotationInProgress,
    rotationType,
    rotationStrength,
    leadingGroups,
    laggingGroups
  };
}

/**
 * Calculate performance for sector groups
 */
export function calculateGroupPerformance(scores: SectorScores): {
  growth: number;
  value: number;
  defensive: number;
  cyclical: number;
  technology: number;
  consumer: number;
} {
  const calculateAverage = (symbols: string[]) => {
    const validScores = symbols.filter(s => scores[s] !== undefined).map(s => scores[s]);
    return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
  };
  
  return {
    growth: calculateAverage(SECTOR_CLASSIFICATIONS.growth),
    value: calculateAverage(SECTOR_CLASSIFICATIONS.value),
    defensive: calculateAverage(SECTOR_CLASSIFICATIONS.defensive),
    cyclical: calculateAverage(SECTOR_CLASSIFICATIONS.cyclical),
    technology: calculateAverage(SECTOR_CLASSIFICATIONS.technology),
    consumer: calculateAverage(SECTOR_CLASSIFICATIONS.consumer)
  };
}

/**
 * Calculate sector breadth metrics
 */
export function calculateSectorBreadthMetrics(scores: SectorScores): SectorBreadthMetrics {
  const sectorCount = Object.keys(scores).length;
  const advancingSectors = Object.values(scores).filter(score => score > 0).length;
  const decliningsectors = Object.values(scores).filter(score => score < 0).length;
  
  const breadthRatio = sectorCount > 0 ? advancingSectors / sectorCount : 0;
  const participationRate = sectorCount > 0 ? (advancingSectors + decliningsectors) / sectorCount : 0;
  
  // Calculate concentration risk (how concentrated performance is in top sectors)
  const sortedScores = Object.values(scores).sort((a, b) => Math.abs(b) - Math.abs(a));
  const topThreeSum = sortedScores.slice(0, 3).reduce((sum, score) => sum + Math.abs(score), 0);
  const totalSum = sortedScores.reduce((sum, score) => sum + Math.abs(score), 0);
  const concentrationRisk = totalSum > 0 ? topThreeSum / totalSum : 0;
  
  return {
    advancingSectors,
    decliningsectors,
    breadthRatio,
    participationRate,
    concentrationRisk
  };
}

/**
 * Generate sector trading signals
 */
export function generateSectorTradingSignals(
  scores: SectorScores,
  performanceMetrics: Record<string, SectorPerformanceMetrics>
): {
  longCandidates: Array<{
    symbol: string;
    name: string;
    score: number;
    confidence: number;
    reasoning: string[];
  }>;
  shortCandidates: Array<{
    symbol: string;
    name: string;
    score: number;
    confidence: number;
    reasoning: string[];
  }>;
  avoidList: string[];
} {
  const longCandidates: any[] = [];
  const shortCandidates: any[] = [];
  const avoidList: string[] = [];
  
  Object.entries(performanceMetrics).forEach(([symbol, metrics]) => {
    if (metrics.recommendation === 'BUY' && metrics.confidence > 0.6) {
      longCandidates.push({
        symbol,
        name: metrics.name,
        score: metrics.trendScore9,
        confidence: metrics.confidence,
        reasoning: metrics.reasoning
      });
    } else if (metrics.recommendation === 'SELL' && metrics.confidence > 0.6) {
      shortCandidates.push({
        symbol,
        name: metrics.name,
        score: metrics.trendScore9,
        confidence: metrics.confidence,
        reasoning: metrics.reasoning
      });
    } else if (metrics.recommendation === 'AVOID') {
      avoidList.push(symbol);
    }
  });
  
  // Sort by confidence and score
  longCandidates.sort((a, b) => (b.confidence * b.score) - (a.confidence * a.score));
  shortCandidates.sort((a, b) => (b.confidence * Math.abs(b.score)) - (a.confidence * Math.abs(a.score)));
  
  return {
    longCandidates: longCandidates.slice(0, 5), // Top 5
    shortCandidates: shortCandidates.slice(0, 3), // Top 3
    avoidList
  };
}

/**
 * Analyze sector leadership changes
 */
export function analyzeSectorLeadership(
  currentScores: SectorScores,
  historicalScores?: SectorScores[]
): LeadershipAnalysis {
  // Current leaders and laggards
  const sortedSectors = Object.entries(currentScores)
    .sort(([,a], [,b]) => b - a);
  
  const leadingSectors = sortedSectors.slice(0, 3).map(([symbol]) => symbol);
  const laggingSectors = sortedSectors.slice(-3).map(([symbol]) => symbol);
  
  // Detect rotation if historical data available
  let rotationInProgress = false;
  let rotationType: LeadershipAnalysis['rotationType'] = 'none';
  let rotationStrength = 0;
  
  if (historicalScores && historicalScores.length > 0) {
    const rotation = detectSectorRotation(currentScores, historicalScores);
    rotationInProgress = rotation.rotationInProgress;
    rotationType = rotation.rotationType;
    rotationStrength = rotation.rotationStrength;
  }
  
  return {
    leadingSectors,
    laggingSectors,
    rotationInProgress,
    rotationType,
    rotationStrength
  };
}

/**
 * Get sector heatmap data for visualization
 */
export function getSectorHeatmapData(
  scores: SectorScores,
  performanceMetrics: Record<string, SectorPerformanceMetrics>
): Array<{
  symbol: string;
  name: string;
  score: number;
  performance: number;
  color: 'strong' | 'moderate' | 'weak' | 'very-weak';
  recommendation: RecommendationType;
  confidence: number;
}> {
  return Object.entries(scores).map(([symbol, score]) => {
    const metrics = performanceMetrics[symbol];
    
    let color: 'strong' | 'moderate' | 'weak' | 'very-weak' = 'moderate';
    if (score >= 5) color = 'strong';
    else if (score >= 1) color = 'moderate';
    else if (score >= -2) color = 'weak';
    else color = 'very-weak';
    
    return {
      symbol,
      name: metrics?.name || symbol,
      score,
      performance: metrics?.momentum || 0,
      color,
      recommendation: metrics?.recommendation || 'HOLD',
      confidence: metrics?.confidence || 0.5
    };
  });
}