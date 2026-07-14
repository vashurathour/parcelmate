import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { ordersAPI } from '../services/api';
import { StatusBadge, EmptyState, Alert } from '../components/UI';
import { colors, spacing, radius, shadow, typography } from '../utils/theme';

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onPress }) {
  const showPickupOTP  = order.status === 'pending';
  const showDelivOTP   = order.status === 'out_for_delivery';
  const paymentDue     = order.payment_status === 'pending' && order.payment_method === 'online';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHead}>
        <View>
          <Text style={styles.orderNum}>{order.order_number}</Text>
          <StatusBadge status={order.status} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>₹{Math.round(order.total_price || 0)}</Text>
          <Text style={styles.date}>{fmt(order.created_at)}</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <Text style={styles.routeCity}>📍 {order.pickup_city}</Text>
        <Text style={styles.routeArrow}>→</Text>
        <Text style={styles.routeCity}>📦 {order.receiver_city}</Text>
      </View>

      <Text style={styles.receiver}>{order.receiver_name} · {order.parcel_type} · {order.parcel_weight}kg</Text>

      {showPickupOTP && (
        <View style={styles.otpBox}>
          <Text style={styles.otpLabel}>Pickup OTP — share with delivery boy</Text>
          <Text style={styles.otpCode}>{order.pickup_otp}</Text>
        </View>
      )}
      {showDelivOTP && (
        <View style={[styles.otpBox, { backgroundColor: colors.tealL, borderColor: colors.teal }]}>
          <Text style={[styles.otpLabel, { color: colors.teal }]}>Delivery OTP — share on arrival</Text>
          <Text style={[styles.otpCode, { color: colors.teal }]}>{order.delivery_otp}</Text>
        </View>
      )}
      {paymentDue && (
        <View style={styles.payBanner}>
          <Text style={styles.payBannerText}>⚠ Payment pending — tap to pay</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function OrdersScreen({ navigation }) {
  const [orders, setOrders]       = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    try {
      const d = await ordersAPI.list();
      setOrders(d.orders || []);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh when returning from detail screen
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={styles.container}>
      <Alert message={error} type="error" />
      <FlatList
        data={orders}
        keyExtractor={o => o.id}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ListEmptyComponent={
          <EmptyState icon="📦" title="No orders yet"
            subtitle="Book your first pickup" action="+ New booking"
            onAction={() => navigation.navigate('BookOrder')} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg, marginBottom: 12, ...shadow,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNum: { fontSize: 15, fontWeight: '700', color: colors.purple, marginBottom: 5 },
  price: { fontSize: 16, fontWeight: '700', color: colors.purple },
  date: { fontSize: 11, color: colors.muted, marginTop: 2 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  routeCity: { fontSize: 13, fontWeight: '600', color: colors.text },
  routeArrow: { marginHorizontal: 8, color: colors.muted, fontSize: 14 },
  receiver: { fontSize: 12, color: colors.muted },
  otpBox: {
    backgroundColor: colors.purpleL, borderWidth: 2, borderStyle: 'dashed',
    borderColor: colors.purple, borderRadius: radius.md,
    padding: 14, alignItems: 'center', marginTop: 12,
  },
  otpLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, color: colors.purple },
  otpCode: { fontSize: 38, fontWeight: '800', letterSpacing: 8, color: colors.purpleD, marginTop: 4 },
  payBanner: { backgroundColor: colors.coralL, borderRadius: radius.sm, padding: 8, marginTop: 10, alignItems: 'center' },
  payBannerText: { fontSize: 12, fontWeight: '600', color: colors.coral },
});
