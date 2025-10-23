import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const positionId = params.id;
    const body = await request.json();
    
    // Extract adjustment parameters
    const { stopLoss, profitTarget, trailingStop } = body;

    // Validate position exists (mock implementation)
    if (!positionId) {
      return NextResponse.json(
        { error: 'Position ID is required' },
        { status: 400 }
      );
    }

    // Validate at least one adjustment parameter is provided
    if (!stopLoss && !profitTarget && !trailingStop) {
      return NextResponse.json(
        { error: 'At least one adjustment parameter (stopLoss, profitTarget, trailingStop) is required' },
        { status: 400 }
      );
    }

    // In production, this would call the exit condition manager
    // await exitConditionManager.updateExitConditions(positionId, adjustments);

    const adjustments = {
      positionId,
      stopLoss: stopLoss || null,
      profitTarget: profitTarget || null,
      trailingStop: trailingStop || null,
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Position adjustments updated successfully',
      adjustments
    });
  } catch (error) {
    console.error('Error adjusting position:', error);
    return NextResponse.json(
      { error: 'Failed to adjust position' },
      { status: 500 }
    );
  }
}