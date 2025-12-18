import mysql from 'mysql2/promise'
import { requireRider } from '../../utils/rider'
import { getConn } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const { riderId } = await requireRider(event)
  const body = await readBody(event)
  const orderId = Number(body?.order_id)
  if (!orderId) {
    throw createError({ statusCode: 400, message: 'Invalid order_id' })
  }

  const conn = await getConn()
  try {
    await conn.beginTransaction()
    const [rows]: any = await conn.execute('SELECT status FROM orders WHERE id=? FOR UPDATE', [orderId])
    const o = rows?.[0]
    if (!o) throw createError({ statusCode: 404, message: 'Order not found' })
    if (o.status !== 'PENDING') throw createError({ statusCode: 409, message: 'Order not pending' })

    await conn.execute('UPDATE orders SET rider_id=?, status="ASSIGNED" WHERE id=?', [riderId, orderId])
    await conn.execute('UPDATE users SET rider_status="BUSY" WHERE id=?', [riderId])
    await conn.execute(
      'INSERT INTO order_status_history (order_id, status, changed_by, changed_by_role, note) VALUES (?,?,?,?,?)',
      [orderId, 'ASSIGNED', riderId, 'RIDER', 'Rider accepted']
    )
    await conn.commit()
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    try { conn.release() } catch {}
  }
  return { status: true }
})
