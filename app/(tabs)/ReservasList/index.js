// app/(tabs)/ReservasList/index.js - COMPLETO CORREGIDO
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  ImageBackground,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

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

  const [selectedStatus, setSelectedStatus] = useState('pending_staff_approval');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  const statusOptions = [
    { display: 'Pending Approval', value: 'pending_staff_approval' },
    { display: 'Pending Payment', value: 'pending' },
    { display: 'Payment Authorized', value: 'payment_authorized' },
    { display: 'Completed', value: 'completed' },
    { display: 'Rejected', value: 'rejected' },
    { display: 'Cancelled', value: 'cancelled' },
  ];

  useEffect(() => {
    if (user?.venue_id_real) {
      fetchOrders(user.venue_id_real, {
        status: 'pending_staff_approval',
        page: 1,
        resetList: true,
      });
    }

    return () => {
      clearOrders();
      clearSearch();
    };
  }, [user?.venue_id_real]);

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
      case 'pending_staff_approval':
        return '#f59e0b';
      case 'pending':
        return '#f59e0b';
      case 'payment_authorized':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      case 'cancelled':
        return '#6b7280';
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

  const renderLoadMoreButton = () => {
    if (!ordersPagination.hasMore) return null;

    const loading = isSearchMode ? isSearching : isLoadingOrders;
    const dataSource = isSearchMode ? searchResults : orders;

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
              Load More ({ordersPagination.totalCount - dataSource.length} remaining)
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

  const dataSource = isSearchMode ? searchResults : orders;
  const loading = isSearchMode ? isSearching : isLoadingOrders;
  const error = isSearchMode ? searchError : ordersError;

  return (
    <ImageBackground
      source={require('../../../assets/fondo.png')}
      style={styles.background}
      blurRadius={15}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons
                name="search"
                size={20}
                color="rgba(255, 255, 255, 0.5)"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, email, or order number..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={searchTerm}
                onChangeText={setSearchTerm}
                onSubmitEditing={() => handleSearch(searchTerm)}
                returnKeyType="search"
              />
              {searchTerm.length > 0 && (
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
              )}
            </View>
          </View>

          {!isSearchMode && (
            <View style={styles.filterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleStatusFilter(option.value)}
                    disabled={isLoadingOrders}
                    activeOpacity={0.8}
                    style={{ marginRight: 8 }}
                  >
                    {selectedStatus === option.value ? (
                      <LinearGradient
                        colors={['rgba(139, 92, 246, 0.4)', 'rgba(217, 70, 239, 0.4)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.filterButtonActive}
                      >
                        <Text style={styles.filterTextActive}>{option.display}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.filterButton}>
                        <Text style={styles.filterText}>{option.display}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.listContainer}>
            {loading && dataSource.length === 0 ? (
              <LoadingComponent />
            ) : error && dataSource.length === 0 ? (
              <ErrorComponent />
            ) : (
              <FlatList
                data={dataSource}
                renderItem={renderOrder}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={loading && dataSource.length === 0}
                    onRefresh={onRefresh}
                    tintColor="rgba(139, 92, 246, 0.9)"
                  />
                }
                ListEmptyComponent={<EmptyComponent />}
                ListFooterComponent={renderLoadMoreButton}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
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
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterButtonActive: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '400',
  },
  filterTextActive: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
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
    padding: 16,
  },
  emptyCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
});