import mysql from 'mysql2/promise';
import { config } from '../config';
import { normalizeLeadPhone } from '../logic/didSelection';
import { appendRouteLog, listRecentRouteLogs, type RouteLogRecord } from './routeStore';

export type ReuseScopeType = 'client' | 'campaign' | 'global';

export type RouteDecisionInput = RouteLogRecord & {
  mode?: string | null;
  call_type?: string | null;
  asterisk_uniqueid?: string | null;
};

export type RouteResultInput = {
  route_id?: string | null;
  request_id?: string | null;
  asterisk_uniqueid?: string | null;
  linkedid?: string | null;
  result?: string | null;
  status?: string | null;
  duration_sec?: number | null;
  hangup_cause?: string | number | null;
  raw_result: unknown;
};

export type DidReuseLookup = {
  did: string;
  normalizedDestinationPhone: string;
  serviceDate: string;
  reuseScope: ReuseScopeType;
  scopeId: string;
  clientId?: string | null;
};

export type DidReservationInput = DidReuseLookup & {
  reservationId: string;
  routeId: string;
  requestId?: string | null;
  campaignId?: string | null;
  leadId?: string | number | null;
  agentId?: string | null;
  listId?: string | number | null;
  callType?: string | null;
  asteriskUniqueid?: string | null;
  reservationStatus?: 'reserved' | 'used' | 'released' | 'expired' | 'failed';
  expiresAt?: string | null;
};

export type DidReservationResult = {
  reserved: boolean;
  duplicate: boolean;
  durable: boolean;
  reason?: string;
};

let pool: mysql.Pool | null = null;

function dbConfigured(): boolean {
  const db = config.routeEngine.db;
  return !!(db.host && db.user && db.database);
}

function getRoutePool(): mysql.Pool | null {
  if (!dbConfigured()) return null;
  if (!pool) {
    const db = config.routeEngine.db;
    pool = mysql.createPool({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return pool;
}

export async function createRouteDecision(record: RouteDecisionInput): Promise<RouteLogRecord> {
  const routePool = getRoutePool();
  if (!routePool) return appendRouteLog(record);

  try {
    await routePool.execute(
      `INSERT INTO route_decisions (
        route_id, request_id, direction, decision, route_engine_mode,
        campaign_id, client_id, lead_id, agent_id, list_id, call_type,
        destination_phone, normalized_destination_phone, called_did, dnis,
        selected_did, strategy, fallback_used, reason, reuse_scope,
        service_date, reuse_blocked, reuse_reason, asterisk_uniqueid,
        raw_request, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
      [
        record.route_id,
        record.request_id || null,
        record.direction,
        record.decision,
        record.mode || config.routeEngine.mode,
        record.campaign_id || null,
        record.client_id || null,
        stringifyNullable(record.lead_id),
        record.agent_id || null,
        stringifyNullable(record.list_id),
        record.call_type || null,
        record.destination_phone || null,
        record.destination_phone ? normalizeLeadPhone(record.destination_phone) : null,
        record.called_did || null,
        record.dnis || null,
        record.selected_did || null,
        record.strategy || null,
        record.fallback_used ? 1 : 0,
        record.reason || null,
        record.reuse_scope || null,
        record.service_date || null,
        record.reuse_blocked ? 1 : 0,
        record.reuse_reason || null,
        record.asterisk_uniqueid || null,
        JSON.stringify({
          ...(typeof record.raw_request === 'object' && record.raw_request !== null ? record.raw_request as Record<string, unknown> : { value: record.raw_request }),
          route_engine_metadata: {
            campaign_match_type: record.campaign_match_type || null,
            campaign_match_confidence: record.campaign_match_confidence || null,
            pool_type: record.pool_type || null,
            candidate_count: record.candidate_count ?? null,
            resolver_warnings: record.resolver_warnings || [],
          },
        }),
        mysqlDateTime(record.created_at),
      ],
    );
    return record;
  } catch {
    return appendRouteLog(record);
  }
}

export async function appendRouteResult(input: RouteResultInput): Promise<void> {
  const routePool = getRoutePool();
  if (!routePool) {
    await appendRouteLog({
      route_id: input.route_id || `result_${Date.now()}`,
      request_id: input.request_id || input.asterisk_uniqueid || null,
      direction: 'result',
      decision: 'selected',
      reason: input.result || input.status || 'route result received',
      created_at: new Date().toISOString(),
      raw_request: input.raw_result,
    });
    return;
  }

  try {
    await routePool.execute(
      `INSERT INTO route_results (
        route_id, request_id, asterisk_uniqueid, linkedid, result,
        status, duration_sec, hangup_cause, raw_result, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
      [
        input.route_id || null,
        input.request_id || null,
        input.asterisk_uniqueid || null,
        input.linkedid || null,
        input.result || null,
        input.status || null,
        Number.isFinite(input.duration_sec) ? input.duration_sec : null,
        stringifyNullable(input.hangup_cause),
        JSON.stringify(input.raw_result ?? null),
        mysqlDateTime(new Date().toISOString()),
      ],
    );
  } catch {
    await appendRouteLog({
      route_id: input.route_id || `result_${Date.now()}`,
      request_id: input.request_id || input.asterisk_uniqueid || null,
      direction: 'result',
      decision: 'selected',
      reason: input.result || input.status || 'route result received',
      created_at: new Date().toISOString(),
      raw_request: input.raw_result,
    });
  }
}

export async function hasDidBeenUsedForDestinationToday(input: DidReuseLookup): Promise<boolean> {
  const routePool = getRoutePool();
  if (!routePool) return hasDidBeenUsedInNdjson(input);

  try {
    const [rows] = await routePool.execute(
      `SELECT id
         FROM did_destination_usage
        WHERE reuse_scope = ?
          AND scope_id = ?
          AND normalized_destination_phone = ?
          AND did = ?
          AND service_date = ?
        LIMIT 1`,
      [input.reuseScope, input.scopeId, input.normalizedDestinationPhone, input.did, input.serviceDate],
    );
    return (rows as unknown[]).length > 0;
  } catch {
    return hasDidBeenUsedInNdjson(input);
  }
}

export async function reserveDidForDestination(input: DidReservationInput): Promise<DidReservationResult> {
  const routePool = getRoutePool();
  if (!routePool) {
    await appendRouteLog({
      route_id: input.routeId,
      request_id: input.requestId || null,
      direction: 'fallback',
      campaign_id: input.campaignId || null,
      client_id: input.clientId || null,
      lead_id: input.leadId,
      agent_id: input.agentId || null,
      list_id: input.listId,
      destination_phone: input.normalizedDestinationPhone,
      selected_did: input.did,
      decision: 'fallback',
      reason: 'durable DB not configured; reservation was not created',
      reuse_scope: input.reuseScope,
      service_date: input.serviceDate,
      reuse_blocked: false,
      created_at: new Date().toISOString(),
      raw_request: input,
    });
    return { reserved: false, duplicate: false, durable: false, reason: 'durable DB not configured' };
  }

  const conn = await routePool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO did_reservations (
        reservation_id, route_id, request_id, campaign_id, client_id,
        lead_id, agent_id, list_id, call_type, destination_phone,
        normalized_destination_phone, did, reuse_scope, scope_id,
        service_date, asterisk_uniqueid, reservation_status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.reservationId,
        input.routeId,
        input.requestId || null,
        input.campaignId || null,
        input.clientId || null,
        stringifyNullable(input.leadId),
        input.agentId || null,
        stringifyNullable(input.listId),
        input.callType || null,
        input.normalizedDestinationPhone,
        input.normalizedDestinationPhone,
        input.did,
        input.reuseScope,
        input.scopeId,
        input.serviceDate,
        input.asteriskUniqueid || null,
        input.reservationStatus || 'reserved',
        input.expiresAt ? mysqlDateTime(input.expiresAt) : null,
      ],
    );
    await conn.execute(
      `INSERT INTO did_destination_usage (
        route_id, reservation_id, campaign_id, client_id, lead_id,
        agent_id, call_type, normalized_destination_phone, did,
        reuse_scope, scope_id, service_date, asterisk_uniqueid,
        reservation_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.routeId,
        input.reservationId,
        input.campaignId || null,
        input.clientId || '__unscoped__',
        stringifyNullable(input.leadId),
        input.agentId || null,
        input.callType || null,
        input.normalizedDestinationPhone,
        input.did,
        input.reuseScope,
        input.scopeId,
        input.serviceDate,
        input.asteriskUniqueid || null,
        input.reservationStatus || 'reserved',
      ],
    );
    await conn.commit();
    return { reserved: true, duplicate: false, durable: true };
  } catch (err: any) {
    await conn.rollback();
    if (err?.code === 'ER_DUP_ENTRY') {
      return { reserved: false, duplicate: true, durable: true, reason: 'DID already used for destination/scope/service_date' };
    }
    await appendRouteLog({
      route_id: input.routeId,
      request_id: input.requestId || null,
      direction: 'fallback',
      campaign_id: input.campaignId || null,
      client_id: input.clientId || null,
      lead_id: input.leadId,
      agent_id: input.agentId || null,
      list_id: input.listId,
      destination_phone: input.normalizedDestinationPhone,
      selected_did: input.did,
      decision: 'fallback',
      reason: err?.message || 'durable reservation failed; fell back to NDJSON event',
      reuse_scope: input.reuseScope,
      service_date: input.serviceDate,
      reuse_blocked: false,
      created_at: new Date().toISOString(),
      raw_request: input,
    });
    return { reserved: false, duplicate: false, durable: false, reason: err?.message || 'durable reservation failed' };
  } finally {
    conn.release();
  }
}

export async function listRecentRouteDecisions(limit = 100): Promise<RouteLogRecord[]> {
  const routePool = getRoutePool();
  if (!routePool) return listRecentRouteLogs(limit);

  try {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 1000));
    const [rows] = await routePool.query(
      `SELECT route_id, request_id, direction, campaign_id, client_id,
              lead_id, agent_id, list_id, destination_phone, called_did,
              dnis, selected_did, decision, strategy, fallback_used,
              reason, reuse_scope, service_date, reuse_blocked,
              reuse_reason, created_at, raw_request
         FROM route_decisions
        ORDER BY created_at DESC
        LIMIT ${safeLimit}`,
    );
    return (rows as any[]).map(row => ({
      route_id: String(row.route_id),
      request_id: row.request_id,
      direction: row.direction,
      campaign_id: row.campaign_id,
      client_id: row.client_id,
      lead_id: row.lead_id,
      agent_id: row.agent_id,
      list_id: row.list_id,
      destination_phone: row.destination_phone,
      called_did: row.called_did,
      dnis: row.dnis,
      selected_did: row.selected_did,
      decision: row.decision,
      strategy: row.strategy,
      fallback_used: Boolean(row.fallback_used),
      reason: row.reason,
      reuse_scope: row.reuse_scope,
      service_date: row.service_date instanceof Date ? row.service_date.toISOString().slice(0, 10) : row.service_date,
      reuse_blocked: Boolean(row.reuse_blocked),
      reuse_reason: row.reuse_reason,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      raw_request: row.raw_request,
    }));
  } catch {
    return listRecentRouteLogs(limit);
  }
}

async function hasDidBeenUsedInNdjson(input: DidReuseLookup): Promise<boolean> {
  const rows = await listRecentRouteLogs(1000);
  return rows.some(row => {
    const rowScope = row.reuse_scope || 'client';
    const rowServiceDate = row.service_date || row.created_at.slice(0, 10);
    const rowPhone = row.destination_phone ? normalizeLeadPhone(row.destination_phone) : '';
    const rowScopeId = rowScope === 'global'
      ? 'global'
      : rowScope === 'campaign'
        ? row.campaign_id || '__unscoped__'
        : row.client_id || '__unscoped__';
    return row.direction === 'outbound'
      && row.selected_did === input.did
      && rowPhone === input.normalizedDestinationPhone
      && rowServiceDate === input.serviceDate
      && rowScope === input.reuseScope
      && rowScopeId === input.scopeId;
  });
}

function mysqlDateTime(iso: string): string {
  const date = new Date(iso);
  const safe = Number.isFinite(date.getTime()) ? date : new Date();
  return safe.toISOString().slice(0, 23).replace('T', ' ');
}

function stringifyNullable(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
}
