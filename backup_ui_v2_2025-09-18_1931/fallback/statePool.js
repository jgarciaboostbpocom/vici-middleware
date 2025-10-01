const { q } = require('./db');

async function getPoolForState(state){
  const rows = await q(
    'SELECT did FROM mw_state_dids WHERE state_code=? AND active=1 ORDER BY did ASC',[state]
  );
  return rows.map(r => String(r.did));
}
async function bumpCursor(state, pool){
  if (!pool.length) return null;
  const cur = await q('SELECT idx FROM mw_state_rr_cursor WHERE state_code=?',[state]);
  let idx = (cur[0]?.idx ?? 0);
  idx = (idx + 1) % pool.length;
  await q(`INSERT INTO mw_state_rr_cursor (state_code, idx)
           VALUES (?,?) ON DUPLICATE KEY UPDATE idx=VALUES(idx)`, [state, idx]);
  return pool[idx];
}
module.exports = { getPoolForState, bumpCursor };
