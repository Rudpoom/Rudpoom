import mysql from "mysql2/promise";
import { getConn } from "../utils/db";
import jwt from "jsonwebtoken";

export default defineEventHandler(async (event) => {
  let token = getHeader(event, "authorization");

  if (!token) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (token.startsWith('Bearer ')) token = token.slice(7)
  try {
    jwt.verify(token, "secret123");
  } catch {
    throw createError({ statusCode: 403, message: "No access" });
  }

  const host = process.env.DB_HOST || "127.0.0.1";
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASS || "";
  const database = process.env.DB_NAME || "shopdb";

  
  try {
    const admin = await mysql.createConnection({ host, user, password });
    try {
      await admin.execute(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    } finally {
      await admin.end();
    }
  } catch {}

  const conn = await getConn();
  try {

    try {
      await conn.execute(
        `CREATE TABLE IF NOT EXISTS photos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          url VARCHAR(1024) NOT NULL,
          name VARCHAR(255) DEFAULT '',
          price_cents INT NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    } catch {}
    try { await conn.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS price_cents INT NOT NULL DEFAULT 0"); } catch {}
    try { await conn.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT ''"); } catch {}

    let rows;
    try {
      [rows] = await conn.execute("SELECT id, url, name, price_cents, created_at FROM photos");
    } catch (e) {
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        try { await conn.execute(`CREATE TABLE IF NOT EXISTS photos (id INT AUTO_INCREMENT PRIMARY KEY, url VARCHAR(1024) NOT NULL, name VARCHAR(255) DEFAULT '', price_cents INT NOT NULL DEFAULT 0, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`) } catch {}
        rows = []
      } else {
        try { await conn.execute('ALTER TABLE photos ADD COLUMN price_cents INT NOT NULL DEFAULT 0') } catch {}
        try { await conn.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT ''") } catch {}
        const r = await conn.execute("SELECT id, url, name, price_cents, created_at FROM photos");
        rows = r[0]
      }
    }
    return rows;
  } finally {
    try { conn.release() } catch (e) {}
  }
});
