import express from 'express';
import path from 'path';
import { config } from './config';
import { healthRouter } from './routes/health';
import { adminRouter } from './routes/admin';
import { didsRouter } from './routes/dids';
import { eventsRouter } from './routes/events';
import { importRouter } from './routes/import';
import { logger } from './logger';

const app = express();
app.use(express.json());

// Admin token auth (header: x-admin-token)
const adminAuth = (req: any, res: any, next: any) => {
  if (!config.adminToken) return next();
  const tok = req.headers['x-admin-token'];
  if (tok === config.adminToken) return next();
  return res.status(401).json({ ok: false, error: 'unauthorized' });
};

// APIs
app.use('/health', healthRouter);
app.use('/admin', adminAuth, adminRouter);
app.use('/admin/dids', adminAuth, didsRouter);
app.use('/admin/events', adminAuth, eventsRouter);
app.use('/admin/import', adminAuth, importRouter);

// Serve admin UI
const ADMIN_HTML = '/opt/vici-mw/public/admin.html';
app.get('/', (_req, res) => res.sendFile(ADMIN_HTML));
app.use('/static', express.static(path.join('/opt/vici-mw', 'public')));

app.listen(config.port, () => logger.info({ port: config.port }, 'Middleware listening'));
