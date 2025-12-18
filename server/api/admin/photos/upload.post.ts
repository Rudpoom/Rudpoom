import fs from 'fs/promises'
import path from 'path'
import { requireAdmin } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event)
  const name = String(body?.name || '').replace(/[^a-zA-Z0-9._-]/g, '_')
  let data = String(body?.data || '')
  if (!name || !data) throw createError({ statusCode: 400, message: 'name and data required' })

  // Remove data URL prefix if present
  const m = data.match(/^data:([a-zA-Z0-9+/.-]+);base64,(.*)$/)
  if (m) data = m[2]

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  try { await fs.mkdir(uploadsDir, { recursive: true }) } catch {}

  const timestamp = Date.now()
  const outName = `${timestamp}_${name}`
  const outPath = path.join(uploadsDir, outName)
  const buffer = Buffer.from(data, 'base64')
  await fs.writeFile(outPath, buffer)

  // Return web-accessible path
  const webPath = `/uploads/${outName}`
  return { url: webPath }
})