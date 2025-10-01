require('dotenv').config();
const { q } = require('./db');
const { getPoolForState, bumpCursor } = require('./statePool');
const { upsertAccid } = require('./accid');
const { nextGlobalDid } = require('./globalAnyDid');
const { npaToState } = require('./npaStateDb');

const ENABLED    = String(process.env.STATE_FALLBACK_ENABLED || '').toLowerCase() === 'true';
const SCAN_LIMIT = Number(process.env.FALLBACK_SCAN_LIMIT || 200);
const MIN_POOL   = Number(process.env.MIN_POOL_SIZE || 2);
const CAMPAIGN_ID= process.env.CAMPAIGN_ID;

if (!ENABLED) { console.log('[fallback] disabled by env; exit.'); process.exit(0); }
if (!CAMPAIGN_ID) { console.error('[fallback] Missing CAMPAIGN_ID in .env'); process.exit(1); }

async function tick(){
  try{
    // recent queued/active calls
    const rows = await q(`
      SELECT vac.campaign_id, vac.phone_number, vl.state
      FROM vicidial_auto_calls AS vac
      LEFT JOIN vicidial_list AS vl ON vl.lead_id = vac.lead_id
      WHERE vac.last_update_time > NOW() - INTERVAL 10 MINUTE
        AND vac.status IN ('LIVE','XFER','QUEUE','RING','INCALL','IVR','PARK','LOCAL')
        AND vac.campaign_id = ?
      ORDER BY vac.last_update_time DESC
      LIMIT ?`, [CAMPAIGN_ID, SCAN_LIMIT]);

    for (const r of rows){
      try{
        const phone = String(r.phone_number || '').replace(/\D/g,'');
        if (phone.length < 10) continue;
        const digits   = phone.length===11 && phone.startsWith('1') ? phone.slice(1) : phone.slice(-10);
        const areacode = digits.slice(0,3);

        // 1) Use lead.state if present, else infer from area code
        let state = String(r.state || '').trim().toUpperCase();
        if (!state) state = await npaToState(areacode) || '';

        // 2) Choose caller ID from owned DIDs:
        //    - state pool if available, else ANY owned DID (global fallback)
        let did = null;
        const pool = state ? await getPoolForState(state) : [];
        if (pool.length >= 1) {
          if (pool.length < MIN_POOL) { /* ok to assign; rotate guard handled elsewhere */ }
          did = await bumpCursor(state, pool) || pool[0];
        } else {
          did = await nextGlobalDid();
          if (!did) { console.log('[fallback] no owned DIDs available; skipping', { state: state||'UNKNOWN', areacode }); continue; }
          console.log('[fallback.global]', { state: state||'UNKNOWN', picked: did });
        }

        // 3) Ensure AC-CID maps this area code -> chosen owned DID
        await upsertAccid(CAMPAIGN_ID, areacode, did);
        console.log('[fallback.upsert]', { state: state||'UNKNOWN', areacode, cid: did, mode: 'roundrobin' });

      } catch (e) { console.error('[fallback.inner]', e.message); }
    }
  } catch(e){ console.error('[fallback.error]', e.message); }
}

console.log('[fallback] running:', { mode:'roundrobin', scanLimit: SCAN_LIMIT, minPool: MIN_POOL });
setInterval(tick, 45_000);
tick();
