import { EventEmitter } from 'events';

// Core Options Recommendation Interfaces
export interface OptionsRecommendationResult {
  ticker: string;
  timestamp: Date;
  currentPrice: number;
  marketAnalysis: MarketAnalysis;
  topRecommendations: OptionsRecommendation[];
  allRecommendations: OptionsRecommendation[];
  riskRewardAnalysis: RiskRewardAnalysis;
  liquidityAnalysis: LiquidityAnalysis;
  confidenceMetrics: ConfidenceMetrics;
  tradingImplications: TradingImplications;
}

export interface MarketAnalysis {
  volatilityEnvironment: string;
  trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trendStrength: number; // 0-1
  expectedMove: number;
  timeDecayEnvironment: string;
  liquidityConditions: string;
  optionsFlow: string;
}

export interface OptionsRecommendation {
  symbol: string;
  strike: number;
  expiration: Date;
  type: 'CALL' | 'PUT';
  confidence: number; // 0-1
  expectedMove: number;
  strategy: string;
  reasoning: string[];
  greeks: OptionsGreeks;
  riskReward: RiskReward;
  liquidity: LiquidityMetrics;
  fibonacciAlignment: FibonacciAlignment;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  positionSize: number;
  timeframe: string;
  breakeven: number;
  maxRisk: number;
  maxReward: number;
  profitProbability: number;
  daysToExpiration: number;
}

export interface OptionsGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  impliedVolatility: number;
}

export interface RiskReward {
  maxRisk: number;
  maxReward: number;
  breakeven: number;
  profitProbability: number;
  riskRewardRatio: number;
  probabilityAdjustedReturn: number;
  timeDecayImpact: number;
  volatilityImpact: number;
}

export interface LiquidityMetrics {
  bidAskSpread: number;
  spreadPercentage: number;
  volume: number;
  openInterest: number;
  liquidityScore: number; // 0-1
  liquidityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  averageDailyVolume: number;
  volumeRatio: number; // Current volume vs average
}

export interface FibonacciAlignment {
  nearestFibLevel: number;
  distanceToFibLevel: number;
  fibLevelType: string;
  alignmentScore: number; // 0-1
  supportResistanceLevel: number | null;
}

export interface RiskRewardAnalysis {
  averageRiskReward: number;
  bestRiskReward: number;
  worstRiskReward: number;
  averageProfitProbability: number;
  totalRisk: number;
  totalReward: number;
  diversificationScore: number;
}

export interface LiquidityAnalysis {
  averageLiquidity: number;
  liquidityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  overallLiquidityRating: string;
  liquidityRisks: string[];
}

export interface ConfidenceMetrics {
  averageConfidence: number;
  confidenceRange: {
    min: number;
    max: number;
  };
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  confidenceFactors: string[];
}

export interface TradingImplications {
  recommendedStrategy: string;
  positionSizing: string;
  entryTiming: string;
  exitStrategy: string;
  riskManagement: string[];
  marketRisks: string[];
  opportunityScore: number; // 0-1
}

// Fibonacci Analysis Interface (imported from other engines)
export interface FibonacciAnalysis {
  currentZone: string;
  zoneMultiplier: number;
  keyLevels: Array<{ level: number; type: string; strength: number }>;
  expansionPhase: string;
  riskAdjustment: number;
}

// Enhanced Strike and Expiration Selection Interfaces
export interface StrikeSelectionCriteria {
  confidence: number;
  expectedMove: number;
  underlyingPrice: number;
  fibAnalysis?: FibonacciAnalysis;
  timeframe: string;
  riskTolerance: 'LOW' | 'MODERATE' | 'HIGH';
  liquidityPreference: 'MINIMUM' | 'PREFERRED' | 'PREMIUM';
}

export interface StrikeSelectionResult {
  primaryStrike: OptionContract | null;
  alternativeStrikes: OptionContract[];
  strikeAnalysis: StrikeAnalysis;
  selectionReasoning: string[];
}

export interface StrikeAnalysis {
  deltaDistribution: DeltaDistribution;
  riskRewardProfile: RiskRewardProfile;
  liquidityProfile: LiquidityProfile;
  fibonacciAlignment: FibonacciAlignmentAnalysis;
  timeDecayImpact: TimeDecayImpact;
}

export interface DeltaDistribution {
  averageDelta: number;
  deltaRange: { min: number; max: number };
  optimalDeltaZone: { min: number; max: number };
  deltaEfficiency: number; // 0-1, how well deltas match expected move
}

export interface RiskRewardProfile {
  averageRiskReward: number;
  riskRewardRange: { min: number; max: number };
  probabilityWeightedReturn: number;
  riskAdjustedReturn: number;
}

export interface LiquidityProfile {
  averageLiquidity: number;
  liquidityConsistency: number; // 0-1, consistency across strikes
  executionRisk: number; // 0-1, risk of poor execution
  marketImpact: number; // 0-1, expected market impact
}

export interface FibonacciAlignmentAnalysis {
  alignmentScore: number; // 0-1, overall alignment with Fib levels
  nearbyLevels: Array<{ level: number; distance: number; strength: number }>;
  supportResistanceImpact: number; // 0-1, impact of S/R levels
}

export interface TimeDecayImpact {
  dailyDecay: number;
  weeklyDecay: number;
  accelerationRisk: number; // 0-1, risk of theta acceleration
  optimalTimeframe: string;
}

export interface ExpirationSelectionCriteria {
  confidence: number;
  expectedMove: number;
  timeframe: string;
  volatilityEnvironment?: string;
  thetaPreference: 'MINIMIZE' | 'MODERATE' | 'AGGRESSIVE';
  eventRisk: 'AVOID' | 'NEUTRAL' | 'EMBRACE';
}

export interface ExpirationSelectionResult {
  primaryExpiration: Date;
  alternativeExpirations: Date[];
  expirationAnalysis: ExpirationAnalysis;
  selectionReasoning: string[];
}

export interface ExpirationAnalysis {
  dteDistribution: DteDistribution;
  timeDecayProfile: TimeDecayProfile;
  volatilityProfile: VolatilityProfile;
  eventRiskProfile: EventRiskProfile;
}

export interface DteDistribution {
  averageDte: number;
  dteRange: { min: number; max: number };
  optimalDteZone: { min: number; max: number };
  dteEfficiency: number; // 0-1, how well DTEs match strategy
}

export interface TimeDecayProfile {
  currentDecayRate: number;
  projectedDecayRate: number;
  decayAcceleration: number;
  optimalHoldingPeriod: number; // Days
}

export interface VolatilityProfile {
  impliedVolatility: number;
  volRisk: number; // 0-1, volatility risk
  volOpportunity: number; // 0-1, volatility opportunity
  volStability: number; // 0-1, IV stability
}

export interface EventRiskProfile {
  earningsRisk: number; // 0-1, earnings event risk
  eventProximity: number; // Days to nearest event
  eventImpact: number; // 0-1, expected impact
  eventStrategy: string; // Recommended approach
}

export interface OptimizationCriteria {
  expectedMove: number;
  confidence: number;
  timeframe: string;
  underlyingPrice: number;
  volatilityEnvironment?: string;
  fibAnalysis?: FibonacciAnalysis;
}

export interface OptimizationResult {
  optimalCombination: StrikeExpirationCombination | null;
  alternativeCombinations: StrikeExpirationCombination[];
  optimizationAnalysis: OptimizationAnalysis;
  recommendations: OptimizationRecommendation[];
}

export interface StrikeExpirationCombination {
  contract: OptionContract;
  expiration: Date;
  dte: number;
  optimizationScore: number;
  timeDecayOptimization: TimeDecayOptimization;
  expectedMoveAlignment: ExpectedMoveAlignment;
}

export interface TimeDecayOptimization {
  optimalHoldingPeriod: number; // Days
  decayEfficiency: number; // 0-1, efficiency of time decay
  thetaRisk: number; // 0-1, theta risk level
  thetaOpportunity: number; // 0-1, theta opportunity
}

export interface ExpectedMoveAlignment {
  moveRequirement: number; // Required move to profit
  moveProbability: number; // 0-1, probability of required move
  moveEfficiency: number; // 0-1, efficiency of move capture
  breakoutPotential: number; // 0-1, potential for larger moves
}

export interface OptimizationAnalysis {
  overallEfficiency: number; // 0-1, overall optimization efficiency
  riskRewardOptimization: number; // 0-1, R/R optimization score
  timeDecayOptimization: number; // 0-1, time decay optimization
  liquidityOptimization: number; // 0-1, liquidity optimization
  fibonacciOptimization: number; // 0-1, Fibonacci alignment optimization
}

export interface OptimizationRecommendation {
  type: 'STRIKE' | 'EXPIRATION' | 'COMBINATION' | 'STRATEGY';
  recommendation: string;
  reasoning: string;
  impact: number; // 0-1, expected impact
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

// Core Options Data Interfaces
export interface OptionContract {
  symbol: string;
  strike: number;
  expiration: Date;
  type: 'CALL' | 'PUT';
  bid: number;
  ask: number;
  midPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  daysToExpiration: number;
  greeks: OptionsGreeks;
}

export interface OptionsChain {
  ticker: string;
  underlyingPrice: number;
  calls: OptionContract[];
  puts: OptionContract[];
  expirations: Date[];
  timestamp: Date;
}

// Enhanced Greeks Analysis and Liquidity Assessment Interfaces
export interface EnhancedRiskReward extends RiskReward {
  expectedReward: number;
  worstCase: number;
  greeksImpact: GreeksImpactAnalysis;
  riskAdjustedMetrics: RiskAdjustedMetrics;
  scenarioAnalysis: ScenarioAnalysis;
}

export interface GreeksImpactAnalysis {
  deltaImpact: number;
  gammaImpact: number;
  thetaImpact: number;
  vegaImpact: number;
  rhoImpact: number;
  totalImpact: number;
  greeksEfficiency: number; // 0-1, how efficiently Greeks work together
  riskDecomposition: RiskDecomposition;
  dominantGreek: 'DELTA' | 'GAMMA' | 'THETA' | 'VEGA' | 'RHO';
  hedgingRequirements: HedgingRequirements;
}

export interface RiskDecomposition {
  priceRisk: number; // Risk from price movement (Delta + Gamma)
  timeRisk: number; // Risk from time decay (Theta)
  volatilityRisk: number; // Risk from volatility changes (Vega)
  interestRateRisk: number; // Risk from rate changes (Rho)
  totalRisk: number;
}

export interface HedgingRequirements {
  deltaHedgeRequired: boolean;
  gammaHedgeRequired: boolean;
  vegaHedgeRequired: boolean;
  hedgingCost: number; // Estimated cost to hedge
  hedgingComplexity: 'LOW' | 'MODERATE' | 'HIGH';
  recommendedHedges: string[];
}

export interface RiskAdjustedMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  valueAtRisk: number; // 95% VaR
  expectedShortfall: number; // Conditional VaR
}

export interface ScenarioAnalysis {
  bullishScenario: ScenarioResult;
  bearishScenario: ScenarioResult;
  neutralScenario: ScenarioResult;
  volatilityExpansion: ScenarioResult;
  volatilityContraction: ScenarioResult;
  timeDecayScenario: ScenarioResult;
}

export interface ScenarioResult {
  priceChange: number;
  expectedPnL: number;
  probability: number;
  greeksContribution: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

export interface ComprehensiveLiquidityAssessment extends LiquidityMetrics {
  coreMetrics: CoreLiquidityMetrics;
  microstructureAnalysis: MicrostructureAnalysis;
  executionCosts: ExecutionCosts;
  liquidityRisk: LiquidityRisk;
  marketImpact: MarketImpact;
  timingAnalysis: TimingAnalysis;
  overallScore: number;
  liquidityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR';
  recommendations: LiquidityRecommendation[];
}

export interface CoreLiquidityMetrics {
  volumeScore: number; // 0-1
  openInterestScore: number; // 0-1
  spreadScore: number; // 0-1
  averageDailyVolume: number;
  volumeRatio: number; // Current vs average volume
  openInterestRank: number; // Percentile rank
  spreadRank: number; // Percentile rank vs similar contracts
}

export interface MicrostructureAnalysis {
  bidAskSpreadStability: number; // 0-1, stability of spread
  orderBookDepth: number; // Estimated depth
  priceImpactModel: PriceImpactModel;
  liquidityProvision: number; // 0-1, level of liquidity provision
  marketMakerPresence: number; // 0-1, estimated MM presence
  retailFlow: number; // 0-1, estimated retail participation
}

export interface PriceImpactModel {
  linearImpact: number; // Linear price impact coefficient
  nonlinearImpact: number; // Non-linear impact coefficient
  temporaryImpact: number; // Temporary impact estimate
  permanentImpact: number; // Permanent impact estimate
}

export interface ExecutionCosts {
  bidAskCost: number; // Cost from bid-ask spread
  marketImpactCost: number; // Cost from market impact
  timingCost: number; // Cost from execution timing
  opportunityCost: number; // Cost of delayed execution
  totalExecutionCost: number;
  executionCostPercentage: number; // As % of position value
}

export interface LiquidityRisk {
  executionRisk: number; // 0-1, risk of poor execution
  liquidityDryUpRisk: number; // 0-1, risk of liquidity disappearing
  wideSpreadsRisk: number; // 0-1, risk of spread widening
  marketStressRisk: number; // 0-1, risk during market stress
  overallLiquidityRisk: number; // 0-1, composite risk score
}

export interface MarketImpact {
  immediateImpact: number; // Immediate price impact
  delayedImpact: number; // Impact over time
  recoveryTime: number; // Time for price to recover (minutes)
  impactAsymmetry: number; // Difference between buy/sell impact
}

export interface TimingAnalysis {
  optimalExecutionTime: string; // Best time to execute
  executionUrgency: 'LOW' | 'MODERATE' | 'HIGH';
  timingRisk: number; // 0-1, risk from execution timing
  marketHours: boolean; // Whether to execute during market hours
  volumeProfile: number[]; // Hourly volume profile
}

export interface LiquidityRecommendation {
  type: 'EXECUTION' | 'TIMING' | 'SIZE' | 'ALTERNATIVE';
  recommendation: string;
  reasoning: string;
  impact: number; // 0-1, expected impact on execution quality
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RankedRecommendation {
  recommendation: OptionsRecommendation;
  rank: number;
  compositeScore: number;
  rankingFactors: RankingFactors;
  rankingTier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';
  liquidityScore: number;
  riskRewardScore: number;
  confidenceScore: number;
  rankingReasoning: string[];
}

export interface RankingFactors {
  liquidityFactor: number; // 0-1, liquidity contribution to ranking
  riskRewardFactor: number; // 0-1, R/R contribution to ranking
  confidenceFactor: number; // 0-1, confidence contribution to ranking
  greeksFactor: number; // 0-1, Greeks efficiency contribution
  fibonacciFactor: number; // 0-1, Fibonacci alignment contribution
  diversificationFactor: number; // 0-1, portfolio diversification benefit
}

export interface MarketConditions {
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  liquidityRegime: 'ABUNDANT' | 'NORMAL' | 'CONSTRAINED' | 'STRESSED';
  marketStress: number; // 0-1, level of market stress
  tradingSession: 'PRE_MARKET' | 'REGULAR' | 'AFTER_HOURS';
}/**
 * Smart Options Recommendation Engine - Comprehensive options analysis and contract selection
 * 
 * This engine analyzes options chains to provide intelligent contract recommendations
 * based on confidence levels, expected moves, Fibonacci analysis, and Greeks optimization.
 */
export class OptionsRecommendationEngine extends EventEmitter {
  private readonly DELTA_TARGETS = {
    HIGH_CONFIDENCE: { min: 0.50, max: 0.70 },
    MEDIUM_CONFIDENCE: { min: 0.40, max: 0.60 },
    LOW_CONFIDENCE: { min: 0.30, max: 0.50 }
  };

  private readonly DTE_PREFERENCES = {
    HIGH_CONFIDENCE: { min: 14, max: 45, preferred: 21 },
    MEDIUM_CONFIDENCE: { min: 7, max: 30, preferred: 14 },
    LOW_CONFIDENCE: { min: 1, max: 14, preferred: 7 }
  };

  private readonly LIQUIDITY_THRESHOLDS = {
    MIN_VOLUME: 10,
    MIN_OPEN_INTEREST: 50,
    MAX_SPREAD_PERCENT: 0.15,
    PREFERRED_VOLUME: 100,
    PREFERRED_OPEN_INTEREST: 500
  };

  constructor() {
    super();
  }

  /**
   * Generate comprehensive options recommendations with complete analysis
   * Implements complete options chain analysis and contract selection
   */
  public async generateRecommendations(
    ticker: string,
    confidence: number,
    expectedMove: number,
    fibAnalysis: FibonacciAnalysis
  ): Promise<OptionsRecommendationResult> {
    try {
      // Fetch comprehensive options data
      const optionsChain = await this.getOptionsChain(ticker);
      const currentPrice = optionsChain.underlyingPrice;
      
      // Perform market analysis
      const marketAnalysis = this.analyzeMarketConditions(optionsChain, confidence, expectedMove);
      
      // Generate individual recommendations
      const allRecommendations = await this.generateIndividualRecommendations(
        optionsChain,
        confidence,
        expectedMove,
        fibAnalysis
      );
      
      // Select top 3 recommendations
      const topRecommendations = this.selectTopRecommendations(allRecommendations, 3);
      
      // Perform comprehensive analysis
      const riskRewardAnalysis = this.analyzeRiskReward(allRecommendations);
      const liquidityAnalysis = this.analyzeLiquidity(allRecommendations);
      const confidenceMetrics = this.analyzeConfidence(allRecommendations);
      const tradingImplications = this.generateTradingImplications(
        topRecommendations,
        marketAnalysis,
        confidence
      );

      const result: OptionsRecommendationResult = {
        ticker,
        timestamp: new Date(),
        currentPrice,
        marketAnalysis,
        topRecommendations,
        allRecommendations,
        riskRewardAnalysis,
        liquidityAnalysis,
        confidenceMetrics,
        tradingImplications
      };

      this.emit('recommendations:generated', result);
      return result;

    } catch (error) {
      console.error(`Error generating recommendations for ${ticker}:`, error);
      return this.getDefaultRecommendationResult(ticker);
    }
  }

  /**
   * Generate individual option recommendations based on analysis
   */
  private async generateIndividualRecommendations(
    optionsChain: OptionsChain,
    confidence: number,
    expectedMove: number,
    fibAnalysis: FibonacciAnalysis
  ): Promise<OptionsRecommendation[]> {
    const recommendations: OptionsRecommendation[] = [];
    
    // Determine confidence level and preferences
    const confidenceLevel = this.getConfidenceLevel(confidence);
    const deltaTarget = this.DELTA_TARGETS[confidenceLevel];
    const dtePreference = this.DTE_PREFERENCES[confidenceLevel];
    
    // Filter options by liquidity
    const liquidOptions = this.filterByLiquidity(optionsChain);
    
    // Generate call recommendations
    const callRecommendations = await this.findOptimalCalls(
      liquidOptions.calls,
      deltaTarget,
      dtePreference,
      expectedMove,
      fibAnalysis,
      optionsChain.underlyingPrice
    );
    
    // Generate put recommendations
    const putRecommendations = await this.findOptimalPuts(
      liquidOptions.puts,
      deltaTarget,
      dtePreference,
      expectedMove,
      fibAnalysis,
      optionsChain.underlyingPrice
    );
    
    // Combine all recommendations
    recommendations.push(...callRecommendations, ...putRecommendations);
    
    // Rank by comprehensive scoring
    return this.rankRecommendations(recommendations);
  }

  /**
   * Analyze market conditions for options trading
   */
  private analyzeMarketConditions(
    optionsChain: OptionsChain,
    confidence: number,
    expectedMove: number
  ): MarketAnalysis {
    // Calculate average implied volatility
    const allContracts = [...optionsChain.calls, ...optionsChain.puts];
    const avgIV = allContracts.reduce((sum, contract) => sum + contract.impliedVolatility, 0) / allContracts.length;
    
    // Determine volatility environment
    let volatilityEnvironment: string;
    if (avgIV > 0.4) volatilityEnvironment = 'HIGH_VOLATILITY';
    else if (avgIV > 0.25) volatilityEnvironment = 'ELEVATED_VOLATILITY';
    else if (avgIV > 0.15) volatilityEnvironment = 'NORMAL_VOLATILITY';
    else volatilityEnvironment = 'LOW_VOLATILITY';
    
    // Determine trend based on expected move and confidence
    let trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (expectedMove > 0.02 && confidence > 0.6) trendDirection = 'BULLISH';
    else if (expectedMove < -0.02 && confidence > 0.6) trendDirection = 'BEARISH';
    else trendDirection = 'NEUTRAL';
    
    const trendStrength = Math.min(1, Math.abs(expectedMove) * 10 * confidence);
    
    // Analyze time decay environment
    const avgDTE = allContracts.reduce((sum, contract) => sum + contract.daysToExpiration, 0) / allContracts.length;
    let timeDecayEnvironment: string;
    if (avgDTE < 7) timeDecayEnvironment = 'HIGH_THETA_DECAY';
    else if (avgDTE < 21) timeDecayEnvironment = 'MODERATE_THETA_DECAY';
    else timeDecayEnvironment = 'LOW_THETA_DECAY';
    
    // Analyze liquidity conditions
    const avgVolume = allContracts.reduce((sum, contract) => sum + contract.volume, 0) / allContracts.length;
    let liquidityConditions: string;
    if (avgVolume > 200) liquidityConditions = 'EXCELLENT_LIQUIDITY';
    else if (avgVolume > 100) liquidityConditions = 'GOOD_LIQUIDITY';
    else if (avgVolume > 50) liquidityConditions = 'MODERATE_LIQUIDITY';
    else liquidityConditions = 'POOR_LIQUIDITY';
    
    // Analyze options flow
    const callVolume = optionsChain.calls.reduce((sum, call) => sum + call.volume, 0);
    const putVolume = optionsChain.puts.reduce((sum, put) => sum + put.volume, 0);
    const callPutRatio = callVolume / (putVolume || 1);
    
    let optionsFlow: string;
    if (callPutRatio > 1.5) optionsFlow = 'BULLISH_FLOW';
    else if (callPutRatio < 0.67) optionsFlow = 'BEARISH_FLOW';
    else optionsFlow = 'NEUTRAL_FLOW';
    
    return {
      volatilityEnvironment,
      trendDirection,
      trendStrength,
      expectedMove,
      timeDecayEnvironment,
      liquidityConditions,
      optionsFlow
    };
  }

  /**
   * Select top recommendations based on comprehensive scoring
   */
  private selectTopRecommendations(
    recommendations: OptionsRecommendation[],
    count: number
  ): OptionsRecommendation[] {
    // Sort by comprehensive score and return top N
    const scored = recommendations.map(rec => ({
      recommendation: rec,
      score: this.calculateComprehensiveScore(rec)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, count).map(item => item.recommendation);
  }

  /**
   * Calculate comprehensive score for recommendation ranking
   */
  private calculateComprehensiveScore(recommendation: OptionsRecommendation): number {
    const riskRewardScore = Math.min(5, recommendation.riskReward.riskRewardRatio) / 5; // Normalize to 0-1
    const probabilityScore = recommendation.riskReward.profitProbability;
    const liquidityScore = recommendation.liquidity.liquidityScore;
    const confidenceScore = recommendation.confidence;
    const fibAlignmentScore = recommendation.fibonacciAlignment.alignmentScore;
    
    // Weighted comprehensive score
    return (
      riskRewardScore * 0.25 +
      probabilityScore * 0.25 +
      liquidityScore * 0.20 +
      confidenceScore * 0.20 +
      fibAlignmentScore * 0.10
    );
  }
  }

  /**
   * Enhanced optimal strike selection with Delta targeting (0.30-0.70 range) based on confidence
   * Implements sophisticated strike selection algorithms with multiple optimization criteria
   */
  public selectOptimalStrike(
    contracts: OptionContract[],
    targetDelta: { min: number; max: number },
    expectedMove: number,
    confidence: number,
    underlyingPrice: number,
    fibAnalysis?: FibonacciAnalysis
  ): OptionContract | null {
    // Enhanced delta targeting based on confidence
    const enhancedDeltaTarget = this.calculateEnhancedDeltaTarget(targetDelta, confidence, expectedMove);
    
    // Filter contracts within enhanced delta range
    const validContracts = contracts.filter(contract => 
      Math.abs(contract.greeks.delta) >= enhancedDeltaTarget.min && 
      Math.abs(contract.greeks.delta) <= enhancedDeltaTarget.max
    );
    
    if (validContracts.length === 0) {
      return null;
    }
    
    // Apply advanced strike selection algorithms
    const scoredContracts = validContracts.map(contract => ({
      contract,
      score: this.calculateAdvancedStrikeScore(
        contract, 
        expectedMove, 
        confidence, 
        underlyingPrice, 
        fibAnalysis
      )
    }));
    
    // Sort by comprehensive score and return best
    scoredContracts.sort((a, b) => b.score - a.score);
    return scoredContracts[0].contract;
  }

  /**
   * Advanced strike selection with multiple optimization criteria
   */
  public selectOptimalStrikeAdvanced(
    contracts: OptionContract[],
    selectionCriteria: StrikeSelectionCriteria
  ): StrikeSelectionResult {
    const {
      confidence,
      expectedMove,
      underlyingPrice,
      fibAnalysis,
      timeframe,
      riskTolerance,
      liquidityPreference
    } = selectionCriteria;
    
    // Calculate dynamic delta targets based on multiple factors
    const deltaTargets = this.calculateDynamicDeltaTargets(confidence, expectedMove, timeframe);
    
    // Filter and score contracts
    const candidates = this.filterStrikeCandidates(contracts, deltaTargets, liquidityPreference);
    const scoredStrikes = this.scoreStrikeCandidates(
      candidates,
      selectionCriteria
    );
    
    // Select optimal strikes for different strategies
    const optimalStrikes = this.selectMultipleOptimalStrikes(scoredStrikes, 3);
    
    // Generate strike analysis
    const strikeAnalysis = this.generateStrikeAnalysis(optimalStrikes, selectionCriteria);
    
    return {
      primaryStrike: optimalStrikes[0]?.contract || null,
      alternativeStrikes: optimalStrikes.slice(1).map(s => s.contract),
      strikeAnalysis,
      selectionReasoning: this.generateStrikeSelectionReasoning(optimalStrikes, selectionCriteria)
    };
  }

  /**
   * Enhanced optimal expiration selection with 7-45 DTE preference and 21 DTE bias
   * Implements sophisticated expiration selection with time decay optimization
   */
  public selectOptimalExpiration(
    expirations: Date[],
    confidence: number,
    expectedMove: number,
    timeframe: string,
    volatilityEnvironment?: string
  ): Date {
    const enhancedDtePreference = this.calculateEnhancedDtePreference(
      confidence, 
      expectedMove, 
      timeframe, 
      volatilityEnvironment
    );
    
    const now = new Date();
    const validExpirations = expirations.filter(exp => {
      const dte = this.calculateDTE(exp);
      return dte >= enhancedDtePreference.min && dte <= enhancedDtePreference.max;
    });
    
    if (validExpirations.length === 0) {
      return expirations[0]; // Fallback to first available
    }
    
    // Score expirations based on multiple factors
    const scoredExpirations = validExpirations.map(exp => ({
      expiration: exp,
      dte: this.calculateDTE(exp),
      score: this.calculateExpirationScore(exp, enhancedDtePreference, confidence, expectedMove)
    }));
    
    // Sort by score and return best
    scoredExpirations.sort((a, b) => b.score - a.score);
    return scoredExpirations[0].expiration;
  }

  /**
   * Advanced expiration selection with comprehensive analysis
   */
  public selectOptimalExpirationAdvanced(
    expirations: Date[],
    selectionCriteria: ExpirationSelectionCriteria
  ): ExpirationSelectionResult {
    const {
      confidence,
      expectedMove,
      timeframe,
      volatilityEnvironment,
      thetaPreference,
      eventRisk
    } = selectionCriteria;
    
    // Calculate dynamic DTE preferences
    const dtePreferences = this.calculateDynamicDtePreferences(selectionCriteria);
    
    // Filter and analyze expirations
    const candidates = this.filterExpirationCandidates(expirations, dtePreferences);
    const analyzedExpirations = this.analyzeExpirationCandidates(candidates, selectionCriteria);
    
    // Select optimal expirations for different strategies
    const optimalExpirations = this.selectMultipleOptimalExpirations(analyzedExpirations, 3);
    
    // Generate expiration analysis
    const expirationAnalysis = this.generateExpirationAnalysis(optimalExpirations, selectionCriteria);
    
    return {
      primaryExpiration: optimalExpirations[0]?.expiration || expirations[0],
      alternativeExpirations: optimalExpirations.slice(1).map(e => e.expiration),
      expirationAnalysis,
      selectionReasoning: this.generateExpirationSelectionReasoning(optimalExpirations, selectionCriteria)
    };
  }

  /**
   * Integrated expected move and time decay optimization
   * Optimizes strike and expiration selection based on expected move and time decay considerations
   */
  public optimizeStrikeAndExpiration(
    contracts: OptionContract[],
    optimizationCriteria: OptimizationCriteria
  ): OptimizationResult {
    const {
      expectedMove,
      confidence,
      timeframe,
      underlyingPrice,
      volatilityEnvironment,
      fibAnalysis
    } = optimizationCriteria;
    
    // Group contracts by expiration
    const contractsByExpiration = this.groupByExpiration(contracts);
    
    // Analyze each expiration for optimal strike/expiration combinations
    const combinations: StrikeExpirationCombination[] = [];
    
    for (const [expirationKey, expirationContracts] of contractsByExpiration) {
      const expiration = new Date(expirationKey);
      const dte = this.calculateDTE(expiration);
      
      // Skip if outside reasonable DTE range
      if (dte < 1 || dte > 90) continue;
      
      // Calculate time decay optimization for this expiration
      const timeDecayOptimization = this.calculateTimeDecayOptimization(dte, expectedMove, confidence);
      
      // Find optimal strikes for this expiration
      const optimalStrikes = this.findOptimalStrikesForExpiration(
        expirationContracts,
        expectedMove,
        confidence,
        underlyingPrice,
        timeDecayOptimization
      );
      
      // Create combinations
      optimalStrikes.forEach(strike => {
        combinations.push({
          contract: strike.contract,
          expiration,
          dte,
          optimizationScore: this.calculateCombinationScore(
            strike.contract,
            dte,
            expectedMove,
            confidence,
            timeDecayOptimization
          ),
          timeDecayOptimization,
          expectedMoveAlignment: this.calculateExpectedMoveAlignment(
            strike.contract,
            expectedMove,
            underlyingPrice
          )
        });
      });
    }
    
    // Sort combinations by optimization score
    combinations.sort((a, b) => b.optimizationScore - a.optimizationScore);
    
    // Generate optimization analysis
    const optimizationAnalysis = this.generateOptimizationAnalysis(combinations, optimizationCriteria);
    
    return {
      optimalCombination: combinations[0] || null,
      alternativeCombinations: combinations.slice(1, 4),
      optimizationAnalysis,
      recommendations: this.generateOptimizationRecommendations(combinations, optimizationCriteria)
    };
  }

  /**
   * Enhanced risk/reward calculation with comprehensive Greeks impact analysis
   * Implements sophisticated Greeks-aware risk/reward assessment
   */
  public calculateRiskReward(
    contract: OptionContract, 
    expectedMove: number,
    underlyingPrice?: number,
    volatilityChange?: number,
    timeHorizon?: number
  ): EnhancedRiskReward {
    const currentPrice = contract.midPrice;
    const strike = contract.strike;
    const isCall = contract.type === 'CALL';
    const dte = contract.daysToExpiration;
    const basePrice = underlyingPrice || strike; // Fallback if not provided
    
    // Calculate maximum risk (premium paid)
    const maxRisk = currentPrice;
    
    // Calculate breakeven
    const breakeven = isCall ? strike + currentPrice : strike - currentPrice;
    
    // Calculate potential reward scenarios
    const rewardScenarios = this.calculateRewardScenarios(
      contract, 
      expectedMove, 
      basePrice, 
      volatilityChange, 
      timeHorizon
    );
    
    // Calculate Greeks impact on P&L
    const greeksImpact = this.calculateGreeksImpact(
      contract, 
      expectedMove, 
      basePrice, 
      volatilityChange, 
      timeHorizon
    );
    
    // Calculate probability-weighted metrics
    const profitProbability = this.calculateAdvancedProfitProbability(
      basePrice, 
      strike, 
      expectedMove, 
      contract.impliedVolatility, 
      dte, 
      isCall
    );
    
    // Calculate risk-adjusted metrics
    const riskAdjustedMetrics = this.calculateRiskAdjustedMetrics(
      rewardScenarios, 
      greeksImpact, 
      profitProbability
    );
    
    // Generate comprehensive scenario analysis
    const scenarioAnalysis = this.generateScenarioAnalysis(contract, expectedMove, basePrice);
    
    return {
      maxRisk,
      maxReward: rewardScenarios.bestCase,
      expectedReward: rewardScenarios.expectedCase,
      worstCase: rewardScenarios.worstCase,
      breakeven,
      profitProbability,
      riskRewardRatio: maxRisk > 0 ? rewardScenarios.expectedCase / maxRisk : 0,
      probabilityAdjustedReturn: rewardScenarios.expectedCase * profitProbability,
      timeDecayImpact: greeksImpact.thetaImpact,
      volatilityImpact: greeksImpact.vegaImpact,
      greeksImpact,
      riskAdjustedMetrics,
      scenarioAnalysis
    };
  }

  /**
   * Calculate reward scenarios based on expected moves and Greeks
   */
  private calculateRewardScenarios(
    contract: OptionContract,
    expectedMove: number,
    basePrice: number,
    volatilityChange?: number,
    timeHorizon?: number
  ): { bestCase: number; expectedCase: number; worstCase: number } {
    const isCall = contract.type === 'CALL';
    const strike = contract.strike;
    const premium = contract.midPrice;
    
    // Calculate price targets
    const expectedPrice = basePrice * (1 + expectedMove);
    const bestCasePrice = basePrice * (1 + expectedMove * 2); // 2x expected move
    const worstCasePrice = basePrice * (1 + expectedMove * -0.5); // Adverse move
    
    // Calculate intrinsic values at expiration
    const expectedIntrinsic = isCall ? 
      Math.max(0, expectedPrice - strike) : 
      Math.max(0, strike - expectedPrice);
    
    const bestCaseIntrinsic = isCall ? 
      Math.max(0, bestCasePrice - strike) : 
      Math.max(0, strike - bestCasePrice);
    
    const worstCaseIntrinsic = isCall ? 
      Math.max(0, worstCasePrice - strike) : 
      Math.max(0, strike - worstCasePrice);
    
    // Calculate P&L (intrinsic value - premium paid)
    return {
      expectedCase: expectedIntrinsic - premium,
      bestCase: bestCaseIntrinsic - premium,
      worstCase: worstCaseIntrinsic - premium
    };
  }

  /**
   * Calculate Greeks impact on position P&L
   */
  private calculateGreeksImpact(
    contract: OptionContract,
    expectedMove: number,
    basePrice: number,
    volatilityChange?: number,
    timeHorizon?: number
  ): GreeksImpactAnalysis {
    const priceChange = basePrice * expectedMove;
    const volChange = volatilityChange || 0;
    const timeDecay = timeHorizon || 1;
    
    return this.analyzeGreeksImpact(contract, priceChange, volChange, timeDecay);
  }

  /**
   * Calculate advanced profit probability using Black-Scholes and Greeks
   */
  private calculateAdvancedProfitProbability(
    underlyingPrice: number,
    strike: number,
    expectedMove: number,
    impliedVol: number,
    dte: number,
    isCall: boolean
  ): number {
    // Use normal distribution to estimate probability
    const timeToExpiry = dte / 365;
    const volatility = impliedVol;
    
    // Calculate required move for profitability
    const requiredMove = isCall ? 
      (strike - underlyingPrice) / underlyingPrice : 
      (underlyingPrice - strike) / underlyingPrice;
    
    // Standard deviation of price movement
    const stdDev = volatility * Math.sqrt(timeToExpiry);
    
    // Z-score for required move
    const zScore = requiredMove / stdDev;
    
    // Probability using normal distribution (simplified)
    const probability = isCall ? 
      1 - this.normalCDF(zScore) : 
      this.normalCDF(-zScore);
    
    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Normal cumulative distribution function (simplified approximation)
   */
  private normalCDF(x: number): number {
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  /**
   * Error function approximation
   */
  private erf(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Calculate risk-adjusted metrics
   */
  private calculateRiskAdjustedMetrics(
    rewardScenarios: { bestCase: number; expectedCase: number; worstCase: number },
    greeksImpact: GreeksImpactAnalysis,
    profitProbability: number
  ): RiskAdjustedMetrics {
    // Calculate returns array for metrics
    const returns = [rewardScenarios.worstCase, rewardScenarios.expectedCase, rewardScenarios.bestCase];
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    
    // Calculate standard deviation
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Sharpe ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02;
    const sharpeRatio = stdDev > 0 ? (avgReturn - riskFreeRate) / stdDev : 0;
    
    // Sortino ratio (downside deviation)
    const downsideReturns = returns.filter(ret => ret < avgReturn);
    const downsideVariance = downsideReturns.length > 0 ? 
      downsideReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / downsideReturns.length : 0;
    const downsideStdDev = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideStdDev > 0 ? (avgReturn - riskFreeRate) / downsideStdDev : 0;
    
    // Maximum drawdown
    const maxDrawdown = Math.abs(rewardScenarios.worstCase);
    
    // Calmar ratio
    const calmarRatio = maxDrawdown > 0 ? avgReturn / maxDrawdown : 0;
    
    // Value at Risk (95% confidence)
    const valueAtRisk = rewardScenarios.worstCase * 0.95;
    
    // Expected Shortfall (Conditional VaR)
    const expectedShortfall = rewardScenarios.worstCase * 1.1; // Simplified
    
    return {
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown,
      valueAtRisk,
      expectedShortfall
    };
  }

  /**
   * Generate comprehensive scenario analysis
   */
  private generateScenarioAnalysis(
    contract: OptionContract,
    expectedMove: number,
    basePrice: number
  ): ScenarioAnalysis {
    const greeks = contract.greeks;
    
    // Define scenarios
    const scenarios = {
      bullish: { priceChange: basePrice * 0.05, volChange: 0.02, probability: 0.3 },
      bearish: { priceChange: basePrice * -0.05, volChange: 0.02, probability: 0.3 },
      neutral: { priceChange: 0, volChange: 0, probability: 0.2 },
      volatilityExpansion: { priceChange: basePrice * expectedMove, volChange: 0.05, probability: 0.1 },
      volatilityContraction: { priceChange: basePrice * expectedMove, volChange: -0.03, probability: 0.1 }
    };
    
    // Calculate scenario results
    const calculateScenarioResult = (scenario: any): ScenarioResult => {
      const deltaContrib = greeks.delta * scenario.priceChange;
      const gammaContrib = 0.5 * greeks.gamma * Math.pow(scenario.priceChange, 2);
      const thetaContrib = greeks.theta * 1; // 1 day time decay
      const vegaContrib = greeks.vega * scenario.volChange;
      
      const expectedPnL = deltaContrib + gammaContrib + thetaContrib + vegaContrib;
      
      return {
        priceChange: scenario.priceChange,
        expectedPnL,
        probability: scenario.probability,
        greeksContribution: {
          delta: deltaContrib,
          gamma: gammaContrib,
          theta: thetaContrib,
          vega: vegaContrib
        }
      };
    };
    
    return {
      bullishScenario: calculateScenarioResult(scenarios.bullish),
      bearishScenario: calculateScenarioResult(scenarios.bearish),
      neutralScenario: calculateScenarioResult(scenarios.neutral),
      volatilityExpansion: calculateScenarioResult(scenarios.volatilityExpansion),
      volatilityContraction: calculateScenarioResult(scenarios.volatilityContraction),
      timeDecayScenario: {
        priceChange: 0,
        expectedPnL: greeks.theta * 7, // 1 week time decay
        probability: 1.0,
        greeksContribution: {
          delta: 0,
          gamma: 0,
          theta: greeks.theta * 7,
          vega: 0
        }
      }
    };
  }

  /**
   * Comprehensive Greeks impact analysis on position P&L
   * Implements sophisticated Greeks-aware risk assessment with comprehensive impact analysis
   */
  public analyzeGreeksImpact(
    contract: OptionContract,
    priceChange: number,
    volatilityChange: number = 0,
    timeDecay: number = 1
  ): GreeksImpactAnalysis {
    const greeks = contract.greeks;
    
    // Delta impact (first-order price sensitivity)
    const deltaImpact = greeks.delta * priceChange;
    
    // Gamma impact (second-order price sensitivity)
    const gammaImpact = 0.5 * greeks.gamma * Math.pow(priceChange, 2);
    
    // Theta impact (time decay)
    const thetaImpact = greeks.theta * timeDecay;
    
    // Vega impact (volatility sensitivity)
    const vegaImpact = greeks.vega * volatilityChange;
    
    // Rho impact (interest rate sensitivity)
    const rhoImpact = greeks.rho * 0.01; // Assume 1% rate change
    
    // Total Greeks impact
    const totalImpact = deltaImpact + gammaImpact + thetaImpact + vegaImpact + rhoImpact;
    
    // Calculate Greeks efficiency (how well Greeks work together)
    const greeksEfficiency = this.calculateGreeksEfficiency(greeks, priceChange, volatilityChange);
    
    // Risk decomposition
    const riskDecomposition: RiskDecomposition = {
      priceRisk: Math.abs(deltaImpact + gammaImpact),
      timeRisk: Math.abs(thetaImpact),
      volatilityRisk: Math.abs(vegaImpact),
      interestRateRisk: Math.abs(rhoImpact),
      totalRisk: Math.abs(totalImpact)
    };
    
    // Determine dominant Greek
    const greekImpacts = {
      DELTA: Math.abs(deltaImpact),
      GAMMA: Math.abs(gammaImpact),
      THETA: Math.abs(thetaImpact),
      VEGA: Math.abs(vegaImpact),
      RHO: Math.abs(rhoImpact)
    };
    
    const dominantGreek = Object.entries(greekImpacts).reduce((a, b) => 
      greekImpacts[a[0] as keyof typeof greekImpacts] > greekImpacts[b[0] as keyof typeof greekImpacts] ? a : b
    )[0] as 'DELTA' | 'GAMMA' | 'THETA' | 'VEGA' | 'RHO';
    
    // Hedging requirements analysis
    const hedgingRequirements = this.analyzeHedgingRequirements(greeks, contract);
    
    return {
      deltaImpact,
      gammaImpact,
      thetaImpact,
      vegaImpact,
      rhoImpact,
      totalImpact,
      greeksEfficiency,
      riskDecomposition,
      dominantGreek,
      hedgingRequirements
    };
  }

  /**
   * Calculate Greeks efficiency - how well Greeks work together
   */
  private calculateGreeksEfficiency(
    greeks: OptionsGreeks,
    priceChange: number,
    volatilityChange: number
  ): number {
    // Efficiency based on Greeks alignment and magnitude
    const deltaEfficiency = Math.abs(greeks.delta) > 0.3 ? 1 : Math.abs(greeks.delta) / 0.3;
    const gammaEfficiency = greeks.gamma > 0.01 ? 1 : greeks.gamma / 0.01;
    const thetaEfficiency = Math.abs(greeks.theta) < 0.05 ? 1 : 0.05 / Math.abs(greeks.theta);
    const vegaEfficiency = greeks.vega > 0.1 ? 1 : greeks.vega / 0.1;
    
    // Weighted efficiency score
    return (deltaEfficiency * 0.4 + gammaEfficiency * 0.2 + thetaEfficiency * 0.2 + vegaEfficiency * 0.2);
  }

  /**
   * Analyze hedging requirements for the position
   */
  private analyzeHedgingRequirements(greeks: OptionsGreeks, contract: OptionContract): HedgingRequirements {
    const deltaHedgeRequired = Math.abs(greeks.delta) > 0.5;
    const gammaHedgeRequired = greeks.gamma > 0.02;
    const vegaHedgeRequired = greeks.vega > 0.2;
    
    // Estimate hedging cost (simplified)
    let hedgingCost = 0;
    if (deltaHedgeRequired) hedgingCost += contract.midPrice * 0.01; // 1% of position value
    if (gammaHedgeRequired) hedgingCost += contract.midPrice * 0.005; // 0.5% additional
    if (vegaHedgeRequired) hedgingCost += contract.midPrice * 0.005; // 0.5% additional
    
    // Determine hedging complexity
    const hedgeCount = [deltaHedgeRequired, gammaHedgeRequired, vegaHedgeRequired].filter(Boolean).length;
    let hedgingComplexity: 'LOW' | 'MODERATE' | 'HIGH';
    if (hedgeCount === 0) hedgingComplexity = 'LOW';
    else if (hedgeCount <= 2) hedgingComplexity = 'MODERATE';
    else hedgingComplexity = 'HIGH';
    
    // Recommended hedges
    const recommendedHedges: string[] = [];
    if (deltaHedgeRequired) recommendedHedges.push('Delta hedge with underlying');
    if (gammaHedgeRequired) recommendedHedges.push('Gamma hedge with options');
    if (vegaHedgeRequired) recommendedHedges.push('Vega hedge with different expiration');
    
    return {
      deltaHedgeRequired,
      gammaHedgeRequired,
      vegaHedgeRequired,
      hedgingCost,
      hedgingComplexity,
      recommendedHedges
    };
  }
    
    // Theta impact (time decay)
    const thetaImpact = greeks.theta * timeDecay;
    
    // Vega impact (volatility sensitivity)
    const vegaImpact = greeks.vega * volatilityChange;
    
    // Rho impact (interest rate sensitivity) - typically minimal
    const rhoImpact = greeks.rho * 0.01; // Assume 1% rate change
    
    // Total Greeks impact
    const totalImpact = deltaImpact + gammaImpact + thetaImpact + vegaImpact + rhoImpact;
    
    // Calculate Greeks efficiency (how well Greeks work together)
    const greeksEfficiency = this.calculateGreeksEfficiency(greeks, priceChange, volatilityChange);
    
    // Risk decomposition
    const riskDecomposition = this.calculateRiskDecomposition(greeks, contract.daysToExpiration);
    
    return {
      deltaImpact,
      gammaImpact,
      thetaImpact,
      vegaImpact,
      rhoImpact,
      totalImpact,
      greeksEfficiency,
      riskDecomposition,
      dominantGreek: this.identifyDominantGreek(greeks, priceChange, volatilityChange),
      hedgingRequirements: this.calculateHedgingRequirements(greeks, contract.midPrice)
    };
  }

  /**
   * Comprehensive liquidity assessment with bid/ask spread, volume, and open interest evaluation
   * Implements advanced liquidity scoring with market microstructure analysis
   */
  public assessLiquidity(
    contract: OptionContract,
    marketConditions?: MarketConditions,
    positionSize?: number
  ): ComprehensiveLiquidityAssessment {
    const bidAskSpread = contract.ask - contract.bid;
    const spreadPercentage = bidAskSpread / contract.midPrice;
    const midPrice = contract.midPrice;
    
    // Core liquidity metrics
    const coreMetrics = this.calculateCoreLiquidityMetrics(contract);
    
    // Market microstructure analysis
    const microstructureAnalysis = this.analyzeMicrostructure(contract, marketConditions);
    
    // Execution cost analysis
    const executionCosts = this.calculateExecutionCosts(contract, positionSize);
    
    // Liquidity risk assessment
    const liquidityRisk = this.assessLiquidityRisk(contract, marketConditions);
    
    // Market impact estimation
    const marketImpact = this.estimateMarketImpact(contract, positionSize);
    
    // Timing analysis
    const timingAnalysis = this.analyzeExecutionTiming(contract);
    
    // Overall liquidity score with advanced weighting
    const overallScore = this.calculateAdvancedLiquidityScore(
      coreMetrics,
      microstructureAnalysis,
      executionCosts,
      liquidityRisk
    );
    
    // Liquidity rating and recommendations
    const liquidityRating = this.determineLiquidityRating(overallScore);
    const recommendations = this.generateLiquidityRecommendations(
      coreMetrics,
      executionCosts,
      liquidityRisk
    );
    
    return {
      // Core metrics
      bidAskSpread,
      spreadPercentage,
      volume: contract.volume,
      openInterest: contract.openInterest,
      
      // Advanced metrics
      coreMetrics,
      microstructureAnalysis,
      executionCosts,
      liquidityRisk,
      marketImpact,
      timingAnalysis,
      
      // Overall assessment
      overallScore,
      liquidityRating,
      recommendations,
      
      // Legacy compatibility
      liquidityScore: overallScore,
      averageDailyVolume: coreMetrics.averageDailyVolume,
      volumeRatio: coreMetrics.volumeRatio
    };
  }

  /**
   * Calculate core liquidity metrics with advanced scoring
   */
  private calculateCoreLiquidityMetrics(contract: OptionContract): CoreLiquidityMetrics {
    const volume = contract.volume;
    const openInterest = contract.openInterest;
    const bidAskSpread = contract.ask - contract.bid;
    const spreadPercentage = bidAskSpread / contract.midPrice;
    
    // Volume scoring (0-1 scale)
    const volumeScore = Math.min(1, volume / 500); // 500+ volume = perfect score
    
    // Open interest scoring (0-1 scale)
    const openInterestScore = Math.min(1, openInterest / 1000); // 1000+ OI = perfect score
    
    // Spread scoring (0-1 scale, lower spread = higher score)
    const spreadScore = Math.max(0, 1 - (spreadPercentage / 0.1)); // 10% spread = 0 score
    
    // Estimate average daily volume (simplified)
    const averageDailyVolume = volume * 1.2; // Assume current is 80% of average
    const volumeRatio = volume / averageDailyVolume;
    
    // Calculate percentile ranks (simplified)
    const openInterestRank = Math.min(100, (openInterest / 10) * 100); // Simplified ranking
    const spreadRank = Math.max(0, 100 - (spreadPercentage * 1000)); // Lower spread = higher rank
    
    return {
      volumeScore,
      openInterestScore,
      spreadScore,
      averageDailyVolume,
      volumeRatio,
      openInterestRank,
      spreadRank
    };
  }

  /**
   * Analyze market microstructure for liquidity assessment
   */
  private analyzeMicrostructure(
    contract: OptionContract,
    marketConditions?: MarketConditions
  ): MicrostructureAnalysis {
    const bidAskSpread = contract.ask - contract.bid;
    const midPrice = contract.midPrice;
    
    // Bid-ask spread stability (simplified estimation)
    const spreadStability = Math.max(0, 1 - (bidAskSpread / midPrice) / 0.05); // 5% spread = 0 stability
    
    // Order book depth estimation (based on volume and OI)
    const orderBookDepth = Math.sqrt(contract.volume * contract.openInterest) / 100;
    
    // Price impact model
    const priceImpactModel: PriceImpactModel = {
      linearImpact: bidAskSpread / midPrice * 0.5, // Linear component
      nonlinearImpact: Math.pow(bidAskSpread / midPrice, 2) * 0.3, // Non-linear component
      temporaryImpact: bidAskSpread * 0.7, // Temporary impact
      permanentImpact: bidAskSpread * 0.3 // Permanent impact
    };
    
    // Liquidity provision estimation
    const liquidityProvision = Math.min(1, contract.openInterest / 1000);
    
    // Market maker presence (based on tight spreads and high volume)
    const marketMakerPresence = Math.min(1, 
      (contract.volume / 100) * (1 - bidAskSpread / midPrice)
    );
    
    // Retail flow estimation (inverse of market maker presence)
    const retailFlow = 1 - marketMakerPresence;
    
    return {
      bidAskSpreadStability: spreadStability,
      orderBookDepth,
      priceImpactModel,
      liquidityProvision,
      marketMakerPresence,
      retailFlow
    };
  }

  /**
   * Calculate comprehensive execution costs
   */
  private calculateExecutionCosts(
    contract: OptionContract,
    positionSize?: number
  ): ExecutionCosts {
    const bidAskSpread = contract.ask - contract.bid;
    const midPrice = contract.midPrice;
    const size = positionSize || 1;
    
    // Bid-ask cost (half spread for market orders)
    const bidAskCost = (bidAskSpread / 2) * size;
    
    // Market impact cost (based on size and liquidity)
    const liquidityFactor = Math.max(1, size / contract.volume);
    const marketImpactCost = bidAskSpread * liquidityFactor * 0.3 * size;
    
    // Timing cost (opportunity cost of waiting)
    const timingCost = midPrice * 0.001 * size; // 0.1% of position value
    
    // Opportunity cost (cost of delayed execution)
    const opportunityCost = midPrice * 0.002 * size; // 0.2% of position value
    
    // Total execution cost
    const totalExecutionCost = bidAskCost + marketImpactCost + timingCost + opportunityCost;
    
    // As percentage of position value
    const executionCostPercentage = totalExecutionCost / (midPrice * size);
    
    return {
      bidAskCost,
      marketImpactCost,
      timingCost,
      opportunityCost,
      totalExecutionCost,
      executionCostPercentage
    };
  }

  /**
   * Assess comprehensive liquidity risk
   */
  private assessLiquidityRisk(
    contract: OptionContract,
    marketConditions?: MarketConditions
  ): LiquidityRisk {
    const bidAskSpread = contract.ask - contract.bid;
    const spreadPercentage = bidAskSpread / contract.midPrice;
    
    // Execution risk (risk of poor fill)
    const executionRisk = Math.min(1, spreadPercentage / 0.05); // 5% spread = max risk
    
    // Liquidity dry-up risk (risk of liquidity disappearing)
    const volumeRisk = Math.max(0, 1 - contract.volume / 50); // <50 volume = high risk
    const oiRisk = Math.max(0, 1 - contract.openInterest / 100); // <100 OI = high risk
    const liquidityDryUpRisk = (volumeRisk + oiRisk) / 2;
    
    // Wide spreads risk (risk of spread widening)
    const currentSpreadRisk = Math.min(1, spreadPercentage / 0.03); // 3% spread = high risk
    const wideSpreadsRisk = currentSpreadRisk;
    
    // Market stress risk (risk during volatile periods)
    const stressMultiplier = marketConditions?.marketStress || 0.2;
    const marketStressRisk = Math.min(1, stressMultiplier * 2);
    
    // Overall liquidity risk (weighted average)
    const overallLiquidityRisk = (
      executionRisk * 0.3 +
      liquidityDryUpRisk * 0.3 +
      wideSpreadsRisk * 0.2 +
      marketStressRisk * 0.2
    );
    
    return {
      executionRisk,
      liquidityDryUpRisk,
      wideSpreadsRisk,
      marketStressRisk,
      overallLiquidityRisk
    };
  }

  /**
   * Estimate market impact of trade execution
   */
  private estimateMarketImpact(
    contract: OptionContract,
    positionSize?: number
  ): MarketImpact {
    const size = positionSize || 1;
    const bidAskSpread = contract.ask - contract.bid;
    const volume = contract.volume;
    
    // Immediate impact (function of size vs daily volume)
    const volumeRatio = size / Math.max(1, volume);
    const immediateImpact = bidAskSpread * Math.sqrt(volumeRatio);
    
    // Delayed impact (additional impact over time)
    const delayedImpact = immediateImpact * 0.3;
    
    // Recovery time (time for price to recover)
    const recoveryTime = Math.min(60, volumeRatio * 30); // Max 60 minutes
    
    // Impact asymmetry (difference between buy/sell impact)
    const impactAsymmetry = immediateImpact * 0.1; // 10% asymmetry
    
    return {
      immediateImpact,
      delayedImpact,
      recoveryTime,
      impactAsymmetry
    };
  }

  /**
   * Analyze optimal execution timing
   */
  private analyzeExecutionTiming(contract: OptionContract): TimingAnalysis {
    const volume = contract.volume;
    const bidAskSpread = contract.ask - contract.bid;
    
    // Determine optimal execution time (simplified)
    let optimalExecutionTime: string;
    if (volume > 200) optimalExecutionTime = 'IMMEDIATE';
    else if (volume > 100) optimalExecutionTime = 'WITHIN_HOUR';
    else optimalExecutionTime = 'PATIENT_EXECUTION';
    
    // Execution urgency
    let executionUrgency: 'LOW' | 'MODERATE' | 'HIGH';
    if (bidAskSpread / contract.midPrice > 0.05) executionUrgency = 'HIGH';
    else if (volume < 50) executionUrgency = 'HIGH';
    else if (volume < 100) executionUrgency = 'MODERATE';
    else executionUrgency = 'LOW';
    
    // Timing risk
    const timingRisk = Math.min(1, (bidAskSpread / contract.midPrice) / 0.03);
    
    // Market hours preference
    const marketHours = true; // Always prefer market hours for options
    
    // Simplified hourly volume profile (higher volume during market hours)
    const volumeProfile = Array(24).fill(0).map((_, hour) => {
      if (hour >= 9 && hour <= 16) return 1.0; // Market hours
      else if (hour >= 8 && hour <= 17) return 0.3; // Extended hours
      else return 0.1; // After hours
    });
    
    return {
      optimalExecutionTime,
      executionUrgency,
      timingRisk,
      marketHours,
      volumeProfile
    };
  }

  /**
   * Calculate advanced liquidity score with comprehensive weighting
   */
  private calculateAdvancedLiquidityScore(
    coreMetrics: CoreLiquidityMetrics,
    microstructure: MicrostructureAnalysis,
    executionCosts: ExecutionCosts,
    liquidityRisk: LiquidityRisk
  ): number {
    // Core metrics score (40% weight)
    const coreScore = (
      coreMetrics.volumeScore * 0.4 +
      coreMetrics.openInterestScore * 0.4 +
      coreMetrics.spreadScore * 0.2
    );
    
    // Microstructure score (25% weight)
    const microScore = (
      microstructure.bidAskSpreadStability * 0.3 +
      Math.min(1, microstructure.orderBookDepth / 10) * 0.3 +
      microstructure.marketMakerPresence * 0.4
    );
    
    // Execution cost score (20% weight) - lower cost = higher score
    const costScore = Math.max(0, 1 - executionCosts.executionCostPercentage / 0.05);
    
    // Risk score (15% weight) - lower risk = higher score
    const riskScore = 1 - liquidityRisk.overallLiquidityRisk;
    
    // Weighted final score
    return (
      coreScore * 0.40 +
      microScore * 0.25 +
      costScore * 0.20 +
      riskScore * 0.15
    );
  }

  /**
   * Determine liquidity rating based on overall score
   */
  private determineLiquidityRating(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR' {
    if (score >= 0.8) return 'EXCELLENT';
    else if (score >= 0.6) return 'GOOD';
    else if (score >= 0.4) return 'FAIR';
    else if (score >= 0.2) return 'POOR';
    else return 'VERY_POOR';
  }

  /**
   * Generate liquidity-specific recommendations
   */
  private generateLiquidityRecommendations(
    coreMetrics: CoreLiquidityMetrics,
    executionCosts: ExecutionCosts,
    liquidityRisk: LiquidityRisk
  ): LiquidityRecommendation[] {
    const recommendations: LiquidityRecommendation[] = [];
    
    // Volume-based recommendations
    if (coreMetrics.volumeScore < 0.3) {
      recommendations.push({
        type: 'EXECUTION',
        recommendation: 'Use limit orders to avoid market impact',
        reasoning: 'Low volume increases execution risk with market orders',
        impact: 0.7,
        priority: 'HIGH'
      });
    }
    
    // Spread-based recommendations
    if (coreMetrics.spreadScore < 0.5) {
      recommendations.push({
        type: 'TIMING',
        recommendation: 'Execute during high-volume periods',
        reasoning: 'Wide spreads require careful timing to minimize costs',
        impact: 0.6,
        priority: 'MEDIUM'
      });
    }
    
    // Cost-based recommendations
    if (executionCosts.executionCostPercentage > 0.03) {
      recommendations.push({
        type: 'SIZE',
        recommendation: 'Consider reducing position size',
        reasoning: 'High execution costs relative to position value',
        impact: 0.8,
        priority: 'HIGH'
      });
    }
    
    // Risk-based recommendations
    if (liquidityRisk.overallLiquidityRisk > 0.6) {
      recommendations.push({
        type: 'ALTERNATIVE',
        recommendation: 'Consider more liquid alternatives',
        reasoning: 'High liquidity risk may impact execution quality',
        impact: 0.9,
        priority: 'HIGH'
      });
    }
    
    return recommendations;
  }

  /**
   * Advanced liquidity-based recommendation ranking
   * Implements sophisticated ranking based on risk/reward and liquidity scores
   */
  public rankRecommendationsByLiquidity(
    recommendations: OptionsRecommendation[],
    liquidityWeight: number = 0.3,
    riskRewardWeight: number = 0.4,
    confidenceWeight: number = 0.3
  ): RankedRecommendation[] {
    const rankedRecommendations = recommendations.map(rec => {
      // Calculate comprehensive ranking score
      const liquidityScore = rec.liquidity.liquidityScore;
      const riskRewardScore = Math.min(1, rec.riskReward.riskRewardRatio / 4); // Normalize to 0-1
      const confidenceScore = rec.confidence;
      
      // Weighted composite score
      const compositeScore = (
        liquidityScore * liquidityWeight +
        riskRewardScore * riskRewardWeight +
        confidenceScore * confidenceWeight
      );
      
      // Calculate ranking factors
      const rankingFactors = this.calculateRankingFactors(rec);
      
      // Determine ranking tier
      const rankingTier = this.determineRankingTier(compositeScore, rankingFactors);
      
      return {
        recommendation: rec,
        compositeScore,
        rankingFactors,
        rankingTier,
        liquidityScore,
        riskRewardScore,
        confidenceScore,
        rankingReasoning: this.generateRankingReasoning(rec, rankingFactors, rankingTier)
      };
    });
    
    // Sort by composite score
    rankedRecommendations.sort((a, b) => b.compositeScore - a.compositeScore);
    
    // Assign ranks
    rankedRecommendations.forEach((item, index) => {
      item.rank = index + 1;
    });
    
    return rankedRecommendations;
  }

  /**
   * Calculate comprehensive ranking factors for recommendation
   */
  private calculateRankingFactors(recommendation: OptionsRecommendation): RankingFactors {
    // Liquidity factor (0-1)
    const liquidityFactor = recommendation.liquidity.liquidityScore;
    
    // Risk/reward factor (0-1, normalized)
    const riskRewardFactor = Math.min(1, recommendation.riskReward.riskRewardRatio / 4);
    
    // Confidence factor (0-1)
    const confidenceFactor = recommendation.confidence;
    
    // Greeks efficiency factor (0-1)
    const greeksFactor = recommendation.riskReward.greeksImpact?.greeksEfficiency || 0.5;
    
    // Fibonacci alignment factor (0-1)
    const fibonacciFactor = recommendation.fibonacciAlignment.alignmentScore;
    
    // Diversification factor (simplified - based on strike distance from ATM)
    const atmDistance = Math.abs(recommendation.strike - recommendation.entryPrice) / recommendation.entryPrice;
    const diversificationFactor = Math.min(1, atmDistance * 5); // Normalize
    
    return {
      liquidityFactor,
      riskRewardFactor,
      confidenceFactor,
      greeksFactor,
      fibonacciFactor,
      diversificationFactor
    };
  }

  /**
   * Determine ranking tier based on composite score and factors
   */
  private determineRankingTier(
    compositeScore: number,
    rankingFactors: RankingFactors
  ): 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' {
    // Check for tier 1 (premium recommendations)
    if (compositeScore >= 0.8 && 
        rankingFactors.liquidityFactor >= 0.7 && 
        rankingFactors.riskRewardFactor >= 0.6) {
      return 'TIER_1';
    }
    
    // Check for tier 2 (good recommendations)
    if (compositeScore >= 0.6 && 
        rankingFactors.liquidityFactor >= 0.5) {
      return 'TIER_2';
    }
    
    // Check for tier 3 (acceptable recommendations)
    if (compositeScore >= 0.4) {
      return 'TIER_3';
    }
    
    // Tier 4 (poor recommendations)
    return 'TIER_4';
  }

  /**
   * Generate ranking reasoning for recommendation
   */
  private generateRankingReasoning(
    recommendation: OptionsRecommendation,
    rankingFactors: RankingFactors,
    tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4'
  ): string[] {
    const reasoning: string[] = [];
    
    // Tier-specific reasoning
    switch (tier) {
      case 'TIER_1':
        reasoning.push('Premium recommendation with excellent liquidity and risk/reward profile');
        break;
      case 'TIER_2':
        reasoning.push('Good recommendation with solid fundamentals');
        break;
      case 'TIER_3':
        reasoning.push('Acceptable recommendation with moderate appeal');
        break;
      case 'TIER_4':
        reasoning.push('Poor recommendation with significant limitations');
        break;
    }
    
    // Liquidity reasoning
    if (rankingFactors.liquidityFactor >= 0.8) {
      reasoning.push('Excellent liquidity with tight spreads and high volume');
    } else if (rankingFactors.liquidityFactor >= 0.6) {
      reasoning.push('Good liquidity suitable for most position sizes');
    } else if (rankingFactors.liquidityFactor >= 0.4) {
      reasoning.push('Moderate liquidity requiring careful execution');
    } else {
      reasoning.push('Poor liquidity with high execution risk');
    }
    
    // Risk/reward reasoning
    if (rankingFactors.riskRewardFactor >= 0.7) {
      reasoning.push('Attractive risk/reward ratio with high profit potential');
    } else if (rankingFactors.riskRewardFactor >= 0.5) {
      reasoning.push('Reasonable risk/reward balance');
    } else {
      reasoning.push('Limited risk/reward upside');
    }
    
    // Greeks reasoning
    if (rankingFactors.greeksFactor >= 0.7) {
      reasoning.push('Efficient Greeks profile with favorable sensitivity');
    } else if (rankingFactors.greeksFactor < 0.4) {
      reasoning.push('Challenging Greeks profile requiring active management');
    }
    
    // Confidence reasoning
    if (rankingFactors.confidenceFactor >= 0.7) {
      reasoning.push('High confidence signal with strong technical alignment');
    } else if (rankingFactors.confidenceFactor < 0.5) {
      reasoning.push('Lower confidence signal requiring careful consideration');
    }
    
    return reasoning;
    
    // Add ranking positions
    rankedRecommendations.forEach((ranked, index) => {
      ranked.rank = index + 1;
    });
    
    return rankedRecommendations;
  }

  /**
   * Get options chain data
   */
  private async getOptionsChain(ticker: string): Promise<OptionsChain> {
    // TODO: Integrate with real options data provider
    // This is a placeholder implementation
    
    const mockChain: OptionsChain = {
      ticker,
      underlyingPrice: 100,
      expirations: this.generateMockExpirations(),
      calls: this.generateMockContracts('CALL', 100),
      puts: this.generateMockContracts('PUT', 100),
      timestamp: new Date()
    };
    
    return mockChain;
  }

  /**
   * Filter options by liquidity requirements
   */
  private filterByLiquidity(optionsChain: OptionsChain): { calls: OptionContract[]; puts: OptionContract[] } {
    const minVolume = 10;
    const minOpenInterest = 50;
    const maxSpreadPercent = 0.15; // 15%
    
    const filterContract = (contract: OptionContract): boolean => {
      const spreadPercent = (contract.ask - contract.bid) / contract.midPrice;
      return contract.volume >= minVolume &&
             contract.openInterest >= minOpenInterest &&
             spreadPercent <= maxSpreadPercent;
    };
    
    return {
      calls: optionsChain.calls.filter(filterContract),
      puts: optionsChain.puts.filter(filterContract)
    };
  }

  /**
   * Find optimal call options with comprehensive analysis
   */
  private async findOptimalCalls(
    calls: OptionContract[],
    deltaTarget: { min: number; max: number },
    dtePreference: { min: number; max: number; preferred: number },
    expectedMove: number,
    fibAnalysis: FibonacciAnalysis,
    underlyingPrice: number
  ): Promise<OptionsRecommendation[]> {
    const recommendations: OptionsRecommendation[] = [];
    
    // Group by expiration
    const callsByExpiration = this.groupByExpiration(calls);
    
    for (const [expiration, contracts] of callsByExpiration) {
      const dte = this.calculateDTE(new Date(expiration));
      
      // Skip if outside DTE range
      if (dte < dtePreference.min || dte > dtePreference.max) {
        continue;
      }
      
      // Filter contracts by delta range
      const validContracts = contracts.filter(contract => 
        contract.greeks.delta >= deltaTarget.min && 
        contract.greeks.delta <= deltaTarget.max
      );
      
      if (validContracts.length === 0) continue;
      
      // Find best contracts for this expiration (top 2)
      const scoredContracts = validContracts.map(contract => ({
        contract,
        score: this.calculateContractScore(contract, expectedMove, underlyingPrice)
      }));
      
      scoredContracts.sort((a, b) => b.score - a.score);
      const topContracts = scoredContracts.slice(0, 2);
      
      for (const { contract } of topContracts) {
        const recommendation = await this.createComprehensiveRecommendation(
          contract,
          expectedMove,
          fibAnalysis,
          underlyingPrice,
          'BULLISH'
        );
        recommendations.push(recommendation);
      }
    }
    
    return recommendations;
  }

  /**
   * Find optimal put options with comprehensive analysis
   */
  private async findOptimalPuts(
    puts: OptionContract[],
    deltaTarget: { min: number; max: number },
    dtePreference: { min: number; max: number; preferred: number },
    expectedMove: number,
    fibAnalysis: FibonacciAnalysis,
    underlyingPrice: number
  ): Promise<OptionsRecommendation[]> {
    const recommendations: OptionsRecommendation[] = [];
    
    // Group by expiration
    const putsByExpiration = this.groupByExpiration(puts);
    
    for (const [expiration, contracts] of putsByExpiration) {
      const dte = this.calculateDTE(new Date(expiration));
      
      // Skip if outside DTE range
      if (dte < dtePreference.min || dte > dtePreference.max) {
        continue;
      }
      
      // Adjust delta target for puts (negative delta)
      const putDeltaTarget = {
        min: -deltaTarget.max,
        max: -deltaTarget.min
      };
      
      // Filter contracts by delta range
      const validContracts = contracts.filter(contract => 
        contract.greeks.delta >= putDeltaTarget.min && 
        contract.greeks.delta <= putDeltaTarget.max
      );
      
      if (validContracts.length === 0) continue;
      
      // Find best contracts for this expiration (top 2)
      const scoredContracts = validContracts.map(contract => ({
        contract,
        score: this.calculateContractScore(contract, Math.abs(expectedMove), underlyingPrice)
      }));
      
      scoredContracts.sort((a, b) => b.score - a.score);
      const topContracts = scoredContracts.slice(0, 2);
      
      for (const { contract } of topContracts) {
        const recommendation = await this.createComprehensiveRecommendation(
          contract,
          Math.abs(expectedMove),
          fibAnalysis,
          underlyingPrice,
          'BEARISH'
        );
        recommendations.push(recommendation);
      }
    }
    
    return recommendations;
  }

  /**
   * Create comprehensive recommendation from contract
   */
  private async createComprehensiveRecommendation(
    contract: OptionContract,
    expectedMove: number,
    fibAnalysis: FibonacciAnalysis,
    underlyingPrice: number,
    direction: 'BULLISH' | 'BEARISH'
  ): Promise<OptionsRecommendation> {
    // Calculate comprehensive metrics
    const riskReward = this.calculateEnhancedRiskReward(contract, expectedMove, underlyingPrice);
    const liquidity = this.assessComprehensiveLiquidity(contract);
    const fibAlignment = this.analyzeFibonacciAlignment(contract.strike, underlyingPrice, fibAnalysis);
    
    // Calculate confidence based on multiple factors
    const confidence = this.calculateRecommendationConfidence(
      contract,
      expectedMove,
      fibAnalysis,
      liquidity,
      direction
    );
    
    // Generate strategy and reasoning
    const strategy = this.determineStrategy(contract, direction, expectedMove, confidence);
    const reasoning = this.generateReasoning(contract, riskReward, liquidity, fibAlignment, direction);
    
    // Calculate position sizing
    const positionSize = this.calculatePositionSize(confidence, riskReward.riskRewardRatio);
    
    // Determine entry, target, and stop levels
    const entryPrice = contract.midPrice;
    const targetPrice = this.calculateTargetPrice(contract, expectedMove, direction);
    const stopLoss = this.calculateStopLoss(contract, riskReward.maxRisk);
    
    // Determine timeframe
    const timeframe = this.determineTimeframe(contract.daysToExpiration, expectedMove);
    
    return {
      symbol: contract.symbol,
      strike: contract.strike,
      expiration: contract.expiration,
      type: contract.type,
      confidence,
      expectedMove,
      strategy,
      reasoning,
      greeks: contract.greeks,
      riskReward,
      liquidity,
      fibonacciAlignment: fibAlignment,
      entryPrice,
      targetPrice,
      stopLoss,
      positionSize,
      timeframe,
      breakeven: riskReward.breakeven,
      maxRisk: riskReward.maxRisk,
      maxReward: riskReward.maxReward,
      profitProbability: riskReward.profitProbability,
      daysToExpiration: contract.daysToExpiration
    };
  }

  // Enhanced Strike and Expiration Selection Implementation Methods
  
  /**
   * Calculate enhanced delta target based on confidence and expected move
   */
  private calculateEnhancedDeltaTarget(
    baseDeltaTarget: { min: number; max: number },
    confidence: number,
    expectedMove: number
  ): { min: number; max: number } {
    // Adjust delta targets based on confidence
    let deltaAdjustment = 0;
    
    if (confidence > 0.8) {
      // High confidence: can use higher deltas for more exposure
      deltaAdjustment = 0.1;
    } else if (confidence < 0.5) {
      // Low confidence: use lower deltas for less risk
      deltaAdjustment = -0.1;
    }
    
    // Adjust for expected move size
    const moveAdjustment = expectedMove > 0.1 ? 0.05 : expectedMove < 0.03 ? -0.05 : 0;
    
    const totalAdjustment = deltaAdjustment + moveAdjustment;
    
    return {
      min: Math.max(0.1, Math.min(0.9, baseDeltaTarget.min + totalAdjustment)),
      max: Math.max(0.1, Math.min(0.9, baseDeltaTarget.max + totalAdjustment))
    };
  }

  /**
   * Calculate advanced strike score with multiple optimization factors
   */
  private calculateAdvancedStrikeScore(
    contract: OptionContract,
    expectedMove: number,
    confidence: number,
    underlyingPrice: number,
    fibAnalysis?: FibonacciAnalysis
  ): number {
    let score = 0;
    
    // Base liquidity and risk/reward score (40%)
    const baseScore = this.calculateContractScore(contract, expectedMove, underlyingPrice);
    score += baseScore * 0.4;
    
    // Delta efficiency score (25%)
    const deltaEfficiency = this.calculateDeltaEfficiency(contract.greeks.delta, expectedMove, confidence);
    score += deltaEfficiency * 0.25;
    
    // Time decay optimization score (20%)
    const timeDecayScore = this.calculateTimeDecayScore(contract, expectedMove);
    score += timeDecayScore * 0.2;
    
    // Fibonacci alignment score (15%)
    if (fibAnalysis) {
      const fibScore = this.calculateFibonacciScore(contract.strike, underlyingPrice, fibAnalysis);
      score += fibScore * 0.15;
    } else {
      score += 0.5 * 0.15; // Neutral score if no Fib analysis
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate dynamic delta targets based on multiple factors
   */
  private calculateDynamicDeltaTargets(
    confidence: number,
    expectedMove: number,
    timeframe: string
  ): { min: number; max: number; optimal: number } {
    // Base delta targets from confidence
    const confidenceLevel = this.getConfidenceLevel(confidence);
    const baseDelta = this.DELTA_TARGETS[confidenceLevel];
    
    // Adjust for expected move
    let moveAdjustment = 0;
    if (expectedMove > 0.15) moveAdjustment = 0.1; // Large moves: higher delta
    else if (expectedMove < 0.03) moveAdjustment = -0.1; // Small moves: lower delta
    
    // Adjust for timeframe
    let timeAdjustment = 0;
    if (timeframe.includes('Short')) timeAdjustment = 0.05; // Short-term: higher delta
    else if (timeframe.includes('Long')) timeAdjustment = -0.05; // Long-term: lower delta
    
    const totalAdjustment = moveAdjustment + timeAdjustment;
    
    return {
      min: Math.max(0.1, baseDelta.min + totalAdjustment),
      max: Math.min(0.9, baseDelta.max + totalAdjustment),
      optimal: (baseDelta.min + baseDelta.max) / 2 + totalAdjustment
    };
  }

  /**
   * Filter strike candidates based on criteria
   */
  private filterStrikeCandidates(
    contracts: OptionContract[],
    deltaTargets: { min: number; max: number; optimal: number },
    liquidityPreference: 'MINIMUM' | 'PREFERRED' | 'PREMIUM'
  ): OptionContract[] {
    // Filter by delta range
    let candidates = contracts.filter(contract => 
      Math.abs(contract.greeks.delta) >= deltaTargets.min && 
      Math.abs(contract.greeks.delta) <= deltaTargets.max
    );
    
    // Apply liquidity filters
    const liquidityThresholds = this.getLiquidityThresholds(liquidityPreference);
    candidates = candidates.filter(contract => 
      contract.volume >= liquidityThresholds.minVolume &&
      contract.openInterest >= liquidityThresholds.minOpenInterest &&
      (contract.ask - contract.bid) / contract.midPrice <= liquidityThresholds.maxSpreadPercent
    );
    
    return candidates;
  }

  /**
   * Score strike candidates with comprehensive analysis
   */
  private scoreStrikeCandidates(
    candidates: OptionContract[],
    criteria: StrikeSelectionCriteria
  ): Array<{ contract: OptionContract; score: number; analysis: any }> {
    return candidates.map(contract => {
      const score = this.calculateAdvancedStrikeScore(
        contract,
        criteria.expectedMove,
        criteria.confidence,
        criteria.underlyingPrice,
        criteria.fibAnalysis
      );
      
      const analysis = {
        deltaEfficiency: this.calculateDeltaEfficiency(contract.greeks.delta, criteria.expectedMove, criteria.confidence),
        liquidityScore: this.assessComprehensiveLiquidity(contract).liquidityScore,
        fibAlignment: criteria.fibAnalysis ? 
          this.analyzeFibonacciAlignment(contract.strike, criteria.underlyingPrice, criteria.fibAnalysis).alignmentScore : 0.5,
        timeDecayScore: this.calculateTimeDecayScore(contract, criteria.expectedMove)
      };
      
      return { contract, score, analysis };
    });
  }

  /**
   * Select multiple optimal strikes for different strategies
   */
  private selectMultipleOptimalStrikes(
    scoredStrikes: Array<{ contract: OptionContract; score: number; analysis: any }>,
    count: number
  ): Array<{ contract: OptionContract; score: number; analysis: any }> {
    // Sort by score and diversify selection
    scoredStrikes.sort((a, b) => b.score - a.score);
    
    const selected: Array<{ contract: OptionContract; score: number; analysis: any }> = [];
    const usedDeltas = new Set<number>();
    
    for (const strike of scoredStrikes) {
      if (selected.length >= count) break;
      
      // Ensure delta diversity
      const deltaRange = Math.floor(Math.abs(strike.contract.greeks.delta) * 10) / 10;
      if (!usedDeltas.has(deltaRange) || selected.length === 0) {
        selected.push(strike);
        usedDeltas.add(deltaRange);
      }
    }
    
    return selected;
  }

  /**
   * Calculate enhanced DTE preference based on multiple factors
   */
  private calculateEnhancedDtePreference(
    confidence: number,
    expectedMove: number,
    timeframe: string,
    volatilityEnvironment?: string
  ): { min: number; max: number; preferred: number } {
    const confidenceLevel = this.getConfidenceLevel(confidence);
    const baseDte = this.DTE_PREFERENCES[confidenceLevel];
    
    // Adjust for expected move
    let moveAdjustment = 0;
    if (expectedMove > 0.1) moveAdjustment = -7; // Large moves: shorter DTE
    else if (expectedMove < 0.03) moveAdjustment = 7; // Small moves: longer DTE
    
    // Adjust for volatility environment
    let volAdjustment = 0;
    if (volatilityEnvironment === 'HIGH_VOLATILITY') volAdjustment = -5; // High vol: shorter DTE
    else if (volatilityEnvironment === 'LOW_VOLATILITY') volAdjustment = 5; // Low vol: longer DTE
    
    // Adjust for timeframe
    let timeAdjustment = 0;
    if (timeframe.includes('Short')) timeAdjustment = -7;
    else if (timeframe.includes('Long')) timeAdjustment = 14;
    
    const totalAdjustment = moveAdjustment + volAdjustment + timeAdjustment;
    
    return {
      min: Math.max(1, baseDte.min + totalAdjustment),
      max: Math.max(7, baseDte.max + totalAdjustment),
      preferred: Math.max(7, baseDte.preferred + totalAdjustment)
    };
  }

  /**
   * Calculate expiration score based on multiple factors
   */
  private calculateExpirationScore(
    expiration: Date,
    dtePreference: { min: number; max: number; preferred: number },
    confidence: number,
    expectedMove: number
  ): number {
    const dte = this.calculateDTE(expiration);
    
    // Distance from preferred DTE (40%)
    const dteDistance = Math.abs(dte - dtePreference.preferred);
    const dteScore = Math.max(0, 1 - (dteDistance / 30)); // Normalize over 30 days
    
    // Time decay efficiency (30%)
    const timeDecayScore = this.calculateTimeDecayEfficiency(dte, expectedMove, confidence);
    
    // Volatility opportunity (20%)
    const volScore = this.calculateVolatilityOpportunity(dte, expectedMove);
    
    // Event risk adjustment (10%)
    const eventScore = this.calculateEventRiskScore(expiration);
    
    return (dteScore * 0.4) + (timeDecayScore * 0.3) + (volScore * 0.2) + (eventScore * 0.1);
  }

  /**
   * Calculate time decay optimization for given DTE
   */
  private calculateTimeDecayOptimization(
    dte: number,
    expectedMove: number,
    confidence: number
  ): TimeDecayOptimization {
    // Optimal holding period (typically 25-50% of DTE)
    const optimalHoldingPeriod = Math.min(dte * 0.4, 21); // Cap at 3 weeks
    
    // Decay efficiency (higher for moderate DTEs)
    let decayEfficiency = 0.5;
    if (dte >= 14 && dte <= 45) decayEfficiency = 0.8; // Sweet spot
    else if (dte < 7) decayEfficiency = 0.3; // Too fast decay
    else if (dte > 60) decayEfficiency = 0.4; // Too slow decay
    
    // Theta risk (higher for shorter DTEs)
    const thetaRisk = Math.max(0.1, Math.min(0.9, 1 - (dte / 60)));
    
    // Theta opportunity (balance of time and risk)
    const thetaOpportunity = decayEfficiency * (1 - thetaRisk) * confidence;
    
    return {
      optimalHoldingPeriod,
      decayEfficiency,
      thetaRisk,
      thetaOpportunity
    };
  }

  /**
   * Find optimal strikes for a specific expiration
   */
  private findOptimalStrikesForExpiration(
    contracts: OptionContract[],
    expectedMove: number,
    confidence: number,
    underlyingPrice: number,
    timeDecayOptimization: TimeDecayOptimization
  ): Array<{ contract: OptionContract; score: number }> {
    return contracts
      .map(contract => ({
        contract,
        score: this.calculateStrikeExpirationScore(
          contract,
          expectedMove,
          confidence,
          underlyingPrice,
          timeDecayOptimization
        )
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3); // Top 3 strikes per expiration
  }

  /**
   * Calculate combination score for strike/expiration pair
   */
  private calculateCombinationScore(
    contract: OptionContract,
    dte: number,
    expectedMove: number,
    confidence: number,
    timeDecayOptimization: TimeDecayOptimization
  ): number {
    // Base contract score (40%)
    const contractScore = this.calculateContractScore(contract, expectedMove, 0); // Simplified
    
    // Time decay optimization score (30%)
    const timeDecayScore = timeDecayOptimization.thetaOpportunity;
    
    // DTE efficiency score (20%)
    const dteEfficiency = this.calculateDteEfficiency(dte, expectedMove, confidence);
    
    // Risk/reward balance (10%)
    const rrBalance = this.calculateRiskRewardBalance(contract, expectedMove);
    
    return (contractScore * 0.4) + (timeDecayScore * 0.3) + (dteEfficiency * 0.2) + (rrBalance * 0.1);
  }

  /**
   * Calculate expected move alignment for contract
   */
  private calculateExpectedMoveAlignment(
    contract: OptionContract,
    expectedMove: number,
    underlyingPrice: number
  ): ExpectedMoveAlignment {
    const isCall = contract.type === 'CALL';
    const moneyness = contract.strike / underlyingPrice;
    
    // Calculate required move to breakeven
    const premium = contract.midPrice;
    const moveRequirement = isCall ? 
      (contract.strike + premium - underlyingPrice) / underlyingPrice :
      (underlyingPrice - contract.strike + premium) / underlyingPrice;
    
    // Move probability based on expected move
    const moveProbability = Math.max(0.1, Math.min(0.9, 
      expectedMove > Math.abs(moveRequirement) ? 0.7 : 0.4
    ));
    
    // Move efficiency (how well the contract captures the move)
    const moveEfficiency = Math.abs(contract.greeks.delta);
    
    // Breakout potential (potential for larger moves)
    const breakoutPotential = expectedMove > 0.08 ? 0.7 : 0.4;
    
    return {
      moveRequirement: Math.abs(moveRequirement),
      moveProbability,
      moveEfficiency,
      breakoutPotential
    };
  }

  // Helper methods for enhanced algorithms
  
  private calculateDeltaEfficiency(delta: number, expectedMove: number, confidence: number): number {
    const absDelta = Math.abs(delta);
    
    // Optimal delta range based on expected move
    let optimalDelta = 0.5;
    if (expectedMove > 0.1) optimalDelta = 0.6; // Higher delta for large moves
    else if (expectedMove < 0.03) optimalDelta = 0.4; // Lower delta for small moves
    
    // Adjust for confidence
    optimalDelta += (confidence - 0.5) * 0.2;
    
    // Calculate efficiency (closer to optimal = higher efficiency)
    const deltaDistance = Math.abs(absDelta - optimalDelta);
    return Math.max(0.1, 1 - (deltaDistance * 2));
  }

  private calculateTimeDecayScore(contract: OptionContract, expectedMove: number): number {
    const theta = Math.abs(contract.greeks.theta);
    const dte = contract.daysToExpiration;
    
    // Optimal theta range (not too high, not too low)
    const optimalTheta = expectedMove * 0.1; // Rough estimate
    const thetaDistance = Math.abs(theta - optimalTheta);
    
    // DTE adjustment (prefer moderate DTEs)
    let dteAdjustment = 1.0;
    if (dte < 7) dteAdjustment = 0.7; // Too short
    else if (dte > 60) dteAdjustment = 0.8; // Too long
    
    return Math.max(0.1, (1 - thetaDistance * 10) * dteAdjustment);
  }

  private calculateFibonacciScore(strike: number, underlyingPrice: number, fibAnalysis: FibonacciAnalysis): number {
    // Find nearest Fibonacci level
    let minDistance = Infinity;
    let nearestLevel = underlyingPrice;
    
    for (const level of fibAnalysis.keyLevels) {
      const distance = Math.abs(strike - level.level) / underlyingPrice;
      if (distance < minDistance) {
        minDistance = distance;
        nearestLevel = level.level;
      }
    }
    
    // Score based on proximity to Fibonacci level
    return Math.max(0.1, 1 - (minDistance * 20)); // Closer = higher score
  }

  private getLiquidityThresholds(preference: 'MINIMUM' | 'PREFERRED' | 'PREMIUM'): any {
    const thresholds = {
      'MINIMUM': {
        minVolume: this.LIQUIDITY_THRESHOLDS.MIN_VOLUME,
        minOpenInterest: this.LIQUIDITY_THRESHOLDS.MIN_OPEN_INTEREST,
        maxSpreadPercent: this.LIQUIDITY_THRESHOLDS.MAX_SPREAD_PERCENT
      },
      'PREFERRED': {
        minVolume: this.LIQUIDITY_THRESHOLDS.PREFERRED_VOLUME,
        minOpenInterest: this.LIQUIDITY_THRESHOLDS.PREFERRED_OPEN_INTEREST,
        maxSpreadPercent: this.LIQUIDITY_THRESHOLDS.MAX_SPREAD_PERCENT * 0.8
      },
      'PREMIUM': {
        minVolume: this.LIQUIDITY_THRESHOLDS.PREFERRED_VOLUME * 2,
        minOpenInterest: this.LIQUIDITY_THRESHOLDS.PREFERRED_OPEN_INTEREST * 2,
        maxSpreadPercent: this.LIQUIDITY_THRESHOLDS.MAX_SPREAD_PERCENT * 0.5
      }
    };
    
    return thresholds[preference];
  }

  private calculateTimeDecayEfficiency(dte: number, expectedMove: number, confidence: number): number {
    // Optimal DTE range for different scenarios
    let optimalDte = 21; // Default 3 weeks
    
    if (expectedMove > 0.1) optimalDte = 14; // Large moves: shorter DTE
    else if (expectedMove < 0.03) optimalDte = 30; // Small moves: longer DTE
    
    // Adjust for confidence
    if (confidence > 0.8) optimalDte *= 0.8; // High confidence: shorter DTE
    else if (confidence < 0.5) optimalDte *= 1.2; // Low confidence: longer DTE
    
    // Calculate efficiency
    const dteDistance = Math.abs(dte - optimalDte);
    return Math.max(0.1, 1 - (dteDistance / 30));
  }

  private calculateVolatilityOpportunity(dte: number, expectedMove: number): number {
    // Longer DTE generally better for volatility plays
    const dteScore = Math.min(1, dte / 45);
    
    // Larger expected moves favor volatility opportunities
    const moveScore = Math.min(1, expectedMove * 10);
    
    return (dteScore + moveScore) / 2;
  }

  private calculateEventRiskScore(expiration: Date): number {
    // Simplified event risk calculation
    // In practice, would check earnings calendar, FOMC meetings, etc.
    const dte = this.calculateDTE(expiration);
    
    // Prefer expirations that avoid major events (simplified)
    if (dte <= 7) return 0.6; // Short DTE has event risk
    if (dte >= 45) return 0.8; // Long DTE avoids most events
    return 0.7; // Medium DTE moderate risk
  }

  private calculateDteEfficiency(dte: number, expectedMove: number, confidence: number): number {
    return this.calculateTimeDecayEfficiency(dte, expectedMove, confidence);
  }

  private calculateRiskRewardBalance(contract: OptionContract, expectedMove: number): number {
    const riskReward = this.calculateEnhancedRiskReward(contract, expectedMove, 0); // Simplified
    return Math.min(1, riskReward.riskRewardRatio / 3); // Normalize to 0-1
  }

  private calculateStrikeExpirationScore(
    contract: OptionContract,
    expectedMove: number,
    confidence: number,
    underlyingPrice: number,
    timeDecayOptimization: TimeDecayOptimization
  ): number {
    const baseScore = this.calculateContractScore(contract, expectedMove, underlyingPrice);
    const timeDecayScore = timeDecayOptimization.thetaOpportunity;
    
    return (baseScore * 0.7) + (timeDecayScore * 0.3);
  }

  // Placeholder methods for comprehensive analysis (would be fully implemented)
  private generateStrikeAnalysis(strikes: any[], criteria: StrikeSelectionCriteria): StrikeAnalysis {
    return {
      deltaDistribution: {
        averageDelta: 0.5,
        deltaRange: { min: 0.3, max: 0.7 },
        optimalDeltaZone: { min: 0.4, max: 0.6 },
        deltaEfficiency: 0.8
      },
      riskRewardProfile: {
        averageRiskReward: 2.5,
        riskRewardRange: { min: 1.5, max: 4.0 },
        probabilityWeightedReturn: 0.15,
        riskAdjustedReturn: 0.12
      },
      liquidityProfile: {
        averageLiquidity: 0.8,
        liquidityConsistency: 0.7,
        executionRisk: 0.2,
        marketImpact: 0.1
      },
      fibonacciAlignment: {
        alignmentScore: 0.7,
        nearbyLevels: [],
        supportResistanceImpact: 0.6
      },
      timeDecayImpact: {
        dailyDecay: 0.05,
        weeklyDecay: 0.3,
        accelerationRisk: 0.4,
        optimalTimeframe: '2-3 weeks'
      }
    };
  }

  private generateStrikeSelectionReasoning(strikes: any[], criteria: StrikeSelectionCriteria): string[] {
    return [
      'Selected strikes based on optimal delta targeting for expected move',
      'Prioritized liquidity and execution quality',
      'Aligned with Fibonacci support/resistance levels',
      'Optimized for time decay efficiency'
    ];
  }

  // Additional placeholder methods (would be fully implemented)
  private calculateDynamicDtePreferences(criteria: ExpirationSelectionCriteria): any {
    return { min: 7, max: 45, preferred: 21 };
  }

  private filterExpirationCandidates(expirations: Date[], preferences: any): Date[] {
    return expirations.filter(exp => {
      const dte = this.calculateDTE(exp);
      return dte >= preferences.min && dte <= preferences.max;
    });
  }

  private analyzeExpirationCandidates(candidates: Date[], criteria: ExpirationSelectionCriteria): any[] {
    return candidates.map(exp => ({ expiration: exp, score: 0.7 }));
  }

  private selectMultipleOptimalExpirations(analyzed: any[], count: number): any[] {
    return analyzed.slice(0, count);
  }

  private generateExpirationAnalysis(expirations: any[], criteria: ExpirationSelectionCriteria): ExpirationAnalysis {
    return {
      dteDistribution: {
        averageDte: 21,
        dteRange: { min: 7, max: 45 },
        optimalDteZone: { min: 14, max: 30 },
        dteEfficiency: 0.8
      },
      timeDecayProfile: {
        currentDecayRate: 0.05,
        projectedDecayRate: 0.08,
        decayAcceleration: 0.3,
        optimalHoldingPeriod: 14
      },
      volatilityProfile: {
        impliedVolatility: 0.25,
        volRisk: 0.3,
        volOpportunity: 0.7,
        volStability: 0.6
      },
      eventRiskProfile: {
        earningsRisk: 0.2,
        eventProximity: 15,
        eventImpact: 0.4,
        eventStrategy: 'Neutral positioning'
      }
    };
  }

  private generateExpirationSelectionReasoning(expirations: any[], criteria: ExpirationSelectionCriteria): string[] {
    return [
      'Selected expirations based on optimal time decay profile',
      'Balanced theta risk with opportunity potential',
      'Avoided major event risk periods',
      'Aligned with expected move timeframe'
    ];
  }

  private generateOptimizationAnalysis(combinations: StrikeExpirationCombination[], criteria: OptimizationCriteria): OptimizationAnalysis {
    return {
      overallEfficiency: 0.8,
      riskRewardOptimization: 0.75,
      timeDecayOptimization: 0.85,
      liquidityOptimization: 0.8,
      fibonacciOptimization: 0.7
    };
  }

  private generateOptimizationRecommendations(combinations: StrikeExpirationCombination[], criteria: OptimizationCriteria): OptimizationRecommendation[] {
    return [
      {
        type: 'COMBINATION',
        recommendation: 'Use optimal strike/expiration combination for best risk/reward',
        reasoning: 'Maximizes expected return while managing time decay risk',
        impact: 0.8,
        priority: 'HIGH'
      }
    ];
  }

  // Enhanced Greeks Analysis and Liquidity Assessment Implementation Methods
  
  /**
   * Calculate reward scenarios based on different market conditions
   */
  private calculateRewardScenarios(
    contract: OptionContract,
    expectedMove: number,
    underlyingPrice: number,
    volatilityChange: number = 0,
    timeHorizon: number = 1
  ): { bestCase: number; expectedCase: number; worstCase: number } {
    const isCall = contract.type === 'CALL';
    const strike = contract.strike;
    const premium = contract.midPrice;
    
    // Best case scenario (favorable move + vol expansion)
    const bestMoveSize = expectedMove * 1.5;
    const bestVolChange = Math.max(0, volatilityChange + 0.05);
    const bestCase = this.calculateScenarioPnL(
      contract, underlyingPrice, bestMoveSize, bestVolChange, timeHorizon * 0.5
    );
    
    // Expected case scenario
    const expectedCase = this.calculateScenarioPnL(
      contract, underlyingPrice, expectedMove, volatilityChange, timeHorizon
    );
    
    // Worst case scenario (adverse move + vol crush + time decay)
    const worstMoveSize = -expectedMove * 0.5;
    const worstVolChange = Math.min(0, volatilityChange - 0.1);
    const worstCase = this.calculateScenarioPnL(
      contract, underlyingPrice, worstMoveSize, worstVolChange, timeHorizon * 1.5
    );
    
    return {
      bestCase: Math.max(0, bestCase + premium),
      expectedCase: Math.max(0, expectedCase),
      worstCase: Math.min(0, worstCase - premium)
    };
  }

  /**
   * Calculate P&L for a specific scenario
   */
  private calculateScenarioPnL(
    contract: OptionContract,
    underlyingPrice: number,
    priceMove: number,
    volChange: number,
    timeDecay: number
  ): number {
    const greeks = contract.greeks;
    const priceChange = underlyingPrice * priceMove;
    
    // Calculate Greeks impact
    const deltaImpact = greeks.delta * priceChange;
    const gammaImpact = 0.5 * greeks.gamma * Math.pow(priceChange, 2);
    const thetaImpact = greeks.theta * timeDecay;
    const vegaImpact = greeks.vega * volChange;
    
    return deltaImpact + gammaImpact + thetaImpact + vegaImpact;
  }

  /**
   * Calculate comprehensive Greeks impact
   */
  private calculateGreeksImpact(
    contract: OptionContract,
    expectedMove: number,
    underlyingPrice: number,
    volatilityChange: number = 0,
    timeHorizon: number = 1
  ): GreeksImpactAnalysis {
    const greeks = contract.greeks;
    const priceChange = underlyingPrice * expectedMove;
    
    // Individual Greeks impacts
    const deltaImpact = greeks.delta * priceChange;
    const gammaImpact = 0.5 * greeks.gamma * Math.pow(priceChange, 2);
    const thetaImpact = greeks.theta * timeHorizon;
    const vegaImpact = greeks.vega * volatilityChange;
    const rhoImpact = greeks.rho * 0.01; // Assume 1% rate change
    
    const totalImpact = deltaImpact + gammaImpact + thetaImpact + vegaImpact + rhoImpact;
    
    // Calculate Greeks efficiency
    const greeksEfficiency = this.calculateGreeksEfficiency(greeks, priceChange, volatilityChange);
    
    // Risk decomposition
    const riskDecomposition = this.calculateRiskDecomposition(greeks, contract.daysToExpiration);
    
    // Identify dominant Greek
    const dominantGreek = this.identifyDominantGreek(greeks, priceChange, volatilityChange);
    
    // Calculate hedging requirements
    const hedgingRequirements = this.calculateHedgingRequirements(greeks, contract.midPrice);
    
    return {
      deltaImpact,
      gammaImpact,
      thetaImpact,
      vegaImpact,
      rhoImpact,
      totalImpact,
      greeksEfficiency,
      riskDecomposition,
      dominantGreek,
      hedgingRequirements
    };
  }

  /**
   * Calculate Greeks efficiency (how well Greeks work together)
   */
  private calculateGreeksEfficiency(
    greeks: OptionsGreeks,
    priceChange: number,
    volatilityChange: number
  ): number {
    // Calculate individual Greek contributions
    const deltaContrib = Math.abs(greeks.delta * priceChange);
    const gammaContrib = Math.abs(0.5 * greeks.gamma * Math.pow(priceChange, 2));
    const thetaContrib = Math.abs(greeks.theta);
    const vegaContrib = Math.abs(greeks.vega * volatilityChange);
    
    const totalContrib = deltaContrib + gammaContrib + thetaContrib + vegaContrib;
    
    // Efficiency is higher when Greeks work in the same direction
    const positiveContrib = 
      (greeks.delta * priceChange > 0 ? deltaContrib : 0) +
      (gammaContrib > 0 ? gammaContrib : 0) +
      (greeks.vega * volatilityChange > 0 ? vegaContrib : 0);
    
    return totalContrib > 0 ? positiveContrib / totalContrib : 0.5;
  }

  /**
   * Calculate risk decomposition by Greek
   */
  private calculateRiskDecomposition(greeks: OptionsGreeks, dte: number): RiskDecomposition {
    // Estimate risk contribution from each Greek
    const priceRisk = Math.abs(greeks.delta) + Math.abs(greeks.gamma) * 0.5;
    const timeRisk = Math.abs(greeks.theta) * Math.sqrt(dte);
    const volatilityRisk = Math.abs(greeks.vega) * 0.1; // Assume 10% vol change
    const interestRateRisk = Math.abs(greeks.rho) * 0.01; // Assume 1% rate change
    
    const totalRisk = priceRisk + timeRisk + volatilityRisk + interestRateRisk;
    
    return {
      priceRisk: totalRisk > 0 ? priceRisk / totalRisk : 0,
      timeRisk: totalRisk > 0 ? timeRisk / totalRisk : 0,
      volatilityRisk: totalRisk > 0 ? volatilityRisk / totalRisk : 0,
      interestRateRisk: totalRisk > 0 ? interestRateRisk / totalRisk : 0,
      totalRisk
    };
  }

  /**
   * Identify the dominant Greek for the position
   */
  private identifyDominantGreek(
    greeks: OptionsGreeks,
    priceChange: number,
    volatilityChange: number
  ): 'DELTA' | 'GAMMA' | 'THETA' | 'VEGA' | 'RHO' {
    const impacts = {
      DELTA: Math.abs(greeks.delta * priceChange),
      GAMMA: Math.abs(0.5 * greeks.gamma * Math.pow(priceChange, 2)),
      THETA: Math.abs(greeks.theta),
      VEGA: Math.abs(greeks.vega * volatilityChange),
      RHO: Math.abs(greeks.rho * 0.01)
    };
    
    return Object.entries(impacts).reduce((a, b) => 
      impacts[a[0] as keyof typeof impacts] > impacts[b[0] as keyof typeof impacts] ? a : b
    )[0] as 'DELTA' | 'GAMMA' | 'THETA' | 'VEGA' | 'RHO';
  }

  /**
   * Calculate hedging requirements
   */
  private calculateHedgingRequirements(greeks: OptionsGreeks, premium: number): HedgingRequirements {
    const deltaHedgeRequired = Math.abs(greeks.delta) > 0.3;
    const gammaHedgeRequired = Math.abs(greeks.gamma) > 0.05;
    const vegaHedgeRequired = Math.abs(greeks.vega) > 0.5;
    
    // Estimate hedging cost as percentage of premium
    let hedgingCost = 0;
    if (deltaHedgeRequired) hedgingCost += 0.02; // 2% for delta hedge
    if (gammaHedgeRequired) hedgingCost += 0.03; // 3% for gamma hedge
    if (vegaHedgeRequired) hedgingCost += 0.02; // 2% for vega hedge
    
    const hedgingComplexity = 
      (deltaHedgeRequired ? 1 : 0) + (gammaHedgeRequired ? 1 : 0) + (vegaHedgeRequired ? 1 : 0) >= 2 
        ? 'HIGH' : hedgingCost > 0.03 ? 'MODERATE' : 'LOW';
    
    const recommendedHedges: string[] = [];
    if (deltaHedgeRequired) recommendedHedges.push('Delta hedge with underlying');
    if (gammaHedgeRequired) recommendedHedges.push('Gamma hedge with options');
    if (vegaHedgeRequired) recommendedHedges.push('Vega hedge with different expiration');
    
    return {
      deltaHedgeRequired,
      gammaHedgeRequired,
      vegaHedgeRequired,
      hedgingCost: hedgingCost * premium,
      hedgingComplexity,
      recommendedHedges
    };
  }

  /**
   * Calculate risk-adjusted metrics
   */
  private calculateRiskAdjustedMetrics(
    rewardScenarios: any,
    greeksImpact: GreeksImpactAnalysis,
    profitProbability: number
  ): RiskAdjustedMetrics {
    // Simplified risk-adjusted calculations
    const expectedReturn = rewardScenarios.expectedCase;
    const volatility = Math.abs(rewardScenarios.bestCase - rewardScenarios.worstCase) / 4;
    
    const sharpeRatio = volatility > 0 ? expectedReturn / volatility : 0;
    const sortinoRatio = volatility > 0 ? expectedReturn / (volatility * 0.7) : 0; // Downside deviation approximation
    const calmarRatio = Math.abs(rewardScenarios.worstCase) > 0 ? expectedReturn / Math.abs(rewardScenarios.worstCase) : 0;
    const maxDrawdown = Math.abs(rewardScenarios.worstCase);
    const valueAtRisk = rewardScenarios.worstCase * 1.65; // 95% VaR approximation
    const expectedShortfall = rewardScenarios.worstCase * 1.3; // Conditional VaR approximation
    
    return {
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown,
      valueAtRisk,
      expectedShortfall
    };
  }

  /**
   * Generate scenario analysis
   */
  private generateScenarioAnalysis(
    contract: OptionContract,
    expectedMove: number,
    underlyingPrice: number
  ): ScenarioAnalysis {
    const scenarios = {
      bullishScenario: this.calculateScenarioResult(contract, expectedMove, 0.05, 0.5, underlyingPrice),
      bearishScenario: this.calculateScenarioResult(contract, -expectedMove, 0.05, 0.5, underlyingPrice),
      neutralScenario: this.calculateScenarioResult(contract, 0, 0, 1, underlyingPrice),
      volatilityExpansion: this.calculateScenarioResult(contract, expectedMove * 0.5, 0.1, 0.5, underlyingPrice),
      volatilityContraction: this.calculateScenarioResult(contract, expectedMove * 0.5, -0.1, 0.5, underlyingPrice),
      timeDecayScenario: this.calculateScenarioResult(contract, 0, 0, 7, underlyingPrice)
    };
    
    return scenarios;
  }

  /**
   * Calculate individual scenario result
   */
  private calculateScenarioResult(
    contract: OptionContract,
    priceMove: number,
    volChange: number,
    timeDecay: number,
    underlyingPrice: number
  ): ScenarioResult {
    const priceChange = underlyingPrice * priceMove;
    const greeks = contract.greeks;
    
    const deltaContrib = greeks.delta * priceChange;
    const gammaContrib = 0.5 * greeks.gamma * Math.pow(priceChange, 2);
    const thetaContrib = greeks.theta * timeDecay;
    const vegaContrib = greeks.vega * volChange;
    
    const expectedPnL = deltaContrib + gammaContrib + thetaContrib + vegaContrib;
    
    // Estimate probability based on scenario type
    let probability = 0.2; // Default
    if (Math.abs(priceMove) <= 0.05) probability = 0.4; // Neutral scenarios more likely
    if (timeDecay > 1) probability = 0.8; // Time decay is certain
    
    return {
      priceChange: priceMove,
      expectedPnL,
      probability,
      greeksContribution: {
        delta: deltaContrib,
        gamma: gammaContrib,
        theta: thetaContrib,
        vega: vegaContrib
      }
    };
  }

  // Comprehensive Liquidity Assessment Implementation Methods
  
  /**
   * Calculate core liquidity metrics
   */
  private calculateCoreLiquidityMetrics(contract: OptionContract): CoreLiquidityMetrics {
    const volume = contract.volume;
    const openInterest = contract.openInterest;
    const spread = contract.ask - contract.bid;
    const spreadPercent = spread / contract.midPrice;
    
    // Volume score (0-1)
    const volumeScore = Math.min(1, volume / this.LIQUIDITY_THRESHOLDS.PREFERRED_VOLUME);
    
    // Open interest score (0-1)
    const openInterestScore = Math.min(1, openInterest / this.LIQUIDITY_THRESHOLDS.PREFERRED_OPEN_INTEREST);
    
    // Spread score (0-1, lower spread = higher score)
    const spreadScore = Math.max(0, 1 - (spreadPercent / this.LIQUIDITY_THRESHOLDS.MAX_SPREAD_PERCENT));
    
    // Estimate average daily volume (simplified)
    const averageDailyVolume = volume * 0.8;
    const volumeRatio = volume / (averageDailyVolume || 1);
    
    // Percentile ranks (simplified)
    const openInterestRank = Math.min(100, (openInterest / 1000) * 100);
    const spreadRank = Math.max(0, 100 - (spreadPercent * 1000));
    
    return {
      volumeScore,
      openInterestScore,
      spreadScore,
      averageDailyVolume,
      volumeRatio,
      openInterestRank,
      spreadRank
    };
  }

  /**
   * Analyze market microstructure
   */
  private analyzeMicrostructure(
    contract: OptionContract,
    marketConditions?: MarketConditions
  ): MicrostructureAnalysis {
    const spread = contract.ask - contract.bid;
    const midPrice = contract.midPrice;
    
    // Bid-ask spread stability (simplified)
    const bidAskSpreadStability = Math.max(0.3, 1 - (spread / midPrice) * 5);
    
    // Estimate order book depth
    const orderBookDepth = Math.min(1, contract.openInterest / 5000);
    
    // Price impact model
    const priceImpactModel: PriceImpactModel = {
      linearImpact: spread / midPrice * 0.5,
      nonlinearImpact: Math.pow(spread / midPrice, 1.5),
      temporaryImpact: spread / midPrice * 0.3,
      permanentImpact: spread / midPrice * 0.1
    };
    
    // Liquidity provision estimate
    const liquidityProvision = Math.min(1, contract.volume / 200);
    
    // Market maker presence (higher OI and volume suggests MM presence)
    const marketMakerPresence = Math.min(1, 
      (contract.openInterest / 1000 + contract.volume / 100) / 2
    );
    
    // Retail flow estimate (inverse of MM presence)
    const retailFlow = 1 - marketMakerPresence;
    
    return {
      bidAskSpreadStability,
      orderBookDepth,
      priceImpactModel,
      liquidityProvision,
      marketMakerPresence,
      retailFlow
    };
  }

  /**
   * Calculate execution costs
   */
  private calculateExecutionCosts(
    contract: OptionContract,
    positionSize: number = 1
  ): ExecutionCosts {
    const spread = contract.ask - contract.bid;
    const midPrice = contract.midPrice;
    
    // Bid-ask cost (half spread)
    const bidAskCost = (spread / 2) * positionSize;
    
    // Market impact cost (depends on position size)
    const marketImpactCost = Math.pow(positionSize / 10, 0.6) * spread * 0.3;
    
    // Timing cost (opportunity cost of execution delay)
    const timingCost = midPrice * 0.001 * positionSize; // 0.1% of position
    
    // Opportunity cost (cost of not executing immediately)
    const opportunityCost = midPrice * 0.002 * positionSize; // 0.2% of position
    
    const totalExecutionCost = bidAskCost + marketImpactCost + timingCost + opportunityCost;
    const executionCostPercentage = totalExecutionCost / (midPrice * positionSize);
    
    return {
      bidAskCost,
      marketImpactCost,
      timingCost,
      opportunityCost,
      totalExecutionCost,
      executionCostPercentage
    };
  }

  /**
   * Assess liquidity risk
   */
  private assessLiquidityRisk(
    contract: OptionContract,
    marketConditions?: MarketConditions
  ): LiquidityRisk {
    const spread = contract.ask - contract.bid;
    const spreadPercent = spread / contract.midPrice;
    
    // Execution risk (higher spread = higher risk)
    const executionRisk = Math.min(1, spreadPercent * 10);
    
    // Liquidity dry-up risk (lower volume/OI = higher risk)
    const liquidityDryUpRisk = Math.max(0, 1 - (contract.volume + contract.openInterest / 10) / 500);
    
    // Wide spreads risk
    const wideSpreadsRisk = Math.min(1, spreadPercent * 5);
    
    // Market stress risk (depends on market conditions)
    const marketStressRisk = marketConditions?.marketStress || 0.3;
    
    const overallLiquidityRisk = (
      executionRisk * 0.3 +
      liquidityDryUpRisk * 0.3 +
      wideSpreadsRisk * 0.2 +
      marketStressRisk * 0.2
    );
    
    return {
      executionRisk,
      liquidityDryUpRisk,
      wideSpreadsRisk,
      marketStressRisk,
      overallLiquidityRisk
    };
  }

  /**
   * Estimate market impact
   */
  private estimateMarketImpact(
    contract: OptionContract,
    positionSize: number = 1
  ): MarketImpact {
    const spread = contract.ask - contract.bid;
    const volume = contract.volume;
    
    // Immediate impact (function of position size relative to volume)
    const volumeRatio = positionSize / (volume || 1);
    const immediateImpact = Math.min(spread, spread * Math.sqrt(volumeRatio));
    
    // Delayed impact (smaller, persists longer)
    const delayedImpact = immediateImpact * 0.3;
    
    // Recovery time (minutes for price to recover)
    const recoveryTime = Math.min(60, volumeRatio * 30);
    
    // Impact asymmetry (buy vs sell impact difference)
    const impactAsymmetry = immediateImpact * 0.1;
    
    return {
      immediateImpact,
      delayedImpact,
      recoveryTime,
      impactAsymmetry
    };
  }

  /**
   * Analyze execution timing
   */
  private analyzeExecutionTiming(contract: OptionContract): TimingAnalysis {
    // Simplified timing analysis
    const volume = contract.volume;
    
    // Optimal execution time (when volume is highest)
    const optimalExecutionTime = volume > 1000 ? 'Market Open/Close' : 'Mid-day';
    
    // Execution urgency
    const executionUrgency = contract.daysToExpiration < 7 ? 'HIGH' : 
                           contract.daysToExpiration < 21 ? 'MODERATE' : 'LOW';
    
    // Timing risk
    const timingRisk = contract.daysToExpiration < 7 ? 0.8 : 0.3;
    
    // Market hours preference
    const marketHours = volume > 100;
    
    // Simplified hourly volume profile
    const volumeProfile = [0.1, 0.3, 0.8, 1.0, 0.9, 0.7, 0.5, 0.3]; // 8 hours
    
    return {
      optimalExecutionTime,
      executionUrgency,
      timingRisk,
      marketHours,
      volumeProfile
    };
  }

  /**
   * Calculate advanced liquidity score
   */
  private calculateAdvancedLiquidityScore(
    coreMetrics: CoreLiquidityMetrics,
    microstructure: MicrostructureAnalysis,
    executionCosts: ExecutionCosts,
    liquidityRisk: LiquidityRisk
  ): number {
    // Weighted scoring
    const coreScore = (
      coreMetrics.volumeScore * 0.3 +
      coreMetrics.openInterestScore * 0.4 +
      coreMetrics.spreadScore * 0.3
    );
    
    const microstructureScore = (
      microstructure.bidAskSpreadStability * 0.3 +
      microstructure.orderBookDepth * 0.3 +
      microstructure.liquidityProvision * 0.2 +
      microstructure.marketMakerPresence * 0.2
    );
    
    const costScore = Math.max(0, 1 - executionCosts.executionCostPercentage * 20);
    const riskScore = 1 - liquidityRisk.overallLiquidityRisk;
    
    return (coreScore * 0.4 + microstructureScore * 0.3 + costScore * 0.2 + riskScore * 0.1);
  }

  /**
   * Determine liquidity rating
   */
  private determineLiquidityRating(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY_POOR' {
    if (score >= 0.9) return 'EXCELLENT';
    if (score >= 0.7) return 'GOOD';
    if (score >= 0.5) return 'FAIR';
    if (score >= 0.3) return 'POOR';
    return 'VERY_POOR';
  }

  /**
   * Generate liquidity recommendations
   */
  private generateLiquidityRecommendations(
    coreMetrics: CoreLiquidityMetrics,
    executionCosts: ExecutionCosts,
    liquidityRisk: LiquidityRisk
  ): LiquidityRecommendation[] {
    const recommendations: LiquidityRecommendation[] = [];
    
    if (executionCosts.executionCostPercentage > 0.05) {
      recommendations.push({
        type: 'EXECUTION',
        recommendation: 'Consider using limit orders to reduce execution costs',
        reasoning: 'High execution costs detected',
        impact: 0.7,
        priority: 'HIGH'
      });
    }
    
    if (liquidityRisk.overallLiquidityRisk > 0.6) {
      recommendations.push({
        type: 'SIZE',
        recommendation: 'Reduce position size to minimize market impact',
        reasoning: 'High liquidity risk detected',
        impact: 0.8,
        priority: 'HIGH'
      });
    }
    
    if (coreMetrics.volumeScore < 0.5) {
      recommendations.push({
        type: 'TIMING',
        recommendation: 'Execute during high-volume periods',
        reasoning: 'Low volume may impact execution quality',
        impact: 0.6,
        priority: 'MEDIUM'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate ranking factors for recommendation ranking
   */
  private calculateRankingFactors(recommendation: OptionsRecommendation): RankingFactors {
    return {
      liquidityFactor: recommendation.liquidity.liquidityScore,
      riskRewardFactor: Math.min(1, recommendation.riskReward.riskRewardRatio / 4),
      confidenceFactor: recommendation.confidence,
      greeksFactor: 0.7, // Simplified
      fibonacciFactor: recommendation.fibonacciAlignment.alignmentScore,
      diversificationFactor: 0.6 // Simplified
    };
  }

  /**
   * Determine ranking tier
   */
  private determineRankingTier(
    compositeScore: number,
    rankingFactors: RankingFactors
  ): 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' {
    if (compositeScore >= 0.8) return 'TIER_1';
    if (compositeScore >= 0.65) return 'TIER_2';
    if (compositeScore >= 0.5) return 'TIER_3';
    return 'TIER_4';
  }

  /**
   * Generate ranking reasoning
   */
  private generateRankingReasoning(
    recommendation: OptionsRecommendation,
    rankingFactors: RankingFactors,
    rankingTier: string
  ): string[] {
    const reasoning: string[] = [];
    
    if (rankingFactors.liquidityFactor > 0.8) {
      reasoning.push('Excellent liquidity supports easy execution');
    }
    
    if (rankingFactors.riskRewardFactor > 0.7) {
      reasoning.push('Strong risk/reward ratio enhances attractiveness');
    }
    
    if (rankingFactors.confidenceFactor > 0.8) {
      reasoning.push('High confidence level supports recommendation');
    }
    
    if (rankingFactors.fibonacciFactor > 0.7) {
      reasoning.push('Strong Fibonacci alignment provides technical support');
    }
    
    reasoning.push(`Ranked as ${rankingTier} based on comprehensive analysis`);
    
    return reasoning;
  }

  /**
   * Calculate enhanced risk/reward metrics with Greeks impact
   */
  private calculateEnhancedRiskReward(
    contract: OptionContract,
    expectedMove: number,
    underlyingPrice: number
  ): RiskReward {
    const currentPrice = contract.midPrice;
    const strike = contract.strike;
    const isCall = contract.type === 'CALL';
    const dte = contract.daysToExpiration;
    
    // Calculate maximum risk (premium paid)
    const maxRisk = currentPrice;
    
    // Calculate breakeven
    const breakeven = isCall ? strike + currentPrice : strike - currentPrice;
    
    // Calculate potential reward and profit probability
    let maxReward = 0;
    let profitProbability = 0;
    
    if (isCall) {
      const targetPrice = underlyingPrice * (1 + expectedMove);
      maxReward = Math.max(0, targetPrice - strike - currentPrice);
      profitProbability = this.calculateAdvancedProfitProbability(
        underlyingPrice, strike, expectedMove, contract.impliedVolatility, dte, true
      );
    } else {
      const targetPrice = underlyingPrice * (1 - expectedMove);
      maxReward = Math.max(0, strike - targetPrice - currentPrice);
      profitProbability = this.calculateAdvancedProfitProbability(
        underlyingPrice, strike, expectedMove, contract.impliedVolatility, dte, false
      );
    }
    
    // Calculate risk/reward ratio
    const riskRewardRatio = maxRisk > 0 ? maxReward / maxRisk : 0;
    
    // Calculate probability-adjusted return
    const probabilityAdjustedReturn = maxReward * profitProbability;
    
    // Calculate time decay impact
    const timeDecayImpact = Math.abs(contract.greeks.theta) * dte;
    
    // Calculate volatility impact
    const volatilityImpact = contract.greeks.vega * contract.impliedVolatility;
    
    return {
      maxRisk,
      maxReward,
      breakeven,
      profitProbability,
      riskRewardRatio,
      probabilityAdjustedReturn,
      timeDecayImpact,
      volatilityImpact
    };
  }

  /**
   * Assess comprehensive liquidity with detailed metrics
   */
  private assessComprehensiveLiquidity(contract: OptionContract): LiquidityMetrics {
    const bidAskSpread = contract.ask - contract.bid;
    const spreadPercentage = bidAskSpread / contract.midPrice;
    
    // Calculate average daily volume (simplified)
    const averageDailyVolume = contract.volume * 0.8; // Estimate
    const volumeRatio = contract.volume / (averageDailyVolume || 1);
    
    // Calculate comprehensive liquidity score
    let liquidityScore = 0;
    
    // Volume component (35%)
    const volumeScore = Math.min(1, contract.volume / this.LIQUIDITY_THRESHOLDS.PREFERRED_VOLUME);
    liquidityScore += volumeScore * 0.35;
    
    // Open interest component (35%)
    const oiScore = Math.min(1, contract.openInterest / this.LIQUIDITY_THRESHOLDS.PREFERRED_OPEN_INTEREST);
    liquidityScore += oiScore * 0.35;
    
    // Spread component (30%)
    const spreadScore = Math.max(0, 1 - (spreadPercentage / this.LIQUIDITY_THRESHOLDS.MAX_SPREAD_PERCENT));
    liquidityScore += spreadScore * 0.30;
    
    // Determine liquidity rating
    let liquidityRating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (liquidityScore >= 0.8) liquidityRating = 'EXCELLENT';
    else if (liquidityScore >= 0.6) liquidityRating = 'GOOD';
    else if (liquidityScore >= 0.4) liquidityRating = 'FAIR';
    else liquidityRating = 'POOR';
    
    return {
      bidAskSpread,
      spreadPercentage,
      volume: contract.volume,
      openInterest: contract.openInterest,
      liquidityScore,
      liquidityRating,
      averageDailyVolume,
      volumeRatio
    };
  }

  /**
   * Analyze Fibonacci alignment for strike selection
   */
  private analyzeFibonacciAlignment(
    strike: number,
    underlyingPrice: number,
    fibAnalysis: FibonacciAnalysis
  ): FibonacciAlignment {
    // Find nearest Fibonacci level
    let nearestFibLevel = underlyingPrice;
    let minDistance = Infinity;
    let fibLevelType = 'NONE';
    
    for (const level of fibAnalysis.keyLevels) {
      const distance = Math.abs(strike - level.level);
      if (distance < minDistance) {
        minDistance = distance;
        nearestFibLevel = level.level;
        fibLevelType = level.type;
      }
    }
    
    const distanceToFibLevel = Math.abs(strike - nearestFibLevel) / underlyingPrice;
    
    // Calculate alignment score (closer to Fib level = higher score)
    const alignmentScore = Math.max(0, 1 - (distanceToFibLevel * 20)); // Normalize
    
    // Find support/resistance level
    const supportResistanceLevel = fibAnalysis.keyLevels.find(level => 
      Math.abs(level.level - strike) / underlyingPrice < 0.02
    )?.level || null;
    
    return {
      nearestFibLevel,
      distanceToFibLevel,
      fibLevelType,
      alignmentScore,
      supportResistanceLevel
    };
  }

  /**
   * Calculate recommendation confidence based on multiple factors
   */
  private calculateRecommendationConfidence(
    contract: OptionContract,
    expectedMove: number,
    fibAnalysis: FibonacciAnalysis,
    liquidity: LiquidityMetrics,
    direction: 'BULLISH' | 'BEARISH'
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Fibonacci zone adjustment
    confidence *= fibAnalysis.zoneMultiplier;
    
    // Liquidity adjustment
    confidence *= (0.7 + liquidity.liquidityScore * 0.3);
    
    // Delta adjustment (closer to 0.5 delta = higher confidence)
    const deltaDistance = Math.abs(Math.abs(contract.greeks.delta) - 0.5);
    const deltaAdjustment = 1 - (deltaDistance * 0.5);
    confidence *= deltaAdjustment;
    
    // Time to expiration adjustment
    const dteAdjustment = contract.daysToExpiration > 7 ? 1.0 : 0.8;
    confidence *= dteAdjustment;
    
    // Expected move reasonableness
    const moveAdjustment = expectedMove > 0.15 ? 0.8 : 1.0; // Penalize very large moves
    confidence *= moveAdjustment;
    
    // Clamp to reasonable range
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Determine trading strategy based on contract and market conditions
   */
  private determineStrategy(
    contract: OptionContract,
    direction: 'BULLISH' | 'BEARISH',
    expectedMove: number,
    confidence: number
  ): string {
    const isCall = contract.type === 'CALL';
    const dte = contract.daysToExpiration;
    
    if (confidence > 0.8) {
      if (dte < 14) {
        return isCall ? 'Short-term bullish momentum play' : 'Short-term bearish momentum play';
      } else {
        return isCall ? 'High-confidence bullish swing trade' : 'High-confidence bearish swing trade';
      }
    } else if (confidence > 0.6) {
      return isCall ? 'Moderate bullish directional play' : 'Moderate bearish directional play';
    } else {
      return isCall ? 'Speculative bullish trade' : 'Speculative bearish trade';
    }
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateReasoning(
    contract: OptionContract,
    riskReward: RiskReward,
    liquidity: LiquidityMetrics,
    fibAlignment: FibonacciAlignment,
    direction: 'BULLISH' | 'BEARISH'
  ): string[] {
    const reasons: string[] = [];
    
    // Delta reasoning
    const deltaAbs = Math.abs(contract.greeks.delta);
    if (deltaAbs > 0.6) {
      reasons.push('High delta provides good directional exposure');
    } else if (deltaAbs > 0.4) {
      reasons.push('Moderate delta offers balanced risk/reward');
    }
    
    // Risk/reward reasoning
    if (riskReward.riskRewardRatio > 3) {
      reasons.push('Excellent risk/reward ratio above 3:1');
    } else if (riskReward.riskRewardRatio > 2) {
      reasons.push('Good risk/reward ratio above 2:1');
    }
    
    // Probability reasoning
    if (riskReward.profitProbability > 0.6) {
      reasons.push('High probability of profit based on expected move');
    } else if (riskReward.profitProbability > 0.4) {
      reasons.push('Moderate probability of profit');
    }
    
    // Liquidity reasoning
    if (liquidity.liquidityRating === 'EXCELLENT') {
      reasons.push('Excellent liquidity with tight spreads');
    } else if (liquidity.liquidityRating === 'GOOD') {
      reasons.push('Good liquidity for easy entry/exit');
    }
    
    // Fibonacci reasoning
    if (fibAlignment.alignmentScore > 0.7) {
      reasons.push('Strong alignment with Fibonacci support/resistance levels');
    }
    
    // Time decay reasoning
    if (contract.daysToExpiration < 14) {
      reasons.push('Short time frame requires quick move');
    } else if (contract.daysToExpiration > 30) {
      reasons.push('Longer timeframe allows for trend development');
    }
    
    return reasons;
  }

  /**
   * Calculate advanced profit probability using multiple factors
   */
  private calculateAdvancedProfitProbability(
    underlyingPrice: number,
    strike: number,
    expectedMove: number,
    impliedVol: number,
    dte: number,
    isCall: boolean
  ): number {
    // Calculate moneyness
    const moneyness = strike / underlyingPrice;
    
    // Calculate required move to breakeven
    const requiredMove = isCall ? 
      (strike - underlyingPrice) / underlyingPrice : 
      (underlyingPrice - strike) / underlyingPrice;
    
    // Base probability from expected move
    let probability = 0.5;
    
    if (Math.abs(requiredMove) <= expectedMove) {
      probability = 0.7 - (Math.abs(requiredMove) / expectedMove) * 0.3;
    } else {
      probability = 0.4 * (expectedMove / Math.abs(requiredMove));
    }
    
    // Adjust for time decay
    const timeAdjustment = Math.max(0.5, 1 - (30 - dte) / 60);
    probability *= timeAdjustment;
    
    // Adjust for volatility
    const volAdjustment = Math.min(1.2, 0.8 + impliedVol);
    probability *= volAdjustment;
    
    return Math.max(0.05, Math.min(0.95, probability));
  }

  /**
   * Calculate position size based on confidence and risk/reward
   */
  private calculatePositionSize(confidence: number, riskRewardRatio: number): number {
    let baseSize = confidence * 0.5; // Start with confidence-based sizing
    
    // Adjust for risk/reward ratio
    if (riskRewardRatio > 3) {
      baseSize *= 1.5;
    } else if (riskRewardRatio > 2) {
      baseSize *= 1.2;
    } else if (riskRewardRatio < 1.5) {
      baseSize *= 0.7;
    }
    
    // Clamp to reasonable range (1-10% of portfolio)
    return Math.max(0.01, Math.min(0.10, baseSize));
  }

  /**
   * Calculate target price for profit taking
   */
  private calculateTargetPrice(
    contract: OptionContract,
    expectedMove: number,
    direction: 'BULLISH' | 'BEARISH'
  ): number {
    const currentPrice = contract.midPrice;
    
    // Target 50-75% of maximum theoretical profit
    const targetMultiplier = 0.6 + (contract.greeks.delta * 0.2);
    
    return currentPrice * (1 + targetMultiplier);
  }

  /**
   * Calculate stop loss level
   */
  private calculateStopLoss(contract: OptionContract, maxRisk: number): number {
    // Stop loss at 50% of premium for most trades
    return contract.midPrice * 0.5;
  }

  /**
   * Determine timeframe for the trade
   */
  private determineTimeframe(dte: number, expectedMove: number): string {
    if (dte <= 7) {
      return 'Short-term (1-7 days)';
    } else if (dte <= 21) {
      return 'Medium-term (1-3 weeks)';
    } else {
      return 'Long-term (3+ weeks)';
    }
  }

  /**
   * Rank recommendations by comprehensive scoring
   */
  private rankRecommendations(recommendations: OptionsRecommendation[]): OptionsRecommendation[] {
    return recommendations.sort((a, b) => {
      const scoreA = this.calculateComprehensiveScore(a);
      const scoreB = this.calculateComprehensiveScore(b);
      return scoreB - scoreA;
    });
  }

  /**
   * Analyze risk/reward across all recommendations
   */
  private analyzeRiskReward(recommendations: OptionsRecommendation[]): RiskRewardAnalysis {
    if (recommendations.length === 0) {
      return {
        averageRiskReward: 0,
        bestRiskReward: 0,
        worstRiskReward: 0,
        averageProfitProbability: 0,
        totalRisk: 0,
        totalReward: 0,
        diversificationScore: 0
      };
    }
    
    const riskRewardRatios = recommendations.map(rec => rec.riskReward.riskRewardRatio);
    const profitProbabilities = recommendations.map(rec => rec.riskReward.profitProbability);
    
    const averageRiskReward = riskRewardRatios.reduce((sum, ratio) => sum + ratio, 0) / riskRewardRatios.length;
    const bestRiskReward = Math.max(...riskRewardRatios);
    const worstRiskReward = Math.min(...riskRewardRatios);
    const averageProfitProbability = profitProbabilities.reduce((sum, prob) => sum + prob, 0) / profitProbabilities.length;
    
    const totalRisk = recommendations.reduce((sum, rec) => sum + rec.maxRisk, 0);
    const totalReward = recommendations.reduce((sum, rec) => sum + rec.maxReward, 0);
    
    // Calculate diversification score based on strategy variety
    const strategies = new Set(recommendations.map(rec => rec.strategy));
    const diversificationScore = Math.min(1, strategies.size / 3); // Normalize to max 3 strategies
    
    return {
      averageRiskReward,
      bestRiskReward,
      worstRiskReward,
      averageProfitProbability,
      totalRisk,
      totalReward,
      diversificationScore
    };
  }

  /**
   * Analyze liquidity across all recommendations
   */
  private analyzeLiquidity(recommendations: OptionsRecommendation[]): LiquidityAnalysis {
    if (recommendations.length === 0) {
      return {
        averageLiquidity: 0,
        liquidityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
        overallLiquidityRating: 'POOR',
        liquidityRisks: []
      };
    }
    
    const liquidityScores = recommendations.map(rec => rec.liquidity.liquidityScore);
    const averageLiquidity = liquidityScores.reduce((sum, score) => sum + score, 0) / liquidityScores.length;
    
    // Calculate distribution
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    recommendations.forEach(rec => {
      switch (rec.liquidity.liquidityRating) {
        case 'EXCELLENT': distribution.excellent++; break;
        case 'GOOD': distribution.good++; break;
        case 'FAIR': distribution.fair++; break;
        case 'POOR': distribution.poor++; break;
      }
    });
    
    // Determine overall rating
    let overallLiquidityRating: string;
    if (averageLiquidity >= 0.8) overallLiquidityRating = 'EXCELLENT';
    else if (averageLiquidity >= 0.6) overallLiquidityRating = 'GOOD';
    else if (averageLiquidity >= 0.4) overallLiquidityRating = 'FAIR';
    else overallLiquidityRating = 'POOR';
    
    // Identify liquidity risks
    const liquidityRisks: string[] = [];
    if (distribution.poor > 0) {
      liquidityRisks.push('Some recommendations have poor liquidity');
    }
    if (averageLiquidity < 0.5) {
      liquidityRisks.push('Overall liquidity below acceptable levels');
    }
    
    return {
      averageLiquidity,
      liquidityDistribution: distribution,
      overallLiquidityRating,
      liquidityRisks
    };
  }

  /**
   * Analyze confidence metrics across recommendations
   */
  private analyzeConfidence(recommendations: OptionsRecommendation[]): ConfidenceMetrics {
    if (recommendations.length === 0) {
      return {
        averageConfidence: 0,
        confidenceRange: { min: 0, max: 0 },
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        confidenceFactors: []
      };
    }
    
    const confidences = recommendations.map(rec => rec.confidence);
    const averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const minConfidence = Math.min(...confidences);
    const maxConfidence = Math.max(...confidences);
    
    // Count by confidence levels
    let highConfidenceCount = 0;
    let mediumConfidenceCount = 0;
    let lowConfidenceCount = 0;
    
    recommendations.forEach(rec => {
      if (rec.confidence >= 0.8) highConfidenceCount++;
      else if (rec.confidence >= 0.6) mediumConfidenceCount++;
      else lowConfidenceCount++;
    });
    
    // Identify confidence factors
    const confidenceFactors: string[] = [];
    if (averageConfidence > 0.7) {
      confidenceFactors.push('Strong overall confidence in recommendations');
    }
    if (highConfidenceCount > 0) {
      confidenceFactors.push(`${highConfidenceCount} high-confidence opportunities identified`);
    }
    
    return {
      averageConfidence,
      confidenceRange: { min: minConfidence, max: maxConfidence },
      highConfidenceCount,
      mediumConfidenceCount,
      lowConfidenceCount,
      confidenceFactors
    };
  }

  /**
   * Generate trading implications based on analysis
   */
  private generateTradingImplications(
    topRecommendations: OptionsRecommendation[],
    marketAnalysis: MarketAnalysis,
    confidence: number
  ): TradingImplications {
    // Determine recommended strategy
    let recommendedStrategy: string;
    if (confidence > 0.8 && marketAnalysis.trendStrength > 0.7) {
      recommendedStrategy = 'Aggressive directional trading';
    } else if (confidence > 0.6) {
      recommendedStrategy = 'Moderate directional trading';
    } else {
      recommendedStrategy = 'Conservative speculation';
    }
    
    // Position sizing guidance
    let positionSizing: string;
    if (confidence > 0.8) {
      positionSizing = 'Standard to large positions (3-8% per trade)';
    } else if (confidence > 0.6) {
      positionSizing = 'Moderate positions (2-5% per trade)';
    } else {
      positionSizing = 'Small positions (1-3% per trade)';
    }
    
    // Entry timing
    const entryTiming = marketAnalysis.volatilityEnvironment === 'LOW_VOLATILITY' ?
      'Consider entering before volatility expansion' :
      'Wait for pullbacks in high volatility environment';
    
    // Exit strategy
    const exitStrategy = 'Scale out at 50% and 75% profit targets, trail stops on remainder';
    
    // Risk management
    const riskManagement = [
      'Never risk more than 2% of portfolio on single trade',
      'Set stop losses at 50% of premium paid',
      'Monitor time decay acceleration in final week',
      'Adjust position sizes based on volatility environment'
    ];
    
    // Market risks
    const marketRisks = [
      `${marketAnalysis.volatilityEnvironment} volatility environment`,
      'Time decay acceleration near expiration',
      'Potential volatility crush after events',
      'Liquidity risks in less active contracts'
    ];
    
    // Calculate opportunity score
    const avgConfidence = topRecommendations.reduce((sum, rec) => sum + rec.confidence, 0) / topRecommendations.length;
    const avgRiskReward = topRecommendations.reduce((sum, rec) => sum + rec.riskReward.riskRewardRatio, 0) / topRecommendations.length;
    const opportunityScore = (avgConfidence + Math.min(1, avgRiskReward / 3)) / 2;
    
    return {
      recommendedStrategy,
      positionSizing,
      entryTiming,
      exitStrategy,
      riskManagement,
      marketRisks,
      opportunityScore
    };
  }

  /**
   * Get default recommendation result for error cases
   */
  private getDefaultRecommendationResult(ticker: string): OptionsRecommendationResult {
    return {
      ticker,
      timestamp: new Date(),
      currentPrice: 100,
      marketAnalysis: {
        volatilityEnvironment: 'NORMAL_VOLATILITY',
        trendDirection: 'NEUTRAL',
        trendStrength: 0,
        expectedMove: 0,
        timeDecayEnvironment: 'MODERATE_THETA_DECAY',
        liquidityConditions: 'MODERATE_LIQUIDITY',
        optionsFlow: 'NEUTRAL_FLOW'
      },
      topRecommendations: [],
      allRecommendations: [],
      riskRewardAnalysis: {
        averageRiskReward: 0,
        bestRiskReward: 0,
        worstRiskReward: 0,
        averageProfitProbability: 0,
        totalRisk: 0,
        totalReward: 0,
        diversificationScore: 0
      },
      liquidityAnalysis: {
        averageLiquidity: 0,
        liquidityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
        overallLiquidityRating: 'POOR',
        liquidityRisks: []
      },
      confidenceMetrics: {
        averageConfidence: 0,
        confidenceRange: { min: 0, max: 0 },
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        confidenceFactors: []
      },
      tradingImplications: {
        recommendedStrategy: 'No recommendations available',
        positionSizing: 'N/A',
        entryTiming: 'N/A',
        exitStrategy: 'N/A',
        riskManagement: [],
        marketRisks: [],
        opportunityScore: 0
      }
    };
  }

  /**
   * Calculate overall recommendation score (legacy method for compatibility)
   */
  private calculateRecommendationScore(recommendation: OptionsRecommendation): number {
    return this.calculateComprehensiveScore(recommendation);
  }

  /**
   * Calculate contract score for selection
   */
  private calculateContractScore(contract: OptionContract, expectedMove: number, underlyingPrice: number): number {
    const liquidity = this.assessComprehensiveLiquidity(contract);
    const riskReward = this.calculateEnhancedRiskReward(contract, expectedMove, underlyingPrice);
    
    // Combine factors with enhanced weighting
    const liquidityScore = liquidity.liquidityScore * 0.3;
    const riskRewardScore = Math.min(1, riskReward.riskRewardRatio / 3) * 0.4; // Normalize RR ratio
    const probabilityScore = riskReward.profitProbability * 0.3;
    
    return liquidityScore + riskRewardScore + probabilityScore;
  }

  /**
   * Calculate profit probability (simplified)
   */
  private calculateProfitProbability(strike: number, expectedMove: number, isCall: boolean): number {
    // Simplified probability calculation
    // In reality, this would use more sophisticated models (Black-Scholes, Monte Carlo, etc.)
    
    const moveRequired = isCall ? expectedMove : expectedMove;
    
    if (moveRequired <= 0.02) return 0.8; // 2% move - high probability
    if (moveRequired <= 0.05) return 0.6; // 5% move - medium probability
    if (moveRequired <= 0.10) return 0.4; // 10% move - lower probability
    return 0.2; // >10% move - low probability
  }

  /**
   * Get confidence level category
   */
  private getConfidenceLevel(confidence: number): 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' {
    if (confidence >= 0.8) return 'HIGH_CONFIDENCE';
    if (confidence >= 0.6) return 'MEDIUM_CONFIDENCE';
    return 'LOW_CONFIDENCE';
  }

  /**
   * Group contracts by expiration
   */
  private groupByExpiration(contracts: OptionContract[]): Map<string, OptionContract[]> {
    const grouped = new Map<string, OptionContract[]>();
    
    for (const contract of contracts) {
      const expKey = contract.expiration.toISOString().split('T')[0];
      if (!grouped.has(expKey)) {
        grouped.set(expKey, []);
      }
      grouped.get(expKey)!.push(contract);
    }
    
    return grouped;
  }

  /**
   * Calculate days to expiration
   */
  private calculateDTE(expiration: Date): number {
    const now = new Date();
    return Math.floor((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate mock expirations for testing
   */
  private generateMockExpirations(): Date[] {
    const expirations: Date[] = [];
    const now = new Date();
    
    // Generate weekly expirations for next 8 weeks
    for (let i = 1; i <= 8; i++) {
      const expiration = new Date(now);
      expiration.setDate(now.getDate() + (i * 7));
      expirations.push(expiration);
    }
    
    return expirations;
  }

  /**
   * Generate mock option contracts for testing
   */
  private generateMockContracts(type: 'CALL' | 'PUT', underlyingPrice: number): OptionContract[] {
    const contracts: OptionContract[] = [];
    const expirations = this.generateMockExpirations();
    
    // Generate strikes around current price
    for (let i = -10; i <= 10; i++) {
      const strike = underlyingPrice + (i * 5);
      
      for (const expiration of expirations) {
        const dte = this.calculateDTE(expiration);
        const isITM = type === 'CALL' ? strike < underlyingPrice : strike > underlyingPrice;
        
        // Mock Greeks calculation (simplified)
        const delta = type === 'CALL' ? 
          (isITM ? 0.6 + Math.random() * 0.3 : 0.1 + Math.random() * 0.4) :
          (isITM ? -0.6 - Math.random() * 0.3 : -0.1 - Math.random() * 0.4);
        
        const gamma = Math.random() * 0.1;
        const theta = -Math.random() * 0.05;
        const vega = Math.random() * 0.2;
        
        const midPrice = isITM ? 
          Math.max(1, Math.abs(strike - underlyingPrice) + Math.random() * 5) :
          Math.random() * 3 + 0.5;
        
        contracts.push({
          symbol: `${type === 'CALL' ? 'C' : 'P'}_${strike}_${expiration.toISOString().split('T')[0]}`,
          strike,
          expiration,
          type,
          bid: midPrice * 0.95,
          ask: midPrice * 1.05,
          midPrice,
          volume: Math.floor(Math.random() * 500),
          openInterest: Math.floor(Math.random() * 2000),
          impliedVolatility: 0.2 + Math.random() * 0.3,
          greeks: {
            delta,
            gamma,
            theta,
            vega,
            rho: Math.random() * 0.01,
            impliedVolatility: 0.2 + Math.random() * 0.3
          },
          daysToExpiration: dte
        });
      }
    }
    
    return contracts;
  }
}

// Supporting interfaces
interface OptionContract {
  symbol: string;
  strike: number;
  expiration: Date;
  type: 'CALL' | 'PUT';
  bid: number;
  ask: number;
  midPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  greeks: OptionsGreeks;
  daysToExpiration: number;
}

interface OptionsChain {
  ticker: string;
  underlyingPrice: number;
  expirations: Date[];
  calls: OptionContract[];
  puts: OptionContract[];
  timestamp: Date;
}

interface RiskReward {
  maxRisk: number;
  maxReward: number;
  breakeven: number;
  profitProbability: number;
}

interface LiquidityMetrics {
  bidAskSpread: number;
  volume: number;
  openInterest: number;
  liquidityScore: number;
}
 
 // ============================================================================
  // HELPER METHODS FOR TASK 5.3 IMPLEMENTATION
  // ============================================================================

  /**
   * Get mock options chain for testing (to be replaced with real data source)
   */
  private async getOptionsChain(ticker: string): Promise<OptionsChain> {
    // Mock implementation - replace with actual data source
    const underlyingPrice = 450; // Mock SPY price
    const expirations = [
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // 7 days
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),  // 14 days
      new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),  // 21 days
      new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)   // 45 days
    ];

    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];

    // Generate mock options contracts
    for (const expiration of expirations) {
      const dte = Math.ceil((expiration.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      
      // Generate strikes around current price
      for (let i = -5; i <= 5; i++) {
        const strike = underlyingPrice + (i * 5);
        
        // Mock call option
        const callDelta = this.calculateMockDelta(underlyingPrice, strike, dte, 'CALL');
        calls.push({
          symbol: `${ticker}${expiration.toISOString().slice(0, 10).replace(/-/g, '')}C${strike}`,
          strike,
          expiration,
          type: 'CALL',
          bid: Math.max(0.01, callDelta * underlyingPrice * 0.1 - 0.05),
          ask: Math.max(0.02, callDelta * underlyingPrice * 0.1 + 0.05),
          midPrice: Math.max(0.015, callDelta * underlyingPrice * 0.1),
          volume: Math.floor(Math.random() * 500) + 50,
          openInterest: Math.floor(Math.random() * 2000) + 100,
          impliedVolatility: 0.15 + Math.random() * 0.2,
          daysToExpiration: dte,
          greeks: {
            delta: callDelta,
            gamma: 0.01 + Math.random() * 0.02,
            theta: -0.01 - Math.random() * 0.05,
            vega: 0.1 + Math.random() * 0.2,
            rho: 0.01 + Math.random() * 0.02,
            impliedVolatility: 0.15 + Math.random() * 0.2
          }
        });

        // Mock put option
        const putDelta = this.calculateMockDelta(underlyingPrice, strike, dte, 'PUT');
        puts.push({
          symbol: `${ticker}${expiration.toISOString().slice(0, 10).replace(/-/g, '')}P${strike}`,
          strike,
          expiration,
          type: 'PUT',
          bid: Math.max(0.01, Math.abs(putDelta) * underlyingPrice * 0.1 - 0.05),
          ask: Math.max(0.02, Math.abs(putDelta) * underlyingPrice * 0.1 + 0.05),
          midPrice: Math.max(0.015, Math.abs(putDelta) * underlyingPrice * 0.1),
          volume: Math.floor(Math.random() * 500) + 50,
          openInterest: Math.floor(Math.random() * 2000) + 100,
          impliedVolatility: 0.15 + Math.random() * 0.2,
          daysToExpiration: dte,
          greeks: {
            delta: putDelta,
            gamma: 0.01 + Math.random() * 0.02,
            theta: -0.01 - Math.random() * 0.05,
            vega: 0.1 + Math.random() * 0.2,
            rho: -0.01 - Math.random() * 0.02,
            impliedVolatility: 0.15 + Math.random() * 0.2
          }
        });
      }
    }

    return {
      ticker,
      underlyingPrice,
      calls,
      puts,
      expirations,
      timestamp: new Date()
    };
  }

  /**
   * Calculate mock delta for testing
   */
  private calculateMockDelta(underlyingPrice: number, strike: number, dte: number, type: 'CALL' | 'PUT'): number {
    const moneyness = underlyingPrice / strike;
    const timeValue = Math.sqrt(dte / 365);
    
    if (type === 'CALL') {
      if (moneyness > 1.1) return 0.8 - (Math.random() * 0.1);
      if (moneyness > 1.05) return 0.6 + (Math.random() * 0.2);
      if (moneyness > 0.95) return 0.4 + (Math.random() * 0.2);
      if (moneyness > 0.9) return 0.2 + (Math.random() * 0.2);
      return 0.05 + (Math.random() * 0.15);
    } else {
      if (moneyness < 0.9) return -0.8 + (Math.random() * 0.1);
      if (moneyness < 0.95) return -0.6 - (Math.random() * 0.2);
      if (moneyness < 1.05) return -0.4 - (Math.random() * 0.2);
      if (moneyness < 1.1) return -0.2 - (Math.random() * 0.2);
      return -0.05 - (Math.random() * 0.15);
    }
  }

  /**
   * Filter options by liquidity thresholds
   */
  private filterByLiquidity(optionsChain: OptionsChain): { calls: OptionContract[]; puts: OptionContract[] } {
    const filterContract = (contract: OptionContract): boolean => {
      const spreadPercentage = (contract.ask - contract.bid) / contract.midPrice;
      return (
        contract.volume >= this.LIQUIDITY_THRESHOLDS.MIN_VOLUME &&
        contract.openInterest >= this.LIQUIDITY_THRESHOLDS.MIN_OPEN_INTEREST &&
        spreadPercentage <= this.LIQUIDITY_THRESHOLDS.MAX_SPREAD_PERCENT
      );
    };

    return {
      calls: optionsChain.calls.filter(filterContract),
      puts: optionsChain.puts.filter(filterContract)
    };
  }

  /**
   * Find optimal call options based on criteria
   */
  private async findOptimalCalls(
    calls: OptionContract[],
    deltaTarget: { min: number; max: number },
    dtePreference: { min: number; max: number; preferred: number },
    expectedMove: number,
    fibAnalysis: FibonacciAnalysis,
    underlyingPrice: number
  ): Promise<OptionsRecommendation[]> {
    const recommendations: OptionsRecommendation[] = [];

    for (const call of calls) {
      // Check if delta is in target range
      if (call.greeks.delta < deltaTarget.min || call.greeks.delta > deltaTarget.max) {
        continue;
      }

      // Check if DTE is in preferred range
      if (call.daysToExpiration < dtePreference.min || call.daysToExpiration > dtePreference.max) {
        continue;
      }

      // Calculate comprehensive metrics
      const riskReward = this.calculateRiskReward(call, expectedMove, underlyingPrice);
      const liquidity = this.assessLiquidity(call);
      const fibAlignment = this.calculateFibonacciAlignment(call.strike, underlyingPrice, fibAnalysis);

      // Calculate confidence based on multiple factors
      const confidence = this.calculateOptionConfidence(call, expectedMove, fibAnalysis);

      const recommendation: OptionsRecommendation = {
        symbol: call.symbol,
        strike: call.strike,
        expiration: call.expiration,
        type: 'CALL',
        confidence,
        expectedMove,
        strategy: 'LONG_CALL',
        reasoning: this.generateRecommendationReasoning(call, 'CALL', confidence),
        greeks: call.greeks,
        riskReward,
        liquidity,
        fibonacciAlignment: fibAlignment,
        entryPrice: call.midPrice,
        targetPrice: call.midPrice * 2, // Simplified target
        stopLoss: call.midPrice * 0.5, // Simplified stop
        positionSize: 1,
        timeframe: this.determineTimeframe(call.daysToExpiration),
        breakeven: call.strike + call.midPrice,
        maxRisk: call.midPrice,
        maxReward: Math.max(0, underlyingPrice * (1 + expectedMove) - call.strike - call.midPrice),
        profitProbability: riskReward.profitProbability,
        daysToExpiration: call.daysToExpiration
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Find optimal put options based on criteria
   */
  private async findOptimalPuts(
    puts: OptionContract[],
    deltaTarget: { min: number; max: number },
    dtePreference: { min: number; max: number; preferred: number },
    expectedMove: number,
    fibAnalysis: FibonacciAnalysis,
    underlyingPrice: number
  ): Promise<OptionsRecommendation[]> {
    const recommendations: OptionsRecommendation[] = [];

    for (const put of puts) {
      // Check if delta is in target range (absolute value for puts)
      if (Math.abs(put.greeks.delta) < deltaTarget.min || Math.abs(put.greeks.delta) > deltaTarget.max) {
        continue;
      }

      // Check if DTE is in preferred range
      if (put.daysToExpiration < dtePreference.min || put.daysToExpiration > dtePreference.max) {
        continue;
      }

      // Calculate comprehensive metrics
      const riskReward = this.calculateRiskReward(put, -expectedMove, underlyingPrice); // Negative move for puts
      const liquidity = this.assessLiquidity(put);
      const fibAlignment = this.calculateFibonacciAlignment(put.strike, underlyingPrice, fibAnalysis);

      // Calculate confidence based on multiple factors
      const confidence = this.calculateOptionConfidence(put, -expectedMove, fibAnalysis);

      const recommendation: OptionsRecommendation = {
        symbol: put.symbol,
        strike: put.strike,
        expiration: put.expiration,
        type: 'PUT',
        confidence,
        expectedMove: -expectedMove, // Negative for puts
        strategy: 'LONG_PUT',
        reasoning: this.generateRecommendationReasoning(put, 'PUT', confidence),
        greeks: put.greeks,
        riskReward,
        liquidity,
        fibonacciAlignment: fibAlignment,
        entryPrice: put.midPrice,
        targetPrice: put.midPrice * 2, // Simplified target
        stopLoss: put.midPrice * 0.5, // Simplified stop
        positionSize: 1,
        timeframe: this.determineTimeframe(put.daysToExpiration),
        breakeven: put.strike - put.midPrice,
        maxRisk: put.midPrice,
        maxReward: Math.max(0, put.strike - underlyingPrice * (1 + expectedMove) - put.midPrice),
        profitProbability: riskReward.profitProbability,
        daysToExpiration: put.daysToExpiration
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Calculate Fibonacci alignment for strike price
   */
  private calculateFibonacciAlignment(
    strike: number,
    underlyingPrice: number,
    fibAnalysis: FibonacciAnalysis
  ): FibonacciAlignment {
    // Find nearest Fibonacci level
    let nearestLevel = underlyingPrice;
    let minDistance = Infinity;

    if (fibAnalysis.keyLevels) {
      for (const level of fibAnalysis.keyLevels) {
        const distance = Math.abs(strike - level.level);
        if (distance < minDistance) {
          minDistance = distance;
          nearestLevel = level.level;
        }
      }
    }

    const distanceToFibLevel = Math.abs(strike - nearestLevel);
    const alignmentScore = Math.max(0, 1 - (distanceToFibLevel / underlyingPrice) / 0.05); // 5% distance = 0 score

    return {
      nearestFibLevel: nearestLevel,
      distanceToFibLevel,
      fibLevelType: strike > nearestLevel ? 'RESISTANCE' : 'SUPPORT',
      alignmentScore,
      supportResistanceLevel: nearestLevel
    };
  }

  /**
   * Calculate option confidence based on multiple factors
   */
  private calculateOptionConfidence(
    contract: OptionContract,
    expectedMove: number,
    fibAnalysis: FibonacciAnalysis
  ): number {
    // Delta efficiency (how well delta matches expected move)
    const deltaEfficiency = Math.min(1, Math.abs(contract.greeks.delta) / 0.7);
    
    // Liquidity factor
    const liquidityFactor = Math.min(1, contract.volume / 200);
    
    // Time decay factor (prefer moderate time to expiration)
    const dteFactor = contract.daysToExpiration >= 14 && contract.daysToExpiration <= 30 ? 1 : 0.7;
    
    // Fibonacci zone factor
    const fibFactor = fibAnalysis.currentZone === 'EXHAUSTION' ? 0.3 : 
                     fibAnalysis.currentZone === 'OVER_EXTENSION' ? 0.5 : 0.8;
    
    // Weighted confidence
    return (deltaEfficiency * 0.3 + liquidityFactor * 0.3 + dteFactor * 0.2 + fibFactor * 0.2);
  }

  /**
   * Generate recommendation reasoning
   */
  private generateRecommendationReasoning(
    contract: OptionContract,
    type: 'CALL' | 'PUT',
    confidence: number
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(`${type} option with ${Math.abs(contract.greeks.delta).toFixed(2)} delta`);
    reasoning.push(`${contract.daysToExpiration} days to expiration`);
    
    if (confidence > 0.7) {
      reasoning.push('High confidence based on technical alignment');
    } else if (confidence > 0.5) {
      reasoning.push('Moderate confidence with acceptable risk profile');
    } else {
      reasoning.push('Lower confidence requiring careful position sizing');
    }
    
    if (contract.volume > 200) {
      reasoning.push('Excellent liquidity for easy execution');
    } else if (contract.volume > 100) {
      reasoning.push('Good liquidity suitable for most trades');
    } else {
      reasoning.push('Moderate liquidity requiring limit orders');
    }
    
    return reasoning;
  }

  /**
   * Determine timeframe based on days to expiration
   */
  private determineTimeframe(dte: number): string {
    if (dte <= 7) return 'SHORT_TERM';
    if (dte <= 21) return 'MEDIUM_TERM';
    if (dte <= 45) return 'LONG_TERM';
    return 'EXTENDED_TERM';
  }

  /**
   * Rank recommendations by comprehensive scoring
   */
  private rankRecommendations(recommendations: OptionsRecommendation[]): OptionsRecommendation[] {
    return recommendations.sort((a, b) => {
      const scoreA = this.calculateComprehensiveScore(a);
      const scoreB = this.calculateComprehensiveScore(b);
      return scoreB - scoreA;
    });
  }

  /**
   * Get confidence level category
   */
  private getConfidenceLevel(confidence: number): 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' {
    if (confidence >= 0.7) return 'HIGH_CONFIDENCE';
    if (confidence >= 0.5) return 'MEDIUM_CONFIDENCE';
    return 'LOW_CONFIDENCE';
  }

  /**
   * Calculate DTE (Days to Expiration)
   */
  private calculateDTE(expiration: Date): number {
    return Math.ceil((expiration.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  }

  /**
   * Get default recommendation result for error cases
   */
  private getDefaultRecommendationResult(ticker: string): OptionsRecommendationResult {
    return {
      ticker,
      timestamp: new Date(),
      currentPrice: 0,
      marketAnalysis: {
        volatilityEnvironment: 'UNKNOWN',
        trendDirection: 'NEUTRAL',
        trendStrength: 0,
        expectedMove: 0,
        timeDecayEnvironment: 'UNKNOWN',
        liquidityConditions: 'UNKNOWN',
        optionsFlow: 'NEUTRAL_FLOW'
      },
      topRecommendations: [],
      allRecommendations: [],
      riskRewardAnalysis: {
        averageRiskReward: 0,
        bestRiskReward: 0,
        worstRiskReward: 0,
        averageProfitProbability: 0,
        totalRisk: 0,
        totalReward: 0,
        diversificationScore: 0
      },
      liquidityAnalysis: {
        averageLiquidity: 0,
        liquidityDistribution: { excellent: 0, good: 0, fair: 0, poor: 1 },
        overallLiquidityRating: 'POOR',
        liquidityRisks: ['No data available']
      },
      confidenceMetrics: {
        averageConfidence: 0,
        confidenceRange: { min: 0, max: 0 },
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        confidenceFactors: []
      },
      tradingImplications: {
        recommendedStrategy: 'WAIT',
        positionSizing: 'MINIMAL',
        entryTiming: 'DELAYED',
        exitStrategy: 'IMMEDIATE',
        riskManagement: ['Avoid trading due to insufficient data'],
        marketRisks: ['Data unavailable'],
        opportunityScore: 0
      }
    };
  }

  /**
   * Analyze risk/reward across all recommendations
   */
  private analyzeRiskReward(recommendations: OptionsRecommendation[]): RiskRewardAnalysis {
    if (recommendations.length === 0) {
      return {
        averageRiskReward: 0,
        bestRiskReward: 0,
        worstRiskReward: 0,
        averageProfitProbability: 0,
        totalRisk: 0,
        totalReward: 0,
        diversificationScore: 0
      };
    }

    const riskRewards = recommendations.map(rec => rec.riskReward.riskRewardRatio);
    const probabilities = recommendations.map(rec => rec.riskReward.profitProbability);

    return {
      averageRiskReward: riskRewards.reduce((sum, rr) => sum + rr, 0) / riskRewards.length,
      bestRiskReward: Math.max(...riskRewards),
      worstRiskReward: Math.min(...riskRewards),
      averageProfitProbability: probabilities.reduce((sum, prob) => sum + prob, 0) / probabilities.length,
      totalRisk: recommendations.reduce((sum, rec) => sum + rec.maxRisk, 0),
      totalReward: recommendations.reduce((sum, rec) => sum + rec.maxReward, 0),
      diversificationScore: Math.min(1, recommendations.length / 10) // Simple diversification score
    };
  }

  /**
   * Analyze liquidity across all recommendations
   */
  private analyzeLiquidity(recommendations: OptionsRecommendation[]): LiquidityAnalysis {
    if (recommendations.length === 0) {
      return {
        averageLiquidity: 0,
        liquidityDistribution: { excellent: 0, good: 0, fair: 0, poor: 1 },
        overallLiquidityRating: 'POOR',
        liquidityRisks: ['No recommendations available']
      };
    }

    const liquidityScores = recommendations.map(rec => rec.liquidity.liquidityScore);
    const averageLiquidity = liquidityScores.reduce((sum, score) => sum + score, 0) / liquidityScores.length;

    // Calculate distribution
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    recommendations.forEach(rec => {
      const rating = rec.liquidity.liquidityRating;
      if (rating === 'EXCELLENT') distribution.excellent++;
      else if (rating === 'GOOD') distribution.good++;
      else if (rating === 'FAIR') distribution.fair++;
      else distribution.poor++;
    });

    // Normalize distribution
    const total = recommendations.length;
    Object.keys(distribution).forEach(key => {
      distribution[key as keyof typeof distribution] /= total;
    });

    // Determine overall rating
    let overallRating: string;
    if (averageLiquidity >= 0.8) overallRating = 'EXCELLENT';
    else if (averageLiquidity >= 0.6) overallRating = 'GOOD';
    else if (averageLiquidity >= 0.4) overallRating = 'FAIR';
    else overallRating = 'POOR';

    // Identify risks
    const liquidityRisks: string[] = [];
    if (distribution.poor > 0.3) liquidityRisks.push('High proportion of illiquid options');
    if (averageLiquidity < 0.5) liquidityRisks.push('Overall poor liquidity conditions');

    return {
      averageLiquidity,
      liquidityDistribution: distribution,
      overallLiquidityRating: overallRating,
      liquidityRisks
    };
  }

  /**
   * Analyze confidence metrics across recommendations
   */
  private analyzeConfidence(recommendations: OptionsRecommendation[]): ConfidenceMetrics {
    if (recommendations.length === 0) {
      return {
        averageConfidence: 0,
        confidenceRange: { min: 0, max: 0 },
        highConfidenceCount: 0,
        mediumConfidenceCount: 0,
        lowConfidenceCount: 0,
        confidenceFactors: []
      };
    }

    const confidences = recommendations.map(rec => rec.confidence);
    const averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

    let highCount = 0, mediumCount = 0, lowCount = 0;
    confidences.forEach(conf => {
      if (conf >= 0.7) highCount++;
      else if (conf >= 0.5) mediumCount++;
      else lowCount++;
    });

    return {
      averageConfidence,
      confidenceRange: {
        min: Math.min(...confidences),
        max: Math.max(...confidences)
      },
      highConfidenceCount: highCount,
      mediumConfidenceCount: mediumCount,
      lowConfidenceCount: lowCount,
      confidenceFactors: ['Technical alignment', 'Liquidity assessment', 'Greeks efficiency', 'Fibonacci confluence']
    };
  }

  /**
   * Generate trading implications based on analysis
   */
  private generateTradingImplications(
    topRecommendations: OptionsRecommendation[],
    marketAnalysis: MarketAnalysis,
    confidence: number
  ): TradingImplications {
    let recommendedStrategy = 'LONG_OPTIONS';
    let positionSizing = 'MODERATE';
    let entryTiming = 'IMMEDIATE';
    let exitStrategy = 'TARGET_BASED';

    // Adjust based on confidence
    if (confidence < 0.5) {
      positionSizing = 'SMALL';
      entryTiming = 'PATIENT';
    } else if (confidence > 0.7) {
      positionSizing = 'AGGRESSIVE';
    }

    // Adjust based on market conditions
    if (marketAnalysis.volatilityEnvironment === 'HIGH_VOLATILITY') {
      recommendedStrategy = 'VOLATILITY_SELLING';
      positionSizing = 'CONSERVATIVE';
    }

    const riskManagement = [
      'Use stop losses at 50% of premium',
      'Take profits at 100% gain',
      'Monitor time decay closely',
      'Adjust position size based on volatility'
    ];

    const marketRisks = [
      'Volatility expansion risk',
      'Time decay acceleration',
      'Liquidity deterioration',
      'Market regime change'
    ];

    const opportunityScore = Math.min(1, confidence * (topRecommendations.length / 3));

    return {
      recommendedStrategy,
      positionSizing,
      entryTiming,
      exitStrategy,
      riskManagement,
      marketRisks,
      opportunityScore
    };
  }
}