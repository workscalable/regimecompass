// File: /gamma-services/mtf/alerts/WebhookDispatcher.ts

import { AlertConfig } from './AlertManager';

export interface WebhookResponse {
  success: boolean;
  status?: number;
  error?: string;
  retryAfter?: number;
}

export class WebhookDispatcher {
  private config: AlertConfig;
  private retryQueue: Map<string, any[]> = new Map();

  constructor(config: AlertConfig) {
    this.config = config;
  }

  public updateConfig(config: AlertConfig): void {
    this.config = config;
  }

  public async sendToSlack(message: any): Promise<WebhookResponse> {
    if (!this.config.channels.slack.enabled || !this.config.channels.slack.webhookUrl) {
      return { success: false, error: 'Slack not configured' };
    }

    return this.retryWithBackoff(async () => {
      const response = await fetch(this.config.channels.slack.webhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }

      return { success: true, status: response.status };
    }, 'slack');
  }

  public async sendToTelegram(message: string): Promise<WebhookResponse> {
    if (!this.config.channels.telegram.enabled || 
        !this.config.channels.telegram.botToken || 
        !this.config.channels.telegram.chatId) {
      return { success: false, error: 'Telegram not configured' };
    }

    return this.retryWithBackoff(async () => {
      const url = `https://api.telegram.org/bot${this.config.channels.telegram.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.config.channels.telegram.chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Telegram API failed: ${response.status} ${errorData.description || response.statusText}`);
      }

      return { success: true, status: response.status };
    }, 'telegram');
  }

  public async sendToDiscord(embed: any): Promise<WebhookResponse> {
    if (!this.config.channels.discord.enabled || !this.config.channels.discord.webhookUrl) {
      return { success: false, error: 'Discord not configured' };
    }

    return this.retryWithBackoff(async () => {
      const response = await fetch(this.config.channels.discord.webhookUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(embed)
      });

      if (!response.ok) {
        throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
      }

      return { success: true, status: response.status };
    }, 'discord');
  }

  public async sendCustomWebhook(url: string, payload: any, headers: Record<string, string> = {}): Promise<WebhookResponse> {
    return this.retryWithBackoff(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Custom webhook failed: ${response.status} ${response.statusText}`);
      }

      return { success: true, status: response.status };
    }, 'custom');
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>, 
    operationType: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        console.warn(`${operationType} webhook attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          // Queue for later retry if all attempts failed
          this.queueForRetry(operationType, operation);
          break;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  private queueForRetry(operationType: string, operation: any): void {
    if (!this.retryQueue.has(operationType)) {
      this.retryQueue.set(operationType, []);
    }
    
    const queue = this.retryQueue.get(operationType)!;
    queue.push({
      operation,
      timestamp: Date.now(),
      attempts: 0
    });
    
    // Limit queue size to prevent memory issues
    if (queue.length > 100) {
      queue.shift(); // Remove oldest item
    }
  }

  public async processRetryQueue(): Promise<void> {
    for (const [operationType, queue] of this.retryQueue.entries()) {
      const itemsToRetry = queue.splice(0, 10); // Process up to 10 items at a time
      
      for (const item of itemsToRetry) {
        try {
          await item.operation();
          console.log(`Successfully retried ${operationType} webhook`);
        } catch (error) {
          item.attempts++;
          
          // Give up after 5 total attempts or 1 hour old
          const isOld = Date.now() - item.timestamp > 60 * 60 * 1000;
          const tooManyAttempts = item.attempts >= 5;
          
          if (!isOld && !tooManyAttempts) {
            queue.push(item); // Put back in queue for later
          } else {
            console.error(`Giving up on ${operationType} webhook after ${item.attempts} attempts:`, error);
          }
        }
      }
    }
  }

  public getQueueStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    
    for (const [operationType, queue] of this.retryQueue.entries()) {
      status[operationType] = queue.length;
    }
    
    return status;
  }

  public clearQueue(operationType?: string): void {
    if (operationType) {
      this.retryQueue.delete(operationType);
    } else {
      this.retryQueue.clear();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check methods
  public async testSlackConnection(): Promise<boolean> {
    if (!this.config.channels.slack.enabled || !this.config.channels.slack.webhookUrl) {
      return false;
    }

    try {
      const testMessage = {
        text: "🧪 MTF Alert System Test - Slack Connection OK",
        attachments: [{
          color: "#36a64f",
          text: `Test sent at ${new Date().toISOString()}`,
          footer: "MTF Trading Logic"
        }]
      };

      const result = await this.sendToSlack(testMessage);
      return result.success;
    } catch (error) {
      console.error('Slack connection test failed:', error);
      return false;
    }
  }

  public async testTelegramConnection(): Promise<boolean> {
    if (!this.config.channels.telegram.enabled || 
        !this.config.channels.telegram.botToken || 
        !this.config.channels.telegram.chatId) {
      return false;
    }

    try {
      const testMessage = "🧪 MTF Alert System Test - Telegram Connection OK\n\n" +
                         `Test sent at ${new Date().toISOString()}`;

      const result = await this.sendToTelegram(testMessage);
      return result.success;
    } catch (error) {
      console.error('Telegram connection test failed:', error);
      return false;
    }
  }

  public async testDiscordConnection(): Promise<boolean> {
    if (!this.config.channels.discord.enabled || !this.config.channels.discord.webhookUrl) {
      return false;
    }

    try {
      const testEmbed = {
        embeds: [{
          title: "🧪 MTF Alert System Test",
          description: "Discord Connection OK",
          color: 0x36a64f,
          timestamp: new Date().toISOString(),
          footer: {
            text: "MTF Trading Logic"
          }
        }]
      };

      const result = await this.sendToDiscord(testEmbed);
      return result.success;
    } catch (error) {
      console.error('Discord connection test failed:', error);
      return false;
    }
  }

  public async testAllConnections(): Promise<Record<string, boolean>> {
    const results = await Promise.allSettled([
      this.testSlackConnection(),
      this.testTelegramConnection(),
      this.testDiscordConnection()
    ]);

    return {
      slack: results[0].status === 'fulfilled' ? results[0].value : false,
      telegram: results[1].status === 'fulfilled' ? results[1].value : false,
      discord: results[2].status === 'fulfilled' ? results[2].value : false
    };
  }
}