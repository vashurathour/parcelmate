const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');
const { auth, role } = require('../middleware/auth');

// ── USERS ───────────────────────────────────────────────────────────────────
const usersRouter = require('express').Router();

usersRouter.get('/', auth, role('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const { role: r } = req.query;
    const users = db.prepare(`SELECT id,name,phone,email,role,city,is_active,is_available,rating,total_deliveries,wallet_balance,created_at FROM users ${r ? 'WHERE role=?' : ''} ORDER BY created_at DESC`).all(...(r ? [r] : []));
    res.json({ users });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

usersRouter.get('/boys', auth, role('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const boys = db.prepare("SELECT id,name,phone,city,rating,total_deliveries,is_available FROM users WHERE role='delivery_boy' AND is_active=1 ORDER BY rating DESC").all();
    res.json({ boys });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

usersRouter.patch('/:id/toggle', auth, role('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const u = db.prepare('SELECT is_active FROM users WHERE id=?').get(req.params.id);
    if (!u) return res.status(404).json({ error: 'User not found' });
    db.prepare('UPDATE users SET is_active=? WHERE id=?').run(u.is_active ? 0 : 1, req.params.id);
    res.json({ message: `User ${u.is_active ? 'suspended' : 'activated'}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYTICS ───────────────────────────────────────────────────────────────
const analyticsRouter = require('express').Router();

analyticsRouter.get('/summary', auth, role('admin'), async (req, res) => {
  try {
    const db = await getDb();
    const g = (sql, ...p) => db.prepare(sql).get(...p);
    const summary = {
      totalOrders:     g("SELECT COUNT(*) c FROM orders").c,
      pendingOrders:   g("SELECT COUNT(*) c FROM orders WHERE status='pending'").c,
      confirmedOrders: g("SELECT COUNT(*) c FROM orders WHERE status='confirmed'").c,
      inTransit:       g("SELECT COUNT(*) c FROM orders WHERE status IN ('picked_up','in_transit','out_for_delivery')").c,
      delivered:       g("SELECT COUNT(*) c FROM orders WHERE status='delivered'").c,
      cancelled:       g("SELECT COUNT(*) c FROM orders WHERE status='cancelled'").c,
      totalRevenue:    g("SELECT COALESCE(SUM(total_price),0) s FROM orders WHERE payment_status='completed'").s,
      todayOrders:     g("SELECT COUNT(*) c FROM orders WHERE date(created_at)=date('now')").c,
      todayRevenue:    g("SELECT COALESCE(SUM(total_price),0) s FROM orders WHERE date(created_at)=date('now') AND payment_status='completed'").s,
      totalCustomers:  g("SELECT COUNT(*) c FROM users WHERE role='customer'").c,
      totalBoys:       g("SELECT COUNT(*) c FROM users WHERE role='delivery_boy'").c,
      activeBoys:      g("SELECT COUNT(*) c FROM users WHERE role='delivery_boy' AND is_available=1").c,
      pendingPayouts:  g("SELECT COALESCE(SUM(amount),0) s FROM boy_earnings WHERE status='pending'").s,
    };
    const recentOrders = db.prepare(`SELECT o.id,o.order_number,o.status,o.total_price,o.receiver_city,o.created_at,u.name sender_name FROM orders o LEFT JOIN users u ON o.sender_id=u.id ORDER BY o.created_at DESC LIMIT 15`).all();
    const statusBreakdown = db.prepare("SELECT status,COUNT(*) count FROM orders GROUP BY status ORDER BY count DESC").all();
    const topCities = db.prepare("SELECT pickup_city city,COUNT(*) orders,COALESCE(SUM(total_price),0) revenue FROM orders GROUP BY pickup_city ORDER BY orders DESC LIMIT 6").all();
    const boyPerformance = db.prepare("SELECT u.name,u.rating,u.total_deliveries,COALESCE(SUM(e.amount),0) earnings FROM users u LEFT JOIN boy_earnings e ON u.id=e.boy_id WHERE u.role='delivery_boy' GROUP BY u.id ORDER BY u.total_deliveries DESC LIMIT 10").all();
    const revenueByDay = db.prepare("SELECT date(created_at) day,COUNT(*) orders,COALESCE(SUM(total_price),0) revenue FROM orders WHERE created_at>=date('now','-7 days') GROUP BY day ORDER BY day ASC").all();
    res.json({ summary, recentOrders, statusBreakdown, topCities, boyPerformance, revenueByDay });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

analyticsRouter.get('/boy', auth, role('delivery_boy'), async (req, res) => {
  try {
    const db = await getDb();
    const id = req.user.id;
    const g = (sql, ...p) => db.prepare(sql).get(...p);
    const stats = {
      totalDeliveries: g("SELECT COUNT(*) c FROM orders WHERE assigned_boy_id=? AND status='delivered'", id).c,
      activeOrders:    g("SELECT COUNT(*) c FROM orders WHERE assigned_boy_id=? AND status NOT IN ('delivered','cancelled')", id).c,
      totalEarnings:   g("SELECT COALESCE(SUM(amount),0) s FROM boy_earnings WHERE boy_id=?", id).s,
      pendingEarnings: g("SELECT COALESCE(SUM(amount),0) s FROM boy_earnings WHERE boy_id=? AND status='pending'", id).s,
      rating:          g("SELECT rating FROM users WHERE id=?", id)?.rating || 5.0,
    };
    const recentDeliveries = db.prepare("SELECT o.order_number,o.status,o.receiver_city,o.total_price,o.updated_at,e.amount FROM orders o LEFT JOIN boy_earnings e ON o.id=e.order_id WHERE o.assigned_boy_id=? ORDER BY o.updated_at DESC LIMIT 20").all(id);
    res.json({ stats, recentDeliveries });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PARTNERS ────────────────────────────────────────────────────────────────
const partnersRouter = require('express').Router();

partnersRouter.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    res.json({ partners: db.prepare('SELECT * FROM partners WHERE is_active=1 ORDER BY rating DESC').all() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

partnersRouter.post('/', auth, role('admin'), async (req, res) => {
  try {
    const { name, type, contact_email, contact_phone, cities_served, price_per_kg, base_price, avg_delivery_days } = req.body;
    const db = await getDb();
    const id = uuidv4();
    db.prepare('INSERT INTO partners (id,name,type,contact_email,contact_phone,cities_served,price_per_kg,base_price,avg_delivery_days) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(id, name, type || 'courier', contact_email || '', contact_phone || '', cities_served || 'All India', price_per_kg || 30, base_price || 50, avg_delivery_days || 3);
    res.status(201).json({ message: 'Partner added', id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── NOTIFICATIONS ────────────────────────────────────────────────────────────
const notifRouter = require('express').Router();

notifRouter.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const notifs = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30').all(req.user.id);
    const unread = db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id=? AND is_read=0').get(req.user.id).c;
    res.json({ notifications: notifs, unread });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

notifRouter.patch('/read-all', auth, async (req, res) => {
  try {
    const db = await getDb();
    db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(req.user.id);
    res.json({ message: 'All read' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PROMO CODES ──────────────────────────────────────────────────────────────
const promoRouter = require('express').Router();

promoRouter.post('/validate', auth, async (req, res) => {
  try {
    const { code, order_total } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    const db = await getDb();
    const promo = db.prepare("SELECT * FROM promo_codes WHERE code=? AND is_active=1 AND uses_left>0").get(code.toUpperCase());
    if (!promo) return res.status(404).json({ error: 'Invalid or expired promo code' });
    if (order_total < promo.min_order) return res.status(400).json({ error: `Minimum order ₹${promo.min_order} required` });
    const discount = promo.discount_type === 'percent'
      ? Math.min(Math.round(order_total * promo.discount_value / 100), promo.max_discount)
      : Math.min(promo.discount_value, promo.max_discount);
    res.json({ valid: true, discount, discount_type: promo.discount_type, discount_value: promo.discount_value, message: `₹${discount} discount applied!` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = { usersRouter, analyticsRouter, partnersRouter, notifRouter, promoRouter };
