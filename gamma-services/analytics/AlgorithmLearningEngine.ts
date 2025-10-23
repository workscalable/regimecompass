import { EventBus } from '../core/EventBus';
import { DatabaseManager } from '../database/DatabaseManager';
import { PaperPosition, TradeAnalysis, MarketRegime, SignalSource } from '../models/PaperTradingTypes';
import { logger, createLogger } from '../logging/Logger';
// Performance monitoring removed for now

export interface TradeOutcomeAnalysis {
  signalId: string;
  ticker: string;
  predictedConfidence: number;
  actualOutcome: 'WIN' | 'LOSS';
  actualOutcomeValue: number; // 1 for win, 0 for loss
  pnl: number;
  pnlPercent: number;
  holdingPeriod: number; // in hours
  marketRegime: MarketRegime;
  signalSource: SignalSource;
  exitReason: string;
  predictionError: number; // |predicted - actual|
  calibrationScore: number; // Brier score component
  timestamp: Date;
}

export interface ConfidenceCalibration {
  confidenceRange: string; // e.g., "0.8-0.9"
  minConfidence: number;
  maxConfidence: number;
  totalTrades: number;
  actualWinRate: number;
  expectedWinRate: number; // Average confidence in range
  calibrationError: number; // actualWinRate - expectedWinRate
  recommendedAdjustment: number; // Bounded to ±0.2
  reliability: number; // How consistent the calibration is
  lastUpdated: Date;
}

export interface SignalPattern {
  patternId: string;
  signalType: string; // 'trend', 'momentum', 'volume', etc.
  patternDescription: string;
  conditions: Record<string, any>; // Pattern matching conditions
  historicalPerformance: {
    totalOccurrences: number;
    successfulTrades: number;
    successRate: number;
    averagePnL: number;
    averageHoldingPeriod: number;
  };
  effectiveness: number; // 0-1 score
  recommendedWeight: number; // Suggested weight in signal calculation
  confidence: number; // How confident we are in this pattern
  lastSeen: Date;
  createdAt: Date;
}

export interface SignalEffectivenessWeighting {
  signalType: string;
  currentWeight: number;
  recommendedWeight: number;
  effectiveness: number;
  totalContributions: number;
  successfulContributions: number;
  averageContribution: number;
  weightAdjustment: number; // Bounded adjustment
  lastCalibrated: Date;
}

export interface LearningInsight {
  id: string;
  category: 'CONFIDENCE_CALIBRATION' | 'SIGNAL_EFFECTIVENESS' | 'PATTERN_RECOGNITION' | 'MARKET_REGIME' | 'RISK_MANAGEMENT';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
  recommendation: string;
  supportingData: any;
  confidence: number; // How confident we are in this insight
  priority: number; // 1-10, higher = more important
  generatedAt: Date;
  implementedAt?: Date;
  status: 'PENDING' | 'IMPLEMENTED' | 'REJECTED';
}

export interface AlgorithmLearningConfig {
  // Analysis settings
  minTradesForCalibration: number; // Default: 20
  calibrationUpdateFrequency: number; // Hours, default: 24
  maxCalibrationAdjustment: number; // Default: 0.2 (±20%)
  
  // Pattern recognition settings
  minPatternOccurrences: number; // Default: 5
  patternConfidenceThreshold: number; // Default: 0.7
  
  // Signal weighting settings
  weightAdjustmentRate: number; // Default: 0.1 (10% max adjustment per update)
  minSignalContributions: number; // Default: 10
  
  // Learning insights settings
  insightGenerationFrequency: number; // Hours, default: 12
  minInsightConfidence: number; // Default: 0.6
  
  // Overfitting prevention
  enableBoundedAdjustments: boolean; // Default: true
  adjustmentDecayRate: number; // Default: 0.95 (5% decay per period)
  validationSplitRatio: number; // Default: 0.2 (20% for validation)
}

export class AlgorithmLearningEngine {
  private eventBus: EventBus;
  private databaseManager: DatabaseManager;
  private config: AlgorithmLearningConfig;
  private logger = createLogger({ component: 'AlgorithmLearningEngine' });
  
  // Learning state
  private tradeOutcomes: TradeOutcomeAnalysis[] = [];
  private confidenceCalibrations: Map<string, ConfidenceCalibration> = new Map();
  private signalPatterns: Map<string, SignalPattern> = new Map();
  private signalWeightings: Map<string, SignalEffectivenessWeighting> = new Map();
  private learningInsights: LearningInsight[] = [];
  
  // Learning intervals
  private calibrationInterval?: NodeJS.Timeout;
  private insightGenerationInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  
  // Overfitting prevention
  private validationSet: TradeOutcomeAnalysis[] = [];
  private trainingSet: TradeOutcomeAnalysis[] = [];

  constructor(
    eventBus: EventBus,
    databaseManager: DatabaseManager,
    config?: Partial<AlgorithmLearningConfig>
  ) {
    this.eventBus = eventBus;
    this.databaseManager = databaseManager;
    this.config = {
      minTradesForCalibration: 20,
      calibrationUpdateFrequency: 24,
      maxCalibrationAdjustment: 0.2,
      minPatternOccurrences: 5,
      patternConfidenceThreshold: 0.7,
      weightAdjustmentRate: 0.1,
      minSignalContributions: 10,
      insightGenerationFrequency: 12,
      minInsightConfidence: 0.6,
      enableBoundedAdjustments: true,
      adjustmentDecayRate: 0.95,
      validationSplitRatio: 0.2,
      ...config
    };
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for completed trades
    this.eventBus.on('paper:position:closed', async (data) => {
      await this.onTradeCompleted(data.position);
    });

    // Listen for trade analyses
    this.eventBus.on('paper:trade:analyzed', async (analysis) => {
      await this.onTradeAnalyzed(analysis);
    });

    // Listen for signal generation events
    this.eventBus.on('signal:generated', async (data) => {
      await this.onSignalGenerated(data);
    });
  }

  public async startLearning(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Load existing learning data
    await this.loadLearningState();
    
    // Start periodic calibration
    this.calibrationInterval = setInterval(async () => {
      try {
        await this.performPeriodicCalibration();
      } catch (error) {
        await this.logger.error('LEARNING', 'Error during periodic calibration', {}, error as Error);
      }
    }, this.config.calibrationUpdateFrequency * 60 * 60 * 1000);

    // Start insight generation
    this.insightGenerationInterval = setInterval(async () => {
      try {
        await this.generateLearningInsights();
      } catch (error) {
        await this.logger.error('LEARNING', 'Error during insight generation', {}, error as Error);
      }
    }, this.config.insightGenerationFrequency * 60 * 60 * 1000);

    await this.logger.info('LEARNING', 'Algorithm learning engine started');
  }

  public stopLearning(): void {
    if (this.calibrationInterval) {
      clearInterval(this.calibrationInterval);
      this.calibrationInterval = undefined;
    }
    
    if (this.insightGenerationInterval) {
      clearInterval(this.insightGenerationInterval);
      this.insightGenerationInterval = undefined;
    }
    
    this.isRunning = false;
    this.logger.info('LEARNING', 'Algorithm learning engine stopped');
  }

  public async analyzeTradeOutcomes(): Promise<TradeOutcomeAnalysis[]> {
    // Ensure we have sufficient data
      if (this.tradeOutcomes.length < this.config.minTradesForCalibration) {
        await this.logger.warn('LEARNING', 'Insufficient trade data for outcome analysis', {
          metadata: {
            currentTrades: this.tradeOutcomes.length,
            requiredTrades: this.config.minTradesForCalibration
          }
        });
        return [];
      }

      // Split data into training and validation sets
      await this.splitDataForValidation();
      
      // Analyze outcomes using training set
      const analyses: TradeOutcomeAnalysis[] = [];
      
      for (const outcome of this.trainingSet) {
        const analysis = await this.analyzeIndividualOutcome(outcome);
        analyses.push(analysis);
      }

      // Validate findings using validation set
      const validationResults = await this.validateAnalysis(analyses);
      
      await this.logger.info('LEARNING', 'Trade outcome analysis completed', {
        metadata: {
          totalOutcomes: this.tradeOutcomes.length,
          trainingSetSize: this.trainingSet.length,
          validationSetSize: this.validationSet.length,
          analysisCount: analyses.length,
          validationAccuracy: validationResults.accuracy
        }
      });

      return analyses;
  }

  public async calibrateConfidenceThresholds(): Promise<ConfidenceCalibration[]> {
    const calibrations: ConfidenceCalibration[] = [];
      
      // Define confidence ranges for calibration
      const ranges = [
        { min: 0.0, max: 0.5 },
        { min: 0.5, max: 0.6 },
        { min: 0.6, max: 0.7 },
        { min: 0.7, max: 0.8 },
        { min: 0.8, max: 0.9 },
        { min: 0.9, max: 1.0 }
      ];

      for (const range of ranges) {
        const calibration = await this.calibrateConfidenceRange(range.min, range.max);
        if (calibration) {
          calibrations.push(calibration);
          this.confidenceCalibrations.set(calibration.confidenceRange, calibration);
        }
      }

      // Apply bounded adjustments to prevent overfitting
      if (this.config.enableBoundedAdjustments) {
        await this.applyBoundedAdjustments(calibrations);
      }

      // Emit calibration update event
      this.eventBus.emit('learning:calibration:updated', {
        calibrations,
        timestamp: new Date()
      });

      await this.logger.info('LEARNING', 'Confidence calibration completed', {
        metadata: {
          calibrationsGenerated: calibrations.length,
          boundedAdjustments: this.config.enableBoundedAdjustments
        }
      });

      return calibrations;
  }

  public async recognizeSignalPatterns(): Promise<SignalPattern[]> {
    const patterns: SignalPattern[] = [];
      
      // Group outcomes by signal characteristics
      const signalGroups = this.groupOutcomesBySignalCharacteristics();
      
      for (const [groupKey, outcomes] of signalGroups) {
        if (outcomes.length >= this.config.minPatternOccurrences) {
          const pattern = await this.analyzeSignalPattern(groupKey, outcomes);
          if (pattern && pattern.confidence >= this.config.patternConfidenceThreshold) {
            patterns.push(pattern);
            this.signalPatterns.set(pattern.patternId, pattern);
          }
        }
      }

      // Update signal effectiveness weightings
      await this.updateSignalEffectivenessWeightings(patterns);

      await this.logger.info('LEARNING', 'Signal pattern recognition completed', {
        metadata: {
          patternsIdentified: patterns.length,
          totalSignalGroups: signalGroups.size
        }
      });

      return patterns;
  }

  private async analyzeIndividualOutcome(outcome: TradeOutcomeAnalysis): Promise<TradeOutcomeAnalysis> {
    // Calculate prediction error
    const predictionError = Math.abs(outcome.predictedConfidence - outcome.actualOutcomeValue);
    
    // Calculate Brier score component
    const calibrationScore = Math.pow(outcome.predictedConfidence - outcome.actualOutcomeValue, 2);
    
    return {
      ...outcome,
      predictionError,
      calibrationScore
    };
  }

  private async splitDataForValidation(): Promise<void> {
    // Shuffle outcomes to ensure random split
    const shuffled = [...this.tradeOutcomes].sort(() => Math.random() - 0.5);
    
    const validationSize = Math.floor(shuffled.length * this.config.validationSplitRatio);
    this.validationSet = shuffled.slice(0, validationSize);
    this.trainingSet = shuffled.slice(validationSize);
  }

  private async validateAnalysis(analyses: TradeOutcomeAnalysis[]): Promise<{ accuracy: number; reliability: number }> {
    if (this.validationSet.length === 0) {
      return { accuracy: 0, reliability: 0 };
    }

    let correctPredictions = 0;
    let totalPredictions = 0;
    let totalCalibrationError = 0;

    for (const validation of this.validationSet) {
      // Find similar analysis pattern
      const similarAnalysis = analyses.find(a => 
        Math.abs(a.predictedConfidence - validation.predictedConfidence) < 0.1 &&
        a.marketRegime === validation.marketRegime
      );

      if (similarAnalysis) {
        totalPredictions++;
        
        // Check if prediction was correct
        if ((similarAnalysis.predictedConfidence > 0.5 && validation.actualOutcome === 'WIN') ||
            (similarAnalysis.predictedConfidence <= 0.5 && validation.actualOutcome === 'LOSS')) {
          correctPredictions++;
        }
        
        totalCalibrationError += Math.abs(similarAnalysis.predictedConfidence - validation.actualOutcomeValue);
      }
    }

    const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
    const reliability = totalPredictions > 0 ? 1 - (totalCalibrationError / totalPredictions) : 0;

    return { accuracy, reliability };
  }

  private async calibrateConfidenceRange(minConf: number, maxConf: number): Promise<ConfidenceCalibration | null> {
    const rangeOutcomes = this.trainingSet.filter(outcome => 
      outcome.predictedConfidence >= minConf && outcome.predictedConfidence < maxConf
    );

    if (rangeOutcomes.length < this.config.minTradesForCalibration) {
      return null;
    }

    const totalTrades = rangeOutcomes.length;
    const wins = rangeOutcomes.filter(o => o.actualOutcome === 'WIN').length;
    const actualWinRate = wins / totalTrades;
    const expectedWinRate = rangeOutcomes.reduce((sum, o) => sum + o.predictedConfidence, 0) / totalTrades;
    const calibrationError = actualWinRate - expectedWinRate;
    
    // Calculate bounded adjustment
    let recommendedAdjustment = calibrationError * 0.5; // 50% of the error
    recommendedAdjustment = Math.max(-this.config.maxCalibrationAdjustment, 
                                   Math.min(this.config.maxCalibrationAdjustment, recommendedAdjustment));
    
    // Calculate reliability (consistency of calibration)
    const variance = rangeOutcomes.reduce((sum, o) => {
      const expectedOutcome = o.predictedConfidence;
      const actualOutcome = o.actualOutcomeValue;
      return sum + Math.pow(expectedOutcome - actualOutcome, 2);
    }, 0) / totalTrades;
    
    const reliability = Math.max(0, 1 - variance);

    return {
      confidenceRange: `${minConf.toFixed(1)}-${maxConf.toFixed(1)}`,
      minConfidence: minConf,
      maxConfidence: maxConf,
      totalTrades,
      actualWinRate,
      expectedWinRate,
      calibrationError,
      recommendedAdjustment,
      reliability,
      lastUpdated: new Date()
    };
  }

  private async applyBoundedAdjustments(calibrations: ConfidenceCalibration[]): Promise<void> {
    for (const calibration of calibrations) {
      // Apply decay to prevent overcorrection
      calibration.recommendedAdjustment *= this.config.adjustmentDecayRate;
      
      // Ensure adjustment is within bounds
      calibration.recommendedAdjustment = Math.max(-this.config.maxCalibrationAdjustment,
                                                 Math.min(this.config.maxCalibrationAdjustment, 
                                                         calibration.recommendedAdjustment));
    }
  }

  private groupOutcomesBySignalCharacteristics(): Map<string, TradeOutcomeAnalysis[]> {
    const groups = new Map<string, TradeOutcomeAnalysis[]>();
    
    for (const outcome of this.trainingSet) {
      // Create grouping key based on signal characteristics
      const confidenceRange = Math.floor(outcome.predictedConfidence * 10) / 10; // Round to 0.1
      const regime = outcome.marketRegime;
      const source = outcome.signalSource;
      
      const groupKey = `${source}_${regime}_${confidenceRange}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(outcome);
    }
    
    return groups;
  }

  private async analyzeSignalPattern(groupKey: string, outcomes: TradeOutcomeAnalysis[]): Promise<SignalPattern | null> {
    const [source, regime, confidenceRange] = groupKey.split('_');
    
    const totalOccurrences = outcomes.length;
    const successfulTrades = outcomes.filter(o => o.actualOutcome === 'WIN').length;
    const successRate = successfulTrades / totalOccurrences;
    const averagePnL = outcomes.reduce((sum, o) => sum + o.pnl, 0) / totalOccurrences;
    const averageHoldingPeriod = outcomes.reduce((sum, o) => sum + o.holdingPeriod, 0) / totalOccurrences;
    
    // Calculate effectiveness score
    const effectiveness = (successRate * 0.6) + ((averagePnL > 0 ? 1 : 0) * 0.4);
    
    // Calculate confidence in this pattern
    const confidence = Math.min(1, totalOccurrences / (this.config.minPatternOccurrences * 2));
    
    // Calculate recommended weight
    const recommendedWeight = Math.max(0.05, Math.min(0.4, effectiveness));

    return {
      patternId: `pattern_${groupKey}_${Date.now()}`,
      signalType: source.toLowerCase(),
      patternDescription: `${source} signals in ${regime} regime with ${confidenceRange} confidence`,
      conditions: {
        signalSource: source,
        marketRegime: regime,
        confidenceRange: parseFloat(confidenceRange),
        minOccurrences: this.config.minPatternOccurrences
      },
      historicalPerformance: {
        totalOccurrences,
        successfulTrades,
        successRate,
        averagePnL,
        averageHoldingPeriod
      },
      effectiveness,
      recommendedWeight,
      confidence,
      lastSeen: new Date(),
      createdAt: new Date()
    };
  }

  private async updateSignalEffectivenessWeightings(patterns: SignalPattern[]): Promise<void> {
    // Group patterns by signal type
    const signalTypeGroups = new Map<string, SignalPattern[]>();
    
    for (const pattern of patterns) {
      if (!signalTypeGroups.has(pattern.signalType)) {
        signalTypeGroups.set(pattern.signalType, []);
      }
      signalTypeGroups.get(pattern.signalType)!.push(pattern);
    }

    // Calculate effectiveness weighting for each signal type
    for (const [signalType, typePatterns] of signalTypeGroups) {
      const totalContributions = typePatterns.reduce((sum, p) => sum + p.historicalPerformance.totalOccurrences, 0);
      const successfulContributions = typePatterns.reduce((sum, p) => sum + p.historicalPerformance.successfulTrades, 0);
      const averageEffectiveness = typePatterns.reduce((sum, p) => sum + p.effectiveness, 0) / typePatterns.length;
      const averageContribution = totalContributions / typePatterns.length;
      
      // Get current weight (default to equal weighting)
      const currentWeight = this.getCurrentSignalWeight(signalType);
      
      // Calculate recommended weight based on effectiveness
      let recommendedWeight = averageEffectiveness * 0.3; // Scale to reasonable range
      recommendedWeight = Math.max(0.05, Math.min(0.4, recommendedWeight));
      
      // Calculate bounded adjustment
      const weightDifference = recommendedWeight - currentWeight;
      const weightAdjustment = Math.max(-this.config.weightAdjustmentRate,
                                      Math.min(this.config.weightAdjustmentRate, weightDifference));

      const weighting: SignalEffectivenessWeighting = {
        signalType,
        currentWeight,
        recommendedWeight,
        effectiveness: averageEffectiveness,
        totalContributions,
        successfulContributions,
        averageContribution,
        weightAdjustment,
        lastCalibrated: new Date()
      };

      this.signalWeightings.set(signalType, weighting);
    }
  }

  private getCurrentSignalWeight(signalType: string): number {
    // Default signal weights based on current system
    const defaultWeights: Record<string, number> = {
      'trend': 0.25,
      'momentum': 0.20,
      'volume': 0.20,
      'ribbon': 0.15,
      'fibonacci': 0.10,
      'gamma': 0.10
    };
    
    return defaultWeights[signalType] || 0.1;
  }

  private async performPeriodicCalibration(): Promise<void> {
    try {
      await this.logger.info('LEARNING', 'Starting periodic calibration');
      
      // Analyze trade outcomes
      const outcomes = await this.analyzeTradeOutcomes();
      
      // Calibrate confidence thresholds
      const calibrations = await this.calibrateConfidenceThresholds();
      
      // Recognize signal patterns
      const patterns = await this.recognizeSignalPatterns();
      
      // Generate insights
      await this.generateLearningInsights();
      
      await this.logger.info('LEARNING', 'Periodic calibration completed', {
        metadata: {
          outcomesAnalyzed: outcomes.length,
          calibrationsUpdated: calibrations.length,
          patternsRecognized: patterns.length
        }
      });
      
    } catch (error) {
      await this.logger.error('LEARNING', 'Error during periodic calibration', {}, error as Error);
    }
  }

  private async generateLearningInsights(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    
    // Generate confidence calibration insights
    const calibrationInsights = await this.generateCalibrationInsights();
    insights.push(...calibrationInsights);
    
    // Generate signal effectiveness insights
    const effectivenessInsights = await this.generateEffectivenessInsights();
    insights.push(...effectivenessInsights);
    
    // Generate pattern recognition insights
    const patternInsights = await this.generatePatternInsights();
    insights.push(...patternInsights);
    
    // Filter by confidence threshold
    const qualifiedInsights = insights.filter(insight => 
      insight.confidence >= this.config.minInsightConfidence
    );
    
    // Sort by priority and add to collection
    qualifiedInsights.sort((a, b) => b.priority - a.priority);
    this.learningInsights.push(...qualifiedInsights);
    
    // Emit insights event
    if (qualifiedInsights.length > 0) {
      this.eventBus.emit('learning:insights:generated', {
        insights: qualifiedInsights,
        timestamp: new Date()
      });
    }
    
    return qualifiedInsights;
  }

  private async generateCalibrationInsights(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    
    for (const calibration of this.confidenceCalibrations.values()) {
      if (Math.abs(calibration.calibrationError) > 0.1) { // 10% error threshold
        const isOverconfident = calibration.calibrationError < 0;
        
        insights.push({
          id: `calibration_${calibration.confidenceRange}_${Date.now()}`,
          category: 'CONFIDENCE_CALIBRATION',
          title: `${isOverconfident ? 'Overconfident' : 'Underconfident'} in ${calibration.confidenceRange} range`,
          description: `Confidence range ${calibration.confidenceRange} shows ${Math.abs(calibration.calibrationError * 100).toFixed(1)}% calibration error`,
          impact: Math.abs(calibration.calibrationError) > 0.2 ? 'HIGH' : 'MEDIUM',
          actionable: true,
          recommendation: `Adjust confidence by ${(calibration.recommendedAdjustment * 100).toFixed(1)}% for this range`,
          supportingData: calibration,
          confidence: calibration.reliability,
          priority: Math.min(10, Math.floor(Math.abs(calibration.calibrationError) * 50)),
          generatedAt: new Date(),
          status: 'PENDING'
        });
      }
    }
    
    return insights;
  }

  private async generateEffectivenessInsights(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    
    for (const weighting of this.signalWeightings.values()) {
      if (Math.abs(weighting.weightAdjustment) > 0.05) { // 5% adjustment threshold
        const shouldIncrease = weighting.weightAdjustment > 0;
        
        insights.push({
          id: `effectiveness_${weighting.signalType}_${Date.now()}`,
          category: 'SIGNAL_EFFECTIVENESS',
          title: `${shouldIncrease ? 'Increase' : 'Decrease'} ${weighting.signalType} signal weight`,
          description: `${weighting.signalType} signal shows ${(weighting.effectiveness * 100).toFixed(1)}% effectiveness`,
          impact: Math.abs(weighting.weightAdjustment) > 0.1 ? 'HIGH' : 'MEDIUM',
          actionable: true,
          recommendation: `Adjust ${weighting.signalType} weight from ${(weighting.currentWeight * 100).toFixed(1)}% to ${(weighting.recommendedWeight * 100).toFixed(1)}%`,
          supportingData: weighting,
          confidence: Math.min(1, weighting.totalContributions / (this.config.minSignalContributions * 2)),
          priority: Math.min(10, Math.floor(Math.abs(weighting.weightAdjustment) * 100)),
          generatedAt: new Date(),
          status: 'PENDING'
        });
      }
    }
    
    return insights;
  }

  private async generatePatternInsights(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    
    // Find high-performing patterns
    const highPerformingPatterns = Array.from(this.signalPatterns.values())
      .filter(p => p.effectiveness > 0.7 && p.confidence > 0.8);
    
    for (const pattern of highPerformingPatterns) {
      insights.push({
        id: `pattern_${pattern.patternId}_${Date.now()}`,
        category: 'PATTERN_RECOGNITION',
        title: `High-performing pattern identified: ${pattern.patternDescription}`,
        description: `Pattern shows ${(pattern.effectiveness * 100).toFixed(1)}% effectiveness with ${pattern.historicalPerformance.totalOccurrences} occurrences`,
        impact: 'MEDIUM',
        actionable: true,
        recommendation: `Consider increasing weight for ${pattern.signalType} signals in similar conditions`,
        supportingData: pattern,
        confidence: pattern.confidence,
        priority: Math.floor(pattern.effectiveness * 10),
        generatedAt: new Date(),
        status: 'PENDING'
      });
    }
    
    return insights;
  }

  private async onTradeCompleted(position: PaperPosition): Promise<void> {
    try {
      // Create trade outcome analysis
      const outcome: TradeOutcomeAnalysis = {
        signalId: position.signalId,
        ticker: position.ticker,
        predictedConfidence: position.confidence,
        actualOutcome: position.pnl > 0 ? 'WIN' : 'LOSS',
        actualOutcomeValue: position.pnl > 0 ? 1 : 0,
        pnl: position.pnl,
        pnlPercent: position.pnlPercent,
        holdingPeriod: position.exitTimestamp ? 
          (position.exitTimestamp.getTime() - position.entryTimestamp.getTime()) / (1000 * 60 * 60) : 0,
        marketRegime: position.regime,
        signalSource: 'REGIMECOMPASS', // Default, would be enhanced with actual source
        exitReason: position.exitReason || 'MANUAL',
        predictionError: 0, // Will be calculated during analysis
        calibrationScore: 0, // Will be calculated during analysis
        timestamp: new Date()
      };
      
      this.tradeOutcomes.push(outcome);
      
      // Trigger learning if we have enough data
      if (this.tradeOutcomes.length >= this.config.minTradesForCalibration && 
          this.tradeOutcomes.length % 10 === 0) { // Every 10 trades
        await this.performPeriodicCalibration();
      }
      
    } catch (error) {
      await this.logger.error('LEARNING', 'Error processing completed trade', {
        positionId: position.id
      }, error as Error);
    }
  }

  private async onTradeAnalyzed(analysis: TradeAnalysis): Promise<void> {
    // Extract learning insights from trade analysis
    // This would be enhanced with more sophisticated analysis
  }

  private async onSignalGenerated(data: any): Promise<void> {
    // Track signal generation for pattern recognition
    // This would be enhanced with signal tracking
  }

  private async loadLearningState(): Promise<void> {
    try {
      // Load existing learning data from database
      // This would be implemented with actual database calls
      await this.logger.info('LEARNING', 'Learning state loaded');
    } catch (error) {
      await this.logger.error('LEARNING', 'Error loading learning state', {}, error as Error);
    }
  }

  // Public API methods

  public getConfidenceCalibrations(): ConfidenceCalibration[] {
    return Array.from(this.confidenceCalibrations.values());
  }

  public getSignalPatterns(): SignalPattern[] {
    return Array.from(this.signalPatterns.values());
  }

  public getSignalWeightings(): SignalEffectivenessWeighting[] {
    return Array.from(this.signalWeightings.values());
  }

  public getLearningInsights(): LearningInsight[] {
    return [...this.learningInsights];
  }

  public getTradeOutcomes(): TradeOutcomeAnalysis[] {
    return [...this.tradeOutcomes];
  }

  public updateConfig(newConfig: Partial<AlgorithmLearningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('LEARNING', 'Algorithm learning configuration updated');
  }

  public getConfig(): AlgorithmLearningConfig {
    return { ...this.config };
  }

  public async getHealthStatus(): Promise<{
    isRunning: boolean;
    tradeOutcomes: number;
    calibrations: number;
    patterns: number;
    insights: number;
    lastCalibration: Date | null;
  }> {
    return {
      isRunning: this.isRunning,
      tradeOutcomes: this.tradeOutcomes.length,
      calibrations: this.confidenceCalibrations.size,
      patterns: this.signalPatterns.size,
      insights: this.learningInsights.length,
      lastCalibration: this.confidenceCalibrations.size > 0 ? 
        new Date(Math.max(...Array.from(this.confidenceCalibrations.values()).map(c => c.lastUpdated.getTime()))) :
        null
    };
  }

  public async shutdown(): Promise<void> {
    this.stopLearning();
    
    // Clear learning state
    this.tradeOutcomes = [];
    this.confidenceCalibrations.clear();
    this.signalPatterns.clear();
    this.signalWeightings.clear();
    this.learningInsights = [];
    
    await this.logger.info('LEARNING', 'Algorithm learning engine shutdown complete');
  }
}