import mysql from 'mysql2/promise'
import { requireRider } from '../../utils/rider'

export default defineEventHandler(async (event) => {
  await requireRider(event)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'webphoto'
  })
  // Ensure new columns exist for rider view
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
    `SELECT o.id, o.user_id, o.photo_id, o.quantity, o.address, o.phone, o.created_at, p.url AS photo_url
     FROM orders o
     JOIN photos p ON p.id = o.photo_id
     WHERE o.status='PENDING' ORDER BY o.id DESC LIMIT 100`
  )
  return rows
})
