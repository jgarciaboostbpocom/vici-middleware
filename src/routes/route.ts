import { Router } from 'express';
import { requireRouteEngineAuth } from '../auth/routeAuth';
import { config } from '../config';
import { handleRouteFallback } from '../routeEngine/fallback';
import { handleInboundRoute } from '../routeEngine/inbound';
import { handleOutboundRoute } from '../routeEngine/outbound';
import { handleRouteResult } from '../routeEngine/result';
import { collectRouteDiagnostics } from '../routeEngine/diagnostics';
import { handleRouteSimulation } from '../routeEngine/simulator';
import { listRecentRouteLogs } from '../storage/routeStore';

export const routeRouter = Router();

routeRouter.get('/health/route-engine', requireRouteEngineAuth, async (_req, res) => {
  const recent = await listRecentRouteLogs(25);
  res.json({
    ok: true,
    mode: config.routeEngine.mode,
    tokenConfigured: !!config.routeEngine.token,
    shadowOnly: true,
    liveVicidialWrites: false,
    recentRouteEvents: recent.length,
    now: new Date().toISOString(),
  });
});

routeRouter.get('/health/fastagi', requireRouteEngineAuth, (_req, res) => {
  res.json({
    ok: true,
    enabled: config.fastagi.enabled,
    host: config.fastagi.host,
    port: config.fastagi.port,
    timeoutMs: config.fastagi.timeoutMs,
    routeEngineMode: config.routeEngine.mode,
    now: new Date().toISOString(),
  });
});

routeRouter.get('/route/diagnostics', requireRouteEngineAuth, async (_req, res) => {
  res.json(await collectRouteDiagnostics());
});

routeRouter.post('/route/outbound', requireRouteEngineAuth, async (req, res) => {
  res.json(await handleOutboundRoute(req.body));
});

routeRouter.post('/route/simulate', requireRouteEngineAuth, async (req, res) => {
  res.json(await handleRouteSimulation(req.body));
});

routeRouter.post('/route/inbound', requireRouteEngineAuth, async (req, res) => {
  res.json(await handleInboundRoute(req.body));
});

routeRouter.post('/route/result', requireRouteEngineAuth, async (req, res) => {
  res.json(await handleRouteResult(req.body));
});

routeRouter.post('/route/fallback', requireRouteEngineAuth, async (req, res) => {
  res.json(await handleRouteFallback(req.body));
});
