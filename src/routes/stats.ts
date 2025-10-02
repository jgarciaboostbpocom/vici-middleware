import { Router } from 'express';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({ port: Number(process.env.DB_PORT||3306),
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASS!,
  database: process.env.DB_NAME!,
  waitForConnections: true, connectionLimit: 10
});
async function q<T=any>(sql:string, params:any[]=[]) {
  const [rows] = await pool.execute(sql, params); return rows as T[];
}

const r = Router();

r.get('/campaigns', async (_req, res) => {
  const rows = await q<{campaign_id:string}>(`SELECT DISTINCT campaign_id FROM call_logs ORDER BY campaign_id`);
  res.json(rows);
});

r.get('/stats/overview', async (req, res) => {
  const campaign = String(req.query.campaign || '');
  if (!campaign) return res.status(400).json({ error: 'campaign is required' });

  const [callsPerDid, ahtPerDid, states, inventory] = await Promise.all([
    q<{did:string; calls_today:number}>(`
      SELECT did, COUNT(*) AS calls_today
      FROM call_logs
      WHERE campaign_id = ? AND call_time >= CURDATE()
      GROUP BY did
      ORDER BY calls_today DESC
    `, [campaign]),
    q<{did:string; aht_sec:number}>(`
      SELECT did, AVG(handle_time_sec) AS aht_sec
      FROM call_logs
      WHERE campaign_id = ? AND call_time >= CURDATE()
        AND call_status IN ('ANSWER','SALE','COMPLETE')
      GROUP BY did
      ORDER BY aht_sec DESC
    `, [campaign]),
    q<{state:string; calls_today:number}>(`
      SELECT state, COUNT(*) AS calls_today
      FROM call_logs
      WHERE campaign_id = ? AND call_time >= CURDATE()
      GROUP BY state
      ORDER BY calls_today DESC
    `, [campaign]),
    q<{did:string; state:string}>(`
      SELECT did, state
      FROM ac_did_inventory
      WHERE campaign_id = ?
      ORDER BY state, did
    `, [campaign]),
  ]);

  const ahtMap = new Map(ahtPerDid.map(r => [r.did, Math.round(r.aht_sec || 0)]));
  const did_stats = callsPerDid.map(r => ({ did: r.did, calls_today: Number(r.calls_today||0), aht_sec: ahtMap.get(r.did)||0 }));
  res.json({ did_stats, states, inventory });
});

export default r;
