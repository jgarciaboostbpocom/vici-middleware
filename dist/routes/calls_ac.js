"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const promise_1 = __importDefault(require("mysql2/promise"));
const router = (0, express_1.Router)();
// direct pool (keeps this route independent of other files)
const pool = promise_1.default.createPool({
    host: process.env.VICI_DB_HOST || "127.0.0.1",
    port: Number(process.env.VICI_DB_PORT || 3306),
    user: process.env.VICI_DB_USER || "",
    password: process.env.VICI_DB_PASS || "",
    database: process.env.VICI_DB_NAME || "asterisk",
    connectionLimit: 10,
});
/**
 * GET /api/ops/calls/today
 * Mirrors Vicidial AC-CID "CALLS" column (call_count_today),
 * and LEFT JOINs today's AHT from vicidial_carrier_log by DID.
 *
 * Returns: [{ campaign_id, areacode, did, description, calls_today, aht_sec }]
 */
router.get("/calls/today", async (_req, res) => {
    try {
        const sql = `
      SELECT
        c.campaign_id,
        c.areacode,
        REGEXP_REPLACE(c.outbound_cid,'[^0-9]','') AS did,
        c.cid_description AS description,
        c.call_count_today                         AS calls_today,
        COALESCE(a.aht_sec, 0)                     AS aht_sec
      FROM vicidial_campaign_cid_areacodes c
      LEFT JOIN (
        SELECT
          REGEXP_REPLACE(caller_id_number,'[^0-9]','') AS did,
          ROUND(AVG(COALESCE(length_in_sec,0)))        AS aht_sec
        FROM vicidial_carrier_log
        WHERE call_date >= CURDATE()
        GROUP BY REGEXP_REPLACE(caller_id_number,'[^0-9]','')
      ) a ON a.did = REGEXP_REPLACE(c.outbound_cid,'[^0-9]','')
      WHERE c.active = 'Y'
      ORDER BY c.campaign_id, c.areacode;
    `;
        const [rows] = await pool.query(sql);
        res.json(rows);
    }
    catch (e) {
        console.error("calls/today (AC-CID) error:", e?.message || e);
        res.status(500).json({ error: "Failed to load AC-CID counts" });
    }
});
exports.default = router;
