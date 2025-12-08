import { apiClient } from './api';

export const getTicketTypesByEvent = async (eventId) => {
  const response = await apiClient.get(`/ticket-types/event/${eventId}`);
  return response.data;
};

export const createTicketType = async (eventId, ticketData) => {
  const response = await apiClient.post(`/ticket-types/event/${eventId}`, ticketData);
  return response.data;
};

export const updateTicketType = async (ticketTypeId, ticketData) => {
  const response = await apiClient.put(`/ticket-types/${ticketTypeId}`, ticketData);
  return response.data;
};

export const deleteTicketType = async (ticketTypeId) => {
  const response = await apiClient.delete(`/ticket-types/${ticketTypeId}`);
  return response.data;
};

export default {
  getTicketTypesByEvent,
  createTicketType,
  updateTicketType,
  deleteTicketType,
};
