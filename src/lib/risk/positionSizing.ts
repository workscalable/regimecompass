import { 
  RiskMetrics, 
  PositionSizingData, 
  PortfolioMetrics, 
  TradingCandidate,
  RegimeType 
} from '../types';

/**
 * Position Sizing Calculator
 * Implements ATR-based risk calculation with volatility adjustments
 * Based on the risk management framework from trading specifications
 */

export interface PositionSizeCalculation {
  baseSize: number;
  adjustedSize: number;
  riskAmount: number;
  maxPositionSize: number;
  volatilityAdjustment: number;
  regimeAdjustment: number;
  vixAdjustment: number;
  reasoning: string[];
}

export interface RiskParameters {
  accountSize: number;
  riskPerTrade: number; // Percentage (e.g., 0.01 for 1%)
  maxPositionSize: number; // Percentage (e.g., 0.10 for 10%)
  maxDrawdown: number; // Percentage (e.g., 0.07 for 7%)
  vixThreshold: number; // VIX level for adjustment (e.g., 25)
}

/**
 * Calculate position size using ATR-based risk management
 */
export function calculatePositionSize(
  symbol: string,
  entryPrice: number,
  atr: number,
  riskParams: RiskParameters,
  currentVIX: number,
  currentRegime: RegimeType,
  portfolioMetrics?: PortfolioMetrics
): PositionSizeCalculation {
  const reasoning: string[] = [];
  
  // Base risk calculation
  const riskAmount = riskParams.accountSize * riskParams.riskPerTrade;
  const atrRisk = atr * 2; // 2x ATR for stop loss
  const baseSize = riskAmount / atrRisk;
  
  reasoning.push(`Base calculation: $${riskAmount.toFixed(0)} risk / $${atrRisk.toFixed(2)} ATR stop = ${(baseSize / entryPrice * 100).toFixed(1)}% position`);
  
  // Volatility adjustment based on VIX
  const vixAdjustment = calculateVIXAdjustment(currentVIX, riskParams.vixThreshold);
  reasoning.push(`VIX adjustment: ${(vixAdjustment * 100).toFixed(0)}% (VIX: ${currentVIX.toFixed(1)})`);
  
  // Regime adjustment
  const regimeAdjustment = calculateRegimeAdjustment(currentRegime);
  reasoning.push(`Regime adjustment: ${(regimeAdjustment * 100).toFixed(0)}% (${currentRegime} regime)`);
  
  // Portfolio heat adjustment
  const portfolioAdjustment = portfolioMetrics ? 
    calculatePortfolioHeatAdjustment(portfolioMetrics, riskParams.maxDrawdown) : 1.0;
  
  if (portfolioMetrics) {
    reasoning.push(`Portfolio heat adjustment: ${(portfolioAdjustment * 100).toFixed(0)}% (current drawdown: ${(portfolioMetrics.drawdown * 100).toFixed(1)}%)`);
  }
  
  // Combined volatility adjustment
  const volatilityAdjustment = vixAdjustment * regimeAdjustment * portfolioAdjustment;
  
  // Apply adjustments
  let adjustedSize = baseSize * volatilityAdjustment;
  
  // Apply maximum position size limit
  const maxPositionDollar = riskParams.accountSize * riskParams.maxPositionSize;
  const maxPositionShares = maxPositionDollar / entryPrice;
  
  if (adjustedSize > maxPositionShares) {
    adjustedSize = maxPositionShares;
    reasoning.push(`Position capped at maximum ${(riskParams.maxPositionSize * 100).toFixed(0)}% of portfolio`);
  }
  
  // Ensure minimum viable position
  const minPositionDollar = 1000; // Minimum $1000 position
  const minPositionShares = minPositionDollar / entryPrice;
  
  if (adjustedSize < minPositionShares) {
    adjustedSize = minPositionShares;
    reasoning.push(`Position increased to minimum viable size ($${minPositionDollar})`);
  }
  
  return {
    baseSize,
    adjustedSize,
    riskAmount,
    maxPositionSize: maxPositionShares,
    volatilityAdjustment,
    regimeAdjustment,
    vixAdjustment,
    reasoning
  };
}

/**
 * Calculate VIX-based adjustment
 * Reduce position size when VIX > threshold
 */
function calculateVIXAdjustment(currentVIX: number, vixThreshold: number): number {
  if (currentVIX <= vixThreshold) {
    return 1.0; // No adjustment for normal VIX
  }
  
  // Reduce position size by 50% when VIX > threshold
  const excessVIX = currentVIX - vixThreshold;
  const reduction = Math.min(0.5, excessVIX / 20); // Max 50% reduction
  
  return 1.0 - reduction;
}

/**
 * Calculate regime-based adjustment
 */
function calculateRegimeAdjustment(regime: RegimeType): number {
  switch (regime) {
    case 'BULL':
      return 1.25; // 25% increase in bull market
    case 'BEAR':
      return 0.75; // 25% decrease in bear market
    case 'NEUTRAL':
      return 1.0; // No adjustment in neutral market
    default:
      return 1.0;
  }
}

/**
 * Calculate portfolio heat adjustment
 * Reduce size as drawdown approaches maximum
 */
function calculatePortfolioHeatAdjustment(
  portfolioMetrics: PortfolioMetrics,
  maxDrawdown: number
): number {
  const currentDrawdown = portfolioMetrics.drawdown;
  const drawdownRatio = currentDrawdown / maxDrawdown;
  
  if (drawdownRatio <= 0.5) {
    return 1.0; // No adjustment if drawdown < 50% of max
  }
  
  if (drawdownRatio >= 1.0) {
    return 0.1; // Minimal size if at max drawdown
  }
  
  // Linear reduction from 100% to 10% as drawdown approaches max
  return 1.0 - (drawdownRatio - 0.5) * 1.8;
}

/**
 * Calculate position sizing for regime-specific strategies
 */
export function calculateRegimeBasedPositioning(
  regime: RegimeType,
  accountSize: number,
  riskParams: RiskParameters
): {
  longAllocation: number;
  hedgeAllocation: number;
  cashAllocation: number;
  positionSizeFactor: number;
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let longAllocation: number;
  let hedgeAllocation: number;
  let positionSizeFactor: number;
  
  switch (regime) {
    case 'BULL':
      longAllocation = 0.75; // 70-80% long
      hedgeAllocation = 0.05; // 0-10% hedge
      positionSizeFactor = 1.25; // Full risk
      reasoning.push('BULL regime: 75% long, 5% hedge, full position sizing');
      break;
      
    case 'BEAR':
      longAllocation = 0.25; // 20-30% long
      hedgeAllocation = 0.25; // 20-30% hedge
      positionSizeFactor = 0.75; // Reduced risk
      reasoning.push('BEAR regime: 25% long, 25% hedge, reduced position sizing');
      break;
      
    case 'NEUTRAL':
      longAllocation = 0.50; // 50% long
      hedgeAllocation = 0.15; // 10-20% hedge
      positionSizeFactor = 1.0; // Normal risk
      reasoning.push('NEUTRAL regime: 50% long, 15% hedge, normal position sizing');
      break;
      
    default:
      longAllocation = 0.50;
      hedgeAllocation = 0.15;
      positionSizeFactor = 1.0;
      reasoning.push('Unknown regime: default balanced allocation');
  }
  
  const cashAllocation = 1.0 - longAllocation - hedgeAllocation;
  
  return {
    longAllocation,
    hedgeAllocation,
    cashAllocation,
    positionSizeFactor,
    reasoning
  };
}

/**
 * Calculate stop loss and profit target levels
 */
export function calculateStopLossAndTargets(
  entryPrice: number,
  atr: number,
  direction: 'long' | 'short',
  atrMultipliers: { stopLoss: number; target: number } = { stopLoss: 2, target: 1.5 }
): {
  stopLoss: number;
  profitTarget: number;
  riskReward: number;
  dollarRisk: number;
  dollarTarget: number;
} {
  let stopLoss: number;
  let profitTarget: number;
  
  if (direction === 'long') {
    stopLoss = entryPrice - (atr * atrMultipliers.stopLoss);
    profitTarget = entryPrice + (atr * atrMultipliers.target);
  } else {
    stopLoss = entryPrice + (atr * atrMultipliers.stopLoss);
    profitTarget = entryPrice - (atr * atrMultipliers.target);
  }
  
  const dollarRisk = Math.abs(entryPrice - stopLoss);
  const dollarTarget = Math.abs(profitTarget - entryPrice);
  const riskReward = dollarTarget / dollarRisk;
  
  return {
    stopLoss,
    profitTarget,
    riskReward,
    dollarRisk,
    dollarTarget
  };
}

/**
 * Generate position sizing recommendations for trading candidates
 */
export function generatePositionSizingRecommendations(
  candidates: TradingCandidate[],
  riskParams: RiskParameters,
  currentVIX: number,
  currentRegime: RegimeType,
  portfolioMetrics?: PortfolioMetrics
): Array<TradingCandidate & { 
  positionCalculation: PositionSizeCalculation;
  stopLossTarget: ReturnType<typeof calculateStopLossAndTargets>;
}> {
  return candidates.map(candidate => {
    const positionCalculation = calculatePositionSize(
      candidate.symbol,
      candidate.entry,
      candidate.atr,
      riskParams,
      currentVIX,
      currentRegime,
      portfolioMetrics
    );
    
    const stopLossTarget = calculateStopLossAndTargets(
      candidate.entry,
      candidate.atr,
      candidate.type === 'LONG' ? 'long' : 'short'
    );
    
    return {
      ...candidate,
      positionSize: positionCalculation.adjustedSize,
      positionCalculation,
      stopLossTarget
    };
  });
}

/**
 * Calculate portfolio-level risk metrics
 */
export function calculatePortfolioRiskMetrics(
  positions: Array<{ symbol: string; size: number; price: number; atr: number }>,
  accountSize: number
): {
  totalExposure: number;
  portfolioHeat: number;
  concentrationRisk: number;
  averageATR: number;
  estimatedPortfolioATR: number;
} {
  if (positions.length === 0) {
    return {
      totalExposure: 0,
      portfolioHeat: 0,
      concentrationRisk: 0,
      averageATR: 0,
      estimatedPortfolioATR: 0
    };
  }
  
  // Calculate total exposure
  const totalExposure = positions.reduce((sum, pos) => sum + (pos.size * pos.price), 0);
  const exposureRatio = totalExposure / accountSize;
  
  // Calculate portfolio heat (risk as % of account)
  const totalRisk = positions.reduce((sum, pos) => sum + (pos.size * pos.atr * 2), 0);
  const portfolioHeat = totalRisk / accountSize;
  
  // Calculate concentration risk (largest position as % of total)
  const positionSizes = positions.map(pos => pos.size * pos.price);
  const largestPosition = Math.max(...positionSizes);
  const concentrationRisk = largestPosition / totalExposure;
  
  // Calculate average ATR
  const weightedATRSum = positions.reduce((sum, pos) => {
    const weight = (pos.size * pos.price) / totalExposure;
    return sum + (pos.atr / pos.price * weight);
  }, 0);
  
  const averageATR = positions.reduce((sum, pos) => sum + pos.atr, 0) / positions.length;
  const estimatedPortfolioATR = weightedATRSum;
  
  return {
    totalExposure: exposureRatio,
    portfolioHeat,
    concentrationRisk,
    averageATR,
    estimatedPortfolioATR
  };
}

/**
 * Generate risk management alerts
 */
export function generateRiskAlerts(
  portfolioMetrics: PortfolioMetrics,
  riskParams: RiskParameters,
  currentVIX: number
): Array<{
  type: 'warning' | 'critical';
  message: string;
  action: string;
}> {
  const alerts: Array<{ type: 'warning' | 'critical'; message: string; action: string }> = [];
  
  // Drawdown alerts
  if (portfolioMetrics.drawdown >= riskParams.maxDrawdown) {
    alerts.push({
      type: 'critical',
      message: `Portfolio drawdown (${(portfolioMetrics.drawdown * 100).toFixed(1)}%) has reached maximum limit (${(riskParams.maxDrawdown * 100).toFixed(1)}%)`,
      action: 'Move to 100% cash immediately'
    });
  } else if (portfolioMetrics.drawdown >= riskParams.maxDrawdown * 0.7) {
    alerts.push({
      type: 'warning',
      message: `Portfolio drawdown (${(portfolioMetrics.drawdown * 100).toFixed(1)}%) approaching maximum limit`,
      action: 'Reduce position sizes by 50%'
    });
  }
  
  // VIX alerts
  if (currentVIX > riskParams.vixThreshold) {
    alerts.push({
      type: 'warning',
      message: `VIX (${currentVIX.toFixed(1)}) above threshold (${riskParams.vixThreshold})`,
      action: 'Reduce all position sizes by 50%'
    });
  }
  
  // Concentration alerts
  const maxSectorWeight = Math.max(...Object.values(portfolioMetrics.sectorConcentration));
  if (maxSectorWeight > 0.25) {
    alerts.push({
      type: 'warning',
      message: `Sector concentration (${(maxSectorWeight * 100).toFixed(1)}%) exceeds 25% limit`,
      action: 'Diversify sector exposure'
    });
  }
  
  // Exposure alerts
  if (portfolioMetrics.totalExposure > 1.5) {
    alerts.push({
      type: 'critical',
      message: `Total exposure (${(portfolioMetrics.totalExposure * 100).toFixed(0)}%) exceeds 150% limit`,
      action: 'Reduce leverage immediately'
    });
  }
  
  return alerts;
}

/**
 * Calculate optimal position size for a new trade
 */
export function calculateOptimalPositionSize(
  candidate: TradingCandidate,
  riskParams: RiskParameters,
  currentVIX: number,
  currentRegime: RegimeType,
  portfolioMetrics: PortfolioMetrics
): {
  recommendedSize: number;
  maxSafeSize: number;
  reasoning: string[];
  riskLevel: 'low' | 'medium' | 'high';
} {
  const positionCalc = calculatePositionSize(
    candidate.symbol,
    candidate.entry,
    candidate.atr,
    riskParams,
    currentVIX,
    currentRegime,
    portfolioMetrics
  );
  
  // Calculate maximum safe size based on portfolio constraints
  const availableRisk = riskParams.maxDrawdown - portfolioMetrics.drawdown;
  const maxRiskPerTrade = Math.min(riskParams.riskPerTrade, availableRisk * 0.5);
  const maxSafeSize = (riskParams.accountSize * maxRiskPerTrade) / (candidate.atr * 2);
  
  const recommendedSize = Math.min(positionCalc.adjustedSize, maxSafeSize);
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'medium';
  const positionRisk = (recommendedSize * candidate.atr * 2) / riskParams.accountSize;
  
  if (positionRisk < 0.005) riskLevel = 'low';
  else if (positionRisk > 0.015) riskLevel = 'high';
  
  const reasoning = [
    ...positionCalc.reasoning,
    `Available portfolio risk: ${(availableRisk * 100).toFixed(1)}%`,
    `Position risk: ${(positionRisk * 100).toFixed(2)}% of account`,
    `Risk level: ${riskLevel}`
  ];
  
  return {
    recommendedSize,
    maxSafeSize,
    reasoning,
    riskLevel
  };
}