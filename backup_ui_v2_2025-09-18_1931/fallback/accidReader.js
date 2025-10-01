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
// “STATE - City …” → “NY”, etc.
const MAP = {
  AL:'AL',ALABAMA:'AL',AK:'AK',ALASKA:'AK',AZ:'AZ',ARIZONA:'AZ',AR:'AR',ARKANSAS:'AR',
  CA:'CA',CALIFORNIA:'CA',CO:'CO',COLORADO:'CO',CT:'CT',CONNECTICUT:'CT',DE:'DE',DELAWARE:'DE',
  FL:'FL',FLORIDA:'FL',GA:'GA',GEORGIA:'GA',HI:'HI',HAWAII:'HI',ID:'ID',IDAHO:'ID',
  IL:'IL',ILLINOIS:'IL',IN:'IN',INDIANA:'IN',IA:'IA',IOWA:'IA',KS:'KS',KANSAS:'KS',
  KY:'KY',KENTUCKY:'KY',LA:'LA',LOUISIANA:'LA',ME:'ME',MAINE:'ME',MD:'MD',MARYLAND:'MD',
  MA:'MA',MASSACHUSETTS:'MA',MI:'MI',MICHIGAN:'MI',MN:'MN',MINNESOTA:'MN',MS:'MS',MISSISSIPPI:'MS',
  MO:'MO',MISSOURI:'MO',MT:'MT',MONTANA:'MT',NE:'NE',NEBRASKA:'NE',NV:'NV',NEVADA:'NV',
  NH:'NH','NEW HAMPSHIRE':'NH',NJ:'NJ','NEW JERSEY':'NJ',NM:'NM','NEW MEXICO':'NM',
  NY:'NY','NEW YORK':'NY',NC:'NC','NORTH CAROLINA':'NC',ND:'ND','NORTH DAKOTA':'ND',
  OH:'OH',OHIO:'OH',OK:'OK',OKLAHOMA:'OK',OR:'OR',OREGON:'OR',PA:'PA',PENNSYLVANIA:'PA',
  RI:'RI','RHODE ISLAND':'RI',SC:'SC','SOUTH CAROLINA':'SC',SD:'SD','SOUTH DAKOTA':'SD',
  TN:'TN',TENNESSEE:'TN',TX:'TX',TEXAS:'TX',UT:'UT',UTAH:'UT',VT:'VT',VERMONT:'VT',
  VA:'VA',VIRGINIA:'VA',WA:'WA',WASHINGTON:'WA',WV:'WV','WEST VIRGINIA':'WV',
  WI:'WI',WISCONSIN:'WI',WY:'WY',WYOMING:'WY'
};
function descToState(desc){
  const left = String(desc||'').toUpperCase().split('-')[0].trim();
  return MAP[left] || null;
}

async function readOwnedDidsByState(campaignId){
  const p = await sql();
  const col = await getCidColumn();
  const [rows] = await p.query(
    `SELECT ${col} AS cid_norm, cid_description, active
       FROM vicidial_campaign_cid_areacodes
      WHERE campaign_id=?`, [process.env.CAMPAIGN_ID]
  );
  const byState = new Map();
  for(const r of rows){
    if((r.active||'N')!=='Y') continue;
    const st = descToState(r.cid_description); if(!st) continue;
    const did = String(r.cid_norm||'').replace(/\D/g,'');
    if(!did) continue;
    if(!byState.has(st)) byState.set(st, new Set());
    byState.get(st).add(did);
  }
  return byState; // Map<"NY", Set<"347xxxxxxx">>
}
module.exports = { readOwnedDidsByState };
