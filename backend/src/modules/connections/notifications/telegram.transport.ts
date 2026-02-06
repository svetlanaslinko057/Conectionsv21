/**
 * Connections Telegram Transport
 * Phase 2.3: Direct Telegram API integration
 * 
 * Uses existing bot token - bot is "dumb receiver", platform is "brain"
 */

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
   */
  async sendMessage(chatId: string, text: string): Promise<any> {
    if (!this.botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is missing');
    }
    if (!chatId) {
      throw new Error('Telegram chat_id is missing');
    }

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Telegram sendMessage failed: ${response.status} ${body}`);
    }

    return response.json();
  }

  /**
   * Get bot info (for validation)
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
