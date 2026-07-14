# ParcelMate — Complete Platform v2.0

## What's inside

```
parcelmate/
├── index.html                          ← Open this first (portal launcher)
│
├── backend/
│   ├── server.js                       ← API entry point (port 3001)
│   ├── routes/
│   │   ├── auth.js                     ← Register, login, profile, password
│   │   ├── orders.js                   ← Full order lifecycle + OTP + pricing
│   │   ├── payments.js                 ← Razorpay: initiate, verify, webhook, refund
│   │   └── misc.js                     ← Users, analytics, partners, notifications, promo
│   ├── middleware/auth.js              ← JWT verification + role guard
│   ├── services/
│   │   ├── pricing.js                  ← Weight/distance/type/fragile price engine
│   │   ├── payment.js                  ← Razorpay wrapper (test + live)
│   │   └── sms.js                      ← MSG91 OTP + status SMS (mock in dev)
│   ├── config/
│   │   ├── db.js                       ← SQLite via sql.js (zero native build)
│   │   └── setupDb.js                  ← Create tables + seed data
│   └── data/parcelmate.db              ← Auto-created on first setup
│
├── frontend/
│   ├── shared.css                      ← Design tokens used by all 4 portals
│   ├── user/index.html                 ← Customer: book, pay, track, OTP
│   ├── admin/index.html                ← Admin: dashboard, orders, users, partners
│   ├── boy/index.html                  ← Delivery boy: accept, OTP, earnings
│   └── partner/index.html             ← Partner: shipments, SLA tracker
│
└── mobile/
    ├── ParcelMateUser/                 ← React Native customer app
    │   ├── App.js
    │   └── src/
    │       ├── screens/
    │       │   ├── AuthScreen.js       ← Login + Register
    │       │   ├── OrdersScreen.js     ← Orders list with live OTP
    │       │   ├── OrderDetailScreen.js← Tracking + Razorpay payment
    │       │   ├── BookOrderScreen.js  ← Full booking form + price estimate
    │       │   └── ConfirmedAndProfile.js
    │       ├── components/UI.js        ← Button, Card, Badge, OTP, Timeline…
    │       ├── context/AuthContext.js  ← Global auth state
    │       ├── navigation/AppNavigator.js
    │       └── services/api.js         ← All API calls
    │
    └── ParcelMateBoy/                  ← React Native delivery boy app
        ├── App.js                      ← Login + Tab navigator
        └── src/
            ├── screens/
            │   ├── ActiveScreen.js     ← Accept orders, OTP pickup/delivery
            │   └── EarningsAndHistory.js
            ├── components/UI.js
            ├── context/AuthContext.js
            └── services/api.js
```

---

## STEP 1 — Prerequisites

Install Node.js (v18+): https://nodejs.org

```bash
node --version   # must show v18+
npm --version
```

---

## STEP 2 — Start the backend

```bash
cd backend
npm install
node config/setupDb.js     # creates database + seed data (run once)
npm run dev                # starts on http://localhost:3001
```

You'll see:
```
🚀 ParcelMate API v2.0 → http://localhost:3001
   Mode: development
```

Test it: http://localhost:3001/health

---

## STEP 3 — Open the web dashboards

Open `parcelmate/index.html` in your browser.
The launcher shows all 4 portals with a live backend status indicator.

---

## Test accounts (all password: `password123`)

| Phone        | Role          | Name         |
|--------------|---------------|--------------|
| 9876543210   | Customer      | Rahul Sharma |
| 9876543211   | Customer      | Priya Singh  |
| 9876543212   | Delivery boy  | Amit Kumar   |
| 9876543213   | Admin         | Admin User   |

Promo codes: `FIRST50` (50% off) · `SAVE20` (₹20 flat off)

---

## Complete test flow — step by step

### A — Customer books
1. Open `frontend/user/index.html` → login as 9876543210
2. Click "+ New booking"
3. Fill: Receiver=Test Person, Phone=9800000000, Address=123 MG Road, City=Delhi
4. Pickup: Address=45 Civil Lines, City=Ludhiana
5. Apply promo code `FIRST50`
6. Choose Online payment → Confirm booking
7. Razorpay checkout opens → Test UPI: `success@razorpay` or Card: `4111 1111 1111 1111`
8. You get a **6-digit Pickup OTP** — note it

### B — Admin assigns boy
1. Open `frontend/admin/index.html` → login as 9876543213
2. All orders → find new order → Manage
3. Select delivery boy → Assign

### C — Delivery boy picks up
1. Open `frontend/boy/index.html` → login as 9876543212
2. See order in Active deliveries
3. Enter Pickup OTP from step A → Confirm pickup
4. Progress: "Handed to courier" → "Start delivery"

### D — Customer gets Delivery OTP
1. Back in Customer app — order shows "Out for delivery"
2. Delivery OTP is displayed in green

### E — Delivery confirmed
1. Delivery boy enters Delivery OTP → ✓ Mark delivered
2. Admin revenue updates, boy earnings marked paid

---

## API Reference

### Auth
```
POST /api/auth/register      { name, phone, password, city }
POST /api/auth/login         { phone, password }
GET  /api/auth/me            → current user
PATCH /api/auth/profile      { name, email, city }
PATCH /api/auth/password     { current_password, new_password }
```

### Orders
```
GET  /api/orders             → list (filtered by role automatically)
POST /api/orders             → create (customer only)
POST /api/orders/estimate    { from_city, to_city, weight, parcel_type, promo_code }
GET  /api/orders/:id         → with full tracking history
GET  /api/orders/:id/otp     → pickup + delivery OTP (sender/admin only)
PATCH /api/orders/:id/status { status, otp?, location?, note? }
```

### Payments (Razorpay)
```
POST /api/payments/initiate  { order_id }  → Razorpay checkout config
POST /api/payments/verify    { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id }
POST /api/payments/webhook   (set in Razorpay dashboard)
POST /api/payments/refund    { order_id, reason } (admin only)
GET  /api/payments/status/:orderId
```

### Analytics
```
GET /api/analytics/summary   (admin) → full dashboard stats
GET /api/analytics/boy       (delivery boy) → personal stats + earnings
```

### Others
```
GET  /api/partners           → list courier partners
GET  /api/notifications      → user's notifications
PATCH /api/notifications/read-all
POST /api/promo/validate     { code, order_total }
GET  /api/users              (admin) → all users
PATCH /api/users/:id/toggle  (admin) → activate/suspend
```

---

## Enable Real Razorpay Payments

1. Sign up at https://razorpay.com/dashboard
2. Settings → API Keys → Generate Key
3. Edit `backend/.env`:
```
RAZORPAY_KEY_ID=rzp_test_YourActualKeyId
RAZORPAY_KEY_SECRET=YourActualKeySecret
```
4. In `mobile/ParcelMateUser/src/services/api.js` — set `BASE_URL` to your machine's IP for device testing
5. Test card: `4111 1111 1111 1111` · CVV: any 3 digits · Expiry: any future date
6. Test UPI: `success@razorpay`

When going live, replace `rzp_test_` keys with `rzp_live_` keys.

---

## Enable Real SMS (MSG91)

1. Sign up at https://msg91.com
2. Get your Auth Key from Dashboard → API
3. Create OTP template, get Template ID
4. Edit `backend/.env`:
```
MSG91_AUTH_KEY=YourAuthKey
MSG91_TEMPLATE_ID=YourTemplateId
```
5. Restart backend — SMS will send to real phones

---

## React Native Mobile Apps

### User app setup
```bash
cd mobile/ParcelMateUser
npm install
# Edit src/services/api.js → set BASE_URL to your machine IP

# Android emulator:
npm run android

# iOS simulator (Mac only):
cd ios && pod install && cd ..
npm run ios
```

### Boy app setup
```bash
cd mobile/ParcelMateBoy
npm install
npm run android
```

### Device testing (real phone)
```bash
# Find your machine IP:
ipconfig        # Windows
ifconfig        # Mac/Linux

# In src/services/api.js change:
const BASE_URL = 'http://YOUR_IP:3001/api';

# Enable USB debugging on phone
# Connect USB → npm run android
```

---

## Architecture — 4 Layers

| Layer | Role | Tech |
|-------|------|------|
| 1 — Presentation | 4 web portals + 2 mobile apps | HTML/JS + React Native |
| 2 — API Gateway  | Auth, rate limiting, routing | Express.js + JWT |
| 3 — Services     | Business logic, pricing, Razorpay, SMS | Node.js microservices |
| 4 — Data         | 10 tables, fully isolated per service | SQLite → PostgreSQL in prod |

**Updating any layer doesn't break others** — all communication goes through fixed API contracts.

### Privacy protections
- Phone numbers masked for delivery boys (98XXXXXX10)
- OTPs never exposed to wrong roles
- Card data never stored (Razorpay tokenizes)
- JWT expires in 30 days
- Rate limiting: 500 req per 15 min
- Idempotency key on every payment

### Crash safety
- Every route wrapped in try/catch
- Payment queue retries on failure
- OTP required before status transitions
- Status flow enforced server-side (can't skip steps)

---

## Production checklist

- [ ] Replace SQLite with PostgreSQL
- [ ] Set real `JWT_SECRET` (32+ random chars)
- [ ] Add real Razorpay live keys
- [ ] Add MSG91 keys for SMS
- [ ] Deploy backend to Railway.app or AWS
- [ ] Set up Razorpay webhook URL in dashboard
- [ ] Add HTTPS (SSL certificate)
- [ ] Submit mobile apps to Play Store / App Store

---

## Troubleshooting

**Port 3001 in use:**
```bash
npx kill-port 3001
```

**"Cannot find module sql.js":**
```bash
cd backend && npm install
```

**Dashboard shows no data / CORS error:**
Make sure backend is running: `cd backend && npm run dev`

**React Native: Network error on emulator:**
Use `10.0.2.2` instead of `localhost` for Android emulator in `api.js`

**Database reset:**
```bash
cd backend && rm -f data/parcelmate.db && node config/setupDb.js
```
