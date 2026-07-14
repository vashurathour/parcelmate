import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert as RNAlert
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { ordersAPI, paymentsAPI } from '../services/api';
import {
  StatusBadge, Button, Card, TrackingTimeline,
  PriceRow, Alert
} from '../components/UI';
import { colors, spacing, radius, shadow } from '../utils/theme';

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STEPS = ['pending','confirmed','picked_up','in_transit','out_for_delivery','delivered'];

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [paying, setPaying]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => { loadOrder(); }, []);

  async function loadOrder() {
    try {
      setLoading(true);
      const d = await ordersAPI.get(orderId);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function initiatePayment() {
    if (!data?.order) return;
    setPaying(true); setError('');
    try {
      const res = await paymentsAPI.initiate(data.order.id);
      const rzp = res.razorpay;

      if (!rzp || rzp._mock) {
        // Dev mode — simulate success
        await paymentsAPI.verify({
          razorpay_order_id: rzp?.id || 'order_mock',
          razorpay_payment_id: 'pay_mock_' + Date.now(),
          razorpay_signature: 'mock_sig',
          order_id: data.order.id,
        });
        setSuccess('Payment successful! (Test mode)');
        loadOrder();
        return;
      }

      // Real Razorpay
      const options = {
        description: `Order ${data.order.order_number}`,
        image: 'https://parcelmate.app/logo.png',
        currency: 'INR',
        key: rzp.key,
        amount: rzp.amount,
        name: 'ParcelMate',
        order_id: rzp.order_id,
        prefill: { contact: rzp.prefill?.contact, email: rzp.prefill?.email || '' },
        theme: { color: colors.purple },
      };

      const paymentData = await RazorpayCheckout.open(options);

      await paymentsAPI.verify({
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        order_id: data.order.id,
      });

      setSuccess('Payment successful! Your booking is confirmed.');
      loadOrder();
    } catch (e) {
      if (e.code === 'PAYMENT_CANCELLED') {
        setError('Payment cancelled. You can retry.');
      } else {
        setError(e.message || 'Payment failed');
      }
    } finally {
      setPaying(false);
    }
  }

  if (loading) return (
    <View style={styles.center}><Text style={styles.loadingText}>Loading order…</Text></View>
  );
  if (!data) return (
    <View style={styles.center}><Text style={{ color: colors.coral }}>{error}</Text></View>
  );

  const { order: o, tracking: tr } = data;
  const curStep = STEPS.indexOf(o.status);
  const paymentDue = o.payment_status === 'pending' && o.payment_method === 'online';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.orderNum}>{o.order_number}</Text>
          <StatusBadge status={o.status} />
        </View>
        <Text style={styles.price}>₹{Math.round(o.total_price || 0)}</Text>
      </View>

      <Alert message={error} type="error" />
      <Alert message={success} type="success" />

      {/* Step progress */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.step, i < curStep && styles.stepDone, i === curStep && styles.stepActive]}>
            <Text style={[styles.stepText, (i <= curStep) && { color: i === curStep ? '#fff' : colors.purple }]}>
              {s.replace(/_/g, ' ')}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* OTP boxes */}
      {o.status === 'pending' && (
        <View style={styles.otpBox}>
          <Text style={styles.otpLabel}>Pickup OTP</Text>
          <Text style={styles.otpCode}>{o.pickup_otp}</Text>
          <Text style={styles.otpHint}>Share with delivery boy when they arrive</Text>
        </View>
      )}
      {o.status === 'out_for_delivery' && (
        <View style={[styles.otpBox, { backgroundColor: colors.tealL, borderColor: colors.teal }]}>
          <Text style={[styles.otpLabel, { color: colors.teal }]}>Delivery OTP</Text>
          <Text style={[styles.otpCode, { color: colors.teal }]}>{o.delivery_otp}</Text>
          <Text style={[styles.otpHint, { color: colors.teal }]}>Share with delivery boy when parcel arrives</Text>
        </View>
      )}

      {/* Payment section */}
      {paymentDue && (
        <Card style={styles.payCard}>
          <Text style={styles.payTitle}>⚠ Payment required</Text>
          <Text style={styles.paySub}>Complete payment to confirm your booking</Text>
          <Button title={`Pay ₹${Math.round(o.total_price)} via Razorpay`}
            onPress={initiatePayment} loading={paying} size="lg" style={{ marginTop: spacing.md }} />
          <Text style={styles.payNote}>🔒 UPI · Card · Net Banking · Wallet</Text>
          <Text style={styles.payTestNote}>Test: UPI success@razorpay · Card 4111 1111 1111 1111</Text>
        </Card>
      )}
      {o.payment_status === 'completed' && (
        <View style={styles.paidBanner}>
          <Text style={{ color: colors.green, fontWeight: '700' }}>✅ Payment confirmed · ₹{Math.round(o.total_price)}</Text>
        </View>
      )}

      {/* Details */}
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={styles.sectionLabel}>Receiver</Text>
        <Text style={styles.detailMain}>{o.receiver_name} · {o.receiver_phone}</Text>
        <Text style={styles.detailSub}>{o.receiver_address}, {o.receiver_city}</Text>
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={styles.sectionLabel}>Parcel</Text>
        <Text style={styles.detailMain}>{o.parcel_type} · {o.parcel_weight}kg{o.is_fragile ? ' · ⚠ Fragile' : ''}</Text>
        {o.parcel_description ? <Text style={styles.detailSub}>{o.parcel_description}</Text> : null}
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <Text style={styles.sectionLabel}>Price breakdown</Text>
        <PriceRow label="Subtotal" value={`₹${Math.round(o.subtotal || 0)}`} />
        <PriceRow label="GST (18%)" value={`₹${Math.round(o.tax || 0)}`} />
        <PriceRow label="Total" value={`₹${Math.round(o.total_price || 0)}`} bold color={colors.purple} />
      </Card>

      {o.boy_name && (
        <Card style={[{ marginBottom: spacing.md }, { backgroundColor: colors.tealL }]}>
          <Text style={styles.sectionLabel}>Delivery boy</Text>
          <Text style={styles.detailMain}>{o.boy_name}</Text>
          {o.boy_rating && <Text style={styles.detailSub}>⭐ {o.boy_rating}</Text>}
        </Card>
      )}

      {/* Tracking */}
      <Card>
        <Text style={[styles.sectionLabel, { marginBottom: spacing.md }]}>Tracking history</Text>
        {tr && tr.length > 0 ? <TrackingTimeline events={tr} /> : <Text style={{ color: colors.muted }}>No events yet</Text>}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.muted },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  orderNum: { fontSize: 18, fontWeight: '800', color: colors.purple, marginBottom: 6 },
  price: { fontSize: 22, fontWeight: '800', color: colors.purple },
  step: { backgroundColor: colors.bg, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 5, marginRight: 6, borderWidth: 1, borderColor: colors.border },
  stepDone: { backgroundColor: colors.purpleL, borderColor: 'transparent' },
  stepActive: { backgroundColor: colors.purple, borderColor: 'transparent' },
  stepText: { fontSize: 11, fontWeight: '600', color: colors.hint, textTransform: 'capitalize' },
  otpBox: {
    backgroundColor: colors.purpleL, borderWidth: 2, borderStyle: 'dashed',
    borderColor: colors.purple, borderRadius: radius.md,
    padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg,
  },
  otpLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.purple },
  otpCode: { fontSize: 44, fontWeight: '800', letterSpacing: 10, color: colors.purpleD, marginVertical: 6 },
  otpHint: { fontSize: 12, color: colors.purple, opacity: 0.7 },
  payCard: { marginBottom: spacing.md, borderColor: colors.purple, borderWidth: 1.5 },
  payTitle: { fontSize: 15, fontWeight: '700', color: colors.purple },
  paySub: { fontSize: 13, color: colors.muted, marginTop: 4 },
  payNote: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  payTestNote: { fontSize: 11, color: colors.hint, textAlign: 'center', marginTop: 4 },
  paidBanner: { backgroundColor: colors.greenL, borderRadius: radius.md, padding: 12, alignItems: 'center', marginBottom: spacing.md },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.muted, marginBottom: 6 },
  detailMain: { fontSize: 14, fontWeight: '600', color: colors.text },
  detailSub: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
