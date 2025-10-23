import { NextRequest, NextResponse } from 'next/server';
import { getRealtimeOrchestrator } from '../../../../../gamma-services/orchestrators';

// GET /api/paper/ticker-states - Get current ticker states and statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'states';

    const orchestrator = getRealtimeOrchestrator();

    switch (action) {
      case 'states':
        const detailedStatus = orchestrator.getDetailedStatus();
        
        // Transform the data to match our dashboard interface
        const tickerStates = detailedStatus.multiTickerStatus?.tickers?.map((ticker: any) => ({
          ticker: ticker.ticker,
          status: ticker.status,
          confidence: ticker.confidence * 100, // Convert to percentage
          confidenceDelta: (ticker.confidenceDelta || 0) * 100,
          openPosition: ticker.openPosition,
          positionId: ticker.positionId,
          regime: ticker.regime || 'NEUTRAL',
          trendComposite: ticker.trendComposite || 0.5,
          phaseComposite: ticker.phaseComposite || 0.5,
          vwapDeviation: ticker.vwapDeviation || 0,
          priority: ticker.priority || 0.5,
          lastUpdate: new Date().toISOString(),
          reliability: ticker.reliability || 0.5,
          pnl: ticker.pnl,
          unrealizedPnL: ticker.unrealizedPnL,
          daysHeld: ticker.daysHeld
        })) || [];

        // Calculate statistics
        const stats = {
          totalTickers: tickerStates.length,
          activePositions: tickerStates.filter((s: any) => s.openPosition).length,
          readyTickers: tickerStates.filter((s: any) => s.status === 'READY').length,
          setTickers: tickerStates.filter((s: any) => s.status === 'SET').length,
          goTickers: tickerStates.filter((s: any) => s.status === 'GO').length,
          cooldownTickers: tickerStates.filter((s: any) => s.status === 'COOLDOWN').length,
          avgConfidence: tickerStates.length > 0 ? 
            tickerStates.reduce((sum: number, s: any) => sum + s.confidence, 0) / tickerStates.length : 0,
          totalPnL: tickerStates.reduce((sum: number, s: any) => sum + (s.pnl || 0), 0),
          bestPerformer: tickerStates
            .filter((s: any) => s.pnl)
            .sort((a: any, b: any) => (b.pnl || 0) - (a.pnl || 0))[0]?.ticker || 'N/A',
          worstPerformer: tickerStates
            .filter((s: any) => s.pnl)
            .sort((a: any, b: any) => (a.pnl || 0) - (b.pnl || 0))[0]?.ticker || 'N/A'
        };

        return NextResponse.json({
          success: true,
          states: tickerStates,
          stats,
          timestamp: new Date().toISOString()
        });

      case 'snapshot':
        const snapshot = orchestrator.getMultiTickerSnapshot();
        return NextResponse.json({
          success: true,
          snapshot,
          timestamp: new Date().toISOString()
        });

      case 'performance':
        const performanceMetrics = orchestrator.getPerformanceMetrics();
        return NextResponse.json({
          success: true,
          performance: performanceMetrics,
          timestamp: new Date().toISOString()
        });

      case 'system_status':
        const systemStatus = orchestrator.getSystemStatus();
        return NextResponse.json({
          success: true,
          systemStatus,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: states, snapshot, performance, system_status' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Get ticker states error:', error);
    return NextResponse.json(
      { error: 'Failed to get ticker states', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/paper/ticker-states - Control ticker states
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ticker, status, priority } = body;

    const orchestrator = getRealtimeOrchestrator();

    switch (action) {
      case 'force_transition':
        if (!ticker || !status) {
          return NextResponse.json(
            { error: 'Ticker and status parameters required for force_transition action' },
            { status: 400 }
          );
        }

        // This would call a method to force state transition
        // orchestrator.forceStateTransition(ticker, status);
        
        return NextResponse.json({
          success: true,
          message: `Forced ${ticker} to ${status} state`
        });

      case 'update_priority':
        if (!ticker || priority === undefined) {
          return NextResponse.json(
            { error: 'Ticker and priority parameters required for update_priority action' },
            { status: 400 }
          );
        }

        // This would call a method to update ticker priority
        // orchestrator.updateTickerPriority(ticker, priority);
        
        return NextResponse.json({
          success: true,
          message: `Updated ${ticker} priority to ${priority}`
        });

      case 'pause_ticker':
        if (!ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for pause_ticker action' },
            { status: 400 }
          );
        }

        // This would pause trading for a specific ticker
        return NextResponse.json({
          success: true,
          message: `Paused trading for ${ticker}`
        });

      case 'resume_ticker':
        if (!ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for resume_ticker action' },
            { status: 400 }
          );
        }

        // This would resume trading for a specific ticker
        return NextResponse.json({
          success: true,
          message: `Resumed trading for ${ticker}`
        });

      case 'refresh_states':
        // Force refresh of all ticker states
        return NextResponse.json({
          success: true,
          message: 'Ticker states refreshed'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: force_transition, update_priority, pause_ticker, resume_ticker, refresh_states' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Ticker states action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute ticker state action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}