import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database';

/**
 * GET /api/analytics
 * Get comprehensive analytics data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';

    let analyticsData: any = {};

    switch (type) {
      case 'performance':
        analyticsData = await DatabaseService.getPerformanceMetrics();
        break;
      
      case 'signals':
        analyticsData = await DatabaseService.getSignalAnalysis();
        break;
      
      case 'fibonacci':
        analyticsData = await DatabaseService.getFibonacciAnalysis();
        break;
      
      case 'insights':
        analyticsData = await DatabaseService.getLearningInsights();
        break;
      
      case 'history':
        const days = parseInt(searchParams.get('days') || '30');
        analyticsData = await DatabaseService.getPerformanceHistory(days);
        break;
      
      case 'portfolio':
        analyticsData = await DatabaseService.getPortfolioAnalytics();
        break;
      
      case 'all':
      default:
        const [
          performance,
          signalAnalysis,
          fibonacciAnalysis,
          insights,
          history,
          portfolio
        ] = await Promise.all([
          DatabaseService.getPerformanceMetrics(),
          DatabaseService.getSignalAnalysis(),
          DatabaseService.getFibonacciAnalysis(),
          DatabaseService.getLearningInsights(),
          DatabaseService.getPerformanceHistory(30),
          DatabaseService.getPortfolioAnalytics()
        ]);

        analyticsData = {
          performance,
          signalAnalysis,
          fibonacciAnalysis,
          insights,
          history,
          portfolio
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: analyticsData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
