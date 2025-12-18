import mysql from 'mysql2/promise'

const host = process.env.DB_HOST || '127.0.0.1'
const user = process.env.DB_USER || 'root'
const password = process.env.DB_PASS || ''
const database = process.env.DB_NAME || 'shopdb'

export const pool = mysql.createPool({
  host,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export async function getConn() {
  return await pool.getConnection()
}
