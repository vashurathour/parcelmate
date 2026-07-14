import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSaved();
  }, []);

  async function loadSaved() {
    try {
      const t = await AsyncStorage.getItem('pm_token');
      const u = await AsyncStorage.getItem('pm_user');
      if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    } catch (e) {
      console.error('Load auth error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function login(phone, password) {
    const data = await authAPI.login(phone, password);
    await AsyncStorage.setItem('pm_token', data.token);
    await AsyncStorage.setItem('pm_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function register(name, phone, password, city) {
    const data = await authAPI.register(name, phone, password, city);
    await AsyncStorage.setItem('pm_token', data.token);
    await AsyncStorage.setItem('pm_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    await AsyncStorage.multiRemove(['pm_token', 'pm_user']);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
