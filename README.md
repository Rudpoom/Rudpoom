Rider System Integration (Nuxt server + MySQL)

Overview
- เมื่อผู้ใช้สั่งซื้อ (`POST /api/order`): ระบบบันทึกสถานะเริ่มต้น `PENDING` และบันทึกประวัติลง `order_status_history` พร้อม “เด้ง” ไปยังไรเดอร์ผ่าน SSE (`GET /api/rider/stream`).
- ไรเดอร์สามารถดูงานว่าง, รับงาน, และอัปเดตสถานะตามลำดับ: `ASSIGNED` → `PICKING_UP` → `DELIVERING` → `COMPLETED`.

SQL (webphoto)
- นำเข้า schema เดิม: `sql/init.sql`
- ต่อด้วยส่วนขยายไรเดอร์: `sql/rider.sql`
  - เพิ่ม `users.is_rider`, `users.rider_status`, `orders.rider_id`, `orders.status`
  - ตารางใหม่ `order_status_history`

API (Nuxt server)
- GET `/api/rider/available` (auth: rider) — ออเดอร์ว่าง `PENDING`
- GET `/api/rider/orders` (auth: rider) — งานที่ไรเดอร์กำลังทำ
- POST `/api/rider/accept` (auth: rider) — รับงาน: body `{ order_id }`
- PATCH `/api/orders/:id/status` (auth: rider) — อัปเดตสถานะ: body `{ status }`, ค่าอนุญาต: `PICKING_UP|DELIVERING|COMPLETED`
- GET `/api/rider/stream` (auth: rider) — SSE รับอีเวนต์ `new_order` แบบเรียลไทม์

Auth
- `POST /api/login` ตอนนี้ response จะมี `{ rider: boolean }` เพิ่มเติม และ token จะฝัง `rider` claim เพื่อใช้ตรวจสอบสิทธิ์ไรเดอร์

ไฟล์ที่เกี่ยวข้อง
- SQL: `sql/rider.sql:1`
- Handler สร้างออเดอร์ + broadcast: `server/api/order.post.ts:1`
- Rider endpoints:
  - `server/api/rider/available.get.ts:1`
  - `server/api/rider/orders.get.ts:1`
  - `server/api/rider/accept.post.ts:1`
  - `server/api/orders/[id]/status.patch.ts:1`
  - SSE: `server/api/rider/stream.get.ts:1`
- Utils: `server/utils/rider.ts:1`, `server/utils/events.ts:1`

หมายเหตุ
- มีตัวอย่างเซิร์ฟเวอร์ Express แยกต่างหากใน `src/` และสคีมาสำหรับ DB อื่นใน `sql/schema.mysql.sql` (ตัวเลือกเสริม). การทำงานหลักของโปรเจกต์นี้ผูกกับฐาน `webphoto` ตามไฟล์ใน `server/` และ `sql/rider.sql`.

"# shop" 
