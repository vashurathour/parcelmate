import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, shadow } from '../utils/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const rows = [
    { label: 'Phone',      value: user?.phone },
    { label: 'City',       value: user?.city || '—' },
    { label: 'Role',       value: 'Delivery boy' },
    { label: 'Rating',     value: `⭐ ${user?.rating || '5.0'}` },
    { label: 'Deliveries', value: String(user?.total_deliveries || 0) },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0) || '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>● Active</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.detailCard}>
        {rows.map(({ label, value }) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* How earnings work */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsTitle}>How you earn</Text>
        <Text style={styles.earningsText}>You receive 20% of each order value you deliver.</Text>
        <Text style={styles.earningsExample}>Example: ₹200 order → ₹40 for you</Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 60 },
  avatarCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center',
    marginBottom: spacing.lg, ...shadow,
  },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  activeBadge: { backgroundColor: colors.tealL, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  activeBadgeText: { fontSize: 12, fontWeight: '700', color: colors.teal },
  detailCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, marginBottom: spacing.lg, overflow: 'hidden', ...shadow,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailLabel: { fontSize: 14, color: colors.muted },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text },
  earningsCard: {
    backgroundColor: colors.tealL, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.teal,
  },
  earningsTitle: { fontSize: 13, fontWeight: '700', color: colors.teal, marginBottom: 6 },
  earningsText: { fontSize: 13, color: colors.teal },
  earningsExample: { fontSize: 12, color: colors.teal, marginTop: 4, opacity: 0.8 },
  logoutBtn: {
    backgroundColor: colors.coralL, borderRadius: radius.md, padding: spacing.lg,
    alignItems: 'center', borderWidth: 1, borderColor: colors.coral,
  },
  logoutText: { fontSize: 14, fontWeight: '700', color: colors.coral },
});
