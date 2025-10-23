import { EventEmitter } from 'events';

// Core Position Management Interfaces
export interface PositionManagementConfig {
  // Profit Target Configuration
  profitTargets: ProfitTargetConfig;
  
  // Stop Loss Configuration
  stopLosses: StopLossConfig;
  
  // Time-Based Exit Configuration
  timeBasedExits: TimeBasedExitConfig;
  
  // Expiration Handling Configuration
  expirationHandling: ExpirationHandlingConfig;
  
  // Portfolio Heat Management
  portfolioHeatManagement: PortfolioHeatConfig;
  
  // Position Sizing Validation
  positionSizingLimits: PositionSizingLimits;
}

export interface ProfitTargetConfig {
  // Confidence-based profit targets
  highConfidenceTarget: number; // e.g., 150% for confidence > 0.8
  mediumConfidenceTarget: number; // e.g., 100% for confidence 0.6-0.8
  lowConfidenceTarget: number; // e.g., 50% for confidence < 0.6
  
  // Dynamic profit targets
  enableDynamicTargets: boolean;
  trailingStopEnabled: boolean;
  trailingStopDistance: number; // Percentage from peak
  
  // Partial profit taking
  enablePartialProfits: boolean;
  partialProfitLevels: PartialProfitLevel[];
}

export interface PartialProfitLevel {
  profitThreshold: number; // Percentage profit to trigger
  percentageToClose: number; // Percentage of position to close
  description: string;
}

export interface StopLossConfig {
  // Confidence-based stop losses
  highConfidenceStopLoss: number; // e.g., -30% for confidence > 0.8
  mediumConfidenceStopLoss: number; // e.g., -40% for confidence 0.6-0.8
  lowConfidenceStopLoss: number; // e.g., -50% for confidence < 0.6
  
  // Time-based stop loss tightening
  enableTimeBasedTightening: boolean;
  tighteningSchedule: StopLossTighteningSchedule[];
  
  // Greeks-based stop losses
  enableGreeksBasedStops: boolean;
  deltaStopThreshold: number; // Close if delta drops below threshold
  thetaStopThreshold: number; // Close if theta decay exceeds threshold
}

export interface StopLossTighteningSchedule {
  daysToExpiration: number;
  stopLossPercentage: number;
  description: string;
}

export interface TimeBasedExitConfig {
  // Days to expiration exits
  enableDteExits: boolean;
  dteExitThresholds: DteExitThreshold[];
  
  // Holding period exits
  enableHoldingPeriodExits: boolean;
  maxHoldingPeriodHours: number;
  
  // Intraday exits
  enableIntradayExits: boolean;
  intradayExitTime: string; // e.g., "15:30" for 3:30 PM ET
  
  // Weekend/Holiday exits
  enableWeekendExits: boolean;
  enableHolidayExits: boolean;
}

export interface DteExitThreshold {
  daysToExpiration: number;
  exitCondition: 'ALWAYS' | 'IF_LOSING' | 'IF_THETA_HIGH';
  description: string;
}

export interface ExpirationHandlingConfig {
  // Expiration day handling
  enableExpirationDayExit: boolean;
  expirationExitTime: string; // e.g., "15:00" for 3:00 PM ET
  
  // Intrinsic value settlement
  enableIntrinsicValueSettlement: boolean;
  intrinsicValueThreshold: number; // Minimum intrinsic value to exercise
  
  // Assignment risk management
  enableAssignmentRiskManagement: boolean;
  assignmentRiskThreshold: number; // Delta threshold for assignment risk
  
  // Auto-exercise handling
  autoExerciseThreshold: number; // Intrinsic value threshold for auto-exercise
}

export interface PortfolioHeatConfig {
  // Heat thresholds
  maxPortfolioHeat: number; // e.g., 0.20 for 20%
  warningHeatLevel: number; // e.g., 0.15 for 15%
  
  // Heat reduction strategies
  enableHeatReduction: boolean;
  heatReductionStrategies: HeatReductionStrategy[];
  
  // Correlation limits
  enableCorrelationLimits: boolean;
  maxTickerConcentration: number; // e.g., 0.30 for 30%
  maxSectorConcentration: number; // e.g., 0.40 for 40%
}

export interface HeatReductionStrategy {
  heatThreshold: number;
  action: 'CLOSE_WORST_PERFORMERS' | 'REDUCE_POSITION_SIZES' | 'HALT_NEW_TRADES';
  reductionPercentage: number;
  description: string;
}

export interface PositionSizingLimits {
  // Per-trade limits
  maxRiskPerTrade: number; // e.g., 0.02 for 2%
  maxPositionSize: number; // e.g., 0.05 for 5%
  
  // Confidence-based sizing
  enableConfidenceBasedSizing: boolean;
  confidenceSizeMultipliers: ConfidenceSizeMultiplier[];
  
  // Greeks-based sizing limits
  enableGreeksBasedLimits: boolean;
  maxDeltaExposure: number;
  maxGammaExposure: number;
  maxThetaExposure: number;
  maxVegaExposure: number;
}

export interface ConfidenceSizeMultiplier {
  confidenceMin: number;
  confidenceMax: number;
  sizeMultiplier: number;
  description: string;
}

// Position Management Actions
export interface PositionAction {
  actionId: string;
  positionId: string;
  actionType: PositionActionType;
  actionReason: string;
  actionDetails: PositionActionDetails;
  timestamp: Date;
  executed: boolean;
  executionResult?: PositionActionResult;
}

export type PositionActionType = 
  | 'PROFIT_TARGET_EXIT'
  | 'STOP_LOSS_EXIT'
  | 'TIME_BASED_EXIT'
  | 'EXPIRATION_EXIT'
  | 'HEAT_REDUCTION_EXIT'
  | 'PARTIAL_PROFIT_TAKING'
  | 'TRAILING_STOP_EXIT'
  | 'GREEKS_BASED_EXIT'
  | 'ASSIGNMENT_RISK_EXIT'
  | 'INTRINSIC_VALUE_SETTLEMENT';

export interface PositionActionDetails {
  exitPrice?: number;
  percentageToClose: number; // 100% for full close, less for partial
  triggerValue: number; // The value that triggered the action
  triggerThreshold: number; // The threshold that was crossed
  additionalInfo?: Record<string, any>;
}

export interface PositionActionResult {
  success: boolean;
  executedPrice: number;
  executedQuantity: number;
  executionTime: Date;
  pnlRealized: number;
  errorMessage?: string;
}

// Position data interface (from previous implementations)
export interface MultiTickerPaperPosition {
  id: string;
  ticker: string;
  optionSymbol: string;
  type: 'CALL' | 'PUT';
  strike: number;
  expiration: Date;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  entryTimestamp: Date;
  exitTimestamp?: Date;
  exitPrice?: number;
  status: 'OPEN' | 'CLOSED' | 'EXPIRED';
  pnl: number;
  pnlPercent: number;
  maxFavorableExcursion: number;
  maxAdverseExcursion: number;
  confidence: number;
  expectedMove: number;
  signalId: string;
  
  // Enhanced Greeks tracking
  entryGreeks: OptionsGreeks;
  currentGreeks: OptionsGreeks;
  
  // Position management tracking
  profitTargetHit?: boolean;
  stopLossHit?: boolean;
  trailingStopPrice?: number;
  partialProfitsTaken?: PartialProfitRecord[];
}

export interface OptionsGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  impliedVolatility: number;
}

export interface PartialProfitRecord {
  timestamp: Date;
  profitLevel: number;
  quantityClosed: number;
  priceAtClose: number;
  pnlRealized: number;
}

export interface MarketDataUpdate {
  ticker: string;
  underlyingPrice: number;
  optionsPrices: Map<string, number>;
  impliedVolatilities: Map<string, number>;
  timestamp: Date;
}

export interface PortfolioHeatStatus {
  currentHeat: number;
  warningLevel: boolean;
  criticalLevel: boolean;
  heatByTicker: Map<string, number>;
  correlationRisk: number;
  concentrationRisk: number;
  recommendedActions: string[];
}/
**
 * Automated Position Management System for Gamma Adaptive Trading
 * 
 * Implements automated pr