require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, '../data/parcelmate.db');

async function setup() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Delete existing for fresh setup
  if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
  const db = new SQL.Database();

  // ── USERS ──────────────────────────────────────────────────────────────
  db.run(`CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    address TEXT,
    city TEXT,
    lat REAL DEFAULT 0,
    lng REAL DEFAULT 0,
    vehicle_type TEXT DEFAULT 'bike',
    device_token TEXT,
    is_active INTEGER DEFAULT 1,
    is_available INTEGER DEFAULT 1,
    rating REAL DEFAULT 5.0,
    total_deliveries INTEGER DEFAULT 0,
    wallet_balance REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── ORDERS ─────────────────────────────────────────────────────────────
  db.run(`CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    sender_id TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    receiver_phone TEXT NOT NULL,
    receiver_address TEXT NOT NULL,
    receiver_city TEXT NOT NULL,
    parcel_type TEXT NOT NULL DEFAULT 'general',
    parcel_weight REAL DEFAULT 0.5,
    parcel_description TEXT DEFAULT '',
    parcel_value REAL DEFAULT 0,
    is_fragile INTEGER DEFAULT 0,
    pickup_address TEXT NOT NULL,
    pickup_city TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    subtotal REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    total_price REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT 'online',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    assigned_boy_id TEXT,
    partner_id TEXT,
    partner_tracking_id TEXT,
    pickup_otp TEXT NOT NULL,
    delivery_otp TEXT NOT NULL,
    pickup_photo TEXT,
    delivery_photo TEXT,
    pickup_time TEXT,
    delivery_time TEXT,
    estimated_delivery TEXT,
    special_instructions TEXT DEFAULT '',
    cancellation_reason TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── TRACKING ───────────────────────────────────────────────────────────
  db.run(`CREATE TABLE tracking_events (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT DEFAULT '',
    actor_name TEXT DEFAULT 'System',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── PAYMENTS ───────────────────────────────────────────────────────────
  db.run(`CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    gateway_response TEXT,
    idempotency_key TEXT UNIQUE,
    failure_reason TEXT,
    refund_id TEXT,
    refund_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── PARTNERS ───────────────────────────────────────────────────────────
  db.run(`CREATE TABLE partners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'courier',
    contact_email TEXT,
    contact_phone TEXT,
    cities_served TEXT DEFAULT 'All India',
    price_per_kg REAL DEFAULT 30,
    base_price REAL DEFAULT 50,
    avg_delivery_days INTEGER DEFAULT 3,
    rating REAL DEFAULT 4.5,
    total_orders INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── NOTIFICATIONS ──────────────────────────────────────────────────────
  db.run(`CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    order_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── BOY EARNINGS ───────────────────────────────────────────────────────
  db.run(`CREATE TABLE boy_earnings (
    id TEXT PRIMARY KEY,
    boy_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── REVIEWS ────────────────────────────────────────────────────────────
  db.run(`CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    reviewee_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // ── ZONES ──────────────────────────────────────────────────────────────
  db.run(`CREATE TABLE zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    assigned_boy_id TEXT,
    is_active INTEGER DEFAULT 1
  )`);

  // ── PROMO CODES ────────────────────────────────────────────────────────
  db.run(`CREATE TABLE promo_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT DEFAULT 'percent',
    discount_value REAL NOT NULL,
    max_discount REAL DEFAULT 100,
    min_order REAL DEFAULT 0,
    uses_left INTEGER DEFAULT 100,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1
  )`);

  // ── SEED DATA ──────────────────────────────────────────────────────────
  const hash = bcrypt.hashSync('password123', 10);

  const users = [
    [uuidv4(), 'Rahul Sharma',   '9876543210', 'rahul@test.com',       hash, 'customer',     'Ludhiana', 30.9010, 75.8573],
    [uuidv4(), 'Priya Singh',    '9876543211', 'priya@test.com',       hash, 'customer',     'Delhi',    28.6139, 77.2090],
    [uuidv4(), 'Suresh Verma',   '9876543214', 'suresh@test.com',      hash, 'customer',     'Mumbai',   19.0760, 72.8777],
    [uuidv4(), 'Amit Kumar',     '9876543212', 'amit@test.com',        hash, 'delivery_boy', 'Ludhiana', 30.9010, 75.8573],
    [uuidv4(), 'Ravi Sharma',    '9876543215', 'ravi@test.com',        hash, 'delivery_boy', 'Delhi',    28.6139, 77.2090],
    [uuidv4(), 'Admin User',     '9876543213', 'admin@parcelmate.com', hash, 'admin',        'Ludhiana', 30.9010, 75.8573],
  ];
  for (const u of users) {
    db.run(`INSERT INTO users (id,name,phone,email,password_hash,role,city,lat,lng) VALUES (?,?,?,?,?,?,?,?,?)`, u);
  }

  const partners = [
    [uuidv4(), 'DTDC',       'courier', 'dtdc@partner.com',       '1800-209-3822', 'All India',    30, 50, 3, 4.5],
    [uuidv4(), 'India Post', 'postal',  'indiapost@partner.com',  '1800-11-2011',  'All India',    20, 30, 7, 4.0],
    [uuidv4(), 'Delhivery',  'courier', 'delhivery@partner.com',  '011-2345-6789', 'Metro Cities', 35, 60, 2, 4.7],
    [uuidv4(), 'Blue Dart',  'courier', 'bluedart@partner.com',   '1860-233-1234', 'All India',    50, 80, 1, 4.8],
  ];
  for (const p of partners) {
    db.run(`INSERT INTO partners (id,name,type,contact_email,contact_phone,cities_served,price_per_kg,base_price,avg_delivery_days,rating) VALUES (?,?,?,?,?,?,?,?,?,?)`, p);
  }

  // Promo codes
  db.run(`INSERT INTO promo_codes (id,code,discount_type,discount_value,max_discount,min_order) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), 'FIRST50', 'percent', 50, 100, 0]);
  db.run(`INSERT INTO promo_codes (id,code,discount_type,discount_value,max_discount,min_order) VALUES (?,?,?,?,?,?)`,
    [uuidv4(), 'SAVE20', 'flat', 20, 20, 100]);

  // Get IDs
  const customerId = db.exec("SELECT id FROM users WHERE phone='9876543210'")[0].values[0][0];
  const boyId      = db.exec("SELECT id FROM users WHERE phone='9876543212'")[0].values[0][0];
  const partner1   = db.exec("SELECT id FROM partners WHERE name='DTDC'")[0].values[0][0];
  const adminId    = db.exec("SELECT id FROM users WHERE phone='9876543213'")[0].values[0][0];

  // Sample orders across all status stages
  const sampleOrders = [
    { num:'PM10000001', rn:'Meena Patel',   rph:'9811111111', ra:'12 MG Road',       rc:'Delhi',    pa:'45 Civil Lines', pc:'Ludhiana', t:'book',     w:0.5, st:'delivered',        pr:95,  ps:'completed', potp:'111111', dotp:'222222', boy:boyId,  ptnr:partner1 },
    { num:'PM10000002', rn:'Sanjay Kumar',  rph:'9822222222', ra:'8 Station Road',   rc:'Mumbai',   pa:'45 Civil Lines', pc:'Ludhiana', t:'document', w:0.2, st:'in_transit',       pr:120, ps:'completed', potp:'333333', dotp:'444444', boy:boyId,  ptnr:partner1 },
    { num:'PM10000003', rn:'Anjali Gupta',  rph:'9833333333', ra:'3 Park Street',    rc:'Kolkata',  pa:'45 Civil Lines', pc:'Ludhiana', t:'parcel',   w:1.2, st:'out_for_delivery', pr:105, ps:'completed', potp:'555555', dotp:'666666', boy:boyId,  ptnr:null },
    { num:'PM10000004', rn:'Vikram Singh',  rph:'9844444444', ra:'99 Anna Salai',    rc:'Chennai',  pa:'45 Civil Lines', pc:'Ludhiana', t:'general',  w:0.8, st:'picked_up',        pr:110, ps:'completed', potp:'777777', dotp:'888888', boy:boyId,  ptnr:null },
    { num:'PM10000005', rn:'Pooja Reddy',   rph:'9855555555', ra:'21 Indiranagar',   rc:'Bengaluru',pa:'45 Civil Lines', pc:'Ludhiana', t:'fragile',  w:0.3, st:'confirmed',        pr:75,  ps:'pending',   potp:'999999', dotp:'000001', boy:boyId,  ptnr:null },
    { num:'PM10000006', rn:'Rohit Mishra',  rph:'9866666666', ra:'7 Hazratganj',     rc:'Lucknow',  pa:'45 Civil Lines', pc:'Ludhiana', t:'general',  w:2.0, st:'pending',          pr:130, ps:'pending',   potp:'123456', dotp:'654321', boy:null,   ptnr:null },
    { num:'PM10000007', rn:'Neha Joshi',    rph:'9877777777', ra:'15 FC Road',       rc:'Pune',     pa:'45 Civil Lines', pc:'Ludhiana', t:'book',     w:0.7, st:'pending',          pr:90,  ps:'pending',   potp:'111222', dotp:'333444', boy:null,   ptnr:null },
  ];

  const statusEvts = {
    pending:          [['pending','Order placed','Waiting for pickup']],
    confirmed:        [['pending','Order placed','Waiting for pickup'],['confirmed','Boy assigned','Delivery executive assigned']],
    picked_up:        [['pending','Order placed','Waiting'],['confirmed','Assigned','Executive assigned'],['picked_up','Picked up','Parcel collected from sender']],
    in_transit:       [['pending','Order placed','Waiting'],['confirmed','Assigned','Assigned'],['picked_up','Picked up','Collected'],['in_transit','In transit','Handed to courier partner']],
    out_for_delivery: [['pending','Order placed','Waiting'],['confirmed','Assigned','Assigned'],['picked_up','Picked up','Collected'],['in_transit','In transit','With partner'],['out_for_delivery','Out for delivery','Executive on the way']],
    delivered:        [['pending','Order placed','Waiting'],['confirmed','Assigned','Assigned'],['picked_up','Picked up','Collected'],['in_transit','In transit','With partner'],['out_for_delivery','Out for delivery','On the way'],['delivered','Delivered ✓','Parcel delivered successfully']],
  };

  for (const o of sampleOrders) {
    const oid = uuidv4();
    const tax = Math.round(o.pr * 0.18);
    db.run(`INSERT INTO orders (id,order_number,sender_id,receiver_name,receiver_phone,receiver_address,receiver_city,parcel_type,parcel_weight,pickup_address,pickup_city,status,subtotal,tax,total_price,payment_status,payment_method,pickup_otp,delivery_otp,assigned_boy_id,partner_id)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [oid,o.num,customerId,o.rn,o.rph,o.ra,o.rc,o.t,o.w,o.pa,o.pc,o.st,o.pr,tax,o.pr+tax,o.ps,'online',o.potp,o.dotp,o.boy||null,o.ptnr||null]);

    for (const [st,title,desc] of (statusEvts[o.st]||statusEvts.pending)) {
      db.run(`INSERT INTO tracking_events (id,order_id,status,title,description,location,actor_name) VALUES (?,?,?,?,?,?,?)`,
        [uuidv4(),oid,st,title,desc,st==='pending'||st==='confirmed'?o.pc:o.rc,'System']);
    }

    if (['confirmed','picked_up','in_transit','out_for_delivery','delivered'].includes(o.st)) {
      db.run(`INSERT INTO boy_earnings (id,boy_id,order_id,amount,status) VALUES (?,?,?,?,?)`,
        [uuidv4(),boyId,oid,Math.round(o.pr*0.2),o.st==='delivered'?'paid':'pending']);
    }
  }

  // Welcome notifications
  db.run(`INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
    [uuidv4(),customerId,'Welcome to ParcelMate!','Book your first parcel pickup in minutes.','welcome']);
  db.run(`INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)`,
    [uuidv4(),boyId,'New orders available!','3 orders waiting for pickup in Ludhiana.','order']);

  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log('\n✅ ParcelMate database ready!');
  console.log('\nTest accounts (password: password123)');
  console.log('  Customer:      9876543210  (Rahul Sharma)');
  console.log('  Customer:      9876543211  (Priya Singh)');
  console.log('  Delivery boy:  9876543212  (Amit Kumar)');
  console.log('  Admin:         9876543213  (Admin)');
  console.log('\nPromo codes: FIRST50 (50% off), SAVE20 (₹20 off)\n');
}

setup().catch(e => { console.error('❌ Setup failed:', e.message); process.exit(1); });
