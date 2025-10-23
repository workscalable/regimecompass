import { 
  TradingCandidate, 
  MarketSnapshot, 
  RegimeType, 
  SectorData,
  PredictiveSignals,
  RecommendationType
} from './types';
import { calculateStopLossAndTargets } from './risk/positionSizing';
import { getSectorHeatmapData } from './sectorAnalysis';

/**
 * Trading Signal Generator
 * Creates regime-specific positioning recommendations and trade candidates
 * Based on the trading framework from specifications
 */

export interface TradingSignalOutput {
  longCandidates: TradingCandidate[];
  hedgeCandidates: TradingCandidate[];
  avoidList: string[];
  regimePositioning: RegimePositioning;
  signalStrength: 'weak' | 'moderate' | 'strong';
  confidence: number;
  timeframe: 'intraday' | 'swing' | 'position';
}

export interface RegimePositioning {
  regime: RegimeType;
  recommendedLongExposure: number; // Percentage
  recommendedHedgeExposure: number; // Percentage
  recommendedCashExposure: number; // Percentage
  positionSizingFactor: number;
  reasoning: string[];
}

export interface SignalCriteria {
  minTrendScore: number;
  minConfidence: number;
  maxCandidates: number;
  requireVolumeConfirmation: boolean;
  requirePredictiveAlignment: boolean;
}

/**
 * Generate comprehensive trading signals based on regime and market conditions
 */
export function generateTradingSignals(
  snapshot: MarketSnapshot,
  predictiveSignals?: PredictiveSignals
): TradingSignalOutput {
  const regime = snapshot.regime;
  
  // Generate regime-specific positioning
  const regimePositioning = generateRegimePositioning(snapshot);
  
  // Generate long candidates
  const longCandidates = generateLongCandidates(
    snapshot,
    regime,
    predictiveSignals
  );
  
  // Generate hedge candidates
  const hedgeCandidates = generateHedgeCandidates(
    snapshot,
    regime,
    predictiveSignals
  );
  
  // Generate avoid list
  const avoidList = generateAvoidList(snapshot);
  
  // Determine overall signal strength and confidence
  const { signalStrength, confidence, timeframe } = assessSignalQuality(
    snapshot,
    longCandidates,
    hedgeCandidates,
    predictiveSignals
  );
  
  return {
    longCandidates,
    hedgeCandidates,
    avoidList,
    regimePositioning,
    signalStrength,
    confidence,
    timeframe
  };
}

/**
 * Generate regime-specific positioning recommendations
 */
function generateRegimePositioning(snapshot: MarketSnapshot): RegimePositioning {
  const regime = snapshot.regime;
  const regimeStrength = snapshot.derivedSignals.regimeStrength;
  const vix = snapshot.vix.value;
  
  let recommendedLongExposure: number;
  let recommendedHedgeExposure: number;
  let positionSizingFactor: number;
  const reasoning: string[] = [];
  
  switch (regime) {
    case 'BULL':
      recommendedLongExposure = 75; // 70-80% as specified
      recommendedHedgeExposure = 5;  // 0-10% as specified
      positionSizingFactor = 1.25;   // Full risk as specified
      reasoning.push('BULL regime supports aggressive long positioning');
      reasoning.push('Minimal hedging required in strong uptrend');
      break;
      
    case 'BEAR':
      recommendedLongExposure = 25;  // 20-30% as specified
      recommendedHedgeExposure = 25; // 20-30% as specified
      positionSizingFactor = 0.75;   // Reduced risk as specified
      reasoning.push('BEAR regime requires defensive positioning');
      reasoning.push('Significant hedging needed for protection');
      break;
      
    case 'NEUTRAL':
      recommendedLongExposure = 50;  // 50% as specified
      recommendedHedgeExposure = 15; // 10-20% as specified
      positionSizingFactor = 1.0;    // Normal risk
      reasoning.push('NEUTRAL regime calls for balanced approach');
      reasoning.push('Focus on sector rotation opportunities');
      break;
  }
  
  // Adjust based on regime strength
  if (regimeStrength < 50) {
    recommendedLongExposure *= 0.8; // Reduce exposure for weak regimes
    recommendedHedgeExposure *= 1.2; // Increase hedging
    positionSizingFactor *= 0.9;
    reasoning.push(`Weak regime strength (${regimeStrength}) reduces conviction`);
  } else if (regimeStrength > 80) {
    recommendedLongExposure *= 1.1; // Increase exposure for strong regimes
    recommendedHedgeExposure *= 0.8; // Reduce hedging
    positionSizingFactor *= 1.1;
    reasoning.push(`Strong regime strength (${regimeStrength}) increases conviction`);
  }
  
  // VIX adjustment
  if (vix > 25) {
    recommendedLongExposure *= 0.8;
    recommendedHedgeExposure *= 1.3;
    positionSizingFactor *= 0.5; // 50% reduction as specified
    reasoning.push(`High VIX (${vix.toFixed(1)}) requires defensive positioning`);
  }
  
  const recommendedCashExposure = 100 - recommendedLongExposure - recommendedHedgeExposure;
  
  return {
    regime,
    recommendedLongExposure: Math.max(0, Math.min(100, recommendedLongExposure)),
    recommendedHedgeExposure: Math.max(0, Math.min(50, recommendedHedgeExposure)),
    recommendedCashExposure: Math.max(0, recommendedCashExposure),
    positionSizingFactor,
    reasoning
  };
}

/**
 * Generate long candidates based on regime and sector strength
 */
function generateLongCandidates(
  snapshot: MarketSnapshot,
  regime: RegimeType,
  predictiveSignals?: PredictiveSignals
): TradingCandidate[] {
  const candidates: TradingCandidate[] = [];
  
  // Get criteria based on regime
  const criteria = getLongCandidateCriteria(regime);
  
  // Analyze sectors for long opportunities
  Object.entries(snapshot.sectors).forEach(([symbol, sectorData]) => {
    const candidate = evaluateLongCandidate(
      sectorData,
      criteria,
      snapshot,
      predictiveSignals
    );
    
    if (candidate) {
      candidates.push(candidate);
    }
  });
  
  // Sort by confidence and risk-reward ratio
  candidates.sort((a, b) => (b.confidence * b.riskReward) - (a.confidence * a.riskReward));
  
  // Return top candidates based on regime
  const maxCandidates = regime === 'BULL' ? 5 : regime === 'NEUTRAL' ? 3 : 2;
  return candidates.slice(0, maxCandidates);
}

/**
 * Get criteria for long candidates based on regime
 */
function getLongCandidateCriteria(regime: RegimeType): SignalCriteria {
  switch (regime) {
    case 'BULL':
      return {
        minTrendScore: 3,
        minConfidence: 0.6,
        maxCandidates: 5,
        requireVolumeConfirmation: false,
        requirePredictiveAlignment: false
      };
    case 'NEUTRAL':
      return {
        minTrendScore: 5,
        minConfidence: 0.7,
        maxCandidates: 3,
        requireVolumeConfirmation: true,
        requirePredictiveAlignment: true
      };
    case 'BEAR':
      return {
        minTrendScore: 7,
        minConfidence: 0.8,
        maxCandidates: 2,
        requireVolumeConfirmation: true,
        requirePredictiveAlignment: true
      };
    default:
      return {
        minTrendScore: 5,
        minConfidence: 0.7,
        maxCandidates: 3,
        requireVolumeConfirmation: true,
        requirePredictiveAlignment: false
      };
  }
}

/**
 * Evaluate individual sector as long candidate
 */
function evaluateLongCandidate(
  sectorData: SectorData,
  criteria: SignalCriteria,
  snapshot: MarketSnapshot,
  predictiveSignals?: PredictiveSignals
): TradingCandidate | null {
  // Check basic criteria
  if (sectorData.trendScore9 < criteria.minTrendScore) {
    return null;
  }
  
  if (sectorData.recommendation !== 'BUY') {
    return null;
  }
  
  // Calculate confidence based on multiple factors
  let confidence = 0.5;
  const reasoning: string[] = [];
  
  // Trend score contribution
  const trendStrength = Math.min(1, sectorData.trendScore9 / 9);
  confidence += trendStrength * 0.3;
  reasoning.push(`Strong 9-day trend score: ${sectorData.trendScore9}`);
  
  // Relative strength contribution
  const relativeStrength = sectorData.relativeStrength;
  if (relativeStrength > 0) {
    confidence += Math.min(0.2, relativeStrength / 5);
    reasoning.push(`Positive relative strength: ${relativeStrength.toFixed(2)}`);
  }
  
  // Recent performance contribution
  if (sectorData.changePercent > 1) {
    confidence += 0.1;
    reasoning.push(`Strong recent performance: +${sectorData.changePercent.toFixed(1)}%`);
  }
  
  // Volume confirmation (if required)
  if (criteria.requireVolumeConfirmation) {
    // Simplified volume check - in real implementation would use volume analysis
    if (sectorData.volume > 15000000) { // Above average volume
      confidence += 0.1;
      reasoning.push('Above average volume confirms move');
    } else {
      confidence -= 0.1;
      reasoning.push('Below average volume reduces confidence');
    }
  }
  
  // Predictive alignment (if required and available)
  if (criteria.requirePredictiveAlignment && predictiveSignals) {
    if (predictiveSignals.momentumDivergence.type === 'bullish') {
      confidence += 0.15;
      reasoning.push('Bullish momentum divergence supports position');
    } else if (predictiveSignals.momentumDivergence.type === 'bearish') {
      confidence -= 0.2;
      reasoning.push('Bearish momentum divergence creates headwind');
    }
    
    if (predictiveSignals.optionsFlow.bias === 'bullish') {
      confidence += 0.1;
      reasoning.push('Bullish options flow supports position');
    }
  }
  
  // Check minimum confidence
  if (confidence < criteria.minConfidence) {
    return null;
  }
  
  // Calculate entry, stop, and target
  const entry = sectorData.price;
  const atr = sectorData.price * 0.02; // Simplified ATR calculation
  const stopLossTarget = calculateStopLossAndTargets(entry, atr, 'long');
  
  return {
    symbol: sectorData.symbol,
    name: sectorData.name,
    type: 'LONG',
    confidence,
    entry,
    stopLoss: stopLossTarget.stopLoss,
    target: stopLossTarget.profitTarget,
    positionSize: 0, // Will be calculated by position sizing
    reasoning,
    sector: sectorData.symbol,
    atr,
    riskReward: stopLossTarget.riskReward,
    timeframe: 'swing'
  };
}

/**
 * Generate hedge candidates (inverse ETFs and defensive positions)
 */
function generateHedgeCandidates(
  snapshot: MarketSnapshot,
  regime: RegimeType,
  predictiveSignals?: PredictiveSignals
): TradingCandidate[] {
  const candidates: TradingCandidate[] = [];
  
  // Hedge candidates based on regime
  if (regime === 'BEAR' || regime === 'NEUTRAL') {
    // Add inverse ETF candidates
    const inverseETFs = [
      { symbol: 'SDS', name: 'ProShares UltraShort S&P500', multiplier: -2 },
      { symbol: 'SQQQ', name: 'ProShares UltraShort QQQ', multiplier: -3 },
      { symbol: 'SH', name: 'ProShares Short S&P500', multiplier: -1 }
    ];
    
    inverseETFs.forEach(etf => {
      const hedgeCandidate = createHedgeCandidate(
        etf,
        snapshot,
        regime,
        predictiveSignals
      );
      
      if (hedgeCandidate) {
        candidates.push(hedgeCandidate);
      }
    });
  }
  
  // Add defensive sector candidates in all regimes
  const defensiveSectors = ['XLU', 'XLP', 'XLV']; // Utilities, Staples, Healthcare
  
  defensiveSectors.forEach(symbol => {
    const sectorData = snapshot.sectors[symbol];
    if (sectorData && sectorData.trendScore9 >= 1) {
      const defensiveCandidate = createDefensiveCandidate(
        sectorData,
        snapshot,
        regime
      );
      
      if (defensiveCandidate) {
        candidates.push(defensiveCandidate);
      }
    }
  });
  
  // Sort by confidence
  candidates.sort((a, b) => b.confidence - a.confidence);
  
  // Return appropriate number based on regime
  const maxHedges = regime === 'BEAR' ? 3 : regime === 'NEUTRAL' ? 2 : 1;
  return candidates.slice(0, maxHedges);
}

/**
 * Create hedge candidate from inverse ETF
 */
function createHedgeCandidate(
  etf: { symbol: string; name: string; multiplier: number },
  snapshot: MarketSnapshot,
  regime: RegimeType,
  predictiveSignals?: PredictiveSignals
): TradingCandidate | null {
  // Base confidence on regime and predictive signals
  let confidence = 0.4;
  const reasoning: string[] = [];
  
  if (regime === 'BEAR') {
    confidence += 0.3;
    reasoning.push('BEAR regime supports inverse positioning');
  }
  
  if (predictiveSignals?.momentumDivergence.type === 'bearish') {
    confidence += 0.2;
    reasoning.push('Bearish momentum divergence supports hedge');
  }
  
  if (predictiveSignals?.optionsFlow.bias === 'bearish') {
    confidence += 0.1;
    reasoning.push('Bearish options flow supports hedge');
  }
  
  if (snapshot.vix.value > 20) {
    confidence += 0.1;
    reasoning.push(`Elevated VIX (${snapshot.vix.value.toFixed(1)}) supports hedging`);
  }
  
  if (confidence < 0.5) {
    return null;
  }
  
  // Estimate price and levels (simplified)
  const estimatedPrice = 50; // Mock price for inverse ETF
  const atr = estimatedPrice * 0.03; // Higher volatility for inverse ETFs
  const stopLossTarget = calculateStopLossAndTargets(estimatedPrice, atr, 'long');
  
  return {
    symbol: etf.symbol,
    name: etf.name,
    type: 'HEDGE',
    confidence,
    entry: estimatedPrice,
    stopLoss: stopLossTarget.stopLoss,
    target: stopLossTarget.profitTarget,
    positionSize: 0,
    reasoning,
    atr,
    riskReward: stopLossTarget.riskReward,
    timeframe: 'swing'
  };
}

/**
 * Create defensive sector candidate
 */
function createDefensiveCandidate(
  sectorData: SectorData,
  snapshot: MarketSnapshot,
  regime: RegimeType
): TradingCandidate | null {
  let confidence = 0.4;
  const reasoning: string[] = [];
  
  // Defensive sectors perform better in uncertain times
  if (regime === 'NEUTRAL' || regime === 'BEAR') {
    confidence += 0.2;
    reasoning.push('Defensive sector appropriate for current regime');
  }
  
  if (sectorData.trendScore9 > 3) {
    confidence += 0.2;
    reasoning.push(`Positive trend score: ${sectorData.trendScore9}`);
  }
  
  if (snapshot.vix.value > 18) {
    confidence += 0.1;
    reasoning.push('Elevated volatility favors defensive positioning');
  }
  
  if (confidence < 0.5) {
    return null;
  }
  
  const atr = sectorData.price * 0.015; // Lower volatility for defensive sectors
  const stopLossTarget = calculateStopLossAndTargets(sectorData.price, atr, 'long');
  
  return {
    symbol: sectorData.symbol,
    name: sectorData.name,
    type: 'HEDGE',
    confidence,
    entry: sectorData.price,
    stopLoss: stopLossTarget.stopLoss,
    target: stopLossTarget.profitTarget,
    positionSize: 0,
    reasoning,
    sector: sectorData.symbol,
    atr,
    riskReward: stopLossTarget.riskReward,
    timeframe: 'position'
  };
}

/**
 * Generate list of sectors to avoid
 */
function generateAvoidList(snapshot: MarketSnapshot): string[] {
  const avoidList: string[] = [];
  
  Object.entries(snapshot.sectors).forEach(([symbol, sectorData]) => {
    // Avoid sectors with very weak trend scores
    if (sectorData.trendScore9 <= -3) {
      avoidList.push(symbol);
    }
    
    // Avoid sectors with AVOID recommendation
    if (sectorData.recommendation === 'AVOID') {
      avoidList.push(symbol);
    }
    
    // Avoid sectors with poor recent performance in BULL regime
    if (snapshot.regime === 'BULL' && sectorData.changePercent < -2) {
      avoidList.push(symbol);
    }
  });
  
  return Array.from(new Set(avoidList)); // Remove duplicates
}

/**
 * Assess overall signal quality
 */
function assessSignalQuality(
  snapshot: MarketSnapshot,
  longCandidates: TradingCandidate[],
  hedgeCandidates: TradingCandidate[],
  predictiveSignals?: PredictiveSignals
): {
  signalStrength: 'weak' | 'moderate' | 'strong';
  confidence: number;
  timeframe: 'intraday' | 'swing' | 'position';
} {
  let qualityScore = 0;
  
  // Regime strength contribution
  qualityScore += snapshot.derivedSignals.regimeStrength / 100 * 0.3;
  
  // Candidate quality contribution
  const avgLongConfidence = longCandidates.length > 0 ? 
    longCandidates.reduce((sum, c) => sum + c.confidence, 0) / longCandidates.length : 0;
  qualityScore += avgLongConfidence * 0.3;
  
  // Breadth contribution
  qualityScore += snapshot.breadth.breadthPct * 0.2;
  
  // Predictive signals contribution
  if (predictiveSignals) {
    if (predictiveSignals.momentumDivergence.type !== 'none') {
      qualityScore += predictiveSignals.momentumDivergence.strength * 0.1;
    }
    
    if (predictiveSignals.volumeAnalysis.confirmation) {
      qualityScore += 0.1;
    }
  }
  
  // Determine signal strength
  let signalStrength: 'weak' | 'moderate' | 'strong';
  if (qualityScore >= 0.7) signalStrength = 'strong';
  else if (qualityScore >= 0.5) signalStrength = 'moderate';
  else signalStrength = 'weak';
  
  // Determine timeframe based on regime and signals
  let timeframe: 'intraday' | 'swing' | 'position' = 'swing';
  if (predictiveSignals?.momentumDivergence.timeframe === 'short') {
    timeframe = 'intraday';
  } else if (snapshot.regime === 'NEUTRAL') {
    timeframe = 'position';
  }
  
  return {
    signalStrength,
    confidence: qualityScore,
    timeframe
  };
}

/**
 * Generate entry/exit signals for existing positions
 */
export function generateEntryExitSignals(
  snapshot: MarketSnapshot,
  currentPositions: Array<{ symbol: string; type: 'LONG' | 'SHORT'; entry: number; currentPrice: number }>,
  predictiveSignals?: PredictiveSignals
): Array<{
  symbol: string;
  action: 'hold' | 'add' | 'reduce' | 'exit';
  reasoning: string[];
  urgency: 'low' | 'medium' | 'high';
}> {
  return currentPositions.map(position => {
    const sectorData = snapshot.sectors[position.symbol];
    let action: 'hold' | 'add' | 'reduce' | 'exit' = 'hold';
    const reasoning: string[] = [];
    let urgency: 'low' | 'medium' | 'high' = 'low';
    
    if (!sectorData) {
      return { symbol: position.symbol, action: 'hold', reasoning: ['No sector data available'], urgency: 'low' };
    }
    
    // Regime alignment check
    const regimeAligned = (snapshot.regime === 'BULL' && position.type === 'LONG') ||
                         (snapshot.regime === 'BEAR' && position.type === 'SHORT');
    
    if (!regimeAligned) {
      action = 'reduce';
      urgency = 'medium';
      reasoning.push(`Position not aligned with ${snapshot.regime} regime`);
    }
    
    // Trend deterioration check
    if (position.type === 'LONG' && sectorData.trendScore9 <= 0) {
      action = 'exit';
      urgency = 'high';
      reasoning.push(`Trend score deteriorated to ${sectorData.trendScore9}`);
    }
    
    // Predictive signal check
    if (predictiveSignals?.momentumDivergence.type === 'bearish' && position.type === 'LONG') {
      action = action === 'hold' ? 'reduce' : action;
      urgency = 'medium';
      reasoning.push('Bearish momentum divergence detected');
    }
    
    // Profit target or stop loss hit (simplified)
    const pnlPercent = (position.currentPrice - position.entry) / position.entry;
    if (position.type === 'LONG') {
      if (pnlPercent > 0.03) { // 3% profit
        action = 'reduce';
        reasoning.push('Profit target reached - take partial profits');
      } else if (pnlPercent < -0.02) { // 2% loss
        action = 'exit';
        urgency = 'high';
        reasoning.push('Stop loss triggered');
      }
    }
    
    if (reasoning.length === 0) {
      reasoning.push('Position aligned with current market conditions');
    }
    
    return { symbol: position.symbol, action, reasoning, urgency };
  });
}