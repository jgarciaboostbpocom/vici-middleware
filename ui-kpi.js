/**
 * ui-kpi.js
 * Every 60s writes kpi_snapshot events with per-DID Calls Today & AHT
 * Uses vicidial_log.length_in_sec and derives CID as
 *   COALESCE(per-areacode outbound_cid, campaign_cid)
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const UI_DIR = process.env.UI_EVENTS_DIR || path.join(process.cwd(), 'data/ui_events');
const POLL_MS = Number(process.env.UI_KPI_POLL_MS || 60000);

const DB_HOST = process.env.VICI_DB_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.VICI_DB_PORT || 3306);
const DB_USER = process.env.VICI_DB_USER || 'cron';
const DB_PASS = process.env.VICI_DB_PASSWORD || '';
const DB_NAME = process.env.VICI_DB_DATABASE || 'asterisk';

if (!fs.existsSync(UI_DIR)) fs.mkdirSync(UI_DIR, { recursive: true });
const todayFile = () => {
  const d = new Date();
  const yyyy=d.getFullYear(), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  return path.join(UI_DIR, `events-${yyyy}-${mm}-${dd}.ndjson`);
};
const write = (obj) => { try { fs.appendFileSync(todayFile(), JSON.stringify(obj)+'\n', 'utf8'); } catch(e){} };

async function connect() {
  return mysql.createPool({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME,
    waitForConnections: true, connectionLimit: 5
  });
}
async function tableExists(conn, t) {
  const [r] = await conn.query(
    `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=? LIMIT 1`,
    [DB_NAME, t]
  );
  return r.length > 0;
}
const normalize10 = (v) => String(v||'').replace(/\D/g,'').slice(-10);

async function snapshot(conn) {
  const hasMap = await tableExists(conn, 'vicidial_campaign_cid_areacodes');

  const sql = hasMap
    ? `SELECT COALESCE(vcca.outbound_cid, vc.campaign_cid) AS did,
              COUNT(*) AS calls,
              AVG(IFNULL(vl.length_in_sec,0)) AS aht
         FROM vicidial_log vl
    LEFT JOIN vicidial_campaigns vc  ON vc.campaign_id = vl.campaign_id
    LEFT JOIN vicidial_campaign_cid_areacodes vcca
           ON vcca.campaign_id = vl.campaign_id
          AND vcca.areacode    = LEFT(vl.phone_number,3)
        WHERE vl.call_date >= CURDATE()
        GROUP BY did`
    : `SELECT vc.campaign_cid AS did,
              COUNT(*) AS calls,
              AVG(IFNULL(vl.length_in_sec,0)) AS aht
         FROM vicidial_log vl
    LEFT JOIN vicidial_campaigns vc ON vc.campaign_id = vl.campaign_id
        WHERE vl.call_date >= CURDATE()
        GROUP BY vc.campaign_cid`;

  const [rows] = await conn.query(sql);
  const ts = Date.now();
  for (const r of rows) {
    const did = normalize10(r.did);
    if (!did) continue;
    write({ ts, type: 'kpi_snapshot', did, callsToday: Number(r.calls)||0, ahtSec: Number(r.aht)||0 });
  }
}

(async () => {
  const conn = await connect();
  const tick = async () => { try { await snapshot(conn); } catch(e){ console.error('[ui-kpi] snapshot', e.message); } };
  setInterval(tick, POLL_MS);
  tick();
})();
/* ==== Calls Today overlay (reads AC-CID via our API) ==== */
(function callsTodayOverlay(){
  async function fetchCallsMap(){
    const r = await fetch('/api/ops/calls/today');
    const arr = await r.json();
    const map = {};
    arr.forEach(x => {
      const did = String(x.did || '').replace(/\D/g,'');
      map[did] = Number(x.calls_today) || 0;
    });
    return map;
  }

  function updateDom(map){
    // Find any line that contains "Calls today:" in the cards,
    // grab the 10-digit DID from the same card, and replace the number.
    const nodes = Array.from(document.querySelectorAll('*'))
      .filter(el => /Calls today:/i.test(el.textContent || ''));
    nodes.forEach(el => {
      const box = el.closest('[class]') || el;
      const txt = (box.textContent || '');
      const m = txt.match(/\b(\d{10})\b/); // first 10-digit number in the card = DID
      if (!m) return;
      const did = m[1];
      const calls = map[did];
      if (calls == null) return;
      // Replace only the Calls today number; keep the rest of the line intact
      el.innerHTML = el.innerHTML.replace(/(Calls today:\s*)\d+/i, `$1${calls}`);
    });
  }

  async function tick(){
    try {
      const map = await fetchCallsMap();
      updateDom(map);
    } catch(e) {}
    setTimeout(tick, 30000); // refresh every 30s
  }

  if (typeof window !== 'undefined') setTimeout(tick, 1500); // start after initial render
})();
