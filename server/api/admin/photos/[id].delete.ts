import mysql from 'mysql2/promise'
import { requireAdmin } from '../../../utils/auth'
import { getConn } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'id required' })

  const conn = await getConn()
  try {
    try {
      await conn.execute(
        `CREATE TABLE IF NOT EXISTS photos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          url VARCHAR(1024) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      )
    } catch {}
    await conn.execute('DELETE FROM photos WHERE id = ?', [id])
    return { status: true }
  } finally {
    try { conn.release() } catch {}
  }
})
