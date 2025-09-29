import { apiClient } from './api';

export const ticketService = {
  validateTicket: async (qrToken, user) => {
    if (!user) throw new Error('User not authenticated');

    const body = {
      qr_token: qrToken,
      venue_id: user.venue_id,
      organization_id: user.organization_id,
    };

    try {
      const response = await apiClient.post('/tickets/validate-ticket', body);
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to validate ticket',
        details: error.response?.data?.details || '',
      };
    }
  },
};
