import { EventEmitter } from 'events';

// Core Gamma Exposure Analysis Interfaces
export interface GammaExposureResult {
  ticker: string;
  timestamp: Date;
  currentPrice: number;
  netGammaExposure: number;
  dealerPositioning: DealerPositioning;
  gammaFlipLevel: number | null;
  volatilityEnvironment: VolatilityEnvironment;
  pinningRisk: PinningRisk;
  accelerationZones: AccelerationZone[];
  confidenceAdjustment: number;
  marketMakerFlow: MarketMakerFlow;
  gammaImpact: GammaImpact;
  exposureBreakdown: ExposureBreakdown;
  riskMetrics: GammaRiskMetrics;
}

export interface DealerPositioning {
  netGamma: number;
  gammaPercentile: number; // 0-100, where position stands historically
  positionType: 'LONG_GAMMA' | 'SHORT_GAMMA' | 'NEUTRAL';
  strength: number; // 0-1, strength of positioning
  flowDirection: 'BUYING' | 'SELLING' | 'NEUTRAL';
  concentrationRisk: number; // 0-1, concentration at specific strikes
  hedgingPressure: number; // 0-1, pressure to hedge positions
}

export interface VolatilityEnvironment {
  regime: 'SUPPRESSED' | 'NORMAL' | 'ELEVATED' | 'EXTREME';
  suppressionLevel: number; // 0-1, level of volatility suppression
  expectedVolatility: number;
  realizedVolatility: number;
  volOfVol: number; // Volatility of volatility
  gammaContribution: number; // How much gamma affects vol environment
  breakoutPotential: number; // 0-1, potential for vol breakout
}

export interface PinningRisk {
  level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  primaryPinLevel: number | null;
  secondaryPinLevels: number[];
  pinStrength: number; // 0-1, strength of pinning effect
  timeToExpiry: number; // Days to nearest major expiry
  openInterestConcentration: number; // 0-1, concentration at pin levels
  pinningProbability: number; // 0-1, probability of pinning occurring
}

// Enhanced Pinning Risk Analysis Interfaces
export interface EnhancedPinningAnalysis {
  ticker: string;
  timestamp: Date;
  currentPrice: number;
  pinningRisk: DetailedPinningRisk;
  pinningMechanics: PinningMechanics;
  pinningForces: PinningForces;
  temporalEffects: TemporalPinningEffects;
  pinningScenarios: PinningScenario[];
  breakoutAnalysis: PinBreakoutAnalysis;
  tradingImplications: PinningTradingImplications;
}

export interface DetailedPinningRisk {
  overallRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  primaryPin: PinLevel;
  secondaryPins: PinLevel[];
  pinningStrength: number; // 0-1, overall pinning strength
  pinningPersistence: number; // 0-1, how persistent pinning is
  pinningEfficiency: number; // 0-1, how efficiently pins work
  confidenceScore: number; // 0-1, confidence in pinning analysis
}

export interface PinLevel {
  level: number;
  type: 'CALL_PIN' | 'PUT_PIN' | 'DUAL_PIN' | 'GAMMA_PIN';
  strength: number; // 0-1, strength of this pin
  magnetism: number; // 0-1, magnetic attraction to this level
  openInterest: number;
  volume: number;
  gammaExposure: number;
  deltaHedgingPressure: number;
  distanceFromPrice: number;
  attractionRadius: number; // Price range where pin is effective
}

export interface PinningMechanics {
  deltaHedging: DeltaHedgingEffect;
  gammaHedging: GammaHedgingEffect;
  marketMakerInventory: MarketMakerInventoryEffect;
  flowImbalance: FlowImbalanceEffect;
  timeDecay: TimeDecayEffect;
}

export interface DeltaHedgingEffect {
  strength: number; // 0-1, strength of delta hedging effect
  direction: 'BUYING' | 'SELLING' | 'NEUTRAL';
  volume: number; // Expected hedging volume
  priceImpact: number; // 0-1, price impact of hedging
  persistence: number; // 0-1, how persistent the effect is
}

export interface GammaHedgingEffect {
  strength: number;
  accelerationFactor: number; // How much gamma amplifies moves
  dampingFactor: number; // How much gamma dampens moves
  nonLinearity: number; // 0-1, non-linear effects
  volatilityImpact: number;
}

export interface MarketMakerInventoryEffect {
  inventoryRisk: number; // 0-1, MM inventory risk
  hedgingUrgency: number; // 0-1, urgency to hedge
  liquidityProvision: number; // 0-1, liquidity being provided
  bidAskImpact: number; // Impact on spreads
}

export interface FlowImbalanceEffect {
  buyPressure: number; // 0-1, buying pressure
  sellPressure: number; // 0-1, selling pressure
  netFlow: number; // Net flow (positive = buying)
  flowPersistence: number; // 0-1, persistence of flow
  imbalanceMagnitude: number; // 0-1, magnitude of imbalance
}

export interface TimeDecayEffect {
  thetaImpact: number; // Impact of time decay
  expirationProximity: number; // 0-1, proximity to expiration
  acceleratingDecay: number; // 0-1, accelerating decay effect
  pinStabilization: number; // 0-1, how theta stabilizes pins
}

export interface TemporalPinningEffects {
  timeToExpiry: number; // Days to expiry
  expirationCycle: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  pinningIntensity: number[]; // Intensity over time (daily)
  criticalTimeWindows: CriticalTimeWindow[];
  decayProfile: DecayProfile;
}

export interface CriticalTimeWindow {
  startTime: Date;
  endTime: Date;
  intensity: number; // 0-1, pinning intensity during window
  type: 'EXPIRATION_APPROACH' | 'GAMMA_RAMP' | 'THETA_BURN' | 'ROLLOVER';
  description: string;
}

export interface DecayProfile {
  currentDecayRate: number;
  acceleratingDecay: boolean;
  decayInflectionPoint: Date;
  finalDecayPhase: boolean;
}

export interface PinningScenario {
  scenario: string;
  probability: number; // 0-1, probability of scenario
  priceTarget: number;
  timeframe: string;
  keyFactors: string[];
  riskFactors: string[];
  tradingImplications: string[];
}

export interface PinBreakoutAnalysis {
  breakoutProbability: number; // 0-1, probability of breaking pin
  breakoutDirection: 'UP' | 'DOWN' | 'EITHER';
  breakoutMagnitude: number; // Expected move size on breakout
  breakoutTriggers: string[];
  breakoutLevels: number[];
  sustainabilityScore: number; // 0-1, sustainability of breakout
  falseBreakoutRisk: number; // 0-1, risk of false breakout
}

export interface PinningTradingImplications {
  strategy: string;
  entryLevels: number[];
  exitLevels: number[];
  stopLevels: number[];
  positionSizing: string;
  timeframe: string;
  riskFactors: string[];
  opportunityScore: number; // 0-1, overall opportunity score
}

// Enhanced Acceleration Zone Analysis Interfaces
export interface EnhancedAccelerationAnalysis {
  ticker: string;
  timestamp: Date;
  currentPrice: number;
  accelerationZones: DetailedAccelerationZone[];
  zoneInteractions: ZoneInteraction[];
  accelerationMechanics: AccelerationMechanics;
  triggerAnalysis: TriggerAnalysis;
  momentumProfile: MomentumProfile;
  tradingImplications: AccelerationTradingImplications;
}

export interface DetailedAccelerationZone {
  level: number;
  type: 'GAMMA_SQUEEZE_UP' | 'GAMMA_SQUEEZE_DOWN' | 'DEALER_HEDGE' | 'FLOW_ACCELERATION' | 'VOLATILITY_BREAKOUT';
  strength: number; // 0-1, strength of acceleration potential
  triggerDistance: number; // Distance from current price to trigger
  expectedMove: number; // Expected move size if triggered
  probability: number; // 0-1, probability of zone activation
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM';
  volumeRequirement: number; // Volume needed to trigger
  gammaContribution: number; // 0-1, gamma's contribution to acceleration
  flowContribution: number; // 0-1, flow's contribution to acceleration
  volatilityContribution: number; // 0-1, volatility's contribution
  sustainabilityScore: number; // 0-1, sustainability of acceleration
  reverseZoneRisk: number; // 0-1, risk of reverse acceleration
}

export interface ZoneInteraction {
  zone1: number;
  zone2: number;
  interactionType: 'REINFORCING' | 'COMPETING' | 'SEQUENTIAL' | 'CANCELING';
  combinedStrength: number; // 0-1, combined strength if both triggered
  sequenceOrder: number; // Order of activation
  timeGap: number; // Expected time between activations
}

export interface AccelerationMechanics {
  gammaRamp: GammaRampEffect;
  flowAmplification: FlowAmplificationEffect;
  volatilityFeedback: VolatilityFeedbackEffect;
  liquidityDrain: LiquidityDrainEffect;
  momentumBuilding: MomentumBuildingEffect;
}

export interface GammaRampEffect {
  rampStrength: number; // 0-1, strength of gamma ramp
  rampSpeed: number; // 0-1, speed of gamma acceleration
  nonLinearEffects: number; // 0-1, non-linear acceleration effects
  dampingFactors: string[]; // Factors that could dampen acceleration
  amplifyingFactors: string[]; // Factors that amplify acceleration
}

export interface FlowAmplificationEffect {
  flowMomentum: number; // 0-1, current flow momentum
  amplificationFactor: number; // How much flow amplifies moves
  flowPersistence: number; // 0-1, persistence of flow
  institutionalFlow: number; // 0-1, institutional flow component
  retailFlow: number; // 0-1, retail flow component
}

export interface VolatilityFeedbackEffect {
  feedbackStrength: number; // 0-1, strength of vol feedback loop
  volExpansionRate: number; // Rate of volatility expansion
  feedbackLag: number; // Lag in feedback effect (hours)
  breakoutPotential: number; // 0-1, potential for vol breakout
  suppressionBreakdown: number; // 0-1, breakdown of vol suppression
}

export interface LiquidityDrainEffect {
  drainRate: number; // 0-1, rate of liquidity drain
  liquidityDepth: number; // Current liquidity depth
  bidAskWidening: number; // Expected bid-ask widening
  marketImpact: number; // 0-1, market impact of trades
  recoveryTime: number; // Expected liquidity recovery time
}

export interface MomentumBuildingEffect {
  momentumStrength: number; // 0-1, current momentum strength
  buildingRate: number; // Rate of momentum building
  persistenceScore: number; // 0-1, momentum persistence
  reversalRisk: number; // 0-1, risk of momentum reversal
  accelerationPhase: 'BUILDING' | 'ACCELERATING' | 'PEAK' | 'DECAYING';
}

export interface TriggerAnalysis {
  primaryTriggers: TriggerEvent[];
  secondaryTriggers: TriggerEvent[];
  triggerCombinations: TriggerCombination[];
  triggerProbabilities: TriggerProbability[];
}

export interface TriggerEvent {
  event: string;
  type: 'PRICE' | 'VOLUME' | 'TIME' | 'VOLATILITY' | 'FLOW' | 'EXTERNAL';
  threshold: number;
  currentValue: number;
  proximity: number; // 0-1, how close to triggering
  impact: number; // 0-1, impact if triggered
  reliability: number; // 0-1, reliability of trigger
}

export interface TriggerCombination {
  triggers: string[];
  combinedProbability: number; // 0-1, probability of combination
  combinedImpact: number; // 0-1, impact of combination
  sequenceRequired: boolean; // Whether triggers must occur in sequence
  timeWindow: number; // Time window for combination (hours)
}

export interface TriggerProbability {
  trigger: string;
  shortTermProbability: number; // 0-1, probability in next 24 hours
  mediumTermProbability: number; // 0-1, probability in next week
  longTermProbability: number; // 0-1, probability in next month
}

export interface MomentumProfile {
  currentMomentum: number; // -1 to 1, current momentum
  momentumDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  momentumStrength: number; // 0-1, strength of momentum
  momentumQuality: 'HIGH' | 'MEDIUM' | 'LOW'; // Quality of momentum
  momentumSustainability: number; // 0-1, sustainability score
  momentumCatalysts: string[]; // Factors supporting momentum
  momentumRisks: string[]; // Risks to momentum
}

export interface AccelerationTradingImplications {
  primaryStrategy: string;
  alternativeStrategies: string[];
  entryTriggers: string[];
  exitTriggers: string[];
  stopLossLevels: number[];
  profitTargets: number[];
  positionSizing: string;
  timeframe: string;
  riskManagement: string[];
  opportunityRanking: number; // 1-10, ranking of opportunity
}

// Gamma Confidence Adjustment Interface
export interface GammaConfidenceAdjustment {
  overallAdjustment: number; // -0.5 to 0.5, overall confidence adjustment
  components: {
    gammaPositioning: number;
    volatilityEnvironment: number;
    pinningRisk: number;
    accelerationPotential: number;
    temporalFactors: number;
  };
  confidenceLevel: 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
  reasoning: string[];
}

export interface AccelerationZone {
  level: number;
  type: 'GAMMA_SQUEEZE_UP' | 'GAMMA_SQUEEZE_DOWN' | 'DEALER_HEDGE';
  strength: number; // 0-1, strength of acceleration potential
  triggerDistance: number; // Distance from current price to trigger
  expectedMove: number; // Expected move size if triggered
  probability: number; // 0-1, probability of zone activation
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM';
  volumeRequirement: number; // Volume needed to trigger
}

export interface MarketMakerFlow {
  netFlow: number; // Net MM flow (positive = buying, negative = selling)
  flowIntensity: number; // 0-1, intensity of current flow
  flowPersistence: number; // 0-1, how persistent the flow has been
  hedgingActivity: number; // 0-1, level of hedging activity
  inventoryRisk: number; // 0-1, MM inventory risk level
  bidAskImpact: number; // Impact on bid-ask spreads
  liquidityProvision: number; // 0-1, level of liquidity being provided
}

export interface GammaImpact {
  priceImpact: number; // Expected price impact from gamma
  volatilityImpact: number; // Impact on realized volatility
  liquidityImpact: number; // Impact on market liquidity
  momentumAmplification: number; // 0-1, how much gamma amplifies moves
  reversalRisk: number; // 0-1, risk of gamma-driven reversals
  trendPersistence: number; // 0-1, how gamma affects trend persistence
}

export interface ExposureBreakdown {
  callGamma: number;
  putGamma: number;
  netGamma: number;
  gammaByStrike: GammaByStrike[];
  gammaByExpiry: GammaByExpiry[];
  institutionalGamma: number;
  retailGamma: number;
  hedgeFundGamma: number;
}

export interface GammaByStrike {
  strike: number;
  gamma: number;
  openInterest: number;
  volume: number;
  impliedVolatility: number;
  distanceFromSpot: number;
}

export interface GammaByExpiry {
  expiry: Date;
  daysToExpiry: number;
  gamma: number;
  openInterest: number;
  volume: number;
  weight: number; // Weight in overall gamma calculation
}

export interface GammaRiskMetrics {
  gammaRisk: number; // 0-1, overall gamma risk level
  concentrationRisk: number; // 0-1, concentration risk
  liquidityRisk: number; // 0-1, liquidity risk from gamma
  volatilityRisk: number; // 0-1, volatility risk
  systemicRisk: number; // 0-1, systemic risk from gamma positioning
  hedgingRisk: number; // 0-1, risk from forced hedging
}

// Supporting interfaces
export interface OptionsChainData {
  calls: OptionContract[];
  puts: OptionContract[];
  underlyingPrice: number;
  timestamp: Date;
}

export interface OptionContract {
  strike: number;
  expiry: Date;
  bid: number;
  ask: number;
  last: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface PriceBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Gamma Flip Analysis Interfaces
export interface GammaFlipAnalysis {
  ticker: string;
  timestamp: Date;
  currentPrice: number;
  primaryFlipLevel: GammaFlipLevel | null;
  secondaryFlipLevels: GammaFlipLevel[];
  criticalLevels: CriticalGammaLevel[];
  flipSensitivity: FlipSensitivity;
  flipProbability: FlipProbability;
  flipImpact: FlipImpact;
  timeDecayImpact: TimeDecayImpact;
  expirationEffects: ExpirationEffects;
  hedgingImplications: HedgingImplications;
  liquidityImpact: FlipLiquidityImpact;
  tradingImplications: FlipTradingImplications;
}

export interface GammaFlipLevel {
  level: number;
  confidence: number; // 0-1, confidence in flip level accuracy
  gammaChange: number; // Magnitude of gamma change at flip
  proximity: number; // Distance from current price (0-1)
  significance: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM';
  triggerVolume: number; // Volume needed to reach flip level
}

export interface CriticalGammaLevel {
  level: number;
  type: 'ZERO_GAMMA' | 'MAX_GAMMA' | 'MIN_GAMMA' | 'INFLECTION_POINT';
  strength: number; // 0-1, strength of the level
  marketImpact: number; // 0-1, expected market impact
  hedgingPressure: number; // 0-1, hedging pressure at this level
}

export interface FlipSensitivity {
  priceMoveSensitivity: number; // How sensitive flip is to price moves
  timeSensitivity: number; // How sensitive flip is to time decay
  volatilitySensitivity: number; // How sensitive flip is to vol changes
  overallSensitivity: number; // Combined sensitivity score
  stabilityScore: number; // How stable the flip level is
}

export interface FlipProbability {
  reachProbability: number; // Probability of reaching flip level
  crossProbability: number; // Probability of crossing flip level
  sustainProbability: number; // Probability of sustaining beyond flip
  timeframe: string; // Expected timeframe to reach flip
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface FlipImpact {
  priceImpact: number; // Expected price impact from flip
  volatilityImpact: number; // Expected volatility impact
  liquidityImpact: number; // Expected liquidity impact
  momentumChange: number; // Expected change in momentum
  trendReversal: number; // Probability of trend reversal
  accelerationPotential: number; // Potential for price acceleration
}

export interface TimeDecayImpact {
  dailyFlipMovement: number; // Daily movement of flip level due to theta
  weeklyFlipMovement: number; // Weekly movement of flip level
  expirationImpact: number; // Impact of approaching expiration
  thetaInfluence: number; // Overall theta influence on flip
}

export interface ExpirationEffects {
  nearestExpiry: Date;
  daysToExpiry: number;
  expirationImpact: number; // 0-1, impact of expiration on flip
  pinningRisk: number; // 0-1, risk of pinning at expiration
  rolloverEffects: number; // 0-1, effects of position rollover
}

export interface HedgingImplications {
  dealerHedgingPressure: number; // 0-1, pressure on dealers to hedge
  hedgingDirection: 'BUY' | 'SELL' | 'NEUTRAL';
  hedgingVolume: number; // Expected hedging volume
  hedgingTimeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'GRADUAL';
  marketImpact: number; // 0-1, market impact of hedging
}

export interface FlipLiquidityImpact {
  bidAskImpact: number; // Impact on bid-ask spreads
  marketDepth: number; // Impact on market depth
  liquidityRisk: number; // 0-1, liquidity risk around flip
  tradingCost: number; // Expected increase in trading costs
}

export interface FlipTradingImplications {
  entryStrategy: string;
  exitStrategy: string;
  riskManagement: string[];
  positionSizing: string;
  timeframe: string;
  keyLevels: number[];
}

// Volatility Suppression Analysis Interfaces
export interface VolatilitySuppressionAnalysis {
  ticker: string;
  timestamp: Date;
  currentPrice: number;
  suppressionMetrics: SuppressionMetrics;
  volatilityRegime: VolatilityRegime;
  breakoutAnalysis: BreakoutAnalysis;
  gammaVolRelationship: GammaVolRelationship;
  volatilityForecast: VolatilityForecast;
  regimeTransition: RegimeTransition;
  microstructureEffects: MicrostructureEffects;
  dealerBehavior: DealerVolatilityBehavior;
  tradingImplications: VolSuppressionTradingImplications;
}

export interface SuppressionMetrics {
  suppressionLevel: number; // 0-1, overall suppression level
  suppressionStrength: number; // 0-1, strength of suppression
  suppressionPersistence: number; // 0-1, how persistent suppression is
  realizedVsImplied: number; // Ratio of realized to implied vol
  volGap: number; // Gap between expected and realized vol
  gammaContribution: number; // 0-1, gamma's contribution to suppression
  timeDecayEffect: number; // 0-1, time decay's effect on suppression
}

export interface VolatilityRegime {
  currentRegime: 'SUPPRESSED' | 'NORMAL' | 'ELEVATED' | 'EXTREME' | 'TRANSITIONAL';
  regimeStrength: number; // 0-1, strength of current regime
  regimeStability: number; // 0-1, stability of current regime
  historicalPercentile: number; // 0-100, where current vol stands historically
  regimeDuration: number; // Days in current regime
}

export interface BreakoutAnalysis {
  breakoutProbability: number; // 0-1, probability of vol breakout
  breakoutMagnitude: number; // Expected magnitude of breakout
  breakoutTimeframe: string; // Expected timeframe for breakout
  breakoutTriggers: string[]; // Potential breakout triggers
  breakoutLevels: number[]; // Price levels that could trigger breakout
  sustainabilityScore: number; // 0-1, sustainability of potential breakout
}

export interface GammaVolRelationship {
  correlation: number; // -1 to 1, correlation between gamma and vol
  elasticity: number; // Elasticity of vol to gamma changes
  lagEffect: number; // Days of lag in gamma-vol relationship
  strengthOfRelationship: number; // 0-1, strength of relationship
  nonLinearEffects: number; // 0-1, presence of non-linear effects
}

export interface VolatilityForecast {
  shortTerm: VolForecastPeriod; // 1-5 days
  mediumTerm: VolForecastPeriod; // 1-4 weeks
  longTerm: VolForecastPeriod; // 1-3 months
}

export interface VolForecastPeriod {
  expectedVol: number;
  volRange: {
    lower: number;
    upper: number;
  };
  confidence: number; // 0-1, confidence in forecast
  keyDrivers: string[];
}

export interface RegimeTransition {
  transitionProbability: number; // 0-1, probability of regime change
  mostLikelyRegime: string; // Most likely next regime
  transitionTimeframe: string; // Expected timeframe for transition
  transitionTriggers: string[]; // Potential transition triggers
}

export interface MicrostructureEffects {
  bidAskSuppression: number; // 0-1, suppression of bid-ask spreads
  orderFlowImpact: number; // 0-1, impact on order flow
  marketMakingEfficiency: number; // 0-1, efficiency of market making
  liquidityProvision: number; // 0-1, level of liquidity provision
}

export interface DealerVolatilityBehavior {
  hedgingFrequency: number; // 0-1, frequency of hedging
  hedgingSize: number; // 0-1, size of hedging trades
  inventoryManagement: number; // 0-1, efficiency of inventory management
  riskTolerance: number; // 0-1, current risk tolerance
}

export interface VolSuppressionTradingImplications {
  strategy: string;
  entryConditions: string[];
  exitConditions: string[];
  riskFactors: string[];
  opportunitySize: number; // 0-1, size of opportunity
}

// Gamma Volatility Forecast Interfaces
export interface GammaVolatilityForecast {
  ticker: string;
  timestamp: Date;
  currentPrice: number;
  shortTermForecast: GammaVolForecastPeriod;
  mediumTermForecast: GammaVolForecastPeriod;
  longTermForecast: GammaVolForecastPeriod;
  scenarioAnalysis: VolatilityScenario[];
  stressTests: VolatilityStressTest[];
  forecastConfidence: ForecastConfidence;
  forecastRisks: ForecastRisk[];
  tradingImplications: VolForecastTradingImplications;
}

export interface GammaVolForecastPeriod {
  timeframe: string;
  baseCase: VolatilityProjection;
  bullCase: VolatilityProjection;
  bearCase: VolatilityProjection;
  gammaInfluence: number; // 0-1, influence of gamma on forecast
  keyRisks: string[];
}

export interface VolatilityProjection {
  expectedVol: number;
  volRange: {
    lower: number;
    upper: number;
  };
  probability: number; // 0-1, probability of this scenario
  keyDrivers: string[];
}

export interface VolatilityScenario {
  name: string;
  description: string;
  probability: number; // 0-1, probability of scenario
  volImpact: number; // Expected vol impact
  priceImpact: number; // Expected price impact
  timeframe: string;
  triggers: string[];
}

export interface VolatilityStressTest {
  scenario: string;
  stressLevel: 'MILD' | 'MODERATE' | 'SEVERE' | 'EXTREME';
  volImpact: number;
  gammaImpact: number;
  liquidityImpact: number;
  recoveryTime: string;
}

export interface ForecastConfidence {
  overallConfidence: number; // 0-1, overall forecast confidence
  shortTermConfidence: number;
  mediumTermConfidence: number;
  longTermConfidence: number;
  confidenceFactors: string[];
  uncertaintyFactors: string[];
}

export interface ForecastRisk {
  riskType: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  probability: number; // 0-1, probability of risk materializing
  impact: number; // 0-1, impact if risk materializes
  mitigation: string[];
}

export interface VolForecastTradingImplications {
  recommendedStrategy: string;
  entryTiming: string;
  positionSizing: string;
  hedgingRecommendations: string[];
  riskManagement: string[];
  profitTargets: number[];
}

/**
 * Gamma Exposure Engine - Comprehensive gamma exposure analysis with dealer positioning
 * 
 * This engine analyzes options market structure to understand gamma exposure levels,
 * dealer positioning, and the impact on underlying price movement. It identifies
 * gamma flip levels, volatility suppression, and acceleration zones.
 */
export class GammaExposureEngine extends EventEmitter {
  private readonly GAMMA_PERCENTILE_LOOKBACK = 252; // 1 year of trading days
  private readonly VOLATILITY_LOOKBACK = 30; // 30 days for volatility calculation
  private readonly FLOW_ANALYSIS_PERIODS = 20; // Periods for flow analysis
  
  constructor() {
    super();
  }

  /**
   * Advanced gamma flip identification with critical price level analysis
   * Identifies exact price levels where dealer gamma positioning changes sign
   */
  public async identifyGammaFlip(ticker: string, timeframe: string = '1D'): Promise<GammaFlipAnalysis> {
    try {
      const optionsData = await this.getOptionsChainData(ticker);
      const priceData = await this.getPriceData(ticker, timeframe, 100);
      const currentPrice = priceData[priceData.length - 1].close;
      
      // Enhanced gamma flip analysis with multiple methodologies
      const flipLevels = this.calculateMultipleGammaFlips(optionsData, currentPrice);
      const criticalLevels = this.identifyCriticalGammaLevels(optionsData, currentPrice);
      const flipSensitivity = this.calculateFlipSensitivity(optionsData, currentPrice);
      const flipProbability = this.calculateFlipProbability(flipLevels, priceData);
      const flipImpact = this.assessFlipImpact(flipLevels, optionsData, currentPrice);
      
      // Time-based flip analysis
      const timeDecayImpact = this.calculateTimeDecayOnFlip(optionsData, flipLevels);
      const expirationEffects = this.analyzeExpirationEffects(optionsData, flipLevels);
      
      // Market structure implications
      const hedgingImplications = this.analyzeHedgingImplications(flipLevels, optionsData);
      const liquidityImpact = this.assessFlipLiquidityImpact(flipLevels, optionsData);
      
      const result: GammaFlipAnalysis = {
        ticker,
        timestamp: new Date(),
        currentPrice,
        primaryFlipLevel: flipLevels.primary,
        secondaryFlipLevels: flipLevels.secondary,
        criticalLevels,
        flipSensitivity,
        flipProbability,
        flipImpact,
        timeDecayImpact,
        expirationEffects,
        hedgingImplications,
        liquidityImpact,
        tradingImplications: this.generateFlipTradingImplications(flipLevels, flipImpact, currentPrice)
      };

      this.emit('gammaFlip:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error analyzing gamma flip for ${ticker}:`, error);
      return this.getDefaultGammaFlipResult(ticker);
    }
  }

  /**
   * Advanced volatility suppression assessment and environment classification
   * Analyzes how gamma positioning affects volatility dynamics
   */
  public async assessVolSuppression(ticker: string, timeframe: string = '1D'): Promise<VolatilitySuppressionAnalysis> {
    try {
      const optionsData = await this.getOptionsChainData(ticker);
      const priceData = await this.getPriceData(ticker, timeframe, 100);
      const currentPrice = priceData[priceData.length - 1].close;
      
      // Multi-dimensional volatility analysis
      const suppressionMetrics = this.calculateSuppressionMetrics(optionsData, priceData, currentPrice);
      const volRegime = this.classifyVolatilityRegime(suppressionMetrics, priceData);
      const breakoutAnalysis = this.analyzeBreakoutPotential(suppressionMetrics, optionsData, priceData);
      const gammaVolRelationship = this.analyzeGammaVolRelationship(optionsData, priceData);
      
      // Forecasting components
      const volForecast = this.generateVolatilityForecast(suppressionMetrics, breakoutAnalysis, priceData);
      const regimeTransition = this.analyzeRegimeTransitionProbability(volRegime, suppressionMetrics);
      
      // Market microstructure effects
      const microstructureEffects = this.analyzeMicrostructureEffects(suppressionMetrics, optionsData);
      const dealerBehavior = this.analyzeDealerVolatilityBehavior(optionsData, suppressionMetrics);
      
      const result: VolatilitySuppressionAnalysis = {
        ticker,
        timestamp: new Date(),
        currentPrice,
        suppressionMetrics,
        volatilityRegime: volRegime,
        breakoutAnalysis,
        gammaVolRelationship,
        volatilityForecast: volForecast,
        regimeTransition,
        microstructureEffects,
        dealerBehavior,
        tradingImplications: this.generateVolSuppressionTradingImplications(suppressionMetrics, breakoutAnalysis)
      };

      this.emit('volSuppression:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error analyzing volatility suppression for ${ticker}:`, error);
      return this.getDefaultVolSuppressionResult(ticker);
    }
  }

  /**
   * Comprehensive gamma-based volatility forecasting and regime detection
   * Predicts future volatility based on current gamma positioning and market structure
   */
  public async generateGammaVolForecast(ticker: string, timeframe: string = '1D'): Promise<GammaVolatilityForecast> {
    try {
      const optionsData = await this.getOptionsChainData(ticker);
      const priceData = await this.getPriceData(ticker, timeframe, 100);
      const currentPrice = priceData[priceData.length - 1].close;
      
      // Multi-horizon forecasting
      const shortTermForecast = this.generateShortTermVolForecast(optionsData, priceData, currentPrice);
      const mediumTermForecast = this.generateMediumTermVolForecast(optionsData, priceData, currentPrice);
      const longTermForecast = this.generateLongTermVolForecast(optionsData, priceData, currentPrice);
      
      // Scenario analysis
      const scenarioAnalysis = this.generateVolatilityScenarios(optionsData, priceData, currentPrice);
      const stressTests = this.performVolatilityStressTests(optionsData, priceData, currentPrice);
      
      // Confidence and risk assessment
      const forecastConfidence = this.calculateForecastConfidence(shortTermForecast, mediumTermForecast, optionsData);
      const forecastRisks = this.identifyForecastRisks(optionsData, priceData, scenarioAnalysis);
      
      const result: GammaVolatilityForecast = {
        ticker,
        timestamp: new Date(),
        currentPrice,
        shortTermForecast,
        mediumTermForecast,
        longTermForecast,
        scenarioAnalysis,
        stressTests,
        forecastConfidence,
        forecastRisks,
        tradingImplications: this.generateVolForecastTradingImplications(shortTermForecast, scenarioAnalysis)
      };

      this.emit('gammaVolForecast:generated', result);
      return result;

    } catch (error) {
      console.error(`Error generating gamma volatility forecast for ${ticker}:`, error);
      return this.getDefaultGammaVolForecastResult(ticker);
    }
  }

  /**
   * Enhanced pinning risk analysis with strike-based price attraction analysis
   * Provides comprehensive analysis of pinning mechanics and temporal effects
   */
  public async calculatePinningRisk(ticker: string, timeframe: string = '1D'): Promise<EnhancedPinningAnalysis> {
    try {
      const optionsData = await this.getOptionsChainData(ticker);
      const priceData = await this.getPriceData(ticker, timeframe, 100);
      const currentPrice = priceData[priceData.length - 1].close;
      
      // Enhanced pinning risk calculation
      const pinningRisk = this.calculateDetailedPinningRisk(optionsData, currentPrice);
      
      // Analyze pinning mechanics
      const pinningMechanics = this.analyzePinningMechanics(optionsData, priceData, currentPrice);
      
      // Calculate pinning forces
      const pinningForces = this.calculatePinningForces(optionsData, priceData, pinningRisk);
      
      // Analyze temporal effects
      const temporalEffects = this.analyzeTemporalPinningEffects(optionsData, pinningRisk);
      
      // Generate pinning scenarios
      const pinningScenarios = this.generatePinningScenarios(pinningRisk, pinningMechanics, temporalEffects);
      
      // Analyze breakout potential
      const breakoutAnalysis = this.analyzePinBreakoutPotential(pinningRisk, pinningMechanics, priceData);
      
      // Generate trading implications
      const tradingImplications = this.generatePinningTradingImplications(
        pinningRisk, 
        breakoutAnalysis, 
        temporalEffects
      );

      const result: EnhancedPinningAnalysis = {
        ticker,
        timestamp: new Date(),
        currentPrice,
        pinningRisk,
        pinningMechanics,
        pinningForces,
        temporalEffects,
        pinningScenarios,
        breakoutAnalysis,
        tradingImplications
      };

      this.emit('pinningRisk:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error calculating pinning risk for ${ticker}:`, error);
      return this.getDefaultPinningAnalysisResult(ticker);
    }
  }

  /**
   * Enhanced acceleration zone identification for gamma-driven price moves
   * Identifies and analyzes zones where price acceleration is likely to occur
   */
  public async identifyAccelerationZones(ticker: string, timeframe: string = '1D'): Promise<EnhancedAccelerationAnalysis> {
    try {
      const optionsData = await this.getOptionsChainData(ticker);
      const priceData = await this.getPriceData(ticker, timeframe, 100);
      const currentPrice = priceData[priceData.length - 1].close;
      
      // Identify detailed acceleration zones
      const accelerationZones = this.calculateDetailedAccelerationZones(optionsData, currentPrice, priceData);
      
      // Analyze zone interactions
      const zoneInteractions = this.analyzeZoneInteractions(accelerationZones);
      
      // Analyze acceleration mechanics
      const accelerationMechanics = this.analyzeAccelerationMechanics(optionsData, priceData, accelerationZones);
      
      // Perform trigger analysis
      const triggerAnalysis = this.performTriggerAnalysis(accelerationZones, priceData, optionsData);
      
      // Calculate momentum profile
      const momentumProfile = this.calculateMomentumProfile(priceData, accelerationZones);
      
      // Generate trading implications
      const tradingImplications = this.generateAccelerationTradingImplications(
        accelerationZones,
        triggerAnalysis,
        momentumProfile
      );

      const result: EnhancedAccelerationAnalysis = {
        ticker,
        timestamp: new Date(),
        currentPrice,
        accelerationZones,
        zoneInteractions,
        accelerationMechanics,
        triggerAnalysis,
        momentumProfile,
        tradingImplications
      };

      this.emit('accelerationZones:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error identifying acceleration zones for ${ticker}:`, error);
      return this.getDefaultAccelerationAnalysisResult(ticker);
    }
  }

  /**
   * Enhanced confidence adjustment based on gamma exposure positioning
   * Provides sophisticated confidence scoring based on multiple gamma factors
   */
  public calculateGammaConfidenceAdjustment(
    netGamma: number,
    dealerPositioning: DealerPositioning,
    volatilityEnvironment: VolatilityEnvironment,
    pinningRisk: DetailedPinningRisk,
    accelerationZones: DetailedAccelerationZone[]
  ): GammaConfidenceAdjustment {
    // Base confidence adjustment from gamma positioning
    let baseAdjustment = this.calculateBaseGammaAdjustment(netGamma, dealerPositioning);
    
    // Volatility environment adjustment
    const volAdjustment = this.calculateVolatilityConfidenceAdjustment(volatilityEnvironment);
    
    // Pinning risk adjustment
    const pinAdjustment = this.calculatePinningConfidenceAdjustment(pinningRisk);
    
    // Acceleration zone adjustment
    const accelerationAdjustment = this.calculateAccelerationConfidenceAdjustment(accelerationZones);
    
    // Time-based adjustment
    const timeAdjustment = this.calculateTimeBasedAdjustment(pinningRisk.primaryPin);
    
    // Calculate weighted final adjustment
    const finalAdjustment = this.calculateWeightedConfidenceAdjustment({
      base: baseAdjustment,
      volatility: volAdjustment,
      pinning: pinAdjustment,
      acceleration: accelerationAdjustment,
      time: timeAdjustment
    });
    
    return {
      overallAdjustment: finalAdjustment,
      components: {
        gammaPositioning: baseAdjustment,
        volatilityEnvironment: volAdjustment,
        pinningRisk: pinAdjustment,
        accelerationPotential: accelerationAdjustment,
        temporalFactors: timeAdjustment
      },
      confidenceLevel: this.determineConfidenceLevel(finalAdjustment),
      reasoning: this.generateConfidenceReasoning(finalAdjustment, {
        base: baseAdjustment,
        volatility: volAdjustment,
        pinning: pinAdjustment,
        acceleration: accelerationAdjustment,
        time: timeAdjustment
      })
    };
  }

  /**
   * Comprehensive gamma exposure analysis
   * Implements net gamma exposure calculation from options chains with dealer positioning
   */
  public async analyzeExposure(ticker: string, timeframe: string = '1D'): Promise<GammaExposureResult> {
    try {
      // Get comprehensive market data
      const optionsData = await this.getOptionsChainData(ticker);
      const priceData = await this.getPriceData(ticker, timeframe, 100);
      const currentPrice = priceData[priceData.length - 1].close;
      
      // Calculate net gamma exposure
      const netGammaExposure = this.calculateNetGammaExposure(optionsData, currentPrice);
      
      // Analyze dealer positioning
      const dealerPositioning = this.analyzeDealerPositioning(optionsData, priceData, netGammaExposure);
      
      // Identify gamma flip level
      const gammaFlipLevel = this.identifyGammaFlip(optionsData, currentPrice);
      
      // Assess volatility environment
      const volatilityEnvironment = this.assessVolatilityEnvironment(
        priceData, 
        optionsData, 
        netGammaExposure
      );
      
      // Calculate pinning risk
      const pinningRisk = this.calculatePinningRisk(optionsData, currentPrice);
      
      // Identify acceleration zones
      const accelerationZones = this.identifyAccelerationZones(
        optionsData, 
        currentPrice, 
        dealerPositioning
      );
      
      // Analyze market maker flow
      const marketMakerFlow = this.analyzeMarketMakerFlow(optionsData, priceData, dealerPositioning);
      
      // Calculate gamma impact on underlying
      const gammaImpact = this.calculateGammaImpact(
        netGammaExposure, 
        dealerPositioning, 
        volatilityEnvironment
      );
      
      // Create exposure breakdown
      const exposureBreakdown = this.createExposureBreakdown(optionsData, currentPrice);
      
      // Calculate risk metrics
      const riskMetrics = this.calculateGammaRiskMetrics(
        netGammaExposure,
        dealerPositioning,
        volatilityEnvironment,
        pinningRisk
      );
      
      // Calculate confidence adjustment based on gamma exposure
      const confidenceAdjustment = this.calculateConfidenceAdjustment(
        netGammaExposure,
        dealerPositioning,
        volatilityEnvironment,
        gammaImpact
      );

      const result: GammaExposureResult = {
        ticker,
        timestamp: new Date(),
        currentPrice,
        netGammaExposure,
        dealerPositioning,
        gammaFlipLevel,
        volatilityEnvironment,
        pinningRisk,
        accelerationZones,
        confidenceAdjustment,
        marketMakerFlow,
        gammaImpact,
        exposureBreakdown,
        riskMetrics
      };

      this.emit('gamma:analyzed', result);
      return result;

    } catch (error) {
      console.error(`Error analyzing gamma exposure for ${ticker}:`, error);
      return this.getDefaultGammaResult(ticker);
    }
  }

  /**
   * Calculate net gamma exposure from options chain
   */
  private calculateNetGammaExposure(optionsData: OptionsChainData, currentPrice: number): number {
    let totalGamma = 0;
    
    // Calculate call gamma (market makers are typically short calls)
    const callGamma = optionsData.calls.reduce((sum, call) => {
      // Weight by open interest and proximity to current price
      const moneyness = call.strike / currentPrice;
      const proximityWeight = this.calculateProximityWeight(moneyness);
      const oiWeight = Math.log(call.openInterest + 1); // Log scale for OI weighting
      
      // Market makers short calls = negative gamma for dealers
      return sum - (call.gamma * call.openInterest * proximityWeight * oiWeight);
    }, 0);
    
    // Calculate put gamma (market makers are typically long puts)
    const putGamma = optionsData.puts.reduce((sum, put) => {
      const moneyness = put.strike / currentPrice;
      const proximityWeight = this.calculateProximityWeight(moneyness);
      const oiWeight = Math.log(put.openInterest + 1);
      
      // Market makers long puts = positive gamma for dealers
      return sum + (put.gamma * put.openInterest * proximityWeight * oiWeight);
    }, 0);
    
    totalGamma = callGamma + putGamma;
    
    // Normalize by underlying price and shares outstanding (approximation)
    const normalizedGamma = totalGamma / (currentPrice * 1000000); // Normalize to millions
    
    return Number(normalizedGamma.toFixed(6));
  }

  /**
   * Analyze dealer positioning and gamma flow
   */
  private analyzeDealerPositioning(
    optionsData: OptionsChainData, 
    priceData: PriceBar[], 
    netGamma: number
  ): DealerPositioning {
    // Calculate gamma percentile (where current gamma stands historically)
    const gammaPercentile = this.calculateGammaPercentile(netGamma);
    
    // Determine position type
    let positionType: 'LONG_GAMMA' | 'SHORT_GAMMA' | 'NEUTRAL';
    if (netGamma > 0.1) {
      positionType = 'LONG_GAMMA';
    } else if (netGamma < -0.1) {
      positionType = 'SHORT_GAMMA';
    } else {
      positionType = 'NEUTRAL';
    }
    
    // Calculate positioning strength
    const strength = Math.min(1, Math.abs(netGamma) / 0.5); // Normalize to 0-1
    
    // Analyze flow direction from recent volume patterns
    const flowDirection = this.analyzeGammaFlow(optionsData, priceData);
    
    // Calculate concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(optionsData);
    
    // Calculate hedging pressure
    const hedgingPressure = this.calculateHedgingPressure(optionsData, priceData);
    
    return {
      netGamma,
      gammaPercentile,
      positionType,
      strength: Number(strength.toFixed(3)),
      flowDirection,
      concentrationRisk: Number(concentrationRisk.toFixed(3)),
      hedgingPressure: Number(hedgingPressure.toFixed(3))
    };
  }

  /**
   * Identify gamma flip level where dealer gamma changes sign
   */
  private identifyGammaFlip(optionsData: OptionsChainData, currentPrice: number): number | null {
    // Create price levels around current price
    const priceRange = currentPrice * 0.2; // ±20% range
    const priceStep = currentPrice * 0.005; // 0.5% steps
    const priceLevels: number[] = [];
    
    for (let price = currentPrice - priceRange; price <= currentPrice + priceRange; price += priceStep) {
      priceLevels.push(price);
    }
    
    // Calculate gamma at each price level
    const gammaByPrice = priceLevels.map(price => ({
      price,
      gamma: this.calculateNetGammaExposure(optionsData, price)
    }));
    
    // Find where gamma changes sign
    for (let i = 1; i < gammaByPrice.length; i++) {
      const prevGamma = gammaByPrice[i - 1].gamma;
      const currGamma = gammaByPrice[i].gamma;
      
      // Check for sign change
      if ((prevGamma > 0 && currGamma < 0) || (prevGamma < 0 && currGamma > 0)) {
        // Interpolate exact flip level
        const flipLevel = this.interpolateGammaFlip(
          gammaByPrice[i - 1].price,
          gammaByPrice[i].price,
          prevGamma,
          currGamma
        );
        
        return Number(flipLevel.toFixed(2));
      }
    }
    
    return null; // No flip level found in range
  }

  /**
   * Assess volatility suppression and environment
   */
  private assessVolatilityEnvironment(
    priceData: PriceBar[], 
    optionsData: OptionsChainData, 
    netGamma: number
  ): VolatilityEnvironment {
    // Calculate realized volatility
    const realizedVol = this.calculateRealizedVolatility(priceData, this.VOLATILITY_LOOKBACK);
    
    // Calculate expected volatility from options
    const expectedVol = this.calculateExpectedVolatility(optionsData);
    
    // Calculate volatility of volatility
    const volOfVol = this.calculateVolatilityOfVolatility(priceData);
    
    // Determine suppression level based on gamma positioning
    const suppressionLevel = this.calculateSuppressionLevel(netGamma, realizedVol, expectedVol);
    
    // Determine volatility regime
    let regime: 'SUPPRESSED' | 'NORMAL' | 'ELEVATED' | 'EXTREME';
    if (suppressionLevel > 0.7) {
      regime = 'SUPPRESSED';
    } else if (realizedVol > expectedVol * 1.5) {
      regime = 'EXTREME';
    } else if (realizedVol > expectedVol * 1.2) {
      regime = 'ELEVATED';
    } else {
      regime = 'NORMAL';
    }
    
    // Calculate gamma contribution to volatility environment
    const gammaContribution = Math.min(1, Math.abs(netGamma) * 2);
    
    // Calculate breakout potential
    const breakoutPotential = this.calculateBreakoutPotential(
      suppressionLevel, 
      realizedVol, 
      expectedVol, 
      netGamma
    );
    
    return {
      regime,
      suppressionLevel: Number(suppressionLevel.toFixed(3)),
      expectedVolatility: Number(expectedVol.toFixed(4)),
      realizedVolatility: Number(realizedVol.toFixed(4)),
      volOfVol: Number(volOfVol.toFixed(4)),
      gammaContribution: Number(gammaContribution.toFixed(3)),
      breakoutPotential: Number(breakoutPotential.toFixed(3))
    };
  }

  /**
   * Calculate pinning risk assessment
   */
  private calculatePinningRisk(optionsData: OptionsChainData, currentPrice: number): PinningRisk {
    // Find strikes with highest open interest
    const allStrikes = [
      ...optionsData.calls.map(c => ({ strike: c.strike, oi: c.openInterest, type: 'call' })),
      ...optionsData.puts.map(p => ({ strike: p.strike, oi: p.openInterest, type: 'put' }))
    ];
    
    // Group by strike and sum open interest
    const strikeOI = new Map<number, number>();
    allStrikes.forEach(item => {
      const current = strikeOI.get(item.strike) || 0;
      strikeOI.set(item.strike, current + item.oi);
    });
    
    // Sort by open interest
    const sortedStrikes = Array.from(strikeOI.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 strikes
    
    // Find primary pin level (highest OI near current price)
    const nearbyStrikes = sortedStrikes.filter(([strike]) => 
      Math.abs(strike - currentPrice) / currentPrice < 0.05 // Within 5%
    );
    
    const primaryPinLevel = nearbyStrikes.length > 0 ? nearbyStrikes[0][0] : null;
    const secondaryPinLevels = nearbyStrikes.slice(1, 4).map(([strike]) => strike);
    
    // Calculate pin strength
    const totalOI = Array.from(strikeOI.values()).reduce((sum, oi) => sum + oi, 0);
    const maxOI = Math.max(...Array.from(strikeOI.values()));
    const pinStrength = totalOI > 0 ? maxOI / totalOI : 0;
    
    // Calculate time to expiry (nearest major expiry)
    const timeToExpiry = this.calculateTimeToNearestExpiry(optionsData);
    
    // Calculate concentration
    const concentration = this.calculateOIConcentration(strikeOI, currentPrice);
    
    // Calculate pinning probability
    const pinningProbability = this.calculatePinningProbability(
      pinStrength, 
      timeToExpiry, 
      concentration
    );
    
    // Determine risk level
    let level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    if (pinningProbability > 0.8) {
      level = 'EXTREME';
    } else if (pinningProbability > 0.6) {
      level = 'HIGH';
    } else if (pinningProbability > 0.4) {
      level = 'MODERATE';
    } else {
      level = 'LOW';
    }
    
    return {
      level,
      primaryPinLevel,
      secondaryPinLevels,
      pinStrength: Number(pinStrength.toFixed(3)),
      timeToExpiry,
      openInterestConcentration: Number(concentration.toFixed(3)),
      pinningProbability: Number(pinningProbability.toFixed(3))
    };
  }

  /**
   * Identify acceleration zones where gamma can drive rapid price moves
   */
  private identifyAccelerationZones(
    optionsData: OptionsChainData, 
    currentPrice: number, 
    dealerPositioning: DealerPositioning
  ): AccelerationZone[] {
    const zones: AccelerationZone[] = [];
    
    // Analyze call strikes above current price for gamma squeeze up potential
    const upwardStrikes = optionsData.calls
      .filter(call => call.strike > currentPrice && call.strike < currentPrice * 1.2)
      .sort((a, b) => a.strike - b.strike);
    
    for (const call of upwardStrikes) {
      const zone = this.analyzeAccelerationZone(
        call.strike,
        'GAMMA_SQUEEZE_UP',
        call,
        currentPrice,
        dealerPositioning
      );
      
      if (zone.strength > 0.3) { // Only include significant zones
        zones.push(zone);
      }
    }
    
    // Analyze put strikes below current price for gamma squeeze down potential
    const downwardStrikes = optionsData.puts
      .filter(put => put.strike < currentPrice && put.strike > currentPrice * 0.8)
      .sort((a, b) => b.strike - a.strike);
    
    for (const put of downwardStrikes) {
      const zone = this.analyzeAccelerationZone(
        put.strike,
        'GAMMA_SQUEEZE_DOWN',
        put,
        currentPrice,
        dealerPositioning
      );
      
      if (zone.strength > 0.3) {
        zones.push(zone);
      }
    }
    
    return zones.sort((a, b) => b.strength - a.strength).slice(0, 5); // Top 5 zones
  }

  // Helper methods for gamma analysis
  private calculateProximityWeight(moneyness: number): number {
    // Higher weight for options closer to ATM
    const distance = Math.abs(moneyness - 1.0);
    return Math.exp(-distance * 2); // Exponential decay with distance
  }

  private calculateGammaPercentile(currentGamma: number): number {
    // Simplified percentile calculation
    // In production, this would use historical gamma data
    const normalizedGamma = (currentGamma + 1) / 2; // Normalize -1 to 1 range to 0-1
    return Math.max(0, Math.min(100, normalizedGamma * 100));
  }

  private analyzeGammaFlow(optionsData: OptionsChainData, priceData: PriceBar[]): 'BUYING' | 'SELLING' | 'NEUTRAL' {
    // Analyze recent volume patterns to determine flow direction
    const totalCallVolume = optionsData.calls.reduce((sum, call) => sum + call.volume, 0);
    const totalPutVolume = optionsData.puts.reduce((sum, put) => sum + put.volume, 0);
    
    const callPutRatio = totalCallVolume / (totalPutVolume || 1);
    
    if (callPutRatio > 1.2) {
      return 'BUYING'; // More call activity suggests gamma buying
    } else if (callPutRatio < 0.8) {
      return 'SELLING'; // More put activity suggests gamma selling
    } else {
      return 'NEUTRAL';
    }
  }

  private calculateConcentrationRisk(optionsData: OptionsChainData): number {
    // Calculate how concentrated gamma is at specific strikes
    const allContracts = [...optionsData.calls, ...optionsData.puts];
    const totalGamma = allContracts.reduce((sum, contract) => sum + Math.abs(contract.gamma * contract.openInterest), 0);
    
    if (totalGamma === 0) return 0;
    
    // Find maximum concentration at any single strike
    const strikeGamma = new Map<number, number>();
    allContracts.forEach(contract => {
      const current = strikeGamma.get(contract.strike) || 0;
      strikeGamma.set(contract.strike, current + Math.abs(contract.gamma * contract.openInterest));
    });
    
    const maxConcentration = Math.max(...Array.from(strikeGamma.values()));
    return maxConcentration / totalGamma;
  }

  private calculateHedgingPressure(optionsData: OptionsChainData, priceData: PriceBar[]): number {
    // Calculate pressure on dealers to hedge their positions
    const recentVolatility = this.calculateRealizedVolatility(priceData, 5); // 5-day vol
    const impliedVol = this.calculateExpectedVolatility(optionsData);
    
    // Higher pressure when realized vol exceeds implied vol
    const volRatio = recentVolatility / (impliedVol || 0.2);
    return Math.min(1, Math.max(0, (volRatio - 0.8) / 0.4)); // Scale 0.8-1.2 to 0-1
  }

  private interpolateGammaFlip(price1: number, price2: number, gamma1: number, gamma2: number): number {
    // Linear interpolation to find exact gamma flip level
    const ratio = -gamma1 / (gamma2 - gamma1);
    return price1 + ratio * (price2 - price1);
  }

  private calculateRealizedVolatility(priceData: PriceBar[], periods: number): number {
    if (priceData.length < periods + 1) return 0.2; // Default 20% if insufficient data
    
    const returns: number[] = [];
    for (let i = priceData.length - periods; i < priceData.length; i++) {
      const prevClose = priceData[i - 1].close;
      const currClose = priceData[i].close;
      returns.push(Math.log(currClose / prevClose));
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252); // Annualized volatility
  }

  private calculateExpectedVolatility(optionsData: OptionsChainData): number {
    // Calculate volume-weighted implied volatility
    const allContracts = [...optionsData.calls, ...optionsData.puts];
    let totalVolume = 0;
    let weightedIV = 0;
    
    allContracts.forEach(contract => {
      if (contract.volume > 0 && contract.impliedVolatility > 0) {
        weightedIV += contract.impliedVolatility * contract.volume;
        totalVolume += contract.volume;
      }
    });
    
    return totalVolume > 0 ? weightedIV / totalVolume : 0.2;
  }

  private calculateVolatilityOfVolatility(priceData: PriceBar[]): number {
    // Calculate volatility of volatility (simplified)
    const volPeriod = 10;
    const vols: number[] = [];
    
    for (let i = volPeriod; i < priceData.length; i++) {
      const periodData = priceData.slice(i - volPeriod, i);
      const vol = this.calculateRealizedVolatility(periodData, volPeriod - 1);
      vols.push(vol);
    }
    
    if (vols.length < 2) return 0.1;
    
    const mean = vols.reduce((sum, vol) => sum + vol, 0) / vols.length;
    const variance = vols.reduce((sum, vol) => sum + Math.pow(vol - mean, 2), 0) / vols.length;
    
    return Math.sqrt(variance);
  }

  private calculateSuppressionLevel(netGamma: number, realizedVol: number, expectedVol: number): number {
    // Calculate how much volatility is being suppressed by gamma positioning
    const volRatio = realizedVol / (expectedVol || 0.2);
    const gammaEffect = Math.abs(netGamma) * 0.5; // Gamma contribution to suppression
    
    // Suppression is higher when realized vol is below expected and gamma is positive (long gamma)
    if (netGamma > 0 && volRatio < 1) {
      return Math.min(1, (1 - volRatio) + gammaEffect);
    } else {
      return Math.max(0, gammaEffect - 0.2);
    }
  }

  private calculateBreakoutPotential(
    suppressionLevel: number, 
    realizedVol: number, 
    expectedVol: number, 
    netGamma: number
  ): number {
    // Higher suppression and negative gamma positioning increases breakout potential
    const suppressionContribution = suppressionLevel * 0.6;
    const gammaContribution = netGamma < 0 ? Math.abs(netGamma) * 0.4 : 0;
    const volGap = Math.max(0, expectedVol - realizedVol) / expectedVol * 0.3;
    
    return Math.min(1, suppressionContribution + gammaContribution + volGap);
  }

  private calculateTimeToNearestExpiry(optionsData: OptionsChainData): number {
    const allExpiries = [
      ...optionsData.calls.map(c => c.expiry),
      ...optionsData.puts.map(p => p.expiry)
    ];
    
    const uniqueExpiries = Array.from(new Set(allExpiries.map(d => d.getTime())))
      .map(time => new Date(time))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (uniqueExpiries.length === 0) return 30; // Default 30 days
    
    const nearestExpiry = uniqueExpiries[0];
    const now = new Date();
    const diffTime = nearestExpiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  private calculateOIConcentration(strikeOI: Map<number, number>, currentPrice: number): number {
    // Calculate how concentrated open interest is near current price
    const nearbyStrikes = Array.from(strikeOI.entries())
      .filter(([strike]) => Math.abs(strike - currentPrice) / currentPrice < 0.05);
    
    const nearbyOI = nearbyStrikes.reduce((sum, [, oi]) => sum + oi, 0);
    const totalOI = Array.from(strikeOI.values()).reduce((sum, oi) => sum + oi, 0);
    
    return totalOI > 0 ? nearbyOI / totalOI : 0;
  }

  private calculatePinningProbability(pinStrength: number, timeToExpiry: number, concentration: number): number {
    // Higher probability with higher concentration, strength, and closer to expiry
    const timeWeight = Math.max(0, 1 - timeToExpiry / 30); // Stronger effect closer to expiry
    const strengthWeight = pinStrength;
    const concentrationWeight = concentration;
    
    return (timeWeight * 0.4 + strengthWeight * 0.3 + concentrationWeight * 0.3);
  }

  private analyzeAccelerationZone(
    strike: number,
    type: 'GAMMA_SQUEEZE_UP' | 'GAMMA_SQUEEZE_DOWN' | 'DEALER_HEDGE',
    contract: OptionContract,
    currentPrice: number,
    dealerPositioning: DealerPositioning
  ): AccelerationZone {
    const triggerDistance = Math.abs(strike - currentPrice) / currentPrice;
    
    // Calculate zone strength based on gamma, open interest, and dealer positioning
    const gammaStrength = Math.abs(contract.gamma) * contract.openInterest / 1000;
    const proximityStrength = Math.exp(-triggerDistance * 5); // Stronger for closer strikes
    const dealerStrength = dealerPositioning.strength;
    
    const strength = Math.min(1, (gammaStrength * proximityStrength * dealerStrength) / 10);
    
    // Calculate expected move size
    const expectedMove = triggerDistance * (1 + strength);
    
    // Calculate probability based on various factors
    const probability = Math.min(1, strength * (1 - triggerDistance) * dealerPositioning.hedgingPressure);
    
    // Determine timeframe
    let timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM';
    if (triggerDistance < 0.02) {
      timeframe = 'IMMEDIATE';
    } else if (triggerDistance < 0.05) {
      timeframe = 'SHORT_TERM';
    } else {
      timeframe = 'MEDIUM_TERM';
    }
    
    // Calculate volume requirement
    const volumeRequirement = contract.openInterest * 0.1 * (1 + triggerDistance);
    
    return {
      level: strike,
      type,
      strength: Number(strength.toFixed(3)),
      triggerDistance: Number(triggerDistance.toFixed(4)),
      expectedMove: Number(expectedMove.toFixed(4)),
      probability: Number(probability.toFixed(3)),
      timeframe,
      volumeRequirement: Math.round(volumeRequirement)
    };
  }

  private analyzeMarketMakerFlow(
    optionsData: OptionsChainData, 
    priceData: PriceBar[], 
    dealerPositioning: DealerPositioning
  ): MarketMakerFlow {
    // Analyze market maker flow patterns
    const totalVolume = [...optionsData.calls, ...optionsData.puts]
      .reduce((sum, contract) => sum + contract.volume, 0);
    
    // Calculate net flow (simplified)
    const callVolume = optionsData.calls.reduce((sum, call) => sum + call.volume, 0);
    const putVolume = optionsData.puts.reduce((sum, put) => sum + put.volume, 0);
    const netFlow = callVolume - putVolume;
    
    // Calculate flow intensity
    const avgVolume = totalVolume / (optionsData.calls.length + optionsData.puts.length);
    const flowIntensity = Math.min(1, totalVolume / (avgVolume * 100));
    
    // Flow persistence (simplified)
    const flowPersistence = dealerPositioning.strength;
    
    // Hedging activity
    const hedgingActivity = dealerPositioning.hedgingPressure;
    
    // Inventory risk
    const inventoryRisk = Math.min(1, Math.abs(dealerPositioning.netGamma) * 2);
    
    // Bid-ask impact (simplified)
    const bidAskImpact = inventoryRisk * 0.5;
    
    // Liquidity provision
    const liquidityProvision = Math.max(0, 1 - inventoryRisk);
    
    return {
      netFlow: Number(netFlow.toFixed(0)),
      flowIntensity: Number(flowIntensity.toFixed(3)),
      flowPersistence: Number(flowPersistence.toFixed(3)),
      hedgingActivity: Number(hedgingActivity.toFixed(3)),
      inventoryRisk: Number(inventoryRisk.toFixed(3)),
      bidAskImpact: Number(bidAskImpact.toFixed(3)),
      liquidityProvision: Number(liquidityProvision.toFixed(3))
    };
  }

  private calculateGammaImpact(
    netGamma: number, 
    dealerPositioning: DealerPositioning, 
    volEnvironment: VolatilityEnvironment
  ): GammaImpact {
    // Calculate various impacts of gamma on market structure
    const priceImpact = Math.abs(netGamma) * dealerPositioning.strength * 0.1;
    const volatilityImpact = volEnvironment.gammaContribution;
    const liquidityImpact = dealerPositioning.concentrationRisk;
    
    // Momentum amplification
    const momentumAmplification = netGamma < 0 ? Math.abs(netGamma) * 0.8 : Math.abs(netGamma) * 0.3;
    
    // Reversal risk
    const reversalRisk = netGamma > 0 ? netGamma * 0.6 : 0.2;
    
    // Trend persistence
    const trendPersistence = netGamma > 0 ? 0.3 : 0.7;
    
    return {
      priceImpact: Number(priceImpact.toFixed(3)),
      volatilityImpact: Number(volatilityImpact.toFixed(3)),
      liquidityImpact: Number(liquidityImpact.toFixed(3)),
      momentumAmplification: Number(momentumAmplification.toFixed(3)),
      reversalRisk: Number(reversalRisk.toFixed(3)),
      trendPersistence: Number(trendPersistence.toFixed(3))
    };
  }

  private createExposureBreakdown(optionsData: OptionsChainData, currentPrice: number): ExposureBreakdown {
    // Calculate detailed exposure breakdown
    const callGamma = optionsData.calls.reduce((sum, call) => 
      sum + call.gamma * call.openInterest, 0);
    
    const putGamma = optionsData.puts.reduce((sum, put) => 
      sum + put.gamma * put.openInterest, 0);
    
    const netGamma = callGamma + putGamma;
    
    // Gamma by strike
    const gammaByStrike: GammaByStrike[] = [];
    const strikeMap = new Map<number, any>();
    
    [...optionsData.calls, ...optionsData.puts].forEach(contract => {
      const existing = strikeMap.get(contract.strike) || {
        strike: contract.strike,
        gamma: 0,
        openInterest: 0,
        volume: 0,
        impliedVolatility: 0,
        count: 0
      };
      
      existing.gamma += contract.gamma * contract.openInterest;
      existing.openInterest += contract.openInterest;
      existing.volume += contract.volume;
      existing.impliedVolatility += contract.impliedVolatility;
      existing.count += 1;
      
      strikeMap.set(contract.strike, existing);
    });
    
    Array.from(strikeMap.values()).forEach(data => {
      gammaByStrike.push({
        strike: data.strike,
        gamma: Number(data.gamma.toFixed(6)),
        openInterest: data.openInterest,
        volume: data.volume,
        impliedVolatility: Number((data.impliedVolatility / data.count).toFixed(4)),
        distanceFromSpot: Number(((data.strike - currentPrice) / currentPrice).toFixed(4))
      });
    });
    
    // Sort by distance from spot
    gammaByStrike.sort((a, b) => Math.abs(a.distanceFromSpot) - Math.abs(b.distanceFromSpot));
    
    // Gamma by expiry
    const expiryMap = new Map<string, any>();
    
    [...optionsData.calls, ...optionsData.puts].forEach(contract => {
      const expiryKey = contract.expiry.toISOString().split('T')[0];
      const existing = expiryMap.get(expiryKey) || {
        expiry: contract.expiry,
        gamma: 0,
        openInterest: 0,
        volume: 0
      };
      
      existing.gamma += contract.gamma * contract.openInterest;
      existing.openInterest += contract.openInterest;
      existing.volume += contract.volume;
      
      expiryMap.set(expiryKey, existing);
    });
    
    const gammaByExpiry: GammaByExpiry[] = Array.from(expiryMap.values()).map(data => {
      const now = new Date();
      const daysToExpiry = Math.ceil((data.expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        expiry: data.expiry,
        daysToExpiry,
        gamma: Number(data.gamma.toFixed(6)),
        openInterest: data.openInterest,
        volume: data.volume,
        weight: Number((data.openInterest / (optionsData.calls.length + optionsData.puts.length)).toFixed(3))
      };
    });
    
    // Sort by days to expiry
    gammaByExpiry.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    
    // Simplified participant breakdown (would need more data in production)
    const institutionalGamma = netGamma * 0.6; // Estimate 60% institutional
    const retailGamma = netGamma * 0.25;       // Estimate 25% retail
    const hedgeFundGamma = netGamma * 0.15;    // Estimate 15% hedge funds
    
    return {
      callGamma: Number(callGamma.toFixed(6)),
      putGamma: Number(putGamma.toFixed(6)),
      netGamma: Number(netGamma.toFixed(6)),
      gammaByStrike: gammaByStrike.slice(0, 20), // Top 20 strikes
      gammaByExpiry: gammaByExpiry.slice(0, 10), // Top 10 expiries
      institutionalGamma: Number(institutionalGamma.toFixed(6)),
      retailGamma: Number(retailGamma.toFixed(6)),
      hedgeFundGamma: Number(hedgeFundGamma.toFixed(6))
    };
  }

  private calculateGammaRiskMetrics(
    netGamma: number,
    dealerPositioning: DealerPositioning,
    volEnvironment: VolatilityEnvironment,
    pinningRisk: PinningRisk
  ): GammaRiskMetrics {
    // Overall gamma risk
    const gammaRisk = Math.min(1, Math.abs(netGamma) * 2 + dealerPositioning.strength * 0.5);
    
    // Concentration risk
    const concentrationRisk = dealerPositioning.concentrationRisk;
    
    // Liquidity risk
    const liquidityRisk = Math.min(1, concentrationRisk + dealerPositioning.hedgingPressure * 0.5);
    
    // Volatility risk
    const volatilityRisk = volEnvironment.breakoutPotential;
    
    // Systemic risk
    const systemicRisk = Math.min(1, gammaRisk * 0.6 + (pinningRisk.pinningProbability * 0.4));
    
    // Hedging risk
    const hedgingRisk = dealerPositioning.hedgingPressure;
    
    return {
      gammaRisk: Number(gammaRisk.toFixed(3)),
      concentrationRisk: Number(concentrationRisk.toFixed(3)),
      liquidityRisk: Number(liquidityRisk.toFixed(3)),
      volatilityRisk: Number(volatilityRisk.toFixed(3)),
      systemicRisk: Number(systemicRisk.toFixed(3)),
      hedgingRisk: Number(hedgingRisk.toFixed(3))
    };
  }

  private calculateConfidenceAdjustment(
    netGamma: number,
    dealerPositioning: DealerPositioning,
    volEnvironment: VolatilityEnvironment,
    gammaImpact: GammaImpact
  ): number {
    // Adjust signal confidence based on gamma exposure levels
    let adjustment = 0;
    
    // Positive gamma (dealers long gamma) reduces confidence in directional moves
    if (netGamma > 0) {
      adjustment -= netGamma * 0.3; // Reduce confidence
    }
    
    // Negative gamma (dealers short gamma) can amplify moves
    if (netGamma < 0) {
      adjustment += Math.abs(netGamma) * 0.2; // Slight confidence boost
    }
    
    // High volatility suppression reduces confidence
    if (volEnvironment.suppressionLevel > 0.7) {
      adjustment -= volEnvironment.suppressionLevel * 0.2;
    }
    
    // High momentum amplification increases confidence
    adjustment += gammaImpact.momentumAmplification * 0.15;
    
    // High reversal risk reduces confidence
    adjustment -= gammaImpact.reversalRisk * 0.1;
    
    // Clamp to reasonable range
    return Math.max(-0.3, Math.min(0.2, adjustment));
  }

  // Implementation methods for enhanced pinning risk and acceleration zone analysis
  
  /**
   * Calculate detailed pinning risk with comprehensive analysis
   */
  private calculateDetailedPinningRisk(optionsData: OptionsChainData, currentPrice: number): DetailedPinningRisk {
    // Identify all potential pin levels
    const pinLevels = this.identifyAllPinLevels(optionsData, currentPrice);
    
    // Find primary pin (strongest)
    const primaryPin = pinLevels.length > 0 ? pinLevels[0] : this.getDefaultPinLevel(currentPrice);
    
    // Get secondary pins
    const secondaryPins = pinLevels.slice(1, 4); // Top 3 secondary pins
    
    // Calculate overall pinning metrics
    const pinningStrength = this.calculateOverallPinningStrength(pinLevels, currentPrice);
    const pinningPersistence = this.calculatePinningPersistence(pinLevels, optionsData);
    const pinningEfficiency = this.calculatePinningEfficiency(pinLevels, optionsData);
    const confidenceScore = this.calculatePinningConfidenceScore(pinLevels, optionsData);
    
    // Determine overall risk level
    const overallRisk = this.determinePinningRiskLevel(pinningStrength, pinningPersistence);
    
    return {
      overallRisk,
      primaryPin,
      secondaryPins,
      pinningStrength: Number(pinningStrength.toFixed(3)),
      pinningPersistence: Number(pinningPersistence.toFixed(3)),
      pinningEfficiency: Number(pinningEfficiency.toFixed(3)),
      confidenceScore: Number(confidenceScore.toFixed(3))
    };
  }

  private identifyAllPinLevels(optionsData: OptionsChainData, currentPrice: number): PinLevel[] {
    const pinLevels: PinLevel[] = [];
    
    // Get all unique strikes
    const strikes = [...new Set([
      ...optionsData.calls.map(c => c.strike),
      ...optionsData.puts.map(p => p.strike)
    ])].sort((a, b) => a - b);
    
    for (const strike of strikes) {
      // Only consider strikes within reasonable range
      const distance = Math.abs(strike - currentPrice) / currentPrice;
      if (distance > 0.15) continue; // Within 15%
      
      const pinLevel = this.analyzePinLevel(strike, optionsData, currentPrice);
      if (pinLevel.strength > 0.2) { // Minimum threshold
        pinLevels.push(pinLevel);
      }
    }
    
    // Sort by strength
    return pinLevels.sort((a, b) => b.strength - a.strength);
  }

  private analyzePinLevel(strike: number, optionsData: OptionsChainData, currentPrice: number): PinLevel {
    // Get contracts at this strike
    const calls = optionsData.calls.filter(c => Math.abs(c.strike - strike) < 0.01);
    const puts = optionsData.puts.filter(p => Math.abs(p.strike - strike) < 0.01);
    
    // Calculate metrics
    const callOI = calls.reduce((sum, c) => sum + c.openInterest, 0);
    const putOI = puts.reduce((sum, p) => sum + p.openInterest, 0);
    const totalOI = callOI + putOI;
    
    const callVolume = calls.reduce((sum, c) => sum + c.volume, 0);
    const putVolume = puts.reduce((sum, p) => sum + p.volume, 0);
    const totalVolume = callVolume + putVolume;
    
    // Calculate gamma exposure at this strike
    const gammaExposure = this.calculateGammaExposureAtStrike(strike, optionsData);
    
    // Determine pin type
    let pinType: 'CALL_PIN' | 'PUT_PIN' | 'DUAL_PIN' | 'GAMMA_PIN';
    if (callOI > putOI * 2) {
      pinType = 'CALL_PIN';
    } else if (putOI > callOI * 2) {
      pinType = 'PUT_PIN';
    } else if (Math.abs(callOI - putOI) / Math.max(callOI, putOI) < 0.3) {
      pinType = 'DUAL_PIN';
    } else {
      pinType = 'GAMMA_PIN';
    }
    
    // Calculate pin strength
    const oiWeight = Math.log(totalOI + 1) / 15; // Normalize OI
    const volumeWeight = Math.log(totalVolume + 1) / 10; // Normalize volume
    const gammaWeight = Math.abs(gammaExposure) * 10; // Gamma contribution
    const proximityWeight = Math.exp(-Math.abs(strike - currentPrice) / currentPrice * 10); // Proximity bonus
    
    const strength = Math.min(1, (oiWeight + volumeWeight + gammaWeight) * proximityWeight);
    
    // Calculate magnetism (attraction strength)
    const magnetism = this.calculatePinMagnetism(strike, currentPrice, totalOI, gammaExposure);
    
    // Calculate delta hedging pressure
    const deltaHedgingPressure = this.calculateDeltaHedgingPressure(strike, calls, puts, currentPrice);
    
    // Calculate attraction radius
    const attractionRadius = this.calculateAttractionRadius(strength, totalOI);
    
    return {
      level: strike,
      type: pinType,
      strength: Number(strength.toFixed(3)),
      magnetism: Number(magnetism.toFixed(3)),
      openInterest: totalOI,
      volume: totalVolume,
      gammaExposure: Number(gammaExposure.toFixed(6)),
      deltaHedgingPressure: Number(deltaHedgingPressure.toFixed(3)),
      distanceFromPrice: Number((Math.abs(strike - currentPrice) / currentPrice).toFixed(4)),
      attractionRadius: Number(attractionRadius.toFixed(4))
    };
  }

  private calculateDetailedAccelerationZones(
    optionsData: OptionsChainData, 
    currentPrice: number, 
    priceData: PriceBar[]
  ): DetailedAccelerationZone[] {
    const zones: DetailedAccelerationZone[] = [];
    
    // Analyze gamma squeeze zones
    const gammaSqueezeZones = this.identifyGammaSqueezeZones(optionsData, currentPrice);
    zones.push(...gammaSqueezeZones);
    
    // Analyze dealer hedge zones
    const dealerHedgeZones = this.identifyDealerHedgeZones(optionsData, currentPrice);
    zones.push(...dealerHedgeZones);
    
    // Analyze flow acceleration zones
    const flowAccelerationZones = this.identifyFlowAccelerationZones(optionsData, priceData, currentPrice);
    zones.push(...flowAccelerationZones);
    
    // Analyze volatility breakout zones
    const volBreakoutZones = this.identifyVolatilityBreakoutZones(optionsData, priceData, currentPrice);
    zones.push(...volBreakoutZones);
    
    // Sort by strength and proximity
    return zones
      .sort((a, b) => (b.strength * (1 - b.triggerDistance)) - (a.strength * (1 - a.triggerDistance)))
      .slice(0, 8); // Top 8 zones
  }

  private identifyGammaSqueezeZones(optionsData: OptionsChainData, currentPrice: number): DetailedAccelerationZone[] {
    const zones: DetailedAccelerationZone[] = [];
    
    // Look for high gamma concentration areas
    const strikes = [...new Set([
      ...optionsData.calls.map(c => c.strike),
      ...optionsData.puts.map(p => p.strike)
    ])];
    
    for (const strike of strikes) {
      const distance = (strike - currentPrice) / currentPrice;
      if (Math.abs(distance) > 0.1 || Math.abs(distance) < 0.005) continue; // 0.5% to 10% range
      
      const gammaAtStrike = Math.abs(this.calculateGammaExposureAtStrike(strike, optionsData));
      if (gammaAtStrike < 0.01) continue; // Minimum gamma threshold
      
      const type = distance > 0 ? 'GAMMA_SQUEEZE_UP' : 'GAMMA_SQUEEZE_DOWN';
      const strength = Math.min(1, gammaAtStrike * 20); // Scale gamma to strength
      const expectedMove = Math.abs(distance) * (1 + strength);
      const probability = this.calculateZoneProbability(strike, optionsData, currentPrice);
      
      zones.push({
        level: strike,
        type,
        strength: Number(strength.toFixed(3)),
        triggerDistance: Number(Math.abs(distance).toFixed(4)),
        expectedMove: Number(expectedMove.toFixed(4)),
        probability: Number(probability.toFixed(3)),
        timeframe: this.determineZoneTimeframe(Math.abs(distance)),
        volumeRequirement: Math.round(this.getOpenInterestAtStrike(optionsData, strike) * 0.15),
        gammaContribution: 0.8, // High gamma contribution for gamma squeeze
        flowContribution: 0.3,
        volatilityContribution: 0.4,
        sustainabilityScore: Number((strength * probability).toFixed(3)),
        reverseZoneRisk: Number((0.3 - strength * 0.2).toFixed(3))
      });
    }
    
    return zones;
  }

  private identifyDealerHedgeZones(optionsData: OptionsChainData, currentPrice: number): DetailedAccelerationZone[] {
    const zones: DetailedAccelerationZone[] = [];
    
    // Look for areas where dealers will need to hedge aggressively
    const netGamma = this.calculateNetGammaExposure(optionsData, currentPrice);
    
    if (Math.abs(netGamma) < 0.02) return zones; // Need significant gamma exposure
    
    // Calculate hedge zones based on gamma profile
    const priceRange = currentPrice * 0.08; // ±8% range
    const priceStep = currentPrice * 0.01; // 1% steps
    
    for (let price = currentPrice - priceRange; price <= currentPrice + priceRange; price += priceStep) {
      const gammaAtPrice = this.calculateNetGammaExposure(optionsData, price);
      const gammaChange = Math.abs(gammaAtPrice - netGamma);
      
      if (gammaChange > 0.03) { // Significant gamma change
        const distance = (price - currentPrice) / currentPrice;
        const strength = Math.min(1, gammaChange * 15);
        
        zones.push({
          level: Number(price.toFixed(2)),
          type: 'DEALER_HEDGE',
          strength: Number(strength.toFixed(3)),
          triggerDistance: Number(Math.abs(distance).toFixed(4)),
          expectedMove: Number((Math.abs(distance) * 0.5).toFixed(4)),
          probability: Number((strength * 0.7).toFixed(3)),
          timeframe: this.determineZoneTimeframe(Math.abs(distance)),
          volumeRequirement: Math.round(gammaChange * 10000000), // Estimate based on gamma change
          gammaContribution: 0.9, // Very high gamma contribution
          flowContribution: 0.6,
          volatilityContribution: 0.2,
          sustainabilityScore: Number((strength * 0.6).toFixed(3)),
          reverseZoneRisk: Number((0.4 - strength * 0.3).toFixed(3))
        });
      }
    }
    
    return zones.slice(0, 3); // Top 3 dealer hedge zones
  }

  private identifyFlowAccelerationZones(
    optionsData: OptionsChainData, 
    priceData: PriceBar[], 
    currentPrice: number
  ): DetailedAccelerationZone[] {
    const zones: DetailedAccelerationZone[] = [];
    
    // Analyze recent flow patterns
    const recentVolume = priceData.slice(-5).reduce((sum, bar) => sum + bar.volume, 0) / 5;
    const avgVolume = priceData.reduce((sum, bar) => sum + bar.volume, 0) / priceData.length;
    const flowStrength = Math.min(2, recentVolume / avgVolume);
    
    if (flowStrength < 1.2) return zones; // Need elevated flow
    
    // Identify levels where flow could accelerate
    const momentum = this.calculateMomentumStrength(priceData.slice(-10));
    const direction = momentum > 0 ? 1 : -1;
    
    // Create flow acceleration zones in momentum direction
    const distances = [0.02, 0.04, 0.06]; // 2%, 4%, 6% levels
    
    distances.forEach(distance => {
      const level = currentPrice * (1 + direction * distance);
      const strength = Math.min(1, flowStrength * Math.abs(momentum) * (1 - distance));
      
      zones.push({
        level: Number(level.toFixed(2)),
        type: 'FLOW_ACCELERATION',
        strength: Number(strength.toFixed(3)),
        triggerDistance: Number(distance.toFixed(4)),
        expectedMove: Number((distance * 1.5).toFixed(4)),
        probability: Number((strength * 0.6).toFixed(3)),
        timeframe: 'SHORT_TERM',
        volumeRequirement: Math.round(recentVolume * 1.5),
        gammaContribution: 0.3,
        flowContribution: 0.9, // Very high flow contribution
        volatilityContribution: 0.5,
        sustainabilityScore: Number((strength * 0.7).toFixed(3)),
        reverseZoneRisk: Number((0.5 - strength * 0.4).toFixed(3))
      });
    });
    
    return zones;
  }

  private identifyVolatilityBreakoutZones(
    optionsData: OptionsChainData, 
    priceData: PriceBar[], 
    currentPrice: number
  ): DetailedAccelerationZone[] {
    const zones: DetailedAccelerationZone[] = [];
    
    // Calculate volatility metrics
    const realizedVol = this.calculateRealizedVolatility(priceData, 20);
    const impliedVol = this.calculateExpectedVolatility(optionsData);
    const volSuppression = Math.max(0, impliedVol - realizedVol) / impliedVol;
    
    if (volSuppression < 0.2) return zones; // Need significant suppression
    
    // Identify breakout levels based on recent ranges
    const recentHigh = Math.max(...priceData.slice(-20).map(bar => bar.high));
    const recentLow = Math.min(...priceData.slice(-20).map(bar => bar.low));
    
    const breakoutLevels = [
      { level: recentHigh * 1.01, direction: 'UP' },
      { level: recentLow * 0.99, direction: 'DOWN' }
    ];
    
    breakoutLevels.forEach(({ level, direction }) => {
      const distance = Math.abs(level - currentPrice) / currentPrice;
      if (distance > 0.08) return; // Too far away
      
      const strength = Math.min(1, volSuppression * 2);
      
      zones.push({
        level: Number(level.toFixed(2)),
        type: 'VOLATILITY_BREAKOUT',
        strength: Number(strength.toFixed(3)),
        triggerDistance: Number(distance.toFixed(4)),
        expectedMove: Number((distance * 2).toFixed(4)), // Vol breakouts can be large
        probability: Number((volSuppression * 0.8).toFixed(3)),
        timeframe: this.determineZoneTimeframe(distance),
        volumeRequirement: Math.round(this.getTotalVolume(optionsData) * 2),
        gammaContribution: 0.4,
        flowContribution: 0.6,
        volatilityContribution: 0.9, // Very high vol contribution
        sustainabilityScore: Number((strength * 0.8).toFixed(3)),
        reverseZoneRisk: Number((0.3 - strength * 0.2).toFixed(3))
      });
    });
    
    return zones;
  }

  // Helper methods for pinning and acceleration analysis
  private calculateOverallPinningStrength(pinLevels: PinLevel[], currentPrice: number): number {
    if (pinLevels.length === 0) return 0;
    
    // Weight by proximity and strength
    let totalWeight = 0;
    let weightedStrength = 0;
    
    pinLevels.forEach(pin => {
      const proximityWeight = Math.exp(-pin.distanceFromPrice * 5);
      const weight = pin.strength * proximityWeight;
      totalWeight += weight;
      weightedStrength += pin.strength * weight;
    });
    
    return totalWeight > 0 ? weightedStrength / totalWeight : 0;
  }

  private calculatePinningPersistence(pinLevels: PinLevel[], optionsData: OptionsChainData): number {
    // Based on time to expiry and open interest concentration
    const timeToExpiry = this.calculateTimeToNearestExpiry(optionsData);
    const timeWeight = Math.max(0.2, Math.min(1, (30 - timeToExpiry) / 25)); // Stronger closer to expiry
    
    const avgOI = pinLevels.reduce((sum, pin) => sum + pin.openInterest, 0) / pinLevels.length;
    const oiWeight = Math.min(1, avgOI / 20000); // Normalize OI
    
    return (timeWeight + oiWeight) / 2;
  }

  private calculatePinningEfficiency(pinLevels: PinLevel[], optionsData: OptionsChainData): number {
    // How efficiently pins work based on gamma concentration
    const totalGamma = pinLevels.reduce((sum, pin) => sum + Math.abs(pin.gammaExposure), 0);
    const avgGamma = totalGamma / pinLevels.length;
    
    return Math.min(1, avgGamma * 50); // Scale gamma to efficiency
  }

  private calculatePinningConfidenceScore(pinLevels: PinLevel[], optionsData: OptionsChainData): number {
    if (pinLevels.length === 0) return 0;
    
    const strengthScore = pinLevels[0].strength; // Primary pin strength
    const volumeScore = Math.min(1, this.getTotalVolume(optionsData) / 100000); // Volume confidence
    const concentrationScore = pinLevels.length > 0 ? Math.min(1, pinLevels.length / 5) : 0; // Multiple pins
    
    return (strengthScore + volumeScore + concentrationScore) / 3;
  }

  private determinePinningRiskLevel(strength: number, persistence: number): 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' {
    const riskScore = (strength + persistence) / 2;
    
    if (riskScore > 0.8) return 'EXTREME';
    if (riskScore > 0.6) return 'HIGH';
    if (riskScore > 0.4) return 'MODERATE';
    return 'LOW';
  }

  private getDefaultPinLevel(currentPrice: number): PinLevel {
    return {
      level: currentPrice,
      type: 'GAMMA_PIN',
      strength: 0,
      magnetism: 0,
      openInterest: 0,
      volume: 0,
      gammaExposure: 0,
      deltaHedgingPressure: 0,
      distanceFromPrice: 0,
      attractionRadius: 0
    };
  }

  private calculateGammaExposureAtStrike(strike: number, optionsData: OptionsChainData): number {
    const calls = optionsData.calls.filter(c => Math.abs(c.strike - strike) < 0.01);
    const puts = optionsData.puts.filter(p => Math.abs(p.strike - strike) < 0.01);
    
    const callGamma = calls.reduce((sum, c) => sum - c.gamma * c.openInterest, 0); // Dealers short calls
    const putGamma = puts.reduce((sum, p) => sum + p.gamma * p.openInterest, 0); // Dealers long puts
    
    return callGamma + putGamma;
  }

  private calculatePinMagnetism(strike: number, currentPrice: number, openInterest: number, gammaExposure: number): number {
    const distance = Math.abs(strike - currentPrice) / currentPrice;
    const proximityFactor = Math.exp(-distance * 10); // Stronger when closer
    const oiFactor = Math.min(1, openInterest / 50000); // OI contribution
    const gammaFactor = Math.min(1, Math.abs(gammaExposure) * 20); // Gamma contribution
    
    return (proximityFactor + oiFactor + gammaFactor) / 3;
  }

  private calculateDeltaHedgingPressure(strike: number, calls: OptionContract[], puts: OptionContract[], currentPrice: number): number {
    // Calculate delta hedging pressure at this strike
    const callDelta = calls.reduce((sum, c) => sum + Math.abs(c.delta) * c.openInterest, 0);
    const putDelta = puts.reduce((sum, p) => sum + Math.abs(p.delta) * p.openInterest, 0);
    
    const totalDelta = callDelta + putDelta;
    const moneyness = strike / currentPrice;
    const atmFactor = Math.exp(-Math.abs(moneyness - 1) * 5); // Stronger at ATM
    
    return Math.min(1, totalDelta / 100000 * atmFactor);
  }

  private calculateAttractionRadius(strength: number, openInterest: number): number {
    // Calculate the price range where pin is effective
    const baseRadius = 0.01; // 1% base radius
    const strengthMultiplier = 1 + strength * 2; // Up to 3x for strong pins
    const oiMultiplier = 1 + Math.log(openInterest + 1) / 15; // OI boost
    
    return baseRadius * strengthMultiplier * oiMultiplier;
  }

  private calculateZoneProbability(strike: number, optionsData: OptionsChainData, currentPrice: number): number {
    const distance = Math.abs(strike - currentPrice) / currentPrice;
    const proximityScore = Math.exp(-distance * 8); // Closer = higher probability
    
    const oi = this.getOpenInterestAtStrike(optionsData, strike);
    const oiScore = Math.min(1, oi / 30000); // OI contribution
    
    const gamma = Math.abs(this.calculateGammaExposureAtStrike(strike, optionsData));
    const gammaScore = Math.min(1, gamma * 25); // Gamma contribution
    
    return (proximityScore + oiScore + gammaScore) / 3;
  }

  private determineZoneTimeframe(distance: number): 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' {
    if (distance < 0.02) return 'IMMEDIATE';
    if (distance < 0.05) return 'SHORT_TERM';
    return 'MEDIUM_TERM';
  }

  // Confidence adjustment methods
  private calculateBaseGammaAdjustment(netGamma: number, dealerPositioning: DealerPositioning): number {
    // Negative gamma (dealers short) can amplify moves = positive adjustment
    // Positive gamma (dealers long) can dampen moves = negative adjustment
    let adjustment = 0;
    
    if (netGamma < 0) {
      adjustment = Math.min(0.2, Math.abs(netGamma) * 0.4); // Positive adjustment for short gamma
    } else if (netGamma > 0) {
      adjustment = -Math.min(0.3, netGamma * 0.5); // Negative adjustment for long gamma
    }
    
    // Amplify based on positioning strength
    adjustment *= dealerPositioning.strength;
    
    return Number(adjustment.toFixed(3));
  }

  private calculateVolatilityConfidenceAdjustment(volEnvironment: VolatilityEnvironment): number {
    let adjustment = 0;
    
    // High suppression with breakout potential = positive adjustment
    if (volEnvironment.regime === 'SUPPRESSED' && volEnvironment.breakoutPotential > 0.6) {
      adjustment = volEnvironment.breakoutPotential * 0.15;
    }
    
    // Extreme volatility = negative adjustment (less predictable)
    if (volEnvironment.regime === 'EXTREME') {
      adjustment = -0.2;
    }
    
    return Number(adjustment.toFixed(3));
  }

  private calculatePinningConfidenceAdjustment(pinningRisk: DetailedPinningRisk): number {
    // Strong pinning reduces confidence in directional moves
    const pinningImpact = -pinningRisk.pinningStrength * 0.15;
    
    // But high confidence in pinning analysis itself is positive
    const confidenceBoost = pinningRisk.confidenceScore * 0.05;
    
    return Number((pinningImpact + confidenceBoost).toFixed(3));
  }

  private calculateAccelerationConfidenceAdjustment(accelerationZones: DetailedAccelerationZone[]): number {
    if (accelerationZones.length === 0) return 0;
    
    // Strong acceleration zones increase confidence
    const avgStrength = accelerationZones.reduce((sum, zone) => sum + zone.strength, 0) / accelerationZones.length;
    const avgProbability = accelerationZones.reduce((sum, zone) => sum + zone.probability, 0) / accelerationZones.length;
    
    const adjustment = (avgStrength + avgProbability) / 2 * 0.1;
    
    return Number(adjustment.toFixed(3));
  }

  private calculateTimeBasedAdjustment(primaryPin: PinLevel): number {
    // Time to expiry affects confidence
    // Very close to expiry = higher pinning effect = lower directional confidence
    const timeToExpiry = 7; // Simplified - would get from options data
    
    if (timeToExpiry <= 3) {
      return -0.1; // Strong time decay effect
    } else if (timeToExpiry <= 7) {
      return -0.05; // Moderate time decay effect
    } else {
      return 0; // Minimal time effect
    }
  }

  private calculateWeightedConfidenceAdjustment(components: any): number {
    const weights = {
      base: 0.4,
      volatility: 0.2,
      pinning: 0.2,
      acceleration: 0.15,
      time: 0.05
    };
    
    let weightedSum = 0;
    Object.entries(components).forEach(([key, value]) => {
      const weight = weights[key as keyof typeof weights] || 0;
      weightedSum += (value as number) * weight;
    });
    
    // Clamp to reasonable range
    return Math.max(-0.5, Math.min(0.5, weightedSum));
  }

  private determineConfidenceLevel(adjustment: number): 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH' {
    if (adjustment > 0.2) return 'VERY_HIGH';
    if (adjustment > 0.1) return 'HIGH';
    if (adjustment > -0.1) return 'MODERATE';
    if (adjustment > -0.2) return 'LOW';
    return 'VERY_LOW';
  }

  private generateConfidenceReasoning(finalAdjustment: number, components: any): string[] {
    const reasons: string[] = [];
    
    if (components.base > 0.1) {
      reasons.push('Negative gamma positioning can amplify directional moves');
    } else if (components.base < -0.1) {
      reasons.push('Positive gamma positioning may dampen directional moves');
    }
    
    if (components.volatility > 0.1) {
      reasons.push('High volatility suppression with breakout potential');
    }
    
    if (components.pinning < -0.1) {
      reasons.push('Strong pinning forces reduce directional move confidence');
    }
    
    if (components.acceleration > 0.05) {
      reasons.push('Strong acceleration zones support directional moves');
    }
    
    if (components.time < -0.05) {
      reasons.push('Approaching expiration increases pinning effects');
    }
    
    return reasons;
  }

  // Placeholder methods for complex analysis (would be fully implemented)
  private analyzePinningMechanics(optionsData: OptionsChainData, priceData: PriceBar[], currentPrice: number): PinningMechanics {
    // Simplified implementation - would be much more detailed
    return {
      deltaHedging: {
        strength: 0.7,
        direction: 'NEUTRAL',
        volume: 1000000,
        priceImpact: 0.3,
        persistence: 0.6
      },
      gammaHedging: {
        strength: 0.8,
        accelerationFactor: 1.5,
        dampingFactor: 0.7,
        nonLinearity: 0.4,
        volatilityImpact: 0.6
      },
      marketMakerInventory: {
        inventoryRisk: 0.5,
        hedgingUrgency: 0.6,
        liquidityProvision: 0.7,
        bidAskImpact: 0.3
      },
      flowImbalance: {
        buyPressure: 0.6,
        sellPressure: 0.4,
        netFlow: 0.2,
        flowPersistence: 0.5,
        imbalanceMagnitude: 0.3
      },
      timeDecay: {
        thetaImpact: 0.4,
        expirationProximity: 0.7,
        acceleratingDecay: 0.6,
        pinStabilization: 0.8
      }
    };
  }

  // Default result methods
  private getDefaultPinningAnalysisResult(ticker: string): EnhancedPinningAnalysis {
    return {
      ticker,
      timestamp: new Date(),
      currentPrice: 150,
      pinningRisk: {
        overallRisk: 'LOW',
        primaryPin: this.getDefaultPinLevel(150),
        secondaryPins: [],
        pinningStrength: 0,
        pinningPersistence: 0,
        pinningEfficiency: 0,
        confidenceScore: 0
      },
      pinningMechanics: this.analyzePinningMechanics({} as any, [], 150),
      pinningForces: {} as any,
      temporalEffects: {} as any,
      pinningScenarios: [],
      breakoutAnalysis: {
        breakoutProbability: 0,
        breakoutDirection: 'EITHER',
        breakoutMagnitude: 0,
        breakoutTriggers: [],
        breakoutLevels: [],
        sustainabilityScore: 0,
        falseBreakoutRisk: 0.5
      },
      tradingImplications: {
        strategy: 'Neutral',
        entryLevels: [],
        exitLevels: [],
        stopLevels: [],
        positionSizing: 'Conservative',
        timeframe: 'Unknown',
        riskFactors: [],
        opportunityScore: 0
      }
    };
  }

  private getDefaultAccelerationAnalysisResult(ticker: string): EnhancedAccelerationAnalysis {
    return {
      ticker,
      timestamp: new Date(),
      currentPrice: 150,
      accelerationZones: [],
      zoneInteractions: [],
      accelerationMechanics: {} as any,
      triggerAnalysis: {
        primaryTriggers: [],
        secondaryTriggers: [],
        triggerCombinations: [],
        triggerProbabilities: []
      },
      momentumProfile: {
        currentMomentum: 0,
        momentumDirection: 'NEUTRAL',
        momentumStrength: 0,
        momentumQuality: 'LOW',
        momentumSustainability: 0,
        momentumCatalysts: [],
        momentumRisks: []
      },
      tradingImplications: {
        primaryStrategy: 'Neutral',
        alternativeStrategies: [],
        entryTriggers: [],
        exitTriggers: [],
        stopLossLevels: [],
        profitTargets: [],
        positionSizing: 'Conservative',
        timeframe: 'Unknown',
        riskManagement: [],
        opportunityRanking: 1
      }
    };
  }

  // Placeholder methods (would need full implementation)
  private calculatePinningForces(optionsData: OptionsChainData, priceData: PriceBar[], pinningRisk: DetailedPinningRisk): PinningForces {
    return {} as any; // Simplified for brevity
  }

  private analyzeTemporalPinningEffects(optionsData: OptionsChainData, pinningRisk: DetailedPinningRisk): TemporalPinningEffects {
    return {} as any; // Simplified for brevity
  }

  private generatePinningScenarios(pinningRisk: DetailedPinningRisk, mechanics: PinningMechanics, temporal: TemporalPinningEffects): PinningScenario[] {
    return []; // Simplified for brevity
  }

  private analyzePinBreakoutPotential(pinningRisk: DetailedPinningRisk, mechanics: PinningMechanics, priceData: PriceBar[]): PinBreakoutAnalysis {
    return {
      breakoutProbability: 0.3,
      breakoutDirection: 'EITHER',
      breakoutMagnitude: 0.05,
      breakoutTriggers: [],
      breakoutLevels: [],
      sustainabilityScore: 0.5,
      falseBreakoutRisk: 0.4
    };
  }

  private generatePinningTradingImplications(pinningRisk: DetailedPinningRisk, breakout: PinBreakoutAnalysis, temporal: TemporalPinningEffects): PinningTradingImplications {
    return {
      strategy: 'Range trading around pin levels',
      entryLevels: [],
      exitLevels: [],
      stopLevels: [],
      positionSizing: 'Conservative',
      timeframe: 'Short-term',
      riskFactors: [],
      opportunityScore: 0.5
    };
  }

  private analyzeZoneInteractions(zones: DetailedAccelerationZone[]): ZoneInteraction[] {
    return []; // Simplified for brevity
  }

  private analyzeAccelerationMechanics(optionsData: OptionsChainData, priceData: PriceBar[], zones: DetailedAccelerationZone[]): AccelerationMechanics {
    return {} as any; // Simplified for brevity
  }

  private performTriggerAnalysis(zones: DetailedAccelerationZone[], priceData: PriceBar[], optionsData: OptionsChainData): TriggerAnalysis {
    return {
      primaryTriggers: [],
      secondaryTriggers: [],
      triggerCombinations: [],
      triggerProbabilities: []
    };
  }

  private calculateMomentumProfile(priceData: PriceBar[], zones: DetailedAccelerationZone[]): MomentumProfile {
    const momentum = this.calculateMomentumStrength(priceData.slice(-10));
    
    return {
      currentMomentum: momentum,
      momentumDirection: momentum > 0 ? 'BULLISH' : momentum < 0 ? 'BEARISH' : 'NEUTRAL',
      momentumStrength: Math.abs(momentum),
      momentumQuality: Math.abs(momentum) > 0.5 ? 'HIGH' : Math.abs(momentum) > 0.2 ? 'MEDIUM' : 'LOW',
      momentumSustainability: Math.min(1, Math.abs(momentum) * 2),
      momentumCatalysts: [],
      momentumRisks: []
    };
  }

  private generateAccelerationTradingImplications(zones: DetailedAccelerationZone[], triggers: TriggerAnalysis, momentum: MomentumProfile): AccelerationTradingImplications {
    return {
      primaryStrategy: 'Momentum acceleration strategy',
      alternativeStrategies: [],
      entryTriggers: [],
      exitTriggers: [],
      stopLossLevels: [],
      profitTargets: [],
      positionSizing: 'Moderate',
      timeframe: 'Short-term',
      riskManagement: [],
      opportunityRanking: 5
    };
  }

  // Implementation methods for gamma flip and volatility analysis
  
  /**
   * Calculate multiple gamma flip levels using different methodologies
   */
  private calculateMultipleGammaFlips(optionsData: OptionsChainData, currentPrice: number): { primary: GammaFlipLevel | null, secondary: GammaFlipLevel[] } {
    const flipLevels: GammaFlipLevel[] = [];
    
    // Method 1: Net gamma zero crossing
    const zeroGammaFlip = this.findZeroGammaLevel(optionsData, currentPrice);
    if (zeroGammaFlip) flipLevels.push(zeroGammaFlip);
    
    // Method 2: Maximum gamma change rate
    const maxChangeFlip = this.findMaxGammaChangeLevel(optionsData, currentPrice);
    if (maxChangeFlip) flipLevels.push(maxChangeFlip);
    
    // Method 3: Weighted gamma flip (by open interest)
    const weightedFlip = this.findWeightedGammaFlip(optionsData, currentPrice);
    if (weightedFlip) flipLevels.push(weightedFlip);
    
    // Sort by proximity to current price
    flipLevels.sort((a, b) => a.proximity - b.proximity);
    
    return {
      primary: flipLevels.length > 0 ? flipLevels[0] : null,
      secondary: flipLevels.slice(1, 4) // Up to 3 secondary levels
    };
  }

  private findZeroGammaLevel(optionsData: OptionsChainData, currentPrice: number): GammaFlipLevel | null {
    const priceRange = currentPrice * 0.15; // ±15% range
    const priceStep = currentPrice * 0.002; // 0.2% steps
    
    let prevGamma = this.calculateNetGammaExposure(optionsData, currentPrice - priceRange);
    
    for (let price = currentPrice - priceRange + priceStep; price <= currentPrice + priceRange; price += priceStep) {
      const currGamma = this.calculateNetGammaExposure(optionsData, price);
      
      // Check for zero crossing
      if ((prevGamma > 0 && currGamma < 0) || (prevGamma < 0 && currGamma > 0)) {
        const flipLevel = this.interpolateGammaFlip(price - priceStep, price, prevGamma, currGamma);
        
        return {
          level: Number(flipLevel.toFixed(2)),
          confidence: this.calculateFlipConfidence(Math.abs(prevGamma - currGamma), optionsData),
          gammaChange: Math.abs(prevGamma - currGamma),
          proximity: Math.abs(flipLevel - currentPrice) / currentPrice,
          significance: this.determineFlipSignificance(Math.abs(prevGamma - currGamma)),
          timeframe: this.determineFlipTimeframe(Math.abs(flipLevel - currentPrice) / currentPrice),
          triggerVolume: this.calculateTriggerVolume(flipLevel, optionsData)
        };
      }
      
      prevGamma = currGamma;
    }
    
    return null;
  }

  private findMaxGammaChangeLevel(optionsData: OptionsChainData, currentPrice: number): GammaFlipLevel | null {
    const priceRange = currentPrice * 0.1; // ±10% range
    const priceStep = currentPrice * 0.005; // 0.5% steps
    
    let maxChangeRate = 0;
    let maxChangeLevel = currentPrice;
    
    for (let price = currentPrice - priceRange; price <= currentPrice + priceRange; price += priceStep) {
      const gamma1 = this.calculateNetGammaExposure(optionsData, price - priceStep);
      const gamma2 = this.calculateNetGammaExposure(optionsData, price + priceStep);
      const changeRate = Math.abs(gamma2 - gamma1) / (2 * priceStep);
      
      if (changeRate > maxChangeRate) {
        maxChangeRate = changeRate;
        maxChangeLevel = price;
      }
    }
    
    if (maxChangeRate > 0.001) { // Minimum threshold for significance
      return {
        level: Number(maxChangeLevel.toFixed(2)),
        confidence: Math.min(0.9, maxChangeRate * 1000),
        gammaChange: maxChangeRate,
        proximity: Math.abs(maxChangeLevel - currentPrice) / currentPrice,
        significance: this.determineFlipSignificance(maxChangeRate),
        timeframe: this.determineFlipTimeframe(Math.abs(maxChangeLevel - currentPrice) / currentPrice),
        triggerVolume: this.calculateTriggerVolume(maxChangeLevel, optionsData)
      };
    }
    
    return null;
  }

  private findWeightedGammaFlip(optionsData: OptionsChainData, currentPrice: number): GammaFlipLevel | null {
    // Find flip level weighted by open interest concentration
    const strikes = [...new Set([
      ...optionsData.calls.map(c => c.strike),
      ...optionsData.puts.map(p => p.strike)
    ])].sort((a, b) => a - b);
    
    let bestFlipLevel: number | null = null;
    let bestScore = 0;
    
    for (const strike of strikes) {
      if (Math.abs(strike - currentPrice) / currentPrice > 0.1) continue; // Within 10%
      
      const gammaAtStrike = this.calculateNetGammaExposure(optionsData, strike);
      const gammaAbove = this.calculateNetGammaExposure(optionsData, strike * 1.01);
      const gammaBelow = this.calculateNetGammaExposure(optionsData, strike * 0.99);
      
      // Check for sign change around this strike
      if ((gammaBelow > 0 && gammaAbove < 0) || (gammaBelow < 0 && gammaAbove > 0)) {
        const openInterest = this.getOpenInterestAtStrike(optionsData, strike);
        const score = Math.abs(gammaAbove - gammaBelow) * Math.log(openInterest + 1);
        
        if (score > bestScore) {
          bestScore = score;
          bestFlipLevel = strike;
        }
      }
    }
    
    if (bestFlipLevel) {
      const gammaChange = Math.abs(
        this.calculateNetGammaExposure(optionsData, bestFlipLevel * 1.01) -
        this.calculateNetGammaExposure(optionsData, bestFlipLevel * 0.99)
      );
      
      return {
        level: Number(bestFlipLevel.toFixed(2)),
        confidence: Math.min(0.95, bestScore / 1000),
        gammaChange,
        proximity: Math.abs(bestFlipLevel - currentPrice) / currentPrice,
        significance: this.determineFlipSignificance(gammaChange),
        timeframe: this.determineFlipTimeframe(Math.abs(bestFlipLevel - currentPrice) / currentPrice),
        triggerVolume: this.calculateTriggerVolume(bestFlipLevel, optionsData)
      };
    }
    
    return null;
  }

  private identifyCriticalGammaLevels(optionsData: OptionsChainData, currentPrice: number): CriticalGammaLevel[] {
    const levels: CriticalGammaLevel[] = [];
    const priceRange = currentPrice * 0.2; // ±20% range
    const priceStep = currentPrice * 0.01; // 1% steps
    
    let maxGamma = -Infinity;
    let minGamma = Infinity;
    let maxGammaLevel = currentPrice;
    let minGammaLevel = currentPrice;
    
    // Find max and min gamma levels
    for (let price = currentPrice - priceRange; price <= currentPrice + priceRange; price += priceStep) {
      const gamma = this.calculateNetGammaExposure(optionsData, price);
      
      if (gamma > maxGamma) {
        maxGamma = gamma;
        maxGammaLevel = price;
      }
      
      if (gamma < minGamma) {
        minGamma = gamma;
        minGammaLevel = price;
      }
    }
    
    // Add max gamma level
    if (Math.abs(maxGamma) > 0.01) {
      levels.push({
        level: Number(maxGammaLevel.toFixed(2)),
        type: 'MAX_GAMMA',
        strength: Math.min(1, Math.abs(maxGamma) * 10),
        marketImpact: this.calculateLevelMarketImpact(maxGammaLevel, optionsData),
        hedgingPressure: this.calculateLevelHedgingPressure(maxGammaLevel, optionsData)
      });
    }
    
    // Add min gamma level
    if (Math.abs(minGamma) > 0.01) {
      levels.push({
        level: Number(minGammaLevel.toFixed(2)),
        type: 'MIN_GAMMA',
        strength: Math.min(1, Math.abs(minGamma) * 10),
        marketImpact: this.calculateLevelMarketImpact(minGammaLevel, optionsData),
        hedgingPressure: this.calculateLevelHedgingPressure(minGammaLevel, optionsData)
      });
    }
    
    // Find inflection points (where gamma derivative changes sign)
    for (let price = currentPrice - priceRange + priceStep; price <= currentPrice + priceRange - priceStep; price += priceStep) {
      const gamma1 = this.calculateNetGammaExposure(optionsData, price - priceStep);
      const gamma2 = this.calculateNetGammaExposure(optionsData, price);
      const gamma3 = this.calculateNetGammaExposure(optionsData, price + priceStep);
      
      const derivative1 = gamma2 - gamma1;
      const derivative2 = gamma3 - gamma2;
      
      // Check for inflection point
      if ((derivative1 > 0 && derivative2 < 0) || (derivative1 < 0 && derivative2 > 0)) {
        levels.push({
          level: Number(price.toFixed(2)),
          type: 'INFLECTION_POINT',
          strength: Math.min(1, Math.abs(derivative1 - derivative2) * 100),
          marketImpact: this.calculateLevelMarketImpact(price, optionsData),
          hedgingPressure: this.calculateLevelHedgingPressure(price, optionsData)
        });
      }
    }
    
    return levels.sort((a, b) => b.strength - a.strength).slice(0, 5); // Top 5 levels
  }

  private calculateFlipSensitivity(optionsData: OptionsChainData, currentPrice: number): FlipSensitivity {
    const baseGamma = this.calculateNetGammaExposure(optionsData, currentPrice);
    
    // Price move sensitivity
    const priceShock = currentPrice * 0.01; // 1% price shock
    const gammaAfterPriceShock = this.calculateNetGammaExposure(optionsData, currentPrice + priceShock);
    const priceMoveSensitivity = Math.abs(gammaAfterPriceShock - baseGamma) / Math.abs(priceShock);
    
    // Time sensitivity (simplified - would need actual time decay calculation)
    const timeSensitivity = this.estimateTimeSensitivity(optionsData);
    
    // Volatility sensitivity (simplified)
    const volatilitySensitivity = this.estimateVolatilitySensitivity(optionsData);
    
    const overallSensitivity = (priceMoveSensitivity + timeSensitivity + volatilitySensitivity) / 3;
    const stabilityScore = 1 - Math.min(1, overallSensitivity);
    
    return {
      priceMoveSensitivity: Number(priceMoveSensitivity.toFixed(6)),
      timeSensitivity: Number(timeSensitivity.toFixed(3)),
      volatilitySensitivity: Number(volatilitySensitivity.toFixed(3)),
      overallSensitivity: Number(overallSensitivity.toFixed(3)),
      stabilityScore: Number(stabilityScore.toFixed(3))
    };
  }

  private calculateFlipProbability(flipLevels: { primary: GammaFlipLevel | null, secondary: GammaFlipLevel[] }, priceData: PriceBar[]): FlipProbability {
    if (!flipLevels.primary) {
      return {
        reachProbability: 0,
        crossProbability: 0,
        sustainProbability: 0,
        timeframe: 'UNKNOWN',
        confidenceInterval: { lower: 0, upper: 0 }
      };
    }
    
    const flipLevel = flipLevels.primary.level;
    const currentPrice = priceData[priceData.length - 1].close;
    const distance = Math.abs(flipLevel - currentPrice) / currentPrice;
    
    // Calculate historical volatility
    const volatility = this.calculateRealizedVolatility(priceData, 20);
    
    // Probability calculations based on distance and volatility
    const reachProbability = Math.exp(-distance / (volatility * Math.sqrt(30))); // 30-day horizon
    const crossProbability = reachProbability * 0.7; // Assume 70% chance of crossing if reached
    const sustainProbability = crossProbability * 0.6; // Assume 60% chance of sustaining
    
    // Estimate timeframe
    const expectedDays = distance / (volatility / Math.sqrt(252));
    let timeframe: string;
    if (expectedDays <= 5) timeframe = 'IMMEDIATE (1-5 days)';
    else if (expectedDays <= 15) timeframe = 'SHORT_TERM (5-15 days)';
    else if (expectedDays <= 45) timeframe = 'MEDIUM_TERM (15-45 days)';
    else timeframe = 'LONG_TERM (45+ days)';
    
    return {
      reachProbability: Number(reachProbability.toFixed(3)),
      crossProbability: Number(crossProbability.toFixed(3)),
      sustainProbability: Number(sustainProbability.toFixed(3)),
      timeframe,
      confidenceInterval: {
        lower: Number((reachProbability * 0.7).toFixed(3)),
        upper: Number((reachProbability * 1.3).toFixed(3))
      }
    };
  }

  private assessFlipImpact(flipLevels: { primary: GammaFlipLevel | null, secondary: GammaFlipLevel[] }, optionsData: OptionsChainData, currentPrice: number): FlipImpact {
    if (!flipLevels.primary) {
      return {
        priceImpact: 0,
        volatilityImpact: 0,
        liquidityImpact: 0,
        momentumChange: 0,
        trendReversal: 0,
        accelerationPotential: 0
      };
    }
    
    const flipLevel = flipLevels.primary.level;
    const gammaChange = flipLevels.primary.gammaChange;
    
    // Price impact based on gamma change magnitude
    const priceImpact = Math.min(0.1, gammaChange * 0.5); // Cap at 10%
    
    // Volatility impact
    const volatilityImpact = Math.min(0.5, gammaChange * 2);
    
    // Liquidity impact
    const liquidityImpact = Math.min(0.3, gammaChange * 1.5);
    
    // Momentum change
    const momentumChange = Math.min(0.8, gammaChange * 3);
    
    // Trend reversal probability
    const trendReversal = Math.min(0.6, gammaChange * 2);
    
    // Acceleration potential
    const accelerationPotential = Math.min(0.9, gammaChange * 4);
    
    return {
      priceImpact: Number(priceImpact.toFixed(3)),
      volatilityImpact: Number(volatilityImpact.toFixed(3)),
      liquidityImpact: Number(liquidityImpact.toFixed(3)),
      momentumChange: Number(momentumChange.toFixed(3)),
      trendReversal: Number(trendReversal.toFixed(3)),
      accelerationPotential: Number(accelerationPotential.toFixed(3))
    };
  }

  private calculateSuppressionMetrics(optionsData: OptionsChainData, priceData: PriceBar[], currentPrice: number): SuppressionMetrics {
    const realizedVol = this.calculateRealizedVolatility(priceData, 20);
    const impliedVol = this.calculateExpectedVolatility(optionsData);
    const netGamma = this.calculateNetGammaExposure(optionsData, currentPrice);
    
    const realizedVsImplied = realizedVol / (impliedVol || 0.2);
    const volGap = Math.max(0, impliedVol - realizedVol);
    
    // Suppression level based on vol gap and gamma positioning
    const suppressionLevel = netGamma > 0 ? Math.min(1, volGap / impliedVol + Math.abs(netGamma) * 0.5) : 0;
    
    // Suppression strength
    const suppressionStrength = Math.min(1, suppressionLevel * (1 + Math.abs(netGamma)));
    
    // Suppression persistence (how long it's been suppressed)
    const suppressionPersistence = this.calculateSuppressionPersistence(priceData);
    
    // Gamma contribution to suppression
    const gammaContribution = netGamma > 0 ? Math.min(1, Math.abs(netGamma) * 2) : 0;
    
    // Time decay effect
    const timeDecayEffect = this.calculateTimeDecayEffect(optionsData);
    
    return {
      suppressionLevel: Number(suppressionLevel.toFixed(3)),
      suppressionStrength: Number(suppressionStrength.toFixed(3)),
      suppressionPersistence: Number(suppressionPersistence.toFixed(3)),
      realizedVsImplied: Number(realizedVsImplied.toFixed(3)),
      volGap: Number(volGap.toFixed(4)),
      gammaContribution: Number(gammaContribution.toFixed(3)),
      timeDecayEffect: Number(timeDecayEffect.toFixed(3))
    };
  }

  private classifyVolatilityRegime(suppressionMetrics: SuppressionMetrics, priceData: PriceBar[]): VolatilityRegime {
    const currentVol = this.calculateRealizedVolatility(priceData, 10);
    const longerTermVol = this.calculateRealizedVolatility(priceData, 60);
    
    let currentRegime: 'SUPPRESSED' | 'NORMAL' | 'ELEVATED' | 'EXTREME' | 'TRANSITIONAL';
    
    if (suppressionMetrics.suppressionLevel > 0.6) {
      currentRegime = 'SUPPRESSED';
    } else if (currentVol > longerTermVol * 1.5) {
      currentRegime = 'EXTREME';
    } else if (currentVol > longerTermVol * 1.2) {
      currentRegime = 'ELEVATED';
    } else if (Math.abs(currentVol - longerTermVol) / longerTermVol < 0.1) {
      currentRegime = 'NORMAL';
    } else {
      currentRegime = 'TRANSITIONAL';
    }
    
    const regimeStrength = this.calculateRegimeStrength(currentRegime, suppressionMetrics, currentVol, longerTermVol);
    const regimeStability = this.calculateRegimeStability(priceData);
    const historicalPercentile = this.calculateVolatilityPercentile(currentVol, priceData);
    const regimeDuration = this.estimateRegimeDuration(currentRegime, priceData);
    
    return {
      currentRegime,
      regimeStrength: Number(regimeStrength.toFixed(3)),
      regimeStability: Number(regimeStability.toFixed(3)),
      historicalPercentile: Number(historicalPercentile.toFixed(1)),
      regimeDuration
    };
  }

  private analyzeBreakoutPotential(suppressionMetrics: SuppressionMetrics, optionsData: OptionsChainData, priceData: PriceBar[]): BreakoutAnalysis {
    // Higher suppression = higher breakout potential
    const breakoutProbability = Math.min(0.9, suppressionMetrics.suppressionLevel * 0.8 + suppressionMetrics.suppressionPersistence * 0.2);
    
    // Expected magnitude based on vol gap
    const breakoutMagnitude = Math.min(2.0, suppressionMetrics.volGap * 5);
    
    // Timeframe estimation
    let breakoutTimeframe: string;
    if (suppressionMetrics.suppressionLevel > 0.8) {
      breakoutTimeframe = 'IMMEDIATE (1-3 days)';
    } else if (suppressionMetrics.suppressionLevel > 0.6) {
      breakoutTimeframe = 'SHORT_TERM (3-10 days)';
    } else {
      breakoutTimeframe = 'MEDIUM_TERM (10-30 days)';
    }
    
    // Identify potential triggers
    const breakoutTriggers = this.identifyBreakoutTriggers(suppressionMetrics, optionsData);
    
    // Identify breakout levels
    const breakoutLevels = this.identifyBreakoutLevels(optionsData, priceData);
    
    // Sustainability score
    const sustainabilityScore = Math.min(1, breakoutProbability * (1 - suppressionMetrics.timeDecayEffect));
    
    return {
      breakoutProbability: Number(breakoutProbability.toFixed(3)),
      breakoutMagnitude: Number(breakoutMagnitude.toFixed(2)),
      breakoutTimeframe,
      breakoutTriggers,
      breakoutLevels,
      sustainabilityScore: Number(sustainabilityScore.toFixed(3))
    };
  }

  // Helper methods for calculations
  private determineFlipSignificance(gammaChange: number): 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' {
    if (gammaChange > 0.1) return 'CRITICAL';
    if (gammaChange > 0.05) return 'HIGH';
    if (gammaChange > 0.02) return 'MODERATE';
    return 'LOW';
  }

  private determineFlipTimeframe(proximity: number): 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' {
    if (proximity < 0.02) return 'IMMEDIATE';
    if (proximity < 0.05) return 'SHORT_TERM';
    return 'MEDIUM_TERM';
  }

  private calculateFlipConfidence(gammaChange: number, optionsData: OptionsChainData): number {
    const baseConfidence = Math.min(0.9, gammaChange * 10);
    const volumeBoost = Math.min(0.1, this.getTotalVolume(optionsData) / 100000);
    return Math.min(0.95, baseConfidence + volumeBoost);
  }

  private calculateTriggerVolume(level: number, optionsData: OptionsChainData): number {
    const nearbyOI = this.getOpenInterestNearLevel(optionsData, level, 0.02);
    return Math.round(nearbyOI * 0.1); // Estimate 10% of nearby OI needed
  }

  private getOpenInterestAtStrike(optionsData: OptionsChainData, strike: number): number {
    const calls = optionsData.calls.filter(c => Math.abs(c.strike - strike) < 0.01);
    const puts = optionsData.puts.filter(p => Math.abs(p.strike - strike) < 0.01);
    
    const callOI = calls.reduce((sum, c) => sum + c.openInterest, 0);
    const putOI = puts.reduce((sum, p) => sum + p.openInterest, 0);
    
    return callOI + putOI;
  }

  private getOpenInterestNearLevel(optionsData: OptionsChainData, level: number, threshold: number): number {
    const allContracts = [...optionsData.calls, ...optionsData.puts];
    return allContracts
      .filter(contract => Math.abs(contract.strike - level) / level <= threshold)
      .reduce((sum, contract) => sum + contract.openInterest, 0);
  }

  private getTotalVolume(optionsData: OptionsChainData): number {
    const allContracts = [...optionsData.calls, ...optionsData.puts];
    return allContracts.reduce((sum, contract) => sum + contract.volume, 0);
  }

  private calculateLevelMarketImpact(level: number, optionsData: OptionsChainData): number {
    const openInterest = this.getOpenInterestNearLevel(optionsData, level, 0.01);
    return Math.min(1, openInterest / 50000); // Normalize to 0-1
  }

  private calculateLevelHedgingPressure(level: number, optionsData: OptionsChainData): number {
    const gamma = Math.abs(this.calculateNetGammaExposure(optionsData, level));
    return Math.min(1, gamma * 10);
  }

  private estimateTimeSensitivity(optionsData: OptionsChainData): number {
    // Simplified time sensitivity based on average time to expiry
    const avgTimeToExpiry = this.calculateAverageTimeToExpiry(optionsData);
    return Math.max(0.1, Math.min(1, 30 / avgTimeToExpiry)); // Higher sensitivity for shorter expiries
  }

  private estimateVolatilitySensitivity(optionsData: OptionsChainData): number {
    // Simplified volatility sensitivity based on average vega
    const avgVega = this.calculateAverageVega(optionsData);
    return Math.min(1, avgVega * 100);
  }

  private calculateAverageTimeToExpiry(optionsData: OptionsChainData): number {
    const allContracts = [...optionsData.calls, ...optionsData.puts];
    const now = new Date();
    
    const avgTime = allContracts.reduce((sum, contract) => {
      const daysToExpiry = (contract.expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return sum + daysToExpiry;
    }, 0) / allContracts.length;
    
    return avgTime;
  }

  private calculateAverageVega(optionsData: OptionsChainData): number {
    const allContracts = [...optionsData.calls, ...optionsData.puts];
    return allContracts.reduce((sum, contract) => sum + contract.vega, 0) / allContracts.length;
  }

  private calculateSuppressionPersistence(priceData: PriceBar[]): number {
    // Calculate how long volatility has been below average
    const shortVol = this.calculateRealizedVolatility(priceData.slice(-10), 9);
    const longVol = this.calculateRealizedVolatility(priceData.slice(-60), 59);
    
    if (shortVol < longVol * 0.8) {
      return Math.min(1, (longVol - shortVol) / longVol * 2);
    }
    return 0;
  }

  private calculateTimeDecayEffect(optionsData: OptionsChainData): number {
    const avgTheta = this.calculateAverageTheta(optionsData);
    return Math.min(1, Math.abs(avgTheta) * 100);
  }

  private calculateAverageTheta(optionsData: OptionsChainData): number {
    const allContracts = [...optionsData.calls, ...optionsData.puts];
    return allContracts.reduce((sum, contract) => sum + contract.theta, 0) / allContracts.length;
  }

  private calculateRegimeStrength(regime: string, suppressionMetrics: SuppressionMetrics, currentVol: number, longerTermVol: number): number {
    switch (regime) {
      case 'SUPPRESSED':
        return suppressionMetrics.suppressionStrength;
      case 'EXTREME':
        return Math.min(1, currentVol / longerTermVol - 1);
      case 'ELEVATED':
        return Math.min(1, (currentVol / longerTermVol - 1) * 2);
      default:
        return 0.5;
    }
  }

  private calculateRegimeStability(priceData: PriceBar[]): number {
    // Calculate stability based on volatility of volatility
    const volOfVol = this.calculateVolatilityOfVolatility(priceData);
    return Math.max(0.1, 1 - volOfVol * 5);
  }

  private calculateVolatilityPercentile(currentVol: number, priceData: PriceBar[]): number {
    // Calculate where current vol stands in historical distribution
    const historicalVols: number[] = [];
    
    for (let i = 20; i < priceData.length; i++) {
      const vol = this.calculateRealizedVolatility(priceData.slice(i - 20, i), 19);
      historicalVols.push(vol);
    }
    
    historicalVols.sort((a, b) => a - b);
    const rank = historicalVols.filter(vol => vol <= currentVol).length;
    
    return (rank / historicalVols.length) * 100;
  }

  private estimateRegimeDuration(regime: string, priceData: PriceBar[]): number {
    // Simplified regime duration estimation
    return Math.floor(Math.random() * 20) + 5; // 5-25 days (placeholder)
  }

  private identifyBreakoutTriggers(suppressionMetrics: SuppressionMetrics, optionsData: OptionsChainData): string[] {
    const triggers: string[] = [];
    
    if (suppressionMetrics.suppressionLevel > 0.7) {
      triggers.push('High volatility suppression reaching breaking point');
    }
    
    if (suppressionMetrics.gammaContribution > 0.6) {
      triggers.push('Gamma positioning creating artificial stability');
    }
    
    if (suppressionMetrics.volGap > 0.05) {
      triggers.push('Large gap between implied and realized volatility');
    }
    
    const nearExpiry = this.calculateTimeToNearestExpiry(optionsData);
    if (nearExpiry <= 5) {
      triggers.push('Approaching major options expiration');
    }
    
    return triggers;
  }

  private identifyBreakoutLevels(optionsData: OptionsChainData, priceData: PriceBar[]): number[] {
    const currentPrice = priceData[priceData.length - 1].close;
    const levels: number[] = [];
    
    // Add levels with high gamma concentration
    const strikes = [...new Set([
      ...optionsData.calls.map(c => c.strike),
      ...optionsData.puts.map(p => p.strike)
    ])];
    
    for (const strike of strikes) {
      const distance = Math.abs(strike - currentPrice) / currentPrice;
      if (distance > 0.02 && distance < 0.1) { // 2-10% away
        const oi = this.getOpenInterestAtStrike(optionsData, strike);
        if (oi > 10000) { // Significant open interest
          levels.push(strike);
        }
      }
    }
    
    return levels.sort((a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice)).slice(0, 5);
  }

  private generateFlipTradingImplications(flipLevels: { primary: GammaFlipLevel | null, secondary: GammaFlipLevel[] }, flipImpact: FlipImpact, currentPrice: number): FlipTradingImplications {
    if (!flipLevels.primary) {
      return {
        entryStrategy: 'No clear gamma flip identified',
        exitStrategy: 'N/A',
        riskManagement: ['Monitor for gamma flip development'],
        positionSizing: 'Conservative',
        timeframe: 'N/A',
        keyLevels: []
      };
    }
    
    const flipLevel = flipLevels.primary.level;
    const isAbove = flipLevel > currentPrice;
    
    return {
      entryStrategy: isAbove ? 
        `Position for upside acceleration above $${flipLevel}` : 
        `Position for downside acceleration below $${flipLevel}`,
      exitStrategy: `Take profits on ${flipImpact.accelerationPotential > 0.7 ? 'strong' : 'moderate'} move through flip level`,
      riskManagement: [
        `Stop loss ${isAbove ? 'below' : 'above'} $${(flipLevel * (isAbove ? 0.98 : 1.02)).toFixed(2)}`,
        'Monitor gamma positioning changes',
        'Watch for volume confirmation at flip level'
      ],
      positionSizing: flipImpact.accelerationPotential > 0.7 ? 'Aggressive' : 'Moderate',
      timeframe: flipLevels.primary.timeframe,
      keyLevels: [flipLevel, ...flipLevels.secondary.map(f => f.level)]
    };
  }

  private generateVolSuppressionTradingImplications(suppressionMetrics: SuppressionMetrics, breakoutAnalysis: BreakoutAnalysis): VolSuppressionTradingImplications {
    const strategy = suppressionMetrics.suppressionLevel > 0.6 ? 
      'Volatility breakout strategy' : 
      'Range trading strategy';
    
    return {
      strategy,
      entryConditions: [
        `Suppression level: ${(suppressionMetrics.suppressionLevel * 100).toFixed(1)}%`,
        `Breakout probability: ${(breakoutAnalysis.breakoutProbability * 100).toFixed(1)}%`,
        'Wait for volume confirmation'
      ],
      exitConditions: [
        'Volatility expansion begins',
        'Gamma positioning changes significantly',
        'Time decay reduces opportunity'
      ],
      riskFactors: [
        'Continued suppression beyond expected timeframe',
        'Gamma positioning changes',
        'Market regime shift'
      ],
      opportunitySize: Number((suppressionMetrics.suppressionLevel * breakoutAnalysis.breakoutProbability).toFixed(2))
    };
  }

  // Default result methods
  private getDefaultGammaFlipResult(ticker: string): GammaFlipAnalysis {
    return {
      ticker,
      timestamp: new Date(),
      currentPrice: 150,
      primaryFlipLevel: null,
      secondaryFlipLevels: [],
      criticalLevels: [],
      flipSensitivity: {
        priceMoveSensitivity: 0,
        timeSensitivity: 0,
        volatilitySensitivity: 0,
        overallSensitivity: 0,
        stabilityScore: 0.5
      },
      flipProbability: {
        reachProbability: 0,
        crossProbability: 0,
        sustainProbability: 0,
        timeframe: 'UNKNOWN',
        confidenceInterval: { lower: 0, upper: 0 }
      },
      flipImpact: {
        priceImpact: 0,
        volatilityImpact: 0,
        liquidityImpact: 0,
        momentumChange: 0,
        trendReversal: 0,
        accelerationPotential: 0
      },
      timeDecayImpact: {
        dailyFlipMovement: 0,
        weeklyFlipMovement: 0,
        expirationImpact: 0,
        thetaInfluence: 0
      },
      expirationEffects: {
        nearestExpiry: new Date(),
        daysToExpiry: 30,
        expirationImpact: 0,
        pinningRisk: 0,
        rolloverEffects: 0
      },
      hedgingImplications: {
        dealerHedgingPressure: 0,
        hedgingDirection: 'NEUTRAL',
        hedgingVolume: 0,
        hedgingTimeframe: 'GRADUAL',
        marketImpact: 0
      },
      liquidityImpact: {
        bidAskImpact: 0,
        marketDepth: 0,
        liquidityRisk: 0,
        tradingCost: 0
      },
      tradingImplications: {
        entryStrategy: 'No clear gamma flip identified',
        exitStrategy: 'N/A',
        riskManagement: ['Monitor for gamma flip development'],
        positionSizing: 'Conservative',
        timeframe: 'N/A',
        keyLevels: []
      }
    };
  }

  private getDefaultVolSuppressionResult(ticker: string): VolatilitySuppressionAnalysis {
    return {
      ticker,
      timestamp: new Date(),
      currentPrice: 150,
      suppressionMetrics: {
        suppressionLevel: 0,
        suppressionStrength: 0,
        suppressionPersistence: 0,
        realizedVsImplied: 1,
        volGap: 0,
        gammaContribution: 0,
        timeDecayEffect: 0
      },
      volatilityRegime: {
        currentRegime: 'NORMAL',
        regimeStrength: 0.5,
        regimeStability: 0.5,
        historicalPercentile: 50,
        regimeDuration: 10
      },
      breakoutAnalysis: {
        breakoutProbability: 0,
        breakoutMagnitude: 0,
        breakoutTimeframe: 'UNKNOWN',
        breakoutTriggers: [],
        breakoutLevels: [],
        sustainabilityScore: 0
      },
      gammaVolRelationship: {
        correlation: 0,
        elasticity: 0,
        lagEffect: 0,
        strengthOfRelationship: 0,
        nonLinearEffects: 0
      },
      volatilityForecast: {
        shortTerm: { expectedVol: 0.2, volRange: { lower: 0.15, upper: 0.25 }, confidence: 0.5, keyDrivers: [] },
        mediumTerm: { expectedVol: 0.2, volRange: { lower: 0.15, upper: 0.25 }, confidence: 0.5, keyDrivers: [] },
        longTerm: { expectedVol: 0.2, volRange: { lower: 0.15, upper: 0.25 }, confidence: 0.5, keyDrivers: [] }
      },
      regimeTransition: {
        transitionProbability: 0,
        mostLikelyRegime: 'NORMAL',
        transitionTimeframe: 'UNKNOWN',
        transitionTriggers: []
      },
      microstructureEffects: {
        bidAskSuppression: 0,
        orderFlowImpact: 0,
        marketMakingEfficiency: 0.5,
        liquidityProvision: 0.5
      },
      dealerBehavior: {
        hedgingFrequency: 0.5,
        hedgingSize: 0.5,
        inventoryManagement: 0.5,
        riskTolerance: 0.5
      },
      tradingImplications: {
        strategy: 'Range trading strategy',
        entryConditions: [],
        exitConditions: [],
        riskFactors: [],
        opportunitySize: 0
      }
    };
  }

  private getDefaultGammaVolForecastResult(ticker: string): GammaVolatilityForecast {
    return {
      ticker,
      timestamp: new Date(),
      currentPrice: 150,
      shortTermForecast: {
        timeframe: '1-5 days',
        baseCase: { expectedVol: 0.2, volRange: { lower: 0.15, upper: 0.25 }, probability: 0.6, keyDrivers: [] },
        bullCase: { expectedVol: 0.25, volRange: { lower: 0.2, upper: 0.3 }, probability: 0.2, keyDrivers: [] },
        bearCase: { expectedVol: 0.15, volRange: { lower: 0.1, upper: 0.2 }, probability: 0.2, keyDrivers: [] },
        gammaInfluence: 0,
        keyRisks: []
      },
      mediumTermForecast: {
        timeframe: '1-4 weeks',
        baseCase: { expectedVol: 0.2, volRange: { lower: 0.15, upper: 0.25 }, probability: 0.6, keyDrivers: [] },
        bullCase: { expectedVol: 0.25, volRange: { lower: 0.2, upper: 0.3 }, probability: 0.2, keyDrivers: [] },
        bearCase: { expectedVol: 0.15, volRange: { lower: 0.1, upper: 0.2 }, probability: 0.2, keyDrivers: [] },
        gammaInfluence: 0,
        keyRisks: []
      },
      longTermForecast: {
        timeframe: '1-3 months',
        baseCase: { expectedVol: 0.2, volRange: { lower: 0.15, upper: 0.25 }, probability: 0.6, keyDrivers: [] },
        bullCase: { expectedVol: 0.25, volRange: { lower: 0.2, upper: 0.3 }, probability: 0.2, keyDrivers: [] },
        bearCase: { expectedVol: 0.15, volRange: { lower: 0.1, upper: 0.2 }, probability: 0.2, keyDrivers: [] },
        gammaInfluence: 0,
        keyRisks: []
      },
      scenarioAnalysis: [],
      stressTests: [],
      forecastConfidence: {
        overallConfidence: 0.5,
        shortTermConfidence: 0.5,
        mediumTermConfidence: 0.5,
        longTermConfidence: 0.5,
        confidenceFactors: [],
        uncertaintyFactors: []
      },
      forecastRisks: [],
      tradingImplications: {
        recommendedStrategy: 'Neutral',
        entryTiming: 'No specific timing',
        positionSizing: 'Conservative',
        hedgingRecommendations: [],
        riskManagement: [],
        profitTargets: []
      }
    };
  }

  // Mock data methods (replace with real data sources)
  private async getOptionsChainData(ticker: string): Promise<OptionsChainData> {
    // Mock options chain data
    const currentPrice = 150;
    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];
    
    // Generate mock options data
    for (let i = -10; i <= 10; i++) {
      const strike = currentPrice + (i * 5);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30); // 30 days out
      
      // Mock call
      calls.push({
        strike,
        expiry,
        bid: Math.max(0.1, currentPrice - strike + 2),
        ask: Math.max(0.2, currentPrice - strike + 2.5),
        last: Math.max(0.15, currentPrice - strike + 2.25),
        volume: Math.floor(Math.random() * 1000),
        openInterest: Math.floor(Math.random() * 5000),
        impliedVolatility: 0.2 + Math.random() * 0.3,
        delta: Math.max(0, Math.min(1, 0.5 + (currentPrice - strike) * 0.01)),
        gamma: Math.exp(-Math.abs(currentPrice - strike) * 0.01) * 0.01,
        theta: -0.05,
        vega: 0.1
      });
      
      // Mock put
      puts.push({
        strike,
        expiry,
        bid: Math.max(0.1, strike - currentPrice + 2),
        ask: Math.max(0.2, strike - currentPrice + 2.5),
        last: Math.max(0.15, strike - currentPrice + 2.25),
        volume: Math.floor(Math.random() * 1000),
        openInterest: Math.floor(Math.random() * 5000),
        impliedVolatility: 0.2 + Math.random() * 0.3,
        delta: Math.max(-1, Math.min(0, -0.5 + (currentPrice - strike) * 0.01)),
        gamma: Math.exp(-Math.abs(currentPrice - strike) * 0.01) * 0.01,
        theta: -0.05,
        vega: 0.1
      });
    }
    
    return {
      calls,
      puts,
      underlyingPrice: currentPrice,
      timestamp: new Date()
    };
  }

  private async getPriceData(ticker: string, timeframe: string, periods: number): Promise<PriceBar[]> {
    // Mock price data
    const data: PriceBar[] = [];
    let price = 150;
    
    for (let i = 0; i < periods; i++) {
      const change = (Math.random() - 0.5) * 4; // ±2% daily moves
      price += change;
      
      const high = price + Math.random() * 2;
      const low = price - Math.random() * 2;
      
      data.push({
        timestamp: new Date(Date.now() - (periods - i) * 24 * 60 * 60 * 1000),
        open: price - change,
        high,
        low,
        close: price,
        volume: Math.floor(Math.random() * 1000000)
      });
    }
    
    return data;
  }

  private getDefaultGammaResult(ticker: string): GammaExposureResult {
    return {
      ticker,
      timestamp: new Date(),
      currentPrice: 150,
      netGammaExposure: 0,
      dealerPositioning: {
        netGamma: 0,
        gammaPercentile: 50,
        positionType: 'NEUTRAL',
        strength: 0,
        flowDirection: 'NEUTRAL',
        concentrationRisk: 0,
        hedgingPressure: 0
      },
      gammaFlipLevel: null,
      volatilityEnvironment: {
        regime: 'NORMAL',
        suppressionLevel: 0,
        expectedVolatility: 0.2,
        realizedVolatility: 0.2,
        volOfVol: 0.1,
        gammaContribution: 0,
        breakoutPotential: 0
      },
      pinningRisk: {
        level: 'LOW',
        primaryPinLevel: null,
        secondaryPinLevels: [],
        pinStrength: 0,
        timeToExpiry: 30,
        openInterestConcentration: 0,
        pinningProbability: 0
      },
      accelerationZones: [],
      confidenceAdjustment: 0,
      marketMakerFlow: {
        netFlow: 0,
        flowIntensity: 0,
        flowPersistence: 0,
        hedgingActivity: 0,
        inventoryRisk: 0,
        bidAskImpact: 0,
        liquidityProvision: 0.5
      },
      gammaImpact: {
        priceImpact: 0,
        volatilityImpact: 0,
        liquidityImpact: 0,
        momentumAmplification: 0,
        reversalRisk: 0,
        trendPersistence: 0.5
      },
      exposureBreakdown: {
        callGamma: 0,
        putGamma: 0,
        netGamma: 0,
        gammaByStrike: [],
        gammaByExpiry: [],
        institutionalGamma: 0,
        retailGamma: 0,
        hedgeFundGamma: 0
      },
      riskMetrics: {
        gammaRisk: 0,
        concentrationRisk: 0,
        liquidityRisk: 0,
        volatilityRisk: 0,
        systemicRisk: 0,
        hedgingRisk: 0
      }
    };
  }
}