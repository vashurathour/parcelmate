const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');
const { auth, role } = require('../middleware/auth');
const { verifyPaymentSignature, verifyWebhookSignature, refundPayment, createRazorpayOrder, getCheckoutConfig } = require('../services/payment');

// ── POST /api/payments/initiate ─────────────────────────────────────────────
// Called when user is ready to pay — returns Razorpay checkout config
router.post('/initiate', auth, async (req, res) => {
  try {
    const { order_id } = req.body;
    const db = await getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id=? AND sender_id=?').get(order_id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'completed') return res.status(400).json({ error: 'Already paid' });

    const rzpOrder = await createRazorpayOrder({ orderId: order.id, amount: order.total_price, notes: { order_number: order.order_number } });
    db.prepare('UPDATE orders SET razorpay_order_id=? WHERE id=?').run(rzpOrder.id, order.id);

    // Create payment record
    db.prepare('INSERT OR IGNORE INTO payments (id,order_id,amount,method,status,razorpay_order_id,idempotency_key) VALUES (?,?,?,?,?,?,?)')
      .run(uuidv4(), order.id, order.total_price, 'online', 'pending', rzpOrder.id, `pay_${order.id}`);

    const config = getCheckoutConfig({
      razorpayOrderId: rzpOrder.id,
      amount: order.total_price,
      name: req.user.name,
      phone: req.user.phone,
      description: `Order ${order.order_number}`,
    });

    res.json({ message: 'Payment initiated', razorpay: config, order_id: order.id, amount: order.total_price });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/payments/verify ───────────────────────────────────────────────
// Called after user completes payment on Razorpay checkout
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    const isValid = verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });
    if (!isValid) return res.status(400).json({ error: 'Payment verification failed. Signature mismatch.' });

    const db = await getDb();
    // Mark order payment complete
    db.prepare(`UPDATE orders SET payment_status='completed', razorpay_payment_id=?, updated_at=datetime('now') WHERE id=?`)
      .run(razorpay_payment_id, order_id);

    // Update payment record
    db.prepare(`UPDATE payments SET status='completed',razorpay_payment_id=?,razorpay_signature=?,updated_at=datetime('now') WHERE order_id=?`)
      .run(razorpay_payment_id, razorpay_signature, order_id);

    const order = db.prepare('SELECT order_number,total_price FROM orders WHERE id=?').get(order_id);
    res.json({ message: 'Payment verified successfully', order_number: order?.order_number, amount_paid: order?.total_price });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/payments/webhook ──────────────────────────────────────────────
// Razorpay webhook — set this URL in Razorpay dashboard
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const event = req.body;

    // Verify webhook signature
    if (!verifyWebhookSignature(event, signature)) {
      console.warn('Webhook: invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const db = await getDb();
    const { event: eventType, payload } = event;

    if (eventType === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.notes?.parcelmate_order;
      if (orderId) {
        db.prepare("UPDATE orders SET payment_status='completed',razorpay_payment_id=? WHERE id=?")
          .run(payment.id, orderId);
        db.prepare("UPDATE payments SET status='completed',razorpay_payment_id=? WHERE order_id=?")
          .run(payment.id, orderId);
        console.log('Webhook: payment captured for order', orderId);
      }
    }

    if (eventType === 'payment.failed') {
      const payment = payload.payment.entity;
      const orderId = payment.notes?.parcelmate_order;
      if (orderId) {
        db.prepare("UPDATE payments SET status='failed',failure_reason=? WHERE order_id=?")
          .run(payment.error_description || 'Payment failed', orderId);
        console.log('Webhook: payment failed for order', orderId);
      }
    }

    if (eventType === 'refund.processed') {
      const refund = payload.refund.entity;
      db.prepare("UPDATE payments SET refund_id=?,refund_amount=?,status='refunded' WHERE razorpay_payment_id=?")
        .run(refund.id, refund.amount / 100, refund.payment_id);
      console.log('Webhook: refund processed', refund.id);
    }

    res.json({ status: 'ok' });
  } catch (e) {
    console.error('Webhook error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/payments/refund ───────────────────────────────────────────────
router.post('/refund', auth, role('admin'), async (req, res) => {
  try {
    const { order_id, reason } = req.body;
    const db = await getDb();
    const payment = db.prepare('SELECT * FROM payments WHERE order_id=? AND status="completed"').get(order_id);
    if (!payment) return res.status(404).json({ error: 'No completed payment found for this order' });
    if (payment.refund_id) return res.status(400).json({ error: 'Refund already processed' });

    const refund = await refundPayment({ paymentId: payment.razorpay_payment_id, amount: payment.amount, reason });
    db.prepare("UPDATE payments SET refund_id=?,refund_amount=?,status='refunded',updated_at=datetime('now') WHERE id=?")
      .run(refund.id, payment.amount, payment.id);
    db.prepare("UPDATE orders SET payment_status='refunded' WHERE id=?").run(order_id);

    res.json({ message: 'Refund initiated', refund_id: refund.id, amount: payment.amount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/payments/status/:orderId ───────────────────────────────────────
router.get('/status/:orderId', auth, async (req, res) => {
  try {
    const db = await getDb();
    const payment = db.prepare('SELECT id,amount,method,status,razorpay_payment_id,created_at,updated_at FROM payments WHERE order_id=?').get(req.params.orderId);
    const order   = db.prepare('SELECT payment_status,total_price,order_number FROM orders WHERE id=?').get(req.params.orderId);
    res.json({ payment: payment || null, order_payment_status: order?.payment_status, amount: order?.total_price });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
