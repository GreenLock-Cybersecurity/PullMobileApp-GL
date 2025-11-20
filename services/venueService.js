// services/venueService.js - Actualizar para que use el endpoint correcto
import { apiClient } from './api';

export const venueService = {
  getVenueInfo: async (venueId) => {
    try {
      console.log('🏢 Fetching venue info for:', venueId);
      
      // El backend usa /venue/get-venue-info/:id
      const response = await apiClient.get(`/venue/get-venue-info/${venueId}`);
      
      console.log('✅ Venue info response:', response.data);

      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Venue service error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch venue info',
      };
    }
  },
};