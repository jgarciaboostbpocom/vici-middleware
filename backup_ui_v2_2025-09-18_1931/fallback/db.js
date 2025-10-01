require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;
async function getPool() {
  if (!pool) {
    pool = await mysql.createPool({
      host: process.env.VICI_DB_HOST || '127.0.0.1',
      user: process.env.VICI_DB_USER,
      password: process.env.VICI_DB_PASS,
      database: process.env.VICI_DB_NAME || 'asterisk',
      port: Number(process.env.VICI_DB_PORT || 3306),
      waitForConnections: true, connectionLimit: 10
    });
  }
  return pool;
}
async function q(sql, params=[]) {
  const p = await getPool();
  const [rows] = await p.query(sql, params);
  return rows;
}
module.exports = { q };
