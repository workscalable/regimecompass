import { NextRequest, NextResponse } from 'next/server';
import { systemHealthMonitor } from '@/gamma-services/monitoring/SystemHealthMonitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const severity = searchParams.get('severity') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;

    let alerts = activeOnly 
      ? systemHealthMonitor.getActiveAlerts()
      : systemHealthMonitor.getAllAlerts();

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      status: 'success',
      data: {
        alerts,
        count: alerts.length,
        summary: {
          total: alerts.length,
          bySeverity: {
            critical: alerts.filter(a => a.severity === 'CRITICAL').length,
            high: alerts.filter(a => a.severity === 'HIGH').length,
            medium: alerts.filter(a => a.severity === 'MEDIUM').length,
            low: alerts.filter(a => a.severity === 'LOW').length
          },
          byType: {
            latency: alerts.filter(a => a.type === 'LATENCY').length,
            errorRate: alerts.filter(a => a.type === 'ERROR_RATE').length,
            resourceUsage: alerts.filter(a => a.type === 'RESOURCE_USAGE').length,
            connectivity: alerts.filter(a => a.type === 'CONNECTIVITY').length
          }
        }
      }
    });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve alerts',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, action } = body;

    if (!alertId || !action) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'alertId and action are required' 
        },
        { status: 400 }
      );
    }

    if (action === 'resolve') {
      const resolved = systemHealthMonitor.resolveAlert(alertId);
      
      if (resolved) {
        return NextResponse.json({
          status: 'success',
          message: 'Alert resolved successfully'
        });
      } else {
        return NextResponse.json(
          { 
            status: 'error', 
            message: 'Alert not found' 
          },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Invalid action. Supported actions: resolve' 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Alert action error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to process alert action',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}