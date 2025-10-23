import { NextRequest, NextResponse } from 'next/server';
import { buildMarketSnapshot } from '@/lib/snapshotBuilder';
import { logger } from '@/lib/monitoring';

/**
 * CSV Export API for spreadsheet analysis
 * Provides market data in CSV format for Excel/Google Sheets
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const includeHeaders = searchParams.get('headers') !== 'false';
    
    logger.info('CSV export requested', {
      type,
      includeHeaders,
      userAgent: request.headers.get('user-agent')
    });

    // Get current market snapshot
    const snapshot = await buildMarketSnapshot();
    
    // Generate CSV based on type
    let csvData: string;
    let filename: string;
    
    switch (type) {
      case 'sectors':
        csvData = generateSectorCSV(snapshot, includeHeaders);
        filename = 'sector-analysis.csv';
        break;
      case 'signals':
        csvData = generateSignalsCSV(snapshot, includeHeaders);
        filename = 'trading-signals.csv';
        break;
      case 'regime':
        csvData = generateRegimeCSV(snapshot, includeHeaders);
        filename = 'regime-analysis.csv';
        break;
      case 'summary':
      default:
        csvData = generateSummaryCSV(snapshot, includeHeaders);
        filename = 'market-summary.csv';
        break;
    }

    logger.info('CSV export completed', {
      type,
      dataSize: csvData.length,
      processingTime: Date.now() - startTime
    });

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=300',
        'X-Export-Type': type,
        'X-Processing-Time': (Date.now() - startTime).toString()
      }
    });

  } catch (error) {
    logger.error('CSV export failed', error as Error, {
      processingTime: Date.now() - startTime
    });

    return NextResponse.json({
      error: 'CSV export failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Generate summary CSV with key metrics
 */
function generateSummaryCSV(snapshot: any, includeHeaders: boolean): string {
  const rows: string[] = [];
  
  if (includeHeaders) {
    rows.push([
      'Timestamp',
      'Regime',
      'Regime Strength',
      'Breadth %',
      'VIX',
      'SPY Price',
      'SPY Trend',
      'QQQ Price',
      'QQQ Trend',
      'IWM Price',
      'IWM Trend',
      'Gamma Bias',
      'Long Signals',
      'Hedge Signals'
    ].join(','));
  }
  
  const data = [
    snapshot.timestamp || new Date().toISOString(),
    snapshot.regime || 'NEUTRAL',
    snapshot.regimeClassification?.strength || 0,
    snapshot.breadth?.breadthPct || 0,
    snapshot.vix?.value || 0,
    snapshot.indexes?.SPY?.price || 0,
    snapshot.indexes?.SPY?.trendScore9 || 0,
    snapshot.indexes?.QQQ?.price || 0,
    snapshot.indexes?.QQQ?.trendScore9 || 0,
    snapshot.indexes?.IWM?.price || 0,
    snapshot.indexes?.IWM?.trendScore9 || 0,
    snapshot.gamma?.bias || 'neutral',
    snapshot.tradingCandidates?.long?.length || 0,
    snapshot.tradingCandidates?.hedge?.length || 0
  ];
  
  rows.push(data.map(formatCSVValue).join(','));
  
  return rows.join('\n');
}

/**
 * Generate sector analysis CSV
 */
function generateSectorCSV(snapshot: any, includeHeaders: boolean): string {
  const rows: string[] = [];
  
  if (includeHeaders) {
    rows.push([
      'Sector',
      'Symbol',
      'Price',
      'Change %',
      'Volume',
      'Trend Score',
      'Relative Strength',
      'Recommendation',
      'Allocation'
    ].join(','));
  }
  
  const sectors = snapshot.sectors || {};
  const sectorScores = snapshot.sectorAnalysis?.scores || {};
  const recommendations = snapshot.sectorAnalysis?.recommendations || {};
  
  Object.entries(sectors).forEach(([symbol, data]: [string, any]) => {
    const allocation = recommendations.overweight?.includes(symbol) ? 'Overweight' :
                     recommendations.underweight?.includes(symbol) ? 'Underweight' : 'Neutral';
    
    const row = [
      data.name || symbol,
      symbol,
      data.price || 0,
      data.changePercent || 0,
      data.volume || 0,
      sectorScores[symbol] || data.trendScore9 || 0,
      data.relativeStrength || 1,
      data.recommendation || 'HOLD',
      allocation
    ];
    
    rows.push(row.map(formatCSVValue).join(','));
  });
  
  return rows.join('\n');
}

/**
 * Generate trading signals CSV
 */
function generateSignalsCSV(snapshot: any, includeHeaders: boolean): string {
  const rows: string[] = [];
  
  if (includeHeaders) {
    rows.push([
      'Symbol',
      'Name',
      'Type',
      'Entry Price',
      'Stop Loss',
      'Target',
      'Position Size',
      'Confidence',
      'Risk/Reward',
      'Sector',
      'Timeframe',
      'Primary Reason'
    ].join(','));
  }
  
  const allCandidates = [
    ...(snapshot.tradingCandidates?.long || []),
    ...(snapshot.tradingCandidates?.hedge || [])
  ];
  
  allCandidates.forEach((candidate: any) => {
    const row = [
      candidate.symbol || '',
      candidate.name || '',
      candidate.type || '',
      candidate.entry || 0,
      candidate.stopLoss || 0,
      candidate.target || 0,
      candidate.positionSize || 0,
      candidate.confidence || 0,
      candidate.riskReward || 0,
      candidate.sector || '',
      candidate.timeframe || '',
      candidate.reasoning?.[0] || ''
    ];
    
    rows.push(row.map(formatCSVValue).join(','));
  });
  
  return rows.join('\n');
}

/**
 * Generate regime analysis CSV
 */
function generateRegimeCSV(snapshot: any, includeHeaders: boolean): string {
  const rows: string[] = [];
  
  if (includeHeaders) {
    rows.push([
      'Timestamp',
      'Current Regime',
      'Strength',
      'Confidence',
      'Duration (days)',
      'Breadth Factor',
      'EMA Factor',
      'Trend Factor',
      'Volatility Factor',
      'Gamma Factor',
      'Expected Change %',
      'Change Timeframe',
      'Recommended Action'
    ].join(','));
  }
  
  const regime = snapshot.regimeClassification || {};
  const factors = regime.factors || {};
  const forwardLooking = snapshot.forwardLooking || {};
  
  const row = [
    snapshot.timestamp || new Date().toISOString(),
    snapshot.regime || 'NEUTRAL',
    regime.strength || 0,
    regime.confidence || 0,
    regime.regimeDuration || 0,
    factors.breadth ? 'TRUE' : 'FALSE',
    factors.emaAlignment ? 'TRUE' : 'FALSE',
    factors.trendScore ? 'TRUE' : 'FALSE',
    factors.volatility ? 'TRUE' : 'FALSE',
    factors.gamma ? 'TRUE' : 'FALSE',
    forwardLooking.expectedRegimeChange || 0,
    forwardLooking.expectedChangeTimeframe || '',
    forwardLooking.recommendedAction || 'wait'
  ];
  
  rows.push(row.map(formatCSVValue).join(','));
  
  return rows.join('\n');
}

/**
 * Format value for CSV (handle commas, quotes, etc.)
 */
function formatCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If the value contains comma, newline, or quote, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}