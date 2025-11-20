// api.js
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
                process.env.EXPO_PUBLIC_API_URL || 
                'http://localhost:8080/api/v1';

console.log('🌐 API URL:', API_URL);

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
    const { useAuthStore } = await import('@/store/useAuthStore');
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  async (error) => {
    console.error('❌ Response error:', error.response?.status, error.response?.data);
    
    const originalRequest = error.config;

    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'INVALID_TOKEN' &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const { useAuthStore } = await import('@/store/useAuthStore');
        const refreshResult = await useAuthStore.getState().refreshToken();

        if (refreshResult.success) {
          const token = useAuthStore.getState().token;
          originalRequest.headers['Authorization'] = `Bearer ${token}`;

          return apiClient(originalRequest);
        } else {
          useAuthStore.getState().logout();
        }
      } catch (refreshError) {
        const { useAuthStore } = await import('@/store/useAuthStore');
        useAuthStore.getState().logout();
      }
    }

    if (error.response?.status === 401) {
      const { useAuthStore } = await import('@/store/useAuthStore');
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);