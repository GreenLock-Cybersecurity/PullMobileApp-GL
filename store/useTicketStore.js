import { create } from 'zustand';
import { ticketService } from '@/services/ticketService';

export const useTicketStore = create((set) => ({
  isValidating: false,

  validateTicket: async (qrToken, user) => {
    set({ isValidating: true });
    const result = await ticketService.validateTicket(qrToken, user);
    set({ isValidating: false });
    return result;
  },
}));
