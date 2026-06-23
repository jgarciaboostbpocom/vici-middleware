import { promises as fsp } from 'fs';
import path from 'path';
import type { RouteDecisionStatus, RouteDirection } from '../routeEngine/types';

const DATA_DIR = '/opt/vici-mw/data/route_engine';
const MAX_READ_LINES = 1000;

export type RouteLogRecord = {
  route_id: string;
  request_id?: string | null;
  direction: RouteDirection | 'result' | 'fallback';
  campaign_id?: string | null;
  client_id?: string | null;
  lead_id?: string | number | null;
  agent_id?: string | null;
  list_id?: string | number | null;
  destination_phone?: string | null;
  called_did?: string | null;
  dnis?: string | null;
  selected_did?: string | null;
  decision: RouteDecisionStatus;
  strategy?: string | null;
  fallback_used?: boolean;
  reason?: string | null;
  reuse_scope?: 'client' | 'campaign' | 'global' | null;
  service_date?: string | null;
  reuse_blocked?: boolean;
  reuse_reason?: string | null;
  campaign_match_type?: string | null;
  campaign_match_confidence?: string | null;
  pool_type?: string | null;
  candidate_count?: number;
  resolver_warnings?: string[];
  created_at: string;
  raw_request: unknown;
};

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function fileForDate(date = new Date()): string {
  return path.join(DATA_DIR, `route-events-${dayKey(date)}.ndjson`);
}

export async function appendRouteLog(record: RouteLogRecord): Promise<RouteLogRecord> {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.appendFile(fileForDate(), `${JSON.stringify(record)}\n`, 'utf-8');
  return record;
}

export async function listRecentRouteLogs(limit = 100): Promise<RouteLogRecord[]> {
  const safeLimit = Math.max(1, Math.min(Number.isFinite(limit) ? Math.floor(limit) : 100, MAX_READ_LINES));
  let raw = '';
  try {
    raw = await fsp.readFile(fileForDate(), 'utf-8');
  } catch {
    return [];
  }

  return raw
    .split('\n')
    .filter(Boolean)
    .slice(-safeLimit)
    .map(line => {
      try {
        return JSON.parse(line) as RouteLogRecord;
      } catch {
        return null;
      }
    })
    .filter((item): item is RouteLogRecord => !!item);
}

export async function listRouteLogsForDate(date = new Date()): Promise<RouteLogRecord[]> {
  let raw = '';
  try {
    raw = await fsp.readFile(fileForDate(date), 'utf-8');
  } catch {
    return [];
  }

  return raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line) as RouteLogRecord;
      } catch {
        return null;
      }
    })
    .filter((item): item is RouteLogRecord => !!item);
}
