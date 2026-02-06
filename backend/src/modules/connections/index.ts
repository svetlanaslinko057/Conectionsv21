/**
 * Connections Module - Main Entry
 * 
 * Provides:
 * - Author/Influencer profiling
 * - Influence scoring (v0)
 * - Risk detection
 * 
 * Does NOT:
 * - Touch Twitter Parser
 * - Touch Sentiment
 * - Modify TwitterPost contract
 */

import type { FastifyInstance } from 'fastify';
import { registerConnectionsRoutes } from './api/routes.js';
import { connectionsAdminConfig } from './admin/connections-admin.js';

export async function initConnectionsModule(app: FastifyInstance): Promise<void> {
  if (!connectionsAdminConfig.enabled) {
    console.log('[Connections] Module DISABLED via config');
    return;
  }

  // Register API routes with prefix
  await app.register(
    async (instance) => {
      await registerConnectionsRoutes(instance);
    },
    { prefix: '/api/connections' }
  );

  console.log('[Connections] Module initialized');
  console.log('[Connections] API available at /api/connections/*');
}

// Export core function for aggregation layer
export { processTwitterPostForConnections } from './core/index.js';
export { connectionsAdminConfig, updateConnectionsConfig } from './admin/connections-admin.js';
export type { AuthorProfile } from './core/scoring/compute-influence-score.js';
