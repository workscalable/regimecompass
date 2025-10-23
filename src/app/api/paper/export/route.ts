import { NextRequest, NextResponse } from 'next/server';
import { DataExportService } from '../../../../../gamma-services/export/DataExportService';
import { getPaperTradingEngine } from '../../../../../gamma-services/paper/PaperTradingEngine';
import { getTradeAnalyzer } from '../../../../../gamma-services/analytics/TradeAnalyzer';

// GET /api/paper/export - Export paper trading data
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'JSON';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeOpen = searchParams.get('includeOpen') === 'true';
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';
    const exportType = searchParams.get('type') || 'trades'; // trades, performance, account, report

    // Get service instances
    const paperEngine = getPaperTradingEngine();
    const tradeAnalyzer = getTradeAnalyzer();
    const exportService = new DataExportService(tradeAnalyzer, paperEngine);

    // Build export options
    const options: any = {
      format: format.toUpperCase(),
      includeOpenPositions: includeOpen,
      includeAnalytics: includeAnalytics
    };

    if (startDate && endDate) {
      options.dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    let result: any;
    let filename: string;
    let contentType: string;

    switch (exportType.toLowerCase()) {
      case 'trades':
        if (format.toUpperCase() === 'CSV') {
          result = await exportService.exportTradesToCSV(options);
          filename = `paper-trades-${new Date().toISOString().split('T')[0]}.csv`;
          contentType = 'text/csv';
        } else {
          const jsonData = await exportService.exportToJSON(options);
          result = JSON.stringify(jsonData.trades, null, 2);
          filename = `paper-trades-${new Date().toISOString().split('T')[0]}.json`;
          contentType = 'application/json';
        }
        break;

      case 'performance':
        if (format.toUpperCase() === 'CSV') {
          result = await exportService.exportPerformanceToCSV(options);
          filename = `paper-performance-${new Date().toISOString().split('T')[0]}.csv`;
          contentType = 'text/csv';
        } else {
          const perfData = await exportService.exportToJSON(options);
          result = JSON.stringify(perfData.performance, null, 2);
          filename = `paper-performance-${new Date().toISOString().split('T')[0]}.json`;
          contentType = 'application/json';
        }
        break;

      case 'account':
        const accountData = await exportService.exportAccountSummary();
        result = JSON.stringify(accountData, null, 2);
        filename = `paper-account-${new Date().toISOString().split('T')[0]}.json`;
        contentType = 'application/json';
        break;

      case 'report':
        const reportData = await exportService.generatePerformanceReport(options);
        result = JSON.stringify(reportData, null, 2);
        filename = `paper-report-${new Date().toISOString().split('T')[0]}.json`;
        contentType = 'application/json';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid export type. Use: trades, performance, account, or report' },
          { status: 400 }
        );
    }

    // Return file download response
    const response = new NextResponse(result);
    response.headers.set('Content-Type', contentType);
    response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    response.headers.set('Cache-Control', 'no-cache');
    
    return response;

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Failed to export data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/paper/export - Custom export with specific parameters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      format = 'JSON',
      exportType = 'trades',
      dateRange,
      includeOpenPositions = false,
      includeAnalytics = true,
      customFields = [],
      filters = {}
    } = body;

    // Get service instances
    const paperEngine = getPaperTradingEngine();
    const tradeAnalyzer = getTradeAnalyzer();
    const exportService = new DataExportService(tradeAnalyzer, paperEngine);

    // Build export options
    const options: any = {
      format: format.toUpperCase(),
      includeOpenPositions,
      includeAnalytics,
      customFields
    };

    if (dateRange) {
      options.dateRange = {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      };
    }

    let result: any;

    switch (exportType.toLowerCase()) {
      case 'trades':
        if (format.toUpperCase() === 'CSV') {
          result = await exportService.exportTradesToCSV(options);
        } else {
          const jsonData = await exportService.exportToJSON(options);
          result = jsonData.trades;
        }
        break;

      case 'performance':
        if (format.toUpperCase() === 'CSV') {
          result = await exportService.exportPerformanceToCSV(options);
        } else {
          const perfData = await exportService.exportToJSON(options);
          result = perfData.performance;
        }
        break;

      case 'full':
        result = await exportService.exportToJSON(options);
        break;

      case 'report':
        result = await exportService.generatePerformanceReport(options);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        );
    }

    // Apply additional filters if specified
    if (filters && typeof result === 'object' && Array.isArray(result)) {
      result = applyFilters(result, filters);
    }

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        exportType,
        format,
        timestamp: new Date().toISOString(),
        recordCount: Array.isArray(result) ? result.length : 1
      }
    });

  } catch (error) {
    console.error('Custom export API error:', error);
    return NextResponse.json(
      { error: 'Failed to export data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to apply additional filters
function applyFilters(data: any[], filters: Record<string, any>): any[] {
  let filtered = [...data];

  // Apply ticker filter
  if (filters.tickers && Array.isArray(filters.tickers)) {
    filtered = filtered.filter(item => filters.tickers.includes(item.ticker));
  }

  // Apply regime filter
  if (filters.regimes && Array.isArray(filters.regimes)) {
    filtered = filtered.filter(item => filters.regimes.includes(item.regime));
  }

  // Apply confidence range filter
  if (filters.confidenceRange) {
    const { min = 0, max = 1 } = filters.confidenceRange;
    filtered = filtered.filter(item => item.confidence >= min && item.confidence <= max);
  }

  // Apply PnL filter
  if (filters.pnlFilter) {
    const { type, threshold } = filters.pnlFilter;
    switch (type) {
      case 'winners':
        filtered = filtered.filter(item => item.pnl > 0);
        break;
      case 'losers':
        filtered = filtered.filter(item => item.pnl < 0);
        break;
      case 'above':
        filtered = filtered.filter(item => item.pnl > threshold);
        break;
      case 'below':
        filtered = filtered.filter(item => item.pnl < threshold);
        break;
    }
  }

  // Apply status filter
  if (filters.status && Array.isArray(filters.status)) {
    filtered = filtered.filter(item => filters.status.includes(item.status));
  }

  return filtered;
}