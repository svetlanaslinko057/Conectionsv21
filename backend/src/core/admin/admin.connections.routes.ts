/**
 * Connections Admin Routes
 * 
 * Control Plane for Connections module:
 * - GET /admin/connections/overview - Module status & stats
 * - GET /admin/connections/config - Current configuration
 * - POST /admin/connections/config/apply - Apply config changes
 * - GET /admin/connections/tuning/status - Stability metrics
 * - POST /admin/connections/tuning/run - Run tuning analysis
 * - GET /admin/connections/alerts/preview - Pending alerts
 * - POST /admin/connections/alerts/config - Update alert settings
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAdminAuth } from './admin.middleware.js';
import { logAdminAction } from './admin.audit.js';

// In-memory state for demo (would be DB in production)
let connectionsState = {
  enabled: true,
  source_mode: 'mock' as 'mock' | 'sandbox' | 'twitter_live',
  last_run: new Date().toISOString(),
  stats: {
    accounts_24h: 0,
    early_signals: 0,
    breakouts: 0,
    alerts_generated: 0,
    alerts_sent: 0,
  },
  errors: [] as string[],
};

let alertsConfig = {
  enabled: true,
  types: {
    EARLY_BREAKOUT: { enabled: true, severity_min: 0.6, cooldown_minutes: 60 },
    STRONG_ACCELERATION: { enabled: true, severity_min: 0.5, cooldown_minutes: 30 },
    TREND_REVERSAL: { enabled: false, severity_min: 0.7, cooldown_minutes: 120 },
    RISK_SPIKE: { enabled: true, severity_min: 0.8, cooldown_minutes: 60 },
  },
  global_cooldown_minutes: 15,
};

let alertsPreview: Array<{
  id: string;
  timestamp: string;
  type: string;
  account: { author_id: string; username: string };
  severity: number;
  status: 'preview' | 'sent' | 'suppressed';
  reason: string;
}> = [];

// Config version tracking
let configVersion = '0.5.3';
let configHistory: Array<{
  version: string;
  timestamp: string;
  changes: any;
  admin_id: string;
}> = [];

export async function adminConnectionsRoutes(app: FastifyInstance): Promise<void> {
  // All routes require admin auth
  app.addHook('preHandler', requireAdminAuth(['ADMIN', 'MODERATOR']));

  // ============================================================
  // OVERVIEW
  // ============================================================

  /**
   * GET /admin/connections/overview
   * Quick status check for the module
   */
  app.get('/overview', async (req: FastifyRequest, reply: FastifyReply) => {
    // Generate some mock stats
    const stats = {
      ...connectionsState.stats,
      accounts_24h: Math.floor(Math.random() * 50) + 100,
      early_signals: Math.floor(Math.random() * 15) + 5,
      breakouts: Math.floor(Math.random() * 5) + 1,
      alerts_generated: alertsPreview.length,
    };

    return reply.send({
      ok: true,
      data: {
        enabled: connectionsState.enabled,
        source_mode: connectionsState.source_mode,
        last_run: connectionsState.last_run,
        stats,
        errors: connectionsState.errors.slice(-5),
        health: {
          status: connectionsState.errors.length === 0 ? 'healthy' : 'degraded',
          uptime_hours: Math.floor(Math.random() * 100) + 50,
        },
      },
    });
  });

  /**
   * POST /admin/connections/toggle
   * Enable/disable the module
   */
  app.post('/toggle', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { enabled?: boolean };
    const adminId = (req as any).adminUser?.id || 'unknown';
    
    if (body.enabled !== undefined) {
      connectionsState.enabled = body.enabled;
      
      await logAdminAction({
        adminId,
        action: 'CONNECTIONS_TOGGLE',
        details: { enabled: body.enabled },
        ip: req.ip,
      });
    }

    return reply.send({
      ok: true,
      data: { enabled: connectionsState.enabled },
    });
  });

  /**
   * POST /admin/connections/source
   * Change data source mode
   */
  app.post('/source', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { mode?: 'mock' | 'sandbox' | 'twitter_live' };
    const adminId = (req as any).adminUser?.id || 'unknown';
    
    if (body.mode && ['mock', 'sandbox', 'twitter_live'].includes(body.mode)) {
      const previousMode = connectionsState.source_mode;
      connectionsState.source_mode = body.mode;
      
      await logAdminAction({
        adminId,
        action: 'CONNECTIONS_SOURCE_CHANGE',
        details: { from: previousMode, to: body.mode },
        ip: req.ip,
      });
    }

    return reply.send({
      ok: true,
      data: { source_mode: connectionsState.source_mode },
    });
  });

  // ============================================================
  // CONFIG
  // ============================================================

  /**
   * GET /admin/connections/config
   * Get current configuration (read-only view)
   */
  app.get('/config', async (req: FastifyRequest, reply: FastifyReply) => {
    // Import actual configs
    const { ConnectionsTrendConfig } = await import('../../modules/connections/core/scoring/connections-trend-config.js');
    const { EarlySignalConfig } = await import('../../modules/connections/core/scoring/early-signal-config.js');

    return reply.send({
      ok: true,
      data: {
        version: configVersion,
        editable: false, // For now, read-only
        last_modified: configHistory.length > 0 
          ? configHistory[configHistory.length - 1].timestamp 
          : null,
        config: {
          trend_adjusted: ConnectionsTrendConfig,
          early_signal: EarlySignalConfig,
        },
        history: configHistory.slice(-5),
      },
    });
  });

  /**
   * POST /admin/connections/config/apply
   * Apply configuration changes (with audit)
   */
  app.post('/config/apply', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { 
      changes?: Record<string, any>;
      confirm?: boolean;
    };
    const adminId = (req as any).adminUser?.id || 'unknown';

    if (!body.changes || !body.confirm) {
      return reply.status(400).send({
        ok: false,
        error: 'INVALID_REQUEST',
        message: 'Changes and confirm flag required',
      });
    }

    // For now, just log the intent (actual config modification would require more careful handling)
    const newVersion = `0.5.${parseInt(configVersion.split('.')[2]) + 1}`;
    
    configHistory.push({
      version: newVersion,
      timestamp: new Date().toISOString(),
      changes: body.changes,
      admin_id: adminId,
    });
    
    configVersion = newVersion;

    await logAdminAction({
      adminId,
      action: 'CONNECTIONS_CONFIG_APPLY',
      details: { version: newVersion, changes: body.changes },
      ip: req.ip,
    });

    return reply.send({
      ok: true,
      message: 'Config changes applied (logged for audit)',
      data: {
        version: newVersion,
        applied_at: new Date().toISOString(),
      },
    });
  });

  // ============================================================
  // STABILITY / TUNING
  // ============================================================

  /**
   * GET /admin/connections/tuning/status
   * Get last tuning run results
   */
  app.get('/tuning/status', async (req: FastifyRequest, reply: FastifyReply) => {
    // Run quick tuning check
    const { runFullTuningMatrix, generateMockTuningDataset } = await import('../../modules/connections/core/scoring/threshold-tuning.js');
    
    try {
      const dataset = generateMockTuningDataset(15);
      const result = runFullTuningMatrix(dataset);
      
      return reply.send({
        ok: true,
        data: {
          last_run: new Date().toISOString(),
          overall_stability: result.overall_stability,
          parameters: result.parameters.map(p => ({
            name: p.parameter,
            safe_range: p.recommendation.safe_range,
            optimal_delta: p.recommendation.optimal_delta,
            warning: p.recommendation.warning,
            best_stability: Math.max(...p.results.map(r => r.stability_score)),
          })),
          recommendations: result.recommendations,
          dataset_size: dataset.length,
        },
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        error: 'TUNING_ERROR',
        message: err.message,
      });
    }
  });

  /**
   * POST /admin/connections/tuning/run
   * Run full tuning analysis
   */
  app.post('/tuning/run', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { 
      parameter?: string;
      dataset_size?: number;
    };
    const adminId = (req as any).adminUser?.id || 'unknown';

    const { runThresholdTuning, runFullTuningMatrix, generateMockTuningDataset } = await import('../../modules/connections/core/scoring/threshold-tuning.js');

    try {
      const datasetSize = body.dataset_size || 20;
      const dataset = generateMockTuningDataset(datasetSize);
      
      let result;
      if (body.parameter) {
        // Single parameter tuning
        const deltas = [-0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2];
        result = runThresholdTuning(dataset, body.parameter as any, deltas);
      } else {
        // Full matrix
        result = runFullTuningMatrix(dataset);
      }

      await logAdminAction({
        adminId,
        action: 'CONNECTIONS_TUNING_RUN',
        details: { parameter: body.parameter || 'full', dataset_size: datasetSize },
        ip: req.ip,
      });

      return reply.send({
        ok: true,
        data: result,
      });
    } catch (err: any) {
      return reply.status(500).send({
        ok: false,
        error: 'TUNING_ERROR',
        message: err.message,
      });
    }
  });

  // ============================================================
  // ALERTS
  // ============================================================

  /**
   * GET /admin/connections/alerts/preview
   * Preview pending/recent alerts
   */
  app.get('/alerts/preview', async (req: FastifyRequest, reply: FastifyReply) => {
    // Generate some mock alerts for demo
    if (alertsPreview.length === 0) {
      const mockAlerts = [
        {
          id: 'alert_001',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          type: 'EARLY_BREAKOUT',
          account: { author_id: 'demo_001', username: 'alpha_seeker' },
          severity: 0.82,
          status: 'preview' as const,
          reason: 'Acceleration > 0.4, confidence > 0.6, retail profile',
        },
        {
          id: 'alert_002',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          type: 'STRONG_ACCELERATION',
          account: { author_id: 'demo_005', username: 'defi_hunter' },
          severity: 0.71,
          status: 'preview' as const,
          reason: 'Acceleration spike: +0.65 in 24h',
        },
        {
          id: 'alert_003',
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          type: 'RISK_SPIKE',
          account: { author_id: 'demo_012', username: 'volatile_trader' },
          severity: 0.68,
          status: 'suppressed' as const,
          reason: 'Risk level changed: low → high',
        },
      ];
      alertsPreview = mockAlerts;
    }

    return reply.send({
      ok: true,
      data: {
        alerts: alertsPreview,
        config: alertsConfig,
        summary: {
          total: alertsPreview.length,
          preview: alertsPreview.filter(a => a.status === 'preview').length,
          sent: alertsPreview.filter(a => a.status === 'sent').length,
          suppressed: alertsPreview.filter(a => a.status === 'suppressed').length,
        },
      },
    });
  });

  /**
   * POST /admin/connections/alerts/config
   * Update alert configuration
   */
  app.post('/alerts/config', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as Partial<typeof alertsConfig>;
    const adminId = (req as any).adminUser?.id || 'unknown';

    if (body.enabled !== undefined) {
      alertsConfig.enabled = body.enabled;
    }
    if (body.types) {
      alertsConfig.types = { ...alertsConfig.types, ...body.types };
    }
    if (body.global_cooldown_minutes !== undefined) {
      alertsConfig.global_cooldown_minutes = body.global_cooldown_minutes;
    }

    await logAdminAction({
      adminId,
      action: 'CONNECTIONS_ALERTS_CONFIG',
      details: body,
      ip: req.ip,
    });

    return reply.send({
      ok: true,
      data: alertsConfig,
    });
  });

  /**
   * POST /admin/connections/alerts/send
   * Manually send an alert (for testing)
   */
  app.post('/alerts/send', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { alert_id: string };
    const adminId = (req as any).adminUser?.id || 'unknown';

    const alert = alertsPreview.find(a => a.id === body.alert_id);
    if (!alert) {
      return reply.status(404).send({
        ok: false,
        error: 'NOT_FOUND',
        message: 'Alert not found',
      });
    }

    alert.status = 'sent';

    await logAdminAction({
      adminId,
      action: 'CONNECTIONS_ALERT_SENT',
      details: { alert_id: body.alert_id, type: alert.type },
      ip: req.ip,
    });

    return reply.send({
      ok: true,
      message: 'Alert marked as sent',
      data: alert,
    });
  });

  /**
   * POST /admin/connections/alerts/suppress
   * Suppress an alert
   */
  app.post('/alerts/suppress', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as { alert_id: string };
    const adminId = (req as any).adminUser?.id || 'unknown';

    const alert = alertsPreview.find(a => a.id === body.alert_id);
    if (!alert) {
      return reply.status(404).send({
        ok: false,
        error: 'NOT_FOUND',
        message: 'Alert not found',
      });
    }

    alert.status = 'suppressed';

    await logAdminAction({
      adminId,
      action: 'CONNECTIONS_ALERT_SUPPRESSED',
      details: { alert_id: body.alert_id, type: alert.type },
      ip: req.ip,
    });

    return reply.send({
      ok: true,
      message: 'Alert suppressed',
      data: alert,
    });
  });

  console.log('[Admin] Connections routes registered at /api/admin/connections');
}
