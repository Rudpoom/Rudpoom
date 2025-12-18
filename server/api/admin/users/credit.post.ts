import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../utils/auth'
import { getConn } from '../../../utils/db'

async function ensureCreditColumn(conn: mysql.Connection) {
  try {
    // Fast path for MySQL 8+
    await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_cents INT NOT NULL DEFAULT 0")
    return
  } catch (e: any) {
    // Fallback for MySQL versions without IF NOT EXISTS
    try {
      await conn.execute("SELECT credit_cents FROM users LIMIT 1")
      return
    } catch (e2: any) {
      if (e2?.code === 'ER_BAD_FIELD_ERROR') {
        await conn.execute("ALTER TABLE users ADD COLUMN credit_cents INT NOT NULL DEFAULT 0")
        return
      }
      // If it's a different error, rethrow
      throw e2
    }
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const id = body?.id
  const amount = Number(body?.amount || 0)
  if (!id || !Number.isFinite(amount)) {
    throw createError({ statusCode: 400, message: 'id and amount required' })
  }
  const amountCents = Math.round(amount * 100)
  const conn = await getConn()
  try {
    await ensureCreditColumn(conn)
    try {
      await conn.execute('UPDATE users SET credit_cents = credit_cents + ? WHERE id=?', [amountCents, id])
    } catch (e: any) {
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        await ensureCreditColumn(conn)
        await conn.execute('UPDATE users SET credit_cents = credit_cents + ? WHERE id=?', [amountCents, id])
      } else {
        throw e
      }
    }
    return { status: true }
  } finally {
    try { conn.release() } catch {}
  }
})
