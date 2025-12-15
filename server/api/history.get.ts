import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

export default defineEventHandler(async (event) => {
  let token = getHeader(event, "authorization");
  if (!token) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  let payload: any;
  try {
    if (token.startsWith('Bearer ')) token = token.slice(7)
    payload = jwt.verify(token, "secret123");
  } catch {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  const host = process.env.DB_HOST || "127.0.0.1";
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASS || "";
  const database = process.env.DB_NAME || "webphoto";

  // Ensure database exists (first-run friendly)
  try {
    const admin = await mysql.createConnection({ host, user, password });
    try {
      await admin.execute(
        `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    } finally {
      await admin.end();
    }
  } catch {}

  const conn = await mysql.createConnection({ host, user, password, database });

  // Ensure required tables exist to avoid startup 500s
  try {
    await conn.execute(
      `CREATE TABLE IF NOT EXISTS photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url VARCHAR(1024) NOT NULL,
        price_cents INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
  } catch {}
  try { await conn.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS price_cents INT NOT NULL DEFAULT 0"); } catch {}
  try {
    await conn.execute(
      `CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        photo_id INT NULL,
        quantity INT NOT NULL DEFAULT 1,
        rider_id INT NULL,
        status ENUM('PENDING','ASSIGNED','PICKING_UP','DELIVERING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    )
  } catch {}
  // Harden by ensuring columns exist (MySQL 8+ syntax)
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS photo_id INT NULL"); } catch {}
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1"); } catch {}
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_id INT NULL"); } catch {}
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS status ENUM('PENDING','ASSIGNED','PICKING_UP','DELIVERING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING'"); } catch {}
  try {
    const [cols]: any = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='orders'"
    );
    const colSet = new Set((cols || []).map((c: any) => c.COLUMN_NAME));
    if (!colSet.has('photo_id')) {
      try { await conn.execute("ALTER TABLE orders ADD COLUMN photo_id INT NULL"); } catch {}
    }
    if (!colSet.has('quantity')) {
      try { await conn.execute("ALTER TABLE orders ADD COLUMN quantity INT NOT NULL DEFAULT 1"); } catch {}
    }
    if (!colSet.has('rider_id')) {
      try { await conn.execute("ALTER TABLE orders ADD COLUMN rider_id INT NULL"); } catch {}
    }
    if (!colSet.has('status')) {
      try { await conn.execute("ALTER TABLE orders ADD COLUMN status ENUM('PENDING','ASSIGNED','PICKING_UP','DELIVERING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING'"); } catch {}
    }
  } catch {}

  const [rows] = await conn.execute(
    `SELECT o.id, o.photo_id, o.quantity, o.status, o.total_cents, o.created_at, p.url as photo_url, p.price_cents
     FROM orders o
     JOIN photos p ON p.id = o.photo_id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC, o.id DESC`,
    [payload.id]
  );

  return rows;
});
