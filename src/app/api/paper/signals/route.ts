import { NextRequest, NextResponse } from 'next/server';
import { getSignalWeightingIntegration } from '../../../../../gamma-services/integrations';

// GET /api/paper/signals - Get signal weighting status and statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get('ticker');
    const action = searchParams.get('action') || 'status';

    const integration = getSignalWeightingIntegration();

    switch (action) {
      case 'status':
        const status = integration.getStatus();
        return NextResponse.json({
          success: true,
          status
        });

      case 'statistics':
        const statistics = integration.getConfidenceStatistics();
        return NextResponse.json({
          success: true,
          statistics
        });

      case 'ticker_data':
        if (!ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for ticker_data action' },
            { status: 400 }
          );
        }
        
        const tickerData = integration.getTickerConfidenceData(ticker);
        return NextResponse.json({
          success: true,
          ticker,
          data: tickerData
        });

      case 'all_tickers':
        const allTickerData = integration.getAllTickerData();
        return NextResponse.json({
          success: true,
          tickers: allTickerData
        });

      case 'weights':
        const weights = integration.getWeights();
        return NextResponse.json({
          success: true,
          weights
        });

      case 'multi_ticker_confidence':
        const tickers = searchParams.get('tickers')?.split(',') || [];
        if (tickers.length === 0) {
          return NextResponse.json(
            { error: 'Tickers parameter required for multi_ticker_confidence action' },
            { status: 400 }
          );
        }
        
        const multiTickerResult = integration.computeMultiTickerConfidence(tickers);
        return NextResponse.json({
          success: true,
          result: multiTickerResult
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: status, statistics, ticker_data, all_tickers, weights, multi_ticker_confidence' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Get signals error:', error);
    return NextResponse.json(
      { error: 'Failed to get signal data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/paper/signals - Update signal weighting configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ticker, confidence, breakdown, weights, data } = body;

    const integration = getSignalWeightingIntegration();

    switch (action) {
      case 'update_confidence':
        if (!ticker || confidence === undefined) {
          return NextResponse.json(
            { error: 'Ticker and confidence parameters required for update_confidence action' },
            { status: 400 }
          );
        }

        integration.handleLegacySignalUpdate(ticker, confidence, breakdown || {});
        return NextResponse.json({
          success: true,
          message: `Confidence updated for ${ticker}`
        });

      case 'update_weights':
        if (!weights) {
          return NextResponse.json(
            { error: 'Weights parameter required for update_weights action' },
            { status: 400 }
          );
        }

        integration.updateWeights(weights);
        return NextResponse.json({
          success: true,
          message: 'Signal weights updated'
        });

      case 'compute_multi_ticker':
        const tickers = body.tickers;
        if (!tickers || !Array.isArray(tickers)) {
          return NextResponse.json(
            { error: 'Tickers array required for compute_multi_ticker action' },
            { status: 400 }
          );
        }

        const result = integration.computeMultiTickerConfidence(tickers);
        return NextResponse.json({
          success: true,
          result
        });

      case 'clear_cache':
        integration.clearCache(ticker);
        return NextResponse.json({
          success: true,
          message: `Cache cleared${ticker ? ` for ${ticker}` : ' for all tickers'}`
        });

      case 'export_data':
        const exportData = integration.exportData();
        return NextResponse.json({
          success: true,
          data: exportData
        });

      case 'import_data':
        if (!data) {
          return NextResponse.json(
            { error: 'Data parameter required for import_data action' },
            { status: 400 }
          );
        }

        integration.importData(data);
        return NextResponse.json({
          success: true,
          message: 'Data imported successfully'
        });

      case 'batch_update':
        const updates = body.updates;
        if (!updates || !Array.isArray(updates)) {
          return NextResponse.json(
            { error: 'Updates array required for batch_update action' },
            { status: 400 }
          );
        }

        let successCount = 0;
        let errorCount = 0;

        for (const update of updates) {
          try {
            if (update.ticker && update.confidence !== undefined) {
              integration.handleLegacySignalUpdate(
                update.ticker, 
                update.confidence, 
                update.breakdown || {}
              );
              successCount++;
            }
          } catch (error) {
            errorCount++;
            console.error(`Failed to update ${update.ticker}:`, error);
          }
        }

        return NextResponse.json({
          success: true,
          message: `Batch update completed: ${successCount} successful, ${errorCount} failed`
        });

      case 'reset_ticker':
        if (!ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for reset_ticker action' },
            { status: 400 }
          );
        }

        integration.clearCache(ticker);
        return NextResponse.json({
          success: true,
          message: `Ticker ${ticker} reset successfully`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: update_confidence, update_weights, compute_multi_ticker, clear_cache, export_data, import_data, batch_update, reset_ticker' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Signals action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute signal action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}