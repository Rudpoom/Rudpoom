import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../utils/auth'
import { getConn } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const url = (body?.url || '').toString().trim()
  const name = (body?.name || '').toString().trim()
  const price = Number(body?.price || 0)
  if (!url) {
    throw createError({ statusCode: 400, message: 'url is required' })
  }

  const conn = await getConn()
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
        )
      } catch {}
      try { await conn.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS price_cents INT NOT NULL DEFAULT 0"); } catch {}
      try { await conn.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT ''"); } catch {}
    const priceCents = Math.max(0, Math.round(price * 100))
    let result: any
    try {
      const [r]: any = await conn.execute('INSERT INTO photos (url, price_cents, name) VALUES (?, ?, ?)', [url, priceCents, name])
      result = r
    } catch (e: any) {
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        try { await conn.execute('ALTER TABLE photos ADD COLUMN price_cents INT NOT NULL DEFAULT 0') } catch {}
        const [r2]: any = await conn.execute('INSERT INTO photos (url, price_cents, name) VALUES (?, ?, ?)', [url, priceCents, name])
        result = r2
      } else {
        throw e
      }
    }
    return { status: true, id: result.insertId }
  } finally {
    try { conn.release() } catch {}
  }
})
