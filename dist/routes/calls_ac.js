"use strict";
const express = require("express");
const mysql = require("mysql2/promise");
const router = express.Router();
const pool = mysql.createPool({
  host: process.env.VICI_DB_HOST || "127.0.0.1",
  port: Number(process.env.VICI_DB_PORT || 3306),
  user: process.env.VICI_DB_USER || "",
  password: process.env.VICI_DB_PASS || "",
  database: process.env.VICI_DB_NAME || "asterisk",
  connectionLimit: 10,
});
router.get("/calls/today", async (_req, res) => {
  try {
    const sql = `
      SELECT
        c.campaign_id,
        c.areacode,
        REGEXP_REPLACE(c.outbound_cid,'[^0-9]','') AS did,
        c.cid_description AS description,
        c.call_count_today AS calls_today,
        0 AS aht_sec
      FROM vicidial_campaign_cid_areacodes c
      WHERE c.active='Y'
      ORDER BY c.campaign_id, c.areacode;
    `;
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (e) {
    console.error("calls/today error:", e.message || e);
    res.status(500).json({ error: "Failed to load AC-CID counts" });
  }
});
module.exports = router;
