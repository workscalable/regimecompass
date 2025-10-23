import { NextRequest, NextResponse } from 'next/server';
import { getMultiTickerEventManager } from '../../../../../gamma-services/core';

// GET /api/paper/events - Get event system status and statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'stats';
    const ticker = searchParams.get('ticker');

    const eventManager = getMultiTickerEventManager();

    switch (action) {
      case 'stats':
        const stats = eventManager.getMultiTickerStats();
        return NextResponse.json({
          success: true,
          stats
        });

      case 'ticker_activity':
        if (!ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for ticker_activity action' },
            { status: 400 }
          );
        }
        
        const activity = eventManager.getTickerActivity(ticker);
        return NextResponse.json({
          success: true,
          ticker,
          activity
        });

      case 'subscriptions':
        const subscriptions = eventManager.getActiveSubscriptions();
        return NextResponse.json({
          success: true,
          subscriptions
        });

      case 'registered_tickers':
        const tickers = eventManager.getRegisteredTickers();
        return NextResponse.json({
          success: true,
          tickers
        });

      case 'event_types':
        const eventTypes = eventManager.getEventTypeStats();
        return NextResponse.json({
          success: true,
          eventTypes
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: stats, ticker_activity, subscriptions, registered_tickers, event_types' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to get event data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/paper/events - Manage event system
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ticker, eventTypes, batchSize, timeoutMs, windowMs, maxBatchSize } = body;

    const eventManager = getMultiTickerEventManager();

    switch (action) {
      case 'register_ticker':
        if (!ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for register_ticker action' },
            { status: 400 }
          );
        }

        eventManager.registerTicker(ticker, eventTypes || []);
        return NextResponse.json({
          success: true,
          message: `Ticker ${ticker} registered`
        });

      case 'unregister_ticker':
        if (!ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for unregister_ticker action' },
            { status: 400 }
          );
        }

        eventManager.unregisterTicker(ticker);
        return NextResponse.json({
          success: true,
          message: `Ticker ${ticker} unregistered`
        });

      case 'subscribe_ticker':
        if (!ticker || !eventTypes) {
          return NextResponse.json(
            { error: 'Ticker and eventTypes parameters required for subscribe_ticker action' },
            { status: 400 }
          );
        }

        const subscriptionId = eventManager.subscribeToTicker(
          ticker,
          eventTypes,
          (event, data) => {
            console.log(`Event received: ${event}`, data);
          }
        );

        return NextResponse.json({
          success: true,
          subscriptionId,
          message: `Subscribed to ticker ${ticker}`
        });

      case 'unsubscribe':
        const subId = body.subscriptionId;
        if (!subId) {
          return NextResponse.json(
            { error: 'subscriptionId parameter required for unsubscribe action' },
            { status: 400 }
          );
        }

        eventManager.unsubscribe(subId);
        return NextResponse.json({
          success: true,
          message: `Unsubscribed ${subId}`
        });

      case 'enable_batching':
        eventManager.enableBatchProcessing(
          batchSize || 10,
          timeoutMs || 100
        );
        return NextResponse.json({
          success: true,
          message: 'Batch processing enabled'
        });

      case 'disable_batching':
        eventManager.disableBatchProcessing();
        return NextResponse.json({
          success: true,
          message: 'Batch processing disabled'
        });

      case 'setup_confidence_aggregation':
        eventManager.setupConfidenceAggregation(
          windowMs || 1000,
          maxBatchSize || 10
        );
        return NextResponse.json({
          success: true,
          message: 'Confidence aggregation configured'
        });

      case 'setup_position_aggregation':
        eventManager.setupPositionAggregation(
          windowMs || 5000,
          maxBatchSize || 20
        );
        return NextResponse.json({
          success: true,
          message: 'Position aggregation configured'
        });

      case 'setup_event_routing':
        eventManager.setupTickerEventRouting();
        return NextResponse.json({
          success: true,
          message: 'Event routing configured'
        });

      case 'enable_performance_monitoring':
        const intervalMs = body.intervalMs || 10000;
        eventManager.enablePerformanceMonitoring(intervalMs);
        return NextResponse.json({
          success: true,
          message: 'Performance monitoring enabled'
        });

      case 'emit_test_events':
        const testTickers = body.tickers || ['TEST1', 'TEST2'];
        
        // Emit some test confidence updates
        const confidenceUpdates = testTickers.map(t => ({
          ticker: t,
          confidence: Math.random() * 100,
          delta: (Math.random() - 0.5) * 10
        }));
        
        eventManager.emitBatchConfidenceUpdates(confidenceUpdates);
        
        // Emit test ticker state snapshot
        eventManager.emitTickerStateSnapshot(testTickers);

        return NextResponse.json({
          success: true,
          message: `Emitted test events for ${testTickers.length} tickers`
        });

      case 'reset_stats':
        eventManager.resetStats();
        return NextResponse.json({
          success: true,
          message: 'Event statistics reset'
        });

      case 'add_ticker_filter':
        if (!ticker || !eventTypes) {
          return NextResponse.json(
            { error: 'Ticker and eventTypes parameters required for add_ticker_filter action' },
            { status: 400 }
          );
        }

        eventManager.addTickerFilter(ticker, eventTypes);
        return NextResponse.json({
          success: true,
          message: `Event filter added for ticker ${ticker}`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: register_ticker, unregister_ticker, subscribe_ticker, unsubscribe, enable_batching, disable_batching, setup_confidence_aggregation, setup_position_aggregation, setup_event_routing, enable_performance_monitoring, emit_test_events, reset_stats, add_ticker_filter' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Events action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute event action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}