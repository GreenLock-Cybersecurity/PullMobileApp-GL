// services/authService.js
import { apiClient } from './api';
import { jwtDecode } from 'jwt-decode';

export const authService = {
  login: async (email, password) => {
    try {
      // Set header before request for faster subsequent calls
      const response = await apiClient.post('/auth/login-workers', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { employee, token } = response.data;

      // Set auth header immediately
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Decode JWT only for IDs not in response
      const decodedToken = jwtDecode(token);

      return {
        success: true,
        data: {
          user: {
            ...employee,
            venue_id_real: decodedToken.venue_id,
            organization_id_real: decodedToken.organization_id,
            employee_id_real: decodedToken.employee_id,
          },
          token,
        },
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

      // Handle JWT tokens (for staff) - backend returns claims, not user
      if (response.data.type === 'jwt' && response.data.claims) {
        const claims = response.data.claims;
        return {
          success: true,
          data: {
            id: claims.employee_id,
            email: claims.email,
            role: claims.role,
            venue_id: claims.venue_id,
            organization_id: claims.organization_id,
            venue_id_real: claims.venue_id,
            organization_id_real: claims.organization_id,
            employee_id_real: claims.employee_id,
            venue_name: claims.venue_name,
            venue_slug: claims.venue_slug,
            venue_currency: claims.venue_currency,
            use_vip_list_flow: claims.use_vip_list_flow,
          },
        };
      }

      // Handle user sessions - backend returns user_id
      return {
        success: true,
        data: response.data.user || null,
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

  // Refresh staff JWT token - extends session for another week
  refreshStaffToken: async () => {
    try {
      const response = await apiClient.post('/auth/refresh-staff-token');
      const newToken = response.data.token;

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      return {
        success: true,
        data: { token: newToken },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Staff token refresh failed',
      };
    }
  },
};