import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const url = (body?.url || '').toString().trim()
  const price = body?.price
  if (!id) throw createError({ statusCode: 400, message: 'id required' })

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
  if (url) {
    await conn.execute('UPDATE photos SET url = ? WHERE id = ?', [url, id])
  }
  if (typeof price !== 'undefined' && price !== null && price !== '') {
    const priceCents = Math.max(0, Math.round(Number(price) * 100))
    try {
      await conn.execute('UPDATE photos SET price_cents = ? WHERE id = ?', [priceCents, id])
    } catch (e: any) {
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        try { await conn.execute('ALTER TABLE photos ADD COLUMN price_cents INT NOT NULL DEFAULT 0') } catch {}
        await conn.execute('UPDATE photos SET price_cents = ? WHERE id = ?', [priceCents, id])
      } else {
        throw e
      }
    }
  }
  return { status: true }
})
