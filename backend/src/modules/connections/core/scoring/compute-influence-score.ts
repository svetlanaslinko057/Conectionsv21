/**
 * Compute Influence Score (v0 - no ML)
 * 
 * Now includes:
 * - follower_growth_30d (stub)
 * - network_purity_score (stub)
 * - engagement fields for future use
 */

import type { NormalizedAuthorMetrics } from '../normalization/normalize-author-metrics.js';

export interface AuthorProfile {
  author_id: string;
  handle: string;
  
  followers: number;
  follower_growth_30d: number;
  
  activity: {
    posts_count: number;
    posts_per_day: number;
    total_engagement: number;
    avg_engagement_quality: number;
    engagement_stability: 'low' | 'medium' | 'high' | 'unknown';
    volatility: 'low' | 'moderate' | 'high' | 'unknown';
  };
  
  engagement: {
    real_views_estimate: number;
    engagement_quality: number;
  };
  
  network: {
    network_purity_score: number;
    audience_overlap_score: number;
    artificial_engagement_score: number;
  };
  
  scores: {
    influence_score: number;      // 0-1000
    risk_level: 'low' | 'medium' | 'high' | 'unknown';
    red_flags: number;
  };
  
  updated_at: string;
}

export function computeInfluenceScore(
  data: NormalizedAuthorMetrics,
  existingProfile?: Partial<AuthorProfile>
): AuthorProfile {
  // Base score from engagement quality (scaled to 0-1000)
  const baseScore = Math.round(data.normalized.engagement_quality * 1000);
  
  // Activity bonus (up to +100 for high activity)
  const activityBonus = Math.min(data.normalized.activity_weight * 10, 100);
  
  // Final influence score (capped at 1000)
  const influenceScore = Math.min(baseScore + activityBonus, 1000);

  // Risk level thresholds
  let riskLevel: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
  if (influenceScore >= 500) riskLevel = 'low';
  else if (influenceScore >= 200) riskLevel = 'medium';
  else riskLevel = 'high';

  // Red flags (v0: simple heuristics)
  let redFlags = 0;
  if (influenceScore < 100) redFlags += 2;
  if (data.normalized.engagement_quality < 0.001) redFlags += 1;

  // Merge with existing profile stats
  const existingPostsCount = existingProfile?.activity?.posts_count ?? 0;
  const existingTotalEngagement = existingProfile?.activity?.total_engagement ?? 0;
  const existingAvgQuality = existingProfile?.activity?.avg_engagement_quality ?? 0;

  const newPostsCount = existingPostsCount + 1;
  const newTotalEngagement = existingTotalEngagement + data.normalized.total_engagement;
  
  // Running average of engagement quality
  const newAvgQuality = 
    (existingAvgQuality * existingPostsCount + data.normalized.engagement_quality) / newPostsCount;

  // Engagement stability based on variance (stub for now)
  const engagementStability: 'low' | 'medium' | 'high' | 'unknown' = 
    newPostsCount >= 10 ? 'medium' : 'unknown';

  return {
    author_id: data.author_id,
    handle: data.handle,
    
    // Stub values for followers (would come from Twitter API)
    followers: existingProfile?.followers ?? 0,
    follower_growth_30d: existingProfile?.follower_growth_30d ?? 0,
    
    activity: {
      posts_count: newPostsCount,
      posts_per_day: 0, // Would need time window calculation
      total_engagement: newTotalEngagement,
      avg_engagement_quality: Math.round(newAvgQuality * 10000) / 10000,
      engagement_stability: engagementStability,
      volatility: 'unknown',
    },
    
    engagement: {
      real_views_estimate: data.metrics.views ?? data.normalized.total_engagement * 10,
      engagement_quality: data.normalized.engagement_quality,
    },
    
    network: {
      network_purity_score: 0,        // Stub: would analyze follower quality
      audience_overlap_score: 0,      // Calculated via compare endpoint
      artificial_engagement_score: 0, // Stub: would detect bot engagement
    },
    
    scores: {
      influence_score: Math.round(influenceScore * 10) / 10,
      risk_level: riskLevel,
      red_flags: redFlags,
    },
    
    updated_at: new Date().toISOString(),
  };
}
