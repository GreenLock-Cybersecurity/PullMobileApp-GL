// app/(tabs)/ReservasList/index.js - OPTIMIZADO PARA VELOCIDAD MÁXIMA
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  StyleSheet,
  Dimensions,
  TextInput,
  Modal,
  Pressable,
  Animated,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { groupReservationService } from '@/services/groupReservationService';
import { guestListService } from '@/services/guestListService';
import { vipListService } from '@/services/vipListService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import CustomHeader from '@/components/CustomHeader';
import BackgroundGlow from '@/components/BackgroundGlow';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 640;

// Fixed margin above tab bar
const FAB_BOTTOM_MARGIN = 75;

// OPTIMIZATION: Cache duration 2 minutes for bookings (shorter for real-time data)
const CACHE_DURATION = 120000;

export default function ReservasList() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const scrollY = useRef(new Animated.Value(0)).current;

  // OPTIMIZATION: Cache timestamps to avoid redundant API calls
  const vipListsLoadedAt = useRef(0);
  const groupsLoadedAt = useRef(0);
  const guestListsLoadedAt = useRef(0);
  const eventsLoadedAt = useRef(0);
  const ordersLoadedAt = useRef(0);

  const {
    orders,
    isLoadingOrders,
    ordersError,
    ordersPagination,
    currentOrderFilter,
    fetchOrders,
    loadMoreOrders,
    changeOrderFilter,
    clearOrders,
    searchOrders,
    searchResults,
    isSearching,
    searchError,
    clearSearch,
    venueCurrency,
  } = useDataStore();

  // Check if venue uses VIP List flow (moved up for initial state)
  const useVipListFlow = user?.use_vip_list_flow || false;

  // Tab state - default to 'viplist' for VIP flow venues
  const [activeTab, setActiveTab] = useState(useVipListFlow ? 'viplist' : 'individual');

  // Individual orders state
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Group reservations state
  const [groupReservations, setGroupReservations] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState(null);
  const [selectedGroupStatus, setSelectedGroupStatus] = useState('pending');

  // Guest list signups state
  const [guestListSignups, setGuestListSignups] = useState([]);
  const [isLoadingGuestLists, setIsLoadingGuestLists] = useState(false);
  const [guestListsError, setGuestListsError] = useState(null);
  const [selectedGuestListStatus, setSelectedGuestListStatus] = useState('pending');

  // VIP List state
  const [vipLists, setVipLists] = useState([]);
  const [isLoadingVipLists, setIsLoadingVipLists] = useState(false);
  const [vipListsError, setVipListsError] = useState(null);
  const [selectedVipListStatus, setSelectedVipListStatus] = useState('All');

  // Event filter state (for VIP lists)
  const [venueEvents, setVenueEvents] = useState([]);
  const [selectedEventFilter, setSelectedEventFilter] = useState('All');
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Set initial tab when user loads (for VIP flow venues)
  useEffect(() => {
    if (useVipListFlow && activeTab !== 'viplist') {
      setActiveTab('viplist');
    }
  }, [useVipListFlow]);

  // Debounce timer for auto-search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setIsSearchMode(false);
      clearSearch();
      return;
    }

    // Debounce search - wait 500ms after user stops typing
    const debounceTimer = setTimeout(() => {
      if (user?.venue_id_real && searchTerm.trim()) {
        setIsSearchMode(true);
        searchOrders(user.venue_id_real, searchTerm.trim(), { page: 1 });
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, user?.venue_id_real]);

  const statusOptions = [
    { display: 'Pending', value: 'pending', icon: 'time-outline' },
    { display: 'Confirmed', value: 'confirmed', icon: 'checkmark-circle-outline' },
    { display: 'Checked-In', value: 'checked_in', icon: 'enter-outline' },
    { display: 'Cancelled', value: 'cancelled', icon: 'close-circle-outline' },
    { display: 'Refunded', value: 'refunded', icon: 'cash-outline' },
    { display: 'Expired', value: 'expired', icon: 'hourglass-outline' },
    { display: 'All', value: 'All', icon: 'list-outline' },
  ];

  // OPTIMIZED: Initial load with parallel fetches for maximum speed
  useEffect(() => {
    if (user?.venue_id_real) {
      // For VIP flow venues, fetch VIP lists and events in parallel
      if (useVipListFlow) {
        Promise.all([
          fetchVipLists(selectedVipListStatus),
          fetchVenueEvents()
        ]);
      } else if (activeTab === 'individual') {
        fetchOrders(user.venue_id_real, {
          status: 'pending',
          page: 1,
          resetList: true,
        });
      } else if (activeTab === 'group') {
        fetchGroupReservations('pending');
      } else if (activeTab === 'guestlist') {
        fetchGuestListSignups('pending');
      } else if (activeTab === 'viplist') {
        // Parallel fetch for non-VIP flow venues viewing VIP tab
        Promise.all([
          fetchVipLists('All'),
          fetchVenueEvents()
        ]);
      }
    }

    return () => {
      clearOrders();
      clearSearch();
    };
  }, [user?.venue_id_real, activeTab, useVipListFlow]);

  // OPTIMIZED: Fetch group reservations with caching
  const fetchGroupReservations = async (status = 'pending', forceReload = false) => {
    if (!user?.venue_id_real) return;

    const now = Date.now();
    // Skip if cache is fresh and not forcing reload
    if (!forceReload && groupsLoadedAt.current && (now - groupsLoadedAt.current < CACHE_DURATION)) {
      return;
    }

    try {
      setIsLoadingGroups(true);
      setGroupsError(null);

      const result = await groupReservationService.getGroupReservations(
        user.venue_id_real,
        { status, page: 1, limit: 50 }
      );

      if (result.success) {
        setGroupReservations(result.data);
        groupsLoadedAt.current = now;
      } else {
        setGroupsError(result.error);
      }
    } catch (err) {
      setGroupsError('Failed to load group reservations');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // OPTIMIZED: Fetch guest list signups with caching
  const fetchGuestListSignups = async (status = 'pending', forceReload = false) => {
    if (!user?.venue_id_real) return;

    const now = Date.now();
    // Skip if cache is fresh and not forcing reload
    if (!forceReload && guestListsLoadedAt.current && (now - guestListsLoadedAt.current < CACHE_DURATION)) {
      return;
    }

    try {
      setIsLoadingGuestLists(true);
      setGuestListsError(null);

      const result = await guestListService.getPendingSignups(user.venue_id_real);

      if (result.success) {
        let data = result.data || [];
        // Filter by status if not 'All'
        if (status && status !== 'All') {
          data = data.filter(s => s.status === status);
        }
        setGuestListSignups(data);
        guestListsLoadedAt.current = now;
      } else {
        setGuestListsError(result.error);
      }
    } catch (err) {
      setGuestListsError('Failed to load guest list signups');
    } finally {
      setIsLoadingGuestLists(false);
    }
  };

  // OPTIMIZED: Fetch VIP Lists with caching
  const fetchVipLists = async (status = 'All', forceReload = false) => {
    if (!user?.venue_id_real) return;

    const now = Date.now();
    // Skip if cache is fresh and not forcing reload
    if (!forceReload && vipListsLoadedAt.current && (now - vipListsLoadedAt.current < CACHE_DURATION)) {
      return;
    }

    try {
      setIsLoadingVipLists(true);
      setVipListsError(null);

      const result = await vipListService.getByVenue(user.venue_id_real, { status });

      if (result.success) {
        setVipLists(result.data || []);
        vipListsLoadedAt.current = now;
      } else {
        setVipListsError(result.error);
      }
    } catch (err) {
      setVipListsError('Failed to load VIP lists');
    } finally {
      setIsLoadingVipLists(false);
    }
  };

  // OPTIMIZED: Fetch venue events for filtering with caching
  const fetchVenueEvents = async (forceReload = false) => {
    if (!user?.venue_id_real) return;

    const now = Date.now();
    // Skip if cache is fresh and not forcing reload (events change less frequently)
    if (!forceReload && eventsLoadedAt.current && (now - eventsLoadedAt.current < CACHE_DURATION * 2)) {
      return;
    }

    try {
      setIsLoadingEvents(true);
      const result = await vipListService.getUpcomingEvents(user.venue_id_real);

      if (result.success) {
        setVenueEvents(result.data || []);
        eventsLoadedAt.current = now;
      }
    } catch (err) {
      console.log('Failed to load events for filter');
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // OPTIMIZATION: Auto-reload data when tab becomes focused (returns from other screens)
  useFocusEffect(
    useCallback(() => {
      if (!user?.venue_id_real) return;

      // When tab gains focus, check if cache is stale and reload if needed
      // This uses the caching logic in fetch functions - they will skip if fresh
      if (useVipListFlow) {
        fetchVipLists(selectedVipListStatus);
        fetchVenueEvents();
      } else if (activeTab === 'individual') {
        // For individual orders, the store handles its own caching
        fetchOrders(user.venue_id_real, {
          status: selectedStatus,
          page: 1,
          resetList: false, // Don't reset if cache is valid
        });
      } else if (activeTab === 'group') {
        fetchGroupReservations(selectedGroupStatus);
      } else if (activeTab === 'guestlist') {
        fetchGuestListSignups(selectedGuestListStatus);
      } else if (activeTab === 'viplist') {
        fetchVipLists(selectedVipListStatus);
        fetchVenueEvents();
      }
    }, [user?.venue_id_real, useVipListFlow, activeTab, selectedStatus, selectedGroupStatus, selectedGuestListStatus, selectedVipListStatus])
  );

  // Filter VIP lists by selected event
  const filteredVipLists = useMemo(() => {
    if (selectedEventFilter === 'All') {
      return vipLists;
    }
    return vipLists.filter(list => list.event_id === selectedEventFilter);
  }, [vipLists, selectedEventFilter]);

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'EUR': '€',
      'USD': '$',
      'GTQ': 'Q',
      'MXN': '$',
      'GBP': '£',
    };
    return symbols[currency] || currency || 'Q';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b'; // Amber/Orange - awaiting approval
      case 'confirmed':
        return '#10b981'; // Green - approved, has QR
      case 'checked_in':
        return '#3b82f6'; // Blue - entered venue
      case 'cancelled':
        return '#6b7280'; // Gray - cancelled
      case 'refunded':
        return '#8b5cf6'; // Purple - refunded
      case 'expired':
        return '#ef4444'; // Red - expired/no-show
      default:
        return '#6b7280';
    }
  };

  const getStatusDisplayName = (status) => {
    const option = statusOptions.find((opt) => opt.value === status);
    return option ? option.display : status;
  };

  const handleStatusFilter = async (statusValue) => {
    setSelectedStatus(statusValue);
    setIsSearchMode(false);
    setSearchTerm('');
    clearSearch();
    if (user?.venue_id_real) {
      await changeOrderFilter(user.venue_id_real, statusValue);
    }
  };

  const handleSearch = async (term) => {
    if (!term.trim()) {
      setIsSearchMode(false);
      clearSearch();
      return;
    }

    setIsSearchMode(true);
    if (user?.venue_id_real) {
      await searchOrders(user.venue_id_real, term.trim(), { page: 1 });
    }
  };

  const handleLoadMore = async () => {
    if (user?.venue_id_real && ordersPagination.hasMore) {
      if (isSearchMode) {
        await searchOrders(user.venue_id_real, searchTerm, {
          page: ordersPagination.currentPage + 1,
        });
      } else {
        await loadMoreOrders(user.venue_id_real);
      }
    }
  };

  // OPTIMIZED: Pull-to-refresh forces reload by bypassing cache
  const onRefresh = async () => {
    if (isSearchMode) {
      if (user?.venue_id_real && searchTerm) {
        await searchOrders(user.venue_id_real, searchTerm, { page: 1 });
      }
    } else {
      if (user?.venue_id_real) {
        // For VIP flow venues, always refresh VIP lists with forceReload=true
        if (useVipListFlow) {
          // Parallel refresh for speed
          await Promise.all([
            fetchVipLists(selectedVipListStatus, true),
            fetchVenueEvents(true)
          ]);
        } else if (activeTab === 'individual') {
          await fetchOrders(user.venue_id_real, {
            status: selectedStatus,
            page: 1,
            resetList: true,
          });
        } else if (activeTab === 'group') {
          await fetchGroupReservations(selectedGroupStatus, true);
        } else if (activeTab === 'guestlist') {
          await fetchGuestListSignups(selectedGuestListStatus, true);
        } else if (activeTab === 'viplist') {
          // Parallel refresh for speed
          await Promise.all([
            fetchVipLists(selectedVipListStatus, true),
            fetchVenueEvents(true)
          ]);
        }
      }
    }
  };

  const renderOrder = ({ item }) => {
    const currencySymbol = getCurrencySymbol(item.currency || venueCurrency);

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/(tabs)/ReservasList/ReservaDetalle?id=${item.id}`)
        }
        activeOpacity={0.8}
        style={{ marginBottom: 8 }}
      >
        <BlurView intensity={60} tint="dark" style={styles.orderCard}>
          <LinearGradient
            colors={['rgba(168, 85, 255, 0.08)', 'transparent', 'rgba(139, 92, 246, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.orderCardInnerNew}>
            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <LinearGradient
                colors={[`${getStatusColor(item.status)}30`, `${getStatusColor(item.status)}15`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.statusBadgeNew, { borderColor: `${getStatusColor(item.status)}50` }]}
              >
                <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={[styles.statusTextNew, { color: getStatusColor(item.status) }]}>
                  {getStatusDisplayName(item.status)}
                </Text>
              </LinearGradient>

              <LinearGradient
                colors={['rgba(168, 85, 255, 0.2)', 'rgba(139, 92, 246, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ticketBadge}
              >
                <Ionicons name="ticket-outline" size={12} color="rgb(167, 139, 250)" />
                <Text style={styles.badgeTextPurple}>
                  {item.quantity || 1} {(item.quantity || 1) === 1 ? 'ticket' : 'tickets'}
                </Text>
              </LinearGradient>
            </View>

            {/* Order ID */}
            <Text style={styles.orderTitleNew}>
              {item.order_number || `Order #${item.id.substring(0, 8)}`}
            </Text>

            {/* Customer Info */}
            <View style={styles.customerRow}>
              <Ionicons name="person" size={14} color="rgb(52, 211, 153)" />
              <Text style={styles.customerNameNew}>{item.user_name || 'Customer'}</Text>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.priceTextGreen}>
                {currencySymbol}{item.total?.toFixed(2) || '0.00'}
              </Text>
              <View style={styles.viewDetailsLink}>
                <Text style={styles.viewDetailsTextPurple}>View Details</Text>
                <Ionicons name="arrow-forward" size={14} color="rgb(168, 85, 255)" />
              </View>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderGroupReservation = ({ item }) => {
    const currencySymbol = getCurrencySymbol(item.currency || venueCurrency);

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/(tabs)/ReservasList/GroupReservaDetalle?id=${item.reservation_id}`)
        }
        activeOpacity={0.8}
        style={{ marginBottom: 8 }}
      >
        <BlurView intensity={60} tint="dark" style={styles.orderCard}>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.08)', 'transparent', 'rgba(37, 99, 235, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.orderCardInnerBlue}>
            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <LinearGradient
                colors={[`${getStatusColor(item.status)}30`, `${getStatusColor(item.status)}15`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.statusBadgeNew, { borderColor: `${getStatusColor(item.status)}50` }]}
              >
                <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={[styles.statusTextNew, { color: getStatusColor(item.status) }]}>
                  {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                </Text>
              </LinearGradient>

              <LinearGradient
                colors={['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.groupBadge}
              >
                <Ionicons name="people" size={12} color="rgb(59, 130, 246)" />
                <Text style={styles.badgeTextBlue}>
                  {item.quantity} guests
                </Text>
              </LinearGradient>
            </View>

            {/* Group ID */}
            <Text style={styles.orderTitleNew}>
              Group #{item.reservation_id?.substring(0, 8)}
            </Text>

            {/* Organizer Info */}
            <View style={styles.customerRow}>
              <Ionicons name="person" size={14} color="rgb(52, 211, 153)" />
              <Text style={styles.customerNameNew}>{item.user_name || 'Organizer'}</Text>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <Text style={styles.priceTextGreen}>
                {currencySymbol}{item.total?.toFixed(2) || '0.00'}
              </Text>
              <View style={styles.viewDetailsLink}>
                <Text style={styles.viewDetailsTextBlue}>View Details</Text>
                <Ionicons name="arrow-forward" size={14} color="rgb(59, 130, 246)" />
              </View>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderGuestListSignup = ({ item }) => {
    const totalPeople = 1 + (item.guest_count || 0);

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/(tabs)/ReservasList/GuestListDetalle?id=${item.id}`)
        }
        activeOpacity={0.8}
        style={{ marginBottom: 8 }}
      >
        <BlurView intensity={60} tint="dark" style={styles.orderCard}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.08)', 'transparent', 'rgba(52, 211, 153, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.orderCardInnerGreen}>
            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <LinearGradient
                colors={[`${getStatusColor(item.status)}30`, `${getStatusColor(item.status)}15`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.statusBadgeNew, { borderColor: `${getStatusColor(item.status)}50` }]}
              >
                <View style={[styles.statusDotSmall, { backgroundColor: getStatusColor(item.status) }]} />
                <Text style={[styles.statusTextNew, { color: getStatusColor(item.status) }]}>
                  {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                </Text>
              </LinearGradient>

              <LinearGradient
                colors={['rgba(16, 185, 129, 0.2)', 'rgba(52, 211, 153, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.guestListBadge}
              >
                <Ionicons name="people" size={12} color="rgb(52, 211, 153)" />
                <Text style={styles.badgeTextGreen}>
                  {totalPeople} {totalPeople === 1 ? 'person' : 'people'}
                </Text>
              </LinearGradient>

              <View style={styles.freeBadgeSmall}>
                <Text style={styles.freeTextSmall}>FREE</Text>
              </View>
            </View>

            {/* Guest List Name */}
            <Text style={styles.orderTitleNew}>
              {item.guest_list_name || 'Guest List'}
            </Text>

            {/* Guest Info */}
            <View style={styles.customerRow}>
              <Ionicons name="person" size={14} color="rgb(52, 211, 153)" />
              <Text style={styles.customerNameNew}>{item.name} {item.last_name}</Text>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.emailRow}>
                <Ionicons name="mail-outline" size={14} color="rgba(255, 255, 255, 0.5)" />
                <Text style={styles.emailTextSmall}>{item.email}</Text>
              </View>
              <View style={styles.viewDetailsLink}>
                <Text style={styles.viewDetailsTextGreen}>View Details</Text>
                <Ionicons name="arrow-forward" size={14} color="rgb(16, 185, 129)" />
              </View>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const getVipStatusColor = (status) => {
    switch (status) {
      case 'open': return '#10b981';
      case 'closed': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderVipList = ({ item }) => {
    const confirmedGuests = item.confirmed_total || 0;
    const expectedTotal = (item.expected_men || 0) + (item.expected_women || 0);
    const currencySymbol = getCurrencySymbol(item.currency || venueCurrency);
    const malePrice = item.male_price || item.price_per_person || 0;
    const femalePrice = item.female_price || item.price_per_person || 0;
    const malePriceWithFee = (malePrice * 1.15).toFixed(2);
    const femalePriceWithFee = (femalePrice * 1.15).toFixed(2);

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/(tabs)/ReservasList/VIPListDetalle?id=${item.id}`)
        }
        activeOpacity={0.8}
        style={{ marginBottom: 8 }}
      >
        <BlurView intensity={60} tint="dark" style={styles.orderCard}>
          <LinearGradient
            colors={['rgba(168, 85, 255, 0.08)', 'transparent', 'rgba(139, 92, 246, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.orderCardInnerNew}>
            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <LinearGradient
                colors={[`${getVipStatusColor(item.status)}30`, `${getVipStatusColor(item.status)}15`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.statusBadgeNew, { borderColor: `${getVipStatusColor(item.status)}50` }]}
              >
                <View style={[styles.statusDotSmall, { backgroundColor: getVipStatusColor(item.status) }]} />
                <Text style={[styles.statusTextNew, { color: getVipStatusColor(item.status) }]}>
                  {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                </Text>
              </LinearGradient>

              <LinearGradient
                colors={['rgba(168, 85, 255, 0.2)', 'rgba(139, 92, 246, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ticketBadge}
              >
                <Ionicons name="star" size={12} color="rgb(167, 139, 250)" />
                <Text style={styles.badgeTextPurple}>VIP</Text>
              </LinearGradient>

              <View style={styles.typeBadgeSmall}>
                <Ionicons
                  name={item.table_or_bar === 'table' ? 'restaurant' : 'beer'}
                  size={12}
                  color="rgba(255, 255, 255, 0.6)"
                />
                <Text style={styles.typeBadgeText}>
                  {item.table_or_bar === 'table' ? 'Table' : 'Bar'}
                </Text>
              </View>
            </View>

            {/* Reservation Name */}
            <Text style={styles.orderTitleNew}>
              {item.reservation_name || 'VIP List'}
            </Text>

            {/* Host Info */}
            <View style={styles.customerRow}>
              <Ionicons name="person" size={14} color="rgb(52, 211, 153)" />
              <Text style={styles.customerNameNew}>{item.host_name} {item.host_last_name}</Text>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              <View style={styles.guestsInfo}>
                <Ionicons name="people" size={14} color="rgba(255, 255, 255, 0.5)" />
                <Text style={styles.guestsText}>{confirmedGuests}/{expectedTotal}</Text>
              </View>
              <View style={styles.pricesContainer}>
                <Text style={styles.priceTextSmall}>
                  <Text style={styles.priceLabel}>M: </Text>
                  <Text style={styles.priceTextGreen}>{currencySymbol}{malePriceWithFee}</Text>
                </Text>
                <Text style={styles.priceTextSmall}>
                  <Text style={styles.priceLabel}>F: </Text>
                  <Text style={styles.priceTextGreen}>{currencySymbol}{femalePriceWithFee}</Text>
                </Text>
              </View>
              <View style={styles.viewDetailsLink}>
                <Text style={styles.viewDetailsTextPurple}>View Details</Text>
                <Ionicons name="arrow-forward" size={14} color="rgb(168, 85, 255)" />
              </View>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderLoadMoreButton = () => {
    if (!ordersPagination || !ordersPagination.hasMore) return null;

    const loading = isSearchMode ? isSearching : isLoadingOrders;
    const currentCount = dataSource.length; // Use deduplicated count
    const remaining = Math.max(0, (ordersPagination.totalCount || 0) - currentCount);

    // Don't show button if nothing remaining
    if (remaining <= 0 && !loading) return null;

    return (
      <TouchableOpacity
        onPress={handleLoadMore}
        disabled={loading}
        activeOpacity={0.8}
        style={{ marginTop: 8, marginBottom: 16 }}
      >
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.2)', 'rgba(217, 70, 239, 0.2)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.loadMoreButton}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.loadMoreText}>
              Load More ({remaining} remaining)
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const LoadingComponent = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="rgba(139, 92, 246, 0.9)" />
      <Text style={styles.loadingText}>
        {isSearchMode ? 'Searching...' : 'Loading orders...'}
      </Text>
    </View>
  );

  const ErrorComponent = () => {
    const error = isSearchMode ? searchError : ordersError;
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="rgba(239, 68, 68, 0.8)" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={onRefresh} activeOpacity={0.8} style={{ marginTop: 16 }}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.2)', 'rgba(217, 70, 239, 0.2)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <BlurView intensity={60} tint="dark" style={styles.emptyCard}>
        <View style={styles.emptyCardInner}>
          <Ionicons name="ticket-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyText}>
            {isSearchMode ? 'No results found' : 'No orders found'}
          </Text>
        </View>
      </BlurView>
    </View>
  );

  // For VIP flow venues, always use VIP list data (with event filter applied)
  const rawDataSource = useVipListFlow
    ? filteredVipLists
    : activeTab === 'individual'
      ? (isSearchMode ? searchResults : orders)
      : activeTab === 'group'
        ? groupReservations
        : activeTab === 'viplist'
          ? filteredVipLists
          : guestListSignups;
  const loading = useVipListFlow
    ? isLoadingVipLists
    : activeTab === 'individual'
      ? (isSearchMode ? isSearching : isLoadingOrders)
      : activeTab === 'group'
        ? isLoadingGroups
        : activeTab === 'viplist'
          ? isLoadingVipLists
          : isLoadingGuestLists;
  const error = useVipListFlow
    ? vipListsError
    : activeTab === 'individual'
      ? (isSearchMode ? searchError : ordersError)
      : activeTab === 'group'
        ? groupsError
        : activeTab === 'viplist'
          ? vipListsError
          : guestListsError;

  // Deduplicate data to prevent "two children with same key" error
  const dataSource = useMemo(() => {
    if (!rawDataSource || rawDataSource.length === 0) return [];

    const seen = new Set();
    return rawDataSource.filter((item) => {
      let key;
      if (useVipListFlow) {
        key = item.id;
      } else if (activeTab === 'individual') {
        key = item.id;
      } else if (activeTab === 'group') {
        key = item.reservation_id || item.id;
      } else {
        key = item.id;
      }

      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [rawDataSource, activeTab, useVipListFlow]);

  return (
    <BackgroundGlow>
      <CustomHeader title="Bookings" scrollY={scrollY} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: 70 }}>
          {/* Search Bar with Filter Button */}
          <View style={styles.searchContainer}>
            <View style={styles.searchRow}>
              <View style={styles.searchInputContainer}>
                <Ionicons
                  name="search"
                  size={20}
                  color="rgba(255, 255, 255, 0.5)"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder={
                    useVipListFlow
                      ? "Search VIP lists..."
                      : activeTab === 'individual'
                        ? "Search by name, email, or order..."
                        : activeTab === 'group'
                          ? "Search groups..."
                          : activeTab === 'viplist'
                            ? "Search VIP lists..."
                            : "Search guest lists..."
                  }
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  onSubmitEditing={() => handleSearch(searchTerm)}
                  returnKeyType="search"
                />
                {isSearching && searchTerm.length > 0 ? (
                  <ActivityIndicator size="small" color="rgba(139, 92, 246, 0.9)" style={styles.searchLoading} />
                ) : searchTerm.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchTerm('');
                      setIsSearchMode(false);
                      clearSearch();
                    }}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.5)" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Filter Button */}
              <TouchableOpacity
                onPress={() => setShowFilterModal(true)}
                activeOpacity={0.8}
                style={styles.filterIconButton}
              >
                <Ionicons name="options-outline" size={22} color="rgba(255, 255, 255, 0.8)" />
                {(selectedStatus !== 'pending' || selectedGroupStatus !== 'pending' || selectedGuestListStatus !== 'pending' || selectedVipListStatus !== 'All' || selectedEventFilter !== 'All' || activeTab !== 'individual') && (
                  <View style={[
                    styles.filterActiveDot,
                    activeTab === 'group' && { backgroundColor: '#3b82f6' },
                    activeTab === 'guestlist' && { backgroundColor: '#10b981' },
                    (activeTab === 'viplist' || useVipListFlow) && { backgroundColor: '#a78bfa' },
                  ]} />
                )}
              </TouchableOpacity>
            </View>

            {/* Current Filter Indicator */}
            {!isSearchMode && (
              <View style={styles.currentFilterContainer}>
                <Text style={styles.currentFilterLabel}>Showing:</Text>
                <View style={[
                  styles.currentFilterBadge,
                  activeTab === 'group' && styles.currentFilterBadgeBlue,
                  activeTab === 'guestlist' && styles.currentFilterBadgeGreen,
                ]}>
                  <Ionicons
                    name={
                      useVipListFlow
                        ? 'star-outline'
                        : activeTab === 'individual'
                          ? 'ticket-outline'
                          : activeTab === 'group'
                            ? 'people-outline'
                            : activeTab === 'viplist'
                              ? 'star-outline'
                              : 'list-outline'
                    }
                    size={14}
                    color={
                      useVipListFlow
                        ? '#a78bfa'
                        : activeTab === 'individual'
                          ? '#a78bfa'
                          : activeTab === 'group'
                            ? '#3b82f6'
                            : activeTab === 'viplist'
                              ? '#a78bfa'
                              : '#10b981'
                    }
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[
                    styles.currentFilterText,
                    activeTab === 'group' && styles.currentFilterTextBlue,
                    activeTab === 'guestlist' && styles.currentFilterTextGreen,
                  ]} numberOfLines={1}>
                    {useVipListFlow
                      ? `VIP Lists - ${selectedVipListStatus.charAt(0).toUpperCase() + selectedVipListStatus.slice(1)}${selectedEventFilter !== 'All' ? ` (${venueEvents.find(e => (e.event_id || e.id) === selectedEventFilter)?.event_name || venueEvents.find(e => (e.event_id || e.id) === selectedEventFilter)?.name || 'Event'})` : ''}`
                      : activeTab === 'individual'
                        ? `Individual - ${statusOptions.find(o => o.value === selectedStatus)?.display}`
                        : activeTab === 'group'
                          ? `Group - ${selectedGroupStatus.charAt(0).toUpperCase() + selectedGroupStatus.slice(1)}`
                          : activeTab === 'viplist'
                            ? `VIP Lists - ${selectedVipListStatus.charAt(0).toUpperCase() + selectedVipListStatus.slice(1)}${selectedEventFilter !== 'All' ? ` (${venueEvents.find(e => (e.event_id || e.id) === selectedEventFilter)?.event_name || venueEvents.find(e => (e.event_id || e.id) === selectedEventFilter)?.name || 'Event'})` : ''}`
                            : `Guest List - ${selectedGuestListStatus.charAt(0).toUpperCase() + selectedGuestListStatus.slice(1)}`
                    }
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Unified Filter Modal */}
          <Modal
            visible={showFilterModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowFilterModal(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowFilterModal(false)}
            >
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Filters</Text>
                  <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                    <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.8)" />
                  </TouchableOpacity>
                </View>

                {/* Type Selection - Only show for non-VIP flow venues */}
                {!useVipListFlow && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Type</Text>
                    <View style={styles.typeButtonsRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveTab('individual');
                          if (user?.venue_id_real) {
                            fetchOrders(user.venue_id_real, {
                              status: selectedStatus,
                              page: 1,
                              resetList: true,
                            });
                          }
                        }}
                        activeOpacity={0.7}
                        style={[
                          styles.typeButton,
                          activeTab === 'individual' && styles.typeButtonActive
                        ]}
                      >
                        <Ionicons
                          name={activeTab === 'individual' ? 'ticket' : 'ticket-outline'}
                          size={18}
                          color={activeTab === 'individual' ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)'}
                        />
                        <Text style={[
                          styles.typeButtonText,
                          activeTab === 'individual' && styles.typeButtonTextActive
                        ]}>
                          Individual
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveTab('group');
                          fetchGroupReservations(selectedGroupStatus);
                        }}
                        activeOpacity={0.7}
                        style={[
                          styles.typeButton,
                          activeTab === 'group' && styles.typeButtonActiveBlue
                        ]}
                      >
                        <Ionicons
                          name={activeTab === 'group' ? 'people' : 'people-outline'}
                          size={18}
                          color={activeTab === 'group' ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)'}
                        />
                        <Text style={[
                          styles.typeButtonText,
                          activeTab === 'group' && styles.typeButtonTextActiveBlue
                        ]}>
                          Group
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setActiveTab('guestlist');
                          fetchGuestListSignups(selectedGuestListStatus);
                        }}
                        activeOpacity={0.7}
                        style={[
                          styles.typeButton,
                          activeTab === 'guestlist' && styles.typeButtonActiveGreen
                        ]}
                      >
                        <Ionicons
                          name={activeTab === 'guestlist' ? 'list' : 'list-outline'}
                          size={18}
                          color={activeTab === 'guestlist' ? '#10b981' : 'rgba(255, 255, 255, 0.6)'}
                        />
                        <Text style={[
                          styles.typeButtonText,
                          activeTab === 'guestlist' && styles.typeButtonTextActiveGreen
                        ]}>
                          Guest List
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Event Filter - Only for VIP flow venues */}
                {useVipListFlow && venueEvents.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Event</Text>
                    <View style={styles.modalOptions}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedEventFilter('All');
                          setShowFilterModal(false);
                        }}
                        activeOpacity={0.7}
                        style={[
                          styles.modalOption,
                          selectedEventFilter === 'All' && styles.modalOptionActive
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color={selectedEventFilter === 'All' ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)'}
                        />
                        <Text style={[
                          styles.modalOptionText,
                          selectedEventFilter === 'All' && styles.modalOptionTextActive
                        ]}>
                          All Events
                        </Text>
                        {selectedEventFilter === 'All' && (
                          <Ionicons name="checkmark" size={20} color="#a78bfa" />
                        )}
                      </TouchableOpacity>
                      {venueEvents.map((event) => {
                        const eventId = event.event_id || event.id;
                        const eventName = event.event_name || event.name;
                        return (
                          <TouchableOpacity
                            key={eventId}
                            onPress={() => {
                              setSelectedEventFilter(eventId);
                              setShowFilterModal(false);
                            }}
                            activeOpacity={0.7}
                            style={[
                              styles.modalOption,
                              selectedEventFilter === eventId && styles.modalOptionActive
                            ]}
                          >
                            <Ionicons
                              name="calendar"
                              size={20}
                              color={selectedEventFilter === eventId ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)'}
                            />
                            <Text
                              style={[
                                styles.modalOptionText,
                                selectedEventFilter === eventId && styles.modalOptionTextActive
                              ]}
                              numberOfLines={1}
                            >
                              {eventName}
                            </Text>
                            {selectedEventFilter === eventId && (
                              <Ionicons name="checkmark" size={20} color="#a78bfa" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Status Selection */}
                <View style={[styles.modalSection, { borderBottomWidth: 0 }]}>
                  <Text style={styles.modalSectionTitle}>Status</Text>
                  <View style={styles.modalOptions}>
                    {useVipListFlow ? (
                      // VIP Flow venues only see VIP List status options
                      [
                        { display: 'All', value: 'All', icon: 'list-outline' },
                        { display: 'Open', value: 'open', icon: 'lock-open-outline' },
                        { display: 'Closed', value: 'closed', icon: 'lock-closed-outline' },
                        { display: 'Completed', value: 'completed', icon: 'checkmark-circle-outline' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            setSelectedVipListStatus(option.value);
                            // Force reload when changing filter (different status = different data)
                            fetchVipLists(option.value, true);
                            setShowFilterModal(false);
                          }}
                          activeOpacity={0.7}
                          style={[
                            styles.modalOption,
                            selectedVipListStatus === option.value && styles.modalOptionActive
                          ]}
                        >
                          <Ionicons
                            name={option.icon}
                            size={20}
                            color={selectedVipListStatus === option.value ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)'}
                          />
                          <Text style={[
                            styles.modalOptionText,
                            selectedVipListStatus === option.value && styles.modalOptionTextActive
                          ]}>
                            {option.display}
                          </Text>
                          {selectedVipListStatus === option.value && (
                            <Ionicons name="checkmark" size={20} color="#a78bfa" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : activeTab === 'individual' ? (
                      statusOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            handleStatusFilter(option.value);
                            setShowFilterModal(false);
                          }}
                          activeOpacity={0.7}
                          style={[
                            styles.modalOption,
                            selectedStatus === option.value && styles.modalOptionActive
                          ]}
                        >
                          <Ionicons
                            name={option.icon}
                            size={20}
                            color={selectedStatus === option.value ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)'}
                          />
                          <Text style={[
                            styles.modalOptionText,
                            selectedStatus === option.value && styles.modalOptionTextActive
                          ]}>
                            {option.display}
                          </Text>
                          {selectedStatus === option.value && (
                            <Ionicons name="checkmark" size={20} color="#a78bfa" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : activeTab === 'viplist' ? (
                      [
                        { display: 'All', value: 'All', icon: 'list-outline' },
                        { display: 'Open', value: 'open', icon: 'lock-open-outline' },
                        { display: 'Closed', value: 'closed', icon: 'lock-closed-outline' },
                        { display: 'Completed', value: 'completed', icon: 'checkmark-circle-outline' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            setSelectedVipListStatus(option.value);
                            // Force reload when changing filter
                            fetchVipLists(option.value, true);
                            setShowFilterModal(false);
                          }}
                          activeOpacity={0.7}
                          style={[
                            styles.modalOption,
                            selectedVipListStatus === option.value && styles.modalOptionActive
                          ]}
                        >
                          <Ionicons
                            name={option.icon}
                            size={20}
                            color={selectedVipListStatus === option.value ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)'}
                          />
                          <Text style={[
                            styles.modalOptionText,
                            selectedVipListStatus === option.value && styles.modalOptionTextActive
                          ]}>
                            {option.display}
                          </Text>
                          {selectedVipListStatus === option.value && (
                            <Ionicons name="checkmark" size={20} color="#a78bfa" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : activeTab === 'group' ? (
                      [
                        { display: 'Pending', value: 'pending', icon: 'time-outline' },
                        { display: 'Approved', value: 'approved', icon: 'checkmark-circle-outline' },
                        { display: 'Rejected', value: 'rejected', icon: 'close-circle-outline' },
                        { display: 'All', value: 'All', icon: 'list-outline' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            setSelectedGroupStatus(option.value);
                            // Force reload when changing filter
                            fetchGroupReservations(option.value, true);
                            setShowFilterModal(false);
                          }}
                          activeOpacity={0.7}
                          style={[
                            styles.modalOption,
                            selectedGroupStatus === option.value && styles.modalOptionActiveBlue
                          ]}
                        >
                          <Ionicons
                            name={option.icon}
                            size={20}
                            color={selectedGroupStatus === option.value ? '#3b82f6' : 'rgba(255, 255, 255, 0.6)'}
                          />
                          <Text style={[
                            styles.modalOptionText,
                            selectedGroupStatus === option.value && styles.modalOptionTextActiveBlue
                          ]}>
                            {option.display}
                          </Text>
                          {selectedGroupStatus === option.value && (
                            <Ionicons name="checkmark" size={20} color="#3b82f6" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      [
                        { display: 'Pending', value: 'pending', icon: 'time-outline' },
                        { display: 'Approved', value: 'approved', icon: 'checkmark-circle-outline' },
                        { display: 'Rejected', value: 'rejected', icon: 'close-circle-outline' },
                        { display: 'All', value: 'All', icon: 'list-outline' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            setSelectedGuestListStatus(option.value);
                            // Force reload when changing filter
                            fetchGuestListSignups(option.value, true);
                            setShowFilterModal(false);
                          }}
                          activeOpacity={0.7}
                          style={[
                            styles.modalOption,
                            selectedGuestListStatus === option.value && styles.modalOptionActiveGreen
                          ]}
                        >
                          <Ionicons
                            name={option.icon}
                            size={20}
                            color={selectedGuestListStatus === option.value ? '#10b981' : 'rgba(255, 255, 255, 0.6)'}
                          />
                          <Text style={[
                            styles.modalOptionText,
                            selectedGuestListStatus === option.value && styles.modalOptionTextActiveGreen
                          ]}>
                            {option.display}
                          </Text>
                          {selectedGuestListStatus === option.value && (
                            <Ionicons name="checkmark" size={20} color="#10b981" />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </View>
              </Pressable>
            </Pressable>
          </Modal>

          <View style={styles.listContainer}>
            {loading && dataSource.length === 0 ? (
              <LoadingComponent />
            ) : error && dataSource.length === 0 ? (
              <ErrorComponent />
            ) : (
              <FlatList
                data={dataSource}
                renderItem={
                  useVipListFlow
                    ? renderVipList
                    : activeTab === 'individual'
                      ? renderOrder
                      : activeTab === 'group'
                        ? renderGroupReservation
                        : activeTab === 'viplist'
                          ? renderVipList
                          : renderGuestListSignup
                }
                keyExtractor={(item, index) =>
                  useVipListFlow
                    ? `viplist-${item.id || index}`
                    : activeTab === 'individual'
                      ? `individual-${item.id || index}`
                      : activeTab === 'group'
                        ? `group-${item.reservation_id || item.id || index}`
                        : activeTab === 'viplist'
                          ? `viplist-${item.id || index}`
                        : `guestlist-${item.id || index}`
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
                refreshControl={
                  <RefreshControl
                    refreshing={loading && dataSource.length === 0}
                    onRefresh={onRefresh}
                    tintColor="rgba(139, 92, 246, 0.9)"
                  />
                }
                ListEmptyComponent={<EmptyComponent />}
                ListFooterComponent={!useVipListFlow && activeTab === 'individual' ? renderLoadMoreButton : null}
              />
            )}
          </View>

          {/* FAB for creating new VIP List - Always show for VIP flow venues */}
          {useVipListFlow && (
            <View style={[styles.fabContainer, { bottom: FAB_BOTTOM_MARGIN }]}>
              <TouchableOpacity
                style={styles.fabNew}
                onPress={() => router.push('/(tabs)/ReservasList/VIPListNuevo')}
                activeOpacity={0.8}
              >
                <BlurView intensity={80} tint="dark" style={styles.fabBlur}>
                  <View style={styles.fabInner}>
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.fabText}>New VIP List</Text>
                  </View>
                </BlurView>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </BackgroundGlow>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  filterIconButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a78bfa',
  },
  currentFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  currentFilterLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  currentFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  currentFilterText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '500',
  },
  currentFilterBadgeBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  currentFilterBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  currentFilterTextBlue: {
    color: '#3b82f6',
  },
  currentFilterTextGreen: {
    color: '#10b981',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: 'white',
    fontSize: 15,
    fontWeight: '300',
  },
  clearButton: {
    padding: 4,
  },
  searchLoading: {
    marginRight: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  orderCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  orderCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '300',
    marginTop: 16,
  },
  errorText: {
    color: 'rgba(239, 68, 68, 0.9)',
    fontSize: 16,
    fontWeight: '300',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '400',
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
  },
  emptyCardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '300',
  },
  loadMoreButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  loadMoreText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '400',
  },
  // Modal styles - Enhanced
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(15, 15, 21, 0.98)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.15)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  modalOptions: {
    padding: 12,
    gap: 4,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  modalOptionText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
  },
  modalOptionTextActive: {
    color: '#a78bfa',
    fontWeight: '600',
  },
  modalSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  modalSectionTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  typeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  typeButtonActiveBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  typeButtonText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#a78bfa',
  },
  typeButtonTextActiveBlue: {
    color: '#3b82f6',
  },
  typeButtonActiveGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  typeButtonTextActiveGreen: {
    color: '#10b981',
  },
  modalOptionActiveBlue: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  modalOptionTextActiveBlue: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  modalOptionActiveGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  modalOptionTextActiveGreen: {
    color: '#10b981',
    fontWeight: '600',
  },
  freeBadge: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  freeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 5,
    letterSpacing: 0.5,
  },
  // New card styles - compact
  orderCardInnerNew: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.15)',
    borderRadius: 14,
    padding: 14,
  },
  orderCardInnerBlue: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 14,
    padding: 14,
  },
  orderCardInnerGreen: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 14,
    padding: 14,
  },
  orderCardInnerRed: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 14,
    padding: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  statusBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusTextNew: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statusDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.3)',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  guestListBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  badgeTextPurple: {
    color: 'rgb(167, 139, 250)',
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextBlue: {
    color: 'rgb(59, 130, 246)',
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextGreen: {
    color: 'rgb(52, 211, 153)',
    fontSize: 10,
    fontWeight: '600',
  },
  orderTitleNew: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  customerNameNew: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '400',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  priceTextPurple: {
    color: 'rgb(168, 85, 255)',
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.9,
  },
  priceTextBlue: {
    color: 'rgb(59, 130, 246)',
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.9,
  },
  priceTextGreen: {
    color: 'rgb(16, 185, 129)',
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.9,
  },
  viewDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    opacity: 0.7,
  },
  viewDetailsTextPurple: {
    color: 'rgb(168, 85, 255)',
    fontSize: 11,
    fontWeight: '500',
  },
  viewDetailsTextBlue: {
    color: 'rgb(59, 130, 246)',
    fontSize: 11,
    fontWeight: '500',
  },
  viewDetailsTextGreen: {
    color: 'rgb(16, 185, 129)',
    fontSize: 11,
    fontWeight: '500',
  },
  freeBadgeSmall: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  freeTextSmall: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  emailTextSmall: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    fontWeight: '400',
  },
  // VIP List styles
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  badgeTextRed: {
    color: 'rgb(239, 68, 68)',
    fontSize: 10,
    fontWeight: '600',
  },
  typeBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeBadgeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontWeight: '500',
  },
  guestsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guestsText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  pricesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceTextSmall: {
    fontSize: 12,
  },
  priceLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '500',
  },
  priceTextRed: {
    color: 'rgb(239, 68, 68)',
    fontSize: 16,
    fontWeight: '700',
    opacity: 0.9,
  },
  viewDetailsTextRed: {
    color: 'rgb(239, 68, 68)',
    fontSize: 11,
    fontWeight: '500',
  },
  typeButtonActiveRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  typeButtonTextActiveRed: {
    color: '#ef4444',
  },
  modalOptionActiveRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  modalOptionTextActiveRed: {
    color: '#ef4444',
    fontWeight: '600',
  },
  currentFilterBadgeRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  currentFilterTextRed: {
    color: '#ef4444',
  },
  // FAB styles
  fabContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  fab: {
    borderRadius: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabNew: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: 'rgba(168, 85, 255, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabBlur: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  fabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(168, 85, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 255, 0.4)',
    borderRadius: 8,
  },
  fabText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});