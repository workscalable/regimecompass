import { PaperPosition, PerformanceMetrics } from '../models/PaperTradingTypes';
import { EventBus } from '../core/EventBus';

export interface BenchmarkData {
  name: string;
  returns: number[];
  dates: Date[];
}

export interface RiskAdjustedMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  alpha: number;
  informationRatio: number;
}

export interface PerformanceBreakdown {
  daily: PerformanceMetrics[];
  weekly: PerformanceMetrics[];
  monthly: PerformanceMetrics[];
  quarterly: PerformanceMetrics[];
  yearly: PerformanceMetrics[];
}

export interface PerformanceComparison {
  strategy: PerformanceMetrics;
  benchmark: PerformanceMetrics;
  outperformance: number;
  correlation: number;
  trackingError: number;
}

export class PerformanceCalculator {
  private eventBus: EventBus;
  private riskFreeRate: number = 0.02; // 2% annual risk-free rate
  private tradingDaysPerYear: number = 252;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  public calculateComprehensiveMetrics(
    positions: PaperPosition[],
    initialBalance: number = 100000,
    benchmark?: BenchmarkData
  ): PerformanceMetrics & RiskAdjustedMetrics {
    const closedPositions = positions.filter(p => p.status === 'CLOSED');
    
    if (closedPositions.length === 0) {
      return this.getEmptyComprehensiveMetrics(initialBalance);
    }

    // Basic metrics
    const basicMetrics = this.calculateBasicMetrics(closedPositions, initialBalance);
    
    // Risk-adjusted metrics
    const riskMetrics = this.calculateRiskAdjustedMetrics(closedPositions, initialBalance, benchmark);

    return {
      ...basicMetrics,
      ...riskMetrics
    };
  }

  private calculateBasicMetrics(positions: PaperPosition[], initialBalance: number): PerformanceMetrics {
    const totalTrades = positions.length;
    const winningTrades = positions.filter(p => p.pnl > 0).length;
    const losingTrades = positions.filter(p => p.pnl < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    const wins = positions.filter(p => p.pnl > 0);
    const losses = positions.filter(p => p.pnl < 0);

    const averageWin = wins.length > 0 ? wins.reduce((sum, p) => sum + p.pnl, 0) / wins.length : 0;
    const averageLoss = losses.length > 0 ? losses.reduce((sum, p) => sum + p.pnl, 0) / losses.length : 0;
    const profitFactor = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0;

    // Calculate holding periods
    const holdingPeriods = positions
      .filter(p => p.exitTimestamp && p.entryTimestamp)
      .map(p => (p.exitTimestamp!.getTime() - p.entryTimestamp.getTime()) / (1000 * 60 * 60));
    
    const averageHoldingPeriod = holdingPeriods.length > 0 
      ? holdingPeriods.reduce((sum, h) => sum + h, 0) / holdingPeriods.length 
      : 0;

    // Find best and worst trades
    const pnls = positions.map(p => p.pnl);
    const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
    const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;

    // Calculate consecutive streaks
    const { consecutiveWins, consecutiveLosses } = this.calculateStreaks(positions);

    // Calculate drawdown
    const { maxDrawdown, maxDrawdownPercent } = this.calculateDrawdown(positions, initialBalance);

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
      sharpeRatio: 0, // Will be calculated in risk metrics
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

  private calculateRiskAdjustedMetrics(
    positions: PaperPosition[],
    initialBalance: number,
    benchmark?: BenchmarkData
  ): RiskAdjustedMetrics {
    // Calculate daily returns
    const dailyReturns = this.calculateDailyReturns(positions, initialBalance);
    
    if (dailyReturns.length === 0) {
      return this.getEmptyRiskMetrics();
    }

    // Calculate basic statistics
    const avgDailyReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
    const dailyVolatility = this.calculateVolatility(dailyReturns);
    const annualizedReturn = avgDailyReturn * this.tradingDaysPerYear;
    const annualizedVolatility = dailyVolatility * Math.sqrt(this.tradingDaysPerYear);

    // Sharpe Ratio
    const sharpeRatio = annualizedVolatility > 0 
      ? (annualizedReturn - this.riskFreeRate) / annualizedVolatility 
      : 0;

    // Sortino Ratio (using downside deviation)
    const downsideReturns = dailyReturns.filter(r => r < 0);
    const downsideDeviation = downsideReturns.length > 0 
      ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + r * r, 0) / downsideReturns.length) * Math.sqrt(this.tradingDaysPerYear)
      : 0;
    const sortinoRatio = downsideDeviation > 0 
      ? (annualizedReturn - this.riskFreeRate) / downsideDeviation 
      : 0;

    // Maximum Drawdown
    const { maxDrawdown } = this.calculateDrawdown(positions, initialBalance);
    const maxDrawdownPercent = maxDrawdown / initialBalance;

    // Calmar Ratio
    const calmarRatio = maxDrawdownPercent > 0 ? annualizedReturn / maxDrawdownPercent : 0;

    // Beta and Alpha (if benchmark provided)
    let beta = 0;
    let alpha = 0;
    let informationRatio = 0;

    if (benchmark && benchmark.returns.length > 0) {
      const benchmarkReturns = this.alignReturnsWithBenchmark(dailyReturns, benchmark.returns);
      beta = this.calculateBeta(dailyReturns, benchmarkReturns);
      
      const benchmarkAvgReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length * this.tradingDaysPerYear;
      alpha = annualizedReturn - (this.riskFreeRate + beta * (benchmarkAvgReturn - this.riskFreeRate));
      
      // Information Ratio
      const excessReturns = dailyReturns.map((r, i) => r - (benchmarkReturns[i] || 0));
      const trackingError = this.calculateVolatility(excessReturns) * Math.sqrt(this.tradingDaysPerYear);
      informationRatio = trackingError > 0 ? (annualizedReturn - benchmarkAvgReturn) / trackingError : 0;
    }

    return {
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown: maxDrawdownPercent,
      volatility: annualizedVolatility,
      beta,
      alpha,
      informationRatio
    };
  }

  private calculateDailyReturns(positions: PaperPosition[], initialBalance: number): number[] {
    // Group positions by date and calculate daily P&L
    const dailyPnL: Map<string, number> = new Map();
    
    for (const position of positions) {
      if (position.exitTimestamp) {
        const dateKey = position.exitTimestamp.toISOString().split('T')[0];
        dailyPnL.set(dateKey, (dailyPnL.get(dateKey) || 0) + position.pnl);
      }
    }

    // Convert to returns
    let runningBalance = initialBalance;
    const returns: number[] = [];

    for (const [date, pnl] of Array.from(dailyPnL.entries()).sort()) {
      const dailyReturn = pnl / runningBalance;
      returns.push(dailyReturn);
      runningBalance += pnl;
    }

    return returns;
  }

  private calculateVolatility(returns: number[]): number {
    if (returns.length <= 1) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }

  private calculateBeta(strategyReturns: number[], benchmarkReturns: number[]): number {
    if (strategyReturns.length !== benchmarkReturns.length || strategyReturns.length === 0) {
      return 0;
    }

    const strategyMean = strategyReturns.reduce((sum, r) => sum + r, 0) / strategyReturns.length;
    const benchmarkMean = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;

    let covariance = 0;
    let benchmarkVariance = 0;

    for (let i = 0; i < strategyReturns.length; i++) {
      const strategyDiff = strategyReturns[i] - strategyMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      
      covariance += strategyDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }

    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 0;
  }

  private alignReturnsWithBenchmark(strategyReturns: number[], benchmarkReturns: number[]): number[] {
    // Simple alignment - in practice, you'd align by dates
    const minLength = Math.min(strategyReturns.length, benchmarkReturns.length);
    return benchmarkReturns.slice(0, minLength);
  }

  private calculateDrawdown(positions: PaperPosition[], initialBalance: number): { maxDrawdown: number; maxDrawdownPercent: number } {
    let peak = initialBalance;
    let maxDrawdown = 0;
    let runningBalance = initialBalance;

    // Sort positions by exit time
    const sortedPositions = positions
      .filter(p => p.exitTimestamp)
      .sort((a, b) => a.exitTimestamp!.getTime() - b.exitTimestamp!.getTime());

    for (const position of sortedPositions) {
      runningBalance += position.pnl;
      
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      
      const drawdown = peak - runningBalance;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;
    
    return { maxDrawdown, maxDrawdownPercent };
  }

  private calculateStreaks(positions: PaperPosition[]): { consecutiveWins: number; consecutiveLosses: number } {
    let maxWins = 0;
    let maxLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;

    const sortedPositions = positions
      .filter(p => p.exitTimestamp)
      .sort((a, b) => a.exitTimestamp!.getTime() - b.exitTimestamp!.getTime());

    for (const position of sortedPositions) {
      if (position.pnl > 0) {
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

  public calculatePerformanceBreakdown(positions: PaperPosition[], initialBalance: number): PerformanceBreakdown {
    const closedPositions = positions.filter(p => p.status === 'CLOSED' && p.exitTimestamp);
    
    return {
      daily: this.calculatePeriodMetrics(closedPositions, initialBalance, 'daily'),
      weekly: this.calculatePeriodMetrics(closedPositions, initialBalance, 'weekly'),
      monthly: this.calculatePeriodMetrics(closedPositions, initialBalance, 'monthly'),
      quarterly: this.calculatePeriodMetrics(closedPositions, initialBalance, 'quarterly'),
      yearly: this.calculatePeriodMetrics(closedPositions, initialBalance, 'yearly')
    };
  }

  private calculatePeriodMetrics(
    positions: PaperPosition[], 
    initialBalance: number, 
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  ): PerformanceMetrics[] {
    // Group positions by period
    const periodGroups: Map<string, PaperPosition[]> = new Map();
    
    for (const position of positions) {
      if (!position.exitTimestamp) continue;
      
      const periodKey = this.getPeriodKey(position.exitTimestamp, period);
      if (!periodGroups.has(periodKey)) {
        periodGroups.set(periodKey, []);
      }
      periodGroups.get(periodKey)!.push(position);
    }

    // Calculate metrics for each period
    const periodMetrics: PerformanceMetrics[] = [];
    
    for (const [periodKey, periodPositions] of periodGroups) {
      const metrics = this.calculateBasicMetrics(periodPositions, initialBalance);
      periodMetrics.push(metrics);
    }

    return periodMetrics.sort((a, b) => a.accountBalance - b.accountBalance); // Sort by time (approximate)
  }

  private getPeriodKey(date: Date, period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    switch (period) {
      case 'daily':
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      case 'weekly':
        const weekNumber = Math.ceil(day / 7);
        return `${year}-${month.toString().padStart(2, '0')}-W${weekNumber}`;
      case 'monthly':
        return `${year}-${month.toString().padStart(2, '0')}`;
      case 'quarterly':
        const quarter = Math.ceil((month + 1) / 3);
        return `${year}-Q${quarter}`;
      case 'yearly':
        return year.toString();
      default:
        return date.toISOString().split('T')[0];
    }
  }

  public compareWithBenchmark(
    positions: PaperPosition[],
    initialBalance: number,
    benchmark: BenchmarkData
  ): PerformanceComparison {
    const strategyMetrics = this.calculateBasicMetrics(positions.filter(p => p.status === 'CLOSED'), initialBalance);
    
    // Calculate benchmark metrics (simplified)
    const benchmarkReturns = benchmark.returns;
    const benchmarkTotalReturn = benchmarkReturns.reduce((product, r) => product * (1 + r), 1) - 1;
    const benchmarkMetrics: PerformanceMetrics = {
      ...this.getEmptyComprehensiveMetrics(initialBalance),
      totalPnL: initialBalance * benchmarkTotalReturn,
      returnsPercent: benchmarkTotalReturn * 100,
      accountBalance: initialBalance * (1 + benchmarkTotalReturn)
    };

    // Calculate comparison metrics
    const outperformance = strategyMetrics.returnsPercent - benchmarkMetrics.returnsPercent;
    
    // Calculate correlation (simplified)
    const strategyReturns = this.calculateDailyReturns(positions.filter(p => p.status === 'CLOSED'), initialBalance);
    const correlation = this.calculateCorrelation(strategyReturns, benchmarkReturns);
    
    // Calculate tracking error
    const excessReturns = strategyReturns.map((r, i) => r - (benchmarkReturns[i] || 0));
    const trackingError = this.calculateVolatility(excessReturns) * Math.sqrt(this.tradingDaysPerYear) * 100;

    return {
      strategy: strategyMetrics,
      benchmark: benchmarkMetrics,
      outperformance,
      correlation,
      trackingError
    };
  }

  private calculateCorrelation(returns1: number[], returns2: number[]): number {
    const minLength = Math.min(returns1.length, returns2.length);
    if (minLength === 0) return 0;

    const r1 = returns1.slice(0, minLength);
    const r2 = returns2.slice(0, minLength);

    const mean1 = r1.reduce((sum, r) => sum + r, 0) / r1.length;
    const mean2 = r2.reduce((sum, r) => sum + r, 0) / r2.length;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < r1.length; i++) {
      const diff1 = r1[i] - mean1;
      const diff2 = r2[i] - mean2;
      
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator > 0 ? numerator / denominator : 0;
  }

  private getEmptyComprehensiveMetrics(initialBalance: number): PerformanceMetrics & RiskAdjustedMetrics {
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
      accountBalance: initialBalance,
      returnsPercent: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      volatility: 0,
      beta: 0,
      alpha: 0,
      informationRatio: 0
    };
  }

  private getEmptyRiskMetrics(): RiskAdjustedMetrics {
    return {
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      beta: 0,
      alpha: 0,
      informationRatio: 0
    };
  }

  public setRiskFreeRate(rate: number): void {
    this.riskFreeRate = rate;
  }

  public setTradingDaysPerYear(days: number): void {
    this.tradingDaysPerYear = days;
  }
}