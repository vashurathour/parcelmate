/**
 * ParcelMate Payment Service — Razorpay Integration
 *
 * HOW TO GO LIVE:
 * 1. Create account at https://razorpay.com
 * 2. Go to Dashboard → Settings → API Keys
 * 3. Generate Key ID and Key Secret
 * 4. Replace RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
 * 5. In production, use live keys (rzp_live_...) instead of test keys
 *
 * TEST CARD: 4111 1111 1111 1111, CVV: any 3 digits, Expiry: any future date
 * TEST UPI:  success@razorpay
 */

const crypto = require('crypto');

const KEY_ID     = process.env.RAZORPAY_KEY_ID     || 'rzp_test_placeholder';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret';
const IS_LIVE    = KEY_ID.startsWith('rzp_live_');

// ── Create Razorpay order ───────────────────────────────────────────────────
async function createRazorpayOrder({ orderId, amount, currency = 'INR', notes = {} }) {
  // amount must be in paise (₹1 = 100 paise)
  const amountPaise = Math.round(amount * 100);

  // If real keys available, hit Razorpay API
  if (KEY_ID !== 'rzp_test_placeholder') {
    const body = JSON.stringify({
      amount: amountPaise,
      currency,
      receipt: orderId,
      notes: { ...notes, parcelmate_order: orderId },
    });

    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
      body,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.description || 'Razorpay order creation failed');
    }

    return await res.json();
  }

  // Development mode — return mock order
  return {
    id: `order_mock_${Date.now()}`,
    entity: 'order',
    amount: amountPaise,
    currency,
    status: 'created',
    receipt: orderId,
    _mock: true,
    _message: 'Add real Razorpay keys in .env to process real payments',
  };
}

// ── Verify payment signature ────────────────────────────────────────────────
function verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;

  // In mock mode, accept any signature
  if (razorpay_order_id.startsWith('order_mock_')) return true;

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSig = crypto
    .createHmac('sha256', KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSig === razorpay_signature;
}

// ── Verify webhook signature ────────────────────────────────────────────────
function verifyWebhookSignature(body, signature, webhookSecret) {
  const expected = crypto
    .createHmac('sha256', webhookSecret || KEY_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');
  return expected === signature;
}

// ── Refund payment ──────────────────────────────────────────────────────────
async function refundPayment({ paymentId, amount, reason = 'requested_by_customer' }) {
  if (!paymentId || paymentId.startsWith('mock_')) {
    return { id: `refund_mock_${Date.now()}`, status: 'processed', amount: Math.round(amount * 100) };
  }

  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: Math.round(amount * 100), notes: { reason } }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.description || 'Refund failed');
  }

  return await res.json();
}

// ── Get Razorpay checkout config for frontend ───────────────────────────────
function getCheckoutConfig({ razorpayOrderId, amount, name, phone, email, description }) {
  return {
    key: KEY_ID,
    amount: Math.round(amount * 100),
    currency: 'INR',
    name: 'ParcelMate',
    description: description || 'Parcel Delivery',
    order_id: razorpayOrderId,
    prefill: { name, contact: phone, email: email || '' },
    theme: { color: '#534AB7' },
    modal: { backdropclose: false },
    _is_test: !IS_LIVE,
    _test_note: IS_LIVE ? null : 'Test mode: use card 4111 1111 1111 1111 or UPI success@razorpay',
  };
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  refundPayment,
  getCheckoutConfig,
  IS_LIVE,
};
