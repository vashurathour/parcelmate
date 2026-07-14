const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');
const { auth, role } = require('../middleware/auth');
const { calculatePrice } = require('../services/pricing');
const { createRazorpayOrder, getCheckoutConfig } = require('../services/payment');
const { sendOTP, sendStatusUpdate } = require('../services/sms');

const genOTP    = () => Math.floor(100000 + Math.random() * 900000).toString();
const genNumber = () => 'PM' + Date.now().toString().slice(-8);

const STATUS_FLOW = {
  pending:          ['confirmed', 'cancelled'],
  confirmed:        ['picked_up', 'cancelled'],
  picked_up:        ['in_transit'],
  in_transit:       ['out_for_delivery'],
  out_for_delivery: ['delivered'],
};

const STATUS_TITLES = {
  confirmed:        'Boy assigned',
  picked_up:        'Parcel picked up',
  in_transit:       'In transit with courier',
  out_for_delivery: 'Out for delivery',
  delivered:        'Delivered ✓',
  cancelled:        'Cancelled',
};

// ── GET /api/orders ─────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const { status, limit = 50 } = req.query;
    const statusFilter = status ? 'AND o.status=?' : '';
    const statusParam = status ? [status] : [];
    let orders;

    if (req.user.role === 'admin') {
      orders = db.prepare(`SELECT o.*,u.name sender_name,b.name boy_name,p.name partner_name
        FROM orders o LEFT JOIN users u ON o.sender_id=u.id
        LEFT JOIN users b ON o.assigned_boy_id=b.id LEFT JOIN partners p ON o.partner_id=p.id
        WHERE 1=1 ${statusFilter} ORDER BY o.created_at DESC LIMIT ?`)
        .all(...statusParam, parseInt(limit));
    } else if (req.user.role === 'delivery_boy') {
      const boy = db.prepare('SELECT city FROM users WHERE id=?').get(req.user.id);
      orders = db.prepare(`SELECT o.*,u.name sender_name FROM orders o LEFT JOIN users u ON o.sender_id=u.id
        WHERE (o.assigned_boy_id=? OR (o.status='pending' AND o.pickup_city=?)) ${statusFilter}
        ORDER BY o.created_at DESC LIMIT ?`)
        .all(req.user.id, boy?.city || '', ...statusParam, parseInt(limit));
    } else {
      orders = db.prepare(`SELECT o.*,b.name boy_name,b.phone boy_phone FROM orders o
        LEFT JOIN users b ON o.assigned_boy_id=b.id
        WHERE o.sender_id=? ${statusFilter} ORDER BY o.created_at DESC LIMIT ?`)
        .all(req.user.id, ...statusParam, parseInt(limit));
    }
    res.json({ orders, count: orders.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/orders/estimate ───────────────────────────────────────────────
router.post('/estimate', auth, async (req, res) => {
  try {
    const { from_city, to_city, weight, parcel_type, is_fragile, promo_code } = req.body;
    const pricing = calculatePrice({ weight, fromCity: from_city, toCity: to_city, parcelType: parcel_type, isFragile: is_fragile });

    let discount = 0;
    let promoMsg = null;
    if (promo_code) {
      const db = await getDb();
      const promo = db.prepare("SELECT * FROM promo_codes WHERE code=? AND is_active=1 AND uses_left>0").get(promo_code.toUpperCase());
      if (promo) {
        discount = promo.discount_type === 'percent'
          ? Math.min(Math.round(pricing.total * promo.discount_value / 100), promo.max_discount)
          : Math.min(promo.discount_value, promo.max_discount);
        if (pricing.total >= promo.min_order) promoMsg = `Promo applied: -₹${discount}`;
        else { discount = 0; promoMsg = `Minimum order ₹${promo.min_order} required`; }
      } else promoMsg = 'Invalid or expired promo code';
    }
    res.json({ pricing, discount, final_total: pricing.total - discount, promo_message: promoMsg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/orders ────────────────────────────────────────────────────────
router.post('/', auth, role('customer'), async (req, res) => {
  try {
    const {
      receiver_name, receiver_phone, receiver_address, receiver_city,
      parcel_type, parcel_weight, parcel_description, parcel_value, is_fragile,
      pickup_address, pickup_city, payment_method = 'online',
      special_instructions, promo_code
    } = req.body;

    if (!receiver_name || !receiver_phone || !receiver_address || !receiver_city || !pickup_address || !pickup_city)
      return res.status(400).json({ error: 'All address and receiver fields are required' });
    if (!/^\d{10}$/.test(receiver_phone))
      return res.status(400).json({ error: 'Receiver phone must be 10 digits' });

    const db = await getDb();
    const pricing = calculatePrice({
      weight: parcel_weight || 0.5, fromCity: pickup_city, toCity: receiver_city,
      parcelType: parcel_type, isFragile: !!is_fragile
    });

    // Apply promo
    let discount = 0;
    if (promo_code) {
      const promo = db.prepare("SELECT * FROM promo_codes WHERE code=? AND is_active=1 AND uses_left>0").get(promo_code.toUpperCase());
      if (promo && pricing.total >= promo.min_order) {
        discount = promo.discount_type === 'percent'
          ? Math.min(Math.round(pricing.total * promo.discount_value / 100), promo.max_discount)
          : Math.min(promo.discount_value, promo.max_discount);
        db.prepare('UPDATE promo_codes SET uses_left=uses_left-1 WHERE code=?').run(promo_code.toUpperCase());
      }
    }

    const finalTotal = pricing.total - discount;
    const id = uuidv4();
    const potp = genOTP(), dotp = genOTP();
    const orderNum = genNumber();

    db.prepare(`INSERT INTO orders (id,order_number,sender_id,receiver_name,receiver_phone,receiver_address,receiver_city,parcel_type,parcel_weight,parcel_description,parcel_value,is_fragile,pickup_address,pickup_city,status,subtotal,tax,total_price,payment_method,pickup_otp,delivery_otp,special_instructions,estimated_delivery)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, orderNum, req.user.id, receiver_name, receiver_phone, receiver_address, receiver_city,
        parcel_type || 'general', parcel_weight || 0.5, parcel_description || '',
        parcel_value || 0, is_fragile ? 1 : 0, pickup_address, pickup_city,
        payment_method === 'cod' ? 'pending' : 'pending',
        pricing.subtotal, pricing.tax, finalTotal, payment_method, potp, dotp,
        special_instructions || '',
        new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    db.prepare('INSERT INTO tracking_events (id,order_id,status,title,description,location,actor_name) VALUES (?,?,?,?,?,?,?)')
      .run(uuidv4(), id, 'pending', 'Order placed', 'Your parcel booking is confirmed', pickup_city, req.user.name);

    // Send OTP SMS
    await sendOTP(req.user.phone, potp, 'pickup');

    // Create Razorpay order if online payment
    let razorpayData = null;
    if (payment_method === 'online') {
      try {
        const rzpOrder = await createRazorpayOrder({ orderId: id, amount: finalTotal, notes: { order_number: orderNum } });
        db.prepare('UPDATE orders SET razorpay_order_id=? WHERE id=?').run(rzpOrder.id, id);
        razorpayData = getCheckoutConfig({
          razorpayOrderId: rzpOrder.id,
          amount: finalTotal,
          name: req.user.name,
          phone: req.user.phone,
          description: `Parcel ${orderNum} — ${pickup_city} to ${receiver_city}`,
        });
      } catch (e) {
        console.error('Razorpay order creation failed:', e.message);
        // Don't fail the order — allow retry
      }
    }

    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
    res.status(201).json({
      message: 'Order booked successfully',
      order,
      pickup_otp: potp,
      pricing: { ...pricing, discount, final_total: finalTotal },
      razorpay: razorpayData,
      payment_note: payment_method === 'cod' ? 'Pay cash on delivery' : 'Complete payment to confirm',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/orders/:id ─────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const db = await getDb();
    const order = db.prepare(`SELECT o.*,u.name sender_name,u.phone sender_phone_raw,
      b.name boy_name,b.phone boy_phone_raw,b.rating boy_rating,p.name partner_name
      FROM orders o LEFT JOIN users u ON o.sender_id=u.id
      LEFT JOIN users b ON o.assigned_boy_id=b.id LEFT JOIN partners p ON o.partner_id=p.id
      WHERE o.id=?`).get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role === 'customer' && order.sender_id !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });

    // Privacy: mask phone for delivery boy
    if (req.user.role === 'delivery_boy') {
      order.receiver_phone = order.receiver_phone?.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2');
      order.sender_phone   = order.sender_phone_raw?.replace(/(\d{2})\d{6}(\d{2})/, '$1XXXXXX$2');
      delete order.pickup_otp;
      delete order.delivery_otp;
    }

    const tracking = db.prepare('SELECT * FROM tracking_events WHERE order_id=? ORDER BY created_at ASC').all(req.params.id);
    res.json({ order, tracking });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/orders/:id/status ────────────────────────────────────────────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, otp, location, note } = req.body;
    const db = await getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    const allowed = STATUS_FLOW[order.status] || [];
    if (!allowed.includes(status))
      return res.status(400).json({ error: `Cannot change from "${order.status}" to "${status}". Allowed next: ${allowed.join(', ')}` });

    // OTP checks
    if (status === 'picked_up' && order.pickup_otp !== otp)
      return res.status(400).json({ error: 'Wrong pickup OTP. Ask sender for the correct OTP.' });
    if (status === 'delivered' && order.delivery_otp !== otp)
      return res.status(400).json({ error: 'Wrong delivery OTP. Ask receiver for the correct OTP.' });

    // Build update
    let extraSql = '';
    if (status === 'confirmed')        extraSql = `,assigned_boy_id='${req.user.id}'`;
    if (status === 'picked_up')        extraSql = `,pickup_time=datetime('now')`;
    if (status === 'delivered') {
      extraSql = `,delivery_time=datetime('now'),payment_status='completed'`;
      // Mark boy earning as paid
      db.prepare("UPDATE boy_earnings SET status='paid',paid_at=datetime('now') WHERE order_id=?").run(order.id);
      db.prepare("UPDATE users SET total_deliveries=total_deliveries+1 WHERE id=?").run(req.user.id);
    }
    if (status === 'cancelled' && req.body.reason) {
      extraSql = `,cancellation_reason='${req.body.reason}'`;
    }

    db.prepare(`UPDATE orders SET status=?,updated_at=datetime('now')${extraSql} WHERE id=?`).run(status, order.id);

    // Create earning record when boy accepts
    if (status === 'confirmed') {
      db.prepare('INSERT OR IGNORE INTO boy_earnings (id,boy_id,order_id,amount,status) VALUES (?,?,?,?,?)')
        .run(uuidv4(), req.user.id, order.id, Math.round(order.total_price * 0.2), 'pending');
    }

    // Tracking event
    db.prepare('INSERT INTO tracking_events (id,order_id,status,title,description,location,actor_name) VALUES (?,?,?,?,?,?,?)')
      .run(uuidv4(), order.id, status, STATUS_TITLES[status] || status,
        note || `Order ${status.replace(/_/g, ' ')}`,
        location || (status === 'picked_up' ? order.pickup_city : order.receiver_city),
        req.user.name);

    // Send SMS notification to sender
    const sender = db.prepare('SELECT phone FROM users WHERE id=?').get(order.sender_id);
    if (sender) await sendStatusUpdate(sender.phone, order.order_number, status, order.pickup_city);

    res.json({ message: `Order updated to ${status}`, order_id: order.id, status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/orders/:id/otp (sender or admin only) ──────────────────────────
router.get('/:id/otp', auth, async (req, res) => {
  try {
    const db = await getDb();
    const order = db.prepare('SELECT pickup_otp,delivery_otp,status,sender_id FROM orders WHERE id=?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && order.sender_id !== req.user.id)
      return res.status(403).json({ error: 'Access denied' });
    res.json({ pickup_otp: order.pickup_otp, delivery_otp: order.delivery_otp, status: order.status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
