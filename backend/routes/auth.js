const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');
const { auth } = require('../middleware/auth');

const sign = u => jwt.sign(
  { id: u.id, name: u.name, phone: u.phone, role: u.role, city: u.city },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, role = 'customer', city, address } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!phone?.trim()) return res.status(400).json({ error: 'Phone is required' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Phone must be 10 digits' });

    const db = await getDb();
    if (db.prepare('SELECT id FROM users WHERE phone=?').get(phone))
      return res.status(409).json({ error: 'This phone number is already registered' });

    const id = uuidv4();
    db.prepare('INSERT INTO users (id,name,phone,email,password_hash,role,city,address) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, name.trim(), phone, email || null, bcrypt.hashSync(password, 10), role, city || null, address || null);

    const user = { id, name: name.trim(), phone, role, city: city || null };
    res.status(201).json({ message: 'Account created successfully', token: sign(user), user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'Phone and password are required' });

    const db = await getDb();
    const u = db.prepare('SELECT * FROM users WHERE phone=?').get(phone);
    if (!u || !bcrypt.compareSync(password, u.password_hash))
      return res.status(401).json({ error: 'Incorrect phone or password' });
    if (!u.is_active)
      return res.status(403).json({ error: 'Account suspended. Contact support.' });

    const user = { id: u.id, name: u.name, phone: u.phone, role: u.role, city: u.city };
    res.json({ message: 'Login successful', token: sign(user), user });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const db = await getDb();
    const u = db.prepare('SELECT id,name,phone,email,role,city,address,rating,total_deliveries,wallet_balance,created_at FROM users WHERE id=?').get(req.user.id);
    if (!u) return res.status(404).json({ error: 'User not found' });
    res.json({ user: u });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/auth/profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const { name, email, city, address } = req.body;
    const db = await getDb();
    db.prepare('UPDATE users SET name=COALESCE(?,name),email=COALESCE(?,email),city=COALESCE(?,city),address=COALESCE(?,address) WHERE id=?')
      .run(name || null, email || null, city || null, address || null, req.user.id);
    res.json({ message: 'Profile updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/auth/password
router.patch('/password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const db = await getDb();
    const u = db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user.id);
    if (!bcrypt.compareSync(current_password, u.password_hash))
      return res.status(401).json({ error: 'Current password is incorrect' });
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(new_password, 10), req.user.id);
    res.json({ message: 'Password changed successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
