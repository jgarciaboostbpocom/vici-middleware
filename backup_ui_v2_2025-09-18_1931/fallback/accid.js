const { q } = require('./db');

async function upsertAccid(campaignId, areacode, callerId){
  const ac = String(areacode).replace(/\D/g,'').slice(0,3);
  if (ac.length !== 3) return;
  await q(`
    INSERT INTO vicidial_campaign_cid_areacodes
      (campaign_id, areacode, outbound_cid, active)
    VALUES (?,?,?,'Y')
    ON DUPLICATE KEY UPDATE outbound_cid=VALUES(outbound_cid), active='Y'
  `, [campaignId, ac, callerId]);
}
module.exports = { upsertAccid };
