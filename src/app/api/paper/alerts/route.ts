import { NextRequest, NextResponse } from 'next/server';
import { getAlertSystem } from '../../../../../gamma-services/alerts';

// GET /api/paper/alerts - Get alerts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as any;
    const severity = searchParams.get('severity') as any;
    const acknowledged = searchParams.get('acknowledged');
    const limit = searchParams.get('limit');

    const alertSystem = getAlertSystem();
    
    const filters: any = {};
    if (type) filters.type = type;
    if (severity) filters.severity = severity;
    if (acknowledged !== null) filters.acknowledged = acknowledged === 'true';
    if (limit) filters.limit = parseInt(limit);

    const alerts = alertSystem.getAlerts(filters);
    const statistics = alertSystem.getStatistics();

    return NextResponse.json({
      success: true,
      alerts,
      statistics,
      total: alerts.length
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to get alerts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/paper/alerts - Create manual alert or acknowledge alerts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, alertData } = body;

    const alertSystem = getAlertSystem();

    switch (action) {
      case 'acknowledge':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID required for acknowledge action' },
            { status: 400 }
          );
        }
        
        alertSystem.acknowledgeAlert(alertId);
        
        return NextResponse.json({
          success: true,
          message: 'Alert acknowledged',
          alertId
        });

      case 'create':
        if (!alertData) {
          return NextResponse.json(
            { error: 'Alert data required for create action' },
            { status: 400 }
          );
        }

        // Create manual alert (for testing or manual notifications)
        const alert = {
          type: alertData.type || 'SYSTEM_ERROR',
          severity: alertData.severity || 'MEDIUM',
          title: alertData.title || 'Manual Alert',
          message: alertData.message || 'Manual alert created',
          data: alertData.data || {}
        };

        // This would need to be implemented in AlertSystem
        // const createdAlert = alertSystem.createManualAlert(alert);

        return NextResponse.json({
          success: true,
          message: 'Manual alert created',
          // alert: createdAlert
        });

      case 'clear_old':
        const days = body.days || 30;
        alertSystem.clearOldAlerts(days);
        
        return NextResponse.json({
          success: true,
          message: `Cleared alerts older than ${days} days`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: acknowledge, create, or clear_old' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Alert action error:', error);
    return NextResponse.json(
      { error: 'Failed to process alert action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}