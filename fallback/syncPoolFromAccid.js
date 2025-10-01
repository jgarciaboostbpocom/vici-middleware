require('dotenv').config();
const mysql = require('mysql2/promise');
const { readOwnedDidsByState } = require('./accidReader');

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

async function upsertDid(state, did, label='AC-CID'){
  const p = await sql();
  await p.query(
    `INSERT INTO mw_state_dids (state_code,did,label,active)
     VALUES (?,?,?,1)
     ON DUPLICATE KEY UPDATE label=VALUES(label), active=1`,
    [state, did, label]
  );
}

async function runOnce(){
  const byState = await readOwnedDidsByState(process.env.CAMPAIGN_ID);
  let states = 0, dids = 0;
  for(const [st,set] of byState.entries()){
    states++;
    for(const d of set){ await upsertDid(st,d); dids++; }
  }
  console.log('[sync-pool] ok',{states,dids});
}

console.log('[sync-pool] starting (every 10 min)');
runOnce();
setInterval(runOnce, 10*60*1000);
