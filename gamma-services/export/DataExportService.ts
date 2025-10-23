import { PaperPosition, TradeAnalysis, PerformanceMetrics } from '../models/PaperTradingTypes';
import { TradeAnalyzer } from '../analytics/TradeAnalyzer';
import { PaperTradingEngine } from '../paper/PaperTradingEngine';
import { CSVFormatter } from './CSVFormatter';

export interface ExportOptions {
  format: 'CSV' | 'JSON' | 'PDF';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeOpenPositions?: boolean;
  includeAnalytics?: boolean;
  customFields?: string[];
}

export interface TradeExportData {
  tradeId: string;
  ticker: string;
  side: string;
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  confidence: number;
  conviction: number;
  expectedMove: number;
  actualMove?: number;
  timeframe: string;
  regime: string;
  source: string;
  status: string;
  daysHeld?: number;
  maxFavorableExcursion?: number;
  maxAdverseExcursion?: number;
  exitReason?: string;
}

export interface PerformanceExportData {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnL: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  calmarRatio: number;
  averageHoldingPeriod: number;
  confidenceEffectiveness: number;
  regimePerformance: Record<string, {
    trades: number;
    winRate: number;
    avgPnL: number;
  }>;
}

export class DataExportService {
  private tradeAnalyzer: TradeAnalyzer;
  private paperEngine: PaperTradingEngine;

  constructor(tradeAnalyzer: TradeAnalyzer, paperEngine: PaperTradingEngine) {
    this.tradeAnalyzer = tradeAnalyzer;
    this.paperEngine = paperEngine;
  }

  // Export trade history to CSV
  public async exportTradesToCSV(options: ExportOptions = { format: 'CSV' }): Promise<string> {
    const trades = await this.getTradeData(options);
    
    if (trades.length === 0) {
      return 'No trades found for the specified criteria';
    }

    const formatter = CSVFormatter.createTradeFormatter();
    return formatter.formatTradeExport(trades);
  }

  // Export performance metrics to CSV
  public async exportPerformanceToCSV(options: ExportOptions = { format: 'CSV' }): Promise<string> {
    const performance = await this.getPerformanceData(options);
    
    const formatter = CSVFormatter.createPerformanceFormatter();
    return formatter.formatPerformanceExport(performance);
  }

  // Export data as JSON
  public async exportToJSON(options: ExportOptions): Promise<{
    trades?: TradeExportData[];
    performance?: PerformanceExportData;
    metadata: {
      exportDate: string;
      dateRange?: { start: string; end: string };
      totalRecords: number;
    };
  }> {
    const result: any = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: 0
      }
    };

    if (options.dateRange) {
      result.metadata.dateRange = {
        start: options.dateRange.start.toISOString(),
        end: options.dateRange.end.toISOString()
      };
    }

    // Include trades if requested
    if (!options.customFields || options.customFields.includes('trades')) {
      const trades = await this.getTradeData(options);
      result.trades = trades;
      result.metadata.totalRecords += trades.length;
    }

    // Include performance analytics if requested
    if (options.includeAnalytics || (options.customFields && options.customFields.includes('performance'))) {
      result.performance = await this.getPerformanceData(options);
    }

    return result;
  }

  // Generate formatted performance report
  public async generatePerformanceReport(options: ExportOptions = { format: 'JSON' }): Promise<{
    summary: PerformanceExportData;
    tradeBreakdown: {
      byRegime: Record<string, { count: number; winRate: number; avgPnL: number }>;
      byTimeframe: Record<string, { count: number; winRate: number; avgPnL: number }>;
      byConfidenceLevel: Record<string, { count: number; winRate: number; avgPnL: number }>;
    };
    insights: string[];
    recommendations: string[];
  }> {
    const trades = await this.getTradeData(options);
    const performance = await this.getPerformanceData(options);

    // Analyze trades by different dimensions
    const tradeBreakdown = {
      byRegime: this.analyzeTradesByDimension(trades, 'regime'),
      byTimeframe: this.analyzeTradesByDimension(trades, 'timeframe'),
      byConfidenceLevel: this.analyzeTradesByConfidenceLevel(trades)
    };

    // Generate insights
    const insights = this.generateInsights(trades, performance);
    const recommendations = this.generateRecommendations(trades, performance, tradeBreakdown);

    return {
      summary: performance,
      tradeBreakdown,
      insights,
      recommendations
    };
  }

  // Export account summary
  public async exportAccountSummary(): Promise<{
    balance: number;
    totalPnL: number;
    openPositions: number;
    totalTrades: number;
    daysPnL: number;
    weekPnL: number;
    monthPnL: number;
    positions: Array<{
      ticker: string;
      side: string;
      quantity: number;
      entryPrice: number;
      currentPrice: number;
      unrealizedPnL: number;
      daysHeld: number;
    }>;
  }> {
    const accountSummary = this.paperEngine.getAccountSummary();
    const openPositions = this.paperEngine.getOpenPositions();

    // Calculate time-based P&L
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const closedPositions = this.paperEngine.getClosedPositions();
    
    const daysPnL = closedPositions
      .filter(pos => pos.exitTime && pos.exitTime >= dayStart)
      .reduce((sum, pos) => sum + pos.pnl, 0);

    const weekPnL = closedPositions
      .filter(pos => pos.exitTime && pos.exitTime >= weekStart)
      .reduce((sum, pos) => sum + pos.pnl, 0);

    const monthPnL = closedPositions
      .filter(pos => pos.exitTime && pos.exitTime >= monthStart)
      .reduce((sum, pos) => sum + pos.pnl, 0);

    return {
      balance: accountSummary.balance,
      totalPnL: accountSummary.totalPnL,
      openPositions: openPositions.length,
      totalTrades: accountSummary.totalTrades,
      daysPnL,
      weekPnL,
      monthPnL,
      positions: openPositions.map(pos => ({
        ticker: pos.ticker,
        side: pos.side,
        quantity: pos.quantity,
        entryPrice: pos.entryPrice,
        currentPrice: pos.currentPrice || pos.entryPrice,
        unrealizedPnL: pos.unrealizedPnL || 0,
        daysHeld: Math.floor((Date.now() - pos.entryTime.getTime()) / (1000 * 60 * 60 * 24))
      }))
    };
  }

  // Private helper methods
  private async getTradeData(options: ExportOptions): Promise<TradeExportData[]> {
    let positions = this.paperEngine.getClosedPositions();

    // Include open positions if requested
    if (options.includeOpenPositions) {
      positions = [...positions, ...this.paperEngine.getOpenPositions()];
    }

    // Apply date range filter
    if (options.dateRange) {
      positions = positions.filter(pos => {
        const entryDate = pos.entryTime;
        return entryDate >= options.dateRange!.start && entryDate <= options.dateRange!.end;
      });
    }

    // Convert to export format
    return positions.map(pos => {
      const analysis = pos.status === 'CLOSED' ? 
        this.tradeAnalyzer.analyzeClosedTrade(pos) : null;

      return {
        tradeId: pos.id,
        ticker: pos.ticker,
        side: pos.side,
        entryDate: pos.entryTime.toISOString(),
        exitDate: pos.exitTime?.toISOString(),
        entryPrice: pos.entryPrice,
        exitPrice: pos.exitPrice,
        quantity: pos.quantity,
        pnl: pos.pnl,
        pnlPercent: pos.entryPrice > 0 ? (pos.pnl / (pos.entryPrice * pos.quantity)) * 100 : 0,
        confidence: pos.signal?.confidence || 0,
        conviction: pos.signal?.conviction || 0,
        expectedMove: pos.signal?.expectedMove || 0,
        actualMove: analysis?.actualMove,
        timeframe: pos.signal?.timeframe || 'UNKNOWN',
        regime: pos.signal?.regime || 'UNKNOWN',
        source: pos.signal?.source || 'UNKNOWN',
        status: pos.status,
        daysHeld: analysis?.holdingPeriod,
        maxFavorableExcursion: pos.mfe,
        maxAdverseExcursion: pos.mae,
        exitReason: pos.exitReason
      };
    });
  }

  private async getPerformanceData(options: ExportOptions): Promise<PerformanceExportData> {
    const closedPositions = this.paperEngine.getClosedPositions();
    let positions = closedPositions;

    // Apply date range filter
    if (options.dateRange) {
      positions = positions.filter(pos => {
        const entryDate = pos.entryTime;
        return entryDate >= options.dateRange!.start && entryDate <= options.dateRange!.end;
      });
    }

    if (positions.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        profitFactor: 0,
        totalPnL: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        calmarRatio: 0,
        averageHoldingPeriod: 0,
        confidenceEffectiveness: 0,
        regimePerformance: {}
      };
    }

    const metrics = this.tradeAnalyzer.calculatePerformanceMetrics(positions);
    
    // Calculate regime performance
    const regimePerformance: Record<string, { trades: number; winRate: number; avgPnL: number }> = {};
    
    positions.forEach(pos => {
      const regime = pos.signal?.regime || 'UNKNOWN';
      if (!regimePerformance[regime]) {
        regimePerformance[regime] = { trades: 0, winRate: 0, avgPnL: 0 };
      }
      regimePerformance[regime].trades++;
    });

    Object.keys(regimePerformance).forEach(regime => {
      const regimePositions = positions.filter(pos => (pos.signal?.regime || 'UNKNOWN') === regime);
      const wins = regimePositions.filter(pos => pos.pnl > 0).length;
      const totalPnL = regimePositions.reduce((sum, pos) => sum + pos.pnl, 0);
      
      regimePerformance[regime].winRate = wins / regimePositions.length;
      regimePerformance[regime].avgPnL = totalPnL / regimePositions.length;
    });

    return {
      totalTrades: metrics.totalTrades,
      winningTrades: metrics.winningTrades,
      losingTrades: metrics.losingTrades,
      winRate: metrics.winRate,
      profitFactor: metrics.profitFactor,
      totalPnL: metrics.totalReturn,
      averageWin: metrics.averageWin,
      averageLoss: metrics.averageLoss,
      largestWin: metrics.largestWin,
      largestLoss: metrics.largestLoss,
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      calmarRatio: metrics.calmarRatio,
      averageHoldingPeriod: metrics.averageHoldingPeriod,
      confidenceEffectiveness: metrics.confidenceEffectiveness,
      regimePerformance
    };
  }

  private analyzeTradesByDimension(trades: TradeExportData[], dimension: keyof TradeExportData): Record<string, { count: number; winRate: number; avgPnL: number }> {
    const analysis: Record<string, { count: number; wins: number; totalPnL: number }> = {};

    trades.forEach(trade => {
      const key = String(trade[dimension]);
      if (!analysis[key]) {
        analysis[key] = { count: 0, wins: 0, totalPnL: 0 };
      }
      
      analysis[key].count++;
      if (trade.pnl > 0) analysis[key].wins++;
      analysis[key].totalPnL += trade.pnl;
    });

    const result: Record<string, { count: number; winRate: number; avgPnL: number }> = {};
    Object.entries(analysis).forEach(([key, stats]) => {
      result[key] = {
        count: stats.count,
        winRate: stats.wins / stats.count,
        avgPnL: stats.totalPnL / stats.count
      };
    });

    return result;
  }

  private analyzeTradesByConfidenceLevel(trades: TradeExportData[]): Record<string, { count: number; winRate: number; avgPnL: number }> {
    const levels = {
      'Low (0-0.6)': trades.filter(t => t.confidence < 0.6),
      'Medium (0.6-0.8)': trades.filter(t => t.confidence >= 0.6 && t.confidence < 0.8),
      'High (0.8+)': trades.filter(t => t.confidence >= 0.8)
    };

    const result: Record<string, { count: number; winRate: number; avgPnL: number }> = {};
    
    Object.entries(levels).forEach(([level, levelTrades]) => {
      if (levelTrades.length > 0) {
        const wins = levelTrades.filter(t => t.pnl > 0).length;
        const totalPnL = levelTrades.reduce((sum, t) => sum + t.pnl, 0);
        
        result[level] = {
          count: levelTrades.length,
          winRate: wins / levelTrades.length,
          avgPnL: totalPnL / levelTrades.length
        };
      }
    });

    return result;
  }

  private generateInsights(trades: TradeExportData[], performance: PerformanceExportData): string[] {
    const insights: string[] = [];

    // Win rate insights
    if (performance.winRate > 0.6) {
      insights.push(`Strong win rate of ${(performance.winRate * 100).toFixed(1)}% indicates good signal quality`);
    } else if (performance.winRate < 0.4) {
      insights.push(`Low win rate of ${(performance.winRate * 100).toFixed(1)}% suggests signal calibration needed`);
    }

    // Profit factor insights
    if (performance.profitFactor > 1.5) {
      insights.push(`Excellent profit factor of ${performance.profitFactor.toFixed(2)} shows strong risk-reward management`);
    } else if (performance.profitFactor < 1.0) {
      insights.push(`Profit factor below 1.0 (${performance.profitFactor.toFixed(2)}) indicates losses exceed gains`);
    }

    // Confidence effectiveness
    if (performance.confidenceEffectiveness > 0.7) {
      insights.push('High confidence trades are performing well - confidence calibration is effective');
    } else if (performance.confidenceEffectiveness < 0.5) {
      insights.push('Confidence levels may need recalibration - high confidence trades underperforming');
    }

    // Regime performance insights
    const bestRegime = Object.entries(performance.regimePerformance)
      .sort(([,a], [,b]) => b.avgPnL - a.avgPnL)[0];
    
    if (bestRegime) {
      insights.push(`Best performance in ${bestRegime[0]} regime with ${(bestRegime[1].winRate * 100).toFixed(1)}% win rate`);
    }

    return insights;
  }

  private generateRecommendations(
    trades: TradeExportData[], 
    performance: PerformanceExportData,
    breakdown: any
  ): string[] {
    const recommendations: string[] = [];

    // Win rate recommendations
    if (performance.winRate < 0.5) {
      recommendations.push('Consider tightening entry criteria or adjusting confidence thresholds');
    }

    // Risk management recommendations
    if (performance.maxDrawdown > 0.2) {
      recommendations.push('Implement stricter position sizing to reduce maximum drawdown');
    }

    // Confidence calibration recommendations
    if (performance.confidenceEffectiveness < 0.6) {
      recommendations.push('Review confidence calculation methodology and recalibrate thresholds');
    }

    // Regime-based recommendations
    const worstRegime = Object.entries(performance.regimePerformance)
      .sort(([,a], [,b]) => a.avgPnL - b.avgPnL)[0];
    
    if (worstRegime && worstRegime[1].avgPnL < 0) {
      recommendations.push(`Consider avoiding or reducing position sizes in ${worstRegime[0]} regime`);
    }

    // Timeframe recommendations
    const timeframePerf = breakdown.byTimeframe;
    const bestTimeframe = Object.entries(timeframePerf)
      .sort(([,a], [,b]) => (b as any).avgPnL - (a as any).avgPnL)[0];
    
    if (bestTimeframe) {
      recommendations.push(`Focus more on ${bestTimeframe[0]} timeframe trades which show better performance`);
    }

    return recommendations;
  }
}