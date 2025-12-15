import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default defineEventHandler(async (event) => {
  const body: any = await readBody(event);
  const usernameInput = String(body?.username || "").trim();
  const passwordInput = String(body?.password || "");

  const host = process.env.DB_HOST || "127.0.0.1";
  const dbUser = process.env.DB_USER || "root";
  const dbPass = process.env.DB_PASS || "";
  const dbName = process.env.DB_NAME || "webphoto";

  // Best-effort: ensure database exists
  try {
    const admin = await mysql.createConnection({ host, user: dbUser, password: dbPass });
    try {
      const sql = "CREATE DATABASE IF NOT EXISTS `" + dbName + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
      await admin.execute(sql);
    } finally {
      await admin.end();
    }
  } catch {}

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({ host, user: dbUser, password: dbPass, database: dbName });
  } catch (e) {
    // Avoid 500 if DB is unavailable
    return { status: false };
  }

  // Ensure users table/columns exist (tolerate alternate schemas)
  try {
    await conn.execute(
      "CREATE TABLE IF NOT EXISTS users (" +
      "id INT AUTO_INCREMENT PRIMARY KEY," +
      "username VARCHAR(191) NULL," +
      "password VARCHAR(255) NULL," +
      "is_admin TINYINT(1) NOT NULL DEFAULT 0," +
      "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP" +
      ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
  } catch {}
  try { await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) NULL"); } catch {}

  // Determine login field
  let cols: any[] = [];
  try {
    const r: any = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users'"
    );
    cols = r[0];
  } catch {}
  const cset = new Set((cols || []).map((c: any) => c.COLUMN_NAME));
  const field = cset.has("username") ? "username" : (cset.has("name") ? "name" : "username");
  const selectCols = [
    "id",
    field + " AS uname",
    (cset.has("password") ? "password" : "NULL AS password"),
    (cset.has("role") ? "role" : "NULL AS role"),
    (cset.has("is_admin") ? "is_admin" : "0 AS is_admin"),
    (cset.has("is_rider") ? "is_rider" : "0 AS is_rider")
  ].join(", ");

  // Read user row
  let rows: any[] = [];
  try {
    const r: any = await conn.execute(
      "SELECT " + selectCols + " FROM users WHERE " + field + " = ? LIMIT 1",
      [usernameInput]
    );
    rows = r[0];
  } catch (e: any) {
    if (e?.code === "ER_NO_SUCH_TABLE") {
      try {
        await conn.execute(
          "CREATE TABLE IF NOT EXISTS users (" +
          "id INT AUTO_INCREMENT PRIMARY KEY," +
          "username VARCHAR(191) NULL," +
          "password VARCHAR(255) NULL," +
          "is_admin TINYINT(1) NOT NULL DEFAULT 0," +
          "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP" +
          ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
      } catch {}
      rows = [];
    } else {
      // Any DB failure => no 500
      return { status: false };
    }
  }

  const user = rows && rows[0];
  if (!user) return { status: false };

  const storedHash = typeof user.password === "string" ? user.password : "";
  let match = false;
  try { if (storedHash) match = await bcrypt.compare(passwordInput, storedHash); } catch {}
  if (!match) return { status: false };

  const roleVal = user?.role as string | undefined;
  const isAdmin = Boolean(user?.is_admin) || roleVal === "ADMIN";
  const isRider = Boolean(user?.is_rider) || roleVal === "RIDER";
  const uname = user?.uname || "";
  const token = jwt.sign({ id: user.id, username: uname, admin: isAdmin, rider: isRider }, "secret123");

  try { await (conn as mysql.Connection).end(); } catch {}
  return { status: true, token, admin: isAdmin, rider: isRider };
});

