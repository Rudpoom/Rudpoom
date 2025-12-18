import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import { getConn } from './db'

export async function requireAdmin(event: any) {
  let token = getHeader(event, 'authorization') as string | undefined
  if (!token) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  // Support both raw token and "Bearer <token>"
  if (token.startsWith('Bearer ')) token = token.slice(7)
  let payload: any
  try {
    payload = jwt.verify(token, 'secret123')
  } catch {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (payload?.admin) {
    return { userId: payload.id }
  }

  // JWT ไม่ได้ระบุ admin: ตรวจใน DB แบบทนทานและไม่โยน 500 หาก DB มีปัญหา
  let isAdmin = false
  try {
    const conn = await getConn()
    try {
      // ตรวจคอลัมน์ที่มีจริง
      let cols: any[] = []
      try {
        const [cr]: any = await conn.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users'")
        cols = cr
      } catch {}
      const cset = new Set((cols || []).map((c: any) => c.COLUMN_NAME))
      const selectCols = [
        cset.has('is_admin') ? 'is_admin' : '0 AS is_admin',
        cset.has('role') ? 'role' : 'NULL AS role'
      ].join(', ')
      const [rows]: any = await conn.execute(`SELECT ${selectCols} FROM users WHERE id = ?`, [payload.id])
      const user = rows?.[0] || {}
      const role = (user?.role ?? '').toString()
      isAdmin = Boolean(user?.is_admin) || role === 'ADMIN'
    } finally {
      try { conn.release() } catch {}
    }
  } catch {
    // ถ้า DB ใช้งานไม่ได้ ให้ปฏิเสธด้วย 403 (ไม่ใช่ 500)
    isAdmin = false
  }
  if (!isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin only' })
  }
  return { userId: payload.id }
}
