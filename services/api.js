import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const { useAuthStore } = await import('@/store/useAuthStore');
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
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
