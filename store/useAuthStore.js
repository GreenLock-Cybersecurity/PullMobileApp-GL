import { create } from 'zustand';
import { authService } from '@/services/authService';
import { secureStorage } from './secureStorage';
import { notificationService } from '@/services/notificationService';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const result = await authService.login(email, password);

      if (result.success) {
        const { user, token } = result.data;

        // Update state immediately for instant UI response
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Storage and notifications in background - don't block login
        Promise.all([
          secureStorage.setToken(token),
          secureStorage.setUser(user),
        ]).catch(() => {});

        // Push notifications completely in background
        (async () => {
          try {
            const pushToken = await notificationService.registerForPushNotifications();
            if (pushToken && user.venue_id_real && user.employee_id_real) {
              notificationService.registerTokenWithBackend(
                user.venue_id_real,
                user.employee_id_real
              );
            }
          } catch {}
        })();

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
    } catch {
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

  logout: async () => {
    try {
      await notificationService.unregisterToken();
      notificationService.removeNotificationListeners();
    } catch {
    }

    authService.logout();

    await secureStorage.clearAll();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  initializeAuth: async () => {
    try {
      const token = await secureStorage.getToken();
      const user = await secureStorage.getUser();

      if (token) {
        authService.setAuthToken(token);

        const result = await authService.verifyToken();

        if (result.success) {
          set({
            user: result.data || user,
            token,
            isAuthenticated: true,
            isInitialized: true,
          });

          // Refresh staff token in background each time app is opened
          // This extends the session for another week
          (async () => {
            try {
              const refreshResult = await authService.refreshStaffToken();
              if (refreshResult.success && refreshResult.data?.token) {
                const newToken = refreshResult.data.token;
                await secureStorage.setToken(newToken);
                set({ token: newToken });
              }
            } catch {
              // Silent fail - session is still valid from verify
            }
          })();
        } else {
          await secureStorage.clearAll();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitialized: true,
          });
        }
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  refreshToken: async () => {
    const { token } = get();

    if (!token) {
      await get().logout();
      return { success: false, error: 'No token available' };
    }

    try {
      const result = await authService.refreshToken(token);

      if (result.success) {
        const newToken = result.data.token;

        await secureStorage.setToken(newToken);

        set({ token: newToken });
        return { success: true };
      } else {
        await get().logout();
        return { success: false, error: result.error };
      }
    } catch {
      await get().logout();
      return { success: false, error: 'Token refresh failed' };
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
