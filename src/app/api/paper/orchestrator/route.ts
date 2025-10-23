import { NextRequest, NextResponse } from 'next/server';
import { getRealtimeOrchestrator } from '../../../../../gamma-services/orchestrators';

// GET /api/paper/orchestrator - Get orchestrator status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const detailed = searchParams.get('detailed') === 'true';

    const orchestrator = getRealtimeOrchestrator();
    
    if (detailed) {
      const status = orchestrator.getDetailedStatus();
      return NextResponse.json({
        success: true,
        status
      });
    } else {
      const status = orchestrator.getSystemStatus();
      return NextResponse.json({
        success: true,
        status
      });
    }

  } catch (error) {
    console.error('Get orchestrator status error:', error);
    return NextResponse.json(
      { error: 'Failed to get orchestrator status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/paper/orchestrator - Control orchestrator
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, mode, ticker, config } = body;

    const orchestrator = getRealtimeOrchestrator();

    switch (action) {
      case 'start':
        await orchestrator.start();
        return NextResponse.json({
          success: true,
          message: 'Orchestrator started'
        });

      case 'stop':
        await orchestrator.shutdown();
        return NextResponse.json({
          success: true,
          message: 'Orchestrator stopped'
        });

      case 'restart':
        await orchestrator.restart();
        return NextResponse.json({
          success: true,
          message: 'Orchestrator restarted'
        });

      case 'switch_mode':
        if (!mode) {
          return NextResponse.json(
            { error: 'Mode parameter required for switch_mode action' },
            { status: 400 }
          );
        }

        if (mode === 'single-ticker' && !ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for single-ticker mode' },
            { status: 400 }
          );
        }

        await orchestrator.gracefulModeSwitch(mode, ticker);
        return NextResponse.json({
          success: true,
          message: `Switched to ${mode} mode${ticker ? ` for ${ticker}` : ''}`
        });

      case 'pause_trading':
        await orchestrator.pauseTrading();
        return NextResponse.json({
          success: true,
          message: 'Trading paused'
        });

      case 'resume_trading':
        await orchestrator.resumeTrading();
        return NextResponse.json({
          success: true,
          message: 'Trading resumed'
        });

      case 'update_config':
        if (!config) {
          return NextResponse.json(
            { error: 'Config parameter required for update_config action' },
            { status: 400 }
          );
        }

        orchestrator.updateConfiguration(config);
        return NextResponse.json({
          success: true,
          message: 'Configuration updated'
        });

      case 'add_ticker':
        if (!ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for add_ticker action' },
            { status: 400 }
          );
        }

        await orchestrator.addTicker(ticker);
        return NextResponse.json({
          success: true,
          message: `Added ticker: ${ticker}`
        });

      case 'remove_ticker':
        if (!ticker) {
          return NextResponse.json(
            { error: 'Ticker parameter required for remove_ticker action' },
            { status: 400 }
          );
        }

        await orchestrator.removeTicker(ticker);
        return NextResponse.json({
          success: true,
          message: `Removed ticker: ${ticker}`
        });

      case 'optimize':
        orchestrator.optimizeConfiguration();
        return NextResponse.json({
          success: true,
          message: 'Configuration optimization initiated'
        });

      case 'health_check':
        orchestrator.emitHealthStatus();
        return NextResponse.json({
          success: true,
          message: 'Health check performed'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: start, stop, restart, switch_mode, pause_trading, resume_trading, update_config, add_ticker, remove_ticker, optimize, health_check' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Orchestrator action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute orchestrator action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}