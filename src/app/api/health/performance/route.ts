import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/gamma-services/monitoring/PerformanceMonitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minutes = parseInt(searchParams.get('minutes') || '30');
    const operationType = searchParams.get('operation');
    const format = searchParams.get('format') || 'json';

    if (minutes < 1 || minutes > 1440) { // Max 24 hours
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Minutes parameter must be between 1 and 1440' 
        },
        { status: 400 }
      );
    }

    if (operationType) {
      // Get stats for specific operation type
      const stats = performanceMonitor.getOperationStats(operationType, minutes);
      
      return NextResponse.json({
        status: 'success',
        data: {
          operationType,
          timeRange: `${minutes} minutes`,
          stats
        }
      });
    } else {
      // Get overall performance summary
      const summary = performanceMonitor.getPerformanceSummary(minutes);
      const activeOperations = performanceMonitor.getActiveOperations();
      const thresholds = performanceMonitor.getThresholds();

      if (format === 'export') {
        // Export detailed performance data
        const exportData = performanceMonitor.exportPerformanceData(minutes);
        
        return NextResponse.json({
          status: 'success',
          data: exportData
        });
      }

      return NextResponse.json({
        status: 'success',
        data: {
          timeRange: `${minutes} minutes`,
          summary,
          activeOperations: {
            count: activeOperations.length,
            operations: activeOperations
          },
          thresholds,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve performance data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, thresholds } = body;

    if (action === 'updateThresholds') {
      if (!thresholds || typeof thresholds !== 'object') {
        return NextResponse.json(
          { 
            status: 'error', 
            message: 'Valid thresholds object is required' 
          },
          { status: 400 }
        );
      }

      performanceMonitor.updateThresholds(thresholds);
      
      return NextResponse.json({
        status: 'success',
        message: 'Performance thresholds updated successfully',
        thresholds: performanceMonitor.getThresholds()
      });
    } else if (action === 'clearHistory') {
      performanceMonitor.clearHistory();
      
      return NextResponse.json({
        status: 'success',
        message: 'Performance history cleared successfully'
      });
    } else {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Invalid action. Supported actions: updateThresholds, clearHistory' 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Performance action error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process performance action',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}