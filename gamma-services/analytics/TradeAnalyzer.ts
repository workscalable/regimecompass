import { 
  PaperPosition, 
  TradeAnalysis, 
  PerformanceMetrics, 
  GreeksImpact,
  MarketRegime,
  ExitReason,
  TradeOutcome
} from '../models/PaperTradingTypes';
import { EventBus } from '../core/EventBus';

export interface TradingPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  avgPnL: number;
  winRate: number;
  confidence: number;
  characteristics: Record<string, any>;
}

export interface TradingInsight {
  category: 'TIMING' | 'SIZING' | 'SELECTION' | 'EXIT' | 'RISK';
  insight: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
  supportingData: any;
  recommendation: string;
}

export interface ConfidenceAnalysis {
  confidenceLevel: number;
  tradeCount: number;
  winRate: number;
  avgPnL: number;
  effectiveness: number; // How well confidence predicted outcomes
  calibration: number; // How well calibrated the confidence was
}

export class TradeAnalyzer {
  private eventBus: EventBus;
  private tradeHistory: PaperPosition[] = [];
  private analysisCache: Map<string, TradeAnalysis> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for closed positions to analyze
    this.eventBus.on('paper:position:closed', (data) => {
      this.analyzeClosedTrade(data.position);
    });
  }

  public analyzeClosedTrade(position: PaperPosition): TradeAnalysis {
    try {
      const analysis: TradeAnalysis = {
        signalId: position.signalId,
        ticker: position.ticker,
        entryConfidence: position.confidence,
        exitConfidence: this.calculateExitConfidence(position),
        expectedMove: this.calculateExpectedMove(position),
        actualMove: Math.abs(position.pnlPercent),
        pnl: position.pnl,
        holdingPeriod: this.calculateHoldingPeriod(position),
        maxFavorableExcursion: position.maxFavorableExcursion,
        maxAdverseExcursion: position.maxAdverseExcursion,
        exitReason: position.exitReason || 'MANUAL',
        learnings: this.generateLearnings(position)
      };

      // Cache the analysis
      this.analysisCache.set(position.id, analysis);
      
      // Add to trade history
      this.tradeHistory.push(position);

      // Emit analysis event
      this.eventBus.emit('paper:trade:analyzed', analysis);

      console.log(`📊 Trade analysis completed for ${position.ticker}: ${analysis.pnl > 0 ? 'WIN' : 'LOSS'} (${analysis.pnl.toFixed(2)})`);
      
      return analysis;
    } catch (error) {
      this.eventBus.emitSystemError(
        error as Error,
        `Trade analysis for position ${position.id}`,
        'MEDIUM'
      );
      
      // Return basic analysis as fallback
      return {
        signalId: position.signalId,
        ticker: position.ticker,
        entryConfidence: position.confidence,
        exitConfidence: 0.5,
        expectedMove: 5.0,
        actualMove: Math.abs(position.pnlPercent),
        pnl: position.pnl,
        holdingPeriod: this.calculateHoldingPeriod(position),
        maxFavorableExcursion: position.maxFavorableExcursion,
        maxAdverseExcursion: position.maxAdverseExcursion,
        exitReason: position.exitReason || 'MANUAL',
        learnings: []
      };
    }
  }

  public calculatePerformanceMetrics(trades?: PaperPosition[]): PerformanceMetrics {
    const tradesToAnalyze = trades || this.tradeHistory.filter(t => t.status === 'CLOSED');
    
    if (tradesToAnalyze.length === 0) {
      return this.getEmptyMetrics();
    }

    const totalTrades = tradesToAnalyze.length;
    const winningTrades = tradesToAnalyze.filter(t => t.pnl > 0).length;
    const losingTrades = tradesToAnalyze.filter(t => t.pnl < 0).length;
    const winRate = (winningTrades / totalTrades) * 100;

    const totalPnL = tradesToAnalyze.reduce((sum, t) => sum + t.pnl, 0);
    const wins = tradesToAnalyze.filter(t => t.pnl > 0);
    const losses = tradesToAnalyze.filter(t => t.pnl < 0);
    
    const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0;
    const profitFactor = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0;

    // Calculate Sharpe ratio
    const returns = tradesToAnalyze.map(t => t.pnlPercent / 100);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = returnStdDev > 0 ? (avgReturn * Math.sqrt(252)) / (returnStdDev * Math.sqrt(252)) : 0;

    // Calculate drawdown
    const { maxDrawdown, maxDrawdownPercent } = this.calculateDrawdown(tradesToAnalyze);

    // Calculate holding period
    const holdingPeriods = tradesToAnalyze
      .filter(t => t.exitTimestamp && t.entryTimestamp)
      .map(t => (t.exitTimestamp!.getTime() - t.entryTimestamp.getTime()) / (1000 * 60 * 60)); // hours
    
    const averageHoldingPeriod = holdingPeriods.length > 0 
      ? holdingPeriods.reduce((sum, h) => sum + h, 0) / holdingPeriods.length 
      : 0;

    // Find best and worst trades
    const pnls = tradesToAnalyze.map(t => t.pnl);
    const bestTrade = Math.max(...pnls);
    const worstTrade = Math.min(...pnls);

    // Calculate consecutive wins/losses
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveStreaks(tradesToAnalyze);

    // Calculate account metrics (simplified)
    const initialBalance = 100000; // Would get from account data
    const currentBalance = initialBalance + totalPnL;
    const returnsPercent = (totalPnL / initialBalance) * 100;

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalPnL,
      averageWin,
      averageLoss,
      profitFactor,
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      averageHoldingPeriod,
      bestTrade,
      worstTrade,
      consecutiveWins,
      consecutiveLosses,
      accountBalance: currentBalance,
      returnsPercent
    };
  }

  public identifyPatterns(trades?: PaperPosition[]): TradingPattern[] {
    const tradesToAnalyze = trades || this.tradeHistory.filter(t => t.status === 'CLOSED');
    const patterns: TradingPattern[] = [];

    // Pattern 1: High Confidence Trades
    const highConfidenceTrades = tradesToAnalyze.filter(t => t.confidence > 0.8);
    if (highConfidenceTrades.length >= 5) {
      patterns.push({
        id: 'high_confidence',
        name: 'High Confidence Trades',
        description: 'Trades with confidence > 80%',
        frequency: highConfidenceTrades.length,
        avgPnL: highConfidenceTrades.reduce((sum, t) => sum + t.pnl, 0) / highConfidenceTrades.length,
        winRate: (highConfidenceTrades.filter(t => t.pnl > 0).length / highConfidenceTrades.length) * 100,
        confidence: 0.8,
        characteristics: {
          minConfidence: 0.8,
          avgConfidence: highConfidenceTrades.reduce((sum, t) => sum + t.confidence, 0) / highConfidenceTrades.length
        }
      });
    }

    // Pattern 2: Bull Market Trades
    const bullTrades = tradesToAnalyze.filter(t => t.regime === 'BULL');
    if (bullTrades.length >= 5) {
      patterns.push({
        id: 'bull_market',
        name: 'Bull Market Trades',
        description: 'Trades executed during bull market regime',
        frequency: bullTrades.length,
        avgPnL: bullTrades.reduce((sum, t) => sum + t.pnl, 0) / bullTrades.length,
        winRate: (bullTrades.filter(t => t.pnl > 0).length / bullTrades.length) * 100,
        confidence: 0.7,
        characteristics: {
          regime: 'BULL',
          avgHoldingPeriod: this.calculateAvgHoldingPeriod(bullTrades)
        }
      });
    }

    // Pattern 3: Call vs Put Performance
    const callTrades = tradesToAnalyze.filter(t => t.contractType === 'CALL');
    const putTrades = tradesToAnalyze.filter(t => t.contractType === 'PUT');
    
    if (callTrades.length >= 5) {
      patterns.push({
        id: 'call_trades',
        name: 'Call Option Trades',
        description: 'Performance of call option trades',
        frequency: callTrades.length,
        avgPnL: callTrades.reduce((sum, t) => sum + t.pnl, 0) / callTrades.length,
        winRate: (callTrades.filter(t => t.pnl > 0).length / callTrades.length) * 100,
        confidence: 0.6,
        characteristics: {
          contractType: 'CALL'
        }
      });
    }

    if (putTrades.length >= 5) {
      patterns.push({
        id: 'put_trades',
        name: 'Put Option Trades',
        description: 'Performance of put option trades',
        frequency: putTrades.length,
        avgPnL: putTrades.reduce((sum, t) => sum + t.pnl, 0) / putTrades.length,
        winRate: (putTrades.filter(t => t.pnl > 0).length / putTrades.length) * 100,
        confidence: 0.6,
        characteristics: {
          contractType: 'PUT'
        }
      });
    }

    // Pattern 4: Quick Exits vs Hold Trades
    const quickExits = tradesToAnalyze.filter(t => this.calculateHoldingPeriod(t) < 4); // Less than 4 hours
    if (quickExits.length >= 5) {
      patterns.push({
        id: 'quick_exits',
        name: 'Quick Exit Trades',
        description: 'Trades held for less than 4 hours',
        frequency: quickExits.length,
        avgPnL: quickExits.reduce((sum, t) => sum + t.pnl, 0) / quickExits.length,
        winRate: (quickExits.filter(t => t.pnl > 0).length / quickExits.length) * 100,
        confidence: 0.5,
        characteristics: {
          maxHoldingPeriod: 4,
          avgHoldingPeriod: this.calculateAvgHoldingPeriod(quickExits)
        }
      });
    }

    return patterns.sort((a, b) => b.avgPnL - a.avgPnL); // Sort by average PnL
  }

  public generateInsights(trades?: PaperPosition[]): TradingInsight[] {
    const tradesToAnalyze = trades || this.tradeHistory.filter(t => t.status === 'CLOSED');
    const insights: TradingInsight[] = [];

    if (tradesToAnalyze.length < 10) {
      return insights; // Need minimum trades for meaningful insights
    }

    const metrics = this.calculatePerformanceMetrics(tradesToAnalyze);
    const patterns = this.identifyPatterns(tradesToAnalyze);

    // Insight 1: Win Rate Analysis
    if (metrics.winRate < 40) {
      insights.push({
        category: 'SELECTION',
        insight: `Win rate is low at ${metrics.winRate.toFixed(1)}%. Consider improving entry criteria.`,
        impact: 'HIGH',
        actionable: true,
        supportingData: { winRate: metrics.winRate, totalTrades: metrics.totalTrades },
        recommendation: 'Increase confidence threshold for trade entry or refine signal quality'
      });
    }

    // Insight 2: Profit Factor Analysis
    if (metrics.profitFactor < 1.5) {
      insights.push({
        category: 'RISK',
        insight: `Profit factor is ${metrics.profitFactor.toFixed(2)}, indicating poor risk/reward ratio.`,
        impact: 'HIGH',
        actionable: true,
        supportingData: { profitFactor: metrics.profitFactor, avgWin: metrics.averageWin, avgLoss: metrics.averageLoss },
        recommendation: 'Improve profit targets or tighten stop losses to enhance risk/reward'
      });
    }

    // Insight 3: Holding Period Analysis
    const avgHoldingHours = metrics.averageHoldingPeriod;
    if (avgHoldingHours > 24) {
      insights.push({
        category: 'TIMING',
        insight: `Average holding period is ${avgHoldingHours.toFixed(1)} hours. Consider shorter-term strategies.`,
        impact: 'MEDIUM',
        actionable: true,
        supportingData: { avgHoldingPeriod: avgHoldingHours },
        recommendation: 'Use shorter expiration options or implement time-based exits'
      });
    }

    // Insight 4: Confidence Effectiveness
    const confidenceAnalysis = this.analyzeConfidenceEffectiveness(tradesToAnalyze);
    if (confidenceAnalysis.some(c => c.effectiveness < 0.6)) {
      insights.push({
        category: 'SELECTION',
        insight: 'Confidence levels are not effectively predicting trade outcomes.',
        impact: 'HIGH',
        actionable: true,
        supportingData: confidenceAnalysis,
        recommendation: 'Recalibrate confidence scoring algorithm or adjust confidence thresholds'
      });
    }

    // Insight 5: Pattern-based Insights
    const bestPattern = patterns[0];
    if (bestPattern && bestPattern.avgPnL > 0) {
      insights.push({
        category: 'SELECTION',
        insight: `${bestPattern.name} shows strong performance with ${bestPattern.winRate.toFixed(1)}% win rate.`,
        impact: 'MEDIUM',
        actionable: true,
        supportingData: bestPattern,
        recommendation: `Focus more on trades matching ${bestPattern.name} characteristics`
      });
    }

    // Insight 6: Exit Reason Analysis
    const exitReasons = this.analyzeExitReasons(tradesToAnalyze);
    const stopLossExits = exitReasons.find(e => e.reason === 'STOP_LOSS');
    if (stopLossExits && stopLossExits.percentage > 40) {
      insights.push({
        category: 'EXIT',
        insight: `${stopLossExits.percentage.toFixed(1)}% of trades hit stop loss. Consider wider stops or better entry timing.`,
        impact: 'MEDIUM',
        actionable: true,
        supportingData: exitReasons,
        recommendation: 'Analyze stop loss levels and consider dynamic stop adjustments'
      });
    }

    return insights.sort((a, b) => {
      const impactOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
      return impactOrder[a.impact] - impactOrder[b.impact];
    });
  }

  private calculateExitConfidence(position: PaperPosition): number {
    // Simplified exit confidence calculation
    // In practice, this would use current market conditions and signals
    if (position.exitReason === 'PROFIT_TARGET') return 0.8;
    if (position.exitReason === 'STOP_LOSS') return 0.9;
    if (position.exitReason === 'EXPIRATION') return 0.6;
    return 0.5;
  }

  private calculateExpectedMove(position: PaperPosition): number {
    // Simplified expected move calculation
    // In practice, this would use implied volatility and time to expiration
    return position.strike * 0.05; // 5% expected move as default
  }

  private calculateHoldingPeriod(position: PaperPosition): number {
    if (!position.exitTimestamp) return 0;
    return (position.exitTimestamp.getTime() - position.entryTimestamp.getTime()) / (1000 * 60 * 60); // hours
  }

  private generateLearnings(position: PaperPosition): string[] {
    const learnings: string[] = [];

    // Confidence-based learnings
    if (position.pnl > 0 && position.confidence > 0.8) {
      learnings.push('High confidence signal led to profitable outcome');
    } else if (position.pnl < 0 && position.confidence > 0.7) {
      learnings.push('High confidence signal resulted in loss - review entry criteria');
    }

    // Exit reason learnings
    if (position.exitReason === 'STOP_LOSS' && position.maxFavorableExcursion > Math.abs(position.pnl)) {
      learnings.push('Position was profitable before hitting stop loss - consider wider stops');
    }

    // Time-based learnings
    const holdingHours = this.calculateHoldingPeriod(position);
    if (holdingHours > 48 && position.pnl < 0) {
      learnings.push('Long holding period with loss - consider time-based exits');
    }

    // Greeks-based learnings
    if (position.greeks.theta < -0.05 && holdingHours > 24) {
      learnings.push('High theta decay with long hold - time decay was significant factor');
    }

    return learnings;
  }

  private calculateDrawdown(trades: PaperPosition[]): { maxDrawdown: number; maxDrawdownPercent: number } {
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    for (const trade of trades.sort((a, b) => a.entryTimestamp.getTime() - b.entryTimestamp.getTime())) {
      runningPnL += trade.pnl;
      
      if (runningPnL > peak) {
        peak = runningPnL;
      }
      
      const drawdown = peak - runningPnL;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;
    
    return { maxDrawdown, maxDrawdownPercent };
  }

  private calculateConsecutiveStreaks(trades: PaperPosition[]): { consecutiveWins: number; consecutiveLosses: number } {
    let maxWins = 0;
    let maxLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    const sortedTrades = trades.sort((a, b) => a.entryTimestamp.getTime() - b.entryTimestamp.getTime());

    for (const trade of sortedTrades) {
      if (trade.pnl > 0) {
        currentWins++;
        currentLosses = 0;
        maxWins = Math.max(maxWins, currentWins);
      } else {
        currentLosses++;
        currentWins = 0;
        maxLosses = Math.max(maxLosses, currentLosses);
      }
    }

    return { consecutiveWins: maxWins, consecutiveLosses: maxLosses };
  }

  private calculateAvgHoldingPeriod(trades: PaperPosition[]): number {
    const periods = trades
      .filter(t => t.exitTimestamp)
      .map(t => this.calculateHoldingPeriod(t));
    
    return periods.length > 0 ? periods.reduce((sum, p) => sum + p, 0) / periods.length : 0;
  }

  private analyzeConfidenceEffectiveness(trades: PaperPosition[]): ConfidenceAnalysis[] {
    const confidenceBuckets = [
      { min: 0.0, max: 0.5, level: 0.25 },
      { min: 0.5, max: 0.7, level: 0.6 },
      { min: 0.7, max: 0.85, level: 0.775 },
      { min: 0.85, max: 1.0, level: 0.925 }
    ];

    return confidenceBuckets.map(bucket => {
      const bucketTrades = trades.filter(t => t.confidence >= bucket.min && t.confidence < bucket.max);
      
      if (bucketTrades.length === 0) {
        return {
          confidenceLevel: bucket.level,
          tradeCount: 0,
          winRate: 0,
          avgPnL: 0,
          effectiveness: 0,
          calibration: 0
        };
      }

      const winRate = (bucketTrades.filter(t => t.pnl > 0).length / bucketTrades.length) * 100;
      const avgPnL = bucketTrades.reduce((sum, t) => sum + t.pnl, 0) / bucketTrades.length;
      
      // Effectiveness: how well confidence predicted positive outcomes
      const effectiveness = winRate / 100;
      
      // Calibration: how close the win rate is to the confidence level
      const calibration = 1 - Math.abs(winRate / 100 - bucket.level);

      return {
        confidenceLevel: bucket.level,
        tradeCount: bucketTrades.length,
        winRate,
        avgPnL,
        effectiveness,
        calibration
      };
    });
  }

  private analyzeExitReasons(trades: PaperPosition[]): Array<{ reason: string; count: number; percentage: number; avgPnL: number }> {
    const exitReasons: Record<string, { count: number; totalPnL: number }> = {};

    for (const trade of trades) {
      const reason = trade.exitReason || 'MANUAL';
      if (!exitReasons[reason]) {
        exitReasons[reason] = { count: 0, totalPnL: 0 };
      }
      exitReasons[reason].count++;
      exitReasons[reason].totalPnL += trade.pnl;
    }

    return Object.entries(exitReasons).map(([reason, data]) => ({
      reason,
      count: data.count,
      percentage: (data.count / trades.length) * 100,
      avgPnL: data.totalPnL / data.count
    }));
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnL: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      averageHoldingPeriod: 0,
      bestTrade: 0,
      worstTrade: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      accountBalance: 100000,
      returnsPercent: 0
    };
  }

  public getTradeHistory(): PaperPosition[] {
    return [...this.tradeHistory];
  }

  public getAnalysis(positionId: string): TradeAnalysis | undefined {
    return this.analysisCache.get(positionId);
  }

  public clearHistory(): void {
    this.tradeHistory = [];
    this.analysisCache.clear();
    console.log('📊 Trade analysis history cleared');
  }
}