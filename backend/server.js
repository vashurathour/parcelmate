require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE'] }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/orders',   require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reviews',  require('./routes/reviews'));
app.use('/api/zones',    require('./routes/zones'));

const { usersRouter, analyticsRouter, partnersRouter, notifRouter, promoRouter } = require('./routes/misc');
app.use('/api/users',         usersRouter);
app.use('/api/analytics',     analyticsRouter);
app.use('/api/partners',      partnersRouter);
app.use('/api/notifications', notifRouter);
app.use('/api/promo',         promoRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  app: 'ParcelMate API',
  version: '2.0.0',
  mode: process.env.NODE_ENV || 'development',
  payment: process.env.RAZORPAY_KEY_ID?.startsWith('rzp_live_') ? 'live' : 'test/mock',
  sms: process.env.MSG91_AUTH_KEY?.length > 10 ? 'live' : 'mock',
  time: new Date().toISOString(),
}));

// ── 404 & error handlers ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 ParcelMate API v2.0 → http://localhost:${PORT}`);
  console.log(`   Health:      GET  /health`);
  console.log(`   Auth:        POST /api/auth/login`);
  console.log(`   Orders:      GET  /api/orders`);
  console.log(`   Payments:    POST /api/payments/initiate`);
  console.log(`   Analytics:   GET  /api/analytics/summary`);
  console.log(`   Reviews:     POST /api/reviews`);
  console.log(`   Zones:       GET  /api/zones`);
  console.log(`   Mode: ${process.env.NODE_ENV || 'development'}\n`);
});
