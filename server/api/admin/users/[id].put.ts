import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../utils/auth'
import { getConn } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  if (!id || typeof body?.is_admin === 'undefined') {
    throw createError({ statusCode: 400, message: 'id and is_admin required' })
  }
  const isAdmin = body.is_admin ? 1 : 0

  const conn = await getConn()
  try {
    try {
      await conn.execute('UPDATE users SET is_admin = ? WHERE id = ?', [isAdmin, id])
    } catch (e: any) {
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        const role = isAdmin ? 'ADMIN' : 'USER'
        await conn.execute('UPDATE users SET role = ? WHERE id = ?', [role, id])
      } else {
        throw e
      }
    }
    return { status: true }
  } finally {
    try { conn.release() } catch {}
  }
})
