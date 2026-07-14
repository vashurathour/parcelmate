const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');
const { auth, role } = require('../middleware/auth');

// GET /api/zones
router.get('/', auth, async (req, res) => {
  try {
    const db = await getDb();
    const zones = db.prepare(`
      SELECT z.*, u.name boy_name, u.phone boy_phone
      FROM zones z LEFT JOIN users u ON z.assigned_boy_id = u.id
      WHERE z.is_active=1 ORDER BY z.city ASC
    `).all();
    res.json({ zones });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/zones — create zone (admin)
router.post('/', auth, role('admin'), async (req, res) => {
  try {
    const { name, city, assigned_boy_id } = req.body;
    if (!name || !city) return res.status(400).json({ error: 'name and city required' });
    const db = await getDb();
    const id = uuidv4();
    db.prepare('INSERT INTO zones (id,name,city,assigned_boy_id) VALUES (?,?,?,?)').run(id, name, city, assigned_boy_id || null);
    res.status(201).json({ message: 'Zone created', id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/zones/:id — assign boy to zone (admin)
router.patch('/:id', auth, role('admin'), async (req, res) => {
  try {
    const { assigned_boy_id } = req.body;
    const db = await getDb();
    db.prepare('UPDATE zones SET assigned_boy_id=? WHERE id=?').run(assigned_boy_id || null, req.params.id);
    res.json({ message: 'Zone updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/zones/:id (admin)
router.delete('/:id', auth, role('admin'), async (req, res) => {
  try {
    const db = await getDb();
    db.prepare('UPDATE zones SET is_active=0 WHERE id=?').run(req.params.id);
    res.json({ message: 'Zone deactivated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
