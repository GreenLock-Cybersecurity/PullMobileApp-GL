// services/bookingService.js
import { apiClient } from './api';

export const bookingService = {
  getBookings: async (venueId, options = {}) => {
    try {
      const { status = 'All', page = 1, limit = 10 } = options;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (status && status !== 'All') {
        params.append('status', status);
      }

      const response = await apiClient.get(
        `/bookings/get-bookings/${venueId}?${params.toString()}`
      );

      return {
        success: true,
        data: response.data.bookings,
        pagination: response.data.pagination,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch bookings',
      };
    }
  },

  getBookingDetails: async (bookingId) => {
    try {
      const response = await apiClient.get(
        `/bookings/get-booking-details/${bookingId}`
      );

      return {
        success: true,
        data: response.data.booking,
        modifications: response.data.modifications,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch booking details',
      };
    }
  },

  processModifications: async (
    bookingId,
    action,
    venueId,
    organizationId,
    employeeId
  ) => {
    try {
      const response = await apiClient.patch(
        `/bookings/process-modifications/${bookingId}`,
        {
          action,
          venue_id: venueId,
          organization_id: organizationId,
          employee_id: employeeId,
        }
      );

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to process modifications',
      };
    }
  },

  updateBookingStatus: async (
    bookingId,
    status,
    venueId,
    organizationId,
    employeeId
  ) => {
    try {
      const response = await apiClient.patch(
        `/bookings/update-status/${bookingId}`,
        {
          status,
          venue_id: venueId,
          organization_id: organizationId,
          employee_id: employeeId,
        }
      );

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update booking status',
      };
    }
  },
};
