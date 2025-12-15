import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

async function ensureDatabaseAndUsersTable() {
  const host = process.env.DB_HOST || "127.0.0.1";
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASS || "";
  const dbName = process.env.DB_NAME || "webphoto";

  const admin = await mysql.createConnection({ host, user, password });
  try {
    await admin.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await admin.end();
  }

  const conn = await mysql.createConnection({ host, user, password, database: dbName });
  try {
    await conn.execute(
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(191) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        is_admin TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );

    const [cols]: any = await conn.execute(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users'"
    );
    const colNames = new Set((cols || []).map((c: any) => c.COLUMN_NAME));
    if (!colNames.has("password")) {
      await conn.execute("ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL");
    }
  } finally {
    await conn.end();
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');

  if (!username || !password || username.length < 3 || password.length < 4) {
    throw createError({ statusCode: 400, message: 'กรุณากรอกชื่อผู้ใช้/รหัสผ่านให้ถูกต้อง (ยาวอย่างน้อย 3/4 ตัวอักษร)' });
  }

  const host = process.env.DB_HOST || "127.0.0.1";
  const dbUser = process.env.DB_USER || "root";
  const dbPass = process.env.DB_PASS || "";
  const dbName = process.env.DB_NAME || "webphoto";

  let conn: any;
  try {
    conn = await mysql.createConnection({ host, user: dbUser, password: dbPass, database: dbName });
  } catch (e: any) {
    if (e?.code === 'ER_BAD_DB_ERROR') {
      await ensureDatabaseAndUsersTable();
      conn = await mysql.createConnection({ host, user: dbUser, password: dbPass, database: dbName });
    } else if (e?.code === 'ECONNREFUSED') {
      throw createError({ statusCode: 500, message: 'เชื่อมต่อฐานข้อมูลไม่ได้ (MySQL ไม่ได้ทำงาน)' });
    } else if (e?.code === 'ER_ACCESS_DENIED_ERROR') {
      throw createError({ statusCode: 500, message: 'เชื่อมต่อฐานข้อมูลไม่ได้ (user/password ไม่ถูกต้อง)' });
    } else {
      throw createError({ statusCode: 500, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' });
    }
  }

  try {
    await ensureDatabaseAndUsersTable();
  } catch {
    // ignore
  }

  const hash = await bcrypt.hash(password, 10);

  const [cols]: any = await conn.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users'"
  );
  const names = new Set((cols || []).map((c: any) => c.COLUMN_NAME));
  const hasUsername = names.has('username');
  const hasName = names.has('name');
  const hasPassword = names.has('password');

  if (!hasPassword) {
    try { await conn.execute("ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL"); } catch {}
  }

  try {
    // Prevent duplicate usernames even if schema lacks unique constraint
    if (hasUsername || hasName) {
      const field = hasUsername ? 'username' : 'name';
      const [exists]: any = await conn.execute(`SELECT 1 FROM users WHERE ${field} = ? LIMIT 1`, [username]);
      if (Array.isArray(exists) && exists.length > 0) {
        throw createError({ statusCode: 409, message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
      }
    }

    if (hasUsername) {
      await conn.execute(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hash]
      );
    } else if (hasName) {
      await conn.execute(
        "INSERT INTO users (name, password) VALUES (?, ?)",
        [username, hash]
      );
    } else {
      await conn.execute(
        `CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(191) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          is_admin TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
      await conn.execute(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hash]
      );
    }
  } catch (e: any) {
    if (e?.statusCode) {
      // Re-throw handled HTTP errors (e.g., duplicate username)
      throw e;
    }
    if (e?.code === 'ER_NO_SUCH_TABLE') {
      await ensureDatabaseAndUsersTable();
      await conn.execute(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hash]
      );
    } else if (e?.code === 'ER_DUP_ENTRY') {
      throw createError({ statusCode: 409, message: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });
    } else {
      throw createError({ statusCode: 500, message: 'สมัครสมาชิกไม่สำเร็จ (ข้อผิดพลาดภายในระบบ)' });
    }
  } finally {
    await conn.end();
  }

  return { status: true };
});
