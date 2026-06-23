import opsRouter from "./routes/ops";
import adminAlias from './routes/admin.alias';
import { mountUIv2 } from './uiV2/mount';
import express from 'express';
import stats from './routes/stats';
import path from 'path';
import { config } from './config';
import { healthRouter } from './routes/health';
import { adminRouter } from './routes/admin';
import { adminV2Router } from './routes/adminV2';
import { adminRouteEngineRouter } from './routes/adminRouteEngine';
import { didsRouter } from './routes/dids';
import { eventsRouter } from './routes/events';
import { importRouter } from './routes/import';
import { logger } from './logger';
import { requireUserAuth } from './auth/middleware';
import { routeRouter } from './routes/route';
import { startFastAgiShadowServer } from './fastagi/shadowServer';

const app = express();
import callsAC from './routes/calls_ac';
app.use('/api/ops', callsAC);   // <-- mount first so it wins for /api/ops/calls/today
app.use('/api/ops', opsRouter); // mounts /api/ops/* and /ui-v2/* routes so the UI works
app.use(express.json());
app.use(routeRouter);
app.use('/api', stats);
app.use('/api', adminAlias);

// Session auth with temporary x-admin-token fallback.
const adminAuth = requireUserAuth({
  publicPaths: ['/auth/login', '/auth/bootstrap-super-admin'],
});

// APIs
app.use('/health', healthRouter);
app.use('/admin/v2/route-engine', adminAuth, adminRouteEngineRouter);
app.use('/admin/v2', adminAuth, adminV2Router);
app.use('/admin', adminAuth, adminRouter);
app.use('/admin/dids', adminAuth, didsRouter);
app.use('/admin/events', adminAuth, eventsRouter);
app.use('/admin/import', adminAuth, importRouter);

// Serve admin UI
const ADMIN_HTML = '/opt/vici-mw/public/admin.html';
app.get('/', (_req, res) => res.sendFile(ADMIN_HTML));
app.use('/static', express.static(path.join('/opt/vici-mw', 'public')));

mountUIv2(app);
startFastAgiShadowServer();
app.listen(config.port, () => logger.info({ port: config.port }, 'Middleware listening'));
