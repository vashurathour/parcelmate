import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, TouchableOpacity
} from 'react-native';
import { ordersAPI, promoAPI } from '../services/api';
import { Button, Input, Alert, PriceRow } from '../components/UI';
import { colors, spacing, radius } from '../utils/theme';

const PARCEL_TYPES = ['general','book','document','parcel','fragile'];

export default function BookOrderScreen({ navigation }) {
  const [loading, setLoading]   = useState(false);
  const [estimating, setEst]    = useState(false);
  const [error, setError]       = useState('');
  const [pricing, setPricing]   = useState(null);
  const [promoMsg, setPromoMsg] = useState('');
  const [promoDisc, setPromoDisc] = useState(0);

  const [form, setForm] = useState({
    receiver_name: '', receiver_phone: '', receiver_address: '', receiver_city: '',
    pickup_address: '', pickup_city: '',
    parcel_type: 'general', parcel_weight: '0.5', parcel_description: '',
    parcel_value: '0', is_fragile: false,
    payment_method: 'online', special_instructions: '', promo_code: '',
  });

  function update(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  const estimatePrice = useCallback(async () => {
    if (!form.pickup_city || !form.receiver_city) return;
    setEst(true);
    try {
      const d = await ordersAPI.estimate({
        from_city: form.pickup_city, to_city: form.receiver_city,
        weight: parseFloat(form.parcel_weight) || 0.5,
        parcel_type: form.parcel_type, is_fragile: form.is_fragile,
        promo_code: form.promo_code || undefined,
      });
      setPricing(d.pricing);
      setPromoDisc(d.discount || 0);
      setPromoMsg(d.promo_message || '');
    } catch {}
    finally { setEst(false); }
  }, [form.pickup_city, form.receiver_city, form.parcel_weight, form.parcel_type, form.is_fragile, form.promo_code]);

  async function applyPromo() {
    if (!pricing || !form.promo_code) return;
    try {
      const d = await promoAPI.validate(form.promo_code, pricing.total);
      setPromoDisc(d.discount);
      setPromoMsg(`✅ ${d.message}`);
    } catch (e) {
      setPromoMsg(`❌ ${e.message}`);
      setPromoDisc(0);
    }
  }

  async function handleBook() {
    const { receiver_name, receiver_phone, receiver_address, receiver_city, pickup_address, pickup_city } = form;
    if (!receiver_name || !receiver_phone || !receiver_address || !receiver_city || !pickup_address || !pickup_city) {
      setError('All address and receiver fields are required');
      return;
    }
    setLoading(true); setError('');
    try {
      const body = {
        ...form,
        parcel_weight: parseFloat(form.parcel_weight) || 0.5,
        parcel_value:  parseFloat(form.parcel_value)  || 0,
        promo_code:    form.promo_code || undefined,
      };
      const data = await ordersAPI.create(body);
      navigation.replace('BookingConfirmed', { orderData: data });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const finalTotal = pricing ? pricing.total - promoDisc : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Alert message={error} type="error" />

        {/* Receiver */}
        <Text style={styles.sectionHead}>📍 Receiver details</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Input label="Full name" value={form.receiver_name} onChangeText={v => update('receiver_name', v)} placeholder="Receiver name" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Phone" value={form.receiver_phone} onChangeText={v => update('receiver_phone', v)} keyboardType="phone-pad" maxLength={10} placeholder="10 digits" />
          </View>
        </View>
        <Input label="Delivery address" value={form.receiver_address} onChangeText={v => update('receiver_address', v)} placeholder="Full address with landmark" multiline />
        <Input label="Delivery city" value={form.receiver_city} onChangeText={v => { update('receiver_city', v); }} onBlur={estimatePrice} placeholder="e.g. Delhi" />

        <View style={styles.divider} />

        {/* Pickup */}
        <Text style={styles.sectionHead}>🏠 Your pickup details</Text>
        <Input label="Pickup address" value={form.pickup_address} onChangeText={v => update('pickup_address', v)} placeholder="Your home or office address" multiline />
        <Input label="Pickup city" value={form.pickup_city} onChangeText={v => update('pickup_city', v)} onBlur={estimatePrice} placeholder="e.g. Ludhiana" />

        <View style={styles.divider} />

        {/* Parcel */}
        <Text style={styles.sectionHead}>📦 Parcel details</Text>
        <Text style={styles.fieldLabel}>Parcel type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
          {PARCEL_TYPES.map(t => (
            <TouchableOpacity key={t} style={[styles.typeChip, form.parcel_type === t && styles.typeChipOn]}
              onPress={() => { update('parcel_type', t); setTimeout(estimatePrice, 100); }}>
              <Text style={[styles.typeChipText, form.parcel_type === t && styles.typeChipTextOn]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Input label="Weight (kg)" value={form.parcel_weight} onChangeText={v => update('parcel_weight', v)} onBlur={estimatePrice} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Value (₹)" value={form.parcel_value} onChangeText={v => update('parcel_value', v)} keyboardType="decimal-pad" placeholder="0" />
          </View>
        </View>
        <Input label="Description (optional)" value={form.parcel_description} onChangeText={v => update('parcel_description', v)} placeholder="What's inside?" />

        <TouchableOpacity style={styles.checkRow} onPress={() => { update('is_fragile', !form.is_fragile); setTimeout(estimatePrice, 100); }}>
          <View style={[styles.checkbox, form.is_fragile && styles.checkboxOn]}>
            {form.is_fragile && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>⚠ Fragile item — handle with care</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Payment */}
        <Text style={styles.sectionHead}>💳 Payment</Text>
        {['online','cod'].map(m => (
          <TouchableOpacity key={m} style={[styles.payOption, form.payment_method === m && styles.payOptionOn]}
            onPress={() => update('payment_method', m)}>
            <View style={[styles.radio, form.payment_method === m && styles.radioOn]} />
            <View>
              <Text style={styles.payOptionTitle}>{m === 'online' ? 'Online payment' : 'Cash on delivery'}</Text>
              <Text style={styles.payOptionSub}>{m === 'online' ? 'UPI · Card · Net Banking' : 'Pay cash when parcel arrives'}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Promo code */}
        <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Promo code</Text>
        <View style={styles.promoRow}>
          <Input value={form.promo_code} onChangeText={v => update('promo_code', v.toUpperCase())}
            placeholder="FIRST50 or SAVE20" style={{ flex: 1, marginBottom: 0 }} />
          <Button title="Apply" onPress={applyPromo} variant="teal" size="sm" style={{ marginLeft: 8, alignSelf: 'flex-end', marginBottom: 14 }} />
        </View>
        {promoMsg ? <Text style={[styles.promoMsg, { color: promoDisc > 0 ? colors.green : colors.coral }]}>{promoMsg}</Text> : null}

        <Input label="Special instructions (optional)" value={form.special_instructions} onChangeText={v => update('special_instructions', v)} placeholder="Handle with care, call before delivery…" />

        {/* Price estimate */}
        {pricing && (
          <View style={styles.priceBox}>
            <Text style={styles.priceTitle}>Price estimate {estimating ? '(updating…)' : ''}</Text>
            <PriceRow label="Base price" value={`₹${pricing.breakdown?.base || 0}`} />
            <PriceRow label="Weight charge" value={`₹${pricing.breakdown?.weight_charge || 0}`} />
            {pricing.breakdown?.intercity ? <PriceRow label="Intercity charge" value={`₹${pricing.breakdown.intercity}`} /> : null}
            {pricing.breakdown?.fragile ? <PriceRow label="Fragile surcharge" value={`₹${pricing.breakdown.fragile}`} /> : null}
            <PriceRow label="GST (18%)" value={`₹${pricing.tax}`} />
            {promoDisc > 0 && <PriceRow label="Promo discount" value={`-₹${promoDisc}`} color={colors.green} />}
            <PriceRow label="Total" value={`₹${finalTotal}`} bold color={colors.purple} />
          </View>
        )}

        <Button title={loading ? 'Booking…' : 'Confirm booking'} onPress={handleBook}
          loading={loading} size="lg" style={{ marginTop: spacing.md }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  sectionHead: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },
  row: { flexDirection: 'row' },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.muted, marginBottom: 5 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.surface },
  typeChipOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  typeChipText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  typeChipTextOn: { color: '#fff', fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  checkLabel: { fontSize: 14, color: colors.text },
  payOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, marginBottom: 8, backgroundColor: colors.surface },
  payOptionOn: { borderColor: colors.purple, backgroundColor: colors.purpleL },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, marginRight: 12 },
  radioOn: { borderColor: colors.purple, backgroundColor: colors.purple },
  payOptionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  payOptionSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  promoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  promoMsg: { fontSize: 12, fontWeight: '600', marginBottom: spacing.sm, marginTop: -8 },
  priceBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  priceTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: colors.muted, marginBottom: 8 },
});
