import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TextInput,
  TouchableOpacity, RefreshControl, ScrollView, Alert as RNAlert
} from 'react-native';
import { ordersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, Button, Card, Alert } from '../components/UI';
import { colors, spacing, radius, shadow } from '../utils/theme';

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function ActionCard({ order, onUpdate, loading, user }) {
  const [pickupOTP,  setPickupOTP]  = useState('');
  const [delivOTP,   setDelivOTP]   = useState('');
  const isMine = order.assigned_boy_id === user?.id;
  const earn   = Math.round((order.total_price || order.price || 0) * 0.2);

  return (
    <Card style={[styles.orderCard, isMine && { borderLeftWidth: 4, borderLeftColor: colors.teal }]}>
      {/* Header */}
      <View style={styles.cardHead}>
        <View>
          <Text style={styles.orderNum}>{order.order_number}</Text>
          <StatusBadge status={order.status} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.earning}>+₹{earn}</Text>
          <Text style={styles.totalPrice}>Order: ₹{Math.round(order.total_price || 0)}</Text>
        </View>
      </View>

      {/* Route */}
      <View style={styles.routeBox}>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>PICKUP FROM</Text>
          <Text style={styles.routeCity}>{order.pickup_city}</Text>
          <Text style={styles.routeAddr} numberOfLines={1}>{order.pickup_address}</Text>
        </View>
        <Text style={styles.routeArrow}>→</Text>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>DELIVER TO</Text>
          <Text style={styles.routeCity}>{order.receiver_city}</Text>
          <Text style={styles.routeAddr} numberOfLines={1}>{order.receiver_name}</Text>
        </View>
      </View>

      <Text style={styles.parcelInfo}>
        {order.parcel_type} · {order.parcel_weight}kg
        {order.is_fragile ? ' · ⚠ Fragile' : ''}
        {order.special_instructions ? ` · "${order.special_instructions}"` : ''}
      </Text>

      {/* Actions */}
      {order.status === 'pending' && !isMine && (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Accept to earn ₹{earn}</Text>
          <Button title="Accept delivery" variant="teal"
            onPress={() => onUpdate(order.id, 'confirmed')} loading={loading} />
        </View>
      )}

      {order.status === 'confirmed' && isMine && (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Go to pickup location. Enter OTP from sender:</Text>
          <TextInput style={styles.otpInput} value={pickupOTP} onChangeText={setPickupOTP}
            keyboardType="number-pad" maxLength={6} placeholder="_ _ _ _ _ _"
            placeholderTextColor={colors.hint} />
          <Button title="Confirm pickup with OTP" onPress={() => onUpdate(order.id, 'picked_up', pickupOTP)}
            loading={loading} style={{ marginTop: spacing.sm }} />
        </View>
      )}

      {order.status === 'picked_up' && isMine && (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Parcel collected. Drop at courier hub.</Text>
          <Button title="Mark handed to courier" onPress={() => onUpdate(order.id, 'in_transit')} loading={loading} />
        </View>
      )}

      {order.status === 'in_transit' && isMine && (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>Parcel in transit. Start delivery when at destination.</Text>
          <Button title="Start delivery" onPress={() => onUpdate(order.id, 'out_for_delivery')} loading={loading} />
        </View>
      )}

      {order.status === 'out_for_delivery' && isMine && (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>At delivery location. Enter OTP from receiver:</Text>
          <TextInput style={[styles.otpInput, { borderColor: colors.teal }]} value={delivOTP} onChangeText={setDelivOTP}
            keyboardType="number-pad" maxLength={6} placeholder="_ _ _ _ _ _"
            placeholderTextColor={colors.hint} />
          <Button title="✓ Mark delivered" variant="teal"
            onPress={() => onUpdate(order.id, 'delivered', delivOTP)}
            loading={loading} style={{ marginTop: spacing.sm }} />
        </View>
      )}
    </Card>
  );
}

export default function ActiveScreen({ navigation }) {
  const { user } = useAuth();
  const [orders, setOrders]       = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating]   = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const load = useCallback(async () => {
    try {
      const d = await ordersAPI.list();
      setOrders(d.orders || []);
      setError('');
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  async function handleUpdate(orderId, status, otp) {
    setUpdating(true); setError(''); setSuccess('');
    try {
      await ordersAPI.updateStatus(orderId, status, otp);
      setSuccess(`Order marked as ${status.replace(/_/g, ' ')} ✓`);
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError(e.message); }
    finally { setUpdating(false); }
  }

  async function onRefresh() {
    setRefreshing(true); await load(); setRefreshing(false);
  }

  const mine = orders.filter(o => o.assigned_boy_id === user?.id && !['delivered','cancelled'].includes(o.status));
  const available = orders.filter(o => o.status === 'pending' && !o.assigned_boy_id);
  const all = [...mine, ...available];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      >
        <Alert message={error} type="error" />
        <Alert message={success} type="success" />

        {mine.length > 0 && (
          <>
            <Text style={styles.sectionHead}>MY ACTIVE ({mine.length})</Text>
            {mine.map(o => <ActionCard key={o.id} order={o} onUpdate={handleUpdate} loading={updating} user={user} />)}
          </>
        )}

        {available.length > 0 && (
          <>
            <Text style={[styles.sectionHead, { marginTop: mine.length > 0 ? spacing.lg : 0 }]}>
              AVAILABLE IN {user?.city?.toUpperCase() || 'YOUR CITY'} ({available.length})
            </Text>
            {available.map(o => <ActionCard key={o.id} order={o} onUpdate={handleUpdate} loading={updating} user={user} />)}
          </>
        )}

        {all.length === 0 && !refreshing && (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🚚</Text>
            <Text style={{ fontSize: 16, color: colors.muted }}>No active deliveries</Text>
            <Text style={{ fontSize: 13, color: colors.hint, marginTop: 4 }}>Pull down to refresh</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHead: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.5, marginBottom: 10 },
  orderCard: { marginBottom: 14 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  orderNum: { fontSize: 15, fontWeight: '700', color: colors.purple, marginBottom: 5 },
  earning: { fontSize: 18, fontWeight: '800', color: colors.green },
  totalPrice: { fontSize: 11, color: colors.muted, marginTop: 2 },
  routeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, marginBottom: 10 },
  routeItem: { flex: 1 },
  routeLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', color: colors.hint, marginBottom: 2 },
  routeCity: { fontSize: 14, fontWeight: '700', color: colors.text },
  routeAddr: { fontSize: 11, color: colors.muted, marginTop: 2 },
  routeArrow: { fontSize: 18, color: colors.muted, paddingHorizontal: 8 },
  parcelInfo: { fontSize: 12, color: colors.muted, marginBottom: 10 },
  actionBox: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, marginTop: 4 },
  actionTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 10 },
  otpInput: {
    borderWidth: 2, borderColor: colors.purple, borderRadius: radius.md,
    padding: 14, fontSize: 28, fontWeight: '800', textAlign: 'center',
    letterSpacing: 12, color: colors.purpleD, backgroundColor: colors.surface,
  },
});
