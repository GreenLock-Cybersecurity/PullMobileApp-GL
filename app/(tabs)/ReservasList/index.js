// app/(tabs)/ReservasList/index.js - COMPLETO CORREGIDO
import { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { groupReservationService } from '@/services/groupReservationService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import CustomHeader from '@/components/CustomHeader';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 640;

export default function ReservasList() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

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

  // Tab state
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' or 'group'

  // Individual orders state
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // Group reservations state
  const [groupReservations, setGroupReservations] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState(null);
  const [selectedGroupStatus, setSelectedGroupStatus] = useState('pending');

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);

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

  useEffect(() => {
    if (user?.venue_id_real) {
      if (activeTab === 'individual') {
        fetchOrders(user.venue_id_real, {
          status: 'pending',
          page: 1,
          resetList: true,
        });
      } else {
        fetchGroupReservations('pending');
      }
    }

    return () => {
      clearOrders();
      clearSearch();
    };
  }, [user?.venue_id_real, activeTab]);

  // Fetch group reservations
  const fetchGroupReservations = async (status = 'pending') => {
    if (!user?.venue_id_real) return;

    try {
      setIsLoadingGroups(true);
      setGroupsError(null);

      const result = await groupReservationService.getGroupReservations(
        user.venue_id_real,
        { status, page: 1, limit: 50 }
      );

      if (result.success) {
        setGroupReservations(result.data);
      } else {
        setGroupsError(result.error);
      }
    } catch (err) {
      setGroupsError('Failed to load group reservations');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'EUR': '€',
      'USD': '$',
      'GTQ': 'Q',
      'MXN': '$',
      'GBP': '£',
    };
    return symbols[currency] || currency || '€';
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

  const onRefresh = async () => {
    if (isSearchMode) {
      if (user?.venue_id_real && searchTerm) {
        await searchOrders(user.venue_id_real, searchTerm, { page: 1 });
      }
    } else {
      if (user?.venue_id_real) {
        await fetchOrders(user.venue_id_real, {
          status: selectedStatus,
          page: 1,
          resetList: true,
        });
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
        style={{ marginBottom: 16 }}
      >
        <BlurView intensity={60} tint="dark" style={styles.orderCard}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.orderCardInner}>
            {/* Header con Status Badge */}
            <View style={styles.orderHeader}>
              <View style={styles.orderIdContainer}>
                <Ionicons name="ticket-outline" size={18} color="rgba(167, 139, 250, 0.9)" />
                <Text style={styles.orderId}>
                  {item.order_number || `#${item.id.substring(0, 8)}`}
                </Text>
              </View>
              <BlurView intensity={40} tint="dark" style={styles.statusBadge}>
                <LinearGradient
                  colors={[
                    `${getStatusColor(item.status)}40`,
                    `${getStatusColor(item.status)}20`,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text
                  style={[styles.statusText, { color: getStatusColor(item.status) }]}
                >
                  {getStatusDisplayName(item.status)}
                </Text>
              </BlurView>
            </View>

            {/* Order Details */}
            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color="rgb(52, 211, 153)" />
                <Text style={styles.customerText}>{item.user_name || 'Customer'}</Text>
              </View>
              {isSearchMode && item.user_email && (
                <View style={styles.detailRow}>
                  <Ionicons name="mail-outline" size={16} color="rgb(103, 232, 249)" />
                  <Text style={styles.customerText}>{item.user_email}</Text>
                </View>
              )}
              {/* PRECIO CON MISMO TAMAÑO QUE NOMBRE */}
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.customerText}>
                  {currencySymbol}{item.total?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const renderGroupReservation = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/(tabs)/ReservasList/GroupReservaDetalle?id=${item.reservation_id}`)
        }
        activeOpacity={0.8}
        style={{ marginBottom: 16 }}
      >
        <BlurView intensity={60} tint="dark" style={styles.orderCard}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.orderCardInner}>
            <View style={styles.orderHeader}>
              <View style={styles.orderIdContainer}>
                <Ionicons name="people-outline" size={18} color="rgba(167, 139, 250, 0.9)" />
                <Text style={styles.orderId}>
                  Group #{item.reservation_id?.substring(0, 8)}
                </Text>
              </View>
              <BlurView intensity={40} tint="dark" style={styles.statusBadge}>
                <LinearGradient
                  colors={[
                    `${getStatusColor(item.status)}40`,
                    `${getStatusColor(item.status)}20`,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text
                  style={[styles.statusText, { color: getStatusColor(item.status) }]}
                >
                  {item.status?.charAt(0).toUpperCase() + item.status?.slice(1)}
                </Text>
              </BlurView>
            </View>

            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color="rgb(52, 211, 153)" />
                <Text style={styles.customerText}>{item.user_name || 'Organizer'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="people" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.customerText}>{item.quantity} guests</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.customerText}>
                  Q{item.total?.toFixed(2) || '0.00'}
                </Text>
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

  const rawDataSource = activeTab === 'individual' ? (isSearchMode ? searchResults : orders) : groupReservations;
  const loading = activeTab === 'individual' ? (isSearchMode ? isSearching : isLoadingOrders) : isLoadingGroups;
  const error = activeTab === 'individual' ? (isSearchMode ? searchError : ordersError) : groupsError;

  // Deduplicate data to prevent "two children with same key" error
  const dataSource = useMemo(() => {
    if (!rawDataSource || rawDataSource.length === 0) return [];

    const seen = new Set();
    return rawDataSource.filter((item) => {
      const key = activeTab === 'individual'
        ? item.id
        : (item.reservation_id || item.id);

      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [rawDataSource, activeTab]);

  return (
    <ImageBackground
      source={require('../../../assets/fondo.webp')}
      style={styles.background}
      blurRadius={15}
    >
      <View style={styles.overlay} />
      <CustomHeader title="Bookings" />
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
                  placeholder={activeTab === 'individual' ? "Search by name, email, or order..." : "Search groups..."}
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
                {(selectedStatus !== 'pending' || selectedGroupStatus !== 'pending' || activeTab !== 'individual') && (
                  <View style={styles.filterActiveDot} />
                )}
              </TouchableOpacity>
            </View>

            {/* Current Filter Indicator */}
            {!isSearchMode && (
              <View style={styles.currentFilterContainer}>
                <Text style={styles.currentFilterLabel}>Showing:</Text>
                <View style={styles.currentFilterBadge}>
                  <Ionicons
                    name={activeTab === 'individual' ? 'ticket-outline' : 'people-outline'}
                    size={14}
                    color="#a78bfa"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.currentFilterText}>
                    {activeTab === 'individual' ? 'Individual' : 'Group'} - {activeTab === 'individual'
                      ? statusOptions.find(o => o.value === selectedStatus)?.display
                      : selectedGroupStatus.charAt(0).toUpperCase() + selectedGroupStatus.slice(1)}
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

                {/* Type Selection */}
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
                        activeTab === 'group' && styles.typeButtonActive
                      ]}
                    >
                      <Ionicons
                        name={activeTab === 'group' ? 'people' : 'people-outline'}
                        size={18}
                        color={activeTab === 'group' ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)'}
                      />
                      <Text style={[
                        styles.typeButtonText,
                        activeTab === 'group' && styles.typeButtonTextActive
                      ]}>
                        Group
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Status Selection */}
                <View style={[styles.modalSection, { borderBottomWidth: 0 }]}>
                  <Text style={styles.modalSectionTitle}>Status</Text>
                  <View style={styles.modalOptions}>
                    {activeTab === 'individual' ? (
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
                            setSelectedGroupStatus(option.value);
                            fetchGroupReservations(option.value);
                            setShowFilterModal(false);
                          }}
                          activeOpacity={0.7}
                          style={[
                            styles.modalOption,
                            selectedGroupStatus === option.value && styles.modalOptionActive
                          ]}
                        >
                          <Ionicons
                            name={option.icon}
                            size={20}
                            color={selectedGroupStatus === option.value ? '#a78bfa' : 'rgba(255, 255, 255, 0.6)'}
                          />
                          <Text style={[
                            styles.modalOptionText,
                            selectedGroupStatus === option.value && styles.modalOptionTextActive
                          ]}>
                            {option.display}
                          </Text>
                          {selectedGroupStatus === option.value && (
                            <Ionicons name="checkmark" size={20} color="#a78bfa" />
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
                renderItem={activeTab === 'individual' ? renderOrder : renderGroupReservation}
                keyExtractor={(item, index) => activeTab === 'individual'
                  ? `individual-${item.id || index}`
                  : `group-${item.reservation_id || item.id || index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={
                  <RefreshControl
                    refreshing={loading && dataSource.length === 0}
                    onRefresh={onRefresh}
                    tintColor="rgba(139, 92, 246, 0.9)"
                  />
                }
                ListEmptyComponent={<EmptyComponent />}
                ListFooterComponent={activeTab === 'individual' ? renderLoadMoreButton : null}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
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
    borderRadius: 16,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(20, 20, 30, 0.98)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOptions: {
    padding: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  modalOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  modalOptionText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
  },
  modalOptionTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  modalSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalSectionTitle: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  typeButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  typeButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#a78bfa',
  },
});