"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.updateAccidCidForState = updateAccidCidForState;
const promise_1 = __importDefault(require("mysql2/promise"));
let pool = null;
function required(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`Missing env: ${name}`);
    return v;
}
function getPool() {
    if (!pool) {
        const host = required('VICI_DB_HOST');
        const user = required('VICI_DB_USER');
        const password = required('VICI_DB_PASS');
        const database = required('VICI_DB_NAME');
        const port = Number(process.env.VICI_DB_PORT || 3306);
        pool = promise_1.default.createPool({
            host, user, password, database, port,
            waitForConnections: true, connectionLimit: 10
        });
    }
    return pool;
}
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
async function updateAccidCidForState(campaignId, stateCode, newDid) {
    const db = getPool();
    const [rows] = await (await db).query(`SELECT areacode, cid_description, active
       FROM vicidial_campaign_cid_areacodes
      WHERE campaign_id = ?`, [campaignId]);
    const [colRows] = await (await db).query(`SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'vicidial_campaign_cid_areacodes'
        AND COLUMN_NAME IN ('cid_number','cid','cidnum','outbound_cid')
      ORDER BY FIELD(COLUMN_NAME,'cid_number','cid','cidnum','outbound_cid')
      LIMIT 1`);
    const col = colRows[0]?.COLUMN_NAME;
    if (!col)
        return { ok: false, note: 'No callerID column (cid_number/cid/cidnum/outbound_cid) found' };
    const want = stateCode.toUpperCase();
    const targets = [];
    for (const r of rows) {
        if ((r.active || 'N') !== 'Y')
            continue;
        const abbr = descToState(String(r.cid_description || ''));
        if (abbr === want)
            targets.push(String(r.areacode));
    }
    if (!targets.length)
        return { ok: false, note: `No ACTIVE AC-CID rows matched state ${stateCode}` };
    const ph = targets.map(() => '?').join(',');
    const params = [newDid, campaignId, ...targets];
    const sqlText = `UPDATE vicidial_campaign_cid_areacodes
        SET ${col} = ?
      WHERE campaign_id = ?
        AND areacode IN (${ph})`;
    const [res] = await (await db).query(sqlText, params);
    return { ok: true, updated: res.affectedRows ?? 0 };
}
