// services/orderService.js
import { apiClient } from './api';

export const orderService = {
  getOrders: async (venueId, options = {}) => {
    try {
      const { status = 'pending_staff_approval', page = 1, limit = 10 } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status && status !== 'All') {
        params.append('status', status);
      }

      const response = await apiClient.get(
        `/orders/venue/${venueId}?${params.toString()}`
      );

      return {
        success: true,
        data: response.data.orders || [],
        pagination: response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          hasMore: false,
          limit: 10,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch orders',
      };
    }
  },

  searchOrders: async (venueId, searchTerm, options = {}) => {
    try {
      const { page = 1, limit = 20 } = options;

      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await apiClient.get(
        `/orders/search/${venueId}?${params.toString()}`
      );

      return {
        success: true,
        data: response.data.orders || [],
        pagination: response.data.pagination,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to search orders',
      };
    }
  },

  getOrderDetails: async (orderId) => {
    try {
      const response = await apiClient.get(`/orders/details/${orderId}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch order details',
      };
    }
  },

  approveOrder: async (orderId, venueId, organizationId, employeeId) => {
    try {
      const response = await apiClient.post(`/orders/${orderId}/approve`, {
        venue_id: venueId,
        organization_id: organizationId,
        employee_id: employeeId,
      });

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to approve order',
      };
    }
  },

  rejectOrder: async (orderId, venueId, organizationId, employeeId, reason) => {
    try {
      const response = await apiClient.post(`/orders/${orderId}/reject`, {
        venue_id: venueId,
        organization_id: organizationId,
        employee_id: employeeId,
        reason: reason,
      });

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to reject order',
      };
    }
  },

  refreshOrdersView: async () => {
    try {
      const response = await apiClient.post('/orders/refresh-view');
      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to refresh orders view',
      };
    }
  },
};