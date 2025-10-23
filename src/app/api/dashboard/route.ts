import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

/**
 * GET /api/dashboard
 * Get comprehensive dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all dashboard data in parallel
    const [
      positions,
      performance,
      systemHealth,
      riskMetrics,
      marketData,
      signals
    ] = await Promise.all([
      DatabaseService.getPositions(),
      DatabaseService.getPerformanceMetrics(),
      DatabaseService.getSystemHealth(),
      DatabaseService.getRiskMetrics(),
      DatabaseService.getMarketData(),
      DatabaseService.getSignals()
    ]);

    // Calculate portfolio metrics
    const totalValue = positions.reduce((sum, pos) => sum + (pos.market_value || 0), 0);
    const totalCost = positions.reduce((sum, pos) => sum + (pos.cost_basis || 0), 0);
    const totalPnL = totalValue - totalCost;
    const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

    const dashboardData = {
      marketData: {
        ...marketData,
        totalPnL,
        totalPnLPercent,
        openPositions: positions.length,
        activeSignals: signals.length
      },
      positions,
      performance: {
        ...performance,
        totalValue,
        totalCost,
        totalPnL,
        totalPnLPercent
      },
      systemHealth,
      riskMetrics,
      signals
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
