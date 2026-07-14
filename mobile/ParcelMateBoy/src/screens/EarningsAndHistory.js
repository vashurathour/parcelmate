import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, FlatList } from 'react-native';
import { analyticsAPI, ordersAPI } from '../services/api';
import { Card, StatusBadge, Alert } from '../components/UI';
import { colors, spacing, radius, shadow } from '../utils/theme';

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Earnings Screen ───────────────────────────────────────────────────────────
export function EarningsScreen() {
  const [stats, setStats]         = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    try { const d = await analyticsAPI.boy(); setStats(d); setError(''); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}>
      <Alert message={error} type="error" />

      {stats ? (
        <>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: colors.teal }]}>
              <Text style={[styles.statVal, { color: colors.teal }]}>{stats.stats.totalDeliveries}</Text>
              <Text style={styles.statLbl}>Delivered</Text>
            </View>
            <View style={[styles.statBox, { borderColor: colors.amber }]}>
              <Text style={[styles.statVal, { color: colors.amber }]}>{stats.stats.activeOrders}</Text>
              <Text style={styles.statLbl}>Active</Text>
            </View>
            <View style={[styles.statBox, { borderColor: colors.green }]}>
              <Text style={[styles.statVal, { color: colors.green }]}>₹{Math.round(stats.stats.totalEarnings)}</Text>
              <Text style={styles.statLbl}>Earned</Text>
            </View>
          </View>

          {/* Earnings breakdown */}
          <Card style={styles.earningsCard}>
            <Text style={styles.sectionHead}>Earnings summary</Text>
            {[
              ['Total earned', `₹${Math.round(stats.stats.totalEarnings)}`, colors.green],
              ['Pending payout', `₹${Math.round(stats.stats.pendingEarnings)}`, colors.amber],
              ['Your rating', `⭐ ${(stats.stats.rating || 5).toFixed(1)}`, colors.purple],
            ].map(([label, val, color]) => (
              <View key={label} style={styles.earningRow}>
                <Text style={styles.earningLabel}>{label}</Text>
                <Text style={[styles.earningVal, { color }]}>{val}</Text>
              </View>
            ))}
          </Card>

          {/* Per-delivery breakdown */}
          <Card>
            <Text style={styles.sectionHead}>Per delivery</Text>
            <View style={styles.perDelivBox}>
              <Text style={styles.perDelivBig}>20%</Text>
              <Text style={styles.perDelivSub}>of each order value</Text>
              <Text style={styles.perDelivExample}>e.g. ₹100 order → ₹20 for you</Text>
            </View>
          </Card>

          {/* Recent */}
          {stats.recentDeliveries.length > 0 && (
            <Card style={{ marginTop: spacing.md }}>
              <Text style={styles.sectionHead}>Recent deliveries</Text>
              {stats.recentDeliveries.map((d, i) => (
                <View key={i} style={styles.recentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', fontSize: 13 }}>{d.order_number}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{d.receiver_city} · {fmt(d.updated_at)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <StatusBadge status={d.status} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.green, marginTop: 4 }}>+₹{Math.round(d.amount || 0)}</Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      ) : (
        <View style={{ alignItems: 'center', padding: 48 }}>
          <Text style={{ color: colors.muted }}>Loading earnings…</Text>
        </View>
      )}
    </ScrollView>
  );
}

// ── History Screen ────────────────────────────────────────────────────────────
export function HistoryScreen() {
  const [orders, setOrders]       = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    try {
      const d = await ordersAPI.list('delivered');
      setOrders(d.orders || []);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { load(); }, [load]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  return (
    <FlatList
      data={orders}
      keyExtractor={o => o.id}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
          <Text style={{ fontSize: 16, color: colors.muted }}>No deliveries completed yet</Text>
        </View>
      }
      renderItem={({ item: o }) => (
        <View style={[styles.histCard]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={{ fontWeight: '700', fontSize: 14, color: colors.purple }}>{o.order_number}</Text>
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>
                {o.pickup_city} → {o.receiver_city}
              </Text>
              <Text style={{ fontSize: 11, color: colors.hint, marginTop: 2 }}>{fmt(o.updated_at)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <StatusBadge status="delivered" />
              <Text style={{ fontSize: 16, fontWeight: '800', color: colors.green, marginTop: 6 }}>
                +₹{Math.round((o.total_price || 0) * 0.2)}
              </Text>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 80 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  statBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, padding: spacing.md, alignItems: 'center', ...shadow },
  statVal: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  statLbl: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.muted, letterSpacing: 0.5 },
  earningsCard: { marginBottom: spacing.md },
  sectionHead: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: colors.muted, letterSpacing: 0.5, marginBottom: spacing.md },
  earningRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  earningLabel: { fontSize: 14, color: colors.text },
  earningVal: { fontSize: 15, fontWeight: '700' },
  perDelivBox: { alignItems: 'center', paddingVertical: spacing.lg },
  perDelivBig: { fontSize: 52, fontWeight: '800', color: colors.teal },
  perDelivSub: { fontSize: 14, color: colors.muted, marginTop: 4 },
  perDelivExample: { fontSize: 12, color: colors.hint, marginTop: 6 },
  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  histCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, marginBottom: 10, ...shadow },
});
