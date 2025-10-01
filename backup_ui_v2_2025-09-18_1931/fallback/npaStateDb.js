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

// Normalize "NEW YORK" -> "NY", etc.
const NAME2ABBR = {
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

async function npaToState(npa){
  const ac = String(npa||'').replace(/\D/g,'').slice(0,3);
  if (ac.length !== 3) return null;
  const p = await sql();
  // vicidial_phone_codes has NANP entries with country_code=1
  const [rows] = await p.query(
    `SELECT state FROM vicidial_phone_codes
      WHERE country_code='1' AND areacode=? LIMIT 1`, [ac]
  );
  const raw = (rows?.[0]?.state || '').toUpperCase().trim();
  if (!raw) return null;
  return NAME2ABBR[raw] || raw; // if already "NY", return as-is
}

module.exports = { npaToState };
