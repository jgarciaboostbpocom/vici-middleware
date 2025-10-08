"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logUiEvent = logUiEvent;
exports.readRecentEvents = readRecentEvents;
exports.aggregateDidUsage = aggregateDidUsage;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const EVENTS_DIR = process.env.UI_EVENTS_DIR || path_1.default.join(process.cwd(), 'data/ui_events');
function todayFile() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return path_1.default.join(EVENTS_DIR, `events-${yyyy}-${mm}-${dd}.ndjson`);
}
function prevDayFile() {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return path_1.default.join(EVENTS_DIR, `events-${yyyy}-${mm}-${dd}.ndjson`);
}
function logUiEvent(type, details = {}) {
    try {
        const evt = { ts: Date.now(), type, ...details };
        fs_1.default.appendFileSync(todayFile(), JSON.stringify(evt) + '\n', { encoding: 'utf8' });
    }
    catch (e) {
        console.error('[ui-events] write-failed', e?.message || e);
    }
}
function readRecentEvents(opts) {
    const sinceTs = opts?.sinceTs ?? 0;
    const limit = opts?.limit ?? 200;
    const filter = opts?.filter ?? {};
    const files = [todayFile(), prevDayFile()];
    const rows = [];
    for (const f of files) {
        try {
            if (!fs_1.default.existsSync(f))
                continue;
            const text = fs_1.default.readFileSync(f, 'utf8');
            for (const line of text.split('\n')) {
                if (!line.trim())
                    continue;
                try {
                    const obj = JSON.parse(line);
                    if (obj.ts <= sinceTs)
                        continue;
                    if (filter.did && obj.did !== filter.did)
                        continue;
                    if (filter.state && obj.state !== filter.state)
                        continue;
                    if (filter.phone && !String(obj.leadPhone || '').includes(filter.phone))
                        continue;
                    rows.push(obj);
                }
                catch { /* ignore */ }
            }
        }
        catch { /* ignore */ }
    }
    rows.sort((a, b) => b.ts - a.ts);
    return rows.slice(0, limit);
}
function aggregateDidUsage() {
    const list = readRecentEvents({ sinceTs: Date.now() - 24 * 60 * 60 * 1000, limit: 5000 });
    const map = new Map();
    for (const e of list) {
        if (!e.did)
            continue;
        if (!map.has(e.did))
            map.set(e.did, { did: e.did, callsToday: 0, ahtSec: null, status: 'active', states: new Set() });
        const rec = map.get(e.did);
        if (e.type === 'call_queued')
            rec.callsToday += 1;
        if (e.state)
            rec.states.add(e.state);
        if (e.type === 'kpi_snapshot' && typeof e.ahtSec === 'number')
            rec.ahtSec = e.ahtSec;
        if (e.type === 'did_rotated' && e.toDid === e.did)
            rec.status = 'active';
        if (e.type === 'did_rotated' && e.fromDid === e.did)
            rec.status = 'rotated';
    }
    return Array.from(map.values()).map(r => ({ ...r, states: Array.from(r.states).sort() }));
}
