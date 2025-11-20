// services/eventService.js - CORREGIDO con named import
import { apiClient } from './api';  // ← Cambiar a destructuring

export const eventService = {
  getUpcomingEvents: async (venueId) => {
    try {
      const response = await apiClient.get(`/event/upcoming-events/${venueId}`);
      return {
        success: true,
        data: response.data || [],
      };
    } catch (error) {
      console.error('❌ getUpcomingEvents error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch events',
      };
    }
  },

  getEventDetail: async (eventId) => {
    try {
      const response = await apiClient.get(`/event/get-event-details/${eventId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ getEventDetail error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch event details',
      };
    }
  },

  createEvent: async (eventData) => {
    try {
      const response = await apiClient.post('/event/create-event', eventData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ createEvent error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to create event',
      };
    }
  },

  updateEvent: async (eventId, eventData) => {
    try {
      const response = await apiClient.put(`/event/update-event/${eventId}`, eventData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ updateEvent error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to update event',
      };
    }
  },

  deleteEvent: async (eventId) => {
    try {
      const response = await apiClient.delete(`/event/delete-event/${eventId}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ deleteEvent error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to delete event',
      };
    }
  },
};