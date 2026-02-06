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
// For future: users can subscribe to specific types on web
// For now: users get ALL alerts if enabled
function getPreferenceField(type: ConnectionsAlertType): string | null {
  // MVP: no per-type filtering for users
  // All types go to all subscribers who have connectionsPreferences.enabled = true
  return null;
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
   * 
   * MVP LOGIC:
   * - Everyone who pressed /start AND isActive=true gets alerts
   * - UNLESS they explicitly did /connections off (connectionsPreferences.enabled = false)
   * - No per-type filtering for users (admin decides types globally)
   */
  private async getActiveSubscribers(): Promise<Array<{ chatId: string; userId: string }>> {
    // Find all active connections
    // connectionsPreferences.enabled defaults to true if not set
    const connections = await TelegramConnectionModel.find({
      isActive: true,
      chatId: { $exists: true, $ne: '' },
      'connectionsPreferences.enabled': { $ne: false }, // true or not set = receives alerts
    }, { chatId: 1, userId: 1 }).lean();
    
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

      // Get all subscribers (MVP: everyone who /start and didn't /connections off)
      const subscribers = await this.getActiveSubscribers();
      
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
   * Sends to ALL active subscribers + admin channel
   */
  async sendTestMessage(): Promise<{ ok: boolean; message?: string }> {
    const settings = await this.settingsStore.get();

    if (!settings.enabled) {
      throw new Error('Telegram delivery is disabled. Enable it in settings first.');
    }

    if (settings.preview_only) {
      throw new Error('Preview-only mode is enabled. Disable it to send messages.');
    }

    // Get all subscribers
    const subscribers = await this.getActiveSubscribers();
    
    // Add admin channel if set
    if (settings.chat_id) {
      const hasAdminChannel = subscribers.some(s => s.chatId === settings.chat_id);
      if (!hasAdminChannel) {
        subscribers.push({ chatId: settings.chat_id, userId: 'admin_channel' });
      }
    }

    if (subscribers.length === 0) {
      throw new Error('No active subscribers. Users need to /start the bot first.');
    }

    const testEvent: ConnectionsAlertEvent = {
      id: generateId(),
      type: 'TEST',
      created_at: new Date().toISOString(),
      account_id: 'test',
      delivery_status: 'PREVIEW',
    };

    const text = formatTelegramMessage(this.publicBaseUrl, testEvent);
    
    // Send to all subscribers
    let sentCount = 0;
    let errors: string[] = [];
    
    for (const subscriber of subscribers) {
      try {
        await this.telegram.sendMessage(subscriber.chatId, text);
        sentCount++;
      } catch (err: any) {
        errors.push(`${subscriber.userId}: ${err?.message}`);
      }
    }

    // Record test delivery
    testEvent.delivery_status = 'SENT';
    testEvent.sent_at = new Date().toISOString();
    await this.deliveryStore.record(testEvent);

    if (sentCount === 0) {
      throw new Error(`All sends failed: ${errors.join('; ')}`);
    }

    return { 
      ok: true, 
      message: `Test sent to ${sentCount}/${subscribers.length} subscribers` 
    };
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
