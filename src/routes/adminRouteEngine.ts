import { Router } from 'express';
import { authUserFromRequest } from '../auth/middleware';
import { config } from '../config';
import { safeRouteEvent } from '../routeEngine/diagnostics';
import { handleRouteSimulation } from '../routeEngine/simulator';
import { loadDidStore, type DidRecord } from '../storage/dids';
import { listRouteLogsForDate, type RouteLogRecord } from '../storage/routeStore';
import {
  getCampaignById,
  userCanAccessCampaign,
  userCanAccessClient,
  type ScopedUser,
} from '../storage/tenants';

export const adminRouteEngineRouter = Router();

adminRouteEngineRouter.get('/summary', async (req, res) => {
  try {
    const actor = authUserFromRequest(req);
    if (!actor) return res.status(401).json({ ok: false, error: 'authentication required' });

    const [store, todayLogs] = await Promise.all([
      loadDidStore(),
      listRouteLogsForDate(),
    ]);

    const inventory = Object.values(store.inventory || {});
    const scopedInventory = await filterDidsForUser(actor.user, inventory);
    const scopedLogs = await filterLogsForUser(actor.user, todayLogs);
    const didsByCampaignId: Record<string, number> = {};
    const didsByClientId: Record<string, number> = {};
    const decisionCountsToday: Record<string, number> = {};

    for (const record of scopedInventory) {
      increment(didsByCampaignId, record.campaignId);
      increment(didsByClientId, record.clientId);
    }
    for (const record of scopedLogs) {
      increment(decisionCountsToday, record.decision);
    }

    res.json({
      ok: true,
      now: new Date().toISOString(),
      routeEngineMode: config.routeEngine.mode,
      fastagi: {
        enabled: config.fastagi.enabled,
        host: config.fastagi.host,
        port: config.fastagi.port,
        timeoutMs: config.fastagi.timeoutMs,
      },
      safety: {
        shadowOnly: true,
        liveVicidialWrites: false,
        rawRouteTokenExposed: false,
      },
      didStore: {
        totalInventoryCount: scopedInventory.length,
        didsByCampaignId,
        didsByClientId,
        missingCampaignIdCount: didsByCampaignId['(missing)'] || 0,
        testCampCount: scopedInventory.filter(record => record.campaignId === 'TESTCAMP').length,
      },
      recentRouteEvents: scopedLogs.slice(-20).map(safeRouteEvent),
      decisionCountsToday,
      actor: actorPayload(actor.user),
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

adminRouteEngineRouter.post('/simulate', async (req, res) => {
  try {
    const actor = authUserFromRequest(req);
    if (!actor) return res.status(401).json({ ok: false, error: 'authentication required' });

    const scope = await validateSimulationScope(actor.user, req.body || {});
    if (!scope.ok) return res.status(scope.status).json({ ok: false, error: scope.error });

    const response = await handleRouteSimulation({
      campaign_id: optionalString(req.body?.campaign_id),
      client_id: optionalString(req.body?.client_id),
      destination_phone: optionalString(req.body?.destination_phone),
      lead_state: optionalString(req.body?.lead_state),
      lead_id: optionalScalar(req.body?.lead_id),
      list_id: optionalScalar(req.body?.list_id),
      agent_id: optionalString(req.body?.agent_id),
      call_type: optionalString(req.body?.call_type) || 'manual',
      include_raw: false,
    });

    res.json({
      ...response,
      admin: {
        actor: actorPayload(actor.user),
        requestedClientId: scope.clientId,
        requestedCampaignId: scope.campaignId,
        routeTokenExposed: false,
        rawModeAllowed: false,
      },
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

function increment(map: Record<string, number>, key: string | null | undefined) {
  const normalized = key || '(missing)';
  map[normalized] = (map[normalized] || 0) + 1;
}

async function filterDidsForUser(user: ScopedUser, records: DidRecord[]): Promise<DidRecord[]> {
  if (user.role === 'super_admin') return records;
  const out: DidRecord[] = [];
  for (const record of records) {
    if (record.campaignId && await userCanAccessCampaign(user, record.campaignId)) {
      out.push(record);
      continue;
    }
    if (record.clientId && userCanAccessClient(user, record.clientId)) {
      out.push(record);
    }
  }
  return out;
}

async function filterLogsForUser(user: ScopedUser, records: RouteLogRecord[]): Promise<RouteLogRecord[]> {
  if (user.role === 'super_admin') return records;
  const out: RouteLogRecord[] = [];
  for (const record of records) {
    if (record.campaign_id && await userCanAccessCampaign(user, record.campaign_id)) {
      out.push(record);
      continue;
    }
    if (record.client_id && userCanAccessClient(user, record.client_id)) {
      out.push(record);
    }
  }
  return out;
}

async function validateSimulationScope(user: ScopedUser, body: Record<string, unknown>): Promise<
  | { ok: true; clientId: string | null; campaignId: string | null }
  | { ok: false; status: number; error: string }
> {
  const clientId = optionalString(body.client_id) || null;
  const campaignId = optionalString(body.campaign_id) || null;
  const campaign = campaignId ? await getCampaignById(campaignId) : null;
  const derivedClientId = clientId || campaign?.clientId || null;

  if (campaignId && campaign && clientId && campaign.clientId !== clientId) {
    return { ok: false, status: 400, error: 'campaign_id does not belong to client_id' };
  }

  if (user.role === 'super_admin') {
    return { ok: true, clientId: derivedClientId, campaignId };
  }

  if (!campaignId && !clientId) {
    return { ok: false, status: 403, error: 'client_id or campaign_id scope is required' };
  }

  if (campaignId) {
    if (!campaign) return { ok: false, status: 403, error: 'campaign scope required' };
    if (await userCanAccessCampaign(user, campaignId) || userCanAccessClient(user, campaign.clientId)) {
      return { ok: true, clientId: campaign.clientId, campaignId };
    }
    return { ok: false, status: 403, error: 'campaign scope required' };
  }

  if (clientId && userCanAccessClient(user, clientId)) {
    return { ok: true, clientId, campaignId: null };
  }

  return { ok: false, status: 403, error: 'client scope required' };
}

function optionalString(value: unknown): string | undefined {
  const normalized = String(value || '').trim();
  return normalized || undefined;
}

function optionalScalar(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return optionalString(value);
}

function actorPayload(user: ScopedUser) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    active: user.active,
  };
}
