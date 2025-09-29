import axios from 'axios';
import { API_URL } from '@env';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Manejar token expirado
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
