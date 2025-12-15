import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const url = (body?.url || '').toString().trim()
  const price = Number(body?.price || 0)
  if (!url) {
    throw createError({ statusCode: 400, message: 'url is required' })
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'webphoto'
  })
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
  const priceCents = Math.max(0, Math.round(price * 100))
  let result: any
  try {
    const [r]: any = await conn.execute('INSERT INTO photos (url, price_cents) VALUES (?, ?)', [url, priceCents])
    result = r
  } catch (e: any) {
    if (e?.code === 'ER_BAD_FIELD_ERROR') {
      try { await conn.execute('ALTER TABLE photos ADD COLUMN price_cents INT NOT NULL DEFAULT 0') } catch {}
      const [r2]: any = await conn.execute('INSERT INTO photos (url, price_cents) VALUES (?, ?)', [url, priceCents])
      result = r2
    } else {
      throw e
    }
  }
  return { status: true, id: result.insertId }
})
