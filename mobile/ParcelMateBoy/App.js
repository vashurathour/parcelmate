import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import ActiveScreen from './src/screens/ActiveScreen';
import { EarningsScreen, HistoryScreen } from './src/screens/EarningsAndHistory';
import ProfileScreen from './src/screens/ProfileScreen';
import { Button, Alert } from './src/components/UI';
import { colors, spacing, radius } from './src/utils/theme';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone]       = useState('9876543212');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleLogin() {
    setLoading(true); setError('');
    try {
      const d = await login(phone, password);
      if (d.user.role !== 'delivery_boy') throw new Error('Use a delivery boy account (9876543212)');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.loginContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.loginLogo}>🚚 ParcelMate</Text>
        <Text style={styles.loginSub}>Delivery boy app</Text>

        <TouchableOpacity style={styles.testBox}
          onPress={() => { setPhone('9876543212'); setPassword('password123'); }}>
          <Text style={styles.testTitle}>Tap to fill test account</Text>
          <Text style={styles.testCreds}>Amit Kumar · 9876543212 / password123</Text>
        </TouchableOpacity>

        <Alert message={error} type="error" />

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Phone number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone}
            keyboardType="phone-pad" maxLength={10} placeholderTextColor={colors.hint} />
        </View>
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholderTextColor={colors.hint} />
        </View>
        <Button title="Login" onPress={handleLogin} loading={loading} variant="teal"
          size="lg" style={{ marginTop: spacing.sm }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MainTabs() {
  const TAB_ICONS = { Active: '🚚', History: '✅', Earnings: '💰', Profile: '👤' };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{TAB_ICONS[route.name]}</Text>
        ),
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.hint,
        tabBarStyle: {
          backgroundColor: colors.surface, borderTopColor: colors.border,
          height: 62, paddingBottom: 8, paddingTop: 4,
        },
        headerStyle: { backgroundColor: colors.teal },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Active"   component={ActiveScreen}   options={{ title: 'Active deliveries' }} />
      <Tab.Screen name="History"  component={HistoryScreen}  options={{ title: 'Delivery history' }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: 'My earnings' }} />
      <Tab.Screen name="Profile"  component={ProfileScreen}  options={{ title: 'My profile' }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: colors.teal }}>🚚</Text>
      <Text style={{ fontSize: 14, color: colors.muted, marginTop: 12 }}>ParcelMate</Text>
    </View>
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  loginLogo: { fontSize: 30, fontWeight: '800', color: colors.teal, textAlign: 'center', marginBottom: 6 },
  loginSub: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: spacing.xxl },
  testBox: {
    backgroundColor: colors.tealL, borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.teal,
  },
  testTitle: { fontSize: 11, fontWeight: '700', color: colors.teal, textTransform: 'uppercase', marginBottom: 4 },
  testCreds: { fontSize: 13, color: colors.teal, fontWeight: '500' },
  fieldWrap: { marginBottom: spacing.md },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.muted, marginBottom: 5 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, color: colors.text,
  },
});
