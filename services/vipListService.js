// services/vipListService.js
import { apiClient } from './api';

export const vipListService = {
  // Create a new VIP List reservation
  create: async (data) => {
    try {
      const response = await apiClient.post('/vip-lists/create', data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create VIP list',
      };
    }
  },

  // Get all VIP Lists for a venue
  getByVenue: async (venueId, options = {}) => {
    try {
      const { status = 'All', page = 1, limit = 50 } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status && status !== 'All') {
        params.append('status', status);
      }

      const response = await apiClient.get(
        `/vip-lists/venue/${venueId}?${params.toString()}`
      );

      return {
        success: true,
        data: response.data.vip_lists || [],
        pagination: response.data.pagination,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch VIP lists',
      };
    }
  },

  // Get VIP List details by ID
  getById: async (id) => {
    try {
      const response = await apiClient.get(`/vip-lists/detail/${id}`);
      return {
        success: true,
        data: response.data.reservation,
        guests: response.data.guests || [],
        stats: response.data.stats || {},
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch VIP list details',
      };
    }
  },

  // Close a VIP List with deadline
  close: async (id, deadlineHours) => {
    try {
      const response = await apiClient.post(`/vip-lists/${id}/close`, {
        deadline_hours: deadlineHours,
      });
      return {
        success: true,
        data: response.data,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to close VIP list',
      };
    }
  },

  // Get upcoming events for the venue (to select when creating VIP List)
  getUpcomingEvents: async (venueId) => {
    try {
      const response = await apiClient.get(`/event/upcoming-events/${venueId}`);
      return {
        success: true,
        data: response.data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch events',
      };
    }
  },

  // Finalize a VIP List (end payment period, process unpaid guests)
  finalize: async (id) => {
    try {
      const response = await apiClient.post(`/vip-lists/${id}/finalize`);
      return {
        success: true,
        data: response.data,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to finalize VIP list',
      };
    }
  },

  // Get bottles selected for a VIP List (for staff view)
  getBottles: async (id) => {
    try {
      const response = await apiClient.get(`/vip-lists/${id}/bottles`);
      return {
        success: true,
        data: response.data.bottles || [],
        total_value: response.data.total_value || 0,
        total_bottles: response.data.total_bottles || 0,
        budget: response.data.budget || 0,
        remaining_credit: response.data.remaining_credit || 0,
        has_bottles: response.data.has_bottles || false,
        bottles_selected: response.data.bottles_selected || false,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch bottles',
      };
    }
  },
};
