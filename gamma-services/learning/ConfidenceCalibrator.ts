import { TradeAnalysis, PaperPosition } from '../models/PaperTradingTypes';
import { EventBus } from '../core/EventBus';

export interface CalibrationBucket {
  minConfidence: number;
  maxConfidence: number;
  expectedWinRate: number;
  actualWinRate: number;
  tradeCount: number;
  calibrationError: number;
  reliability: number;
}

export interface CalibrationMetrics {
  overallCalibration: number; // 0-1, higher is better
  brier: number; // Brier score, lower is better
  logLoss: number; // Log loss, lower is better
  reliability: number; // Reliability component
  resolution: number; // Resolution component
  uncertainty: number; // Uncertainty component
}

export interface ConfidenceDistribution {
  bucket: string;
  count: number;
  winRate: number;
  avgConfidence: number;
  calibrationGap: number;
}

export class ConfidenceCalibrator {
  private eventBus: EventBus;
  private tradeHistory: TradeAnalysis[] = [];
  private calibrationBuckets: CalibrationBucket[] = [];
  private bucketSize: number = 0.1; // 10% buckets
  private minTradesPerBucket: number = 10;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeBuckets();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('paper:trade:analyzed', (analysis) => {
      this.addTradeToCalibration(analysis);
    });
  }

  private initializeBuckets(): void {
    this.calibrationBuckets = [];
    
    for (let i = 0; i < 1; i += this.bucketSize) {
      this.calibrationBuckets.push({
        minConfidence: i,
        maxConfidence: Math.min(i + this.bucketSize, 1.0),
        expectedWinRate: i + this.bucketSize / 2, // Midpoint of bucket
        actualWinRate: 0,
        tradeCount: 0,
        calibrationError: 0,
        reliability: 0
      });
    }
  }

  public addTradeToCalibration(analysis: TradeAnalysis): void {
    // Add to history
    this.tradeHistory.push(analysis);
    
    // Keep only recent history (last 1000 trades)
    if (this.tradeHistory.length > 1000) {
      this.tradeHistory = this.tradeHistory.slice(-1000);
    }

    // Recalculate calibration
    this.recalculateCalibration();
  }

  private recalculateCalibration(): void {
    // Reset bucket counts
    for (const bucket of this.calibrationBuckets) {
      bucket.tradeCount = 0;
      bucket.actualWinRate = 0;
    }

    // Populate buckets with trade data
    for (const trade of this.tradeHistory) {
      const bucket = this.findBucket(trade.entryConfidence);
      if (bucket) {
        bucket.tradeCount++;
      }
    }

    // Calculate actual win rates for each bucket
    for (const bucket of this.calibrationBuckets) {
      if (bucket.tradeCount > 0) {
        const bucketTrades = this.tradeHistory.filter(t => 
          t.entryConfidence >= bucket.minConfidence && 
          t.entryConfidence < bucket.maxConfidence
        );
        
        const wins = bucketTrades.filter(t => t.pnl > 0).length;
        bucket.actualWinRate = wins / bucketTrades.length;
        bucket.calibrationError = Math.abs(bucket.actualWinRate - bucket.expectedWinRate);
        bucket.reliability = bucket.tradeCount >= this.minTradesPerBucket ? 1 : bucket.tradeCount / this.minTradesPerBucket;
      }
    }
  }

  private findBucket(confidence: number): CalibrationBucket | null {
    return this.calibrationBuckets.find(b => 
      confidence >= b.minConfidence && confidence < b.maxConfidence
    ) || null;
  }

  public getCalibrationMetrics(): CalibrationMetrics {
    if (this.tradeHistory.length === 0) {
      return {
        overallCalibration: 0.5,
        brier: 0.25,
        logLoss: 0.693,
        reliability: 0,
        resolution: 0,
        uncertainty: 0.25
      };
    }

    // Calculate Brier Score
    const brierScore = this.calculateBrierScore();
    
    // Calculate Log Loss
    const logLoss = this.calculateLogLoss();
    
    // Calculate calibration components
    const { reliability, resolution, uncertainty } = this.calculateCalibrationComponents();
    
    // Overall calibration score (1 - average calibration error)
    const validBuckets = this.calibrationBuckets.filter(b => b.tradeCount >= this.minTradesPerBucket);
    const overallCalibration = validBuckets.length > 0
      ? 1 - (validBuckets.reduce((sum, b) => sum + b.calibrationError, 0) / validBuckets.length)
      : 0.5;

    return {
      overallCalibration,
      brier: brierScore,
      logLoss,
      reliability,
      resolution,
      uncertainty
    };
  }

  private calculateBrierScore(): number {
    // Brier Score = (1/N) * Σ(forecast - outcome)²
    let totalScore = 0;
    
    for (const trade of this.tradeHistory) {
      const outcome = trade.pnl > 0 ? 1 : 0;
      const forecast = trade.entryConfidence;
      totalScore += Math.pow(forecast - outcome, 2);
    }
    
    return totalScore / this.tradeHistory.length;
  }

  private calculateLogLoss(): number {
    // Log Loss = -(1/N) * Σ[y*log(p) + (1-y)*log(1-p)]
    let totalLoss = 0;
    
    for (const trade of this.tradeHistory) {
      const outcome = trade.pnl > 0 ? 1 : 0;
      const forecast = Math.max(0.001, Math.min(0.999, trade.entryConfidence)); // Avoid log(0)
      
      if (outcome === 1) {
        totalLoss -= Math.log(forecast);
      } else {
        totalLoss -= Math.log(1 - forecast);
      }
    }
    
    return totalLoss / this.tradeHistory.length;
  }

  private calculateCalibrationComponents(): { reliability: number; resolution: number; uncertainty: number } {
    // Decompose Brier Score into Reliability - Resolution + Uncertainty
    const overallWinRate = this.tradeHistory.filter(t => t.pnl > 0).length / this.tradeHistory.length;
    const uncertainty = overallWinRate * (1 - overallWinRate);
    
    let reliability = 0;
    let resolution = 0;
    let totalTrades = 0;
    
    for (const bucket of this.calibrationBuckets) {
      if (bucket.tradeCount >= this.minTradesPerBucket) {
        const weight = bucket.tradeCount / this.tradeHistory.length;
        
        // Reliability: weighted average of (forecast - observed)²
        reliability += weight * Math.pow(bucket.expectedWinRate - bucket.actualWinRate, 2);
        
        // Resolution: weighted average of (observed - base rate)²
        resolution += weight * Math.pow(bucket.actualWinRate - overallWinRate, 2);
        
        totalTrades += bucket.tradeCount;
      }
    }
    
    return { reliability, resolution, uncertainty };
  }

  public getCalibratedConfidence(rawConfidence: number): number {
    const bucket = this.findBucket(rawConfidence);
    
    if (!bucket || bucket.tradeCount < this.minTradesPerBucket) {
      return rawConfidence; // Not enough data for calibration
    }
    
    // Use isotonic regression approach (simplified)
    // Adjust confidence based on observed vs expected performance
    const calibrationFactor = bucket.actualWinRate / bucket.expectedWinRate;
    const calibratedConfidence = rawConfidence * calibrationFactor;
    
    return Math.max(0.01, Math.min(0.99, calibratedConfidence));
  }

  public getConfidenceDistribution(): ConfidenceDistribution[] {
    const distribution: ConfidenceDistribution[] = [];
    
    for (const bucket of this.calibrationBuckets) {
      if (bucket.tradeCount > 0) {
        const bucketTrades = this.tradeHistory.filter(t => 
          t.entryConfidence >= bucket.minConfidence && 
          t.entryConfidence < bucket.maxConfidence
        );
        
        const avgConfidence = bucketTrades.reduce((sum, t) => sum + t.entryConfidence, 0) / bucketTrades.length;
        const calibrationGap = bucket.actualWinRate - bucket.expectedWinRate;
        
        distribution.push({
          bucket: `${(bucket.minConfidence * 100).toFixed(0)}-${(bucket.maxConfidence * 100).toFixed(0)}%`,
          count: bucket.tradeCount,
          winRate: bucket.actualWinRate * 100,
          avgConfidence: avgConfidence * 100,
          calibrationGap: calibrationGap * 100
        });
      }
    }
    
    return distribution;
  }

  public getCalibrationCurve(): Array<{ confidence: number; actualWinRate: number; expectedWinRate: number; count: number }> {
    return this.calibrationBuckets
      .filter(b => b.tradeCount >= this.minTradesPerBucket)
      .map(b => ({
        confidence: (b.minConfidence + b.maxConfidence) / 2,
        actualWinRate: b.actualWinRate,
        expectedWinRate: b.expectedWinRate,
        count: b.tradeCount
      }));
  }

  public identifyCalibrationIssues(): Array<{ issue: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; recommendation: string }> {
    const issues: Array<{ issue: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; recommendation: string }> = [];
    const metrics = this.getCalibrationMetrics();
    
    // Check overall calibration
    if (metrics.overallCalibration < 0.7) {
      issues.push({
        issue: `Poor overall calibration (${(metrics.overallCalibration * 100).toFixed(1)}%)`,
        severity: 'HIGH',
        recommendation: 'Recalibrate confidence scoring algorithm or retrain model'
      });
    }
    
    // Check for overconfidence
    const highConfidenceBuckets = this.calibrationBuckets.filter(b => 
      b.minConfidence > 0.7 && b.tradeCount >= this.minTradesPerBucket
    );
    
    const overconfidentBuckets = highConfidenceBuckets.filter(b => 
      b.actualWinRate < b.expectedWinRate - 0.1
    );
    
    if (overconfidentBuckets.length > 0) {
      issues.push({
        issue: 'Overconfidence detected in high-confidence predictions',
        severity: 'MEDIUM',
        recommendation: 'Reduce confidence scores for high-confidence signals or add additional filters'
      });
    }
    
    // Check for underconfidence
    const lowConfidenceBuckets = this.calibrationBuckets.filter(b => 
      b.maxConfidence < 0.5 && b.tradeCount >= this.minTradesPerBucket
    );
    
    const underconfidentBuckets = lowConfidenceBuckets.filter(b => 
      b.actualWinRate > b.expectedWinRate + 0.1
    );
    
    if (underconfidentBuckets.length > 0) {
      issues.push({
        issue: 'Underconfidence detected in low-confidence predictions',
        severity: 'LOW',
        recommendation: 'Consider increasing confidence scores for signals that perform better than expected'
      });
    }
    
    // Check Brier score
    if (metrics.brier > 0.3) {
      issues.push({
        issue: `High Brier score (${metrics.brier.toFixed(3)}) indicates poor probability estimates`,
        severity: 'MEDIUM',
        recommendation: 'Improve probability estimation accuracy through better feature engineering'
      });
    }
    
    return issues;
  }

  public generateCalibrationReport(): {
    summary: CalibrationMetrics;
    distribution: ConfidenceDistribution[];
    curve: Array<{ confidence: number; actualWinRate: number; expectedWinRate: number; count: number }>;
    issues: Array<{ issue: string; severity: string; recommendation: string }>;
    recommendations: string[];
  } {
    const summary = this.getCalibrationMetrics();
    const distribution = this.getConfidenceDistribution();
    const curve = this.getCalibrationCurve();
    const issues = this.identifyCalibrationIssues();
    
    const recommendations = this.generateRecommendations(summary, issues);
    
    return {
      summary,
      distribution,
      curve,
      issues,
      recommendations
    };
  }

  private generateRecommendations(metrics: CalibrationMetrics, issues: any[]): string[] {
    const recommendations: string[] = [];
    
    if (metrics.overallCalibration < 0.8) {
      recommendations.push('Implement Platt scaling or isotonic regression for better calibration');
    }
    
    if (metrics.reliability > 0.1) {
      recommendations.push('Focus on reducing reliability component by improving confidence accuracy');
    }
    
    if (metrics.resolution < 0.05) {
      recommendations.push('Improve resolution by better discriminating between different outcome probabilities');
    }
    
    if (issues.some(i => i.severity === 'HIGH')) {
      recommendations.push('Immediate recalibration required - consider retraining confidence model');
    }
    
    if (this.tradeHistory.length < 100) {
      recommendations.push('Collect more trade data for reliable calibration assessment');
    }
    
    return recommendations;
  }

  public performPlattScaling(): { slope: number; intercept: number; improvement: number } {
    // Simplified Platt scaling implementation
    if (this.tradeHistory.length < 50) {
      return { slope: 1, intercept: 0, improvement: 0 };
    }
    
    // Prepare data for logistic regression
    const X = this.tradeHistory.map(t => t.entryConfidence);
    const y = this.tradeHistory.map(t => t.pnl > 0 ? 1 : 0);
    
    // Simple logistic regression (in practice, use a proper ML library)
    const { slope, intercept } = this.simpleLogisticRegression(X, y);
    
    // Calculate improvement
    const originalBrier = this.calculateBrierScore();
    const calibratedPredictions = X.map(x => this.sigmoid(slope * x + intercept));
    const calibratedBrier = this.calculateBrierScoreForPredictions(calibratedPredictions, y);
    const improvement = originalBrier - calibratedBrier;
    
    return { slope, intercept, improvement };
  }

  private simpleLogisticRegression(X: number[], y: number[]): { slope: number; intercept: number } {
    // Simplified logistic regression using gradient descent
    let slope = 1;
    let intercept = 0;
    const learningRate = 0.01;
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      let slopeGradient = 0;
      let interceptGradient = 0;
      
      for (let j = 0; j < X.length; j++) {
        const prediction = this.sigmoid(slope * X[j] + intercept);
        const error = prediction - y[j];
        
        slopeGradient += error * X[j];
        interceptGradient += error;
      }
      
      slope -= learningRate * slopeGradient / X.length;
      intercept -= learningRate * interceptGradient / X.length;
    }
    
    return { slope, intercept };
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private calculateBrierScoreForPredictions(predictions: number[], outcomes: number[]): number {
    let totalScore = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      totalScore += Math.pow(predictions[i] - outcomes[i], 2);
    }
    
    return totalScore / predictions.length;
  }

  public setBucketSize(size: number): void {
    this.bucketSize = Math.max(0.05, Math.min(0.2, size));
    this.initializeBuckets();
    this.recalculateCalibration();
  }

  public setMinTradesPerBucket(minTrades: number): void {
    this.minTradesPerBucket = Math.max(5, minTrades);
  }

  public reset(): void {
    this.tradeHistory = [];
    this.initializeBuckets();
    console.log('🎯 Confidence calibrator reset');
  }

  public exportCalibrationData(): any {
    return {
      tradeHistory: this.tradeHistory.slice(-100), // Last 100 trades
      calibrationBuckets: this.calibrationBuckets,
      metrics: this.getCalibrationMetrics(),
      distribution: this.getConfidenceDistribution(),
      curve: this.getCalibrationCurve()
    };
  }
}