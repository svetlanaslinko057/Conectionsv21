/**
 * Connections Telegram Dispatcher
 * Phase 2.3: Core delivery logic
 * 
 * This is the "brain" - decides what to send and when
 * Bot is "dumb receiver" - all control from platform
 * 
 * DELIVERY LOGIC:
 * 1. Admin can set global chat_id for system/channel alerts
 * 2. Users receive alerts in their personal chat (from TelegramConnectionModel)
 * 3. Users can mute via /connections off in Telegram
 */

import type { Db } from 'mongodb';
import type { ConnectionsAlertEvent, ConnectionsAlertType, TelegramDeliverySettings } from './types.js';
import { formatTelegramMessage } from './templates.js';
import { ConnectionsTelegramSettingsStore } from './settings.store.js';
import { ConnectionsTelegramDeliveryStore } from './delivery.store.js';
import { TelegramTransport } from './telegram.transport.js';
import { getAlerts, updateAlertStatus, type ConnectionsAlert } from '../core/alerts/connections-alerts-engine.js';
import { TelegramConnectionModel } from '../../../core/notifications/telegram.service.js';

function hoursAgoIso(hours: number): string {
  const d = new Date(Date.now() - hours * 3600 * 1000);
  return d.toISOString();
}

function generateId(): string {
  return `tg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Map alert type to user preference field
function getPreferenceField(type: ConnectionsAlertType): string | null {
  switch (type) {
    case 'EARLY_BREAKOUT': return 'earlyBreakout';
    case 'STRONG_ACCELERATION': return 'strongAcceleration';
    case 'TREND_REVERSAL': return 'trendReversal';
    case 'TEST': return null; // Test always goes through
    default: return null;
  }
}

export class ConnectionsTelegramDispatcher {
  private settingsStore: ConnectionsTelegramSettingsStore;
  private deliveryStore: ConnectionsTelegramDeliveryStore;
  private telegram: TelegramTransport;
  private publicBaseUrl: string;
  private db: Db;

  constructor(
    db: Db,
    telegram: TelegramTransport,
    publicBaseUrl: string
  ) {
    this.db = db;
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
   * Get all active subscribers who want Connections alerts
   */
  private async getActiveSubscribers(alertType: ConnectionsAlertType): Promise<Array<{ chatId: string; userId: string }>> {
    const prefField = getPreferenceField(alertType);
    
    // Find all active connections with Connections enabled
    const query: any = {
      isActive: true,
      chatId: { $exists: true, $ne: '' },
      'connectionsPreferences.enabled': { $ne: false }, // Default is true if not set
    };
    
    // If specific alert type, check that preference too
    if (prefField) {
      query[`connectionsPreferences.${prefField}`] = { $ne: false };
    }
    
    const connections = await TelegramConnectionModel.find(query, { chatId: 1, userId: 1 }).lean();
    
    return connections.map(c => ({
      chatId: c.chatId as string,
      userId: c.userId,
    }));
  }

  /**
   * Dispatch pending alerts to Telegram
   * Main entry point for delivery
   * 
   * FLOW:
   * 1. Check global settings (admin can disable entirely)
   * 2. For each pending alert:
   *    - Check type toggle (admin can disable specific types)
   *    - Check cooldown per account
   *    - Send to ALL active subscribers (not just one chat)
   * 3. Optionally also send to admin channel (if chat_id set in settings)
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

      // Type toggle check (admin can disable specific types globally)
      if (!settings.type_enabled[type]) {
        await this.recordSkipped(alert, 'type_disabled');
        skipped++;
        continue;
      }

      // Cooldown check (per account, not per user)
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

      // Build message
      const event = this.alertToEvent(alert);
      const text = formatTelegramMessage(this.publicBaseUrl, event);

      if (dryRun) {
        skipped++;
        continue;
      }

      // Get all subscribers who want this alert type
      const subscribers = await this.getActiveSubscribers(type);
      
      // Also add admin channel if configured
      if (settings.chat_id) {
        const hasAdminChannel = subscribers.some(s => s.chatId === settings.chat_id);
        if (!hasAdminChannel) {
          subscribers.push({ chatId: settings.chat_id, userId: 'admin_channel' });
        }
      }

      if (subscribers.length === 0) {
        await this.recordSkipped(alert, 'no_subscribers');
        skipped++;
        continue;
      }

      // Send to all subscribers
      let sentCount = 0;
      let failedCount = 0;
      
      for (const subscriber of subscribers) {
        try {
          await this.telegram.sendMessage(subscriber.chatId, text);
          sentCount++;
        } catch (err: any) {
          console.error(`[Dispatcher] Failed to send to ${subscriber.chatId}:`, err?.message);
          failedCount++;
        }
      }

      // Record result
      if (sentCount > 0) {
        await this.recordSent(alert, `${sentCount} subscribers`);
        sent++;
      } else {
        await this.recordFailed(alert, `all ${failedCount} sends failed`);
        failed++;
      }
    }

    return { ok: true, sent, skipped, failed };
  }

  /**
   * Send test message (for Admin UI)
   * Sends to admin channel OR first active subscriber
   */
  async sendTestMessage(): Promise<{ ok: boolean; message?: string }> {
    const settings = await this.settingsStore.get();

    if (!settings.enabled) {
      throw new Error('Telegram delivery is disabled. Enable it in settings first.');
    }

    if (settings.preview_only) {
      throw new Error('Preview-only mode is enabled. Disable it to send messages.');
    }

    // Determine where to send test
    let targetChatId = settings.chat_id;
    let targetDescription = 'admin channel';
    
    if (!targetChatId) {
      // Try to find first active subscriber
      const subscribers = await this.getActiveSubscribers('TEST');
      if (subscribers.length > 0) {
        targetChatId = subscribers[0].chatId;
        targetDescription = `subscriber ${subscribers[0].userId}`;
      }
    }

    if (!targetChatId) {
      throw new Error('No chat ID configured and no active subscribers found.');
    }

    const testEvent: ConnectionsAlertEvent = {
      id: generateId(),
      type: 'TEST',
      created_at: new Date().toISOString(),
      account_id: 'test',
      delivery_status: 'PREVIEW',
    };

    const text = formatTelegramMessage(this.publicBaseUrl, testEvent);
    await this.telegram.sendMessage(targetChatId, text);

    // Record test delivery
    testEvent.delivery_status = 'SENT';
    testEvent.sent_at = new Date().toISOString();
    await this.deliveryStore.record(testEvent);

    return { ok: true, message: `Test message sent to ${targetDescription}` };
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private async recordSent(alert: ConnectionsAlert, target: string): Promise<void> {
    const event = this.alertToEvent(alert);
    event.delivery_status = 'SENT';
    event.sent_at = new Date().toISOString();
    event.target = { telegram_chat_id: target };
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
