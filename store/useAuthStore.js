import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/authService';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          const result = await authService.login(email, password);

          if (result.success) {
            const { user, token } = result.data;

            set({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return { success: true };
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              error: result.error,
            });

            return { success: false, error: result.error };
          }
        } catch (error) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Network error. Please try again.',
          });

          return { success: false, error: 'Network error. Please try again.' };
        }
      },

      logout: () => {
        authService.logout();

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      initializeAuth: async () => {
        const { token } = get();

        if (token) {
          authService.setAuthToken(token);

          const result = await authService.verifyToken();

          if (result.success) {
            set({
              user: result.data,
              isAuthenticated: true,
            });
          } else {
            get().logout();
          }
        } else {
          console.log('🔐 AuthStore: No token found');
        }
      },

      refreshToken: async () => {
        const { token } = get();

        if (!token) {
          get().logout();
          return { success: false, error: 'No token available' };
        }

        try {
          const result = await authService.refreshToken(token);

          if (result.success) {
            set({ token: result.data.token });
            return { success: true };
          } else {
            get().logout();
            return { success: false, error: result.error };
          }
        } catch (error) {
          get().logout();
          return { success: false, error: 'Token refresh failed' };
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          authService.setAuthToken(state.token);
        }
      },
    }
  )
);
