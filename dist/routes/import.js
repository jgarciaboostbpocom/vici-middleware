"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRouter = void 0;
const express_1 = require("express");
const db_1 = require("../vici/db");
const dids_1 = require("../storage/dids");
const NAME2ABBR = {
    AL: 'AL', ALABAMA: 'AL', AK: 'AK', ALASKA: 'AK', AZ: 'AZ', ARIZONA: 'AZ', AR: 'AR', ARKANSAS: 'AR',
    CA: 'CA', CALIFORNIA: 'CA', CO: 'CO', COLORADO: 'CO', CT: 'CT', CONNECTICUT: 'CT', DE: 'DE', DELAWARE: 'DE',
    FL: 'FL', FLORIDA: 'FL', GA: 'GA', GEORGIA: 'GA', HI: 'HI', HAWAII: 'HI', ID: 'ID', IDAHO: 'ID',
    IL: 'IL', ILLINOIS: 'IL', IN: 'IN', INDIANA: 'IN', IA: 'IA', IOWA: 'IA', KS: 'KS', KANSAS: 'KS',
    KY: 'KY', KENTUCKY: 'KY', LA: 'LA', LOUISIANA: 'LA', ME: 'ME', MAINE: 'ME', MD: 'MD', MARYLAND: 'MD',
    MA: 'MA', MASSACHUSETTS: 'MA', MI: 'MI', MICHIGAN: 'MI', MN: 'MN', MINNESOTA: 'MN', MS: 'MS', MISSISSIPPI: 'MS',
    MO: 'MO', MISSOURI: 'MO', MT: 'MT', MONTANA: 'MT', NE: 'NE', NEBRASKA: 'NE', NV: 'NV', NEVADA: 'NV',
    NH: 'NH', 'NEW HAMPSHIRE': 'NH', NJ: 'NJ', 'NEW JERSEY': 'NJ', NM: 'NM', 'NEW MEXICO': 'NM',
    NY: 'NY', 'NEW YORK': 'NY', NC: 'NC', 'NORTH CAROLINA': 'NC', ND: 'ND', 'NORTH DAKOTA': 'ND',
    OH: 'OH', OHIO: 'OH', OK: 'OK', OKLAHOMA: 'OK', OR: 'OR', OREGON: 'OR', PA: 'PA', PENNSYLVANIA: 'PA',
    RI: 'RI', 'RHODE ISLAND': 'RI', SC: 'SC', 'SOUTH CAROLINA': 'SC', SD: 'SD', 'SOUTH DAKOTA': 'SD',
    TN: 'TN', TENNESSEE: 'TN', TX: 'TX', TEXAS: 'TX', UT: 'UT', UTAH: 'UT', VT: 'VT', VERMONT: 'VT',
    VA: 'VA', VIRGINIA: 'VA', WA: 'WA', WASHINGTON: 'WA', WV: 'WV', 'WEST VIRGINIA': 'WV',
    WI: 'WI', WISCONSIN: 'WI', WY: 'WY', WYOMING: 'WY'
};
function descToState(desc) {
    const left = (desc || '').toUpperCase().split('-')[0].trim();
    return NAME2ABBR[left] || null;
}
exports.importRouter = (0, express_1.Router)();
exports.importRouter.post('/accid', async (req, res) => {
    const wanted = req.body?.state?.toUpperCase();
    try {
        const db = (0, db_1.getPool)();
        const [colRows] = await db.query(`SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'vicidial_campaign_cid_areacodes'
          AND COLUMN_NAME IN ('cid_number','cid','cidnum','outbound_cid')
        ORDER BY FIELD(COLUMN_NAME,'cid_number','cid','cidnum','outbound_cid')
        LIMIT 1`);
        const col = colRows[0]?.COLUMN_NAME;
        if (!col) {
            const [allCols] = await db.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='vicidial_campaign_cid_areacodes'`);
            return res.status(500).json({
                ok: false,
                error: `No caller ID column (cid_number/cid/cidnum/outbound_cid). Present: ${allCols.map(r => r.COLUMN_NAME).join(', ')}`
            });
        }
        const [rows] = await db.query(`SELECT areacode, ${col} AS cid_norm, cid_description, active
         FROM vicidial_campaign_cid_areacodes
        WHERE campaign_id = ?`, [process.env.CAMPAIGN_ID]);
        const byState = new Map();
        for (const r of rows) {
            if ((r.active || 'N') !== 'Y')
                continue;
            const abbr = descToState(String(r.cid_description || ''));
            if (!abbr)
                continue;
            if (wanted && abbr !== wanted)
                continue;
            const did = String(r.cid_norm || '').replace(/\D/g, '');
            if (!did)
                continue;
            if (!byState.has(abbr))
                byState.set(abbr, new Set());
            byState.get(abbr).add(did);
        }
        let importedStates = 0, importedDids = 0;
        for (const [st, set] of byState.entries()) {
            importedStates++;
            for (const did of set) {
                await (0, dids_1.addDid)(did, st);
                importedDids++;
            }
            const active = await (0, dids_1.getActiveDidForState)(st);
            if (!active) {
                const first = [...set][0];
                if (first)
                    await (0, dids_1.setActiveDidForState)(st, first);
            }
        }
        return res.json({ ok: true, importedStates, importedDids });
    }
    catch (e) {
        console.error('[import] error:', e?.message || e);
        return res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
});
