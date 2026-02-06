/**
 * Connections Telegram Dispatcher
 * Phase 2.3: Core delivery logic
 * 
 * This is the "brain" - decides what to send and when
 * Bot is "dumb receiver" - all control from platform
 */

import type { Db } from 'mongodb';
import type { ConnectionsAlertEvent, ConnectionsAlertType, TelegramDeliverySettings } from './types.js';
import { formatTelegramMessage } from './templates.js';
import { ConnectionsTelegramSettingsStore } from './settings.store.js';
import { ConnectionsTelegramDeliveryStore } from './delivery.store.js';
import { TelegramTransport } from './telegram.transport.js';
import { getAlerts, updateAlertStatus, type ConnectionsAlert } from '../core/alerts/connections-alerts-engine.js';

function hoursAgoIso(hours: number): string {
  const d = new Date(Date.now() - hours * 3600 * 1000);
  return d.toISOString();
}

function generateId(): string {
  return `tg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export class ConnectionsTelegramDispatcher {
  private settingsStore: ConnectionsTelegramSettingsStore;
  private deliveryStore: ConnectionsTelegramDeliveryStore;
  private telegram: TelegramTransport;
  private publicBaseUrl: string;

  constructor(
    db: Db,
    telegram: TelegramTransport,
    publicBaseUrl: string
  ) {
    this.settingsStore = new ConnectionsTelegramSettingsStore(db);
    this.deliveryStore = new ConnectionsTelegramDeliveryStore(db);
    this.telegram = telegram;
    this.publicBaseUrl = publicBaseUrl;
  }

  /**
   * Get settings store (for admin routes)
   */
  getSettingsStore(): ConnectionsTelegramSettingsStore {
    return this.settingsStore;
  }

  /**
   * Get delivery store (for admin routes)
   */
  getDeliveryStore(): ConnectionsTelegramDeliveryStore {
    return this.deliveryStore;
  }

  /**
   * Convert alerts-engine alert to delivery event
   */
  private alertToEvent(alert: ConnectionsAlert): ConnectionsAlertEvent {
    return {
      id: alert.id,
      type: alert.type as ConnectionsAlertType,
      created_at: alert.timestamp,
      account_id: alert.account.author_id,
      username: alert.account.username,
      influence_score: alert.metrics_snapshot.influence_adjusted,
      velocity_per_day: alert.metrics_snapshot.velocity_norm * 100, // normalize
      acceleration_pct: alert.metrics_snapshot.acceleration_norm * 100,
      profile: alert.account.profile as 'retail' | 'influencer' | 'whale',
      risk: alert.metrics_snapshot.risk_level as 'low' | 'medium' | 'high',
      trend_state: alert.metrics_snapshot.trend_state as any,
      explain_summary: alert.reason,
      delivery_status: 'PREVIEW',
    };
  }

  /**
   * Dispatch pending alerts to Telegram
   * Main entry point for delivery
   */
  async dispatchPending(opts?: { dryRun?: boolean; limit?: number }): Promise<{
    ok: boolean;
    sent: number;
    skipped: number;
    failed: number;
    reason?: string;
  }> {
    const dryRun = !!opts?.dryRun;
    const limit = opts?.limit ?? 50;

    const settings = await this.settingsStore.get();

    // Global disable check
    if (!settings.enabled) {
      return { ok: true, sent: 0, skipped: 0, failed: 0, reason: 'telegram_disabled' };
    }

    // Preview-only mode - platform control, not bot
    if (settings.preview_only) {
      return { ok: true, sent: 0, skipped: 0, failed: 0, reason: 'preview_only' };
    }

    // Get preview alerts from engine
    const previewAlerts = getAlerts({ status: 'preview', limit });
    
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const alert of previewAlerts) {
      const type = alert.type as ConnectionsAlertType;

      // Type toggle check
      if (!settings.type_enabled[type]) {
        await this.recordSkipped(alert, 'type_disabled');
        skipped++;
        continue;
      }

      // Cooldown check
      const cooldownH = settings.cooldown_hours[type] ?? 12;
      if (cooldownH > 0) {
        const lastSent = await this.deliveryStore.getLastSent(alert.account.author_id, type);
        if (lastSent?.sent_at) {
          const sinceMs = Date.now() - new Date(lastSent.sent_at).getTime();
          const cooldownMs = cooldownH * 3600 * 1000;
          if (sinceMs < cooldownMs) {
            await this.recordSkipped(alert, 'cooldown');
            skipped++;
            continue;
          }
        }
      }

      // Chat ID
      const chatId = settings.chat_id;
      if (!chatId) {
        await this.recordFailed(alert, 'missing_chat_id');
        failed++;
        continue;
      }

      // Build message
      const event = this.alertToEvent(alert);
      const text = formatTelegramMessage(this.publicBaseUrl, event);

      if (dryRun) {
        skipped++;
        continue;
      }

      // Send!
      try {
        await this.telegram.sendMessage(chatId, text);
        await this.recordSent(alert, chatId);
        sent++;
      } catch (err: any) {
        await this.recordFailed(alert, err?.message || 'send_failed');
        failed++;
      }
    }

    return { ok: true, sent, skipped, failed };
  }

  /**
   * Send test message (for Admin UI)
   */
  async sendTestMessage(): Promise<{ ok: boolean; message?: string }> {
    const settings = await this.settingsStore.get();

    if (!settings.enabled) {
      throw new Error('Telegram delivery is disabled. Enable it in settings first.');
    }

    if (settings.preview_only) {
      throw new Error('Preview-only mode is enabled. Disable it to send messages.');
    }

    if (!settings.chat_id) {
      throw new Error('Chat ID is not configured. Set it in settings first.');
    }

    const testEvent: ConnectionsAlertEvent = {
      id: generateId(),
      type: 'TEST',
      created_at: new Date().toISOString(),
      account_id: 'test',
      delivery_status: 'PREVIEW',
    };

    const text = formatTelegramMessage(this.publicBaseUrl, testEvent);
    await this.telegram.sendMessage(settings.chat_id, text);

    // Record test delivery
    testEvent.delivery_status = 'SENT';
    testEvent.sent_at = new Date().toISOString();
    await this.deliveryStore.record(testEvent);

    return { ok: true, message: 'Test message sent successfully' };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private async recordSent(alert: ConnectionsAlert, chatId: string): Promise<void> {
    const event = this.alertToEvent(alert);
    event.delivery_status = 'SENT';
    event.sent_at = new Date().toISOString();
    event.target = { telegram_chat_id: chatId };
    await this.deliveryStore.record(event);
    
    // Update alert status in engine
    updateAlertStatus(alert.id, 'sent');
  }

  private async recordSkipped(alert: ConnectionsAlert, reason: string): Promise<void> {
    const event = this.alertToEvent(alert);
    event.delivery_status = 'SKIPPED';
    event.delivery_reason = reason;
    await this.deliveryStore.record(event);
  }

  private async recordFailed(alert: ConnectionsAlert, reason: string): Promise<void> {
    const event = this.alertToEvent(alert);
    event.delivery_status = 'FAILED';
    event.delivery_reason = reason;
    await this.deliveryStore.record(event);
  }
}
