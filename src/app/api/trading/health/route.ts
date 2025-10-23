import { NextRequest, NextResponse } from 'next/server';
import { tradingOrchestrationSystem } from '@/engine/TradingOrchestrationSystem';

/**
 * GET /api/trading/health
 * Get system health status
 */
export async function GET(request: NextRequest) {
  try {
    const health = await tradingOrchestrationSystem.getSystemHealth();
    const status = tradingOrchestrationSystem.getSystemStatus();
    const statistics = tradingOrchestrationSystem.getSignalStatistics();
    
    return NextResponse.json({
      success: true,
      data: {
        health,
        status,
        statistics
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch system health',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

