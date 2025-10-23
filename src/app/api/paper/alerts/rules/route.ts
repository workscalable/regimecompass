import { NextRequest, NextResponse } from 'next/server';
import { getAlertSystem } from '../../../../../../gamma-services/alerts';

// GET /api/paper/alerts/rules - Get alert rules
export async function GET(request: NextRequest) {
  try {
    const alertSystem = getAlertSystem();
    const rules = alertSystem.getAlertRules();

    return NextResponse.json({
      success: true,
      rules,
      total: rules.length
    });

  } catch (error) {
    console.error('Get alert rules error:', error);
    return NextResponse.json(
      { error: 'Failed to get alert rules', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/paper/alerts/rules - Create or update alert rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ruleId, ruleData } = body;

    const alertSystem = getAlertSystem();

    switch (action) {
      case 'create':
        if (!ruleData) {
          return NextResponse.json(
            { error: 'Rule data required for create action' },
            { status: 400 }
          );
        }

        const newRule = {
          id: ruleData.id || `rule_${Date.now()}`,
          name: ruleData.name || 'New Rule',
          type: ruleData.type,
          enabled: ruleData.enabled !== false,
          conditions: ruleData.conditions || [],
          actions: ruleData.actions || [],
          cooldownPeriod: ruleData.cooldownPeriod || 0
        };

        alertSystem.addAlertRule(newRule);

        return NextResponse.json({
          success: true,
          message: 'Alert rule created',
          rule: newRule
        });

      case 'update':
        if (!ruleId || !ruleData) {
          return NextResponse.json(
            { error: 'Rule ID and data required for update action' },
            { status: 400 }
          );
        }

        alertSystem.updateAlertRule(ruleId, ruleData);

        return NextResponse.json({
          success: true,
          message: 'Alert rule updated',
          ruleId
        });

      case 'delete':
        if (!ruleId) {
          return NextResponse.json(
            { error: 'Rule ID required for delete action' },
            { status: 400 }
          );
        }

        alertSystem.removeAlertRule(ruleId);

        return NextResponse.json({
          success: true,
          message: 'Alert rule deleted',
          ruleId
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: create, update, or delete' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Alert rule action error:', error);
    return NextResponse.json(
      { error: 'Failed to process alert rule action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}