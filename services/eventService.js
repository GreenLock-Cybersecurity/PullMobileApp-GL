import { apiClient } from './api';

export const eventService = {
  getUpcomingEvents: async (venueId) => {
    try {
      const response = await apiClient.get(`/event/upcoming-events/${venueId}`);
      return {
        success: true,
        data: response.data.events,
        total: response.data.total_events,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch events',
      };
    }
  },
  getEventDetail: async (eventId) => {
    try {
      const response = await apiClient.get(
        `/event/get-event-details/${eventId}`
      );
      return {
        success: true,
        data: response.data.event,
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch event details',
      };
    }
  },
};
