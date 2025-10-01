import path from 'path';
import express from 'express';
import uiRouter from './router';

export function mountUIv2(app: express.Express) {
  try {
    const enabled = String(process.env.UI_V2_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) return;
    app.use('/api/ui-v2', uiRouter);
    const uiPath = process.env.UI_V2_PATH || '/ui-v2';
    const staticDir = path.join(__dirname, '../public/ui-v2');
    app.use(uiPath, express.static(staticDir));
    console.log('[ui-v2] mounted at', uiPath, 'dir:', staticDir);
  } catch (_err) {
    console.warn('[ui-v2] mount skipped');
  }
}
