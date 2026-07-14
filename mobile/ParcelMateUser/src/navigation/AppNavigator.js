import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import BookOrderScreen from '../screens/BookOrderScreen';
import { BookingConfirmedScreen, ProfileScreen } from '../screens/ConfirmedAndProfile';
import { colors, radius } from '../utils/theme';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.purple, headerTitleStyle: { fontWeight: '700' } }}>
      <Stack.Screen name="OrdersList" component={OrdersScreen} options={({ navigation }) => ({
        title: 'My parcels',
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate('BookOrder')} style={{ backgroundColor: colors.purple, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.md }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Book</Text>
          </TouchableOpacity>
        ),
      })} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order details' }} />
      <Stack.Screen name="BookOrder" component={BookOrderScreen} options={{ title: 'New booking', presentation: 'modal' }} />
      <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} options={{ title: 'Confirmed!', headerLeft: () => null }} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.purple }}>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My profile' }} />
    </Stack.Navigator>
  );
}

function TabIcon({ name, focused }) {
  const icons = { Orders: focused ? '📦' : '📦', Profile: focused ? '👤' : '👤' };
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icons[name] || '●'}</Text>;
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.purple }}>📦 ParcelMate</Text>
    </View>
  );

  if (!user) return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
          tabBarActiveTintColor: colors.purple,
          tabBarInactiveTintColor: colors.hint,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: 6, height: 60 },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Orders" component={OrdersStack} options={{ title: 'My orders' }} />
        <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ title: 'Profile' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
