import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// POST /api/webhooks/paper-trading - Receive paper trading webhooks
export async function POST(request: NextRequest) {
  try {
    const headersList = headers();
    const authorization = headersList.get('authorization');
    
    // Verify webhook authentication
    const expectedToken = process.env.WEBHOOK_AUTH_TOKEN || 'default-token';
    if (!authorization || authorization !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    
    // Log the webhook for debugging
    console.log('📡 Webhook received:', {
      id: payload.id,
      type: payload.type,
      severity: payload.severity,
      title: payload.title,
      timestamp: payload.timestamp
    });

    // Process the webhook payload
    await processWebhookPayload(payload);

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      id: payload.id
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/webhooks/paper-trading - Test webhook endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Paper Trading Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    supportedMethods: ['POST'],
    authRequired: true
  });
}

// Process webhook payload
async function processWebhookPayload(payload: any): Promise<void> {
  const { id, type, severity, title, message, data, timestamp } = payload;

  // Store webhook in database (if needed)
  // await storeWebhookEvent(payload);

  // Forward to external systems if configured
  await forwardToExternalSystems(payload);

  // Trigger additional actions based on alert type
  switch (type) {
    case 'TRADE_EXECUTED':
      await handleTradeExecutedWebhook(data);
      break;
    case 'TRADE_CLOSED':
      await handleTradeClosedWebhook(data);
      break;
    case 'RISK_VIOLATION':
      await handleRiskViolationWebhook(data);
      break;
    case 'PERFORMANCE_MILESTONE':
      await handlePerformanceMilestoneWebhook(data);
      break;
    case 'SYSTEM_ERROR':
      await handleSystemErrorWebhook(data);
      break;
  }
}

async function handleTradeExecutedWebhook(data: any): Promise<void> {
  // Log trade execution
  console.log(`📈 Trade executed: ${data.side} ${data.ticker} (confidence: ${data.confidence})`);
  
  // Could trigger additional notifications or integrations
  // e.g., update external portfolio tracking systems
}

async function handleTradeClosedWebhook(data: any): Promise<void> {
  // Log trade closure
  const result = data.pnl > 0 ? 'PROFIT' : 'LOSS';
  console.log(`📊 Trade closed: ${data.ticker} ${result} $${data.pnl.toFixed(2)}`);
  
  // Could trigger performance analysis or reporting
}

async function handleRiskViolationWebhook(data: any): Promise<void> {
  // Log risk violation
  console.log(`⚠️ Risk violation: ${data.violationType} (${data.currentValue} > ${data.limit})`);
  
  // Could trigger emergency actions like position closure
}

async function handlePerformanceMilestoneWebhook(data: any): Promise<void> {
  // Log milestone achievement
  console.log(`🎯 Milestone reached: ${data.milestone} = ${data.value}`);
  
  // Could trigger celebration notifications or strategy adjustments
}

async function handleSystemErrorWebhook(data: any): Promise<void> {
  // Log system error
  console.log(`🚨 System error in ${data.component}: ${data.error}`);
  
  // Could trigger monitoring alerts or automatic recovery
}

async function forwardToExternalSystems(payload: any): Promise<void> {
  // Forward to external monitoring systems
  const externalWebhooks = [
    process.env.EXTERNAL_MONITORING_WEBHOOK,
    process.env.PORTFOLIO_TRACKER_WEBHOOK,
    process.env.RISK_MANAGEMENT_WEBHOOK
  ].filter(Boolean);

  const forwardPromises = externalWebhooks.map(async (webhookUrl) => {
    try {
      const response = await fetch(webhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Gamma-Paper-Trading-System'
        },
        body: JSON.stringify({
          ...payload,
          source: 'gamma-paper-trading',
          forwardedAt: new Date().toISOString()
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        console.warn(`Failed to forward to ${webhookUrl}: ${response.status}`);
      }
    } catch (error) {
      console.warn(`Error forwarding to ${webhookUrl}:`, error);
    }
  });

  await Promise.allSettled(forwardPromises);
}