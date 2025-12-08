import { apiClient } from './api';

export const ticketService = {
  validateTicket: async (qrToken, user) => {
    if (!user) throw new Error('User not authenticated');

    const body = {
      qr_token: qrToken,
      venue_id: user.venue_id_real || user.venue_id,
      organization_id: user.organization_id_real || user.organization_id,
      worker_id: user.employee_id_real || user.employee_id || '',
    };

    try {
      const response = await apiClient.post('/ticket-validation/validate-ticket', body);
      return {
        success: true,
        data: {
          event_name: response.data.event_name,
          ticket_type: response.data.ticket_type || 'General',
          status: response.data.status,
          message: response.data.message,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to validate ticket',
        details: error.response?.data?.details || '',
      };
    }
  },
};
