// services/authService.js
import { apiClient } from './api';
import { jwtDecode } from 'jwt-decode';

export const authService = {
  login: async (email, password) => {
    try {
      console.log('🔐 Attempting login:', email);
      console.log('🌐 API Base URL:', apiClient.defaults.baseURL);
      
      const response = await apiClient.post('/auth/login-workers', {
        email: email.trim(),
        password: password,
      });

      console.log('✅ Login successful');

      const { user, token } = response.data;

      // Decodificar el JWT para obtener los IDs reales
      const decodedToken = jwtDecode(token);
      
      // Crear un objeto user mejorado con los IDs reales del JWT
      const enhancedUser = {
        ...user,
        venue_id_real: decodedToken.venue_id,
        organization_id_real: decodedToken.organization_id,
        employee_id_real: decodedToken.employee_id,
      };

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      return {
        success: true,
        data: { user: enhancedUser, token },
      };
    } catch (error) {
      console.error('❌ Login error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Login failed',
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