/**
 * Early Signal Explain Layer v1
 * 
 * Human-readable explanations for early signals.
 * Output in Russian for product consistency.
 */

import type { EarlySignalResult, EarlySignalInput } from './early-signal.js'
import type { EarlySignalBadge } from './early-signal-config.js'

/**
 * Get human-readable explanation
 */
export function explainEarlySignal(result: EarlySignalResult): string {
  if (result.badge === 'breakout') {
    return 'Обнаружен ранний сигнал: аккаунт быстро усиливает влияние и может стать значимым в ближайшее время.'
  }
  
  if (result.badge === 'rising') {
    return 'Аккаунт демонстрирует положительную динамику и заслуживает наблюдения.'
  }
  
  return 'Ранних сигналов роста не обнаружено.'
}

/**
 * Get badge info for UI
 */
export function getEarlySignalBadge(badge: EarlySignalBadge): {
  label: string
  emoji: string
  color: 'green' | 'yellow' | 'gray'
  priority: number
} {
  switch (badge) {
    case 'breakout':
      return {
        label: 'Прорыв',
        emoji: '🚀',
        color: 'green',
        priority: 3,
      }
    case 'rising':
      return {
        label: 'Рост',
        emoji: '📈',
        color: 'yellow',
        priority: 2,
      }
    default:
      return {
        label: 'Нет сигнала',
        emoji: '➖',
        color: 'gray',
        priority: 1,
      }
  }
}

/**
 * Compare two accounts by early signal
 */
export function compareEarlySignals(
  a: EarlySignalResult,
  b: EarlySignalResult
): {
  stronger: 'a' | 'b' | 'tie'
  score_diff: number
  recommendation: string
} {
  const badgePriority = { none: 0, rising: 1, breakout: 2 }
  
  const priorityA = badgePriority[a.badge]
  const priorityB = badgePriority[b.badge]
  
  let stronger: 'a' | 'b' | 'tie' = 'tie'
  
  if (priorityA > priorityB) {
    stronger = 'a'
  } else if (priorityB > priorityA) {
    stronger = 'b'
  } else if (a.early_signal_score > b.early_signal_score + 50) {
    stronger = 'a'
  } else if (b.early_signal_score > a.early_signal_score + 50) {
    stronger = 'b'
  }
  
  let recommendation: string
  
  if (stronger === 'tie') {
    recommendation = 'Оба аккаунта имеют схожий потенциал раннего роста.'
  } else if (stronger === 'a') {
    if (a.badge === 'breakout') {
      recommendation = 'A демонстрирует сильный сигнал прорыва — рекомендуется приоритетное наблюдение.'
    } else {
      recommendation = 'A показывает более сильную динамику раннего роста.'
    }
  } else {
    if (b.badge === 'breakout') {
      recommendation = 'B демонстрирует сильный сигнал прорыва — рекомендуется приоритетное наблюдение.'
    } else {
      recommendation = 'B показывает более сильную динамику раннего роста.'
    }
  }
  
  return {
    stronger,
    score_diff: a.early_signal_score - b.early_signal_score,
    recommendation,
  }
}

/**
 * Get watchlist recommendation based on early signal
 */
export function getWatchlistRecommendation(result: EarlySignalResult): {
  action: 'add' | 'watch' | 'ignore'
  reason: string
} {
  if (result.badge === 'breakout' && result.confidence >= 0.5) {
    return {
      action: 'add',
      reason: 'Высокий потенциал прорыва с хорошей уверенностью',
    }
  }
  
  if (result.badge === 'rising' || (result.badge === 'breakout' && result.confidence < 0.5)) {
    return {
      action: 'watch',
      reason: 'Положительная динамика, требует наблюдения',
    }
  }
  
  return {
    action: 'ignore',
    reason: 'Нет значимых сигналов раннего роста',
  }
}
