// store/useDataStore.js - COMPLETO Y CORREGIDO
import { create } from 'zustand';
import { eventService } from '@/services/eventService';
import { venueService } from '@/services/venueService';
import { bookingService } from '@/services/bookingService';
import { employeeService } from '@/services/employeeService';
import { orderService } from '@/services/orderService';

export const useDataStore = create((set, get) => ({
  // Venue info
  venueInfo: null,
  isLoadingVenue: false,
  venueError: null,

  // Events
  events: [],
  isLoadingEvents: false,
  eventsError: null,
  currentEvent: null,
  isLoadingEventDetail: false,
  eventDetailError: null,
  isCreatingEvent: false,
  createEventError: null,
  isUpdatingEvent: false,
  updateEventError: null,
  isDeletingEvent: false,
  deleteEventError: null,

  // Bookings
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

  // Employees
  employees: [],
  isLoadingEmployees: false,
  employeesError: null,

  // Orders
  orders: [],
  isLoadingOrders: false,
  ordersError: null,
  ordersPagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasMore: false,
    limit: 10,
  },
  currentOrderFilter: 'pending_staff_approval',
  currentOrder: null,
  isLoadingOrderDetail: false,
  orderDetailError: null,
  venueCurrency: 'EUR', // AÑADIDO

  // Search
  searchResults: [],
  isSearching: false,
  searchError: null,

  // ==================== VENUE METHODS ====================
  fetchVenueInfo: async (venueId) => {
    if (!venueId) {
      set({ venueError: 'Venue ID is required' });
      return;
    }

    set({ isLoadingVenue: true, venueError: null });

    try {
      const result = await venueService.getVenueInfo(venueId);

      if (result.success) {
        set({
          venueInfo: result.data,
          isLoadingVenue: false,
          venueError: null,
        });
      } else {
        set({
          venueInfo: null,
          isLoadingVenue: false,
          venueError: result.error,
        });
      }
    } catch (error) {
      console.error('❌ Error fetching venue info:', error);
      set({
        venueInfo: null,
        isLoadingVenue: false,
        venueError: 'Failed to load venue info',
      });
    }
  },

  clearVenueInfo: () => {
    set({
      venueInfo: null,
      isLoadingVenue: false,
      venueError: null,
    });
  },

  // ==================== EVENTS METHODS ====================
  fetchUpcomingEvents: async (venueId) => {
    if (!venueId) {
      set({ eventsError: 'Venue ID is required' });
      return;
    }

    set({ isLoadingEvents: true, eventsError: null });

    try {
      const result = await eventService.getUpcomingEvents(venueId);

      console.log('📦 Full result:', result);

      if (result.success && result.data && Array.isArray(result.data)) {
        const mappedEvents = result.data.map((event) => ({
          id: event.event_id || event.id,
          name: event.event_name || event.name,
          date: event.event_date || event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          poster: event.event_img || event.image || event.poster,
          slug: event.event_slug || event.slug,
          ticketsSold: event.tickets_sold || 0,
          maxTickets: event.ticket_limit || event.max_tickets,
          ticketsAvailable: event.tickets_available,
          description: event.description || '',
          minAge: event.min_age || 18,
          minPrice: event.min_price,
          dressCode: event.dress_code || '',
          accessType: event.access_type || '',
          customLocation: event.custom_location || '',
        }));

        console.log('✅ Mapped events:', mappedEvents);

        set({
          events: mappedEvents,
          isLoadingEvents: false,
          eventsError: null,
        });
      } else {
        console.log('❌ Invalid result structure');
        set({
          events: [],
          isLoadingEvents: false,
          eventsError: result.error || 'No events found',
        });
      }
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      set({
        events: [],
        isLoadingEvents: false,
        eventsError: 'Failed to load events. Please try again.',
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

  clearEvents: () => {
    set({
      events: [],
      isLoadingEvents: false,
      eventsError: null,
    });
  },

  createEvent: async (eventData) => {
    set({ isCreatingEvent: true, createEventError: null });

    try {
      const result = await eventService.createEvent(eventData);

      if (result.success) {
        set({
          isCreatingEvent: false,
          createEventError: null,
        });
        return { success: true, data: result.data };
      } else {
        set({
          isCreatingEvent: false,
          createEventError: result.error,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({
        isCreatingEvent: false,
        createEventError: 'Failed to create event',
      });
      return { success: false, error: 'Failed to create event' };
    }
  },

  updateEvent: async (eventId, eventData) => {
    set({ isUpdatingEvent: true, updateEventError: null });

    try {
      const result = await eventService.updateEvent(eventId, eventData);

      if (result.success) {
        set({
          isUpdatingEvent: false,
          updateEventError: null,
        });
        return { success: true, data: result.data };
      } else {
        set({
          isUpdatingEvent: false,
          updateEventError: result.error,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({
        isUpdatingEvent: false,
        updateEventError: 'Failed to update event',
      });
      return { success: false, error: 'Failed to update event' };
    }
  },

  deleteEvent: async (eventId) => {
    set({ isDeletingEvent: true, deleteEventError: null });

    try {
      const result = await eventService.deleteEvent(eventId);

      if (result.success) {
        const currentEvents = get().events;
        const updatedEvents = currentEvents.filter(event => event.id !== eventId);

        set({
          events: updatedEvents,
          isDeletingEvent: false,
          deleteEventError: null,
        });

        return { success: true, data: result.data };
      } else {
        set({
          isDeletingEvent: false,
          deleteEventError: result.error,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({
        isDeletingEvent: false,
        deleteEventError: 'Failed to delete event',
      });
      return { success: false, error: 'Failed to delete event' };
    }
  },

  // ==================== BOOKINGS METHODS ====================
  fetchBookings: async (venueId, options = {}) => {
    const { status = 'All', page = 1, resetList = false } = options;

    if (!venueId) {
      set({ bookingsError: 'Venue ID is required' });
      return;
    }

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
        const newBookings = page === 1 || resetList ? result.data : [...currentBookings, ...result.data];

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
    if (!bookingsPagination.hasMore) return;
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

  clearCurrentBooking: () => {
    set({
      currentBooking: null,
      currentBookingModifications: null,
      isLoadingBookingDetail: false,
      bookingDetailError: null,
    });
  },

  // ==================== EMPLOYEES METHODS ====================
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

  // ==================== ORDERS METHODS ====================
  fetchOrders: async (venueId, options = {}) => {
    const { status = 'pending_staff_approval', page = 1, resetList = false } = options;

    if (!venueId) {
      set({ ordersError: 'Venue ID is required' });
      return;
    }

    if (page === 1 || resetList) {
      set({
        isLoadingOrders: true,
        ordersError: null,
        currentOrderFilter: status,
      });
    }

    try {
      const result = await orderService.getOrders(venueId, {
        status,
        page,
        limit: 10,
      });

      if (result.success) {
        const currentOrders = get().orders;
        const newOrders = page === 1 || resetList ? result.data : [...currentOrders, ...result.data];

        set({
          orders: newOrders,
          ordersPagination: result.pagination,
          isLoadingOrders: false,
          ordersError: null,
          currentOrderFilter: status,
          venueCurrency: result.currency || 'EUR', // AÑADIDO
        });
      } else {
        set({
          orders: page === 1 ? [] : get().orders,
          isLoadingOrders: false,
          ordersError: result.error,
        });
      }
    } catch (error) {
      set({
        orders: page === 1 ? [] : get().orders,
        isLoadingOrders: false,
        ordersError: 'Network error. Please try again.',
      });
    }
  },

  loadMoreOrders: async (venueId) => {
    const { ordersPagination, currentOrderFilter } = get();
    if (!ordersPagination.hasMore) return;
    await get().fetchOrders(venueId, {
      status: currentOrderFilter,
      page: ordersPagination.currentPage + 1,
      resetList: false,
    });
  },

  changeOrderFilter: async (venueId, newStatus) => {
    await get().fetchOrders(venueId, {
      status: newStatus,
      page: 1,
      resetList: true,
    });
  },

  clearOrders: () => {
    set({
      orders: [],
      isLoadingOrders: false,
      ordersError: null,
      ordersPagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasMore: false,
        limit: 10,
      },
      currentOrderFilter: 'pending_staff_approval',
      venueCurrency: 'EUR',
    });
  },

  fetchOrderDetail: async (orderId) => {
    if (!orderId) {
      set({ orderDetailError: 'Order ID is required' });
      return;
    }

    set({ isLoadingOrderDetail: true, orderDetailError: null });

    try {
      const result = await orderService.getOrderDetails(orderId);
      if (result.success) {
        set({
          currentOrder: result.data,
          isLoadingOrderDetail: false,
          orderDetailError: null,
        });
        return { success: true, data: result.data };
      } else {
        set({
          currentOrder: null,
          isLoadingOrderDetail: false,
          orderDetailError: result.error,
        });
        return { success: false, error: result.error };
      }
    } catch (error) {
      set({
        currentOrder: null,
        isLoadingOrderDetail: false,
        orderDetailError: 'Network error. Please try again.',
      });
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  clearCurrentOrder: () => {
    set({
      currentOrder: null,
      isLoadingOrderDetail: false,
      orderDetailError: null,
    });
  },

  // ==================== SEARCH ORDERS METHODS ====================
  searchOrders: async (venueId, searchTerm, options = {}) => {
    const { page = 1 } = options;

    set({ isSearching: true, searchError: null });

    try {
      const result = await orderService.searchOrders(venueId, searchTerm, {
        page,
        limit: 20,
      });

      if (result.success) {
        const currentResults = get().searchResults;
        const newResults = page === 1 ? result.data : [...currentResults, ...result.data];

        set({
          searchResults: newResults,
          ordersPagination: result.pagination,
          isSearching: false,
          searchError: null,
          venueCurrency: result.currency || 'EUR',
        });
      } else {
        set({
          searchResults: page === 1 ? [] : get().searchResults,
          isSearching: false,
          searchError: result.error,
        });
      }
    } catch (error) {
      set({
        searchResults: page === 1 ? [] : get().searchResults,
        isSearching: false,
        searchError: 'Network error. Please try again.',
      });
    }
  },

  clearSearch: () => {
    set({
      searchResults: [],
      isSearching: false,
      searchError: null,
    });
  },

  // ==================== APPROVE/REJECT ORDERS ====================
  approveOrder: async (orderId, venueId, organizationId, employeeId) => {
    try {
      const result = await orderService.approveOrder(
        orderId,
        venueId,
        organizationId,
        employeeId
      );

      if (result.success) {
        // Refrescar el order actual si está cargado
        const currentOrder = get().currentOrder;
        if (currentOrder && currentOrder.order?.id === orderId) {
          await get().fetchOrderDetail(orderId);
        }

        // Refrescar la lista de orders
        const currentFilter = get().currentOrderFilter;
        await get().fetchOrders(venueId, {
          status: currentFilter,
          page: 1,
          resetList: true,
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  },

  rejectOrder: async (orderId, venueId, organizationId, employeeId, reason) => {
    try {
      const result = await orderService.rejectOrder(
        orderId,
        venueId,
        organizationId,
        employeeId,
        reason
      );

      if (result.success) {
        // Refrescar el order actual si está cargado
        const currentOrder = get().currentOrder;
        if (currentOrder && currentOrder.order?.id === orderId) {
          await get().fetchOrderDetail(orderId);
        }

        // Refrescar la lista de orders
        const currentFilter = get().currentOrderFilter;
        await get().fetchOrders(venueId, {
          status: currentFilter,
          page: 1,
          resetList: true,
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'Network error. Please try again.',
      };
    }
  },
}));