const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');
const { auth, role } = require('../middleware/auth');

// ── REVIEWS ──────────────────────────────────────────────────────────────────

// POST /api/reviews — submit a rating after delivery
router.post('/', auth, async (req, res) => {
  try {
    const { order_id, reviewee_id, rating, comment } = req.body;
    if (!order_id || !reviewee_id || !rating)
      return res.status(400).json({ error: 'order_id, reviewee_id and rating required' });
    if (rating < 1 || rating > 5)
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    const db = await getDb();

    // Verify order exists and belongs to reviewer or assigned boy
    const order = db.prepare('SELECT * FROM orders WHERE id=?').get(order_id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'delivered')
      return res.status(400).json({ error: 'Can only review after delivery' });

    // Prevent duplicate reviews
    const existing = db.prepare('SELECT id FROM reviews WHERE order_id=? AND reviewer_id=?').get(order_id, req.user.id);
    if (existing) return res.status(409).json({ error: 'You already reviewed this order' });

    const id = uuidv4();
    db.prepare('INSERT INTO reviews (id,order_id,reviewer_id,reviewee_id,rating,comment) VALUES (?,?,?,?,?,?)')
      .run(id, order_id, req.user.id, reviewee_id, rating, comment || '');

    // Update delivery boy average rating
    if (req.user.role === 'customer') {
      const avg = db.prepare('SELECT AVG(rating) avg FROM reviews WHERE reviewee_id=?').get(reviewee_id);
      if (avg?.avg) {
        db.prepare('UPDATE users SET rating=? WHERE id=?').run(Math.round(avg.avg * 10) / 10, reviewee_id);
      }
    }

    res.status(201).json({ message: 'Review submitted', id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/reviews/boy/:boyId — get reviews for a delivery boy
router.get('/boy/:boyId', auth, async (req, res) => {
  try {
    const db = await getDb();
    const reviews = db.prepare(`
      SELECT r.*, u.name reviewer_name FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id=? ORDER BY r.created_at DESC LIMIT 20
    `).all(req.params.boyId);
    const summary = db.prepare('SELECT AVG(rating) avg, COUNT(*) count FROM reviews WHERE reviewee_id=?').get(req.params.boyId);
    res.json({ reviews, avg_rating: Math.round((summary?.avg || 5) * 10) / 10, total: summary?.count || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/reviews/order/:orderId — check if order is reviewed
router.get('/order/:orderId', auth, async (req, res) => {
  try {
    const db = await getDb();
    const review = db.prepare('SELECT * FROM reviews WHERE order_id=? AND reviewer_id=?').get(req.params.orderId, req.user.id);
    res.json({ reviewed: !!review, review: review || null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
