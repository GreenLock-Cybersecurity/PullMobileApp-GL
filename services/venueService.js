import { apiClient } from './api';

export const venueService = {
  getVenueInfo: async (venueId) => {
    try {
      const response = await apiClient.get(`/venue/get-venue-info/${venueId}`);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch venue info',
      };
    }
  },
};
