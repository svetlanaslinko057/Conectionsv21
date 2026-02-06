/**
 * Connections Telegram Notifications - Message Templates
 * Phase 2.3: Telegram Alerts Delivery
 * 
 * Messaging Specification v1.0
 */

import type { ConnectionsAlertEvent, ConnectionsAlertType } from './types.js';

// ============================================================
// FORMATTERS
// ============================================================

function fmtInt(n?: number): string {
  if (n === undefined || n === null) return '—';
  return Math.round(n).toString();
}

function fmtPct(n?: number): string {
  if (n === undefined || n === null) return '—';
  const v = Math.round(n);
  return `${v > 0 ? '+' : ''}${v}%`;
}

function fmtProfile(p?: string): string {
  if (!p) return '—';
  if (p === 'retail') return 'Retail';
  if (p === 'influencer') return 'Influencer';
  if (p === 'whale') return 'Whale';
  return p;
}

function fmtRisk(r?: string): string {
  if (!r) return '—';
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function fmtTrend(t?: string): string {
  if (!t) return '—';
  return t.toUpperCase();
}

// ============================================================
// LINK BUILDERS
// ============================================================

export function buildConnectionsLink(baseUrl: string, accountId: string): string {
  const clean = baseUrl?.replace(/\/+$/, '') || '';
  return `${clean}/connections/${encodeURIComponent(accountId)}`;
}

export function buildRadarLink(baseUrl: string): string {
  const clean = baseUrl?.replace(/\/+$/, '') || '';
  return `${clean}/connections/radar`;
}

// ============================================================
// MESSAGE TEMPLATES
// ============================================================

/**
 * Format Telegram message based on alert type
 * Following Messaging Specification v1.0
 */
export function formatTelegramMessage(baseUrl: string, e: ConnectionsAlertEvent): string {
  const username = e.username ? `@${e.username}` : e.account_id;
  const link = buildConnectionsLink(baseUrl, e.account_id);

  // TEST message
  if (e.type === 'TEST') {
    return [
      '🧪 TEST ALERT',
      '',
      'This is a test notification from Connections module.',
      '',
      'If you see this message — Telegram delivery is configured correctly.',
      'No real signals were used.',
    ].join('\n');
  }

  // 🚀 EARLY BREAKOUT
  if (e.type === 'EARLY_BREAKOUT') {
    return [
      '🚀 EARLY BREAKOUT',
      '',
      username,
      '',
      'Аккаунт показывает ранний рост влияния, который рынок ещё не заметил.',
      '',
      `• Influence: ${fmtInt(e.influence_score)}`,
      `• Acceleration: ${fmtPct(e.acceleration_pct)}`,
      `• Profile: ${fmtProfile(e.profile)}`,
      `• Risk: ${fmtRisk(e.risk)}`,
      '',
      e.explain_summary || 'Сигнал основан на устойчивом росте и положительной динамике.',
      '',
      '🔗 View details:',
      link,
    ].join('\n');
  }

  // 📈 STRONG ACCELERATION
  if (e.type === 'STRONG_ACCELERATION') {
    return [
      '📈 STRONG ACCELERATION',
      '',
      username,
      '',
      'Резкое ускорение роста влияния за короткий период.',
      '',
      `• Influence: ${fmtInt(e.influence_score)}`,
      `• Velocity: +${fmtInt(e.velocity_per_day)}/day`,
      `• Acceleration: ${fmtPct(e.acceleration_pct)}`,
      `• Trend: ${fmtTrend(e.trend_state)}`,
      '',
      e.explain_summary || 'Динамика усиливается, возможен переход в breakout.',
      '',
      '🔗 View trend:',
      link,
    ].join('\n');
  }

  // 🔄 TREND REVERSAL
  if (e.type === 'TREND_REVERSAL') {
    return [
      '🔄 TREND CHANGE',
      '',
      username,
      '',
      'Изменение тренда влияния.',
      '',
      `• Previous: ${fmtTrend(e.prev_trend_state)}`,
      `• Current: ${fmtTrend(e.trend_state)}`,
      `• Influence: ${fmtInt(e.influence_score)}`,
      '',
      e.explain_summary || 'Динамика аккаунта изменилась — рекомендуется переоценка.',
      '',
      '🔗 View analysis:',
      link,
    ].join('\n');
  }

  // Fallback
  return [
    '🔔 CONNECTIONS ALERT',
    '',
    username,
    '',
    e.explain_summary || 'Alert triggered.',
    '',
    link,
  ].join('\n');
}
