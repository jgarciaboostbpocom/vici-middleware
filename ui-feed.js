/**
 * ui-feed.js (robust)
 * - DID = real 10-digit CID via COALESCE(AC-CID, campaign_cid)
 * - Writes call_queued with lead phone
 * - Uses 60s time filter when available; if that yields 0 rows, falls back to last 50 by id
 * - No CDR dependency
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const UI_DIR = process.env.UI_EVENTS_DIR || path.join(process.cwd(), 'data/ui_events');
const POLL_MS = Number(process.env.UI_FEED_POLL_MS || 5000);

const DB_HOST = process.env.VICI_DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.VICI_DB_PORT || 3306);
const DB_USER = process.env.VICI_DB_USER || 'cron';
const DB_PASS = process.env.VICI_DB_PASSWORD || '';
const DB_NAME = process.env.VICI_DB_DATABASE || 'asterisk';

// Optional fallback if a campaign has no CID in DB
const DID_FALLBACK = {}; // e.g., { "CAMPAIGN1": "3056990269" }

if (!fs.existsSync(UI_DIR)) fs.mkdirSync(UI_DIR, { recursive: true });
const todayFile = () => {
  const d = new Date();
  const yyyy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  return path.join(UI_DIR, `events-${yyyy}-${mm}-${dd}.ndjson`);
};
const write = (obj) => { try { fs.appendFileSync(todayFile(), JSON.stringify(obj)+'\n', 'utf8'); } catch(e){} };

const seen = new Map();            // simple de-dupe
const SEEN_TTL = 60*60*1000;       // 1h
const DEDUPE_MS = 15000;           // 15s

async function connect() {
  return mysql.createPool({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME,
    waitForConnections: true, connectionLimit: 5
  });
}

async function colExists(db, table, col) {
  const [r] = await db.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1`,
    [DB_NAME, table, col]
  );
  return r.length > 0;
}

const normalize10 = v => String(v||'').replace(/\D/g,'').slice(-10);

function processRows(rows) {
  const now = Date.now();
  for (const r of rows) {
    const key = `${r.auto_call_id||''}|${r.phone_number||''}`;
    if (!key.trim()) continue;
    const last = seen.get(key) || 0;
    if (now - last < DEDUPE_MS) continue;
    seen.set(key, now);

    const did = normalize10(r.did || DID_FALLBACK[r.campaign_id] || '');

    write({
      ts: now,
      type: 'call_queued',
      did,
      state: '', // optional to fill later from your middleware map
      leadPhone: String(r.phone_number || ''),
      campaign: String(r.campaign_id || ''),
      source: 'vicidial_auto_calls'
    });
  }
  for (const [k,t] of seen) if (Date.now() - t > SEEN_TTL) seen.delete(k);
}

async function queryRecent(db, useTimeFilter) {
  const timeWhere = useTimeFilter
    ? `WHERE vac.last_update_time >= NOW() - INTERVAL 60 SECOND ORDER BY vac.last_update_time DESC`
    : `ORDER BY vac.auto_call_id DESC`;

  const [rows] = await db.query(
    `SELECT vac.auto_call_id,
            vac.phone_number,
            vac.campaign_id,
            COALESCE(vcca.outbound_cid, vc.campaign_cid) AS did
       FROM vicidial_auto_calls AS vac
  LEFT JOIN vicidial_campaign_cid_areacodes AS vcca
         ON vcca.campaign_id = vac.campaign_id
        AND vcca.areacode    = LEFT(vac.phone_number, 3)
  LEFT JOIN vicidial_campaigns AS vc
         ON vc.campaign_id   = vac.campaign_id
      ${timeWhere}
      LIMIT 200`
  );
  return rows;
}

async function poll(db) {
  const hasUpd = await colExists(db, 'vicidial_auto_calls', 'last_update_time');

  // Try time window first (if column exists)
  let rows = [];
  if (hasUpd) {
    rows = await queryRecent(db, true);
  }
  // Fallback: if nothing in last 60s (or column missing), grab last 50 by id
  if (!rows || rows.length === 0) {
    rows = await queryRecent(db, false);
    rows = rows.slice(0, 50);
  }
  processRows(rows);
}

(async () => {
  console.log('[ui-feed] connecting to Vicidial DB', { DB_HOST, DB_PORT, DB_NAME });
  const db = await connect();
  const tick = async () => { try { await poll(db); } catch(e){ console.error('[ui-feed] poll', e.message); } };
  setInterval(tick, POLL_MS);
  tick();
})();
