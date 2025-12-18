import mysql from 'mysql2/promise'
import { getConn } from '../utils/db'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  let token = getHeader(event, 'authorization') as string | undefined
  if (!token) throw createError({ statusCode: 401, message: 'Unauthorized' })
  if (token.startsWith('Bearer ')) token = token.slice(7)
  let payload: any
  try {
    payload = jwt.verify(token, 'secret123')
  } catch {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  try {
    const conn = await getConn()
   
    let rows: any[] = []
    let colRows: any[] = []
    try {
      const [cr]: any = await conn.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users'")
      colRows = cr
    } catch {}
    const cset = new Set((colRows || []).map((x: any) => x.COLUMN_NAME))
    const hasUsername = cset.has('username')
    const hasName = cset.has('name')
    const usernameExpr = hasUsername && hasName
      ? 'COALESCE(username, name) AS username'
      : (hasUsername ? 'username AS username' : (hasName ? 'name AS username' : "'' AS username"))
    const creditExpr = cset.has('credit_cents') ? 'credit_cents' : '0 AS credit_cents'
    const adminExpr = cset.has('is_admin') ? 'is_admin' : '0 AS is_admin'
    const riderExpr = cset.has('is_rider') ? 'is_rider' : '0 AS is_rider'
    const roleExpr = cset.has('role') ? 'role' : 'NULL AS role'
    const selectCols = [usernameExpr, creditExpr, adminExpr, riderExpr, roleExpr].join(', ')
    const [r]: any = await conn.execute(`SELECT ${selectCols} FROM users WHERE id=?`, [payload.id])
    rows = r
    const u = rows?.[0] || {}
    try { conn.release() } catch {}
    const role = (u?.role ?? '').toString()
    const admin = Boolean(u?.is_admin) || role === 'ADMIN'
    const rider = Boolean(u?.is_rider) || role === 'RIDER'
    return { id: payload.id, username: u?.username || '', credit_cents: Number(u?.credit_cents || 0), admin, rider }
  } catch {
 
    const admin = Boolean((payload as any)?.admin)
    const rider = Boolean((payload as any)?.rider)
    const username = String((payload as any)?.username || '')
    return { id: payload.id, username, credit_cents: 0, admin, rider }
  }
})
