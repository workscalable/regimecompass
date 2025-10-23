import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const positionId = params.id;
    const body = await request.json();
    
    // Extract optional parameters
    const { exitPrice, reason = 'MANUAL' } = body;

    // Validate position exists (mock implementation)
    if (!positionId) {
      return NextResponse.json(
        { error: 'Position ID is required' },
        { status: 400 }
      );
    }

    // In production, this would call the paper trading engine
    // await paperTradingEngine.closePosition(positionId, exitPrice, reason);

    const closedPosition = {
      id: positionId,
      status: 'CLOSED',
      exitTimestamp: new Date().toISOString(),
      exitPrice: exitPrice || 2.50, // Mock exit price
      exitReason: reason,
      finalPnL: 125 // Mock final P&L
    };

    return NextResponse.json({
      success: true,
      message: 'Position closed successfully',
      position: closedPosition
    });
  } catch (error) {
    console.error('Error closing position:', error);
    return NextResponse.json(
      { error: 'Failed to close position' },
      { status: 500 }
    );
  }
}