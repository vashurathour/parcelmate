import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, ScrollView
} from 'react-native';
import { colors, typography, spacing, radius, shadow, STATUS_COLORS } from '../utils/theme';

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style }) {
  const bgMap = {
    primary: colors.purple, teal: colors.teal, amber: colors.amber,
    outline: 'transparent', danger: colors.coralL,
  };
  const textMap = {
    primary: '#fff', teal: '#fff', amber: '#fff',
    outline: colors.text, danger: colors.coral,
  };
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
      style={[
        styles.btn,
        { backgroundColor: bgMap[variant], borderWidth: variant === 'outline' ? 1 : 0, borderColor: colors.border },
        size === 'sm' && styles.btnSm,
        size === 'lg' && styles.btnLg,
        isDisabled && styles.btnDisabled,
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'outline' ? colors.purple : '#fff'} size="small" />
        : <Text style={[styles.btnText, { color: textMap[variant] }, size === 'sm' && { fontSize: 12 }]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const sc = STATUS_COLORS[status] || { bg: colors.border, text: colors.muted };
  return (
    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
      <Text style={[styles.badgeText, { color: sc.text }]}>
        {(status || '').replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, style, ...props }) {
  return (
    <View style={[styles.fieldWrap, style]}>
      {label && <Text style={styles.fieldLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={colors.hint}
        {...props}
      />
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ── OTP Display Box ───────────────────────────────────────────────────────────
export function OTPBox({ otp, label, color = colors.purple }) {
  return (
    <View style={[styles.otpBox, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.otpLabel, { color }]}>{label}</Text>
      <Text style={[styles.otpCode, { color }]}>{otp}</Text>
      <Text style={[styles.otpHint, { color }]}>Share this with delivery boy</Text>
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHd}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Price Row ─────────────────────────────────────────────────────────────────
export function PriceRow({ label, value, bold, color }) {
  return (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, bold && { fontWeight: '700' }]}>{label}</Text>
      <Text style={[styles.priceValue, bold && { fontWeight: '700', fontSize: 16 }, color && { color }]}>
        {value}
      </Text>
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, action, onAction }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon || '📦'}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySub}>{subtitle}</Text>}
      {action && <Button title={action} onPress={onAction} style={{ marginTop: 16 }} />}
    </View>
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────
export function Alert({ message, type = 'error' }) {
  if (!message) return null;
  const cfg = {
    error:   { bg: colors.coralL, text: colors.coral },
    success: { bg: colors.greenL, text: colors.green },
    info:    { bg: colors.purpleL, text: colors.purple },
  };
  const c = cfg[type] || cfg.error;
  return (
    <View style={[styles.alert, { backgroundColor: c.bg }]}>
      <Text style={[styles.alertText, { color: c.text }]}>{message}</Text>
    </View>
  );
}

// ── Tracking Timeline ─────────────────────────────────────────────────────────
export function TrackingTimeline({ events }) {
  return (
    <View style={styles.timeline}>
      {events.map((ev, i) => (
        <View key={ev.id || i} style={styles.tItem}>
          <View style={styles.tLine}>
            <View style={[styles.tDot, i === events.length - 1 ? styles.tDotActive : styles.tDotDone]} />
            {i < events.length - 1 && <View style={styles.tConnector} />}
          </View>
          <View style={styles.tContent}>
            <Text style={styles.tTitle}>{ev.title}</Text>
            <Text style={styles.tDesc}>{ev.description}</Text>
            <Text style={styles.tTime}>
              {ev.location} · {ev.created_at ? new Date(ev.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnSm: { paddingHorizontal: 14, paddingVertical: 8 },
  btnLg: { paddingVertical: 16 },
  btnText: { fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.5 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, ...shadow },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  fieldWrap: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.muted, marginBottom: 5 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text },
  inputError: { borderColor: colors.coral },
  fieldError: { fontSize: 12, color: colors.coral, marginTop: 4 },
  otpBox: { borderWidth: 2, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginVertical: spacing.md },
  otpLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  otpCode: { fontSize: 42, fontWeight: '800', letterSpacing: 10, fontVariant: ['tabular-nums'] },
  otpHint: { fontSize: 11, marginTop: 6, opacity: 0.8 },
  sectionHd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sectionAction: { fontSize: 13, color: colors.purple, fontWeight: '600' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  priceLabel: { fontSize: 13, color: colors.text },
  priceValue: { fontSize: 13, color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.hint, textAlign: 'center' },
  alert: { padding: 12, borderRadius: radius.md, marginBottom: 14 },
  alertText: { fontSize: 13, fontWeight: '500' },
  timeline: { paddingLeft: 24 },
  tItem: { flexDirection: 'row', marginBottom: 18 },
  tLine: { width: 24, alignItems: 'center', marginLeft: -24 },
  tDot: { width: 14, height: 14, borderRadius: 7, marginTop: 2 },
  tDotDone: { backgroundColor: colors.teal },
  tDotActive: { backgroundColor: colors.purple, shadowColor: colors.purple, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 6 },
  tConnector: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  tContent: { flex: 1, paddingLeft: 12 },
  tTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  tDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  tTime: { fontSize: 11, color: colors.hint, marginTop: 2 },
});
