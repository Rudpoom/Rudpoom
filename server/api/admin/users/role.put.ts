import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../utils/auth'

const ROLES = new Set(['USER','RIDER','ADMIN'])

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const id = String(body?.id || '')
  const role = String(body?.role || '').toUpperCase()
  if (!id || !ROLES.has(role)) {
    throw createError({ statusCode: 400, message: 'id and valid role required' })
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'webphoto'
  })

  try {
    const isAdmin = role === 'ADMIN' ? 1 : 0
    const isRider = role === 'RIDER' ? 1 : 0
    const riderStatus = role === 'RIDER' ? 'AVAILABLE' : 'OFFLINE'
    await conn.execute('UPDATE users SET is_admin=?, is_rider=?, rider_status=? WHERE id=?', [isAdmin, isRider, riderStatus, id])
    return { status: true }
  } catch (e: any) {
    if (e?.code !== 'ER_BAD_FIELD_ERROR') throw e
  }

  await conn.execute('UPDATE users SET role=? WHERE id=?', [role, id])
  return { status: true }
})

