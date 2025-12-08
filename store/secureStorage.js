import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token_secure';
const USER_KEY = 'auth_user';

export const secureStorage = {
  setToken: async (token) => {
    try {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
    } catch {
    }
  },

  getToken: async () => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  deleteToken: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
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
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch {
    }
  },
};
