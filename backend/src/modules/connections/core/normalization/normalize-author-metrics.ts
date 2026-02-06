/**
 * Normalize Author Metrics
 * 
 * Applies:
 * - Safe division
 * - Engagement quality calculation
 * - Activity weight (log scale)
 * - Caps and penalties (v0)
 */

import type { AuthorSignals } from '../signals/extract-author-signals.js';

export interface NormalizedAuthorMetrics extends AuthorSignals {
  normalized: {
    engagement_quality: number;  // 0-1 scale
    activity_weight: number;     // log scale
    total_engagement: number;
  };
}

export function normalizeAuthorMetrics(signals: AuthorSignals): NormalizedAuthorMetrics {
  const { likes, reposts, replies, views } = signals.metrics;

  // Total engagement
  const totalEngagement = likes + reposts + replies;
  
  // Safe views estimate (fallback if views not available)
  const safeViews = views && views > 0 ? views : Math.max(totalEngagement * 10, 1);

  // Engagement quality: weighted sum / views
  // Weights: likes=1, reposts=2, replies=3 (replies are most valuable)
  const weightedEngagement = likes * 1 + reposts * 2 + replies * 3;
  const engagementQuality = Math.min(weightedEngagement / safeViews, 1);

  // Activity weight (log scale to dampen outliers)
  const activityWeight = Math.log1p(totalEngagement);

  return {
    ...signals,
    normalized: {
      engagement_quality: Math.round(engagementQuality * 10000) / 10000,
      activity_weight: Math.round(activityWeight * 100) / 100,
      total_engagement: totalEngagement,
    },
  };
}
