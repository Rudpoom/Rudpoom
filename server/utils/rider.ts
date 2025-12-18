import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import { getConn } from './db'

export async function requireRider(event: any) {
  let token = getHeader(event, 'authorization') as string | undefined
  if (!token) {
    const q: any = getQuery(event)
    token = q?.token as string | undefined
  }
  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  let payload: any
  try {
    payload = jwt.verify(token, 'secret123')
  } catch {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Fast-path using token if rider claim present
  if (payload?.rider) {
    return { riderId: payload.id }
  }

  const conn = await getConn()
  try {
    const [rows]: any = await conn.execute('SELECT id FROM users WHERE id=? AND is_rider=1', [payload.id])
    const user = rows?.[0]
    if (!user) {
      throw createError({ statusCode: 403, message: 'Rider only' })
    }
    return { riderId: payload.id }
  } finally {
    try { conn.release() } catch {}
  }
}
