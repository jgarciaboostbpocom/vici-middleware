import express from "express";
import fs from "fs/promises";
import path from "path";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: "/opt/vici-mw/.env" });

const router = express.Router();

/* ===== CONFIG ===== */
const CAMPAIGN_ID = process.env.VICI_CAMPAIGN_ID || "Campaign";
const CALLS_PER_DID = Number(process.env.CALLS_PER_DID || 70);
const AHT_MIN_SECONDS = Number(process.env.AHT_MIN_SECONDS || 90);
const ROTATE_INTERVAL_SECONDS = Number(process.env.ROTATE_INTERVAL_SECONDS || 90);

// AC-CID column (usually cid_number)
const allowedCols = new Set(["cid_number", "callerid", "caller_id_number"]);
const CID_COL = allowedCols.has(String(process.env.OPS_CID_COL || "")) ? String(process.env.OPS_CID_COL) : "cid_number";

/* ===== DB POOL ===== */
const pool = mysql.createPool({
  host: process.env.VICI_DB_HOST || "127.0.0.1",
  port: Number(process.env.VICI_DB_PORT || 3306),
  user: process.env.VICI_DB_USER || "asterisk",
  password: process.env.VICI_DB_PASS || "",
  database: process.env.VICI_DB_NAME || "asterisk",
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

/* ===== HELPERS ===== */
const dataDir = path.join(process.cwd(), "data");
const pausedFile = path.join(dataDir, "paused_dids.json");
const npaFile = path.join(dataDir, "state_map.json");
const cidMapFile = path.join(dataDir, "cid_map.json");

async function loadJSON(file: string, fallback: any) {
  try { return JSON.parse(await fs.readFile(file, "utf-8")); } catch { return fallback; }
}
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

// Defensive wrappers so we never crash the route
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

/* ===== QUERIES (defensive) ===== */

// Calls today per DID (from dial_log)
async function q_callsToday(): Promise<Record<string, number>> {
  return safe(async () => {
    const sql = `
      SELECT TRIM(v.outbound_cid) AS did, COUNT(*) AS cnt
      FROM vicidial_log v
      WHERE v.call_date >= CURDATE()
        AND v.outbound_cid IS NOT NULL
        AND v.outbound_cid <> ''
      GROUP BY TRIM(v.outbound_cid)
    `;
    const [rows] = await pool.query(sql);
    const map: Record<string, number> = {};
    for (const r of rows as any[]) map[String(r.did).trim()] = Number(r.cnt);
    return map;
  }, {});
}

// AHT per DID (last hour) — join log to dial_log
async function q_aht(): Promise<Record<string, number>> {
  return safe(async () => {
    const sql = `
      SELECT TRIM(d.outbound_cid) AS did, ROUND(AVG(l.length_in_sec)) AS aht
      FROM vicidial_log l
      JOIN vicidial_dial_log d ON d.uniqueid = l.uniqueid
      WHERE l.call_date >= NOW() - INTERVAL 1 HOUR
        AND l.length_in_sec > 0
        AND d.outbound_cid IS NOT NULL
        AND d.outbound_cid <> ''
      GROUP BY TRIM(d.outbound_cid)
    `;
    const [rows] = await pool.query(sql);
    const map: Record<string, number> = {};
    for (const r of rows as any[]) map[String(r.did).trim()] = Number(r.aht || 0);
    return map;
  }, {});
}

// Active DID for state (AC-CID)
async function q_activeDid(npas: string[]): Promise<string> {
  if (!npas?.length) return "";
  return safe(async () => {
    const placeholders = npas.map(() => "?").join(",");
    const sql = `
      SELECT ${CID_COL} AS did, COUNT(*) AS c
      FROM vicidial_campaign_cid_areacodes
      WHERE campaign_id = ?
        AND areacode IN (${placeholders})
        AND ${CID_COL} IS NOT NULL
        AND ${CID_COL} <> ''
      GROUP BY ${CID_COL}
      ORDER BY c DESC
      LIMIT 1
    `;
    const params = [CAMPAIGN_ID, ...npas];
    const [rows] = await pool.query(sql, params);
    const list = rows as any[];
    return list.length ? String(list[0].did).trim() : "";
  }, "");
}

/* ===== STATE PAYLOAD (defensive) ===== */
async function statePayload(stateCode: string) {
  const state = String(stateCode || "").toUpperCase();

  const [npasMap, paused, cidMap] = await Promise.all([
    loadJSON(npaFile, {}),
    loadJSON(pausedFile, {}),
    loadJSON(cidMapFile, {}),
  ]);

  const npas: string[] = npasMap[state] || [];

  // DIDs managed for this state
  const poolForState = Object.entries(cidMap)
    .filter(([did, st]) => String(st).toUpperCase() === state)
    .map(([did]) => String(did).trim());

  // Pull data (never throw)
  const [activeDidRaw, callsMapRaw, ahtMapRaw] = await Promise.all([
    q_activeDid(npas),
    q_callsToday(),
    q_aht(),
  ]);

  const activeDid = (activeDidRaw || "").trim();

  // normalize maps
  const callsMap: Record<string, number> = {};
  for (const [k, v] of Object.entries(callsMapRaw)) callsMap[String(k).trim()] = Number(v) || 0;

  const ahtMap: Record<string, number> = {};
  for (const [k, v] of Object.entries(ahtMapRaw)) ahtMap[String(k).trim()] = Number(v) || 0;

  // Build UI lists
  const lists: any = { active: [], waiting: [], exhausted: [], paused: [] };
  for (const didRaw of poolForState) {
    const did = String(didRaw).trim();
    const calls = callsMap[did] ?? 0;
    const aht   = ahtMap[did]   ?? 0;
    const status =
      did === activeDid ? "ACTIVE" :
      paused[did]       ? "PAUSED" :
      calls >= CALLS_PER_DID ? "EXHAUSTED" : "WAITING";
    const row = { did, callsToday: calls, ahtSec: aht, pctToCap: pct(calls, CALLS_PER_DID), status };
    lists[status.toLowerCase()].push(row);
  }

  return { state, caps: { CALLS_PER_DID, AHT_MIN_SECONDS, ROTATE_INTERVAL_SECONDS }, activeDid, lists };
}

/* ===== VM (defensive) ===== */
async function vmItems() {
  return safe(async () => {
    const sql = `
      SELECT l.call_date AS time,
             l.lead_id AS phone,
             TRIM(d.outbound_cid) AS did,
             l.status,
             l.length_in_sec AS len
      FROM vicidial_log l
      JOIN vicidial_dial_log d ON d.uniqueid = l.uniqueid
      WHERE l.call_date >= CURDATE()
        AND l.status IN ('AA','AM')
        AND d.outbound_cid IS NOT NULL
        AND d.outbound_cid <> ''
      ORDER BY l.call_date DESC
      LIMIT 200
    `;
    const [rows] = await pool.query(sql);
    return (rows as any[]).map(r => ({
      time: r.time, phone: r.phone, did: r.did || "", status: r.status,
      len: Number(r.len || 0),
      drop_ok: Number(r.len || 0) >= 100 && Number(r.len || 0) <= 120,
    }));
  }, []);
}

/* ===== ROUTE HANDLERS (shared) ===== */
const vmHandler = async (_req: any, res: any) => {
  const items = await vmItems();
  res.json({ items });
};

const stateHandler = async (req: any, res: any) => {
  const data = await statePayload(req.params.state);
  res.json(data);
};

const pauseHandler = async (req: any, res: any) => {
  const paused = await loadJSON(pausedFile, {});
  paused[String(req.params.did).trim()] = true;
  await fs.writeFile(pausedFile, JSON.stringify(paused, null, 2));
  res.json({ ok: true });
};

const resumeHandler = async (req: any, res: any) => {
  const paused = await loadJSON(pausedFile, {});
  delete paused[String(req.params.did).trim()];
  await fs.writeFile(pausedFile, JSON.stringify(paused, null, 2));
  res.json({ ok: true });
};

const activateHandler = async (req: any, res: any) => {
  const state = String(req.params.state || "").toUpperCase();
  const did = String(req.params.did || "").trim();
  const npasMap = await loadJSON(npaFile, {});
  const npas: string[] = npasMap[state] || [];
  if (!npas.length) return res.status(400).json({ ok: false, error: "No NPAs for state" });

  const placeholders = npas.map(() => "?").join(",");
  const sql = `
    UPDATE vicidial_campaign_cid_areacodes
    SET ${CID_COL} = ?
    WHERE campaign_id = ?
      AND areacode IN (${placeholders})
  `;
  await safe(async () => {
    const params = [did, CAMPAIGN_ID, ...npas];
    await pool.query(sql, params);
  }, null as any);

  res.json({ ok: true });
};

/* ===== ROUTES: support BOTH /api/ops/... and /ui-v2/... ===== */
// VM
router.get("/api/ops/vm", vmHandler);
router.get("/ui-v2/vm", vmHandler);

// State payload
router.get("/api/ops/state/:state", stateHandler);
router.get("/ui-v2/:state", (req, res, next) => req.params.state === "vm" ? next() : stateHandler(req, res));
router.get("/:state", (req, res, next) => req.params.state === "vm" ? next() : stateHandler(req, res)); // fallback

// Pause/Resume
router.post("/api/ops/did/:did/pause", pauseHandler);
router.post("/api/ops/did/:did/resume", resumeHandler);
router.post("/ui-v2/did/:did/pause", pauseHandler);
router.post("/ui-v2/did/:did/resume", resumeHandler);

// Activate
router.post("/api/ops/state/:state/activate/:did", activateHandler);
router.post("/ui-v2/state/:state/activate/:did", activateHandler);

// Debug maps
router.get("/api/ops/debug/calls", async (_req, res) => res.json(await q_callsToday()));
router.get("/api/ops/debug/aht",   async (_req, res) => res.json(await q_aht()));
router.get("/ui-v2/debug/calls",   async (_req, res) => res.json(await q_callsToday()));
router.get("/ui-v2/debug/aht",     async (_req, res) => res.json(await q_aht()));
// --- AC-CID: calls today straight from vicidial_campaign_cid_areacodes ---
router.get('/calls/today-disabled', async (req, res) => {
  try {
    const qCampaign =
      (req.query.campaign_id as string) || process.env.VICI_DEFAULT_CAMPAIGN_ID || '';

    const sql =
      `SELECT campaign_id,
              areacode,
              outbound_cid      AS did,
              cid_description    AS description,
              call_count_today   AS calls_today
       FROM vicidial_campaign_cid_areacodes
       WHERE active='Y'` +
      (qCampaign ? ` AND campaign_id=?` : '') +
      ` ORDER BY campaign_id, areacode`;

    const params = qCampaign ? [qCampaign] : [];
    const [rows] = await pool.query(sql, params);   // <-- uses your existing pool
    res.json(rows);
  } catch (err: any) {
    console.error('AC-CID /calls/today error:', err?.message || err);
    res.status(500).json({ error: 'Failed to load AC-CID call counts' });
  }
});


export default router;
