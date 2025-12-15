import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  if (!id || typeof body?.is_rider === 'undefined') {
    throw createError({ statusCode: 400, message: 'id and is_rider required' })
  }
  const isRider = body.is_rider ? 1 : 0
  const status = isRider ? 'AVAILABLE' : 'OFFLINE'
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'webphoto'
  })
  await conn.execute('UPDATE users SET is_rider=?, rider_status=? WHERE id=?', [isRider, status, id])
  return { status: true }
})
