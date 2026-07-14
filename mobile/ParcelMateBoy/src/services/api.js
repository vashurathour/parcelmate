import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your computer's IP when testing on a real device
// For emulator: use 10.0.2.2 (Android) or localhost (iOS)
const BASE_URL = 'http://10.0.2.2:3001/api'; // Android emulator
// const BASE_URL = 'http://localhost:3001/api'; // iOS simulator
// const BASE_URL = 'http://YOUR_IP:3001/api';   // Real device

async function getToken() {
  return await AsyncStorage.getItem('pm_token');
}

async function request(method, path, body) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:    (phone, password)  => request('POST', '/auth/login',    { phone, password }),
  register: (name, phone, password, city) => request('POST', '/auth/register', { name, phone, password, city }),
  me:       ()                 => request('GET',  '/auth/me'),
  updateProfile: (data)        => request('PATCH', '/auth/profile', data),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersAPI = {
  list:     (status)           => request('GET', `/orders${status ? '?status=' + status : ''}`),
  get:      (id)               => request('GET', `/orders/${id}`),
  create:   (data)             => request('POST', '/orders', data),
  estimate: (data)             => request('POST', '/orders/estimate', data),
  getOTP:   (id)               => request('GET', `/orders/${id}/otp`),
  updateStatus: (id, status, otp, location) =>
    request('PATCH', `/orders/${id}/status`, { status, otp, location }),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsAPI = {
  initiate:  (orderId)         => request('POST', '/payments/initiate', { order_id: orderId }),
  verify:    (data)            => request('POST', '/payments/verify', data),
  getStatus: (orderId)         => request('GET', `/payments/status/${orderId}`),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifsAPI = {
  list:     ()                 => request('GET', '/notifications'),
  markRead: ()                 => request('PATCH', '/notifications/read-all'),
};

// ── Promo ─────────────────────────────────────────────────────────────────────
export const promoAPI = {
  validate: (code, total)      => request('POST', '/promo/validate', { code, order_total: total }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  boy:      ()                 => request('GET', '/analytics/boy'),
  summary:  ()                 => request('GET', '/analytics/summary'),
};

// ── Partners ──────────────────────────────────────────────────────────────────
export const partnersAPI = {
  list:     ()                 => request('GET', '/partners'),
};

export default { BASE_URL };
