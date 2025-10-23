import { DataExportService, PerformanceExportData, TradeExportData } from './DataExportService';
import { PaperPosition } from '../models/PaperTradingTypes';

export interface ReportTemplate {
  title: string;
  sections: ReportSection[];
  metadata: {
    generatedAt: Date;
    dateRange?: { start: Date; end: Date };
    totalTrades: number;
  };
}

export interface ReportSection {
  title: string;
  type: 'summary' | 'table' | 'chart' | 'insights' | 'recommendations';
  data: any;
  description?: string;
}

export class ReportGenerator {
  private exportService: DataExportService;

  constructor(exportService: DataExportService) {
    this.exportService = exportService;
  }

  // Generate comprehensive trading report
  public async generateTradingReport(options: {
    dateRange?: { start: Date; end: Date };
    includeCharts?: boolean;
    includeDetailedTrades?: boolean;
  } = {}): Promise<ReportTemplate> {
    const reportData = await this.exportService.generatePerformanceReport({
      format: 'JSON',
      dateRange: options.dateRange,
      includeAnalytics: true
    });

    const trades = await this.exportService.exportToJSON({
      format: 'JSON',
      dateRange: options.dateRange,
      includeAnalytics: true
    });

    const sections: ReportSection[] = [];

    // Executive Summary
    sections.push({
      title: 'Executive Summary',
      type: 'summary',
      data: {
        totalTrades: reportData.summary.totalTrades,
        winRate: `${(reportData.summary.winRate * 100).toFixed(1)}%`,
        totalPnL: `$${reportData.summary.totalPnL.toFixed(2)}`,
        profitFactor: reportData.summary.profitFactor.toFixed(2),
        sharpeRatio: reportData.summary.sharpeRatio.toFixed(2),
        maxDrawdown: `${(reportData.summary.maxDrawdown * 100).toFixed(1)}%`,
        avgHoldingPeriod: `${reportData.summary.averageHoldingPeriod.toFixed(1)} days`
      },
      description: 'Key performance metrics for the selected period'
    });

    // Performance Breakdown
    sections.push({
      title: 'Performance Analysis',
      type: 'table',
      data: {
        headers: ['Metric', 'Value', 'Benchmark'],
        rows: [
          ['Win Rate', `${(reportData.summary.winRate * 100).toFixed(1)}%`, '> 50%'],
          ['Profit Factor', reportData.summary.profitFactor.toFixed(2), '> 1.5'],
          ['Sharpe Ratio', reportData.summary.sharpeRatio.toFixed(2), '> 1.0'],
          ['Max Drawdown', `${(reportData.summary.maxDrawdown * 100).toFixed(1)}%`, '< 20%'],
          ['Average Win', `$${reportData.summary.averageWin.toFixed(2)}`, '-'],
          ['Average Loss', `$${reportData.summary.averageLoss.toFixed(2)}`, '-'],
          ['Largest Win', `$${reportData.summary.largestWin.toFixed(2)}`, '-'],
          ['Largest Loss', `$${reportData.summary.largestLoss.toFixed(2)}`, '-']
        ]
      },
      description: 'Detailed performance metrics with industry benchmarks'
    });

    // Regime Performance
    if (Object.keys(reportData.summary.regimePerformance).length > 0) {
      sections.push({
        title: 'Market Regime Performance',
        type: 'table',
        data: {
          headers: ['Regime', 'Trades', 'Win Rate', 'Avg P&L'],
          rows: Object.entries(reportData.summary.regimePerformance).map(([regime, stats]) => [
            regime,
            stats.trades.toString(),
            `${(stats.winRate * 100).toFixed(1)}%`,
            `$${stats.avgPnL.toFixed(2)}`
          ])
        },
        description: 'Performance breakdown by market regime'
      });
    }

    // Trade Breakdown Analysis
    sections.push({
      title: 'Trade Analysis by Dimensions',
      type: 'table',
      data: {
        timeframe: {
          headers: ['Timeframe', 'Count', 'Win Rate', 'Avg P&L'],
          rows: Object.entries(reportData.tradeBreakdown.byTimeframe).map(([tf, stats]) => [
            tf,
            stats.count.toString(),
            `${(stats.winRate * 100).toFixed(1)}%`,
            `$${stats.avgPnL.toFixed(2)}`
          ])
        },
        confidence: {
          headers: ['Confidence Level', 'Count', 'Win Rate', 'Avg P&L'],
          rows: Object.entries(reportData.tradeBreakdown.byConfidenceLevel).map(([level, stats]) => [
            level,
            stats.count.toString(),
            `${(stats.winRate * 100).toFixed(1)}%`,
            `$${stats.avgPnL.toFixed(2)}`
          ])
        }
      },
      description: 'Performance analysis across different trade characteristics'
    });

    // Key Insights
    if (reportData.insights.length > 0) {
      sections.push({
        title: 'Key Insights',
        type: 'insights',
        data: reportData.insights,
        description: 'Automated analysis of trading patterns and performance'
      });
    }

    // Recommendations
    if (reportData.recommendations.length > 0) {
      sections.push({
        title: 'Recommendations',
        type: 'recommendations',
        data: reportData.recommendations,
        description: 'Actionable suggestions for improving trading performance'
      });
    }

    // Detailed Trade History (if requested)
    if (options.includeDetailedTrades && trades.trades) {
      const recentTrades = trades.trades.slice(-20); // Last 20 trades
      sections.push({
        title: 'Recent Trade History',
        type: 'table',
        data: {
          headers: ['Date', 'Ticker', 'Side', 'P&L', 'Confidence', 'Regime'],
          rows: recentTrades.map((trade: TradeExportData) => [
            new Date(trade.entryDate).toLocaleDateString(),
            trade.ticker,
            trade.side,
            `$${trade.pnl.toFixed(2)}`,
            trade.confidence.toFixed(2),
            trade.regime
          ])
        },
        description: 'Most recent trading activity'
      });
    }

    return {
      title: `Paper Trading Performance Report`,
      sections,
      metadata: {
        generatedAt: new Date(),
        dateRange: options.dateRange,
        totalTrades: reportData.summary.totalTrades
      }
    };
  }

  // Generate monthly summary report
  public async generateMonthlySummary(year: number, month: number): Promise<ReportTemplate> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.generateTradingReport({
      dateRange: { start: startDate, end: endDate },
      includeCharts: true,
      includeDetailedTrades: true
    });
  }

  // Generate risk analysis report
  public async generateRiskReport(options: {
    dateRange?: { start: Date; end: Date };
  } = {}): Promise<ReportTemplate> {
    const accountSummary = await this.exportService.exportAccountSummary();
    const performanceData = await this.exportService.exportToJSON({
      format: 'JSON',
      dateRange: options.dateRange,
      includeAnalytics: true
    });

    const sections: ReportSection[] = [];

    // Risk Metrics Summary
    sections.push({
      title: 'Risk Metrics Overview',
      type: 'summary',
      data: {
        currentBalance: `$${accountSummary.balance.toFixed(2)}`,
        totalPnL: `$${accountSummary.totalPnL.toFixed(2)}`,
        openPositions: accountSummary.openPositions,
        daysPnL: `$${accountSummary.daysPnL.toFixed(2)}`,
        weekPnL: `$${accountSummary.weekPnL.toFixed(2)}`,
        monthPnL: `$${accountSummary.monthPnL.toFixed(2)}`
      },
      description: 'Current account status and recent performance'
    });

    // Position Risk Analysis
    if (accountSummary.positions.length > 0) {
      sections.push({
        title: 'Open Position Risk',
        type: 'table',
        data: {
          headers: ['Ticker', 'Side', 'Days Held', 'Unrealized P&L', 'Risk Level'],
          rows: accountSummary.positions.map(pos => [
            pos.ticker,
            pos.side,
            pos.daysHeld.toString(),
            `$${pos.unrealizedPnL.toFixed(2)}`,
            this.assessPositionRisk(pos)
          ])
        },
        description: 'Risk assessment of current open positions'
      });
    }

    // Risk Recommendations
    const riskRecommendations = this.generateRiskRecommendations(accountSummary, performanceData.performance);
    if (riskRecommendations.length > 0) {
      sections.push({
        title: 'Risk Management Recommendations',
        type: 'recommendations',
        data: riskRecommendations,
        description: 'Suggestions for managing current risk exposure'
      });
    }

    return {
      title: 'Risk Analysis Report',
      sections,
      metadata: {
        generatedAt: new Date(),
        dateRange: options.dateRange,
        totalTrades: performanceData.performance?.totalTrades || 0
      }
    };
  }

  // Generate HTML report
  public generateHTMLReport(report: ReportTemplate): string {
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .summary-item h3 { margin: 0 0 5px 0; color: #666; font-size: 14px; }
        .summary-item .value { font-size: 24px; font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .insights ul, .recommendations ul { padding-left: 20px; }
        .insights li, .recommendations li { margin-bottom: 8px; }
        .metadata { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 30px; }
        .positive { color: #28a745; }
        .negative { color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p>Generated on ${report.metadata.generatedAt.toLocaleString()}</p>
        ${report.metadata.dateRange ? 
          `<p>Period: ${report.metadata.dateRange.start.toLocaleDateString()} - ${report.metadata.dateRange.end.toLocaleDateString()}</p>` : 
          ''
        }
    </div>
`;

    // Generate sections
    report.sections.forEach(section => {
      html += `<div class="section">`;
      html += `<h2>${section.title}</h2>`;
      
      if (section.description) {
        html += `<p><em>${section.description}</em></p>`;
      }

      switch (section.type) {
        case 'summary':
          html += `<div class="summary-grid">`;
          Object.entries(section.data).forEach(([key, value]) => {
            const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            html += `
              <div class="summary-item">
                <h3>${displayKey}</h3>
                <div class="value">${value}</div>
              </div>
            `;
          });
          html += `</div>`;
          break;

        case 'table':
          if (section.data.headers && section.data.rows) {
            html += `<table>`;
            html += `<thead><tr>`;
            section.data.headers.forEach((header: string) => {
              html += `<th>${header}</th>`;
            });
            html += `</tr></thead><tbody>`;
            section.data.rows.forEach((row: any[]) => {
              html += `<tr>`;
              row.forEach(cell => {
                const cellClass = typeof cell === 'string' && cell.startsWith('$') && parseFloat(cell.slice(1)) > 0 ? 'positive' : 
                                 typeof cell === 'string' && cell.startsWith('$') && parseFloat(cell.slice(1)) < 0 ? 'negative' : '';
                html += `<td class="${cellClass}">${cell}</td>`;
              });
              html += `</tr>`;
            });
            html += `</tbody></table>`;
          }
          break;

        case 'insights':
          html += `<div class="insights"><ul>`;
          section.data.forEach((insight: string) => {
            html += `<li>${insight}</li>`;
          });
          html += `</ul></div>`;
          break;

        case 'recommendations':
          html += `<div class="recommendations"><ul>`;
          section.data.forEach((rec: string) => {
            html += `<li>${rec}</li>`;
          });
          html += `</ul></div>`;
          break;
      }

      html += `</div>`;
    });

    // Metadata footer
    html += `
    <div class="metadata">
        <h3>Report Metadata</h3>
        <p><strong>Total Trades:</strong> ${report.metadata.totalTrades}</p>
        <p><strong>Generated:</strong> ${report.metadata.generatedAt.toLocaleString()}</p>
        <p><strong>System:</strong> Gamma Adaptive Trading System - Paper Trading Module</p>
    </div>
</body>
</html>`;

    return html;
  }

  // Private helper methods
  private assessPositionRisk(position: any): string {
    const daysHeld = position.daysHeld;
    const unrealizedPnL = position.unrealizedPnL;
    const pnlPercent = Math.abs(unrealizedPnL / (position.entryPrice * position.quantity)) * 100;

    if (pnlPercent > 20) return 'HIGH';
    if (pnlPercent > 10 || daysHeld > 14) return 'MEDIUM';
    return 'LOW';
  }

  private generateRiskRecommendations(accountSummary: any, performance: any): string[] {
    const recommendations: string[] = [];

    // Check for concentration risk
    if (accountSummary.openPositions > 10) {
      recommendations.push('Consider reducing position count to manage concentration risk');
    }

    // Check for holding period risk
    const longHeldPositions = accountSummary.positions.filter((pos: any) => pos.daysHeld > 21);
    if (longHeldPositions.length > 0) {
      recommendations.push(`Review ${longHeldPositions.length} positions held longer than 21 days`);
    }

    // Check for large unrealized losses
    const largeLosingPositions = accountSummary.positions.filter((pos: any) => pos.unrealizedPnL < -500);
    if (largeLosingPositions.length > 0) {
      recommendations.push(`Consider stop-loss review for ${largeLosingPositions.length} positions with large unrealized losses`);
    }

    // Performance-based recommendations
    if (performance && performance.maxDrawdown > 0.15) {
      recommendations.push('Maximum drawdown exceeds 15% - consider reducing position sizes');
    }

    return recommendations;
  }
}