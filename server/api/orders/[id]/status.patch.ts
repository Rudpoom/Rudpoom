import mysql from 'mysql2/promise'
import { requireRider } from '../../../utils/rider'
import { getConn } from '../../../utils/db'

const allowed = ['PICKING_UP','DELIVERING','COMPLETED'] as const

export default defineEventHandler(async (event) => {
  const { riderId } = await requireRider(event)
  const idParam = (event.context.params as any)?.id
  const orderId = Number(idParam)
  const body = await readBody(event)
  const status = String(body?.status || '')

  if (!orderId || !allowed.includes(status as any)) {
    throw createError({ statusCode: 400, message: 'Invalid input' })
  }

  const conn = await getConn()
  try {
    await conn.beginTransaction()
    const [rows]: any = await conn.execute('SELECT status, rider_id FROM orders WHERE id=? FOR UPDATE', [orderId])
    const cur = rows?.[0]
    if (!cur) throw createError({ statusCode: 404, message: 'Order not found' })
    if (cur.rider_id !== riderId) throw createError({ statusCode: 403, message: 'Not your order' })

    const validTransitions: any = {
      ASSIGNED: 'PICKING_UP',
      PICKING_UP: 'DELIVERING',
      DELIVERING: 'COMPLETED',
    }
    const expected = validTransitions[cur.status]
    if (expected !== status) {
      throw createError({ statusCode: 409, message: `Invalid transition: expected ${expected}` })
    }

    await conn.execute('UPDATE orders SET status=? WHERE id=?', [status, orderId])
    await conn.execute(
      'INSERT INTO order_status_history (order_id, status, changed_by, changed_by_role) VALUES (?,?,?,?)',
      [orderId, status, riderId, 'RIDER']
    )
    if (status === 'COMPLETED') {
      await conn.execute('UPDATE users SET rider_status="AVAILABLE" WHERE id=?', [riderId])
    }
    await conn.commit()
    return { status: true }
  } catch (e) {
    try { await conn.rollback() } catch {}
    throw e
  } finally {
    try { conn.release() } catch {}
  }
})
