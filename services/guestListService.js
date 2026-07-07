import { apiClient } from './api';

export const guestListService = {
  // Get guest list signups for a venue (via staff notifications)
  getGuestListSignups: async (venueId, options = {}) => {
    try {
      const { status = 'pending', page = 1, limit = 50 } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        type: 'guest_list_signup',
      });

      if (status && status !== 'All') {
        params.append('status', status);
      }

      const response = await apiClient.get(
        `/staff-notifications/venue/${venueId}?${params.toString()}`
      );

      return {
        success: true,
        data: response.data.notifications || [],
        pagination: response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          hasMore: false,
          limit: 50,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch guest list signups',
      };
    }
  },

  // Get pending signups directly from guest_list_signups table
  getPendingSignups: async (venueId) => {
    try {
      const response = await apiClient.get(`/guest-lists/venue/${venueId}/pending`);

      return {
        success: true,
        data: response.data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch pending signups',
      };
    }
  },

  // Get signup details by ID
  getSignupDetails: async (signupId) => {
    try {
      const response = await apiClient.get(`/guest-lists/signup/${signupId}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch signup details',
      };
    }
  },

  // Approve a signup
  approveSignup: async (signupId, note = '') => {
    try {
      const response = await apiClient.post(
        `/guest-lists/${signupId}/approve`,
        { note }
      );

      return {
        success: true,
        message: response.data.message || 'Signup approved successfully',
        ticketId: response.data.ticket_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to approve signup',
      };
    }
  },

  // Reject a signup
  rejectSignup: async (signupId, reason) => {
    try {
      const response = await apiClient.post(
        `/guest-lists/${signupId}/reject`,
        { reason }
      );

      return {
        success: true,
        message: response.data.message || 'Signup rejected successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to reject signup',
      };
    }
  },

  // Batch approve signups
  batchApprove: async (signupIds) => {
    try {
      const response = await apiClient.post('/guest-lists/batch/approve', {
        signup_ids: signupIds,
      });

      return {
        success: true,
        results: response.data.results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to batch approve signups',
      };
    }
  },

  // Batch reject signups
  batchReject: async (signupIds, reason) => {
    try {
      const response = await apiClient.post('/guest-lists/batch/reject', {
        signup_ids: signupIds,
        reason,
      });

      return {
        success: true,
        results: response.data.results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to batch reject signups',
      };
    }
  },

  // Search signups
  searchSignups: async (venueId, searchTerm, options = {}) => {
    try {
      const { page = 1, limit = 20 } = options;

      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: limit.toString(),
        type: 'guest_list_signup',
      });

      const response = await apiClient.get(
        `/staff-notifications/search/${venueId}?${params.toString()}`
      );

      return {
        success: true,
        data: response.data.notifications || [],
        pagination: response.data.pagination,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to search signups',
      };
    }
  },

  // =============================================================================
  // GUEST LIST TYPE MANAGEMENT (CRUD)
  // =============================================================================

  // Get guest list types for an event
  getGuestListTypes: async (eventId) => {
    try {
      const response = await apiClient.get(`/guest-lists/types/event/${eventId}`);

      return {
        success: true,
        data: response.data || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch guest list types',
      };
    }
  },

  // Create a new guest list type
  createGuestListType: async (data) => {
    try {
      const response = await apiClient.post('/guest-lists/types', data);

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Guest list type created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create guest list type',
      };
    }
  },

  // Update an existing guest list type
  updateGuestListType: async (typeId, data) => {
    try {
      const response = await apiClient.put(`/guest-lists/types/${typeId}`, data);

      return {
        success: true,
        data: response.data.data,
        message: response.data.message || 'Guest list type updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update guest list type',
      };
    }
  },

  // Delete a guest list type
  deleteGuestListType: async (typeId) => {
    try {
      const response = await apiClient.delete(`/guest-lists/types/${typeId}`);

      return {
        success: true,
        message: response.data.message || 'Guest list type deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete guest list type',
      };
    }
  },
};
