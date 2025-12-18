import mysql from 'mysql2/promise'
import { requireAdmin } from '../../utils/auth'
import { getConn } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const conn = await getConn()
 
  let cols: any[] = []
  try {
    const [cr]: any = await conn.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users'")
    cols = cr
  } catch {}
  const cset = new Set((cols || []).map((c: any) => c.COLUMN_NAME))
  const selectCols = [
    'id',
    cset.has('username') ? 'username' : (cset.has('name') ? 'name AS username' : "'' AS username"),
    cset.has('is_admin') ? 'is_admin' : '0 AS is_admin',
    cset.has('is_rider') ? 'is_rider' : '0 AS is_rider',
    cset.has('rider_status') ? 'rider_status' : "'OFFLINE' AS rider_status",
    cset.has('role') ? 'role' : 'NULL AS role',
    cset.has('credit_cents') ? 'credit_cents' : '0 AS credit_cents'
  ].join(', ')
  
  let rows: any[] = []
  try {
    const [r]: any = await conn.execute(`SELECT ${selectCols} FROM users ORDER BY id ASC`)
    rows = r
  } catch (e: any) {
    if (e?.code === 'ER_NO_SUCH_TABLE') {
      rows = []
    } else {
      throw e
    }
  } finally {
    try { conn.release() } catch {}
  }
  const out = (rows || []).map((u: any) => {
    const username = (u?.username ?? '').toString()
    const role = (u?.role ?? '').toString()
    const isAdmin = Boolean(u?.is_admin) || role === 'ADMIN'
    const isRider = Boolean(u?.is_rider) || role === 'RIDER'
    const riderStatus = (u?.rider_status ?? 'OFFLINE').toString()
    const computedRole = isAdmin ? 'ADMIN' : (isRider ? 'RIDER' : 'USER')
    const credit_cents = Number(u?.credit_cents ?? 0)
    return { id: u.id, username, is_admin: isAdmin, is_rider: isRider, rider_status: riderStatus, role: computedRole, credit_cents }
  })
  return out
})
