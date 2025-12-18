import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../utils/auth'
import { getConn } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const url = (body?.url || '').toString().trim()
  const price = body?.price
  const name = (body?.name || '').toString().trim()
  if (!id) throw createError({ statusCode: 400, message: 'id required' })

  const conn = await getConn()
  try {
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
    if (typeof name !== 'undefined' && name !== null) {
      try {
        await conn.execute('UPDATE photos SET name = ? WHERE id = ?', [name, id])
      } catch (e: any) {
        if (e?.code === 'ER_BAD_FIELD_ERROR') {
          try { await conn.execute("ALTER TABLE photos ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT ''") } catch {}
          await conn.execute('UPDATE photos SET name = ? WHERE id = ?', [name, id])
        } else {
          throw e
        }
      }
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
  } finally {
    try { conn.release() } catch {}
  }
})
