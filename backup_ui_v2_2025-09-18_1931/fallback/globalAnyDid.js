require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;
async function sql(){
  if(!pool){
    pool = await mysql.createPool({
      host: process.env.VICI_DB_HOST || '127.0.0.1',
      user: process.env.VICI_DB_USER,
      password: process.env.VICI_DB_PASS,
      database: process.env.VICI_DB_NAME || 'asterisk',
      port: Number(process.env.VICI_DB_PORT || 3306),
      waitForConnections:true, connectionLimit:10
    });
  }
  return pool;
}

async function getCidColumn(){
  const p = await sql();
  const [rows] = await p.query(
    `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'vicidial_campaign_cid_areacodes'
        AND COLUMN_NAME IN ('outbound_cid','cid','cidnum','cid_number')
      ORDER BY FIELD(COLUMN_NAME,'outbound_cid','cid','cidnum','cid_number')
      LIMIT 1`
  );
  return rows[0]?.COLUMN_NAME || 'outbound_cid';
}

// simple global round-robin cursor stored in a session table
async function nextGlobalDid(){
  const p = await sql();
  const col = await getCidColumn();
  const [rows] = await p.query(
    `SELECT DISTINCT ${col} AS did
       FROM vicidial_campaign_cid_areacodes
      WHERE campaign_id=? AND active='Y'`, [process.env.CAMPAIGN_ID]
  );
  const dids = rows.map(r => String(r.did||'').replace(/\D/g,'')).filter(Boolean);
  if(!dids.length) return null;

  await p.query(`CREATE TABLE IF NOT EXISTS mw_global_rr (id TINYINT PRIMARY KEY, idx INT NOT NULL DEFAULT 0)`);
  const [cur] = await p.query(`SELECT idx FROM mw_global_rr WHERE id=1`);
  let idx = cur[0]?.idx ?? 0;
  idx = (idx + 1) % dids.length;
  await p.query(`INSERT INTO mw_global_rr (id,idx) VALUES (1,?) ON DUPLICATE KEY UPDATE idx=VALUES(idx)`, [idx]);

  return dids[idx];
}

module.exports = { nextGlobalDid };
