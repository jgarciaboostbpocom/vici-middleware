import fs from 'fs';
import path from 'path';

const EVENTS_DIR = process.env.UI_EVENTS_DIR || path.join(process.cwd(), 'data/ui_events');

function todayFile(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(EVENTS_DIR, `events-${yyyy}-${mm}-${dd}.ndjson`);
}

function prevDayFile(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return path.join(EVENTS_DIR, `events-${yyyy}-${mm}-${dd}.ndjson`);
}

export function logUiEvent(type: string, details: Record<string, any> = {}): void {
  try {
    const evt = { ts: Date.now(), type, ...details };
    fs.appendFileSync(todayFile(), JSON.stringify(evt) + '\n', { encoding: 'utf8' });
  } catch (e: any) {
    console.error('[ui-events] write-failed', e?.message || e);
  }
}

export function readRecentEvents(opts?: {
  sinceTs?: number; limit?: number;
  filter?: { did?: string; state?: string; phone?: string; }
}): any[] {
  const sinceTs = opts?.sinceTs ?? 0;
  const limit = opts?.limit ?? 200;
  const filter = opts?.filter ?? {};
  const files = [todayFile(), prevDayFile()];
  const rows: any[] = [];

  for (const f of files) {
    try {
      if (!fs.existsSync(f)) continue;
      const text = fs.readFileSync(f, 'utf8');
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.ts <= sinceTs) continue;
          if (filter.did && obj.did !== filter.did) continue;
          if (filter.state && obj.state !== filter.state) continue;
          if (filter.phone && !String(obj.leadPhone || '').includes(filter.phone)) continue;
          rows.push(obj);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }
  rows.sort((a, b) => b.ts - a.ts);
  return rows.slice(0, limit);
}

export function aggregateDidUsage(): Array<{
  did: string; callsToday: number; ahtSec: number | null; status: string; states: string[];
}> {
  const list = readRecentEvents({ sinceTs: Date.now() - 24*60*60*1000, limit: 5000 });
  const map = new Map<string, { did: string; callsToday: number; ahtSec: number | null; status: string; states: Set<string> }>();

  for (const e of list) {
    if (!e.did) continue;
    if (!map.has(e.did)) map.set(e.did, { did: e.did, callsToday: 0, ahtSec: null, status: 'active', states: new Set() });
    const rec = map.get(e.did)!;
    if (e.type === 'call_queued') rec.callsToday += 1;
    if (e.state) rec.states.add(e.state);
    if (e.type === 'kpi_snapshot' && typeof e.ahtSec === 'number') rec.ahtSec = e.ahtSec;
    if (e.type === 'did_rotated' && e.toDid === e.did) rec.status = 'active';
    if (e.type === 'did_rotated' && e.fromDid === e.did) rec.status = 'rotated';
  }

  return Array.from(map.values()).map(r => ({ ...r, states: Array.from(r.states).sort() }));
}
