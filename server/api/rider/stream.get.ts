import type { H3Event } from 'h3'
import { events } from '../../utils/events'
import { requireRider } from '../../utils/rider'

function writeSse(res: any, event: string, data: any) {
  res.write(`event: ${event}\n`)
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export default defineEventHandler(async (event: H3Event) => {
  await requireRider(event)
  const res: any = event.node.res
  const req: any = event.node.req

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const onNewOrder = (payload: any) => writeSse(res, 'new_order', payload)
  events.on('new_order', onNewOrder)

  // Heartbeat
  const hb = setInterval(() => writeSse(res, 'ping', Date.now()), 25000)

  req.on('close', () => {
    clearInterval(hb)
    events.off('new_order', onNewOrder)
  })
})

