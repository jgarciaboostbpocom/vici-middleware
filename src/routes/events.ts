import { Router } from 'express';
import { getEvents } from '../storage/events';
export const eventsRouter = Router();
eventsRouter.get('/', async (req, res) => {
  const limit = Number(req.query.limit || 200);
  res.json({ events: await getEvents(limit) });
});
