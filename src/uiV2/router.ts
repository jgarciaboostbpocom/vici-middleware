import { Router, Request, Response } from 'express';
import { readRecentEvents, aggregateDidUsage } from './uiEvents';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, uiV2: !!process.env.UI_V2_ENABLED });
});

router.get('/events', (req: Request, res: Response) => {
  const sinceTs = Number(req.query.since || 0);
  const limit = Math.min(Number(req.query.limit || 200), 1000);
  const filter = {
    did: (req.query.did as string) || undefined,
    state: (req.query.state as string) || undefined,
    phone: (req.query.phone as string) || undefined,
  };
  const items = readRecentEvents({ sinceTs, limit, filter });
  res.json({ items, now: Date.now() });
});

router.get('/dids/usage', (_req: Request, res: Response) => {
  res.json({ items: aggregateDidUsage() });
});

export default router;
