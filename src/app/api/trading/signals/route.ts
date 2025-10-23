import { NextRequest, NextResponse } from 'next/server';
import { tradingOrchestrationSystem } from '@/engine/TradingOrchestrationSystem';
import { TradeSignal } from '@/lib/trading';

/**
 * GET /api/trading/signals
 * Get all active trading signals
 */
export async function GET(request: NextRequest) {
  try {
    const signals = tradingOrchestrationSystem.getActiveSignals();
    
    return NextResponse.json({
      success: true,
      data: signals,
      timestamp: new Date(),
      count: signals.length
    });
  } catch (error) {
    console.error('Error fetching trading signals:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch trading signals',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trading/signals
 * Start/stop the trading system or add/remove symbols
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, symbols, symbol } = body;

    switch (action) {
      case 'start':
        await tradingOrchestrationSystem.start();
        return NextResponse.json({
          success: true,
          message: 'Trading system started',
          timestamp: new Date()
        });

      case 'stop':
        await tradingOrchestrationSystem.stop();
        return NextResponse.json({
          success: true,
          message: 'Trading system stopped',
          timestamp: new Date()
        });

      case 'addSymbol':
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'Symbol is required' },
            { status: 400 }
          );
        }
        tradingOrchestrationSystem.addSymbol(symbol);
        return NextResponse.json({
          success: true,
          message: `Symbol ${symbol} added`,
          timestamp: new Date()
        });

      case 'removeSymbol':
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'Symbol is required' },
            { status: 400 }
          );
        }
        tradingOrchestrationSystem.removeSymbol(symbol);
        return NextResponse.json({
          success: true,
          message: `Symbol ${symbol} removed`,
          timestamp: new Date()
        });

      case 'updateSymbols':
        if (!symbols || !Array.isArray(symbols)) {
          return NextResponse.json(
            { success: false, error: 'Symbols array is required' },
            { status: 400 }
          );
        }
        tradingOrchestrationSystem.updateSymbols(symbols);
        return NextResponse.json({
          success: true,
          message: 'Symbols updated',
          symbols: tradingOrchestrationSystem.getMonitoredSymbols(),
          timestamp: new Date()
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing trading signals request:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

