import { config } from '../config';
import { loadDidStore } from '../storage/dids';
import { listRouteLogsForDate, type RouteLogRecord } from '../storage/routeStore';

export type SafeRouteEvent = {
  created_at: string;
  route_id: string;
  source: string | null;
  direction: RouteLogRecord['direction'];
  campaign_id: string | null;
  client_id: string | null;
  destination_phone: string | null;
  selected_did: string | null;
  decision: RouteLogRecord['decision'];
  strategy: string | null;
  pool_type: string | null;
  candidate_count: number | null;
  reuse_blocked: boolean | null;
  reason: string | null;
};

function increment(map: Record<string, number>, key: string | null | undefined) {
  const normalized = key || '(missing)';
  map[normalized] = (map[normalized] || 0) + 1;
}

function enabledDisabled(value: boolean): 'enabled' | 'disabled' {
  return value ? 'enabled' : 'disabled';
}

export function maskLast4(value: string | number | null | undefined): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const last4 = digits.slice(-4).padStart(Math.min(4, digits.length), '*');
  return `***${last4}`;
}

export function maskPhoneLikeText(value: string | null | undefined): string | null {
  const text = String(value || '').trim();
  if (!text) return null;
  return text.replace(/\d{7,}/g, match => maskLast4(match) || '***');
}

function sourceFromRecord(record: RouteLogRecord): string | null {
  const direct = (record as RouteLogRecord & { source?: unknown }).source;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const raw = record.raw_request;
  if (raw && typeof raw === 'object') {
    const source = (raw as { source?: unknown }).source;
    if (typeof source === 'string' && source.trim()) return source.trim();
  }

  return null;
}

export function safeRouteEvent(record: RouteLogRecord): SafeRouteEvent {
  return {
    created_at: record.created_at,
    route_id: record.route_id,
    source: sourceFromRecord(record),
    direction: record.direction,
    campaign_id: record.campaign_id || null,
    client_id: record.client_id || null,
    destination_phone: maskLast4(record.destination_phone),
    selected_did: maskLast4(record.selected_did),
    decision: record.decision,
    strategy: record.strategy || null,
    pool_type: record.pool_type || null,
    candidate_count: typeof record.candidate_count === 'number' ? record.candidate_count : null,
    reuse_blocked: typeof record.reuse_blocked === 'boolean' ? record.reuse_blocked : null,
    reason: maskPhoneLikeText(record.reason),
  };
}

export async function collectRouteDiagnostics() {
  const [store, todayLogs] = await Promise.all([
    loadDidStore(),
    listRouteLogsForDate(),
  ]);

  const inventory = Object.values(store.inventory || {});
  const didsByCampaignId: Record<string, number> = {};
  const didsByClientId: Record<string, number> = {};
  const decisionCountsToday: Record<string, number> = {};

  for (const record of inventory) {
    increment(didsByCampaignId, record.campaignId);
    increment(didsByClientId, record.clientId);
  }

  for (const record of todayLogs) {
    increment(decisionCountsToday, record.decision);
  }

  const testCampCount = inventory.filter(record => record.campaignId === 'TESTCAMP').length;
  const didStore: Record<string, unknown> = {
    totalInventoryCount: inventory.length,
    didsByCampaignId,
    didsByClientId,
    missingCampaignIdCount: didsByCampaignId['(missing)'] || 0,
  };

  if (testCampCount > 0) {
    didStore.testCampCount = testCampCount;
  }

  return {
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
      unscopedDidFallback: enabledDisabled(config.routeEngine.allowUnscopedDidFallback),
      clientDidFallback: enabledDisabled(config.routeEngine.allowClientDidFallback),
      requireCampaignMatch: enabledDisabled(config.routeEngine.requireCampaignMatch),
    },
    didStore,
    recentRouteEvents: todayLogs.slice(-20).map(safeRouteEvent),
    decisionCountsToday,
  };
}
