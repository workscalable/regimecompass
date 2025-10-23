import { 
  TradeAnalysis, 
  LearningInsight, 
  Recommendation, 
  PaperPosition,
  PerformanceMetrics
} from '../models/PaperTradingTypes';
import { EventBus } from '../core/EventBus';
import { DatabaseManager } from '../database/DatabaseManager';

export interface ConfidenceAdjustment {
  signalType: string;
  originalConfidence: number;
  adjustedConfidence: number;
  adjustment: number;
  effectivenessScore: number;
  sampleSize: number;
  lastUpdated: Date;
}

export interface LearningMetrics {
  totalAdjustments: number;
  avgEffectivenessImprovement: number;
  confidenceCalibrationScore: number;
  learningVelocity: number;
  adaptationRate: number;
}

export interface SignalTypePerformance {
  signalType: string;
  tradeCount: number;
  winRate: number;
  avgPnL: number;
  confidenceEffectiveness: number;
  recommendedAdjustment: number;
}

export class FeedbackEngine {
  private eventBus: EventBus;
  private databaseManager: DatabaseManager;
  private confidenceAdjustments: Map<string, ConfidenceAdjustment> = new Map();
  private performanceHistory: TradeAnalysis[] = [];
  private learningRate: number = 0.1; // How quickly to adapt
  private maxAdjustment: number = 0.2; // Maximum confidence adjustment (±20%)
  private minSampleSize: number = 5; // Minimum trades before making adjustments

  constructor(eventBus: EventBus, databaseManager: DatabaseManager) {
    this.eventBus = eventBus;
    this.databaseManager = databaseManager;
    this.setupEventListeners();
    this.loadExistingAdjustments();
  }

  private setupEventListeners(): void {
    // Listen for trade analysis results
    this.eventBus.on('paper:trade:analyzed', (analysis) => {
      this.analyzeTradeOutcome(analysis);
    });

    // Listen for system performance updates
    this.eventBus.on('system:performance:update', (data) => {
      this.adjustConfidenceThresholds(data);
    });
  }

  private async loadExistingAdjustments(): Promise<void> {
    try {
      const learningData = await this.databaseManager.getLearningData();
      
      for (const data of learningData) {
        const adjustment: ConfidenceAdjustment = {
          signalType: data.signal_type,
          originalConfidence: 0.5, // Would be stored in database
          adjustedConfidence: 0.5 + data.confidence_adjustment,
          adjustment: data.confidence_adjustment,
          effectivenessScore: data.effectiveness_score,
          sampleSize: data.sample_size,
          lastUpdated: new Date(data.last_updated)
        };
        
        this.confidenceAdjustments.set(data.signal_type, adjustment);
      }
      
      console.log(`🧠 Loaded ${learningData.length} confidence adjustments from database`);
    } catch (error) {
      console.error('Failed to load existing adjustments:', error);
    }
  }

  public analyzeTradeOutcome(analysis: TradeAnalysis): void {
    try {
      // Add to performance history
      this.performanceHistory.push(analysis);
      
      // Keep only recent history (last 1000 trades)
      if (this.performanceHistory.length > 1000) {
        this.performanceHistory = this.performanceHistory.slice(-1000);
      }

      // Calculate confidence effectiveness
      const confidenceEffectiveness = this.calculateConfidenceEffectiveness(
        analysis.entryConfidence,
        analysis.pnl,
        analysis.expectedMove,
        analysis.actualMove
      );

      // Determine signal type (simplified - would be more sophisticated in practice)
      const signalType = this.determineSignalType(analysis);

      // Update confidence adjustments
      this.updateConfidenceAdjustment(signalType, confidenceEffectiveness, analysis);

      // Generate learning insights
      const insights = this.generateLearningInsights(analysis);

      // Emit learning event
      this.eventBus.emit('algorithm:learning', {
        signalId: analysis.signalId,
        confidenceEffectiveness,
        adjustments: this.getCurrentAdjustments(),
        recommendations: this.generateRecommendations(analysis)
      });

      console.log(`🧠 Analyzed trade outcome: ${analysis.ticker} (effectiveness: ${confidenceEffectiveness.toFixed(3)})`);
    } catch (error) {
      this.eventBus.emitSystemError(
        error as Error,
        'Trade outcome analysis',
        'MEDIUM'
      );
    }
  }

  private calculateConfidenceEffectiveness(
    confidence: number,
    pnl: number,
    expectedMove: number,
    actualMove: number
  ): number {
    // Calculate how well confidence predicted the outcome
    const moveAccuracy = expectedMove > 0 
      ? 1 - Math.abs(expectedMove - actualMove) / expectedMove 
      : 0.5;
    
    const profitabilityScore = pnl > 0 ? 1 : 0;
    
    // Combine confidence with actual outcomes
    // High confidence should correlate with good outcomes
    const baseEffectiveness = confidence * moveAccuracy * profitabilityScore;
    
    // Penalize overconfidence on losing trades
    if (pnl < 0 && confidence > 0.7) {
      return baseEffectiveness * 0.5; // Reduce effectiveness for overconfident losses
    }
    
    // Reward underconfidence on winning trades
    if (pnl > 0 && confidence < 0.6) {
      return Math.min(1.0, baseEffectiveness * 1.2); // Boost effectiveness for conservative wins
    }
    
    return Math.max(0, Math.min(1, baseEffectiveness));
  }

  private determineSignalType(analysis: TradeAnalysis): string {
    // Simplified signal type determination
    // In practice, this would use more sophisticated classification
    const parts = [
      analysis.ticker,
      analysis.pnl > 0 ? 'WIN' : 'LOSS',
      analysis.entryConfidence > 0.7 ? 'HIGH_CONF' : 'LOW_CONF'
    ];
    
    return parts.join('_');
  }

  private updateConfidenceAdjustment(
    signalType: string,
    effectiveness: number,
    analysis: TradeAnalysis
  ): void {
    let adjustment = this.confidenceAdjustments.get(signalType);
    
    if (!adjustment) {
      adjustment = {
        signalType,
        originalConfidence: analysis.entryConfidence,
        adjustedConfidence: analysis.entryConfidence,
        adjustment: 0,
        effectivenessScore: effectiveness,
        sampleSize: 1,
        lastUpdated: new Date()
      };
    } else {
      // Update running averages
      const newSampleSize = adjustment.sampleSize + 1;
      const newEffectivenessScore = (adjustment.effectivenessScore * adjustment.sampleSize + effectiveness) / newSampleSize;
      
      // Calculate new adjustment based on effectiveness
      let newAdjustment = adjustment.adjustment;
      
      if (effectiveness > 0.7) {
        // Good effectiveness - slightly increase confidence
        newAdjustment += this.learningRate * 0.1;
      } else if (effectiveness < 0.3) {
        // Poor effectiveness - decrease confidence
        newAdjustment -= this.learningRate * 0.1;
      }
      
      // Bound the adjustment
      newAdjustment = Math.max(-this.maxAdjustment, Math.min(this.maxAdjustment, newAdjustment));
      
      adjustment.adjustment = newAdjustment;
      adjustment.adjustedConfidence = adjustment.originalConfidence + newAdjustment;
      adjustment.effectivenessScore = newEffectivenessScore;
      adjustment.sampleSize = newSampleSize;
      adjustment.lastUpdated = new Date();
    }
    
    this.confidenceAdjustments.set(signalType, adjustment);
    
    // Save to database if we have enough samples
    if (adjustment.sampleSize >= this.minSampleSize) {
      this.saveAdjustmentToDatabase(adjustment);
    }
  }

  private async saveAdjustmentToDatabase(adjustment: ConfidenceAdjustment): Promise<void> {
    try {
      await this.databaseManager.updateLearningData(
        adjustment.signalType,
        adjustment.adjustment,
        adjustment.effectivenessScore,
        adjustment.sampleSize
      );
    } catch (error) {
      console.error('Failed to save adjustment to database:', error);
    }
  }

  public getAdjustedConfidence(signalType: string, rawConfidence: number): number {
    const adjustment = this.confidenceAdjustments.get(signalType);
    
    if (!adjustment || adjustment.sampleSize < this.minSampleSize) {
      return rawConfidence; // Not enough data for adjustment
    }
    
    const adjustedConfidence = rawConfidence + adjustment.adjustment;
    return Math.max(0, Math.min(1, adjustedConfidence));
  }

  public generateRecommendations(analysis: TradeAnalysis): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Recommendation 1: Confidence Calibration
    if (analysis.entryConfidence > 0.8 && analysis.pnl < 0) {
      recommendations.push({
        type: 'POSITION_SIZING',
        priority: 'HIGH',
        description: 'High confidence signal resulted in loss',
        impact: 'Reduce position sizes for high-confidence signals that show poor outcomes',
        implementation: 'Lower position size multiplier for confidence > 0.8 from 1.2x to 1.0x'
      });
    }
    
    // Recommendation 2: Exit Strategy
    if (analysis.maxFavorableExcursion > Math.abs(analysis.pnl) * 2) {
      recommendations.push({
        type: 'EXIT_STRATEGY',
        priority: 'MEDIUM',
        description: 'Position had significant favorable excursion before turning negative',
        impact: 'Implement trailing stops or profit-taking rules',
        implementation: 'Add trailing stop at 50% of maximum favorable excursion'
      });
    }
    
    // Recommendation 3: Entry Timing
    if (analysis.holdingPeriod < 2 && analysis.pnl < 0) {
      recommendations.push({
        type: 'ENTRY_TIMING',
        priority: 'MEDIUM',
        description: 'Quick losses suggest poor entry timing',
        impact: 'Improve entry signal quality or add confirmation filters',
        implementation: 'Require additional confirmation signals for entries'
      });
    }
    
    // Recommendation 4: Risk Management
    const recentLosses = this.performanceHistory
      .slice(-10)
      .filter(t => t.pnl < 0).length;
    
    if (recentLosses >= 6) {
      recommendations.push({
        type: 'RISK_MANAGEMENT',
        priority: 'HIGH',
        description: 'High frequency of recent losses detected',
        impact: 'Reduce overall position sizes and reassess strategy',
        implementation: 'Reduce all position sizes by 50% until win rate improves'
      });
    }
    
    return recommendations;
  }

  private generateLearningInsights(analysis: TradeAnalysis): LearningInsight[] {
    const insights: LearningInsight[] = [];
    
    // Insight 1: Confidence Effectiveness
    const signalType = this.determineSignalType(analysis);
    const adjustment = this.confidenceAdjustments.get(signalType);
    
    if (adjustment && adjustment.sampleSize >= this.minSampleSize) {
      insights.push({
        category: 'CONFIDENCE_CALIBRATION',
        insight: `Signal type ${signalType} has effectiveness score of ${adjustment.effectivenessScore.toFixed(3)}`,
        confidence: adjustment.effectivenessScore,
        supportingData: adjustment,
        actionable: adjustment.effectivenessScore < 0.5
      });
    }
    
    // Insight 2: Market Regime Impact
    const regimePerformance = this.analyzeRegimePerformance(analysis.ticker);
    if (regimePerformance) {
      insights.push({
        category: 'MARKET_REGIME',
        insight: `${analysis.ticker} performs differently across market regimes`,
        confidence: 0.7,
        supportingData: regimePerformance,
        actionable: true
      });
    }
    
    return insights;
  }

  private analyzeRegimePerformance(ticker: string): any {
    const tickerTrades = this.performanceHistory.filter(t => t.ticker === ticker);
    
    if (tickerTrades.length < 10) return null;
    
    // Group by regime (simplified - would need regime data)
    const regimeGroups = {
      BULL: tickerTrades.filter(t => t.pnl > 0), // Simplified assumption
      BEAR: tickerTrades.filter(t => t.pnl < 0),
      NEUTRAL: []
    };
    
    return {
      ticker,
      bullWinRate: regimeGroups.BULL.length / tickerTrades.length,
      bearWinRate: regimeGroups.BEAR.length / tickerTrades.length,
      totalTrades: tickerTrades.length
    };
  }

  public adjustConfidenceThresholds(performanceData: any): void {
    // Adjust global confidence thresholds based on overall performance
    const overallWinRate = performanceData.winRate || 0;
    
    if (overallWinRate < 40) {
      // Poor performance - increase confidence requirements
      for (const [signalType, adjustment] of this.confidenceAdjustments) {
        adjustment.adjustment = Math.max(adjustment.adjustment - 0.05, -this.maxAdjustment);
      }
      console.log('🧠 Decreased confidence thresholds due to poor performance');
    } else if (overallWinRate > 70) {
      // Good performance - can be more aggressive
      for (const [signalType, adjustment] of this.confidenceAdjustments) {
        adjustment.adjustment = Math.min(adjustment.adjustment + 0.02, this.maxAdjustment);
      }
      console.log('🧠 Increased confidence thresholds due to good performance');
    }
  }

  public getCurrentAdjustments(): Record<string, number> {
    const adjustments: Record<string, number> = {};
    
    for (const [signalType, adjustment] of this.confidenceAdjustments) {
      if (adjustment.sampleSize >= this.minSampleSize) {
        adjustments[signalType] = adjustment.adjustment;
      }
    }
    
    return adjustments;
  }

  public getSignalTypePerformance(): SignalTypePerformance[] {
    const signalTypes = new Set(this.performanceHistory.map(t => this.determineSignalType(t)));
    const performance: SignalTypePerformance[] = [];
    
    for (const signalType of signalTypes) {
      const trades = this.performanceHistory.filter(t => this.determineSignalType(t) === signalType);
      
      if (trades.length >= this.minSampleSize) {
        const winRate = (trades.filter(t => t.pnl > 0).length / trades.length) * 100;
        const avgPnL = trades.reduce((sum, t) => sum + t.pnl, 0) / trades.length;
        const avgEffectiveness = trades.reduce((sum, t) => 
          sum + this.calculateConfidenceEffectiveness(t.entryConfidence, t.pnl, t.expectedMove, t.actualMove), 0
        ) / trades.length;
        
        const adjustment = this.confidenceAdjustments.get(signalType);
        
        performance.push({
          signalType,
          tradeCount: trades.length,
          winRate,
          avgPnL,
          confidenceEffectiveness: avgEffectiveness,
          recommendedAdjustment: adjustment?.adjustment || 0
        });
      }
    }
    
    return performance.sort((a, b) => b.confidenceEffectiveness - a.confidenceEffectiveness);
  }

  public getLearningMetrics(): LearningMetrics {
    const adjustments = Array.from(this.confidenceAdjustments.values());
    const validAdjustments = adjustments.filter(a => a.sampleSize >= this.minSampleSize);
    
    const totalAdjustments = validAdjustments.length;
    const avgEffectivenessImprovement = validAdjustments.length > 0
      ? validAdjustments.reduce((sum, a) => sum + a.effectivenessScore, 0) / validAdjustments.length
      : 0;
    
    // Calculate confidence calibration score
    const calibrationScore = this.calculateConfidenceCalibration();
    
    // Learning velocity (how quickly we're adapting)
    const recentAdjustments = validAdjustments.filter(a => 
      Date.now() - a.lastUpdated.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );
    const learningVelocity = recentAdjustments.length / 7; // Adjustments per day
    
    // Adaptation rate (how much we're changing)
    const avgAdjustmentMagnitude = validAdjustments.length > 0
      ? validAdjustments.reduce((sum, a) => sum + Math.abs(a.adjustment), 0) / validAdjustments.length
      : 0;
    
    return {
      totalAdjustments,
      avgEffectivenessImprovement,
      confidenceCalibrationScore: calibrationScore,
      learningVelocity,
      adaptationRate: avgAdjustmentMagnitude
    };
  }

  private calculateConfidenceCalibration(): number {
    // Calculate how well our confidence levels match actual outcomes
    const confidenceBuckets = [0.2, 0.4, 0.6, 0.8, 1.0];
    let totalCalibrationError = 0;
    let validBuckets = 0;
    
    for (let i = 0; i < confidenceBuckets.length - 1; i++) {
      const minConf = confidenceBuckets[i];
      const maxConf = confidenceBuckets[i + 1];
      const bucketTrades = this.performanceHistory.filter(t => 
        t.entryConfidence >= minConf && t.entryConfidence < maxConf
      );
      
      if (bucketTrades.length >= 5) {
        const actualWinRate = bucketTrades.filter(t => t.pnl > 0).length / bucketTrades.length;
        const expectedWinRate = (minConf + maxConf) / 2;
        const calibrationError = Math.abs(actualWinRate - expectedWinRate);
        
        totalCalibrationError += calibrationError;
        validBuckets++;
      }
    }
    
    return validBuckets > 0 ? 1 - (totalCalibrationError / validBuckets) : 0.5;
  }

  public resetLearning(): void {
    this.confidenceAdjustments.clear();
    this.performanceHistory = [];
    console.log('🧠 Learning system reset');
  }

  public exportLearningData(): any {
    return {
      adjustments: Object.fromEntries(this.confidenceAdjustments),
      performanceHistory: this.performanceHistory.slice(-100), // Last 100 trades
      learningMetrics: this.getLearningMetrics(),
      signalTypePerformance: this.getSignalTypePerformance()
    };
  }

  public setLearningRate(rate: number): void {
    this.learningRate = Math.max(0.01, Math.min(0.5, rate));
    console.log(`🧠 Learning rate set to ${this.learningRate}`);
  }

  public setMaxAdjustment(maxAdj: number): void {
    this.maxAdjustment = Math.max(0.05, Math.min(0.5, maxAdj));
    console.log(`🧠 Maximum adjustment set to ${this.maxAdjustment}`);
  }
}