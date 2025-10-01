import { Router } from 'express';
import { rotateStateIfNeeded, rotateAllStatesIfNeeded, forceRotateState } from '../logic/didRotation';

export const adminRouter = Router();

adminRouter.post('/rotate/check', async (req, res) => {
  const state = (req.query.state as string) || (req.body?.state as string);
  try {
    if (state) return res.json(await rotateStateIfNeeded(state.toUpperCase()));
    return res.json(await rotateAllStatesIfNeeded());
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

adminRouter.post('/rotate/force', async (req, res) => {
  const state = ((req.query.state as string) || (req.body?.state as string) || '').toUpperCase();
  if (!state) return res.status(400).json({ ok: false, error: 'missing state' });
  try {
    return res.json(await forceRotateState(state));
  } catch (e:any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
