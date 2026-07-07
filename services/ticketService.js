import { apiClient } from './api';

export const ticketService = {
  validateTicket: async (qrToken, user) => {
    if (!user) throw new Error('User not authenticated');

    // Check if this is a bottle voucher QR (starts with BTLV:)
    if (qrToken && qrToken.startsWith('BTLV:')) {
      return ticketService.validateBottleVoucher(qrToken, user);
    }

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
        type: 'ticket',
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
        type: 'ticket',
        error: error.response?.data?.error || 'Failed to validate ticket',
        details: error.response?.data?.details || '',
      };
    }
  },

  validateBottleVoucher: async (qrToken, user) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await apiClient.post('/bottle-redemption/validate', {
        qr_token: qrToken,
      });

      return {
        success: true,
        type: 'bottle',
        data: {
          event_name: response.data.event_name,
          host_name: response.data.host_name,
          venue_name: response.data.venue_name,
          bottles: response.data.bottles || [],
          mixers: response.data.mixers || [],
          total_bottles: response.data.total_bottles,
          redeemed_at: response.data.redeemed_at,
          message: response.data.message || 'Botellas canjeadas exitosamente',
        }
      };
    } catch (error) {
      return {
        success: false,
        type: 'bottle',
        error: error.response?.data?.error || 'Voucher invalido o ya canjeado',
        details: error.response?.data?.details || '',
      };
    }
  },

  previewBottleVoucher: async (qrToken, user) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const response = await apiClient.post('/bottle-redemption/preview', {
        qr_token: qrToken,
      });

      return {
        success: true,
        type: 'bottle_preview',
        data: {
          event_name: response.data.event_name,
          host_name: response.data.host_name,
          venue_name: response.data.venue_name,
          bottles: response.data.bottles || [],
          mixers: response.data.mixers || [],
          total_bottles: response.data.total_bottles,
          is_redeemed: response.data.is_redeemed,
          redeemed_at: response.data.redeemed_at,
        }
      };
    } catch (error) {
      return {
        success: false,
        type: 'bottle_preview',
        error: error.response?.data?.error || 'Voucher invalido',
      };
    }
  },
};
