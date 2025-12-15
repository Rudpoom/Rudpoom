import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const amount = Number(body?.amount || 0)
  if (!id || !Number.isFinite(amount)) {
    throw createError({ statusCode: 400, message: 'id and amount required' })
  }
  const amountCents = Math.round(amount * 100)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'webphoto'
  })
  try { await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_cents INT NOT NULL DEFAULT 0"); } catch {}
  await conn.execute('UPDATE users SET credit_cents = credit_cents + ? WHERE id=?', [amountCents, id])
  return { status: true }
})

