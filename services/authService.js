// services/authService.js
import { apiClient } from './api';

export const authService = {
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login-workers', {
        email,
        password,
      });

      const { user, token } = response.data;

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return {
        success: true,
        data: { user, token },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  },

  logout: () => {
    delete apiClient.defaults.headers.common['Authorization'];

    return {
      success: true,
      message: 'Logged out successfully',
    };
  },

  setAuthToken: (token) => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  },

  verifyToken: async () => {
    try {
      const response = await apiClient.get('/auth/verify-token');

      return {
        success: true,
        data: response.data.user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Token verification failed',
      };
    }
  },

  refreshToken: async (token) => {
    try {
      const response = await apiClient.post('/auth/refresh-token', { token });
      const newToken = response.data.token;

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      return {
        success: true,
        data: { token: newToken },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Token refresh failed',
      };
    }
  },
};
