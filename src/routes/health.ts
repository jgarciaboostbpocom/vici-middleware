import { Router } from 'express';
import { memory } from '../storage/memory';

export const healthRouter = Router();
healthRouter.get('/', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString(), metrics: memory.snapshot() });
});
