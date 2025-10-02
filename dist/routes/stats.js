"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promise_1 = __importDefault(require("mysql2/promise"));
const pool = promise_1.default.createPool({ port: Number(process.env.DB_PORT || 3306),
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true, connectionLimit: 10 });
async function q(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}
const r = (0, express_1.Router)();
r.get('/campaigns', async (_req, res) => {
    const rows = await q(`SELECT DISTINCT campaign_id FROM call_logs ORDER BY campaign_id`);
    res.json(rows);
});
r.get('/stats/overview', async (req, res) => {
    const campaign = String(req.query.campaign || '');
    if (!campaign)
        return res.status(400).json({ error: 'campaign is required' });
    const [callsPerDid, ahtPerDid, states, inventory] = await Promise.all([
        q(`
      SELECT did, COUNT(*) AS calls_today
      FROM call_logs
      WHERE campaign_id = ? AND call_time >= CURDATE()
      GROUP BY did
      ORDER BY calls_today DESC
    `, [campaign]),
        q(`
      SELECT did, AVG(handle_time_sec) AS aht_sec
      FROM call_logs
      WHERE campaign_id = ? AND call_time >= CURDATE()
        AND call_status IN ('ANSWER','SALE','COMPLETE')
      GROUP BY did
      ORDER BY aht_sec DESC
    `, [campaign]),
        q(`
      SELECT state, COUNT(*) AS calls_today
      FROM call_logs
      WHERE campaign_id = ? AND call_time >= CURDATE()
      GROUP BY state
      ORDER BY calls_today DESC
    `, [campaign]),
        q(`
      SELECT did, state
      FROM ac_did_inventory
      WHERE campaign_id = ?
      ORDER BY state, did
    `, [campaign]),
    ]);
    const ahtMap = new Map(ahtPerDid.map(r => [r.did, Math.round(r.aht_sec || 0)]));
    const did_stats = callsPerDid.map(r => ({ did: r.did, calls_today: Number(r.calls_today || 0), aht_sec: ahtMap.get(r.did) || 0 }));
    res.json({ did_stats, states, inventory });
});
exports.default = r;
