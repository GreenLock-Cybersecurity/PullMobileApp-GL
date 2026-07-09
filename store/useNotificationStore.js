import { create } from 'zustand';
import { orderService } from '@/services/orderService';
import { groupReservationService } from '@/services/groupReservationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISMISSED_KEY = '@pull_dismissed_notifications';

const POLL_INTERVAL_MS = 30000;
// Ignore duplicate fetches fired within this window (e.g. several screens
// mounting their headers at once).
const FETCH_THROTTLE_MS = 10000;

// Module-level so there is exactly ONE poller app-wide, no matter how many
// screens (each with its own header bell) are mounted in the navigation stack.
let pollTimer = null;
let pollVenueId = null;

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  isLoading: false,
  error: null,
  unreadCount: 0,
  dismissedIds: new Set(),
  lastFetchTime: null,
  isDropdownOpen: false,

  toggleDropdown: () => {
    set((state) => ({ isDropdownOpen: !state.isDropdownOpen }));
  },

  openDropdown: () => set({ isDropdownOpen: true }),
  closeDropdown: () => set({ isDropdownOpen: false }),

  loadDismissedIds: async () => {
    try {
      const stored = await AsyncStorage.getItem(DISMISSED_KEY);
      if (stored) {
        const ids = JSON.parse(stored);
        set({ dismissedIds: new Set(ids) });
      }
    } catch {
    }
  },

  saveDismissedIds: async (ids) => {
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
    } catch {
    }
  },

  // Start (or reuse) the single global notification poller for a venue.
  startPolling: (venueId) => {
    if (!venueId) return;
    if (pollTimer && pollVenueId === venueId) {
      // Already polling this venue — just refresh if data is stale.
      get().fetchNotifications(venueId);
      return;
    }
    if (pollTimer) clearInterval(pollTimer);
    pollVenueId = venueId;
    get().fetchNotifications(venueId);
    pollTimer = setInterval(() => {
      get().fetchNotifications(venueId, { force: true });
    }, POLL_INTERVAL_MS);
  },

  stopPolling: () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    pollVenueId = null;
  },

  fetchNotifications: async (venueId, { force = false } = {}) => {
    if (!venueId) return;

    // Collapse bursts: multiple headers mount at once during navigation and
    // each asks for a refresh — only the first within the window hits the API.
    const { lastFetchTime, isLoading } = get();
    if (!force && (isLoading || (lastFetchTime && Date.now() - lastFetchTime < FETCH_THROTTLE_MS))) {
      return;
    }

    set({ isLoading: true, error: null, lastFetchTime: Date.now() });

    try {
      const individualResult = await orderService.getOrders(venueId, {
        status: 'pending',
        page: 1,
        limit: 20,
      });

      const groupResult = await groupReservationService.getGroupReservations(venueId, {
        status: 'pending',
        page: 1,
        limit: 20,
      });

      const { dismissedIds } = get();
      const notifications = [];

      if (individualResult.success && individualResult.data) {
        individualResult.data.forEach((order) => {
          const id = `order_${order.id}`;
          if (!dismissedIds.has(id)) {
            notifications.push({
              id,
              type: 'individual',
              title: 'Nueva Reserva Individual',
              message: `${order.customer_name || order.email || 'Cliente'} - ${order.quantity || 1} entrada(s)`,
              subtitle: order.event_name || 'Evento',
              amount: order.total_amount,
              currency: order.currency || 'GTQ',
              createdAt: order.created_at,
              orderId: order.id,
              customerName: order.customer_name,
              customerEmail: order.email,
              eventName: order.event_name,
            });
          }
        });
      }

      if (groupResult.success && groupResult.data) {
        groupResult.data.forEach((reservation) => {
          const id = `group_${reservation.id}`;
          if (!dismissedIds.has(id)) {
            notifications.push({
              id,
              type: 'group',
              title: 'Nueva Reserva Grupal',
              message: `${reservation.organizer_name || 'Organizador'} - ${reservation.guest_count || reservation.total_guests} personas`,
              subtitle: reservation.event_name || 'Evento',
              amount: reservation.total_amount,
              currency: reservation.currency || 'GTQ',
              createdAt: reservation.created_at,
              reservationId: reservation.id,
              organizerName: reservation.organizer_name,
              guestCount: reservation.guest_count || reservation.total_guests,
              eventName: reservation.event_name,
            });
          }
        });
      }

      notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      set({
        notifications,
        unreadCount: notifications.length,
        isLoading: false,
        lastFetchTime: Date.now(),
      });
    } catch {
      set({
        isLoading: false,
        error: 'Error al cargar notificaciones',
      });
    }
  },

  dismissNotification: async (notificationId) => {
    const { dismissedIds, notifications, saveDismissedIds } = get();

    const newDismissedIds = new Set(dismissedIds);
    newDismissedIds.add(notificationId);

    const newNotifications = notifications.filter((n) => n.id !== notificationId);

    set({
      dismissedIds: newDismissedIds,
      notifications: newNotifications,
      unreadCount: newNotifications.length,
    });

    await saveDismissedIds(newDismissedIds);
  },

  clearAllNotifications: async () => {
    const { notifications, dismissedIds, saveDismissedIds } = get();

    const newDismissedIds = new Set(dismissedIds);
    notifications.forEach((n) => newDismissedIds.add(n.id));

    set({
      dismissedIds: newDismissedIds,
      notifications: [],
      unreadCount: 0,
    });

    await saveDismissedIds(newDismissedIds);
  },

  resetDismissed: async () => {
    set({ dismissedIds: new Set() });
    await AsyncStorage.removeItem(DISMISSED_KEY);
  },

  clearNotifications: () => {
    set({
      notifications: [],
      isLoading: false,
      error: null,
      unreadCount: 0,
      isDropdownOpen: false,
    });
  },
}));
