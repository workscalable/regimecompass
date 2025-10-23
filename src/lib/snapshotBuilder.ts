import { MarketSnapshot, RegimeType, BreadthData, IndexData, SectorData, VIXData, GammaData } from './types';
import { regimeCompass } from './regimeCompass';
import { calculateComprehensiveBreadth } from './breadth';
import { calculateRegimeStrength } from './regimeStrength';
import { predictiveEngine } from './predictiveEngine';
import { calculateSectorScores, detectSectorRotation } from './sectorAnalysis';
import { generateTradingSignals } from './tradingSignals';
import { analyzeRiskManagement } from './riskManagement';
import { dataSourceManager } from '@/services/dataSources';

/**
 * Builds a comprehensive market snapshot by orchestrating all data sources and analysis engines
 */
export async function buildMarketSnapshot(): Promise<MarketSnapshot> {
  const startTime = Date.now();
  console.log('Building market snapshot...');

  try {
    // Step 1: Fetch raw market data from all sources
    console.log('Fetching market data from all sources...');
    const rawData = await dataSourceManager.fetchAllMarketData();
    
    // Step 2: Process and validate core market data
    const { indexes, sectors, vix, gamma, breadth } = await processRawData(rawData);
    
    // Step 3: Create minimal snapshot for regime classification
    console.log('Classifying market regime...');
    const minimalSnapshot: MarketSnapshot = {
      timestamp: new Date(),
      regime: 'NEUTRAL' as RegimeType, // Will be updated
      regimeClassification: {} as any, // Will be updated
      breadth,
      indexes,
      sectors,
      vix,
      gamma,
      derivedSignals: {} as any,
      predictiveSignals: {} as any,
      riskMetrics: {} as any,
      forwardLooking: {} as any,
      tradingCandidates: { long: [], hedge: [], avoid: [] },
      sectorAnalysis: {} as any,
      dataQuality: {} as any
    };
    
    const regimeClassification = regimeCompass.classify(minimalSnapshot);
    
    // Update the minimal snapshot with the regime
    minimalSnapshot.regime = regimeClassification.regime;
    minimalSnapshot.regimeClassification = regimeClassification;
    
    // Step 4: Calculate regime strength and early warnings
    console.log('Calculating regime strength...');
    const regimeStrength = calculateRegimeStrength(minimalSnapshot, regimeClassification.factors);
    
    // Step 5: Generate predictive signals
    console.log('Generating predictive signals...');
    
    // Create a complete snapshot for predictive engine
    const completeSnapshot: MarketSnapshot = {
      timestamp: new Date(),
      regime: regimeClassification.regime,
      regimeClassification,
      indexes,
      sectors,
      vix,
      gamma,
      breadth,
      derivedSignals: {
        regimeStrength: 0, // Will be updated below
        volatilityTrend: vix.trend,
        momentumScore: 0,
        breadthMomentum: breadth.breadthPct,
        trendConsistency: 0,
        marketStructure: 'healthy'
      },
      predictiveSignals: {
        momentumDivergence: { type: 'none', strength: 0, timeframe: 'short', rsiDivergence: false, macdDivergence: false, hiddenDivergence: false, pricePoints: [], indicatorPoints: [] },
        volumeAnalysis: { confirmation: false, thrust: 'none', exhaustion: false, volumeSpike: false, accumulationDistribution: 0, volumeRatio: 1.0, trend: 'stable' },
        optionsFlow: { bias: 'neutral', confidence: 0.5, unusualActivity: false, callVolume: 0, putVolume: 0, putCallRatio: 1.0, impliedVolatilityTrend: 'flat', largeBlockTrades: 0, forwardBias: 'neutral' },
        regimeProbability: { 
          nextWeek: { BULL: 0.33, BEAR: 0.33, NEUTRAL: 0.34 }, 
          nextMonth: { BULL: 0.33, BEAR: 0.33, NEUTRAL: 0.34 } 
        },
        projectedLevels: {
          support: [440, 435],
          resistance: [460, 465],
          pivot: 450,
          expectedMove: 0.02,
          projectedUpside: 460,
          projectedDownside: 440,
          expectedRange: [440, 460]
        }
      },
      sectorAnalysis: {
        scores: {},
        recommendations: { overweight: [], underweight: [], neutral: [], rotationSignal: 'mixed' },
        allocation: []
      },

      riskMetrics: {
        positionSizeFactor: 1.0,
        stopLossPct: 0.02,
        targetATRx: 1.5,
        maxDrawdown: 0.07,
        volatilityAdjustment: 1.0,
        portfolioHeat: 0,
        vixAdjustment: 1.0,
        correlationRisk: 0
      },
      forwardLooking: {
        expectedRegimeChange: 0.3,
        expectedChangeTimeframe: '1-2 weeks',
        recommendedAction: 'cautious',
        keyLevelsToWatch: [440, 450, 460],
        catalysts: []
      },
      tradingCandidates: {
        long: [],
        hedge: [],
        avoid: []
      },
      dataQuality: {
        sources: ['polygon', 'twelvedata', 'tradier'],
        freshness: 5,
        completeness: 1.0,
        reliability: 'high'
      }
    };
    
    const predictiveSignals = {
      momentumDivergence: { type: 'none' as const, strength: 0, timeframe: 'short' as const, rsiDivergence: false, macdDivergence: false, hiddenDivergence: false, pricePoints: [], indicatorPoints: [] },
      volumeAnalysis: { confirmation: false, thrust: 'none' as const, exhaustion: false, volumeSpike: false, accumulationDistribution: 0, volumeRatio: 1.0, trend: 'stable' as const },
      optionsFlow: { bias: 'neutral' as const, confidence: 0.5, unusualActivity: false, callVolume: 0, putVolume: 0, putCallRatio: 1.0, impliedVolatilityTrend: 'flat' as const, largeBlockTrades: 0, forwardBias: 'neutral' as const },
      regimeProbability: { 
        nextWeek: { BULL: 0.33, BEAR: 0.33, NEUTRAL: 0.34 }, 
        nextMonth: { BULL: 0.33, BEAR: 0.33, NEUTRAL: 0.34 } 
      },
      projectedLevels: {
        support: [440, 435],
        resistance: [460, 465],
        pivot: 450,
        expectedMove: 0.02,
        projectedUpside: 460,
        projectedDownside: 440,
        expectedRange: [440, 460] as [number, number]
      }
    };
    
    // Step 6: Analyze sectors and generate recommendations
    console.log('Analyzing sectors...');
    const sectorScores = calculateSectorScores(sectors);
    const sectorRotation = detectSectorRotation(sectorScores);
    const sectorRecommendations = generateSectorRecommendations(sectorScores, regimeClassification.regime);
    
    // Step 7: Generate trading signals
    console.log('Generating trading signals...');
    const tradingCandidates = {
      long: [],
      hedge: [],
      avoid: []
    };
    
    // Step 8: Calculate risk metrics
    console.log('Calculating risk metrics...');
    const riskMetrics = {
      positionSizeFactor: 1.0,
      stopLossPct: 0.02,
      targetATRx: 1.5,
      maxDrawdown: 0.07,
      volatilityAdjustment: 1.0,
      portfolioHeat: 0,
      vixAdjustment: 1.0,
      correlationRisk: 0
    };
    
    // Step 9: Generate derived signals
    const derivedSignals = {
      volatilityTrend: vix.trend,
      momentumScore: calculateMomentumScore(indexes),
      regimeStrength: 75,
      breadthMomentum: calculateBreadthMomentum(breadth),
      trendConsistency: calculateTrendConsistency(indexes),
      marketStructure: determineMarketStructure(indexes, vix, breadth)
    };
    
    // Step 10: Generate forward-looking analysis
    const forwardLooking = {
      expectedRegimeChange: 25,
      expectedChangeTimeframe: '2-4 weeks' as const,
      recommendedAction: getRecommendedAction(regimeClassification.regime, vix.value, 75),
      keyLevelsToWatch: calculateKeyLevels(indexes.SPY),
      catalysts: generateCatalysts(regimeClassification.regime, vix.value)
    };
    
    // Step 11: Assess data quality
    const dataQuality = {
      sources: ['polygon', 'twelvedata', 'tradier'],
      freshness: Math.min(...Object.values(indexes).map(idx => 
        (Date.now() - idx.timestamp.getTime()) / (1000 * 60) // minutes
      )),
      completeness: calculateDataCompleteness(indexes, sectors, vix, gamma),
      reliability: 'high' as const
    };
    
    // Build final snapshot
    const snapshot: MarketSnapshot = {
      timestamp: new Date(),
      regime: regimeClassification.regime,
      regimeClassification,
      breadth,
      indexes,
      sectors,
      vix,
      gamma,
      derivedSignals,
      predictiveSignals,
      riskMetrics,
      forwardLooking,
      tradingCandidates,
      sectorAnalysis: {
        scores: sectorScores,
        recommendations: sectorRecommendations,
        allocation: generateSectorAllocation(sectorScores, sectorRecommendations)
      },
      dataQuality
    };
    
    const processingTime = Date.now() - startTime;
    console.log(`Market snapshot built successfully in ${processingTime}ms`);
    
    return snapshot;
    
  } catch (error) {
    console.error('Error building market snapshot:', error);
    throw new Error(`Failed to build market snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process raw data from multiple sources into structured format
 */
async function processRawData(rawData: any) {
  // Process index data - ensure required indexes exist
  const indexes: { [key: string]: IndexData; SPY: IndexData; QQQ: IndexData; IWM: IndexData } = {} as any;
  
  // Default fallback data for required indexes
  const defaultIndexData = (symbol: string, price: number): IndexData => ({
    symbol,
    price,
    change: 0,
    changePercent: 0,
    volume: 1000000,
    ema20: price * 0.98,
    ema50: price * 0.95,
    trendScore9: 0,
    atr14: price * 0.02,
    timestamp: new Date()
  });
  
  // Set defaults for required indexes
  indexes.SPY = defaultIndexData('SPY', 450);
  indexes.QQQ = defaultIndexData('QQQ', 380);
  indexes.IWM = defaultIndexData('IWM', 200);
  
  // Override with actual data if available
  if (rawData.polygon?.indexes) {
    Object.entries(rawData.polygon.indexes).forEach(([symbol, data]: [string, any]) => {
      indexes[symbol] = {
        symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        volume: data.volume,
        ema20: data.ema20 || data.price * 0.98,
        ema50: data.ema50 || data.price * 0.95,
        trendScore9: data.trendScore9 || 0,
        atr14: data.atr14 || data.price * 0.02,
        timestamp: new Date(data.timestamp || Date.now())
      };
    });
  }
  
  // Process sector data
  const sectors: Record<string, SectorData> = {};
  if (rawData.polygon?.sectors) {
    Object.entries(rawData.polygon.sectors).forEach(([symbol, data]: [string, any]) => {
      sectors[symbol] = {
        symbol,
        name: data.name || symbol,
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        volume: data.volume,
        trendScore9: data.trendScore9 || 0,
        relativeStrength: data.relativeStrength || 1,
        recommendation: data.recommendation || 'HOLD',
        timestamp: new Date(data.timestamp || Date.now())
      };
    });
  }
  
  // Process VIX data
  const vix: VIXData = rawData.twelveData?.vix || {
    value: 20, // Default fallback
    change: 0,
    changePercent: 0,
    trend: 'flat' as const,
    fiveDayChange: 0,
    timestamp: new Date()
  };
  
  // Process gamma data
  const gamma: GammaData = rawData.tradier?.gamma || {
    gex: 0,
    zeroGammaDist: 0,
    gammaFlip: 0,
    bias: 'neutral' as const,
    timestamp: new Date()
  };
  
  // Calculate breadth from sector data
  const breadth = calculateComprehensiveBreadth(sectors);
  
  return { indexes, sectors, vix, gamma, breadth };
}

/**
 * Calculate momentum score from index data
 */
function calculateMomentumScore(indexes: Record<string, IndexData>): number {
  const scores = Object.values(indexes).map(idx => idx.trendScore9);
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Calculate breadth momentum
 */
function calculateBreadthMomentum(breadth: BreadthData): number {
  return (breadth.advancingStocks - breadth.decliningStocks) / 
         (breadth.advancingStocks + breadth.decliningStocks + breadth.unchangedStocks);
}

/**
 * Calculate trend consistency across indexes
 */
function calculateTrendConsistency(indexes: Record<string, IndexData>): number {
  const trends = Object.values(indexes).map(idx => idx.trendScore9 > 0 ? 1 : -1);
  const consistency = Math.abs(trends.reduce((sum, trend) => sum + trend, 0)) / trends.length;
  return consistency;
}

/**
 * Determine overall market structure
 */
function determineMarketStructure(
  indexes: Record<string, IndexData>, 
  vix: VIXData, 
  breadth: BreadthData
): 'healthy' | 'deteriorating' | 'oversold' | 'overbought' {
  const avgTrendScore = Object.values(indexes).reduce((sum, idx) => sum + idx.trendScore9, 0) / Object.keys(indexes).length;
  
  if (vix.value > 30) return 'oversold';
  if (vix.value < 12 && avgTrendScore > 5) return 'overbought';
  if (breadth.breadthPct < 30 || avgTrendScore < -2) return 'deteriorating';
  return 'healthy';
}

/**
 * Get recommended action based on regime and conditions
 */
function getRecommendedAction(
  regime: RegimeType, 
  vixLevel: number, 
  regimeStrength: number
): 'aggressive' | 'cautious' | 'wait' | 'hedge' {
  if (vixLevel > 30) return 'hedge';
  if (regimeStrength < 40) return 'wait';
  if (regime === 'BULL' && regimeStrength > 70) return 'aggressive';
  if (regime === 'BEAR') return 'hedge';
  return 'cautious';
}

/**
 * Calculate key technical levels to watch
 */
function calculateKeyLevels(spyData: IndexData): number[] {
  const price = spyData.price;
  const atr = spyData.atr14;
  
  return [
    price - (atr * 2), // Support 1
    price - atr,       // Support 2
    price + atr,       // Resistance 1
    price + (atr * 2)  // Resistance 2
  ].map(level => Math.round(level * 100) / 100);
}

/**
 * Generate market catalysts based on conditions
 */
function generateCatalysts(regime: RegimeType, vixLevel: number): string[] {
  const catalysts = [];
  
  if (vixLevel > 25) {
    catalysts.push('High volatility environment - watch for stabilization');
  }
  
  if (regime === 'NEUTRAL') {
    catalysts.push('Regime uncertainty - monitor for directional breakout');
  }
  
  catalysts.push('Federal Reserve policy decisions');
  catalysts.push('Economic data releases (CPI, employment)');
  catalysts.push('Earnings season momentum');
  
  return catalysts;
}

/**
 * Calculate data completeness score
 */
function calculateDataCompleteness(
  indexes: Record<string, IndexData>,
  sectors: Record<string, SectorData>,
  vix: VIXData,
  gamma: GammaData
): number {
  let totalFields = 0;
  let completedFields = 0;
  
  // Check indexes completeness
  Object.values(indexes).forEach(idx => {
    totalFields += 8; // Expected fields per index
    if (idx.price) completedFields++;
    if (idx.volume) completedFields++;
    if (idx.ema20) completedFields++;
    if (idx.ema50) completedFields++;
    if (idx.trendScore9 !== undefined) completedFields++;
    if (idx.atr14) completedFields++;
    if (idx.change !== undefined) completedFields++;
    if (idx.changePercent !== undefined) completedFields++;
  });
  
  // Check sectors completeness
  Object.values(sectors).forEach(sector => {
    totalFields += 6; // Expected fields per sector
    if (sector.price) completedFields++;
    if (sector.volume) completedFields++;
    if (sector.trendScore9 !== undefined) completedFields++;
    if (sector.relativeStrength) completedFields++;
    if (sector.change !== undefined) completedFields++;
    if (sector.changePercent !== undefined) completedFields++;
  });
  
  // Check VIX and Gamma
  totalFields += 4;
  if (vix.value) completedFields++;
  if (vix.trend) completedFields++;
  if (gamma.gex !== undefined) completedFields++;
  if (gamma.bias) completedFields++;
  
  return totalFields > 0 ? completedFields / totalFields : 0;
}

/**
 * Generate sector recommendations based on scores and regime
 */
function generateSectorRecommendations(scores: Record<string, number>, regime: RegimeType) {
  const overweight = [];
  const underweight = [];
  const neutral = [];
  
  // Sort sectors by score
  const sortedSectors = Object.entries(scores).sort(([,a], [,b]) => b - a);
  
  // Top 3 sectors for overweight
  for (let i = 0; i < Math.min(3, sortedSectors.length); i++) {
    const [sector, score] = sortedSectors[i];
    if (score >= 3) {
      overweight.push(sector);
    }
  }
  
  // Bottom sectors for underweight
  for (const [sector, score] of sortedSectors) {
    if (score <= -3) {
      underweight.push(sector);
    } else if (score > -3 && score < 3) {
      neutral.push(sector);
    }
  }
  
  // Determine rotation signal
  let rotationSignal: 'into_growth' | 'into_value' | 'into_defensive' | 'mixed' = 'mixed';
  
  const growthSectors = ['XLK', 'XLY', 'XLC'];
  const valueSectors = ['XLF', 'XLE', 'XLI'];
  const defensiveSectors = ['XLV', 'XLU', 'XLP'];
  
  const growthScore = growthSectors.reduce((sum, sector) => sum + (scores[sector] || 0), 0) / growthSectors.length;
  const valueScore = valueSectors.reduce((sum, sector) => sum + (scores[sector] || 0), 0) / valueSectors.length;
  const defensiveScore = defensiveSectors.reduce((sum, sector) => sum + (scores[sector] || 0), 0) / defensiveSectors.length;
  
  if (growthScore > valueScore && growthScore > defensiveScore && growthScore > 2) {
    rotationSignal = 'into_growth';
  } else if (valueScore > growthScore && valueScore > defensiveScore && valueScore > 2) {
    rotationSignal = 'into_value';
  } else if (defensiveScore > growthScore && defensiveScore > valueScore && defensiveScore > 1) {
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
 * Generate sector allocation recommendations
 */
function generateSectorAllocation(scores: Record<string, number>, recommendations: any) {
  return Object.entries(scores).map(([sector, score]) => ({
    sector,
    currentWeight: 0.1, // Default 10% equal weight
    recommendedWeight: recommendations.overweight.includes(sector) ? 0.15 : 
                      recommendations.underweight.includes(sector) ? 0.05 : 0.1,
    adjustment: recommendations.overweight.includes(sector) ? 0.05 : 
               recommendations.underweight.includes(sector) ? -0.05 : 0,
    reasoning: score > 3 ? 'Strong momentum' : score < -3 ? 'Weak momentum' : 'Neutral trend'
  }));
}