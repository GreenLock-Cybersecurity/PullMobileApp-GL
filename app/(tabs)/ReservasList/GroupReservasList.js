// app/(tabs)/ReservasList/GroupReservasList.js
import { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/useAuthStore';
import { groupReservationService } from '@/services/groupReservationService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import CustomHeader from '@/components/CustomHeader';

export default function GroupReservasList() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [refreshing, setRefreshing] = useState(false);

  const statusOptions = [
    { display: 'Pending', value: 'pending', icon: 'time-outline' },
    { display: 'Approved', value: 'approved', icon: 'checkmark-circle-outline' },
    { display: 'Rejected', value: 'rejected', icon: 'close-circle-outline' },
    { display: 'All', value: 'All', icon: 'list-outline' },
  ];

  const fetchReservations = async (status = 'pending') => {
    if (!user?.venue_id_real) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await groupReservationService.getGroupReservations(
        user.venue_id_real,
        { status, page: 1, limit: 50 }
      );

      if (result.success) {
        setReservations(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load group reservations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.venue_id_real) {
      fetchReservations('pending');
    }
  }, [user?.venue_id_real]);

  const handleStatusFilter = async (statusValue) => {
    setSelectedStatus(statusValue);
    await fetchReservations(statusValue);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations(selectedStatus);
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'approved':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderReservation = ({ item }) => {
    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/(tabs)/ReservasList/GroupReservaDetalle?id=${item.reservation_id}`)
        }
        activeOpacity={0.8}
        style={{ marginBottom: 16 }}
      >
        <BlurView intensity={60} tint="dark" style={styles.card}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardInner}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.idContainer}>
                <Ionicons name="people-outline" size={18} color="rgba(167, 139, 250, 0.9)" />
                <Text style={styles.idText}>Group #{item.reservation_id?.substring(0, 8)}</Text>
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

            {/* Details */}
            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color="rgb(52, 211, 153)" />
                <Text style={styles.detailText}>{item.user_name || 'Organizer'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={16} color="rgb(103, 232, 249)" />
                <Text style={styles.detailText}>{item.user_email}</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="people" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.detailText}>{item.quantity} guests</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.detailText}>Q{item.total?.toFixed(2) || '0.00'}</Text>
              </View>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  };

  const LoadingComponent = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="rgba(139, 92, 246, 0.9)" />
      <Text style={styles.loadingText}>Loading reservations...</Text>
    </View>
  );

  const ErrorComponent = () => (
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

  const EmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <BlurView intensity={60} tint="dark" style={styles.emptyCard}>
        <View style={styles.emptyCardInner}>
          <Ionicons name="people-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
          <Text style={styles.emptyText}>No group reservations found</Text>
        </View>
      </BlurView>
    </View>
  );

  return (
    <ImageBackground
      source={require('../../../assets/fondo.webp')}
      style={styles.background}
      blurRadius={15}
    >
      <View style={styles.overlay} />
      <CustomHeader title="Group Reservations" />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: 50 }}>
          {/* Status Filters */}
          <View style={styles.filterContainer}>
            <FlatList
              horizontal
              data={statusOptions}
              renderItem={({ item: option }) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleStatusFilter(option.value)}
                  disabled={isLoading}
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
              )}
              keyExtractor={(item) => item.value}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            />
          </View>

          {/* List */}
          <View style={styles.listContainer}>
            {isLoading && reservations.length === 0 ? (
              <LoadingComponent />
            ) : error && reservations.length === 0 ? (
              <ErrorComponent />
            ) : (
              <FlatList
                data={reservations}
                renderItem={renderReservation}
                keyExtractor={(item) => item.id?.toString() || item.reservation_id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="rgba(139, 92, 246, 0.9)"
                  />
                }
                ListEmptyComponent={<EmptyComponent />}
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
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardInner: {
    backgroundColor: 'rgba(15, 15, 21, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idText: {
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
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
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
});
