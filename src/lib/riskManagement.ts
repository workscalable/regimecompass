import { 
  RiskMetrics, 
  PortfolioMetrics, 
  TradingCandidate, 
  MarketSnapshot,
  RegimeType 
} from './types';
import { calculatePortfolioRiskMetrics, generateRiskAlerts } from './risk/positionSizing';

/**
 * Risk Management System
 * Implements portfolio-level drawdown controls, VIX adjustments, and stop loss management
 * Based on the risk framework from trading specifications
 */

export interface RiskManagementOutput {
  currentRisk: RiskAssessment;
  alerts: RiskAlert[];
  recommendations: RiskRecommendation[];
  portfolioAdjustments: PortfolioAdjustment[];
  emergencyActions: EmergencyAction[];
}

export interface RiskAssessment {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  portfolioHeat: number; // 0-1 scale
  drawdownLevel: number; // Current drawdown percentage
  concentrationRisk: number; // 0-1 scale
  volatilityRisk: number; // Based on VIX and market conditions
  regimeRisk: number; // Risk of regime change
  timeToMaxDrawdown: string; // Estimated time to hit max drawdown at current rate
}

export interface RiskAlert {
  type: 'info' | 'warning' | 'critical' | 'emergency';
  category: 'drawdown' | 'concentration' | 'volatility' | 'regime' | 'position';
  message: string;
  action: string;
  priority: number; // 1-10 scale
  timeframe: 'immediate' | 'today' | 'this_week';
}

export interface RiskRecommendation {
  type: 'position_sizing' | 'exposure_reduction' | 'hedging' | 'cash_raise' | 'stop_loss';
  description: string;
  impact: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  implementation: string[];
}

export interface PortfolioAdjustment {
  adjustmentType: 'reduce_exposure' | 'increase_hedging' | 'tighten_stops' | 'raise_cash';
  targetAdjustment: number; // Percentage change
  affectedPositions: string[];
  reasoning: string;
  timeframe: 'immediate' | 'end_of_day' | 'this_week';
}

export interface EmergencyAction {
  trigger: string;
  action: string;
  priority: 'immediate' | 'urgent' | 'high';
  automation: boolean; // Can this be automated?
}

/**
 * Comprehensive risk management analysis
 */
export function analyzeRiskManagement(
  snapshot: MarketSnapshot,
  portfolioMetrics: PortfolioMetrics,
  currentPositions: TradingCandidate[],
  riskParameters: {
    maxDrawdown: number;
    maxPositionSize: number;
    maxSectorConcentration: number;
    vixThreshold: number;
    riskPerTrade: number;
  }
): RiskManagementOutput {
  
  // Assess current risk levels
  const currentRisk = assessCurrentRisk(snapshot, portfolioMetrics, riskParameters);
  
  // Generate risk alerts
  const alerts = generateComprehensiveRiskAlerts(snapshot, portfolioMetrics, riskParameters);
  
  // Generate recommendations
  const recommendations = generateRiskRecommendations(currentRisk, snapshot, portfolioMetrics);
  
  // Calculate portfolio adjustments
  const portfolioAdjustments = calculatePortfolioAdjustments(
    currentRisk, 
    portfolioMetrics, 
    currentPositions,
    riskParameters
  );
  
  // Define emergency actions
  const emergencyActions = defineEmergencyActions(currentRisk, riskParameters);
  
  return {
    currentRisk,
    alerts,
    recommendations,
    portfolioAdjustments,
    emergencyActions
  };
}

/**
 * Assess current risk levels across all dimensions
 */
function assessCurrentRisk(
  snapshot: MarketSnapshot,
  portfolioMetrics: PortfolioMetrics,
  riskParameters: any
): RiskAssessment {
  
  // Calculate portfolio heat (risk as % of account)
  // Portfolio heat needs to be calculated from positions
  const portfolioHeat = portfolioMetrics.totalExposure * 0.02; // Simplified calculation
  
  // Current drawdown level
  const drawdownLevel = portfolioMetrics.drawdown;
  
  // Concentration risk
  const maxSectorWeight = Math.max(...Object.values(portfolioMetrics.sectorConcentration));
  const concentrationRisk = maxSectorWeight;
  
  // Volatility risk based on VIX
  const vix = snapshot.vix.value;
  const volatilityRisk = Math.min(1, Math.max(0, (vix - 15) / 20)); // 0 at VIX 15, 1 at VIX 35
  
  // Regime risk (probability of regime change)
  const regimeStrength = snapshot.derivedSignals.regimeStrength;
  const regimeRisk = Math.max(0, (100 - regimeStrength) / 100);
  
  // Overall risk level
  let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  if (drawdownLevel >= riskParameters.maxDrawdown * 0.9) {
    overallRiskLevel = 'critical';
  } else if (drawdownLevel >= riskParameters.maxDrawdown * 0.7 || vix > 30) {
    overallRiskLevel = 'high';
  } else if (drawdownLevel >= riskParameters.maxDrawdown * 0.5 || vix > 25 || concentrationRisk > 0.3) {
    overallRiskLevel = 'medium';
  }
  
  // Estimate time to max drawdown
  const drawdownRate = drawdownLevel > 0 ? drawdownLevel / 30 : 0; // Assume 30-day period
  const remainingDrawdown = riskParameters.maxDrawdown - drawdownLevel;
  const daysToMaxDrawdown = drawdownRate > 0 ? remainingDrawdown / drawdownRate : Infinity;
  
  let timeToMaxDrawdown = 'Not applicable';
  if (daysToMaxDrawdown < 7) {
    timeToMaxDrawdown = 'Less than 1 week';
  } else if (daysToMaxDrawdown < 30) {
    timeToMaxDrawdown = `${Math.round(daysToMaxDrawdown)} days`;
  } else if (daysToMaxDrawdown < 365) {
    timeToMaxDrawdown = `${Math.round(daysToMaxDrawdown / 30)} months`;
  }
  
  return {
    overallRiskLevel,
    portfolioHeat,
    drawdownLevel,
    concentrationRisk,
    volatilityRisk,
    regimeRisk,
    timeToMaxDrawdown
  };
}

/**
 * Generate comprehensive risk alerts
 */
function generateComprehensiveRiskAlerts(
  snapshot: MarketSnapshot,
  portfolioMetrics: PortfolioMetrics,
  riskParameters: any
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  
  // Drawdown alerts (as specified: 5% reduction trigger, 7% stop)
  if (portfolioMetrics.drawdown >= riskParameters.maxDrawdown) {
    alerts.push({
      type: 'emergency',
      category: 'drawdown',
      message: `Portfolio drawdown (${(portfolioMetrics.drawdown * 100).toFixed(1)}%) has reached maximum limit (${(riskParameters.maxDrawdown * 100).toFixed(1)}%)`,
      action: 'Move to 100% cash immediately',
      priority: 10,
      timeframe: 'immediate'
    });
  } else if (portfolioMetrics.drawdown >= riskParameters.maxDrawdown * 0.7) {
    alerts.push({
      type: 'critical',
      category: 'drawdown',
      message: `Portfolio drawdown (${(portfolioMetrics.drawdown * 100).toFixed(1)}%) approaching maximum limit`,
      action: 'Reduce position sizes by 50%',
      priority: 9,
      timeframe: 'immediate'
    });
  }
  
  // VIX alerts (as specified: 50% reduction when VIX > 25)
  if (snapshot.vix.value > riskParameters.vixThreshold) {
    alerts.push({
      type: 'warning',
      category: 'volatility',
      message: `VIX (${snapshot.vix.value.toFixed(1)}) above threshold (${riskParameters.vixThreshold})`,
      action: 'Reduce all position sizes by 50%',
      priority: 7,
      timeframe: 'today'
    });
  }
  
  // Concentration alerts
  const maxSectorWeight = Math.max(...Object.values(portfolioMetrics.sectorConcentration));
  if (maxSectorWeight > riskParameters.maxSectorConcentration) {
    alerts.push({
      type: 'warning',
      category: 'concentration',
      message: `Sector concentration (${(maxSectorWeight * 100).toFixed(1)}%) exceeds limit (${(riskParameters.maxSectorConcentration * 100).toFixed(1)}%)`,
      action: 'Diversify sector exposure',
      priority: 6,
      timeframe: 'this_week'
    });
  }
  
  // Regime change alerts
  if (snapshot.derivedSignals.regimeStrength < 40) {
    alerts.push({
      type: 'warning',
      category: 'regime',
      message: `Weak regime strength (${snapshot.derivedSignals.regimeStrength}) suggests potential regime change`,
      action: 'Reduce position sizes and increase hedging',
      priority: 5,
      timeframe: 'today'
    });
  }
  
  // Leverage alerts
  if (portfolioMetrics.totalExposure > 1.5) {
    alerts.push({
      type: 'critical',
      category: 'position',
      message: `Total exposure (${(portfolioMetrics.totalExposure * 100).toFixed(0)}%) exceeds 150% limit`,
      action: 'Reduce leverage immediately',
      priority: 8,
      timeframe: 'immediate'
    });
  }
  
  return alerts.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate risk management recommendations
 */
function generateRiskRecommendations(
  riskAssessment: RiskAssessment,
  snapshot: MarketSnapshot,
  portfolioMetrics: PortfolioMetrics
): RiskRecommendation[] {
  const recommendations: RiskRecommendation[] = [];
  
  // Position sizing recommendations
  if (riskAssessment.overallRiskLevel === 'high' || riskAssessment.overallRiskLevel === 'critical') {
    recommendations.push({
      type: 'position_sizing',
      description: 'Reduce all new position sizes by 50% until risk levels normalize',
      impact: 'high',
      urgency: 'high',
      implementation: [
        'Apply 0.5x multiplier to all position size calculations',
        'Review existing positions for size reduction opportunities',
        'Avoid new positions above 5% of portfolio'
      ]
    });
  }
  
  // Exposure reduction recommendations
  if (riskAssessment.drawdownLevel > 0.05) { // 5% drawdown trigger as specified
    recommendations.push({
      type: 'exposure_reduction',
      description: 'Reduce overall portfolio exposure to limit further drawdown',
      impact: 'high',
      urgency: 'medium',
      implementation: [
        'Reduce long exposure by 25%',
        'Tighten stop losses on existing positions',
        'Avoid adding new positions until drawdown recovers'
      ]
    });
  }
  
  // Hedging recommendations
  if (riskAssessment.volatilityRisk > 0.6 || snapshot.regime === 'BEAR') {
    recommendations.push({
      type: 'hedging',
      description: 'Increase portfolio hedging to protect against downside risk',
      impact: 'medium',
      urgency: 'medium',
      implementation: [
        'Add inverse ETF positions (SDS, SQQQ)',
        'Increase defensive sector allocation',
        'Consider VIX calls for volatility protection'
      ]
    });
  }
  
  // Cash raising recommendations
  if (riskAssessment.overallRiskLevel === 'critical') {
    recommendations.push({
      type: 'cash_raise',
      description: 'Raise cash levels to preserve capital and provide flexibility',
      impact: 'high',
      urgency: 'high',
      implementation: [
        'Target 20-30% cash allocation',
        'Exit weakest positions first',
        'Maintain only highest conviction trades'
      ]
    });
  }
  
  // Stop loss tightening
  if (riskAssessment.regimeRisk > 0.6) {
    recommendations.push({
      type: 'stop_loss',
      description: 'Tighten stop losses due to increased regime change risk',
      impact: 'medium',
      urgency: 'medium',
      implementation: [
        'Reduce stop loss distance from 2x ATR to 1.5x ATR',
        'Implement trailing stops on profitable positions',
        'Use time-based stops for positions not moving favorably'
      ]
    });
  }
  
  return recommendations;
}

/**
 * Calculate specific portfolio adjustments
 */
function calculatePortfolioAdjustments(
  riskAssessment: RiskAssessment,
  portfolioMetrics: PortfolioMetrics,
  currentPositions: TradingCandidate[],
  riskParameters: any
): PortfolioAdjustment[] {
  const adjustments: PortfolioAdjustment[] = [];
  
  // Exposure reduction based on drawdown
  if (riskAssessment.drawdownLevel >= riskParameters.maxDrawdown * 0.7) {
    adjustments.push({
      adjustmentType: 'reduce_exposure',
      targetAdjustment: -50, // 50% reduction as specified
      affectedPositions: currentPositions.map(p => p.symbol),
      reasoning: 'Drawdown approaching maximum limit requires immediate exposure reduction',
      timeframe: 'immediate'
    });
  } else if (riskAssessment.drawdownLevel >= riskParameters.maxDrawdown * 0.5) {
    adjustments.push({
      adjustmentType: 'reduce_exposure',
      targetAdjustment: -25, // 25% reduction
      affectedPositions: currentPositions.filter(p => p.confidence < 0.7).map(p => p.symbol),
      reasoning: 'Moderate drawdown requires selective position reduction',
      timeframe: 'end_of_day'
    });
  }
  
  // Hedging increase based on volatility
  if (riskAssessment.volatilityRisk > 0.7) {
    adjustments.push({
      adjustmentType: 'increase_hedging',
      targetAdjustment: 25, // Increase hedging to 25%
      affectedPositions: ['SDS', 'SQQQ', 'VXX'],
      reasoning: 'High volatility environment requires increased hedging',
      timeframe: 'end_of_day'
    });
  }
  
  // Stop loss tightening
  if (riskAssessment.regimeRisk > 0.6) {
    adjustments.push({
      adjustmentType: 'tighten_stops',
      targetAdjustment: -25, // Tighten stops by 25%
      affectedPositions: currentPositions.map(p => p.symbol),
      reasoning: 'High regime change risk requires tighter risk management',
      timeframe: 'end_of_day'
    });
  }
  
  // Cash raising for critical risk
  if (riskAssessment.overallRiskLevel === 'critical') {
    adjustments.push({
      adjustmentType: 'raise_cash',
      targetAdjustment: 30, // Target 30% cash
      affectedPositions: currentPositions.filter(p => p.confidence < 0.6).map(p => p.symbol),
      reasoning: 'Critical risk level requires significant cash raise',
      timeframe: 'immediate'
    });
  }
  
  return adjustments;
}

/**
 * Define emergency actions for critical situations
 */
function defineEmergencyActions(
  riskAssessment: RiskAssessment,
  riskParameters: any
): EmergencyAction[] {
  const actions: EmergencyAction[] = [];
  
  // Maximum drawdown reached
  actions.push({
    trigger: `Portfolio drawdown reaches ${(riskParameters.maxDrawdown * 100).toFixed(1)}%`,
    action: 'Liquidate all positions and move to 100% cash',
    priority: 'immediate',
    automation: true
  });
  
  // Extreme volatility
  actions.push({
    trigger: 'VIX exceeds 40 or daily portfolio loss exceeds 5%',
    action: 'Reduce all positions by 75% and increase hedging to 50%',
    priority: 'immediate',
    automation: true
  });
  
  // Regime breakdown
  actions.push({
    trigger: 'Regime strength falls below 20 for 2 consecutive days',
    action: 'Exit all directional positions and move to defensive allocation',
    priority: 'urgent',
    automation: false
  });
  
  // Concentration breach
  actions.push({
    trigger: 'Single position exceeds 15% of portfolio',
    action: 'Reduce position to maximum 10% allocation',
    priority: 'high',
    automation: true
  });
  
  // Leverage breach
  actions.push({
    trigger: 'Total exposure exceeds 200% of account value',
    action: 'Reduce positions to bring exposure below 150%',
    priority: 'urgent',
    automation: true
  });
  
  return actions;
}

/**
 * Calculate dynamic stop loss levels based on market conditions
 */
export function calculateDynamicStopLoss(
  entryPrice: number,
  currentPrice: number,
  atr: number,
  marketConditions: {
    vix: number;
    regime: RegimeType;
    regimeStrength: number;
  }
): {
  stopLoss: number;
  trailingStop: number;
  timeStop: number; // Days to exit if no progress
  reasoning: string[];
} {
  const reasoning: string[] = [];
  let stopMultiplier = 2.0; // Base 2x ATR as specified
  
  // Adjust based on VIX
  if (marketConditions.vix > 25) {
    stopMultiplier *= 1.2; // Wider stops in high volatility
    reasoning.push('Wider stops due to high VIX');
  } else if (marketConditions.vix < 15) {
    stopMultiplier *= 0.8; // Tighter stops in low volatility
    reasoning.push('Tighter stops due to low VIX');
  }
  
  // Adjust based on regime strength
  if (marketConditions.regimeStrength < 50) {
    stopMultiplier *= 0.8; // Tighter stops in weak regime
    reasoning.push('Tighter stops due to weak regime');
  }
  
  // Calculate stops
  const stopLoss = entryPrice - (atr * stopMultiplier);
  
  // Trailing stop (1x ATR from current high)
  const trailingStop = currentPrice - atr;
  
  // Time stop (exit if no progress)
  let timeStop = 10; // Base 10 days
  if (marketConditions.regime === 'NEUTRAL') {
    timeStop = 5; // Shorter time in neutral regime
  }
  
  return {
    stopLoss: Math.max(stopLoss, trailingStop), // Use the higher of the two
    trailingStop,
    timeStop,
    reasoning
  };
}

/**
 * Monitor portfolio heat in real-time
 */
export function monitorPortfolioHeat(
  positions: Array<{ symbol: string; size: number; price: number; atr: number; stopLoss: number }>,
  accountSize: number
): {
  currentHeat: number;
  maxHeat: number;
  heatByPosition: Array<{ symbol: string; heat: number; percentage: number }>;
  recommendations: string[];
} {
  const heatByPosition = positions.map(position => {
    const riskPerShare = Math.abs(position.price - position.stopLoss);
    const totalRisk = position.size * riskPerShare;
    const heat = totalRisk / accountSize;
    const percentage = (heat * 100);
    
    return {
      symbol: position.symbol,
      heat,
      percentage
    };
  });
  
  const currentHeat = heatByPosition.reduce((sum, pos) => sum + pos.heat, 0);
  const maxHeat = 0.20; // 20% maximum portfolio heat
  
  const recommendations: string[] = [];
  
  if (currentHeat > maxHeat) {
    recommendations.push(`Portfolio heat (${(currentHeat * 100).toFixed(1)}%) exceeds maximum (${(maxHeat * 100).toFixed(1)}%)`);
    recommendations.push('Reduce position sizes or tighten stop losses');
  }
  
  // Individual position heat warnings
  heatByPosition.forEach(pos => {
    if (pos.heat > 0.05) { // 5% per position max
      recommendations.push(`${pos.symbol} position heat (${pos.percentage.toFixed(1)}%) too high`);
    }
  });
  
  return {
    currentHeat,
    maxHeat,
    heatByPosition,
    recommendations
  };
}