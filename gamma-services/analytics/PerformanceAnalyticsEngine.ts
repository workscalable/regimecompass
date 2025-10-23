import { EventBus } from '../core/EventBus';
import { DatabaseManager } from '../database/DatabaseManager';
import { PaperPosition, TradeAnalysis, PerformanceMetrics, MarketRegime, ExitReason } from '../models/PaperTradingTypes';
import { logger, createLogger } from '../logging/Logger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export interface RealTimeMetrics {
  // Basic performance metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // Profitability metrics
  totalPnL: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  
  // Risk-adjusted metrics
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  currentDrawdown: number;
  currentDrawdownPercent: number;
  
  // Advanced metrics
  averageHoldingPeriod: number; // in hours
  bestTrade: number;
  worstTrade: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  
  // Confidence metrics
  averageConfidence: number;
  confidenceAccuracy: number;
  
  // Time-based metrics
  calculatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

export interface ConfidenceEffectiveness {
  confidenceRange: string; // e.g., "0.8-1.0", "0.6-0.8", "0.4-0.6"
  totalTrades: number;
  winRate: number;
  averagePnL: number;
  accuracy: number; // How often high confidence actually wins
  calibration: number; // How well confidence predicts actual outcomes
  recommendedAdjustment: number; // Suggested confidence adjustment (-0.2 to +0.2)
}

export interface SignalAccuracy {
  signalType: string; // e.g., "trend", "momentum", "volume", "ribbon", "fibonacci", "gamma"
  totalSignals: number;
  successfulSignals: number;
  accuracy: number;
  averageContribution: number; // Average contribution to overall confidence
  effectiveness: number; // Success rate weighted by contribution
  recommendedWeight: number; // Suggested weight adjustment
}

export interface PerformanceBreakdown {
  // By ticker
  byTicker: Record<string, RealTimeMetrics>;
  
  // By strategy/signal type
  byStrategy: Record<string, RealTimeMetrics>;
  
  // By market regime
  byRegime: Record<MarketRegime, RealTimeMetrics>;
  
  // By confidence level
  byConfidence: Record<string, RealTimeMetrics>;
  
  // By exit reason
  byExitReason: Record<ExitReason, RealTimeMetrics>;
  
  // By time period
  byTimeframe: {
    daily: RealTimeMetrics[];
    weekly: RealTimeMetrics[];
    monthly: RealTimeMetrics[];
  };
}

export interface PerformanceAnalyticsConfig {
  // Calculation settings
  lookbackPeriodDays: number; // Default: 30 days
  minTradesForAnalysis: number; // Default: 10 trades
  confidenceRanges: number[]; // Default: [0.4, 0.6, 0.8, 1.0]
  
  // Update frequency
  realTimeUpdateIntervalMs: number; // Default: 5000ms (5 seconds)
  
  // Risk-free rate for Sharpe ratio calculation
  riskFreeRate: number; // Default: 0.02 (2% annual)
  
  // Performance thresholds
  minWinRateThreshold: number; // Default: 0.55 (55%)
  minProfitFactorThreshold: number; // Default: 1.5
  maxDrawdownThreshold: number; // Default: 0.05 (5%)
}

export class PerformanceAnalyticsEngine {
  private eventBus: EventBus;
  private databaseManager: DatabaseManager;
  private config: PerformanceAnalyticsConfig;
  private logger = createLogger({ component: 'PerformanceAnalyticsEngine' });
  
  // In-memory caches for performance
  private tradesCache: PaperPosition[] = [];
  private analysisCache: TradeAnalysis[] = [];
  private metricsCache: RealTimeMetrics | null = null;
  private lastCacheUpdate: Date = new Date(0);
  
  // Real-time tracking
  private updateInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  
  // Performance tracking
  private peakAccountValue: number = 0;
  private currentAccountValue: number = 0;
  private dailyReturns: number[] = [];

  constructor(
    eventBus: EventBus,
    databaseManager: DatabaseManager,
    config?: Partial<PerformanceAnalyticsConfig>
  ) {
    this.eventBus = eventBus;
    this.databaseManager = databaseManager;
    this.config = {
      lookbackPeriodDays: 30,
      minTradesForAnalysis: 10,
      confidenceRanges: [0.4, 0.6, 0.8, 1.0],
      realTimeUpdateIntervalMs: 5000,
      riskFreeRate: 0.02,
      minWinRateThreshold: 0.55,
      minProfitFactorThreshold: 1.5,
      maxDrawdownThreshold: 0.05,
      ...config
    };
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for trade completions
    this.eventBus.on('paper:position:closed', async (data) => {
      await this.onTradeCompleted(data.position);
    });

    // Listen for account updates
    this.eventBus.on('paper:account:update', async (data) => {
      await this.onAccountUpdated(data.balance, data.totalPnL);
    });

    // Listen for trade analysis
    this.eventBus.on('paper:trade:analyzed', async (analysis) => {
      await this.onTradeAnalyzed(analysis);
    });
  }

  public async startRealTimeAnalytics(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // Initial cache load
    await this.refreshCache();
    
    // Start real-time updates
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateRealTimeMetrics();
      } catch (error) {
        await this.logger.error('PERFORMANCE', 'Error updating real-time metrics', {}, error as Error);
      }
    }, this.config.realTimeUpdateIntervalMs);

    await this.logger.info('PERFORMANCE', 'Performance analytics engine started');
  }

  public async stopRealTimeAnalytics(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    
    this.isRunning = false;
    await this.logger.info('PERFORMANCE', 'Performance analytics engine stopped');
  }

  public async calculateRealTimeMetrics(): Promise<RealTimeMetrics> {
    return await performanceMonitor.trackOperation('calculate-real-time-metrics', async () => {
      // Ensure we have fresh data
      await this.refreshCacheIfNeeded();
      
      const trades = this.tradesCache;
      const now = new Date();
      const periodStart = new Date(now.getTime() - (this.config.lookbackPeriodDays * 24 * 60 * 60 * 1000));
      
      // Filter trades within the lookback period
      const recentTrades = trades.filter(trade => 
        trade.exitTimestamp && trade.exitTimestamp >= periodStart
      );

      if (recentTrades.length === 0) {
        return this.getEmptyMetrics(periodStart, now);
      }

      // Basic counts
      const totalTrades = recentTrades.length;
      const winningTrades = recentTrades.filter(t => t.pnl > 0).length;
      const losingTrades = recentTrades.filter(t => t.pnl < 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) : 0;

      // PnL calculations
      const totalPnL = recentTrades.reduce((sum, t) => sum + t.pnl, 0);
      const wins = recentTrades.filter(t => t.pnl > 0);
      const losses = recentTrades.filter(t => t.pnl < 0);
      
      const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
      const averageLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0;
      const profitFactor = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0;

      // Risk metrics
      const returns = this.calculateReturns(recentTrades);
      const sharpeRatio = this.calculateSharpeRatio(returns);
      const { maxDrawdown, maxDrawdownPercent, currentDrawdown, currentDrawdownPercent } = 
        this.calculateDrawdownMetrics(recentTrades);

      // Advanced metrics
      const holdingPeriods = recentTrades
        .filter(t => t.exitTimestamp)
        .map(t => (t.exitTimestamp!.getTime() - t.entryTimestamp.getTime()) / (1000 * 60 * 60));
      const averageHoldingPeriod = holdingPeriods.length > 0 
        ? holdingPeriods.reduce((sum, h) => sum + h, 0) / holdingPeriods.length 
        : 0;

      const bestTrade = Math.max(...recentTrades.map(t => t.pnl), 0);
      const worstTrade = Math.min(...recentTrades.map(t => t.pnl), 0);

      // Consecutive wins/losses
      const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveMetrics(recentTrades);

      // Confidence metrics
      const averageConfidence = recentTrades.reduce((sum, t) => sum + t.confidence, 0) / totalTrades;
      const confidenceAccuracy = this.calculateConfidenceAccuracy(recentTrades);

      const metrics: RealTimeMetrics = {
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
        currentDrawdown,
        currentDrawdownPercent,
        averageHoldingPeriod,
        bestTrade,
        worstTrade,
        consecutiveWins,
        consecutiveLosses,
        averageConfidence,
        confidenceAccuracy,
        calculatedAt: now,
        periodStart,
        periodEnd: now
      };

      // Cache the result
      this.metricsCache = metrics;
      this.lastCacheUpdate = now;

      return metrics;
    });
  }

  public async analyzeConfidenceEffectiveness(): Promise<ConfidenceEffectiveness[]> {
    return await performanceMonitor.trackOperation('analyze-confidence-effectiveness', async () => {
      await this.refreshCacheIfNeeded();
      
      const trades = this.tradesCache;
      const ranges = this.config.confidenceRanges;
      const effectiveness: ConfidenceEffectiveness[] = [];

      for (let i = 0; i < ranges.length - 1; i++) {
        const minConf = ranges[i];
        const maxConf = ranges[i + 1];
        const rangeLabel = `${minConf.toFixed(1)}-${maxConf.toFixed(1)}`;
        
        const rangeTrades = trades.filter(t => 
          t.confidence >= minConf && t.confidence < maxConf && t.exitTimestamp
        );

        if (rangeTrades.length < this.config.minTradesForAnalysis) {
          continue;
        }

        const winRate = rangeTrades.filter(t => t.pnl > 0).length / rangeTrades.length;
        const averagePnL = rangeTrades.reduce((sum, t) => sum + t.pnl, 0) / rangeTrades.length;
        
        // Accuracy: How often trades in this confidence range are profitable
        const accuracy = winRate;
        
        // Calibration: How well the confidence level predicts actual outcomes
        const expectedWinRate = (minConf + maxConf) / 2; // Expected based on confidence
        const calibration = 1 - Math.abs(winRate - expectedWinRate);
        
        // Recommended adjustment based on calibration
        const calibrationError = winRate - expectedWinRate;
        const recommendedAdjustment = Math.max(-0.2, Math.min(0.2, calibrationError * 0.5));

        effectiveness.push({
          confidenceRange: rangeLabel,
          totalTrades: rangeTrades.length,
          winRate,
          averagePnL,
          accuracy,
          calibration,
          recommendedAdjustment
        });
      }

      return effectiveness;
    });
  }

  public async analyzeSignalAccuracy(): Promise<SignalAccuracy[]> {
    return await performanceMonitor.trackOperation('analyze-signal-accuracy', async () => {
      await this.refreshCacheIfNeeded();
      
      const analyses = this.analysisCache;
      const signalTypes = ['trend', 'momentum', 'volume', 'ribbon', 'fibonacci', 'gamma'];
      const accuracy: SignalAccuracy[] = [];

      for (const signalType of signalTypes) {
        // This would need to be enhanced with actual signal contribution data
        // For now, we'll use placeholder logic based on trade analysis
        const relevantAnalyses = analyses.filter(a => 
          a.learnings.some(learning => learning.toLowerCase().includes(signalType))
        );

        if (relevantAnalyses.length < this.config.minTradesForAnalysis) {
          continue;
        }

        const successfulSignals = relevantAnalyses.filter(a => a.pnl > 0).length;
        const signalAccuracy = successfulSignals / relevantAnalyses.length;
        
        // Placeholder calculations - would be enhanced with actual signal data
        const averageContribution = 0.2; // 20% average contribution
        const effectiveness = signalAccuracy * averageContribution;
        const recommendedWeight = Math.max(0.05, Math.min(0.4, effectiveness * 2));

        accuracy.push({
          signalType,
          totalSignals: relevantAnalyses.length,
          successfulSignals,
          accuracy: signalAccuracy,
          averageContribution,
          effectiveness,
          recommendedWeight
        });
      }

      return accuracy;
    });
  }

  public async generatePerformanceBreakdown(): Promise<PerformanceBreakdown> {
    return await performanceMonitor.trackOperation('generate-performance-breakdown', async () => {
      await this.refreshCacheIfNeeded();
      
      const trades = this.tradesCache;
      
      // Group trades by different dimensions
      const byTicker = this.groupTradesByTicker(trades);
      const byStrategy = this.groupTradesByStrategy(trades);
      const byRegime = this.groupTradesByRegime(trades);
      const byConfidence = this.groupTradesByConfidence(trades);
      const byExitReason = this.groupTradesByExitReason(trades);
      const byTimeframe = await this.groupTradesByTimeframe(trades);

      return {
        byTicker,
        byStrategy,
        byRegime,
        byConfidence,
        byExitReason,
        byTimeframe
      };
    });
  }

  private async refreshCacheIfNeeded(): Promise<void> {
    const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
    const maxCacheAge = this.config.realTimeUpdateIntervalMs * 2; // 2x update interval
    
    if (cacheAge > maxCacheAge || this.tradesCache.length === 0) {
      await this.refreshCache();
    }
  }

  private async refreshCache(): Promise<void> {
    try {
      // Load recent trades
      const cutoffDate = new Date(Date.now() - (this.config.lookbackPeriodDays * 24 * 60 * 60 * 1000));
      
      // This would need to be implemented in DatabaseManager
      // For now, we'll use placeholder data
      this.tradesCache = []; // await this.databaseManager.getTradesSince(cutoffDate);
      this.analysisCache = []; // await this.databaseManager.getTradeAnalysesSince(cutoffDate);
      
      this.lastCacheUpdate = new Date();
    } catch (error) {
      await this.logger.error('PERFORMANCE', 'Error refreshing cache', {}, error as Error);
    }
  }

  private async updateRealTimeMetrics(): Promise<void> {
    try {
      const metrics = await this.calculateRealTimeMetrics();
      
      // Emit metrics update event
      this.eventBus.emit('analytics:metrics:updated', {
        metrics,
        timestamp: new Date()
      });
      
      // Check for performance alerts
      await this.checkPerformanceAlerts(metrics);
      
    } catch (error) {
      await this.logger.error('PERFORMANCE', 'Error updating real-time metrics', {}, error as Error);
    }
  }

  private async checkPerformanceAlerts(metrics: RealTimeMetrics): Promise<void> {
    const alerts: string[] = [];
    
    // Check win rate threshold
    if (metrics.totalTrades >= this.config.minTradesForAnalysis && 
        metrics.winRate < this.config.minWinRateThreshold) {
      alerts.push(`Win rate below threshold: ${(metrics.winRate * 100).toFixed(1)}% < ${(this.config.minWinRateThreshold * 100).toFixed(1)}%`);
    }
    
    // Check profit factor threshold
    if (metrics.totalTrades >= this.config.minTradesForAnalysis && 
        metrics.profitFactor < this.config.minProfitFactorThreshold) {
      alerts.push(`Profit factor below threshold: ${metrics.profitFactor.toFixed(2)} < ${this.config.minProfitFactorThreshold}`);
    }
    
    // Check drawdown threshold
    if (metrics.currentDrawdownPercent > this.config.maxDrawdownThreshold * 100) {
      alerts.push(`Drawdown exceeds threshold: ${metrics.currentDrawdownPercent.toFixed(2)}% > ${(this.config.maxDrawdownThreshold * 100).toFixed(2)}%`);
    }
    
    // Emit alerts if any
    if (alerts.length > 0) {
      this.eventBus.emit('analytics:performance:alert', {
        alerts,
        severity: 'MEDIUM',
        timestamp: new Date()
      });
    }
  }

  private getEmptyMetrics(periodStart: Date, periodEnd: Date): RealTimeMetrics {
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
      currentDrawdown: 0,
      currentDrawdownPercent: 0,
      averageHoldingPeriod: 0,
      bestTrade: 0,
      worstTrade: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      averageConfidence: 0,
      confidenceAccuracy: 0,
      calculatedAt: new Date(),
      periodStart,
      periodEnd
    };
  }

  private calculateReturns(trades: PaperPosition[]): number[] {
    // Calculate daily returns based on trade PnL
    const dailyPnL: Record<string, number> = {};
    
    trades.forEach(trade => {
      if (trade.exitTimestamp) {
        const dateKey = trade.exitTimestamp.toISOString().split('T')[0];
        dailyPnL[dateKey] = (dailyPnL[dateKey] || 0) + trade.pnl;
      }
    });
    
    return Object.values(dailyPnL);
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    
    // Annualized Sharpe ratio
    const annualizedReturn = avgReturn * 252; // 252 trading days
    const annualizedStdDev = stdDev * Math.sqrt(252);
    
    return (annualizedReturn - this.config.riskFreeRate) / annualizedStdDev;
  }

  private calculateDrawdownMetrics(trades: PaperPosition[]): {
    maxDrawdown: number;
    maxDrawdownPercent: number;
    currentDrawdown: number;
    currentDrawdownPercent: number;
  } {
    let peak = 0;
    let maxDrawdown = 0;
    let currentValue = 0;
    
    // Sort trades by exit timestamp
    const sortedTrades = trades
      .filter(t => t.exitTimestamp)
      .sort((a, b) => a.exitTimestamp!.getTime() - b.exitTimestamp!.getTime());
    
    sortedTrades.forEach(trade => {
      currentValue += trade.pnl;
      
      if (currentValue > peak) {
        peak = currentValue;
      }
      
      const drawdown = peak - currentValue;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });
    
    const currentDrawdown = peak - currentValue;
    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;
    const currentDrawdownPercent = peak > 0 ? (currentDrawdown / peak) * 100 : 0;
    
    return {
      maxDrawdown,
      maxDrawdownPercent,
      currentDrawdown,
      currentDrawdownPercent
    };
  }

  private calculateConsecutiveMetrics(trades: PaperPosition[]): {
    consecutiveWins: number;
    consecutiveLosses: number;
  } {
    if (trades.length === 0) return { consecutiveWins: 0, consecutiveLosses: 0 };
    
    // Sort trades by exit timestamp
    const sortedTrades = trades
      .filter(t => t.exitTimestamp)
      .sort((a, b) => a.exitTimestamp!.getTime() - b.exitTimestamp!.getTime());
    
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    
    sortedTrades.forEach(trade => {
      if (trade.pnl > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
      } else {
        currentLossStreak++;
        currentWinStreak = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
      }
    });
    
    return {
      consecutiveWins: maxConsecutiveWins,
      consecutiveLosses: maxConsecutiveLosses
    };
  }

  private calculateConfidenceAccuracy(trades: PaperPosition[]): number {
    if (trades.length === 0) return 0;
    
    // Calculate how well confidence predicts outcomes
    let totalAccuracy = 0;
    
    trades.forEach(trade => {
      const isWin = trade.pnl > 0;
      const expectedWinProbability = trade.confidence;
      const actualOutcome = isWin ? 1 : 0;
      
      // Brier score (lower is better, so we invert it)
      const brierScore = Math.pow(expectedWinProbability - actualOutcome, 2);
      const accuracy = 1 - brierScore;
      
      totalAccuracy += accuracy;
    });
    
    return totalAccuracy / trades.length;
  }

  private groupTradesByTicker(trades: PaperPosition[]): Record<string, RealTimeMetrics> {
    const grouped: Record<string, PaperPosition[]> = {};
    
    trades.forEach(trade => {
      if (!grouped[trade.ticker]) {
        grouped[trade.ticker] = [];
      }
      grouped[trade.ticker].push(trade);
    });
    
    const result: Record<string, RealTimeMetrics> = {};
    Object.entries(grouped).forEach(([ticker, tickerTrades]) => {
      result[ticker] = this.calculateMetricsForTrades(tickerTrades);
    });
    
    return result;
  }

  private groupTradesByStrategy(trades: PaperPosition[]): Record<string, RealTimeMetrics> {
    // This would be enhanced with actual strategy classification
    // For now, we'll group by confidence level as a proxy
    const grouped: Record<string, PaperPosition[]> = {
      'high-confidence': trades.filter(t => t.confidence >= 0.8),
      'medium-confidence': trades.filter(t => t.confidence >= 0.6 && t.confidence < 0.8),
      'low-confidence': trades.filter(t => t.confidence < 0.6)
    };
    
    const result: Record<string, RealTimeMetrics> = {};
    Object.entries(grouped).forEach(([strategy, strategyTrades]) => {
      if (strategyTrades.length > 0) {
        result[strategy] = this.calculateMetricsForTrades(strategyTrades);
      }
    });
    
    return result;
  }

  private groupTradesByRegime(trades: PaperPosition[]): Record<MarketRegime, RealTimeMetrics> {
    const grouped: Record<MarketRegime, PaperPosition[]> = {
      'BULL': [],
      'BEAR': [],
      'NEUTRAL': []
    };
    
    trades.forEach(trade => {
      grouped[trade.regime].push(trade);
    });
    
    const result: Record<MarketRegime, RealTimeMetrics> = {} as Record<MarketRegime, RealTimeMetrics>;
    Object.entries(grouped).forEach(([regime, regimeTrades]) => {
      if (regimeTrades.length > 0) {
        result[regime as MarketRegime] = this.calculateMetricsForTrades(regimeTrades);
      }
    });
    
    return result;
  }

  private groupTradesByConfidence(trades: PaperPosition[]): Record<string, RealTimeMetrics> {
    const ranges = this.config.confidenceRanges;
    const grouped: Record<string, PaperPosition[]> = {};
    
    for (let i = 0; i < ranges.length - 1; i++) {
      const minConf = ranges[i];
      const maxConf = ranges[i + 1];
      const rangeLabel = `${minConf.toFixed(1)}-${maxConf.toFixed(1)}`;
      
      grouped[rangeLabel] = trades.filter(t => 
        t.confidence >= minConf && t.confidence < maxConf
      );
    }
    
    const result: Record<string, RealTimeMetrics> = {};
    Object.entries(grouped).forEach(([range, rangeTrades]) => {
      if (rangeTrades.length > 0) {
        result[range] = this.calculateMetricsForTrades(rangeTrades);
      }
    });
    
    return result;
  }

  private groupTradesByExitReason(trades: PaperPosition[]): Record<ExitReason, RealTimeMetrics> {
    const grouped: Record<ExitReason, PaperPosition[]> = {
      'PROFIT_TARGET': [],
      'STOP_LOSS': [],
      'TIME_DECAY': [],
      'EXPIRATION': [],
      'RISK_MANAGEMENT': [],
      'MANUAL': []
    };
    
    trades.forEach(trade => {
      if (trade.exitReason) {
        grouped[trade.exitReason].push(trade);
      }
    });
    
    const result: Record<ExitReason, RealTimeMetrics> = {} as Record<ExitReason, RealTimeMetrics>;
    Object.entries(grouped).forEach(([reason, reasonTrades]) => {
      if (reasonTrades.length > 0) {
        result[reason as ExitReason] = this.calculateMetricsForTrades(reasonTrades);
      }
    });
    
    return result;
  }

  private async groupTradesByTimeframe(trades: PaperPosition[]): Promise<{
    daily: RealTimeMetrics[];
    weekly: RealTimeMetrics[];
    monthly: RealTimeMetrics[];
  }> {
    // Group trades by day, week, and month
    const daily: Record<string, PaperPosition[]> = {};
    const weekly: Record<string, PaperPosition[]> = {};
    const monthly: Record<string, PaperPosition[]> = {};
    
    trades.forEach(trade => {
      if (trade.exitTimestamp) {
        const date = trade.exitTimestamp;
        
        // Daily grouping
        const dayKey = date.toISOString().split('T')[0];
        if (!daily[dayKey]) daily[dayKey] = [];
        daily[dayKey].push(trade);
        
        // Weekly grouping (ISO week)
        const weekKey = this.getISOWeek(date);
        if (!weekly[weekKey]) weekly[weekKey] = [];
        weekly[weekKey].push(trade);
        
        // Monthly grouping
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[monthKey]) monthly[monthKey] = [];
        monthly[monthKey].push(trade);
      }
    });
    
    return {
      daily: Object.values(daily).map(dayTrades => this.calculateMetricsForTrades(dayTrades)),
      weekly: Object.values(weekly).map(weekTrades => this.calculateMetricsForTrades(weekTrades)),
      monthly: Object.values(monthly).map(monthTrades => this.calculateMetricsForTrades(monthTrades))
    };
  }

  private calculateMetricsForTrades(trades: PaperPosition[]): RealTimeMetrics {
    if (trades.length === 0) {
      return this.getEmptyMetrics(new Date(), new Date());
    }
    
    // Use the same calculation logic as calculateRealTimeMetrics but for specific trade subset
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) : 0;
    
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    
    const averageWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0;
    const profitFactor = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0;
    
    const returns = this.calculateReturns(trades);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    const { maxDrawdown, maxDrawdownPercent, currentDrawdown, currentDrawdownPercent } = 
      this.calculateDrawdownMetrics(trades);
    
    const holdingPeriods = trades
      .filter(t => t.exitTimestamp)
      .map(t => (t.exitTimestamp!.getTime() - t.entryTimestamp.getTime()) / (1000 * 60 * 60));
    const averageHoldingPeriod = holdingPeriods.length > 0 
      ? holdingPeriods.reduce((sum, h) => sum + h, 0) / holdingPeriods.length 
      : 0;
    
    const bestTrade = Math.max(...trades.map(t => t.pnl), 0);
    const worstTrade = Math.min(...trades.map(t => t.pnl), 0);
    
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveMetrics(trades);
    
    const averageConfidence = trades.reduce((sum, t) => sum + t.confidence, 0) / totalTrades;
    const confidenceAccuracy = this.calculateConfidenceAccuracy(trades);
    
    const sortedTrades = trades
      .filter(t => t.exitTimestamp)
      .sort((a, b) => a.exitTimestamp!.getTime() - b.exitTimestamp!.getTime());
    
    const periodStart = sortedTrades.length > 0 ? sortedTrades[0].exitTimestamp! : new Date();
    const periodEnd = sortedTrades.length > 0 ? sortedTrades[sortedTrades.length - 1].exitTimestamp! : new Date();
    
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
      currentDrawdown,
      currentDrawdownPercent,
      averageHoldingPeriod,
      bestTrade,
      worstTrade,
      consecutiveWins,
      consecutiveLosses,
      averageConfidence,
      confidenceAccuracy,
      calculatedAt: new Date(),
      periodStart,
      periodEnd
    };
  }

  private getISOWeek(date: Date): string {
    const year = date.getFullYear();
    const start = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + start.getDay() + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  private async onTradeCompleted(position: PaperPosition): Promise<void> {
    // Add to cache
    this.tradesCache.push(position);
    
    // Trigger metrics update
    if (this.isRunning) {
      await this.updateRealTimeMetrics();
    }
  }

  private async onAccountUpdated(balance: number, totalPnL: number): Promise<void> {
    this.currentAccountValue = balance;
    
    if (balance > this.peakAccountValue) {
      this.peakAccountValue = balance;
    }
  }

  private async onTradeAnalyzed(analysis: TradeAnalysis): Promise<void> {
    // Add to analysis cache
    this.analysisCache.push(analysis);
  }

  public getConfig(): PerformanceAnalyticsConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<PerformanceAnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('PERFORMANCE', 'Performance analytics configuration updated');
  }

  public async getHealthStatus(): Promise<{
    isRunning: boolean;
    lastUpdate: Date;
    cacheSize: number;
    metricsAvailable: boolean;
  }> {
    return {
      isRunning: this.isRunning,
      lastUpdate: this.lastCacheUpdate,
      cacheSize: this.tradesCache.length,
      metricsAvailable: this.metricsCache !== null
    };
  }

  public async shutdown(): Promise<void> {
    this.stopRealTimeAnalytics();
    this.tradesCache = [];
    this.analysisCache = [];
    this.metricsCache = null;
    
    await this.logger.info('PERFORMANCE', 'Performance analytics engine shutdown complete');
  }
}