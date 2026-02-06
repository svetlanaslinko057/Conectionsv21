/**
 * Minimal App - Only Connections module + Admin auth
 * 
 * This is a simplified version for development.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { AppError } from './common/errors.js';

export function buildMinimalApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
    trustProxy: true,
  });

  // CORS
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Global error handler
  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);

    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        ok: false,
        error: err.code,
        message: err.message,
      });
    }

    const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
    return reply.status(statusCode).send({
      ok: false,
      error: 'INTERNAL_ERROR',
      message: err.message,
    });
  });

  // Not found handler
  app.setNotFoundHandler((_req, reply) => {
    reply.status(404).send({
      ok: false,
      error: 'NOT_FOUND',
      message: 'Route not found',
    });
  });

  // Health check
  app.get('/api/health', async () => {
    return { ok: true, service: 'fomo-backend', mode: 'minimal' };
  });

  // Register Admin Auth
  app.register(async (fastify) => {
    console.log('[BOOT] Registering admin auth...');
    const { adminAuthRoutes } = await import('./core/admin/admin.auth.routes.js');
    await adminAuthRoutes(fastify);
    console.log('[BOOT] Admin auth registered');
  }, { prefix: '/api/admin' });

  // Register Admin Connections Control Plane
  app.register(async (fastify) => {
    console.log('[BOOT] Registering admin connections...');
    const { adminConnectionsRoutes } = await import('./core/admin/admin.connections.routes.js');
    await adminConnectionsRoutes(fastify);
    console.log('[BOOT] Admin connections registered');
  }, { prefix: '/api/admin/connections' });

  // Register Connections Module
  app.register(async (fastify) => {
    console.log('[BOOT] Registering connections module...');
    try {
      const { initConnectionsModule } = await import('./modules/connections/index.js');
      await initConnectionsModule(fastify);
      console.log('[BOOT] Connections module registered');
    } catch (err) {
      console.error('[BOOT] Failed to register connections module:', err);
    }
  });

  return app;
}
