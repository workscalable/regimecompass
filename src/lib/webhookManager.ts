import { logger } from './monitoring';

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

interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  subscriptionId?: string;
}

// In-memory storage (in production, use database)
const subscriptions = new Map<string, WebhookSubscription>();
const eventHistory = new Map<string, WebhookEvent[]>();

/**
 * Webhook Manager for triggering events
 */
export class WebhookManager {
  static async triggerEvent(eventType: string, data: any): Promise<void> {
    const event: WebhookEvent = {
      id: generateId(),
      type: eventType,
      data,
      timestamp: new Date()
    };
    
    // Store event in history
    if (!eventHistory.has(eventType)) {
      eventHistory.set(eventType, []);
    }
    const history = eventHistory.get(eventType)!;
    history.push(event);
    
    // Keep only last 100 events per type
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    // Find subscriptions for this event type
    const relevantSubs = Array.from(subscriptions.values())
      .filter(sub => sub.active && sub.events.includes(eventType));
    
    if (relevantSubs.length === 0) {
      logger.debug('No active subscriptions for event', { eventType });
      return;
    }
    
    // Trigger webhooks in parallel
    const promises = relevantSubs.map(sub => 
      this.deliverWebhook(sub, event).catch(error => {
        logger.error('Webhook delivery failed', error, {
          subscriptionId: sub.id,
          eventType,
          url: sub.url
        });
      })
    );
    
    await Promise.allSettled(promises);
    
    logger.info('Webhook event triggered', {
      eventType,
      subscriptionCount: relevantSubs.length
    });
  }
  
  private static async deliverWebhook(
    subscription: WebhookSubscription, 
    event: WebhookEvent
  ): Promise<void> {
    try {
      const payload = {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp.toISOString(),
        data: event.data
      };
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'RegimeCompass-Webhook/1.0',
        'X-Webhook-Event': event.type,
        'X-Webhook-ID': event.id,
        'X-Webhook-Timestamp': event.timestamp.toISOString()
      };
      
      // Add signature if secret is provided
      if (subscription.secret) {
        const signature = await generateSignature(
          JSON.stringify(payload), 
          subscription.secret
        );
        headers['X-Webhook-Signature'] = signature;
      }
      
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Update subscription success
      subscription.lastTriggered = new Date();
      subscription.failureCount = 0;
      
      logger.debug('Webhook delivered successfully', {
        subscriptionId: subscription.id,
        eventType: event.type,
        responseStatus: response.status
      });
      
    } catch (error) {
      // Update failure count
      subscription.failureCount++;
      
      // Disable subscription after 5 consecutive failures
      if (subscription.failureCount >= 5) {
        subscription.active = false;
        logger.warn('Webhook subscription disabled due to failures', {
          subscriptionId: subscription.id,
          failureCount: subscription.failureCount
        });
      }
      
      throw error;
    }
  }

  static addSubscription(subscription: WebhookSubscription): void {
    subscriptions.set(subscription.id, subscription);
  }

  static removeSubscription(id: string): boolean {
    return subscriptions.delete(id);
  }

  static getSubscription(id: string): WebhookSubscription | undefined {
    return subscriptions.get(id);
  }

  static getAllSubscriptions(): WebhookSubscription[] {
    return Array.from(subscriptions.values());
  }
}

/**
 * Generate webhook signature for security
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `sha256=${hashHex}`;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}