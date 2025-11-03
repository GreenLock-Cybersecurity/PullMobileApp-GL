import { create } from 'zustand';
import { eventService } from '@/services/eventService';
import { bookingService } from '@/services/bookingService';
import { employeeService } from '@/services/employeeService';

export const useDataStore = create((set, get) => ({
  events: [],
  isLoadingEvents: false,
  eventsError: null,

  bookings: [],
  isLoadingBookings: false,
  bookingsError: null,
  bookingsPagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasMore: false,
    limit: 10,
  },
  currentBookingFilter: 'All',
  currentBooking: null,
  isLoadingBookingDetail: false,
  bookingDetailError: null,
  currentBookingModifications: null,

  employees: [],
  isLoadingEmployees: false,
  employeesError: null,

  fetchUpcomingEvents: async (venueId) => {
    if (!venueId) {
      set({ eventsError: 'Venue ID is required' });
      return;
    }

    set({ isLoadingEvents: true, eventsError: null });

    try {
      const result = await eventService.getUpcomingEvents(venueId);

      if (result.success) {
        const mappedEvents = result.data.map((event) => ({
          id: event.id,
          name: event.name,
          date: event.event_date,
          startTime: event.start_time,
          endTime: event.end_time,
          poster: event.image,
          ticketsSold: event.tickets_sold,
          maxTickets: event.ticket_limit,
          ticketsAvailable: event.tickets_available,
        }));

        set({
          events: mappedEvents,
          isLoadingEvents: false,
          eventsError: null,
        });
      } else {
        set({
          events: [],
          isLoadingEvents: false,
          eventsError: result.error,
        });
      }
    } catch (error) {
      set({
        events: [],
        isLoadingEvents: false,
        eventsError: 'Network error. Please try again.',
      });
    }
  },

  fetchEventDetail: async (eventId) => {
    if (!eventId) {
      set({ eventDetailError: 'Event ID is required' });
      return;
    }

    set({ isLoadingEventDetail: true, eventDetailError: null });

    try {
      const result = await eventService.getEventDetail(eventId);

      if (result.success) {
        set({
          currentEvent: result.data,
          isLoadingEventDetail: false,
          eventDetailError: null,
        });
      } else {
        set({
          currentEvent: null,
          isLoadingEventDetail: false,
          eventDetailError: result.error,
        });
      }
    } catch (error) {
      set({
        currentEvent: null,
        isLoadingEventDetail: false,
        eventDetailError: 'Network error. Please try again.',
      });
    }
  },

  clearCurrentEvent: () => {
    set({
      currentEvent: null,
      isLoadingEventDetail: false,
      eventDetailError: null,
    });
  },

  addEvent: async (eventData) => {
    try {
      const result = await eventService.createEvent(eventData);

      if (result.success) {
        set((state) => ({
          events: [result.data, ...state.events],
        }));
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Failed to create event' };
    }
  },

  fetchBookings: async (venueId, options = {}) => {
    const { status = 'All', page = 1, resetList = false } = options;

    if (!venueId) {
      set({ bookingsError: 'Venue ID is required' });
      return;
    }

    // Si es la primera página o cambiamos filtro, mostrar loading completo
    if (page === 1 || resetList) {
      set({
        isLoadingBookings: true,
        bookingsError: null,
        currentBookingFilter: status,
      });
    }

    try {
      const result = await bookingService.getBookings(venueId, {
        status,
        page,
        limit: 10,
      });

      if (result.success) {
        const currentBookings = get().bookings;

        // Si es reset o primera página, reemplazar lista
        // Si es "load more", agregar a la lista existente
        const newBookings =
          page === 1 || resetList
            ? result.data
            : [...currentBookings, ...result.data];

        set({
          bookings: newBookings,
          bookingsPagination: result.pagination,
          isLoadingBookings: false,
          bookingsError: null,
          currentBookingFilter: status,
        });
      } else {
        set({
          bookings: page === 1 ? [] : get().bookings,
          isLoadingBookings: false,
          bookingsError: result.error,
        });
      }
    } catch (error) {
      set({
        bookings: page === 1 ? [] : get().bookings,
        isLoadingBookings: false,
        bookingsError: 'Network error. Please try again.',
      });
    }
  },

  loadMoreBookings: async (venueId) => {
    const { bookingsPagination, currentBookingFilter } = get();

    if (!bookingsPagination.hasMore) {
      return;
    }

    await get().fetchBookings(venueId, {
      status: currentBookingFilter,
      page: bookingsPagination.currentPage + 1,
      resetList: false,
    });
  },

  changeBookingFilter: async (venueId, newStatus) => {
    await get().fetchBookings(venueId, {
      status: newStatus,
      page: 1,
      resetList: true,
    });
  },

  clearBookings: () => {
    set({
      bookings: [],
      isLoadingBookings: false,
      bookingsError: null,
      bookingsPagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasMore: false,
        limit: 10,
      },
      currentBookingFilter: 'All',
    });
  },

  fetchBookingDetail: async (bookingId) => {
    if (!bookingId) {
      set({ bookingDetailError: 'Booking ID is required' });
      return;
    }

    set({ isLoadingBookingDetail: true, bookingDetailError: null });

    try {
      const result = await bookingService.getBookingDetails(bookingId);

      if (result.success) {
        set({
          currentBooking: result.data,
          currentBookingModifications: result.modifications || null,
          isLoadingBookingDetail: false,
          bookingDetailError: null,
        });
        return { success: true, data: result.data };
      } else {
        set({
          currentBooking: null,
          currentBookingModifications: null,
          isLoadingBookingDetail: false,
          bookingDetailError: result.error,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({
        currentBooking: null,
        currentBookingModifications: null,
        isLoadingBookingDetail: false,
        bookingDetailError: 'Network error. Please try again.',
      });
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  processBookingModifications: async (
    bookingId,
    action,
    venueId,
    organizationId,
    employeeId
  ) => {
    try {
      const result = await bookingService.processModifications(
        bookingId,
        action,
        venueId,
        organizationId,
        employeeId
      );

      if (result.success) {
        // Actualizar estado local - cambiar a confirmed y limpiar modificaciones
        const currentBookings = get().bookings;
        const updatedBookings = currentBookings.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'confirmed' }
            : booking
        );

        const currentBooking = get().currentBooking;
        const updatedCurrentBooking =
          currentBooking?.id === bookingId
            ? { ...currentBooking, status: 'confirmed' }
            : currentBooking;

        set({
          bookings: updatedBookings,
          currentBooking: updatedCurrentBooking,
          currentBookingModifications: null,
        });

        return {
          success: true,
          message: result.message,
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  clearCurrentBooking: () => {
    set({
      currentBooking: null,
      currentBookingModifications: null,
      isLoadingBookingDetail: false,
      bookingDetailError: null,
    });
  },

  updateBookingStatus: async (
    bookingId,
    newStatus,
    venueId,
    organizationId,
    employeeId
  ) => {
    try {
      const result = await bookingService.updateBookingStatus(
        bookingId,
        newStatus,
        venueId,
        organizationId,
        employeeId
      );

      if (result.success) {
        // Actualizar solo el estado en la lista local
        const currentBookings = get().bookings;
        const updatedBookings = currentBookings.map((booking) =>
          booking.id === bookingId ? { ...booking, status: newStatus } : booking
        );

        // Actualizar el booking actual si es el mismo
        const currentBooking = get().currentBooking;
        const updatedCurrentBooking =
          currentBooking?.id === bookingId
            ? { ...currentBooking, status: newStatus }
            : currentBooking;

        set({
          bookings: updatedBookings,
          currentBooking: updatedCurrentBooking,
        });

        return {
          success: true,
          message: result.message,
        };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  fetchEmployees: async () => {
    set({ isLoadingEmployees: true, employeesError: null });

    try {
      const result = await employeeService.getEmployees();

      if (result.success) {
        set({
          employees: result.data,
          isLoadingEmployees: false,
          employeesError: null,
        });

        return { success: true, data: result.data };
      } else {
        set({
          employees: [],
          isLoadingEmployees: false,
          employeesError: result.error,
        });

        return { success: false, error: result.error };
      }
    } catch (error) {
      set({
        employees: [],
        isLoadingEmployees: false,
        employeesError: 'Failed to fetch employees',
      });

      return { success: false, error: 'Failed to fetch employees' };
    }
  },

  clearEmployees: () => set({ employees: [], employeesError: null }),

  addEmployee: async (employeeData) => {
    try {
      const result = await employeeService.createEmployee(employeeData);

      if (result.success) {
        set((state) => ({
          employees: [result.data, ...state.employees],
        }));
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Failed to create employee' };
    }
  },

  updateEmployee: async (employeeId, employeeData) => {
    try {
      const result = await employeeService.updateEmployee(
        employeeId,
        employeeData
      );

      if (result.success) {
        set((state) => ({
          employees: state.employees.map((emp) =>
            emp.id === employeeId ? { ...emp, ...result.data } : emp
          ),
        }));

        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Failed to update employee' };
    }
  },

  deleteEmployee: async (employeeId) => {
    try {
      const result = await employeeService.deleteEmployee(employeeId);
      if (result.success) {
        set((state) => ({
          employees: state.employees.filter((emp) => emp.id !== employeeId),
        }));
        return { success: true, message: result.message };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Failed to delete employee' };
    }
  },

  updateReservationStatus: (id, status) =>
    set((state) => ({
      reservations: state.reservations.map((reservation) =>
        reservation.id === id ? { ...reservation, status } : reservation
      ),
    })),
}));
