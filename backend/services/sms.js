/**
 * ParcelMate Notification Service
 *
 * HOW TO ENABLE REAL SMS (MSG91):
 * 1. Sign up at https://msg91.com
 * 2. Get your Auth Key from Dashboard
 * 3. Create an OTP template and get Template ID
 * 4. Add MSG91_AUTH_KEY and MSG91_TEMPLATE_ID to .env
 *
 * Currently runs in mock mode — logs to console instead of sending SMS.
 */

const AUTH_KEY   = process.env.MSG91_AUTH_KEY    || '';
const TEMPLATE   = process.env.MSG91_TEMPLATE_ID || '';
const IS_LIVE    = AUTH_KEY.length > 10;

// ── Send OTP via MSG91 ──────────────────────────────────────────────────────
async function sendOTP(phone, otp, type = 'pickup') {
  const message = type === 'pickup'
    ? `Your ParcelMate pickup OTP is ${otp}. Share with delivery boy only. Valid for 24hrs.`
    : `Your ParcelMate delivery OTP is ${otp}. Share with delivery executive when parcel arrives.`;

  if (IS_LIVE) {
    try {
      const url = `https://api.msg91.com/api/v5/otp?authkey=${AUTH_KEY}&mobile=91${phone}&message=${encodeURIComponent(message)}&otp=${otp}&template_id=${TEMPLATE}`;
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      console.log(`SMS sent to ${phone}:`, data.type);
      return { sent: true, provider: 'msg91' };
    } catch (e) {
      console.error('SMS send failed:', e.message);
      return { sent: false, error: e.message };
    }
  }

  // Dev mode — just log
  console.log(`\n📱 [SMS MOCK] → +91${phone}`);
  console.log(`   ${message}\n`);
  return { sent: false, mock: true, otp, message };
}

// ── Send order status update ────────────────────────────────────────────────
async function sendStatusUpdate(phone, orderNumber, status, city) {
  const messages = {
    confirmed:        `ParcelMate: Your order ${orderNumber} confirmed. Delivery executive assigned.`,
    picked_up:        `ParcelMate: Parcel ${orderNumber} picked up from ${city}. Track on app.`,
    in_transit:       `ParcelMate: Parcel ${orderNumber} is in transit. Estimated 2-3 days.`,
    out_for_delivery: `ParcelMate: Parcel ${orderNumber} is out for delivery today!`,
    delivered:        `ParcelMate: Parcel ${orderNumber} delivered successfully. Thank you!`,
    cancelled:        `ParcelMate: Order ${orderNumber} cancelled. Refund in 5-7 business days.`,
  };

  const msg = messages[status] || `ParcelMate: Order ${orderNumber} status updated to ${status}.`;

  if (IS_LIVE && AUTH_KEY) {
    try {
      await fetch(`https://api.msg91.com/api/sendhttp.php?authkey=${AUTH_KEY}&mobiles=91${phone}&message=${encodeURIComponent(msg)}&route=4&country=91`, { method: 'GET' });
    } catch (e) {
      console.error('Status SMS failed:', e.message);
    }
  } else {
    console.log(`\n📱 [SMS MOCK] → +91${phone}: ${msg}\n`);
  }
}

module.exports = { sendOTP, sendStatusUpdate, IS_LIVE };
