import mysql from 'mysql2/promise'
import { requireRider } from '../../utils/rider'
import { getConn } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const { riderId } = await requireRider(event)
  const conn = await getConn()
  try {
    try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS address VARCHAR(255) NULL"); } catch {}
    try { await conn.execute("ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL"); } catch {}
    // Ensure photos table exists for join
    try { await conn.execute(
      `CREATE TABLE IF NOT EXISTS photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        url VARCHAR(1024) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    ) } catch {}

    const [rows]: any = await conn.execute(
    `SELECT o.id, o.user_id, o.photo_id, o.quantity, o.address, o.phone, o.status, o.created_at, p.url AS photo_url
     FROM orders o
     JOIN photos p ON p.id = o.photo_id
     WHERE o.rider_id=? AND o.status IN ('ASSIGNED','PICKING_UP','DELIVERING')
     ORDER BY o.id DESC`,
    [riderId]
  )
    return rows
  } finally {
    try { conn.release() } catch {}
  }
})
