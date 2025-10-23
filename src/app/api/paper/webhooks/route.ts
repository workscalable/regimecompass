import { NextRequest, NextResponse } from 'next/server';
import { getAlertSystem } from '../../../../../gamma-services/alerts';

// GET /api/paper/webhooks - Get webhook configurations
export async function GET(request: NextRequest) {
  try {
    const alertSystem = getAlertSystem();
    const webhookIds = alertSystem.getWebhookConfigs();

    // Don't expose sensitive webhook URLs, just return IDs and status
    const webhooks = webhookIds.map(id => ({
      id,
      status: 'active',
      lastUsed: null // Could track this in the future
    }));

    return NextResponse.json({
      success: true,
      webhooks,
      total: webhooks.length
    });

  } catch (error) {
    console.error('Get webhooks error:', error);
    return NextResponse.json(
      { error: 'Failed to get webhooks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/paper/webhooks - Manage webhook configurations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, webhookId, webhookConfig } = body;

    const alertSystem = getAlertSystem();

    switch (action) {
      case 'add':
        if (!webhookId || !webhookConfig) {
          return NextResponse.json(
            { error: 'Webhook ID and config required for add action' },
            { status: 400 }
          );
        }

        // Validate webhook config
        if (!webhookConfig.url || !webhookConfig.method) {
          return NextResponse.json(
            { error: 'Webhook URL and method are required' },
            { status: 400 }
          );
        }

        const config = {
          url: webhookConfig.url,
          method: webhookConfig.method || 'POST',
          headers: webhookConfig.headers || { 'Content-Type': 'application/json' },
          timeout: webhookConfig.timeout || 5000,
          retryAttempts: webhookConfig.retryAttempts || 3,
          retryDelay: webhookConfig.retryDelay || 1000
        };

        alertSystem.addWebhookConfig(webhookId, config);

        return NextResponse.json({
          success: true,
          message: 'Webhook configuration added',
          webhookId
        });

      case 'remove':
        if (!webhookId) {
          return NextResponse.json(
            { error: 'Webhook ID required for remove action' },
            { status: 400 }
          );
        }

        alertSystem.removeWebhookConfig(webhookId);

        return NextResponse.json({
          success: true,
          message: 'Webhook configuration removed',
          webhookId
        });

      case 'test':
        if (!webhookId) {
          return NextResponse.json(
            { error: 'Webhook ID required for test action' },
            { status: 400 }
          );
        }

        try {
          await alertSystem.testWebhook(webhookId);
          
          return NextResponse.json({
            success: true,
            message: 'Webhook test sent successfully',
            webhookId
          });
        } catch (testError) {
          return NextResponse.json({
            success: false,
            message: 'Webhook test failed',
            error: testError instanceof Error ? testError.message : 'Unknown error',
            webhookId
          }, { status: 400 });
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: add, remove, or test' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Webhook action error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook action', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}