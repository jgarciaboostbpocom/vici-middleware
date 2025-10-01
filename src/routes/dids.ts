import { Router } from 'express';
import {
  addDid, getItems, removeDid, setDidState,
  getActiveDidForState, setActiveDidForState, getStates
} from '../storage/dids';
import { memory } from '../storage/memory';

export const didsRouter = Router();

didsRouter.get('/', async (_req, res) => {
  const items = await getItems();
  const states = await getStates();
  const active: Record<string,string|null> = {};
  for (const st of states) active[st] = await getActiveDidForState(st);
  res.json({ items, active });
});

didsRouter.post('/', async (req, res) => {
  const did = `${req.body?.did || ''}`.trim();
  const state = `${req.body?.state || 'UNASSIGNED'}`.trim().toUpperCase();
  if (!did) return res.status(400).json({ ok: false, error: 'missing did' });
  await addDid(did, state);
  res.json({ ok: true });
});

didsRouter.post('/state', async (req, res) => {
  const did = `${req.body?.did || ''}`.trim();
  const state = `${req.body?.state || ''}`.trim().toUpperCase();
  if (!did || !state) return res.status(400).json({ ok: false, error: 'missing did/state' });
  await setDidState(did, state);
  res.json({ ok: true });
});

didsRouter.delete('/:did', async (req, res) => {
  await removeDid(req.params.did);
  res.json({ ok: true });
});

didsRouter.post('/active', async (req, res) => {
  const state = `${req.body?.state || ''}`.trim().toUpperCase();
  const did = `${req.body?.did || ''}`.trim();
  if (!state || !did) return res.status(400).json({ ok: false, error: 'missing state/did' });
  await setActiveDidForState(state, did);
  memory.setActiveDid(state, did);
  res.json({ ok: true, state, activeDid: did });
});
