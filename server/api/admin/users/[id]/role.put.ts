import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../../utils/auth'
import { getConn } from '../../../../utils/db'

const ROLES = new Set(['USER','RIDER','ADMIN'])

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const role = String(body?.role || '').toUpperCase()
  if (!id || !ROLES.has(role)) {
    throw createError({ statusCode: 400, message: 'id and valid role required' })
  }

  const conn = await getConn()
  try {
    // Try boolean-flag schema first
    try {
      const isAdmin = role === 'ADMIN' ? 1 : 0
      const isRider = role === 'RIDER' ? 1 : 0
      const riderStatus = role === 'RIDER' ? 'AVAILABLE' : 'OFFLINE'
      await conn.execute('UPDATE users SET is_admin=?, is_rider=?, rider_status=? WHERE id=?', [isAdmin, isRider, riderStatus, id])
      return { status: true }
    } catch (e: any) {
      if (e?.code !== 'ER_BAD_FIELD_ERROR') throw e
    }

    // Fallback to role enum schema
    await conn.execute('UPDATE users SET role=? WHERE id=?', [role, id])
    return { status: true }
  } finally {
    try { conn.release() } catch {}
  }
})
