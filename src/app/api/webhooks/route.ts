import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/monitoring';
import { WebhookManager } from '@/lib/webhookManager';

interface WebhookSubscription {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  createdAt: Date;
  lastTriggered?: Date;
  failureCount: number;
}

/**
 * Webhook management API
 * GET: List subscriptions
 * POST: Create new subscription
 * DELETE: Remove subscription
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    
    let subs = WebhookManager.getAllSubscriptions();
    
    if (active !== null) {
      subs = subs.filter(sub => sub.active === (active === 'true'));
    }
    
    return NextResponse.json({
      subscriptions: subs.map(sub => ({
        id: sub.id,
        url: sub.url,
        events: sub.events,
        active: sub.active,
        createdAt: sub.createdAt,
        lastTriggered: sub.lastTriggered,
        failureCount: sub.failureCount
      })),
      total: subs.length
    });
    
  } catch (error) {
    logger.error('Failed to list webhooks', error as Error);
    return NextResponse.json({
      error: 'Failed to list webhooks',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, events, secret } = body;
    
    // Validate input
    if (!url || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({
        error: 'Invalid input',
        message: 'URL and events array are required'
      }, { status: 400 });
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({
        error: 'Invalid URL',
        message: 'Please provide a valid HTTP/HTTPS URL'
      }, { status: 400 });
    }
    
    // Validate events
    const validEvents = [
      'regime.change',
      'regime.warning',
      'signal.new',
      'signal.update',
      'risk.alert',
      'market.open',
      'market.close'
    ];
    
    const invalidEvents = events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      return NextResponse.json({
        error: 'Invalid events',
        message: `Invalid events: ${invalidEvents.join(', ')}`,
        validEvents
      }, { status: 400 });
    }
    
    // Create subscription
    const subscription: WebhookSubscription = {
      id: generateId(),
      url,
      events,
      secret,
      active: true,
      createdAt: new Date(),
      failureCount: 0
    };
    
    WebhookManager.addSubscription(subscription);
    
    logger.info('Webhook subscription created', {
      id: subscription.id,
      url,
      events
    });
    
    return NextResponse.json({
      subscription: {
        id: subscription.id,
        url: subscription.url,
        events: subscription.events,
        active: subscription.active,
        createdAt: subscription.createdAt
      }
    }, { status: 201 });
    
  } catch (error) {
    logger.error('Failed to create webhook', error as Error);
    return NextResponse.json({
      error: 'Failed to create webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        error: 'Missing subscription ID'
      }, { status: 400 });
    }
    
    const subscription = WebhookManager.getSubscription(id);
    if (!subscription) {
      return NextResponse.json({
        error: 'Subscription not found'
      }, { status: 404 });
    }
    
    WebhookManager.removeSubscription(id);
    
    logger.info('Webhook subscription deleted', { id });
    
    return NextResponse.json({
      message: 'Subscription deleted successfully'
    });
    
  } catch (error) {
    logger.error('Failed to delete webhook', error as Error);
    return NextResponse.json({
      error: 'Failed to delete webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}