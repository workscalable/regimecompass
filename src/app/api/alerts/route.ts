import { NextRequest, NextResponse } from 'next/server';
import { alertSystem } from '@/gamma-services/alerting/AlertSystem';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'active', 'history', 'rules', 'statistics'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    switch (type) {
      case 'active':
        const activeAlerts = alertSystem.getActiveAlerts();
        return NextResponse.json({
          status: 'success',
          data: {
            alerts: activeAlerts,
            count: activeAlerts.length
          }
        });

      case 'history':
        const alertHistory = alertSystem.getAlertHistory(limit);
        return NextResponse.json({
          status: 'success',
          data: {
            alerts: alertHistory,
            count: alertHistory.length,
            limit
          }
        });

      case 'rules':
        const alertRules = alertSystem.getAlertRules();
        return NextResponse.json({
          status: 'success',
          data: {
            rules: alertRules,
            count: alertRules.length
          }
        });

      case 'statistics':
        const statistics = alertSystem.getAlertStatistics();
        return NextResponse.json({
          status: 'success',
          data: statistics
        });

      default:
        // Return overview
        const overview = {
          activeAlerts: alertSystem.getActiveAlerts(),
          recentAlerts: alertSystem.getAlertHistory(10),
          statistics: alertSystem.getAlertStatistics(),
          rules: alertSystem.getAlertRules()
        };

        return NextResponse.json({
          status: 'success',
          data: overview
        });
    }
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
    const { action, alertId, userId, ruleId, rule, metric, value } = body;

    switch (action) {
      case 'acknowledge':
        if (!alertId || !userId) {
          return NextResponse.json(
            { status: 'error', message: 'Alert ID and user ID are required' },
            { status: 400 }
          );
        }
        
        const acknowledged = await alertSystem.acknowledgeAlert(alertId, userId);
        if (!acknowledged) {
          return NextResponse.json(
            { status: 'error', message: 'Alert not found or already acknowledged' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          status: 'success',
          message: 'Alert acknowledged successfully'
        });

      case 'resolve':
        if (!alertId || !userId) {
          return NextResponse.json(
            { status: 'error', message: 'Alert ID and user ID are required' },
            { status: 400 }
          );
        }
        
        const resolved = await alertSystem.resolveAlert(alertId, userId);
        if (!resolved) {
          return NextResponse.json(
            { status: 'error', message: 'Alert not found or already resolved' },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          status: 'success',
          message: 'Alert resolved successfully'
        });

      case 'addRule':
        if (!rule) {
          return NextResponse.json(
            { status: 'error', message: 'Alert rule is required' },
            { status: 400 }
          );
        }
        
        alertSystem.addRule(rule);
        return NextResponse.json({
          status: 'success',
          message: 'Alert rule added successfully'
        });

      case 'removeRule':
        if (!ruleId) {
          return NextResponse.json(
            { status: 'error', message: 'Rule ID is required' },
            { status: 400 }
          );
        }
        
        alertSystem.removeRule(ruleId);
        return NextResponse.json({
          status: 'success',
          message: 'Alert rule removed successfully'
        });

      case 'updateMetric':
        if (!metric || value === undefined) {
          return NextResponse.json(
            { status: 'error', message: 'Metric name and value are required' },
            { status: 400 }
          );
        }
        
        alertSystem.updateMetric(metric, value);
        return NextResponse.json({
          status: 'success',
          message: 'Metric updated successfully'
        });

      case 'testAlert':
        // Trigger a test alert
        alertSystem.updateMetric('test.alert', true);
        return NextResponse.json({
          status: 'success',
          message: 'Test alert triggered'
        });

      default:
        return NextResponse.json(
          { status: 'error', message: 'Invalid action' },
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