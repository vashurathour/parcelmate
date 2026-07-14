import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Button, PriceRow } from '../components/UI';
import { colors, spacing, radius } from '../utils/theme';

// ── Booking Confirmed ─────────────────────────────────────────────────────────
export function BookingConfirmedScreen({ route, navigation }) {
  const { orderData: d } = route.params;
  const isOnline = d.order.payment_method === 'online';
  const paymentDue = isOnline && d.order.payment_status === 'pending';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.successIcon}><Text style={{ fontSize: 48 }}>🎉</Text></View>
      <Text style={styles.title}>Booking confirmed!</Text>
      <Text style={styles.subtitle}>Order {d.order.order_number}</Text>

      <View style={styles.otpBox}>
        <Text style={styles.otpLabel}>Pickup OTP</Text>
        <Text style={styles.otpCode}>{d.pickup_otp}</Text>
        <Text style={styles.otpHint}>Share with delivery boy when they come to collect</Text>
      </View>

      <View style={styles.priceCard}>
        {d.pricing && (
          <>
            <PriceRow label="Subtotal" value={`₹${d.pricing.subtotal}`} />
            <PriceRow label="GST" value={`₹${d.pricing.tax}`} />
            {d.pricing.discount > 0 && <PriceRow label="Promo discount" value={`-₹${d.pricing.discount}`} color={colors.green} />}
            <PriceRow label="Total" value={`₹${d.pricing.final_total || d.pricing.total}`} bold color={colors.purple} />
          </>
        )}
        <PriceRow label="Payment" value={d.order.payment_method === 'cod' ? 'Cash on delivery' : 'Online'} />
      </View>

      {paymentDue && (
        <View style={styles.payAlert}>
          <Text style={styles.payAlertText}>Complete payment to confirm your order</Text>
          <Button title={`Pay ₹${Math.round(d.order.total_price)} now`}
            onPress={() => navigation.replace('OrderDetail', { orderId: d.order.id })}
            size="lg" style={{ marginTop: spacing.md }} />
          <Text style={styles.payNote}>Test UPI: success@razorpay · Card: 4111 1111 1111 1111</Text>
        </View>
      )}
      {!paymentDue && (
        <View style={styles.codNote}>
          <Text style={styles.codNoteText}>💵 Pay cash to delivery boy when order is delivered</Text>
        </View>
      )}

      <Button title="View order details" variant="outline"
        onPress={() => navigation.replace('OrderDetail', { orderId: d.order.id })}
        style={{ marginTop: spacing.md }} />
      <Button title="Back to my orders" variant="outline"
        onPress={() => navigation.popToTop()} style={{ marginTop: 10 }} />
    </ScrollView>
  );
}

// ── Profile Screen ────────────────────────────────────────────────────────────
export function ProfileScreen({ navigation }) {
  const { useAuth } = require('../context/AuthContext');
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || '?'}</Text>
        </View>
        <Text style={styles.profileName}>{user?.name}</Text>
        <Text style={styles.profilePhone}>{user?.phone}</Text>
        {user?.city && <Text style={styles.profileCity}>📍 {user.city}</Text>}
      </View>

      {[
        { icon: '📦', label: 'My orders', screen: 'Orders' },
        { icon: '🔔', label: 'Notifications', screen: 'Notifications' },
        { icon: '❓', label: 'Help & support', screen: null },
        { icon: '📋', label: 'Terms & privacy', screen: null },
      ].map(item => (
        <TouchableOpacity key={item.label} style={styles.menuItem}
          onPress={() => item.screen && navigation.navigate(item.screen)}>
          <Text style={styles.menuIcon}>{item.icon}</Text>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.promoBox}>
        <Text style={styles.promoBoxTitle}>Active promo codes</Text>
        <Text style={styles.promoCode}>FIRST50 — 50% off your first order</Text>
        <Text style={styles.promoCode}>SAVE20 — Flat ₹20 off on orders above ₹100</Text>
      </View>

      <Button title="Logout" variant="danger" onPress={handleLogout} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  successIcon: { alignItems: 'center', marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 15, color: colors.purple, fontWeight: '600', textAlign: 'center', marginBottom: spacing.xl },
  otpBox: {
    backgroundColor: colors.purpleL, borderWidth: 2, borderStyle: 'dashed',
    borderColor: colors.purple, borderRadius: radius.md,
    padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg,
  },
  otpLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, color: colors.purple },
  otpCode: { fontSize: 48, fontWeight: '800', letterSpacing: 10, color: colors.purpleD, marginVertical: 8 },
  otpHint: { fontSize: 12, color: colors.purple, opacity: 0.8, textAlign: 'center' },
  priceCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  payAlert: { backgroundColor: colors.purpleL, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1.5, borderColor: colors.purple },
  payAlertText: { fontSize: 14, fontWeight: '600', color: colors.purple },
  payNote: { fontSize: 11, color: colors.muted, textAlign: 'center', marginTop: 8 },
  codNote: { backgroundColor: colors.amberL, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  codNoteText: { fontSize: 13, color: colors.amber, fontWeight: '600' },
  profileCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.xl },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 18, fontWeight: '700', color: colors.text },
  profilePhone: { fontSize: 14, color: colors.muted, marginTop: 4 },
  profileCity: { fontSize: 13, color: colors.purple, marginTop: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.lg, borderRadius: radius.md, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  menuIcon: { fontSize: 20, marginRight: spacing.md },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.text },
  menuArrow: { fontSize: 20, color: colors.hint },
  promoBox: { backgroundColor: colors.greenL, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  promoBoxTitle: { fontSize: 12, fontWeight: '700', color: colors.green, marginBottom: 8, textTransform: 'uppercase' },
  promoCode: { fontSize: 13, color: colors.green, marginBottom: 4 },
});
