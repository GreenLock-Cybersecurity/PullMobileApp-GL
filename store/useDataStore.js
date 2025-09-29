import { create } from 'zustand';
import { eventService } from '@/services/eventService';
import { bookingService } from '@/services/bookingService';

const mockEvents = [
  {
    id: '1',
    name: 'Jazz Night',
    date: '2025-01-15',
    startTime: '20:00',
    endTime: '23:00',
    description: 'An evening of smooth jazz',
    accessType: 'public',
    maxTickets: 100,
    minAge: 18,
    ticketsSold: 75,
    poster:
      'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
    ticketTypes: [
      {
        id: '1',
        name: 'General',
        description: 'General admission',
        price: 25,
        max: 80,
        commission: 2.5,
      },
      {
        id: '2',
        name: 'VIP',
        description: 'VIP access',
        price: 50,
        max: 20,
        commission: 5,
      },
    ],
  },
  {
    id: '2',
    name: 'Electronic Beats',
    date: '2025-01-18',
    startTime: '22:00',
    endTime: '04:00',
    description: 'Electronic music festival',
    accessType: 'public',
    maxTickets: 200,
    minAge: 21,
    ticketsSold: 120,
    poster:
      'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=400',
    ticketTypes: [
      {
        id: '3',
        name: 'Early Bird',
        description: 'Early bird special',
        price: 30,
        max: 100,
        commission: 3,
      },
      {
        id: '4',
        name: 'Regular',
        description: 'Regular admission',
        price: 40,
        max: 100,
        commission: 4,
      },
    ],
  },
];

const mockReservations = [
  {
    id: '1',
    customerName: 'John Doe',
    date: '2025-01-15',
    guests: 4,
    status: 'Pending',
    type: 'mesa',
  },
  {
    id: '2',
    customerName: 'Jane Smith',
    date: '2025-01-15',
    guests: 2,
    status: 'Aceptada',
    type: 'barra',
  },
  {
    id: '3',
    customerName: 'Bob Wilson',
    date: '2025-01-16',
    guests: 6,
    status: 'Rechazada',
    type: 'mesa',
  },
  {
    id: '4',
    customerName: 'Alice Brown',
    date: '2025-01-16',
    guests: 3,
    status: 'Pending',
    type: 'barra',
  },
];

const mockEmployees = [
  {
    id: '1',
    firstName: 'John',
    lastName1: 'Doe',
    lastName2: 'Smith',
    email: 'john.doe@example.com',
    password: 'generated123',
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName1: 'Wilson',
    lastName2: 'Brown',
    email: 'jane.wilson@example.com',
    password: 'generated456',
  },
];

export const useDataStore = create((set, get) => ({
  events: [],
  isLoadingEvents: false,
  eventsError: null,

  // Estados para bookings
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

  employees: mockEmployees,

  fetchUpcomingEvents: async (venueId) => {
    if (!venueId) {
      set({ eventsError: 'Venue ID is required' });
      return;
    }

    set({ isLoadingEvents: true, eventsError: null });

    try {
      const result = await eventService.getUpcomingEvents(venueId);

      if (result.success) {
        // Mapear los datos del API al formato que espera tu componente
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

  // Limpiar evento actual (útil al salir de la pantalla)
  clearCurrentEvent: () => {
    set({
      currentEvent: null,
      isLoadingEventDetail: false,
      eventDetailError: null,
    });
  },

  addEvent: (event) =>
    set((state) => ({
      events: [
        ...state.events,
        { ...event, id: Date.now().toString(), ticketsSold: 0 },
      ],
    })),

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

  // Cargar más bookings (siguiente página)
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

  // Cambiar filtro de estado
  changeBookingFilter: async (venueId, newStatus) => {
    await get().fetchBookings(venueId, {
      status: newStatus,
      page: 1,
      resetList: true,
    });
  },

  // Limpiar bookings
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

  addEmployee: (employee) =>
    set((state) => ({
      employees: [
        ...state.employees,
        { ...employee, id: Date.now().toString() },
      ],
    })),

  updateEmployee: (id, updatedEmployee) =>
    set((state) => ({
      employees: state.employees.map((emp) =>
        emp.id === id ? { ...emp, ...updatedEmployee } : emp
      ),
    })),

  deleteEmployee: (id) =>
    set((state) => ({
      employees: state.employees.filter((emp) => emp.id !== id),
    })),

  updateReservationStatus: (id, status) =>
    set((state) => ({
      reservations: state.reservations.map((reservation) =>
        reservation.id === id ? { ...reservation, status } : reservation
      ),
    })),
}));
