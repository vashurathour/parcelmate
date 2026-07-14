import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Alert } from '../components/UI';
import { colors, spacing, radius, typography } from '../utils/theme';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [tab, setTab]         = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Login form
  const [phone, setPhone]       = useState('9876543210');
  const [password, setPassword] = useState('password123');

  // Register form
  const [name, setName]     = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPass, setRegPass]   = useState('');
  const [city, setCity]         = useState('');

  async function handleLogin() {
    if (!phone || !password) { setError('Phone and password required'); return; }
    setLoading(true); setError('');
    try { await login(phone, password); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  async function handleRegister() {
    if (!name || !regPhone || !regPass) { setError('All fields required'); return; }
    if (regPass.length < 6) { setError('Password must be 6+ characters'); return; }
    setLoading(true); setError('');
    try { await register(name, regPhone, regPass, city); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.logo}>📦 ParcelMate</Text>
          <Text style={styles.tagline}>Doorstep parcel pickup & delivery</Text>
        </View>

        {/* Test accounts quick fill */}
        <View style={styles.quickFill}>
          <Text style={styles.qfTitle}>Test accounts — tap to fill</Text>
          <View style={styles.qfRow}>
            {[['Rahul','9876543210'],['Priya','9876543211']].map(([n,ph]) => (
              <TouchableOpacity key={ph} style={styles.qfBtn}
                onPress={() => { setPhone(ph); setPassword('password123'); setTab('login'); }}>
                <Text style={styles.qfBtnText}>{n}</Text>
                <Text style={styles.qfBtnSub}>{ph}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {['login','register'].map(t => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabOn]}
              onPress={() => { setTab(t); setError(''); }}>
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                {t === 'login' ? 'Login' : 'Register'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Alert message={error} type="error" />

        {tab === 'login' ? (
          <View>
            <Input label="Phone number" value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" maxLength={10} placeholder="10 digit number" />
            <Input label="Password" value={password} onChangeText={setPassword}
              secureTextEntry placeholder="Your password" />
            <Button title="Login" onPress={handleLogin} loading={loading} size="lg"
              style={styles.submitBtn} />
          </View>
        ) : (
          <View>
            <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Input label="Phone" value={regPhone} onChangeText={setRegPhone}
                  keyboardType="phone-pad" maxLength={10} placeholder="10 digits" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="City" value={city} onChangeText={setCity} placeholder="Ludhiana" />
              </View>
            </View>
            <Input label="Password (min 6 chars)" value={regPass} onChangeText={setRegPass}
              secureTextEntry placeholder="Choose a password" />
            <Button title="Create account" onPress={handleRegister} loading={loading} size="lg"
              style={styles.submitBtn} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, backgroundColor: colors.bg, flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { fontSize: 28, fontWeight: '800', color: colors.purple },
  tagline: { fontSize: 14, color: colors.muted, marginTop: 6 },
  quickFill: { backgroundColor: colors.amberL, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  qfTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: colors.amber, marginBottom: 8 },
  qfRow: { flexDirection: 'row', gap: 8 },
  qfBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: colors.border },
  qfBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
  qfBtnSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.lg },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.bg },
  tabOn: { backgroundColor: colors.purple },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  tabTextOn: { color: '#fff' },
  submitBtn: { marginTop: spacing.sm },
  row: { flexDirection: 'row' },
});
