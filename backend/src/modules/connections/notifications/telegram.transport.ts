/**
 * Connections Telegram Transport
 * Phase 2.3: Uses existing platform telegram.service
 * 
 * Uses existing bot token - bot is "dumb receiver", platform is "brain"
 * INTEGRATION: Uses sendTelegramMessage from core/notifications/telegram.service
 */

import { sendTelegramMessage } from '../../../core/notifications/telegram.service.js';

export interface TelegramTransportConfig {
  botToken: string;
}

export class TelegramTransport {
  private botToken: string;

  constructor(config: TelegramTransportConfig) {
    this.botToken = config.botToken;
  }

  /**
   * Send message to Telegram chat/channel
   * Uses existing platform telegram service for consistency
   */
  async sendMessage(chatId: string, text: string): Promise<any> {
    if (!chatId) {
      throw new Error('Telegram chat_id is missing');
    }

    // Use existing platform telegram service
    const result = await sendTelegramMessage(chatId, text, { parseMode: 'HTML' });
    
    if (!result.ok) {
      throw new Error(result.error || 'Telegram send failed');
    }
    
    return { ok: true, messageId: result.messageId };
  }

  /**
   * Get bot info (for validation) - uses direct API
   */
  async getMe(): Promise<any> {
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is missing');
    }

    const url = `https://api.telegram.org/bot${this.botToken}/getMe`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to get bot info: ${response.status}`);
    }

    return response.json();
  }
}
