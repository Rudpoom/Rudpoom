const express = require('express');
const http = require('http');
const cors = require('cors');
const { pool } = require('./db');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

// Socket.IO: riders join a room to receive new orders
io.on('connection', (socket) => {
  socket.on('joinAsRider', (riderId) => {
    socket.join('riders');
    socket.data.riderId = riderId;
  });
  socket.on('disconnect', () => {});
});

// Helper: record history
async function addHistory(conn, orderId, status, changedBy, changedByRole, note = null) {
  await conn.execute(
    'INSERT INTO order_status_history (order_id, status, changed_by, changed_by_role, note) VALUES (?,?,?,?,?)',
    [orderId, status, changedBy, changedByRole, note]
  );
}

// Create an order (User)
app.post('/orders', async (req, res) => {
  const {
    user_id,
    restaurant_name,
    pickup_lat,
    pickup_lng,
    dropoff_lat,
    dropoff_lng,
    address_pickup,
    address_dropoff,
    note,
    items = [],
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.execute(
      `INSERT INTO orders (user_id, restaurant_name, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, address_pickup, address_dropoff, note, status)
       VALUES (?,?,?,?,?,?,?,?,?, 'PENDING')`,
      [user_id, restaurant_name, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, address_pickup, address_dropoff, note]
    );
    const orderId = r.insertId;

    for (const it of items) {
      await conn.execute(
        'INSERT INTO order_items (order_id, name, qty, price_cents) VALUES (?,?,?,?)',
        [orderId, it.name, it.qty || 1, it.price_cents || 0]
      );
    }

    await addHistory(conn, orderId, 'PENDING', user_id, 'USER', 'Order created');
    await conn.commit();

    // Broadcast to all riders
    io.to('riders').emit('new_order', {
      id: orderId,
      restaurant_name,
      pickup: { lat: pickup_lat, lng: pickup_lng, address: address_pickup },
      dropoff: { lat: dropoff_lat, lng: dropoff_lng, address: address_dropoff },
      note,
    });

    res.status(201).json({ id: orderId });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'failed_to_create_order' });
  } finally {
    conn.release();
  }
});

// Rider accepts an order (claim)
app.post('/orders/:id/accept', async (req, res) => {
  const orderId = req.params.id;
  const { rider_id } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Only accept if still PENDING
    const [rows] = await conn.execute('SELECT status, rider_id FROM orders WHERE id=? FOR UPDATE', [orderId]);
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
    const row = rows[0];
    if (row.status !== 'PENDING') return res.status(409).json({ error: 'order_not_pending' });

    await conn.execute('UPDATE orders SET rider_id=?, status="ASSIGNED" WHERE id=?', [rider_id, orderId]);
    await conn.execute('UPDATE riders SET status="BUSY" WHERE id=?', [rider_id]);
    await addHistory(conn, orderId, 'ASSIGNED', rider_id, 'RIDER', 'Rider accepted');
    await conn.commit();

    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'failed_to_accept' });
  } finally {
    conn.release();
  }
});

// Rider updates status: PICKING_UP -> DELIVERING -> COMPLETED
app.patch('/orders/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const { rider_id, status } = req.body; // expected: PICKING_UP | DELIVERING | COMPLETED
  const allowed = ['PICKING_UP', 'DELIVERING', 'COMPLETED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid_status' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT status, rider_id FROM orders WHERE id=? FOR UPDATE', [orderId]);
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
    const current = rows[0];
    if (current.rider_id !== rider_id) return res.status(403).json({ error: 'not_assigned_to_rider' });

    // Validate transition
    const validTransitions = {
      ASSIGNED: 'PICKING_UP',
      PICKING_UP: 'DELIVERING',
      DELIVERING: 'COMPLETED',
    };
    const expected = validTransitions[current.status];
    if (expected !== status) return res.status(409).json({ error: 'invalid_transition', expected });

    await conn.execute('UPDATE orders SET status=? WHERE id=?', [status, orderId]);
    await addHistory(conn, orderId, status, rider_id, 'RIDER', null);

    // If completed, free the rider
    if (status === 'COMPLETED') {
      await conn.execute('UPDATE riders SET status="AVAILABLE" WHERE id=?', [rider_id]);
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: 'failed_to_update_status' });
  } finally {
    conn.release();
  }
});

// List rider active orders
app.get('/riders/:id/orders', async (req, res) => {
  const riderId = req.params.id;
  const [rows] = await pool.execute(
    `SELECT * FROM orders WHERE rider_id=? AND status IN ('ASSIGNED','PICKING_UP','DELIVERING') ORDER BY id DESC`,
    [riderId]
  );
  res.json(rows);
});

// For riders to see new available orders (if you want polling instead of sockets)
app.get('/orders/available', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, restaurant_name, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, address_pickup, address_dropoff, note
     FROM orders WHERE status='PENDING' ORDER BY id DESC LIMIT 50`
  );
  res.json(rows);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Server listening on', PORT);
});

