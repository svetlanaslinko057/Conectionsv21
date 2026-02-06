/**
 * Connections Telegram Notifications - Types
 * Phase 2.3: Telegram Alerts Delivery
 */

export type ConnectionsAlertType =
  | 'EARLY_BREAKOUT'
  | 'STRONG_ACCELERATION'
  | 'TREND_REVERSAL'
  | 'TEST';

export type AlertDeliveryStatus =
  | 'PREVIEW'     // created by engine, not delivered
  | 'SENT'        // sent to Telegram
  | 'SKIPPED'     // skipped by policy (disabled/cooldown)
  | 'SUPPRESSED'  // manually suppressed
  | 'FAILED';     // send attempt failed

export interface ConnectionsAlertEvent {
  _id?: any;
  id: string;
  type: ConnectionsAlertType;
  created_at: string;
  account_id: string;
  username?: string;

  // Snapshot for message
  influence_score?: number;       // 0..1000
  velocity_per_day?: number;      // pts/day
  acceleration_pct?: number;      // %
  profile?: 'retail' | 'influencer' | 'whale';
  risk?: 'low' | 'medium' | 'high';
  prev_trend_state?: 'growing' | 'cooling' | 'stable' | 'volatile';
  trend_state?: 'growing' | 'cooling' | 'stable' | 'volatile';

  // Human explanation
  explain_summary?: string;

  // Delivery state
  delivery_status: AlertDeliveryStatus;
  delivery_reason?: string;
  sent_at?: string;
  target?: {
    telegram_chat_id?: string;
  };
}

export interface TelegramDeliverySettings {
  enabled: boolean;
  preview_only: boolean;
  chat_id: string;
  cooldown_hours: Record<ConnectionsAlertType, number>;
  type_enabled: Record<ConnectionsAlertType, boolean>;
  updated_at?: string;
}

export const DEFAULT_TELEGRAM_SETTINGS: TelegramDeliverySettings = {
  enabled: false,
  preview_only: true,
  chat_id: '',
  cooldown_hours: {
    TEST: 0,
    EARLY_BREAKOUT: 24,
    STRONG_ACCELERATION: 12,
    TREND_REVERSAL: 12,
  },
  type_enabled: {
    TEST: true,
    EARLY_BREAKOUT: true,
    STRONG_ACCELERATION: true,
    TREND_REVERSAL: true,
  },
};
