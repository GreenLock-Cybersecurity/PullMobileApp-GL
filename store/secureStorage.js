import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token_secure';
const USER_KEY = 'auth_user';

// expo-secure-store is not available on web (throws on every call), which
// silently dropped the token and logged staff out on each page reload.
// On web we fall back to AsyncStorage (localStorage); native keeps SecureStore.
const isWeb = Platform.OS === 'web';

export const secureStorage = {
  setToken: async (token) => {
    try {
      if (token) {
        if (isWeb) {
          await AsyncStorage.setItem(TOKEN_KEY, token);
        } else {
          await SecureStore.setItemAsync(TOKEN_KEY, token);
        }
      } else {
        await secureStorage.deleteToken();
      }
    } catch {
    }
  },

  getToken: async () => {
    try {
      if (isWeb) {
        return await AsyncStorage.getItem(TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  deleteToken: async () => {
    try {
      if (isWeb) {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
    }
  },

  setUser: async (user) => {
    try {
      if (user) {
        const safeUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          venue_id: user.venue_id,
          organization_id: user.organization_id,
        };
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(safeUser));
      } else {
        await AsyncStorage.removeItem(USER_KEY);
      }
    } catch {
    }
  },

  getUser: async () => {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },

  clearAll: async () => {
    try {
      await secureStorage.deleteToken();
      await AsyncStorage.removeItem(USER_KEY);
    } catch {
    }
  },
};
