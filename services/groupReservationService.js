import { apiClient } from './api';

export const groupReservationService = {
  getGroupReservations: async (venueId, options = {}) => {
    try {
      const { status = 'pending', page = 1, limit = 10 } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        type: 'group_reservation',
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
          limit: 10,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch group reservations',
      };
    }
  },

  getReservationDetails: async (reservationId) => {
    try {
      const response = await apiClient.get(`/group-reservations/details/${reservationId}`);

      return {
        success: true,
        data: response.data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch reservation details',
      };
    }
  },

  approveReservation: async (reservationId, note = '') => {
    try {
      const response = await apiClient.post(
        `/group-reservations/${reservationId}/approve`,
        { note }
      );

      return {
        success: true,
        message: response.data.message || 'Reservation approved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to approve reservation',
      };
    }
  },

  rejectReservation: async (reservationId, reason) => {
    try {
      const response = await apiClient.post(
        `/group-reservations/${reservationId}/reject`,
        { reason }
      );

      return {
        success: true,
        message: response.data.message || 'Reservation rejected successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to reject reservation',
      };
    }
  },

  searchReservations: async (venueId, searchTerm, options = {}) => {
    try {
      const { page = 1, limit = 20 } = options;

      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: limit.toString(),
        type: 'group_reservation',
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
        error: error.response?.data?.error || 'Failed to search reservations',
      };
    }
  },
};
