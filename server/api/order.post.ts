import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import { events } from "../utils/events";

export default defineEventHandler(async (event) => {
  let token = getHeader(event, "authorization") as string | undefined;
  if (!token) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (token.startsWith('Bearer ')) token = token.slice(7)

  let payload: any;
  try {
    payload = jwt.verify(token, "secret123");
  } catch {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }

  const body = await readBody(event);
  const photoId = Number(body?.photo_id);
  const quantity = Math.max(1, Number(body?.quantity || 1));
  const address = String(body?.address || '').trim();
  const phone = String(body?.phone || '').trim();

  if (!photoId || !Number.isFinite(photoId)) {
    throw createError({ statusCode: 400, message: "Invalid photo_id" });
  }
  if (!address || address.length < 5) {
    throw createError({ statusCode: 400, message: "Address is required" });
  }
  if (!phone || phone.length < 6) {
    throw createError({ statusCode: 400, message: "Phone is required" });
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

  // Ensure required tables/columns exist (idempotent)
  try {
    await conn.execute(
      `CREATE TABLE IF NOT EXISTS photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url VARCHAR(1024) NOT NULL,
        price_cents INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
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
        address VARCHAR(255) NULL,
        phone VARCHAR(30) NULL,
        total_cents INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
  } catch {}
  // Harden by ensuring columns exist (MySQL 8+ syntax)
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS photo_id INT NULL"); } catch {}
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1"); } catch {}
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_id INT NULL"); } catch {}
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS status ENUM('PENDING','ASSIGNED','PICKING_UP','DELIVERING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING'"); } catch {}
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address VARCHAR(255) NULL"); } catch {}
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL"); } catch {}
  try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_cents INT NOT NULL DEFAULT 0"); } catch {}

  // Ensure users.credit_cents exists
  try { await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_cents INT NOT NULL DEFAULT 0"); } catch {}
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
    if (!colSet.has('address')) {
      try { await conn.execute("ALTER TABLE orders ADD COLUMN address VARCHAR(255) NULL"); } catch {}
    }
    if (!colSet.has('phone')) {
      try { await conn.execute("ALTER TABLE orders ADD COLUMN phone VARCHAR(30) NULL"); } catch {}
    }
  } catch {}

  try {
    await conn.execute(
      `CREATE TABLE IF NOT EXISTS order_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        status ENUM('PENDING','ASSIGNED','PICKING_UP','DELIVERING','COMPLETED','CANCELLED') NOT NULL,
        changed_by INT NULL,
        changed_by_role ENUM('USER','RIDER','SYSTEM','ADMIN') NOT NULL,
        note VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
  } catch {}

  // Ensure photo exists and read price
  const [pRows]: any = await conn.execute("SELECT id, price_cents FROM photos WHERE id = ?", [photoId]);
  if (!pRows?.[0]) {
    throw createError({ statusCode: 404, message: "Photo not found" });
  }
  const priceCents = Number(pRows[0].price_cents || 0)
  const totalCents = priceCents * quantity

  // Check user credit and deduct in a transaction
  await conn.beginTransaction()
  try {
    const [uRows]: any = await conn.execute("SELECT credit_cents FROM users WHERE id=? FOR UPDATE", [payload.id])
    const curCredit = Number(uRows?.[0]?.credit_cents ?? 0)
    if (curCredit < totalCents) {
      throw createError({ statusCode: 402, message: "Insufficient credit" })
    }

    // Deduct credit
    await conn.execute("UPDATE users SET credit_cents = credit_cents - ? WHERE id=?", [totalCents, payload.id])

    // Insert order with total
    let ins: any;
    try {
      [ins] = await conn.execute(
        "INSERT INTO orders (user_id, photo_id, quantity, status, address, phone, total_cents) VALUES (?, ?, ?, 'PENDING', ?, ?, ?)",
        [payload.id, photoId, quantity, address, phone, totalCents]
      );
    } catch (e: any) {
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        // Fallback: ensure columns exist then retry once
        try { await conn.execute("ALTER TABLE orders ADD COLUMN photo_id INT NULL"); } catch {}
        try { await conn.execute("ALTER TABLE orders ADD COLUMN quantity INT NOT NULL DEFAULT 1"); } catch {}
        try { await conn.execute("ALTER TABLE orders ADD COLUMN rider_id INT NULL"); } catch {}
        try { await conn.execute("ALTER TABLE orders ADD COLUMN status ENUM('PENDING','ASSIGNED','PICKING_UP','DELIVERING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING'"); } catch {}
        try { await conn.execute("ALTER TABLE orders ADD COLUMN address VARCHAR(255) NULL"); } catch {}
        try { await conn.execute("ALTER TABLE orders ADD COLUMN phone VARCHAR(30) NULL"); } catch {}
        try { await conn.execute("ALTER TABLE orders ADD COLUMN total_cents INT NOT NULL DEFAULT 0"); } catch {}
        [ins] = await conn.execute(
          "INSERT INTO orders (user_id, photo_id, quantity, status, address, phone, total_cents) VALUES (?, ?, ?, 'PENDING', ?, ?, ?)",
          [payload.id, photoId, quantity, address, phone, totalCents]
        );
      } else {
        throw e;
      }
    }

    const orderId = ins.insertId

    // history: initial PENDING
    await conn.execute(
      "INSERT INTO order_status_history (order_id, status, changed_by, changed_by_role, note) VALUES (?,?,?,?,?)",
      [orderId, 'PENDING', payload.id, 'USER', 'Order created']
    )

    await conn.commit()

    // broadcast new order for riders (SSE)
    events.emit('new_order', { id: orderId, user_id: payload.id, photo_id: photoId, quantity })

    return { status: true, id: orderId };
  } catch (err) {
    try { await conn.rollback() } catch {}
    throw err
  }
});
